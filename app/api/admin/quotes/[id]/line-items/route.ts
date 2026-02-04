import { NextRequest, NextResponse } from "next/server"
import { requireWriteAccess } from "@/lib/rbac"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { logAudit } from "@/lib/audit"

const lineItemsUpdateSchema = z.object({
  lineItems: z.array(z.object({
    id: z.string().optional(),
    listingId: z.string().optional(),
    variantId: z.string().optional(),
    customTitle: z.string().optional(),
    description: z.string().min(1),
    quantity: z.number().int().positive(),
    specs: z.record(z.any()).optional(),
    unitPrice: z.number().nonnegative().optional(),
    lineTotal: z.number().nonnegative().optional(),
    internalCost: z.number().nonnegative().optional(),
    margin: z.number().nonnegative().max(100).optional(),
    notes: z.string().optional(),
  })),
})

// PUT /api/admin/quotes/[id]/line-items - Update quote line items
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireWriteAccess(req)
    if (auth instanceof NextResponse) return auth

    const quote = await prisma.quote.findUnique({
      where: { id: params.id },
      include: { lineItems: true },
    })

    if (!quote) {
      return NextResponse.json(
        { error: "Quote not found" },
        { status: 404 }
      )
    }

    const body = await req.json()
    const data = lineItemsUpdateSchema.parse(body)

    // Delete existing line items
    await prisma.quoteLineItem.deleteMany({
      where: { quoteId: params.id },
    })

    // Create new line items
    const lineItems = await Promise.all(
      data.lineItems.map((item) =>
        prisma.quoteLineItem.create({
          data: {
            quoteId: params.id,
            listingId: item.listingId,
            variantId: item.variantId,
            customTitle: item.customTitle,
            description: item.description,
            quantity: item.quantity,
            specs: item.specs ? JSON.parse(JSON.stringify(item.specs)) : null,
            unitPrice: item.unitPrice,
            lineTotal: item.lineTotal || (item.unitPrice ? item.unitPrice * item.quantity : null),
            internalCost: item.internalCost,
            margin: item.margin,
            notes: item.notes,
          },
        })
      )
    )

    // Calculate and update total estimate
    const totalEstimate = lineItems.reduce(
      (sum, item) => sum + (item.lineTotal || 0),
      0
    )

    await prisma.quote.update({
      where: { id: params.id },
      data: { totalEstimate },
    })

    // Audit log
    await logAudit({
      actorUserId: auth.userId,
      action: "pricing_edited",
      entityType: "Quote",
      entityId: params.id,
      metadata: {
        lineItemsCount: lineItems.length,
        totalEstimate,
      },
      req,
    })

    return NextResponse.json({ lineItems, totalEstimate })
  } catch (error: any) {
    console.error("Error updating line items:", error)
    if (error.name === "ZodError") {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: error.message || "Failed to update line items" },
      { status: 500 }
    )
  }
}
