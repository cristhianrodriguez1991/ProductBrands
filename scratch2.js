const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const products = await prisma.monitoredProduct.findMany({
    where: {
      productName: { contains: "Peppermint", mode: 'insensitive' }
    },
    select: {
      id: true,
      productName: true,
      keepaHistory: {
        select: { id: true, salesRank: true }
      },
      priceHistory: {
        select: { id: true }
      }
    }
  })

  for (const p of products) {
    console.log(`Product: ${p.productName} (ID: ${p.id})`)
    console.log(`- Keepa Logs: ${p.keepaHistory.length}`)
    const keepaWithRank = p.keepaHistory.filter(k => k.salesRank != null)
    console.log(`- Keepa Logs with Rank: ${keepaWithRank.length}`)
    console.log(`- Price Logs: ${p.priceHistory.length}`)
  }
}

main().catch(console.error).finally(() => prisma.$disconnect())
