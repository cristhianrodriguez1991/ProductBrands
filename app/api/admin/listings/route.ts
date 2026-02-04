import { NextRequest, NextResponse } from "next/server"
import { requireWriteAccess } from "@/lib/rbac"
import { prisma } from "@/lib/prisma"
import { listingListQuerySchema, listingWithVariantsSchema } from "@/lib/validations/admin"
import { logAudit, createAuditDiff } from "@/lib/audit"
import { generateSlug } from "@/lib/admin-utils"

// GET /api/admin/listings - List all listings
export async function GET(req: NextRequest) {
  try {
    const auth = await requireWriteAccess(req)
    if (auth instanceof NextResponse) return auth

    const { searchParams } = new URL(req.url)
    const query = listingListQuerySchema.parse({
      status: searchParams.get("status"),
      categoryId: searchParams.get("categoryId"),
      search: searchParams.get("search"),
      page: searchParams.get("page"),
      limit: searchParams.get("limit"),
    })

    const where: any = {}
    if (query.status) where.status = query.status
    if (query.categoryId) where.categoryId = query.categoryId
    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: "insensitive" } },
        { description: { contains: query.search, mode: "insensitive" } },
        { slug: { contains: query.search, mode: "insensitive" } },
      ]
    }

    const [listings, total] = await Promise.all([
      prisma.listing.findMany({
        where,
        include: {
          category: true,
          variants: {
            where: { active: true },
          },
          media: {
            orderBy: { sortOrder: "asc" },
          },
        },
        orderBy: { updatedAt: "desc" },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      prisma.listing.count({ where }),
    ])

    return NextResponse.json({
      listings,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    })
  } catch (error: any) {
    console.error("Error fetching listings:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch listings" },
      { status: 500 }
    )
  }
}

// POST /api/admin/listings - Create new listing
export async function POST(req: NextRequest) {
  try {
    const auth = await requireWriteAccess(req)
    if (auth instanceof NextResponse) return auth

    const body = await req.json()
    const data = listingWithVariantsSchema.parse(body)

    // Generate slug if not provided
    const slug = data.slug || generateSlug(data.title)

    // Check if slug exists
    const existing = await prisma.listing.findUnique({
      where: { slug },
    })

    if (existing) {
      return NextResponse.json(
        { error: "Slug already exists" },
        { status: 400 }
      )
    }

    const { variants, media, ...listingData } = data

    const listing = await prisma.listing.create({
      data: {
        ...listingData,
        slug,
        variants: variants
          ? {
              create: variants.map((v) => ({
                sku: v.sku,
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
            }
          : undefined,
        media: media
          ? {
              create: media.map((m) => ({
                url: m.url,
                alt: m.alt,
                sortOrder: m.sortOrder,
              })),
            }
          : undefined,
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
      action: "created",
      entityType: "Listing",
      entityId: listing.id,
      after: listing,
      req,
    })

    return NextResponse.json(listing, { status: 201 })
  } catch (error: any) {
    console.error("Error creating listing:", error)
    if (error.name === "ZodError") {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: error.message || "Failed to create listing" },
      { status: 500 }
    )
  }
}
