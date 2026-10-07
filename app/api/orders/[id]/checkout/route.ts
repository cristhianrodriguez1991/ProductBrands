import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { stripe } from "@/lib/stripe"
import { computeCardProcessingFeeCents, toCents } from "@/lib/invoice"

export const dynamic = "force-dynamic"

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { paymentMethod } = await req.json().catch(() => ({}))
    const isCard = paymentMethod === "card"
    const order = await prisma.customerOrder.findUnique({
      where: { id: params.id },
      include: {
        items: true,
      },
    })

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    if (order.status === "PAID") {
      return NextResponse.json({ error: "Order is already paid" }, { status: 400 })
    }

    if (order.totalAmount <= 0) {
      return NextResponse.json({ error: "Total amount must be greater than zero" }, { status: 400 })
    }

    // Determine the base origin
    let origin = process.env.NEXTAUTH_URL || ""
    try {
      const headerOrigin = req.headers.get("origin") || req.headers.get("referer")
      if (headerOrigin) {
        origin = new URL(headerOrigin).origin
      }
    } catch {
      // fallback to NEXTAUTH_URL
    }
    if (!origin) origin = "https://www.productbrands.com"

    // Map line items for Stripe Checkout
    const lineItems: any[] = order.items.map((item) => {
      // Validate image: Stripe only accepts public https URLs
      const images: string[] = []
      if (item.imageUrl && item.imageUrl.startsWith("https://") && !item.imageUrl.includes("localhost")) {
        images.push(item.imageUrl)
      }

      return {
        price_data: {
          currency: "usd",
          product_data: {
            name: item.productName,
            ...(images.length > 0 ? { images } : {}),
          },
          unit_amount: Math.round(item.unitPrice * 100),
        },
        quantity: item.quantity,
      }
    })

    // Add shipping / delivery line item if applicable
    if (order.shippingCost && order.shippingCost > 0) {
      lineItems.push({
        price_data: {
          currency: "usd",
          product_data: {
            name: `Delivery Fee (${order.deliveryType === "PICKUP" ? "Pickup Handling" : "Shipping"})`,
          },
          unit_amount: Math.round(order.shippingCost * 100),
        },
        quantity: 1,
      })
    }

    // Add card processing fee if customer selected Credit or Debit card
    let cardFeeCents = 0
    if (isCard) {
      cardFeeCents = computeCardProcessingFeeCents(toCents(order.totalAmount))
      if (cardFeeCents > 0) {
        lineItems.push({
          price_data: {
            currency: "usd",
            product_data: {
              name: "Card Processing Fee (Credit & Debit)",
              description: "Stripe standard 2.9% + $0.30 processing fee",
            },
            unit_amount: cardFeeCents,
          },
          quantity: 1,
        })
      }
    }

    // Configure session payment methods
    const sessionConfig: any = {
      customer_email: order.customerEmail || undefined,
      line_items: lineItems,
      mode: "payment",
      metadata: {
        orderId: order.id,
        paymentMethodType: isCard ? "card" : "us_bank_account",
        feeCents: String(cardFeeCents),
      },
      payment_intent_data: {
        metadata: {
          orderId: order.id,
          paymentMethodType: isCard ? "card" : "us_bank_account",
          processingFeeCents: String(cardFeeCents),
        },
      },
      client_reference_id: order.id,
      success_url: `${origin}/pay/${order.id}?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/pay/${order.id}?canceled=true`,
    }

    if (isCard) {
      sessionConfig.payment_method_types = ["card"]
    } else {
      sessionConfig.payment_method_types = ["us_bank_account"]
      sessionConfig.payment_method_options = {
        us_bank_account: {
          financial_connections: {
            permissions: ["payment_method"],
          },
        },
      }
    }

    const session = await stripe.checkout.sessions.create(sessionConfig)

    // Update order with session id and status
    await prisma.customerOrder.update({
      where: { id: order.id },
      data: {
        stripeSessionId: session.id,
        processingFee: isCard ? cardFeeCents / 100 : 0,
        paymentMethodType: isCard ? "card" : "us_bank_account",
        status: order.status === "DRAFT" ? "SENT" : order.status,
      },
    })

    return NextResponse.json({ url: session.url })
  } catch (error: any) {
    console.error("[CUSTOMER_ORDER_CHECKOUT_ERROR]", error)
    return NextResponse.json(
      { error: error?.message || "Failed to create checkout session" },
      { status: 500 }
    )
  }
}
