import { PrismaClient } from "@prisma/client"
import fs from "fs"
import path from "path"

const prisma = new PrismaClient()

type SeedProduct = {
  asin: string
  amazonUrl: string
  title?: string
  imageUrl?: string
  description?: string
  bullets?: string[]
  category?: string
}

type SeedBrand = {
  slug: string
  name: string
  parentSlug: string | null
  products: SeedProduct[]
}

type Catalog = {
  brands: SeedBrand[]
}

async function main() {
  console.log("Loading brand catalog from JSON...")
  const filePath = path.join(process.cwd(), "data", "brandCatalog.seed.json")
  const raw = fs.readFileSync(filePath, "utf8")
  const catalog: Catalog = JSON.parse(raw)

  console.log(`Found ${catalog.brands.length} brands to migrate`)

  // First, create parent brands (those without parentSlug)
  const parentBrands = catalog.brands.filter((b) => !b.parentSlug)
  const childBrands = catalog.brands.filter((b) => b.parentSlug)

  // Create a map to store brand IDs
  const brandIdMap: Record<string, string> = {}

  // Create parent brands first
  for (const brand of parentBrands) {
    console.log(`\nCreating parent brand: ${brand.name} (${brand.slug})`)

    // Check if brand already exists
    const existing = await prisma.brand.findUnique({ where: { slug: brand.slug } })
    if (existing) {
      console.log(`  Brand already exists, skipping creation`)
      brandIdMap[brand.slug] = existing.id
    } else {
      const created = await prisma.brand.create({
        data: {
          name: brand.name,
          slug: brand.slug,
          description: `${brand.name} products`,
        },
      })
      brandIdMap[brand.slug] = created.id
      console.log(`  Created brand with ID: ${created.id}`)
    }

    // Create products for this brand
    await createProducts(brandIdMap[brand.slug], brand.products)
  }

  // Now create child brands
  for (const brand of childBrands) {
    console.log(`\nCreating child brand: ${brand.name} (${brand.slug})`)

    // Get parent ID
    const parentId = brand.parentSlug ? brandIdMap[brand.parentSlug] : null
    if (!parentId && brand.parentSlug) {
      // Parent doesn't exist yet, create it
      console.log(`  Parent brand ${brand.parentSlug} doesn't exist, creating...`)
      const parent = await prisma.brand.create({
        data: {
          name: brand.parentSlug.toUpperCase(),
          slug: brand.parentSlug,
        },
      })
      brandIdMap[brand.parentSlug] = parent.id
    }

    // Check if brand already exists
    const existing = await prisma.brand.findUnique({ where: { slug: brand.slug } })
    if (existing) {
      console.log(`  Brand already exists, skipping creation`)
      brandIdMap[brand.slug] = existing.id
    } else {
      const created = await prisma.brand.create({
        data: {
          name: brand.name,
          slug: brand.slug,
          parentId: brandIdMap[brand.parentSlug!] || null,
          description: `${brand.name} products`,
        },
      })
      brandIdMap[brand.slug] = created.id
      console.log(`  Created brand with ID: ${created.id}`)
    }

    // Create products for this brand
    await createProducts(brandIdMap[brand.slug], brand.products)
  }

  console.log("\n✅ Migration complete!")
  console.log(`Brands created/verified: ${Object.keys(brandIdMap).length}`)
}

async function createProducts(brandId: string, products: SeedProduct[]) {
  if (products.length === 0) {
    console.log(`  No products to create`)
    return
  }

  console.log(`  Creating ${products.length} products...`)

  for (const product of products) {
    // Check if product already exists by ASIN
    const existing = await prisma.product.findFirst({ where: { asin: product.asin } })
    if (existing) {
      console.log(`    Product ${product.asin} already exists, skipping`)
      continue
    }

    try {
      await prisma.product.create({
        data: {
          brandId,
          name: product.title || `Product ${product.asin}`,
          description: product.description || null,
          bullets: product.bullets || [],
          category: product.category || null,
          imageUrl: product.imageUrl || null,
          amazonUrl: product.amazonUrl,
          asin: product.asin,
          isActive: true,
        },
      })
      console.log(`    Created product: ${product.asin}`)
    } catch (error: any) {
      console.error(`    Error creating product ${product.asin}: ${error.message}`)
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
