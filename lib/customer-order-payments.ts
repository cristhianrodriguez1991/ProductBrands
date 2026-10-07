import type Stripe from "stripe"
import { prisma } from "@/lib/prisma"
import { stripe } from "@/lib/stripe"
import { sendEmail } from "@/lib/email"
import { buildReceiptEmail, INVOICE_EMAIL_FROM } from "@/lib/invoice-emails"

/**
 * Maps a Stripe PaymentIntent status to our CustomerOrder status.
 * - succeeded  -> PAID
 * - processing -> PROCESSING (ACH bank transfers take a few business days to clear)
 * - anything else -> null (leave order status untouched)
 */
function mapIntentStatus(status: Stripe.PaymentIntent.Status): "PAID" | "PROCESSING" | null {
  if (status === "succeeded") return "PAID"
  if (status === "processing") return "PROCESSING"
  return null
}

/**
 * Syncs a CustomerOrder with the latest state of its PaymentIntent.
 * Sends the branded payment receipt exactly once, on the transition to PAID.
 */
export async function syncOrderWithPaymentIntent(orderId: string, intent: Stripe.PaymentIntent) {
  const nextStatus = mapIntentStatus(intent.status)
  const feeCents = parseInt(intent.metadata?.processingFeeCents || "0", 10) || 0
  const methodType = intent.metadata?.paymentMethodType || null

  if (!nextStatus) {
    // A previously "processing" ACH payment failed -> reopen the invoice for payment
    if (intent.status === "requires_payment_method" || intent.status === "canceled") {
      await prisma.customerOrder.updateMany({
        where: { id: orderId, status: "PROCESSING", stripePaymentIntent: intent.id },
        data: { status: "SENT" },
      })
    }
    return prisma.customerOrder.findUnique({ where: { id: orderId }, include: { items: true } })
  }

  const updateData: any = {
    status: nextStatus,
    stripePaymentIntent: intent.id,
  }
  if (feeCents > 0) {
    updateData.processingFee = feeCents / 100
  }
  if (methodType) {
    updateData.paymentMethodType = methodType
  }

  const result = await prisma.customerOrder.updateMany({
    where: { id: orderId, status: { not: "PAID" } },
    data: updateData,
  })

  const order = await prisma.customerOrder.findUnique({ where: { id: orderId }, include: { items: true } })

  if (result.count === 1 && nextStatus === "PAID" && order?.customerEmail) {
    try {
      const { subject, html } = buildReceiptEmail(order)
      await sendEmail({ to: order.customerEmail, subject, html, from: INVOICE_EMAIL_FROM })
    } catch (err) {
      console.error("[CUSTOMER_ORDER_RECEIPT_EMAIL_ERROR]", err)
    }
  }

  return order
}

/**
 * For orders whose ACH payment is still clearing, re-check Stripe so the status
 * stays accurate even without webhooks configured.
 */
export async function refreshProcessingOrder<T extends { id: string; status: string; stripePaymentIntent: string | null }>(order: T) {
  if (order.status !== "PROCESSING" || !order.stripePaymentIntent?.startsWith("pi_")) return null
  try {
    const intent = await stripe.paymentIntents.retrieve(order.stripePaymentIntent)
    return await syncOrderWithPaymentIntent(order.id, intent)
  } catch (err) {
    console.error("[CUSTOMER_ORDER_REFRESH_ERROR]", err)
    return null
  }
}
