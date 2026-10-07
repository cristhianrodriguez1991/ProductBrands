import { NextResponse } from "next/server"
import type Stripe from "stripe"
import { prisma } from "@/lib/prisma"
import { stripe } from "@/lib/stripe"
import { computeSurchargeCents, formatInvoiceNumber, getCardSurchargePercent, toCents } from "@/lib/invoice"
import { syncOrderWithPaymentIntent } from "@/lib/customer-order-payments"

export const dynamic = "force-dynamic"

/**
 * Inline invoice payment (Stripe Payment Element + ConfirmationToken).
 *
 * 1. Client collects ACH / card details and creates a ConfirmationToken.
 * 2. We inspect the token: credit cards get the surcharge, ACH & debit cards don't.
 * 3. If a surcharge applies and the customer hasn't seen it yet, we return the quote
 *    so it can be disclosed before charging (card network requirement).
 * 4. Otherwise we create + confirm the PaymentIntent for the exact amount.
 */
export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { confirmationTokenId, acceptedFeeCents } = await req.json()

    if (!confirmationTokenId || typeof confirmationTokenId !== "string") {
      return NextResponse.json({ error: "Missing payment details" }, { status: 400 })
    }

    const order = await prisma.customerOrder.findUnique({
      where: { id: params.id },
      include: { items: true },
    })

    if (!order) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 })
    }
    if (order.status === "PAID") {
      return NextResponse.json({ error: "This invoice has already been paid." }, { status: 409 })
    }
    if (order.status === "PROCESSING") {
      return NextResponse.json({ error: "A payment for this invoice is already processing." }, { status: 409 })
    }
    if (order.status === "CANCELLED") {
      return NextResponse.json({ error: "This invoice has been cancelled." }, { status: 410 })
    }

    const token = await stripe.confirmationTokens.retrieve(confirmationTokenId)
    const preview = token.payment_method_preview
    const methodType = preview?.type || "unknown"
    const funding = methodType === "card" ? preview?.card?.funding || "unknown" : null

    const baseCents = toCents(order.totalAmount)
    const percent = getCardSurchargePercent()
    const feeCents = computeSurchargeCents(baseCents, methodType, funding, percent)
    const totalCents = baseCents + feeCents

    // Disclose the surcharge before charging
    if (feeCents > 0 && Number(acceptedFeeCents) !== feeCents) {
      return NextResponse.json({
        requiresFeeConfirmation: true,
        feeCents,
        baseCents,
        totalCents,
        surchargePercent: percent,
        funding,
      })
    }

    const paymentMethodType = methodType === "card" ? `card:${funding}` : methodType
    const invoiceNo = formatInvoiceNumber(order)

    let intent: Stripe.PaymentIntent
    try {
      intent = await stripe.paymentIntents.create({
        amount: totalCents,
        currency: "usd",
        payment_method_types: ["us_bank_account", "card"],
        payment_method_options: {
          us_bank_account: {
            financial_connections: { permissions: ["payment_method"] },
          },
        },
        confirm: true,
        confirmation_token: confirmationTokenId,
        receipt_email: order.customerEmail || undefined,
        description: `Invoice ${invoiceNo} — Product Brands`,
        metadata: {
          orderId: order.id,
          invoiceNumber: invoiceNo,
          baseAmountCents: String(baseCents),
          processingFeeCents: String(feeCents),
          paymentMethodType,
        },
      })
    } catch (err: any) {
      // Card declines, insufficient funds, etc. -> show Stripe's customer-safe message
      const message = err?.raw?.message || err?.message || "Your payment could not be completed."
      return NextResponse.json({ error: message }, { status: 402 })
    }

    // Persist the attempt so redirects / later checks can find it
    await prisma.customerOrder.update({
      where: { id: order.id },
      data: {
        stripePaymentIntent: intent.id,
        processingFee: feeCents / 100,
        paymentMethodType,
        status: order.status === "DRAFT" ? "SENT" : order.status,
      },
    })

    const updated = await syncOrderWithPaymentIntent(order.id, intent)

    const microdepositUrl =
      intent.status === "requires_action" && intent.next_action?.type === "verify_with_microdeposits"
        ? intent.next_action.verify_with_microdeposits?.hosted_verification_url || null
        : null

    return NextResponse.json({
      status: intent.status,
      paymentIntentId: intent.id,
      clientSecret: intent.client_secret,
      microdepositUrl,
      order: updated,
    })
  } catch (error: any) {
    console.error("[CUSTOMER_ORDER_PAY_ERROR]", error)
    return NextResponse.json(
      { error: error?.raw?.message || error?.message || "Unable to process payment" },
      { status: 500 }
    )
  }
}
