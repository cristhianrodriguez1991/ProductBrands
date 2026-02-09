import { NextResponse } from "next/server"
import { sendEmail, getCustomEmailHtml, escapeHtml } from "@/lib/email"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const contactSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  company: z.string().optional(),
  message: z.string().min(1),
})

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const data = contactSchema.parse(body)

    const content = `
      <h2 style="margin:0 0 16px 0; font-size:18px; font-weight:600; color:#18181b;">New contact form submission</h2>
      <p style="margin:0 0 8px 0; font-size:15px; color:#3f3f46; line-height:1.5;"><strong>Name:</strong> ${escapeHtml(data.name)}</p>
      <p style="margin:0 0 8px 0; font-size:15px; color:#3f3f46; line-height:1.5;"><strong>Email:</strong> ${escapeHtml(data.email)}</p>
      <p style="margin:0 0 8px 0; font-size:15px; color:#3f3f46; line-height:1.5;"><strong>Company:</strong> ${escapeHtml(data.company || "N/A")}</p>
      <p style="margin:0 0 4px 0; font-size:15px; color:#3f3f46; line-height:1.5;"><strong>Message:</strong></p>
      <p style="margin:0; font-size:15px; color:#3f3f46; line-height:1.6; white-space:pre-wrap;">${escapeHtml(data.message)}</p>
    `.trim()

    const to = process.env.CONTACT_EMAIL || "info@productbrands.com"
    const result = await sendEmail({
      to,
      replyTo: data.email,
      subject: `Contact Form: ${data.name}`,
      html: getCustomEmailHtml(content),
    })

    if (!result.success) {
      console.error("[Contact] Email send failed:", result.error)
      return NextResponse.json(
        { error: "Failed to send notification email. Please try again or contact us directly." },
        { status: 500 }
      )
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

