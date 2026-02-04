import { NextRequest, NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { requireAdminApi } from "@/lib/rbac"
import { prisma } from "@/lib/prisma"

// GET /api/admin/brands/[id]/products - List products for a brand
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAdminApi(req)

    const products = await prisma.product.findMany({
      where: { brandId: params.id },
      orderBy: [{ category: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
      include: {
        storeLinks: {
          orderBy: [{ isDefault: "desc" }, { sortOrder: "asc" }],
        },
      },
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
    const { name, description, bullets, category, imageUrl, amazonUrl, asin, priceAmount, sortOrder, storeLinks } = body

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 })
    }

    // Either storeLinks or amazonUrl is required
    if ((!storeLinks || storeLinks.length === 0) && !amazonUrl) {
      return NextResponse.json({ error: "At least one store link is required" }, { status: 400 })
    }

    // Check if ASIN is unique (only if provided)
    if (asin) {
      const existing = await prisma.product.findUnique({ where: { asin } })
      if (existing) {
        return NextResponse.json({ error: "A product with this ASIN already exists" }, { status: 400 })
      }
    }

    // Verify brand exists
    const brand = await prisma.brand.findUnique({ where: { id: params.id } })
    if (!brand) {
      return NextResponse.json({ error: "Brand not found" }, { status: 404 })
    }

    // Create product with store links
    const product = await prisma.product.create({
      data: {
        brandId: params.id,
        name,
        description,
        bullets: bullets || [],
        category,
        imageUrl,
        amazonUrl: amazonUrl || null,
        asin: asin || null,
        priceAmount,
        sortOrder: sortOrder || 0,
        isActive: true,
        storeLinks: storeLinks && storeLinks.length > 0 ? {
          create: storeLinks.map((link: any) => ({
            storeName: link.storeName,
            storeUrl: link.storeUrl,
            storeId: link.storeId || null,
            price: link.price || null,
            isDefault: link.isDefault || false,
            sortOrder: link.sortOrder || 0,
          })),
        } : undefined,
      },
      include: {
        storeLinks: true,
      },
    })

    // Revalidate cached pages
    revalidatePath("/")
    revalidatePath(`/brands/${brand.slug}`)

    return NextResponse.json(product)
  } catch (error: any) {
    console.error("Error creating product:", error)
    return NextResponse.json({ error: error.message || "Failed to create product" }, { status: 500 })
  }
}
