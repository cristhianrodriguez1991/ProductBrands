import { NextResponse } from "next/server"
import { requireAdminApi } from "@/lib/rbac"
import { prisma } from "@/lib/prisma"

// GET /api/admin/products/[id] - Get single product
export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    await requireAdminApi(req)

    const product = await prisma.product.findUnique({
      where: { id: params.id },
      include: {
        brand: { select: { id: true, name: true, slug: true } },
      },
    })

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 })
    }

    return NextResponse.json(product)
  } catch (error: any) {
    console.error("Error fetching product:", error)
    return NextResponse.json({ error: error.message || "Failed to fetch product" }, { status: 500 })
  }
}

// PATCH /api/admin/products/[id] - Update product
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    await requireAdminApi(req)

    const body = await req.json()
    const { name, description, bullets, category, imageUrl, amazonUrl, asin, priceAmount, isActive, sortOrder, brandId } = body

    // Check if ASIN is unique (excluding current product)
    if (asin) {
      const existing = await prisma.product.findFirst({
        where: { asin, NOT: { id: params.id } },
      })
      if (existing) {
        return NextResponse.json({ error: "A product with this ASIN already exists" }, { status: 400 })
      }
    }

    const product = await prisma.product.update({
      where: { id: params.id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(bullets !== undefined && { bullets }),
        ...(category !== undefined && { category }),
        ...(imageUrl !== undefined && { imageUrl }),
        ...(amazonUrl !== undefined && { amazonUrl }),
        ...(asin !== undefined && { asin }),
        ...(priceAmount !== undefined && { priceAmount }),
        ...(isActive !== undefined && { isActive }),
        ...(sortOrder !== undefined && { sortOrder }),
        ...(brandId !== undefined && { brandId }),
      },
    })

    return NextResponse.json(product)
  } catch (error: any) {
    console.error("Error updating product:", error)
    return NextResponse.json({ error: error.message || "Failed to update product" }, { status: 500 })
  }
}

// DELETE /api/admin/products/[id] - Delete product
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    await requireAdminApi(req)

    await prisma.product.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Error deleting product:", error)
    return NextResponse.json({ error: error.message || "Failed to delete product" }, { status: 500 })
  }
}
