import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { sendEmail, getCustomEmailHtml, escapeHtml } from "@/lib/email"
import { z } from "zod"

const sendMessageSchema = z.object({
  userId: z.string(),
  content: z.string().min(1).max(2000),
})

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session.user as any)?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { userId, content } = sendMessageSchema.parse(body)

    // Create message from admin to customer
    const message = await prisma.message.create({
      data: {
        userId: (session.user as any).id,
        content,
        isInternal: false,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    })

    // Notify customer via email
    const customer = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (customer) {
      const baseUrl = process.env.NEXTAUTH_URL || ""
      const viewUrl = baseUrl ? `${baseUrl}/portal` : "#"
      const innerHtml = `
        <p style="margin:0 0 12px 0; font-size:15px; color:#3f3f46; line-height:1.5;">You have a new message from our support team.</p>
        <p style="margin:0 0 16px 0; font-size:15px; color:#3f3f46; line-height:1.6;">${escapeHtml(content)}</p>
        <p style="margin:0;"><a href="${viewUrl}" style="color:#3b82f6;">View in Portal</a></p>
      `.trim()
      await sendEmail({
        to: customer.email,
        subject: "New message from Product Brands",
        html: getCustomEmailHtml(innerHtml),
      })
    }

    return NextResponse.json({
      message: {
        id: message.id,
        content: message.content,
        userId: message.userId,
        createdAt: message.createdAt.toISOString(),
        user: {
          name: message.user.name,
          email: message.user.email,
        },
      },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 }
      )
    }
    console.error("Admin send chat message error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

