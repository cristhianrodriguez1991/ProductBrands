import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { stripe } from "@/lib/stripe"

export const dynamic = "force-dynamic"

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { sessionId } = await req.json()

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

    const sessionToVerify = sessionId || order.stripeSessionId

    if (!sessionToVerify) {
      return NextResponse.json({ error: "No session to verify" }, { status: 400 })
    }

    const session = await stripe.checkout.sessions.retrieve(sessionToVerify)

    // ACH payments can be "paid" or "processing" (ACH Direct Debit takes 2-4 business days to clear, but Stripe completes the checkout session)
    if (session.payment_status === "paid" || session.status === "complete") {
      const paymentIntentId =
        typeof session.payment_intent === "string"
          ? session.payment_intent
          : session.payment_intent?.id || null

      const updated = await prisma.customerOrder.update({
        where: { id: order.id },
        data: {
          status: "PAID",
          stripePaymentIntent: paymentIntentId,
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
