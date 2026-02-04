import { NextResponse } from "next/server"
import { requireAdminApi } from "@/lib/rbac"
import { prisma } from "@/lib/prisma"

// GET /api/admin/brands - List all brands
export async function GET(req: Request) {
  try {
    await requireAdminApi(req)

    const brands = await prisma.brand.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: {
        parent: { select: { id: true, name: true, slug: true } },
        children: { select: { id: true, name: true, slug: true } },
        _count: { select: { products: true } },
      },
    })

    return NextResponse.json(brands)
  } catch (error: any) {
    console.error("Error fetching brands:", error)
    return NextResponse.json({ error: error.message || "Failed to fetch brands" }, { status: 500 })
  }
}

// POST /api/admin/brands - Create a brand
export async function POST(req: Request) {
  try {
    await requireAdminApi(req)

    const body = await req.json()
    const { name, slug, parentId, description, heroImage, sortOrder } = body

    if (!name || !slug) {
      return NextResponse.json({ error: "Name and slug are required" }, { status: 400 })
    }

    // Check if slug is unique
    const existing = await prisma.brand.findUnique({ where: { slug } })
    if (existing) {
      return NextResponse.json({ error: "A brand with this slug already exists" }, { status: 400 })
    }

    const brand = await prisma.brand.create({
      data: {
        name,
        slug,
        parentId: parentId || null,
        description,
        heroImage,
        sortOrder: sortOrder || 0,
      },
    })

    return NextResponse.json(brand)
  } catch (error: any) {
    console.error("Error creating brand:", error)
    return NextResponse.json({ error: error.message || "Failed to create brand" }, { status: 500 })
  }
}
