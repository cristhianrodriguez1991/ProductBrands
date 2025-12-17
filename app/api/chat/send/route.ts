import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { sendEmail } from "@/lib/email"
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

      for (const admin of admins) {
        await sendEmail({
          to: admin.email,
          subject: "New Chat Message from Customer",
          html: `
            <p>You have a new chat message from ${session.user?.name || session.user?.email}:</p>
            <p><strong>${content}</strong></p>
            <p><a href="${process.env.NEXTAUTH_URL}/admin/chat">View Chat</a></p>
          `,
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

