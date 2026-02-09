import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { sendEmail, getCustomEmailHtml, escapeHtml } from "@/lib/email"
import { z } from "zod"

const sendMessageSchema = z.object({
  content: z.string().min(1).max(2000),
})

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { content } = sendMessageSchema.parse(body)
    const userId = (session.user as any).id
    const userRole = (session.user as any).role

    // Create a chat message (without quote/order association for general chat)
    const message = await prisma.message.create({
      data: {
        userId,
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

    // Notify admins of new customer message
    if (userRole === "CUSTOMER") {
      const admins = await prisma.user.findMany({
        where: { role: "ADMIN" },
      })

      const baseUrl = process.env.NEXTAUTH_URL || ""
      const sender = escapeHtml(session.user?.name || session.user?.email || "A customer")
      const safeContent = escapeHtml(content)
      const viewUrl = baseUrl ? `${baseUrl}/admin/chat` : "#"
      const innerHtml = `
        <p style="margin:0 0 12px 0; font-size:15px; color:#3f3f46; line-height:1.5;">You have a new chat message from <strong>${sender}</strong>.</p>
        <p style="margin:0 0 16px 0; font-size:15px; color:#3f3f46; line-height:1.6;">${safeContent}</p>
        <p style="margin:0;"><a href="${viewUrl}" style="color:#3b82f6;">View in Admin Chat</a></p>
      `.trim()
      for (const admin of admins) {
        await sendEmail({
          to: admin.email,
          subject: "New Chat Message from Customer",
          html: getCustomEmailHtml(innerHtml),
        })
      }
    }

    return NextResponse.json({
      message: {
        id: message.id,
        content: message.content,
        senderId: message.userId,
        senderName: message.user.name || message.user.email,
        senderRole: message.user.role,
        createdAt: message.createdAt.toISOString(),
        isRead: true,
      },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 }
      )
    }
    console.error("Send chat message error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

