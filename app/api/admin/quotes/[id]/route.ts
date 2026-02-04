import { NextRequest, NextResponse } from "next/server"
import { requireWriteAccess } from "@/lib/rbac"
import { prisma } from "@/lib/prisma"
import { quoteUpdateSchema } from "@/lib/validations/admin"
import { logAudit, createAuditDiff } from "@/lib/audit"

// GET /api/admin/quotes/[id] - Get single quote
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireWriteAccess(req)
    if (auth instanceof NextResponse) return auth

    const quote = await prisma.quote.findUnique({
      where: { id: params.id },
      include: {
        company: true,
        contact: true,
        createdBy: {
          select: { id: true, name: true, email: true },
        },
        attachments: true,
        lineItems: {
          include: {
            listing: {
              select: { id: true, title: true, slug: true },
            },
            variant: {
              select: { id: true, sku: true },
            },
          },
        },
        messages: {
          include: { user: true },
          orderBy: { createdAt: "desc" },
        },
        quoteMessages: {
          include: {
            senderUser: {
              select: { id: true, name: true, email: true },
            },
          },
          orderBy: { createdAt: "asc" },
        },
        orders: {
          select: { id: true, orderNumber: true, status: true },
        },
      },
    })

    if (!quote) {
      return NextResponse.json(
        { error: "Quote not found" },
        { status: 404 }
      )
    }

    return NextResponse.json(quote)
  } catch (error: any) {
    console.error("Error fetching quote:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch quote" },
      { status: 500 }
    )
  }
}

// PATCH /api/admin/quotes/[id] - Update quote (general update)
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
    const data = quoteUpdateSchema.parse(body)

    const updated = await prisma.quote.update({
      where: { id: params.id },
      data: {
        ...(data.status && { status: data.status }),
        ...(data.contactId && { contactId: data.contactId }),
        ...(data.internalNotes !== undefined && { internalNotes: data.internalNotes }),
        ...(data.adminNotes !== undefined && { adminNotes: data.adminNotes }),
        ...(data.totalEstimate !== undefined && { totalEstimate: data.totalEstimate }),
        ...(data.targetDueDate && { targetDueDate: new Date(data.targetDueDate) }),
        updatedAt: new Date(),
      },
    })

    // Audit log
    const diff = createAuditDiff(existing, updated)
    await logAudit({
      actorUserId: auth.userId,
      action: "updated",
      entityType: "Quote",
      entityId: params.id,
      ...diff,
      req,
    })

    return NextResponse.json(updated)
  } catch (error: any) {
    console.error("Error updating quote:", error)
    if (error.name === "ZodError") {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: error.message || "Failed to update quote" },
      { status: 500 }
    )
  }
}

