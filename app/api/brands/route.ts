import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// Disable caching - always fetch fresh data
export const dynamic = "force-dynamic"
export const revalidate = 0

// GET /api/brands - Public API to list brands for navigation
export async function GET() {
  try {
    const brands = await prisma.brand.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: {
        children: {
          orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        },
        products: {
          where: { isActive: true },
          select: { category: true },
          distinct: ["category"],
        },
      },
    })

    // Transform to navigation-friendly format
    const result = brands
      .filter((b) => !b.parentId) // Only top-level brands
      .map((brand) => ({
        id: brand.id,
        name: brand.name,
        slug: brand.slug,
        description: brand.description,
        categories: [...new Set(brand.products.map((p) => p.category).filter(Boolean))],
        children: brand.children.map((child) => ({
          id: child.id,
          name: child.name,
          slug: child.slug,
        })),
      }))

    return NextResponse.json(result, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        "Pragma": "no-cache",
        "Expires": "0",
      },
    })
  } catch (error: any) {
    console.error("Error fetching brands:", error)
    return NextResponse.json({ error: error.message || "Failed to fetch brands" }, { status: 500 })
  }
}
