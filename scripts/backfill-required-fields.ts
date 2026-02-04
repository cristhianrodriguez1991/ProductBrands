/**
 * Backfill quoteNumber and orderNumber for existing rows so we can add required columns.
 * Run once before prisma db push if you have existing Quote/Order rows.
 */

import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  const year = new Date().getFullYear()

  // Backfill Quote.quoteNumber
  const quotes = await prisma.$queryRaw<{ id: string }[]>`SELECT id FROM "Quote"`
  for (let i = 0; i < quotes.length; i++) {
    const num = String(i + 1).padStart(4, "0")
    await prisma.$executeRawUnsafe(
      `UPDATE "Quote" SET "quoteNumber" = $1 WHERE id = $2`,
      `QUOTE-${year}-${num}`,
      quotes[i].id
    )
  }
  console.log("Backfilled quoteNumber for", quotes.length, "quotes")

  // Backfill Order.orderNumber
  const orders = await prisma.$queryRaw<{ id: string }[]>`SELECT id FROM "Order"`
  for (let i = 0; i < orders.length; i++) {
    const num = String(i + 1).padStart(4, "0")
    await prisma.$executeRawUnsafe(
      `UPDATE "Order" SET "orderNumber" = $1 WHERE id = $2`,
      `ORD-${year}-${num}`,
      orders[i].id
    )
  }
  console.log("Backfilled orderNumber for", orders.length, "orders")

  console.log("Done. You can run: npx prisma db push")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
