import { Resend } from "resend"

// Lazy initialization - only create Resend instance when needed
function getResend() {
  if (!process.env.RESEND_API_KEY) {
    return null
  }
  return new Resend(process.env.RESEND_API_KEY)
}

export async function sendEmail({
  to,
  subject,
  html,
  from = process.env.EMAIL_FROM || "noreply@productbrands.com",
}: {
  to: string | string[]
  subject: string
  html: string
  from?: string
}) {
  const resend = getResend()
  
  if (!resend) {
    console.log("Email would be sent:", { to, subject, html })
    return { success: true, id: "mock" }
  }

  try {
    const { data, error } = await resend.emails.send({
      from,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
    })

    if (error) {
      console.error("Email error:", error)
      return { success: false, error }
    }

    return { success: true, id: data?.id }
  } catch (error) {
    console.error("Email error:", error)
    return { success: false, error }
  }
}

export function getQuoteSubmittedEmail(quoteId: string, companyName: string) {
  return {
    subject: "Quote Request Submitted",
    html: `
      <h1>Quote Request Submitted</h1>
      <p>Thank you for your quote request, ${companyName}!</p>
      <p>Your quote request (#${quoteId.slice(-8)}) has been received and is being reviewed by our team.</p>
      <p>We'll get back to you within 1-2 business days.</p>
      <p><a href="${process.env.NEXTAUTH_URL}/portal/quotes/${quoteId}">View Quote</a></p>
    `,
  }
}

export function getQuoteResponseEmail(quoteId: string, companyName: string) {
  return {
    subject: "Quote Response Ready",
    html: `
      <h1>Quote Response Ready</h1>
      <p>Hello ${companyName},</p>
      <p>We've prepared a quote response for your request (#${quoteId.slice(-8)}).</p>
      <p><a href="${process.env.NEXTAUTH_URL}/portal/quotes/${quoteId}">View Quote Response</a></p>
    `,
  }
}

export function getOrderUpdateEmail(orderId: string, companyName: string, status: string) {
  return {
    subject: `Order Update: ${status}`,
    html: `
      <h1>Order Update</h1>
      <p>Hello ${companyName},</p>
      <p>Your order (#${orderId.slice(-8)}) status has been updated to: <strong>${status}</strong></p>
      <p><a href="${process.env.NEXTAUTH_URL}/portal/orders/${orderId}">View Order</a></p>
    `,
  }
}

