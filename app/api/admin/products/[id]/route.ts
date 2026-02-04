import { NextRequest, NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { requireAdminApi } from "@/lib/rbac"
import { prisma } from "@/lib/prisma"

// GET /api/admin/products/[id] - Get single product
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAdminApi(req)

    const product = await prisma.product.findUnique({
      where: { id: params.id },
      include: {
        brand: { select: { id: true, name: true, slug: true } },
        storeLinks: {
          orderBy: [{ isDefault: "desc" }, { sortOrder: "asc" }],
        },
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
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAdminApi(req)

    const body = await req.json()
    const { name, description, bullets, category, imageUrl, amazonUrl, asin, priceAmount, isActive, sortOrder, brandId, storeLinks } = body

    // Check if ASIN is unique (excluding current product) - only if asin is provided and not empty
    if (asin) {
      const existing = await prisma.product.findFirst({
        where: { asin, NOT: { id: params.id } },
      })
      if (existing) {
        return NextResponse.json({ error: "A product with this ASIN already exists" }, { status: 400 })
      }
    }

    // Update product
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
      include: {
        brand: { select: { slug: true } },
      },
    })

    // Handle store links if provided
    if (storeLinks !== undefined) {
      // Delete existing store links
      await prisma.productStoreLink.deleteMany({
        where: { productId: params.id },
      })

      // Create new store links
      if (storeLinks && storeLinks.length > 0) {
        await prisma.productStoreLink.createMany({
          data: storeLinks.map((link: any) => ({
            productId: params.id,
            storeName: link.storeName,
            storeUrl: link.storeUrl,
            storeId: link.storeId || null,
            price: link.price || null,
            isDefault: link.isDefault || false,
            sortOrder: link.sortOrder || 0,
          })),
        })
      }
    }

    // Revalidate cached pages
    revalidatePath("/")
    if (product.brand?.slug) {
      revalidatePath(`/brands/${product.brand.slug}`)
    }

    // Fetch updated product with store links
    const updatedProduct = await prisma.product.findUnique({
      where: { id: params.id },
      include: {
        brand: { select: { slug: true } },
        storeLinks: {
          orderBy: [{ isDefault: "desc" }, { sortOrder: "asc" }],
        },
      },
    })

    return NextResponse.json(updatedProduct)
  } catch (error: any) {
    console.error("Error updating product:", error)
    return NextResponse.json({ error: error.message || "Failed to update product" }, { status: 500 })
  }
}

// DELETE /api/admin/products/[id] - Delete product
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAdminApi(req)

    // Get product with brand slug before deleting for revalidation
    const product = await prisma.product.findUnique({
      where: { id: params.id },
      include: { brand: { select: { slug: true } } },
    })

    await prisma.product.delete({
      where: { id: params.id },
    })

    // Revalidate cached pages
    revalidatePath("/")
    if (product?.brand?.slug) {
      revalidatePath(`/brands/${product.brand.slug}`)
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Error deleting product:", error)
    return NextResponse.json({ error: error.message || "Failed to delete product" }, { status: 500 })
  }
}
