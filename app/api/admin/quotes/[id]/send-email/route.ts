import { NextRequest, NextResponse } from "next/server"
import { requireWriteAccess } from "@/lib/rbac"
import { prisma } from "@/lib/prisma"
import { sendEmail } from "@/lib/email"
import { z } from "zod"

const sendEmailSchema = z.object({
  subject: z.string().min(1, "Subject is required"),
  body: z.string().min(1, "Message body is required"),
})

// POST /api/admin/quotes/[id]/send-email - Send custom email to quote customer
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireWriteAccess(req)
    if (auth instanceof NextResponse) return auth

    const quote = await prisma.quote.findUnique({
      where: { id: params.id },
      include: {
        contact: true,
        createdBy: { select: { email: true, name: true } },
        company: { select: { name: true } },
      },
    })

    if (!quote) {
      return NextResponse.json({ error: "Quote not found" }, { status: 404 })
    }

    const toEmail = quote.contact?.email ?? quote.createdBy?.email
    if (!toEmail) {
      return NextResponse.json(
        { error: "No email address for this quote" },
        { status: 400 }
      )
    }

    const body = await req.json()
    const data = sendEmailSchema.parse(body)

    const html = data.body
      .split(/\n/g)
      .map((p) => `<p style="margin:0 0 0.75em 0; font-size:15px; line-height:1.5;">${p.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>`)
      .join("")

    const { success, error } = await sendEmail({
      to: toEmail,
      subject: data.subject,
      html: html || `<p>${data.body.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>`,
    })

    if (!success) {
      console.error("[send-email] Resend error:", error)
      return NextResponse.json(
        { error: "Failed to send email" },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json(
        { error: e.errors[0]?.message ?? "Invalid input" },
        { status: 400 }
      )
    }
    console.error("[send-email]", e)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
