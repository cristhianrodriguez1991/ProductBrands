import { NextResponse } from "next/server"
import { headers } from "next/headers"
import { stripe } from "@/lib/stripe"
import { prisma } from "@/lib/prisma"
import { sendEmail } from "@/lib/email"
import { formatInvoiceNumber } from "@/lib/invoice"
import { syncOrderWithPaymentIntent } from "@/lib/customer-order-payments"
import Stripe from "stripe"

export const dynamic = "force-dynamic"

export async function POST(req: Request) {
  const body = await req.text()
  const signature = headers().get("stripe-signature")

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  let event: Stripe.Event

  try {
    if (webhookSecret && signature) {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } else {
      // In development or if webhook secret is not yet set, parse body safely
      event = JSON.parse(body) as Stripe.Event
    }
  } catch (err: any) {
    console.error(`[STRIPE_WEBHOOK] Signature verification failed: ${err.message}`)
    return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 })
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded": {
        const session = event.data.object as Stripe.Checkout.Session
        const orderId = session.metadata?.orderId || session.client_reference_id

        let order = null
        if (orderId) {
          order = await prisma.customerOrder.findUnique({
            where: { id: orderId },
            include: { items: true },
          })
        } else if (session.id) {
          order = await prisma.customerOrder.findFirst({
            where: { stripeSessionId: session.id },
            include: { items: true },
          })
        }

        if (order) {
          const paymentIntentId =
            typeof session.payment_intent === "string"
              ? session.payment_intent
              : session.payment_intent?.id || null

          await prisma.customerOrder.update({
            where: { id: order.id },
            data: {
              status: "PAID",
              stripePaymentIntent: paymentIntentId,
            },
          })

          console.log(`[STRIPE_WEBHOOK] Marked order ${order.id} as PAID`)

          // Send payment receipt email
          if (order.customerEmail) {
            try {
              const formattedTotal = new Intl.NumberFormat("en-US", {
                style: "currency",
                currency: "USD",
              }).format(order.totalAmount)

              await sendEmail({
                to: order.customerEmail,
                subject: `Payment Receipt: Invoice ${formatInvoiceNumber(order)}`,
                html: `
                  <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px;">
                    <h2 style="color: #0f172a; margin-top: 0;">Payment Confirmation</h2>
                    <p style="color: #334155;">Hi ${order.customerName},</p>
                    <p style="color: #334155;">We have successfully received your payment of <strong>${formattedTotal}</strong> for Invoice <strong>${formatInvoiceNumber(order)}</strong>.</p>
                    
                    <div style="background-color: #f8fafc; border-radius: 6px; padding: 16px; margin: 20px 0;">
                      <h4 style="margin: 0 0 10px 0; color: #1e293b;">Order Summary</h4>
                      <ul style="margin: 0; padding-left: 20px; color: #475569;">
                        ${order.items.map(item => `<li>${item.quantity}x ${item.productName} - $${(item.totalPrice).toFixed(2)}</li>`).join("")}
                      </ul>
                      ${order.shippingCost > 0 ? `<p style="margin: 8px 0 0 0; color: #475569;">Delivery Fee: $${order.shippingCost.toFixed(2)}</p>` : ""}
                      <p style="margin: 12px 0 0 0; font-weight: bold; color: #0f172a;">Total Paid: ${formattedTotal}</p>
                    </div>

                    <p style="color: #334155;">Delivery Method: <strong>${order.deliveryType}</strong></p>
                    ${order.deliveryDate ? `<p style="color: #334155;">Expected Date: <strong>${new Date(order.deliveryDate).toLocaleDateString()}</strong></p>` : ""}
                    
                    <p style="color: #64748b; font-size: 13px; margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 16px;">
                      Thank you for doing business with Product Brands! If you have any questions, please contact info@productbrands.com or call +1 786-295-4063.
                    </p>
                  </div>
                `,
              })
            } catch (emailErr) {
              console.error("[STRIPE_WEBHOOK] Failed to send receipt email:", emailErr)
            }
          }
        }
        break
      }

      case "payment_intent.succeeded":
      case "payment_intent.processing":
      case "payment_intent.payment_failed": {
        // Re-fetch from Stripe: never trust an (possibly unsigned) webhook payload
        const intent = await stripe.paymentIntents.retrieve((event.data.object as Stripe.PaymentIntent).id)
        const intentOrderId = intent.metadata?.orderId
        if (intentOrderId) {
          await syncOrderWithPaymentIntent(intentOrderId, intent)
        }
        break
      }

      default:
        // Ignore other events
        break
    }

    return NextResponse.json({ received: true })
  } catch (error: any) {
    console.error("[STRIPE_WEBHOOK_HANDLER_ERROR]", error)
    return new NextResponse(`Webhook Handler Error: ${error.message}`, { status: 500 })
  }
}
