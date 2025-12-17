import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session.user as any)?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const userId = searchParams.get("userId")

    if (!userId) {
      return NextResponse.json({ error: "User ID required" }, { status: 400 })
    }

    // Get all messages between admin and this user (general chat only)
    const messages = await prisma.message.findMany({
      where: {
        AND: [
          {
            OR: [
              { userId },
              { userId: (session.user as any).id },
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
    })

    return NextResponse.json({
      messages: messages.map((msg) => ({
        id: msg.id,
        content: msg.content,
        userId: msg.userId,
        createdAt: msg.createdAt.toISOString(),
        user: {
          name: msg.user.name,
          email: msg.user.email,
        },
      })),
    })
  } catch (error) {
    console.error("Admin chat messages error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

