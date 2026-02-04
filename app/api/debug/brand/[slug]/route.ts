import { NextResponse } from "next/server"
import { unstable_noStore as noStore } from "next/cache"
import { prisma } from "@/lib/prisma"

// Debug endpoint to check what data the server is returning
export const dynamic = "force-dynamic"
export const revalidate = 0

export async function GET(
  req: Request,
  { params }: { params: { slug: string } }
) {
  noStore()
  
  const brand = await prisma.brand.findUnique({
    where: { slug: params.slug },
    include: {
      products: {
        orderBy: [{ category: "asc" }, { name: "asc" }],
      },
    },
  })

  if (!brand) {
    return NextResponse.json({ error: "Brand not found" }, { status: 404 })
  }

  // Get unique categories
  const categories = [...new Set(brand.products.map(p => p.category).filter(Boolean))]
  
  // Count products by category
  const productsByCategory: Record<string, number> = {}
  brand.products.forEach(p => {
    const cat = p.category || "Uncategorized"
    productsByCategory[cat] = (productsByCategory[cat] || 0) + 1
  })

  return NextResponse.json({
    brandName: brand.name,
    brandSlug: brand.slug,
    totalProducts: brand.products.length,
    categories,
    productsByCategory,
    timestamp: new Date().toISOString(),
  }, {
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  })
}
