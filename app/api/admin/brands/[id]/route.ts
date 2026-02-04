import { NextRequest, NextResponse } from "next/server"
import { requireAdminApi } from "@/lib/rbac"
import { prisma } from "@/lib/prisma"

// GET /api/admin/brands/[id] - Get single brand
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAdminApi(req)

    const brand = await prisma.brand.findUnique({
      where: { id: params.id },
      include: {
        parent: { select: { id: true, name: true, slug: true } },
        children: { select: { id: true, name: true, slug: true } },
        products: {
          orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        },
      },
    })

    if (!brand) {
      return NextResponse.json({ error: "Brand not found" }, { status: 404 })
    }

    return NextResponse.json(brand)
  } catch (error: any) {
    console.error("Error fetching brand:", error)
    return NextResponse.json({ error: error.message || "Failed to fetch brand" }, { status: 500 })
  }
}

// PATCH /api/admin/brands/[id] - Update brand
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAdminApi(req)

    const body = await req.json()
    const { name, slug, parentId, description, heroImage, sortOrder } = body

    // Check if slug is unique (excluding current brand)
    if (slug) {
      const existing = await prisma.brand.findFirst({
        where: { slug, NOT: { id: params.id } },
      })
      if (existing) {
        return NextResponse.json({ error: "A brand with this slug already exists" }, { status: 400 })
      }
    }

    const brand = await prisma.brand.update({
      where: { id: params.id },
      data: {
        ...(name !== undefined && { name }),
        ...(slug !== undefined && { slug }),
        ...(parentId !== undefined && { parentId: parentId || null }),
        ...(description !== undefined && { description }),
        ...(heroImage !== undefined && { heroImage }),
        ...(sortOrder !== undefined && { sortOrder }),
      },
    })

    return NextResponse.json(brand)
  } catch (error: any) {
    console.error("Error updating brand:", error)
    return NextResponse.json({ error: error.message || "Failed to update brand" }, { status: 500 })
  }
}

// DELETE /api/admin/brands/[id] - Delete brand
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAdminApi(req)

    await prisma.brand.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Error deleting brand:", error)
    return NextResponse.json({ error: error.message || "Failed to delete brand" }, { status: 500 })
  }
}
