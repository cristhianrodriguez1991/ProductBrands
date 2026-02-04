/**
 * Migration script to add quoteNumber to existing quotes
 * Run this after deploying the schema changes
 */

import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  console.log("Migrating quote numbers...")

  const quotes = await prisma.quote.findMany({
    where: {
      quoteNumber: null as any, // Find quotes without quoteNumber
    },
  })

  console.log(`Found ${quotes.length} quotes to migrate`)

  for (const quote of quotes) {
    const year = quote.createdAt.getFullYear()
    const prefix = `QUOTE-${year}-`

    // Find highest number for this year
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

    const quoteNumber = `${prefix}${nextNum.toString().padStart(4, "0")}`

    await prisma.quote.update({
      where: { id: quote.id },
      data: { quoteNumber },
    })

    console.log(`Updated quote ${quote.id} -> ${quoteNumber}`)
  }

  console.log("✅ Migration complete!")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
