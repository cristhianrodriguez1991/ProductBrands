import { NextResponse } from "next/server"
import { sendEmail, getCustomEmailHtml, escapeHtml } from "@/lib/email"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import {
  checkRateLimit,
  checkBotSignals,
  detectBotName,
  detectBotEmail,
  getClientIp,
} from "@/lib/bot-protection"

const contactSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  company: z.string().optional(),
  message: z.string().min(1),
})

export async function POST(req: Request) {
  try {
    // --- 1. Rate limiting ---
    const ip = getClientIp(req)
    const rateCheck = checkRateLimit(`contact:${ip}`)
    if (!rateCheck.allowed) {
      console.warn(`[Contact] Rate limit exceeded for IP: ${ip}`)
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        {
          status: 429,
          headers: rateCheck.retryAfterSeconds
            ? { "Retry-After": String(rateCheck.retryAfterSeconds) }
            : {},
        }
      )
    }

    const body = await req.json()

    // --- 2. Honeypot + timing check ---
    const botCheck = checkBotSignals({
      honeypot: body._hp ?? "",
      formLoadedAt: body._form_loaded_at ?? "",
    })
    if (botCheck.blocked) {
      console.warn(`[Contact] Bot blocked — reason: ${botCheck.reason}, IP: ${ip}`)
      return NextResponse.json({ success: true }) // silent drop
    }

    const data = contactSchema.parse(body)

    // --- 3. Pattern-based name/email detection ---
    if (detectBotName(data.name)) {
      console.warn(`[Contact] Bot-like name: "${data.name}", IP: ${ip}`)
      return NextResponse.json({ success: true }) // silent drop
    }
    if (detectBotEmail(data.email)) {
      console.warn(`[Contact] Bot-like email: "${data.email}", IP: ${ip}`)
      return NextResponse.json({ success: true }) // silent drop
    }

    // Send confirmation email to the customer
    const customerContent = `
      <h1 style="margin:0 0 8px 0; font-size:22px; font-weight:600; color:#18181b; letter-spacing:-0.02em;">We received your message</h1>
      <p style="margin:24px 0 0 0; font-size:15px; color:#3f3f46; line-height:1.6;">Hi ${escapeHtml(data.name)},</p>
      <p style="margin:16px 0 0 0; font-size:15px; color:#3f3f46; line-height:1.6;">Thank you for reaching out to Product Brands. We've received your inquiry and our team will review it shortly.</p>
      <p style="margin:16px 0 0 0; font-size:15px; color:#3f3f46; line-height:1.6;">You can expect to hear back from us within 1–2 business days.</p>
      <p style="margin:24px 0 0 0; font-size:13px; color:#71717a; line-height:1.5;">For reference, here's what you sent us:</p>
      <div style="margin:12px 0 0 0; padding:16px; background:#f4f4f5; border-radius:6px; font-size:14px; color:#3f3f46; line-height:1.6; white-space:pre-wrap;">${escapeHtml(data.message)}</div>
    `.trim()

    const customerResult = await sendEmail({
      to: data.email,
      subject: "We received your message – Product Brands",
      html: getCustomEmailHtml(customerContent),
    })

    if (!customerResult.success) {
      console.error("[Contact] Customer confirmation email failed:", customerResult.error)
    }

    try {
      await prisma.contactSubmission.create({
        data: {
          name: data.name,
          email: data.email,
          company: data.company ?? null,
          message: data.message,
        },
      })
    } catch (dbError) {
      console.error("[Contact] Failed to save submission to DB (migration may be pending):", dbError)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 }
      )
    }
    console.error("Contact form error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
