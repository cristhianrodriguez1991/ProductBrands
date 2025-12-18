import fs from "fs"
import path from "path"

type SeedProduct = {
  asin: string
  amazonUrl: string
  title?: string
  imageUrl?: string
  description?: string
  bullets?: string[]
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
  if (catalogCache) return catalogCache

  const filePath = path.join(process.cwd(), "data", "brandCatalog.seed.json")
  const raw = fs.readFileSync(filePath, "utf8")
  const parsed = JSON.parse(raw) as Catalog
  // TODO: Replace seed catalog with PA-API sync when credentials are available
  catalogCache = parsed
  return parsed
}

export function getBrandBySlug(slug: string): SeedBrand | undefined {
  const catalog = loadBrandCatalog()
  return catalog.brands.find((b) => b.slug === slug)
}

