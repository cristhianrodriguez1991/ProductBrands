import { prisma } from "./prisma"

/**
 * Generate next quote number: QUOTE-YYYY-NNNN
 */
export async function generateQuoteNumber(): Promise<string> {
  const year = new Date().getFullYear()
  const prefix = `QUOTE-${year}-`

  // Find the highest quote number for this year
  const lastQuote = await prisma.quote.findFirst({
    where: {
      quoteNumber: {
        startsWith: prefix,
      },
    },
    orderBy: {
      quoteNumber: "desc",
    },
  })

  let nextNum = 1
  if (lastQuote?.quoteNumber) {
    const lastNum = parseInt(lastQuote.quoteNumber.replace(prefix, ""), 10)
    if (!isNaN(lastNum)) {
      nextNum = lastNum + 1
    }
  }

  return `${prefix}${nextNum.toString().padStart(4, "0")}`
}

/**
 * Generate next order number: ORD-YYYY-NNNN
 */
export async function generateOrderNumber(): Promise<string> {
  const year = new Date().getFullYear()
  const prefix = `ORD-${year}-`

  // Find the highest order number for this year
  const lastOrder = await prisma.order.findFirst({
    where: {
      orderNumber: {
        startsWith: prefix,
      },
    },
    orderBy: {
      orderNumber: "desc",
    },
  })

  let nextNum = 1
  if (lastOrder?.orderNumber) {
    const lastNum = parseInt(lastOrder.orderNumber.replace(prefix, ""), 10)
    if (!isNaN(lastNum)) {
      nextNum = lastNum + 1
    }
  }

  return `${prefix}${nextNum.toString().padStart(4, "0")}`
}

/**
 * Generate slug from title
 */
export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "") // Remove special chars
    .replace(/[\s_-]+/g, "-") // Replace spaces/underscores with hyphens
    .replace(/^-+|-+$/g, "") // Remove leading/trailing hyphens
}
