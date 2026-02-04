import { NextRequest, NextResponse } from "next/server"
import { requireWriteAccess } from "@/lib/rbac"
import { prisma } from "@/lib/prisma"
import { quoteStatusUpdateSchema } from "@/lib/validations/admin"
import { logAudit, createAuditDiff } from "@/lib/audit"

// PATCH /api/admin/quotes/[id]/status - Update quote status
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireWriteAccess(req)
    if (auth instanceof NextResponse) return auth

    const existing = await prisma.quote.findUnique({
      where: { id: params.id },
    })

    if (!existing) {
      return NextResponse.json(
        { error: "Quote not found" },
        { status: 404 }
      )
    }

    const body = await req.json()
    const data = quoteStatusUpdateSchema.parse(body)

    const updated = await prisma.quote.update({
      where: { id: params.id },
      data: {
        status: data.status,
        ...(data.internalNotes && { internalNotes: data.internalNotes }),
        updatedAt: new Date(),
      },
    })

    // Audit log
    const diff = createAuditDiff(existing, updated)
    await logAudit({
      actorUserId: auth.userId,
      action: "status_change",
      entityType: "Quote",
      entityId: params.id,
      ...diff,
      metadata: {
        oldStatus: existing.status,
        newStatus: updated.status,
      },
      req,
    })

    return NextResponse.json(updated)
  } catch (error: any) {
    console.error("Error updating quote status:", error)
    if (error.name === "ZodError") {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: error.message || "Failed to update quote status" },
      { status: 500 }
    )
  }
}
