import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { stripe } from "@/lib/stripe"
import { syncOrderWithPaymentIntent } from "@/lib/customer-order-payments"

export const dynamic = "force-dynamic"

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { sessionId, paymentIntentId } = await req.json().catch(() => ({}))

    const order = await prisma.customerOrder.findUnique({
      where: { id: params.id },
      include: { items: true },
    })

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    // If already marked as paid, return directly
    if (order.status === "PAID") {
      return NextResponse.json({ order, paid: true })
    }

    // Inline payments (Payment Element) -> PaymentIntent
    const intentId: string | null =
      paymentIntentId || (order.stripePaymentIntent?.startsWith("pi_") && !sessionId ? order.stripePaymentIntent : null)

    if (intentId) {
      const intent = await stripe.paymentIntents.retrieve(intentId)
      if (intent.metadata?.orderId !== order.id) {
        return NextResponse.json({ error: "Payment does not belong to this invoice" }, { status: 400 })
      }
      const updated = await syncOrderWithPaymentIntent(order.id, intent)
      return NextResponse.json({
        order: updated,
        paid: updated?.status === "PAID",
        processing: updated?.status === "PROCESSING",
        status: intent.status,
      })
    }

    // Legacy hosted Stripe Checkout sessions
    const sessionToVerify = sessionId || order.stripeSessionId

    if (!sessionToVerify) {
      return NextResponse.json({ error: "No session to verify" }, { status: 400 })
    }

    const session = await stripe.checkout.sessions.retrieve(sessionToVerify)

    // ACH payments can be "paid" or "processing" (ACH Direct Debit takes 2-4 business days to clear, but Stripe completes the checkout session)
    if (session.payment_status === "paid" || session.status === "complete") {
      const paymentIntentIdFromSession =
        typeof session.payment_intent === "string"
          ? session.payment_intent
          : session.payment_intent?.id || null

      const updated = await prisma.customerOrder.update({
        where: { id: order.id },
        data: {
          status: "PAID",
          stripePaymentIntent: paymentIntentIdFromSession,
        },
        include: { items: true },
      })

      return NextResponse.json({ order: updated, paid: true })
    }

    return NextResponse.json({
      order,
      paid: false,
      status: session.payment_status || session.status,
    })
  } catch (error: any) {
    console.error("[CUSTOMER_ORDER_VERIFY_ERROR]", error)
    return NextResponse.json(
      { error: error?.message || "Failed to verify session" },
      { status: 500 }
    )
  }
}
