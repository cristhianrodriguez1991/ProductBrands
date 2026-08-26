const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const products = await prisma.monitoredProduct.findMany({
    where: {
      OR: [
        { productName: { contains: "Peanut" } },
        { productName: { contains: "Sunflower" } }
      ]
    },
    select: {
      id: true,
      productName: true,
      keepaHistory: {
        select: { id: true, timestamp: true }
      },
      priceHistory: {
        select: { id: true }
      }
    }
  })

  for (const p of products) {
    console.log(`Product: ${p.productName} (ID: ${p.id})`)
    console.log(`- Keepa Logs: ${p.keepaHistory.length}`)
    console.log(`- Price Logs: ${p.priceHistory.length}`)
  }
}

main().catch(console.error).finally(() => prisma.$disconnect())
