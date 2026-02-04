import { prisma } from "./prisma"

export type DbProduct = {
  id: string
  name: string
  description: string | null
  bullets: string[]
  category: string | null
  imageUrl: string | null
  amazonUrl: string
  asin: string
  priceAmount: number | null
  priceCurrency: string | null
  rating: number | null
  reviewCount: number | null
  isActive: boolean
  sortOrder: number
}

export type DbBrand = {
  id: string
  slug: string
  name: string
  description: string | null
  heroImage: string | null
  parentId: string | null
  sortOrder: number
  products: DbProduct[]
  children?: DbBrand[]
}

// Get a brand by slug with all its products
export async function getBrandFromDb(slug: string): Promise<DbBrand | null> {
  const brand = await prisma.brand.findUnique({
    where: { slug },
    include: {
      products: {
        where: { isActive: true },
        orderBy: [{ category: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
      },
      children: {
        include: {
          products: {
            where: { isActive: true },
            orderBy: [{ category: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
          },
        },
      },
    },
  })

  return brand
}

// Get all top-level brands for navigation
export async function getAllBrandsFromDb(): Promise<DbBrand[]> {
  const brands = await prisma.brand.findMany({
    where: { parentId: null },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: {
      products: {
        where: { isActive: true },
        orderBy: [{ category: "asc" }, { sortOrder: "asc" }],
      },
      children: {
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        include: {
          products: {
            where: { isActive: true },
            orderBy: [{ category: "asc" }, { sortOrder: "asc" }],
          },
        },
      },
    },
  })

  return brands
}

// Get unique categories for a brand's products
export function getCategoriesForBrand(brand: DbBrand): string[] {
  const categories = new Set<string>()
  
  brand.products.forEach((p) => {
    if (p.category) categories.add(p.category)
  })
  
  // Also include children's products
  brand.children?.forEach((child) => {
    child.products.forEach((p) => {
      if (p.category) categories.add(p.category)
    })
  })

  return Array.from(categories).sort()
}

// Get products by category for a brand
export function getProductsByCategory(brand: DbBrand, category: string): DbProduct[] {
  const products = brand.products.filter((p) => p.category === category)
  
  // Also include children's products
  brand.children?.forEach((child) => {
    products.push(...child.products.filter((p) => p.category === category))
  })

  return products.sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
}
