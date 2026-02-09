import { Resend } from "resend"

/** Options for sending email via Resend API */
export type SendEmailOptions = {
  to: string | string[]
  subject: string
  /** HTML body (required unless using template) */
  html: string
  /** Plain text fallback; if omitted, Resend may derive from HTML */
  text?: string
  from?: string
  /** Reply-to address (e.g. contact form submitter) */
  replyTo?: string | string[]
  cc?: string | string[]
  bcc?: string | string[]
}

const defaultFrom = () =>
  process.env.EMAIL_FROM || "noreply@productbrands.com"

// Lazy initialization - only create Resend instance when needed
function getResend(): Resend | null {
  if (!process.env.RESEND_API_KEY) {
    return null
  }
  return new Resend(process.env.RESEND_API_KEY)
}

/**
 * Send an email via Resend. If RESEND_API_KEY is not set, logs the payload and returns mock success.
 */
export async function sendEmail({
  to,
  subject,
  html,
  text,
  from = defaultFrom(),
  replyTo,
  cc,
  bcc,
}: SendEmailOptions): Promise<{ success: boolean; id?: string; error?: unknown }> {
  const resend = getResend()

  if (!resend) {
    if (process.env.NODE_ENV !== "test") {
      console.log("[Resend] No API key; email not sent:", { to, subject })
    }
    return { success: true, id: "mock" }
  }

  try {
    const payload = {
      from,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
      ...(text !== undefined && { text }),
      ...(replyTo !== undefined && {
        reply_to: Array.isArray(replyTo) ? replyTo : [replyTo],
      }),
      ...(cc !== undefined && { cc: Array.isArray(cc) ? cc : [cc] }),
      ...(bcc !== undefined && { bcc: Array.isArray(bcc) ? bcc : [bcc] }),
    }

    const { data, error } = await resend.emails.send(payload)

    if (error) {
      console.error("[Resend] Send error:", error)
      return { success: false, error }
    }

    return { success: true, id: data?.id }
  } catch (error) {
    console.error("[Resend] Send exception:", error)
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

