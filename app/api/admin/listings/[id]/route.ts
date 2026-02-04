import { NextRequest, NextResponse } from "next/server"
import { requireWriteAccess } from "@/lib/rbac"
import { prisma } from "@/lib/prisma"
import { listingUpdateSchema, listingWithVariantsSchema } from "@/lib/validations/admin"
import { logAudit, createAuditDiff } from "@/lib/audit"
import { generateSlug } from "@/lib/admin-utils"

// GET /api/admin/listings/[id] - Get single listing
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireWriteAccess(req)
    if (auth instanceof NextResponse) return auth

    const listing = await prisma.listing.findUnique({
      where: { id: params.id },
      include: {
        category: true,
        variants: true,
        media: {
          orderBy: { sortOrder: "asc" },
        },
      },
    })

    if (!listing) {
      return NextResponse.json(
        { error: "Listing not found" },
        { status: 404 }
      )
    }

    return NextResponse.json(listing)
  } catch (error: any) {
    console.error("Error fetching listing:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch listing" },
      { status: 500 }
    )
  }
}

// PATCH /api/admin/listings/[id] - Update listing
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireWriteAccess(req)
    if (auth instanceof NextResponse) return auth

    const existing = await prisma.listing.findUnique({
      where: { id: params.id },
      include: { variants: true, media: true },
    })

    if (!existing) {
      return NextResponse.json(
        { error: "Listing not found" },
        { status: 404 }
      )
    }

    const body = await req.json()
    const data = listingWithVariantsSchema.partial().parse(body)

    // Handle slug generation if title changed
    let slug = data.slug
    if (data.title && !slug) {
      slug = generateSlug(data.title)
      // Check if new slug conflicts
      const conflict = await prisma.listing.findUnique({
        where: { slug },
      })
      if (conflict && conflict.id !== params.id) {
        slug = `${slug}-${Date.now()}`
      }
    }

    const { variants, media, ...listingData } = data

    // Update listing
    const updated = await prisma.listing.update({
      where: { id: params.id },
      data: {
        ...listingData,
        ...(slug && { slug }),
        updatedAt: new Date(),
      },
      include: {
        category: true,
        variants: true,
        media: true,
      },
    })

    // Handle variants update (simplified - delete all and recreate)
    if (variants) {
      await prisma.listingVariant.deleteMany({
        where: { listingId: params.id },
      })
      await prisma.listingVariant.createMany({
        data: variants.map((v) => ({
          listingId: params.id,
          sku: v.sku,
          option1Name: v.option1Name,
          option1Value: v.option1Value,
          option2Name: v.option2Name,
          option2Value: v.option2Value,
          cost: v.cost,
          price: v.price,
          moq: v.moq,
          leadTimeDays: v.leadTimeDays,
          active: v.active ?? true,
        })),
      })
    }

    // Handle media update
    if (media) {
      await prisma.listingMedia.deleteMany({
        where: { listingId: params.id },
      })
      await prisma.listingMedia.createMany({
        data: media.map((m) => ({
          listingId: params.id,
          url: m.url,
          alt: m.alt,
          sortOrder: m.sortOrder ?? 0,
        })),
      })
    }

    // Reload with all relations
    const final = await prisma.listing.findUnique({
      where: { id: params.id },
      include: {
        category: true,
        variants: true,
        media: {
          orderBy: { sortOrder: "asc" },
        },
      },
    })

    // Audit log
    const diff = createAuditDiff(existing, final!)
    await logAudit({
      actorUserId: auth.userId,
      action: "updated",
      entityType: "Listing",
      entityId: params.id,
      ...diff,
      req,
    })

    return NextResponse.json(final)
  } catch (error: any) {
    console.error("Error updating listing:", error)
    if (error.name === "ZodError") {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: error.message || "Failed to update listing" },
      { status: 500 }
    )
  }
}

// DELETE /api/admin/listings/[id] - Archive listing (soft delete)
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireWriteAccess(req)
    if (auth instanceof NextResponse) return auth

    const existing = await prisma.listing.findUnique({
      where: { id: params.id },
    })

    if (!existing) {
      return NextResponse.json(
        { error: "Listing not found" },
        { status: 404 }
      )
    }

    // Soft delete: set status to ARCHIVED
    const updated = await prisma.listing.update({
      where: { id: params.id },
      data: {
        status: "ARCHIVED" as any,
      },
    })

    // Audit log
    await logAudit({
      actorUserId: auth.userId,
      action: "archived",
      entityType: "Listing",
      entityId: params.id,
      before: existing,
      after: updated,
      req,
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Error archiving listing:", error)
    return NextResponse.json(
      { error: error.message || "Failed to archive listing" },
      { status: 500 }
    )
  }
}
