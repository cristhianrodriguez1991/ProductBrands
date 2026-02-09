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

const SENDER_DISPLAY_NAME = "Product Brands"

// From shown in inbox as "Product Brands <address>". If EMAIL_FROM is just an email (no "<">), we add the display name.
function defaultFrom(): string {
  const raw = process.env.EMAIL_FROM || "onboarding@resend.dev"
  if (raw.includes("<") && raw.includes(">")) return raw
  return SENDER_DISPLAY_NAME + " <" + raw.trim() + ">"
}

// Lazy initialization - only create Resend instance when needed
function getResend(): Resend | null {
  if (!process.env.RESEND_API_KEY) {
    return null
  }
  return new Resend(process.env.RESEND_API_KEY)
}

/** Use for debugging: true if RESEND_API_KEY is set in this environment (e.g. Vercel). */
export function isResendConfigured(): boolean {
  return !!process.env.RESEND_API_KEY
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
      console.warn("[Resend] RESEND_API_KEY not set; email not sent. Set RESEND_API_KEY in your environment (e.g. Vercel).", { to, subject })
    }
    return { success: false, error: "RESEND_API_KEY is not configured" }
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
      console.error("[Resend] Send failed:", JSON.stringify(error, null, 2))
      return { success: false, error }
    }

    if (process.env.NODE_ENV !== "test") {
      console.log("[Resend] Sent:", { id: data?.id, to: payload.to, from: payload.from })
    }
    return { success: true, id: data?.id }
  } catch (error) {
    console.error("[Resend] Send exception:", error)
    return { success: false, error }
  }
}

const BASE_URL = process.env.NEXTAUTH_URL || "https://productbrands.com"
const LOGO_URL = BASE_URL + "/images/logo.png"
const FAVICON_URL = BASE_URL + "/images/favicon.png"

/** Company footer details (optional env: COMPANY_ADDRESS, COMPANY_PHONE, COMPANY_MAPS_URL). */
function getEmailFooter(): string {
  const name = process.env.COMPANY_NAME || "Product Brands"
  const tagline = "Private Label & Manufacturing"
  const address = process.env.COMPANY_ADDRESS?.trim()
  const phone = process.env.COMPANY_PHONE?.trim()
  const mapsUrl = process.env.COMPANY_MAPS_URL?.trim()
  const year = new Date().getFullYear()
  const siteHost = BASE_URL.replace(/^https?:\/\//, "")

  const lines: string[] = []
  lines.push(name + " | " + tagline)
  lines.push('<a href="' + BASE_URL + '" style="color:#71717a; text-decoration:none;">' + siteHost + "</a>")
  if (address) {
    const safeAddr = address.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    if (mapsUrl) {
      lines.push('<a href="' + mapsUrl + '" target="_blank" rel="noopener" style="color:#71717a;">' + safeAddr + "</a>")
    } else {
      const mapsSearch = "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(address)
      lines.push('<a href="' + mapsSearch + '" target="_blank" rel="noopener" style="color:#71717a;">' + safeAddr + "</a>")
    }
  }
  if (phone) {
    const telDigits = phone.replace(/[^\d+]/g, "")
    const telHref = telDigits ? "tel:" + telDigits : "#"
    const safePhone = phone.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    lines.push('<a href="' + telHref + '" style="color:#71717a;">' + safePhone + "</a>")
  }
  lines.push("\u00A9 " + year + " " + name + ". All rights reserved.")
  lines.push("If you have questions, contact us through our website.")

  return lines.join("<br/>")
}

/** Escape for HTML to avoid injection when using user-provided content. */
export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

/** Shared email layout: header with logo, content area, footer. Inline styles for email client compatibility. */
function emailLayout(content: string): string {
  const footer = getEmailFooter()
  return [
    "<!DOCTYPE html>",
    "<html>",
    "<head>",
    "<meta charset=\"utf-8\">",
    "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">",
    "<title>Product Brands</title>",
    "<link rel=\"icon\" href=\"" + FAVICON_URL + "\" type=\"image/png\">",
    "</head>",
    "<body style=\"margin:0; padding:0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5; color: #18181b;\">",
    "<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"background-color: #f4f4f5; padding: 40px 20px;\">",
    "<tr><td align=\"center\">",
    "<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"max-width: 560px;\">",
    "<tr><td style=\"padding-bottom: 24px;\">",
    "<a href=\"" + BASE_URL + "\" target=\"_blank\" rel=\"noopener\" style=\"text-decoration: none;\">",
    "<img src=\"" + LOGO_URL + "\" alt=\"Product Brands\" width=\"180\" height=\"48\" style=\"display: block; max-width: 180px; height: auto; border: 0;\" />",
    "</a>",
    "<div style=\"font-size: 12px; color: #71717a; margin-top: 6px;\">Private Label &amp; Manufacturing</div>",
    "</td></tr>",
    "<tr><td style=\"background-color: #ffffff; border-radius: 8px; padding: 32px 28px; box-shadow: 0 1px 3px rgba(0,0,0,0.06);\">",
    content,
    "</td></tr>",
    "<tr><td style=\"padding-top: 24px; font-size: 11px; color: #a1a1aa; text-align: center; line-height: 1.6;\">",
    footer,
    "</td></tr>",
    "</table></td></tr></table>",
    "</body></html>",
  ].join("\n")
}

/** Wrap custom/admin-written email body in the full professional layout (header, logo, footer). */
export function getCustomEmailHtml(bodyContentHtml: string): string {
  return emailLayout(bodyContentHtml)
}

/** Primary CTA button for emails (table-based for Outlook). */
function emailButton(href: string, label: string): string {
  return [
    "<table role=\"presentation\" cellpadding=\"0\" cellspacing=\"0\" style=\"margin-top: 24px;\">",
    "<tr><td style=\"border-radius: 6px; background-color: #18181b;\">",
    "<a href=\"" + href + "\" target=\"_blank\" rel=\"noopener\" style=\"display: inline-block; padding: 12px 24px; font-size: 14px; font-weight: 600; color: #ffffff; text-decoration: none;\">" + label + "</a>",
    "</td></tr></table>",
  ].join("\n")
}

export function getQuoteSubmittedEmail(quoteId: string, companyName: string) {
  const safeName = escapeHtml(companyName)
  const quoteRef = quoteId.slice(-8)
  const content = [
    "<h1 style=\"margin: 0 0 8px 0; font-size: 22px; font-weight: 600; color: #18181b; letter-spacing: -0.02em;\">Quote request received</h1>",
    "<p style=\"margin: 0; font-size: 14px; color: #71717a; line-height: 1.5;\">Reference #" + quoteRef + "</p>",
    "<p style=\"margin: 24px 0 0 0; font-size: 15px; color: #3f3f46; line-height: 1.6;\">Hi " + safeName + ",</p>",
    "<p style=\"margin: 16px 0 0 0; font-size: 15px; color: #3f3f46; line-height: 1.6;\">Thank you for your quote request. We've received your details and our team will review them shortly.</p>",
    "<p style=\"margin: 16px 0 0 0; font-size: 15px; color: #3f3f46; line-height: 1.6;\">You can expect to hear from us within 1-2 business days.</p>",
  ].join("\n")
  return {
    subject: "Quote request received – Product Brands",
    html: emailLayout(content),
  }
}

export function getQuoteResponseEmail(quoteId: string, companyName: string) {
  const safeName = escapeHtml(companyName)
  const quoteRef = quoteId.slice(-8)
  const viewUrl = BASE_URL + "/portal/quotes/" + quoteId
  const content = [
    "<h1 style=\"margin: 0 0 8px 0; font-size: 22px; font-weight: 600; color: #18181b; letter-spacing: -0.02em;\">Your quote is ready</h1>",
    "<p style=\"margin: 0; font-size: 14px; color: #71717a; line-height: 1.5;\">Reference #" + quoteRef + "</p>",
    "<p style=\"margin: 24px 0 0 0; font-size: 15px; color: #3f3f46; line-height: 1.6;\">Hi " + safeName + ",</p>",
    "<p style=\"margin: 16px 0 0 0; font-size: 15px; color: #3f3f46; line-height: 1.6;\">We've prepared a quote for your request. Review the details and let us know if you have any questions.</p>",
    emailButton(viewUrl, "View quote"),
    "<p style=\"margin: 24px 0 0 0; font-size: 13px; color: #71717a; line-height: 1.5;\">If the button doesn't work, copy and paste this link into your browser:<br/><a href=\"" + viewUrl + "\" style=\"color: #3b82f6; word-break: break-all;\">" + viewUrl + "</a></p>",
  ].join("\n")
  return {
    subject: "Your quote is ready – Product Brands",
    html: emailLayout(content),
  }
}

export function getOrderUpdateEmail(orderId: string, companyName: string, status: string) {
  const safeName = escapeHtml(companyName)
  const safeStatus = escapeHtml(status)
  const orderRef = orderId.slice(-8)
  const viewUrl = BASE_URL + "/portal/orders/" + orderId
  const content = [
    "<h1 style=\"margin: 0 0 8px 0; font-size: 22px; font-weight: 600; color: #18181b; letter-spacing: -0.02em;\">Order update</h1>",
    "<p style=\"margin: 0; font-size: 14px; color: #71717a; line-height: 1.5;\">Order #" + orderRef + "</p>",
    "<p style=\"margin: 24px 0 0 0; font-size: 15px; color: #3f3f46; line-height: 1.6;\">Hi " + safeName + ",</p>",
    "<p style=\"margin: 16px 0 0 0; font-size: 15px; color: #3f3f46; line-height: 1.6;\">Your order status has been updated to <strong style=\"color: #18181b;\">" + safeStatus + "</strong>" + ".</p>",
    emailButton(viewUrl, "View order"),
    "<p style=\"margin: 24px 0 0 0; font-size: 13px; color: #71717a; line-height: 1.5;\">If the button doesn't work, copy and paste this link into your browser:<br/><a href=\"" + viewUrl + "\" style=\"color: #3b82f6; word-break: break-all;\">" + viewUrl + "</a></p>",
  ].join("\n")
  return {
    subject: "Order update: " + status + " – Product Brands",
    html: emailLayout(content),
  }
}

