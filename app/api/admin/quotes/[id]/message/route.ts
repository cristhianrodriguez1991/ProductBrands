import { NextRequest, NextResponse } from "next/server"
import { requireWriteAccess } from "@/lib/rbac"
import { prisma } from "@/lib/prisma"
import { quoteMessageSchema } from "@/lib/validations/admin"
import { logAudit } from "@/lib/audit"

// POST /api/admin/quotes/[id]/message - Add message to quote thread
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireWriteAccess(req)
    if (auth instanceof NextResponse) return auth

    const quote = await prisma.quote.findUnique({
      where: { id: params.id },
    })

    if (!quote) {
      return NextResponse.json(
        { error: "Quote not found" },
        { status: 404 }
      )
    }

    const body = await req.json()
    const data = quoteMessageSchema.parse(body)

    const message = await prisma.quoteMessage.create({
      data: {
        quoteId: params.id,
        senderType: "ADMIN",
        senderUserId: auth.userId,
        message: data.message,
      },
      include: {
        senderUser: {
          select: { id: true, name: true, email: true },
        },
      },
    })

    // Audit log
    await logAudit({
      actorUserId: auth.userId,
      action: "message_added",
      entityType: "Quote",
      entityId: params.id,
      metadata: {
        messageId: message.id,
        isInternal: data.isInternal,
      },
      req,
    })

    return NextResponse.json(message, { status: 201 })
  } catch (error: any) {
    console.error("Error adding message:", error)
    if (error.name === "ZodError") {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: error.message || "Failed to add message" },
      { status: 500 }
    )
  }
}
