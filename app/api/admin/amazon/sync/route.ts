import { NextResponse } from "next/server"
import { getItems } from "@/lib/amazon-service"
import { loadBrandCatalog } from "@/lib/brand-catalog"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export async function POST() {
  // Admin-only guard
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any)?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const catalog = loadBrandCatalog()

  // Build asin -> brandSlug map from seed
  const asinToBrandSlug = new Map<string, string>()
  for (const brand of catalog.brands) {
    for (const product of brand.products) {
      asinToBrandSlug.set(product.asin, brand.slug)
    }
  }

  const allAsins = Array.from(asinToBrandSlug.keys())

  if (allAsins.length === 0) {
    return NextResponse.json({ success: true, synced: 0 })
  }

  // Ensure Brand rows exist for each brand in the catalog
  const slugToBrandId = new Map<string, string>()
  for (const brandSeed of catalog.brands) {
    // Handle parent brand if provided
    let parentId: string | null = null
    if (brandSeed.parentSlug) {
      const parent = await prisma.brand.upsert({
        where: { slug: brandSeed.parentSlug },
        update: {
          name: brandSeed.parentSlug.toUpperCase(),
        },
        create: {
          slug: brandSeed.parentSlug,
          name: brandSeed.parentSlug.toUpperCase(),
        },
      })
      parentId = parent.id
    }

    const brand = await prisma.brand.upsert({
      where: { slug: brandSeed.slug },
      update: {
        name: brandSeed.name,
        parentId: parentId ?? undefined,
      },
      create: {
        slug: brandSeed.slug,
        name: brandSeed.name,
        parentId,
      },
    })

    slugToBrandId.set(brandSeed.slug, brand.id)
  }

  // PA-API GetItems can accept batches; keep it simple and do one big call for now
  let items
  try {
    items = await getItems(allAsins)
  } catch (error: any) {
    console.error("Amazon PA-API error:", error?.message || error)
    return NextResponse.json({ error: "Amazon PA-API request failed" }, { status: 500 })
  }

  let syncedCount = 0

  for (const item of items) {
    const asin: string | undefined = item.ASIN
    if (!asin) continue

    const brandSlug = asinToBrandSlug.get(asin)
    if (!brandSlug) continue

    const brandId = slugToBrandId.get(brandSlug)
    if (!brandId) continue

    const title = item.ItemInfo?.Title?.DisplayValue ?? "Untitled product"
    const imageUrl = item.Images?.Primary?.Large?.URL ?? null
    const bullets: string[] = item.ItemInfo?.Features?.DisplayValues ?? []

    const listing = item.Offers?.Listings?.[0]
    const priceAmount = listing?.Price?.Amount ?? null
    const priceCurrency = listing?.Price?.Currency ?? null

    const rating = item.CustomerReviews?.StarRating ?? null
    const reviewCount = item.CustomerReviews?.Count ?? null

    // Find existing product by ASIN
    const existingProduct = await prisma.product.findFirst({
      where: { asin },
    })

    if (existingProduct) {
      // Update existing product
      await prisma.product.update({
        where: { id: existingProduct.id },
        data: {
          name: title,
          imageUrl: imageUrl ?? undefined,
          bullets,
          priceAmount: priceAmount ?? undefined,
          priceCurrency: priceCurrency ?? undefined,
          rating: rating ?? undefined,
          reviewCount: reviewCount ?? undefined,
          lastSyncedAt: new Date(),
        },
      })
    } else {
      // Create new product
      await prisma.product.create({
        data: {
          asin,
          brandId,
          name: title,
          imageUrl: imageUrl ?? undefined,
          bullets,
          amazonUrl: `https://www.amazon.com/dp/${asin}`,
          priceAmount: priceAmount ?? undefined,
          priceCurrency: priceCurrency ?? undefined,
          rating: rating ?? undefined,
          reviewCount: reviewCount ?? undefined,
          lastSyncedAt: new Date(),
        },
      })
    }

    syncedCount++
  }

  return NextResponse.json({ success: true, synced: syncedCount })
}


