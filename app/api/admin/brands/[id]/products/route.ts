import { NextRequest, NextResponse } from "next/server"
import { requireAdminApi } from "@/lib/rbac"
import { prisma } from "@/lib/prisma"

// GET /api/admin/brands/[id]/products - List products for a brand
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAdminApi(req)

    const products = await prisma.product.findMany({
      where: { brandId: params.id },
      orderBy: [{ category: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
    })

    return NextResponse.json(products)
  } catch (error: any) {
    console.error("Error fetching products:", error)
    return NextResponse.json({ error: error.message || "Failed to fetch products" }, { status: 500 })
  }
}

// POST /api/admin/brands/[id]/products - Add product to brand
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAdminApi(req)

    const body = await req.json()
    const { name, description, bullets, category, imageUrl, amazonUrl, asin, priceAmount, sortOrder } = body

    if (!name || !amazonUrl || !asin) {
      return NextResponse.json({ error: "Name, Amazon URL, and ASIN are required" }, { status: 400 })
    }

    // Check if ASIN is unique
    const existing = await prisma.product.findUnique({ where: { asin } })
    if (existing) {
      return NextResponse.json({ error: "A product with this ASIN already exists" }, { status: 400 })
    }

    // Verify brand exists
    const brand = await prisma.brand.findUnique({ where: { id: params.id } })
    if (!brand) {
      return NextResponse.json({ error: "Brand not found" }, { status: 404 })
    }

    const product = await prisma.product.create({
      data: {
        brandId: params.id,
        name,
        description,
        bullets: bullets || [],
        category,
        imageUrl,
        amazonUrl,
        asin,
        priceAmount,
        sortOrder: sortOrder || 0,
      },
    })

    return NextResponse.json(product)
  } catch (error: any) {
    console.error("Error creating product:", error)
    return NextResponse.json({ error: error.message || "Failed to create product" }, { status: 500 })
  }
}
