import { NextRequest, NextResponse } from "next/server"
import { requireWriteAccess } from "@/lib/rbac"
import { prisma } from "@/lib/prisma"
import { logAudit } from "@/lib/audit"
import { generateSlug } from "@/lib/admin-utils"

// POST /api/admin/listings/[id]/duplicate - Duplicate listing
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireWriteAccess(req)
    if (auth instanceof NextResponse) return auth

    const original = await prisma.listing.findUnique({
      where: { id: params.id },
      include: {
        variants: true,
        media: true,
      },
    })

    if (!original) {
      return NextResponse.json(
        { error: "Listing not found" },
        { status: 404 }
      )
    }

    // Create duplicate with new slug
    const newSlug = `${original.slug}-copy-${Date.now()}`
    const duplicated = await prisma.listing.create({
      data: {
        title: `${original.title} (Copy)`,
        slug: newSlug,
        description: original.description,
        status: "DRAFT" as any,
        categoryId: original.categoryId,
        brand: original.brand,
        moq: original.moq,
        leadTimeDays: original.leadTimeDays,
        basePrice: original.basePrice,
        pricingModel: original.pricingModel,
        variants: {
          create: original.variants.map((v) => ({
            sku: `${v.sku}-copy`,
            option1Name: v.option1Name,
            option1Value: v.option1Value,
            option2Name: v.option2Name,
            option2Value: v.option2Value,
            cost: v.cost,
            price: v.price,
            moq: v.moq,
            leadTimeDays: v.leadTimeDays,
            active: v.active,
          })),
        },
        media: {
          create: original.media.map((m) => ({
            url: m.url,
            alt: m.alt,
            sortOrder: m.sortOrder,
          })),
        },
      },
      include: {
        category: true,
        variants: true,
        media: true,
      },
    })

    // Audit log
    await logAudit({
      actorUserId: auth.userId,
      action: "duplicated",
      entityType: "Listing",
      entityId: duplicated.id,
      metadata: {
        sourceListingId: original.id,
        sourceTitle: original.title,
      },
      req,
    })

    return NextResponse.json(duplicated, { status: 201 })
  } catch (error: any) {
    console.error("Error duplicating listing:", error)
    return NextResponse.json(
      { error: error.message || "Failed to duplicate listing" },
      { status: 500 }
    )
  }
}
