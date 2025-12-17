import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = (session.user as any).id

    // Get chat messages for this user (general chat - no quote/order association)
    const chatMessages = await prisma.message.findMany({
      where: {
        AND: [
          {
            OR: [
              { userId },
              {
                // Admin messages in general chat
                user: { role: "ADMIN" },
              },
            ],
          },
          {
            quoteId: null,
            orderId: null,
          },
        ],
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
      orderBy: { createdAt: "asc" },
      take: 50,
    })

    const messages = chatMessages.map((msg) => ({
      id: msg.id,
      content: msg.content,
      senderId: msg.userId,
      senderName: msg.user.name || msg.user.email,
      senderRole: msg.user.role,
      createdAt: msg.createdAt.toISOString(),
      isRead: true,
    }))

    return NextResponse.json({ messages })
  } catch (error) {
    console.error("Chat messages error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

