import fs from "fs"
import path from "path"

type SeedProduct = {
  asin: string
  amazonUrl: string
  title?: string
  imageUrl?: string
  description?: string
  bullets?: string[]
  priceAmount?: number | null
  priceCurrency?: string
  rating?: number | null
  reviewCount?: number | null
  category?:
    | "Hard Candies"
    | "Snacks & Groceries"
    | "Coffee"
    | "Coffee Creamers"
    | "Sweeteners"
    | "Grain & Seeds"
    | "Wildlife Food"
}

export type SeedBrand = {
  slug: string
  name: string
  parentSlug: string | null
  products: SeedProduct[]
}

type Catalog = {
  brands: SeedBrand[]
}

let catalogCache: Catalog | null = null

export function loadBrandCatalog(): Catalog {
  // Clear cache in development to pick up file changes
  if (process.env.NODE_ENV === "development") {
    catalogCache = null
  }
  
  if (catalogCache) return catalogCache

  const filePath = path.join(process.cwd(), "data", "brandCatalog.seed.json")
  const raw = fs.readFileSync(filePath, "utf8")
  const parsed = JSON.parse(raw) as Catalog
  // Product data is managed manually in the seed file
  // PA-API is optional and only used if you want to auto-sync data from Amazon
  catalogCache = parsed
  return parsed
}

export function getBrandBySlug(slug: string): SeedBrand | undefined {
  const catalog = loadBrandCatalog()
  return catalog.brands.find((b) => b.slug === slug)
}

