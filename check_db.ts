import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const peanutProducts = await prisma.monitoredProduct.findMany({
    where: {
      productName: {
        contains: 'Peanut',
        mode: 'insensitive'
      }
    },
    select: {
      sku: true,
      productName: true,
      priceCycleStatus: true,
      priceCycleCurrentPhase: true,
      currentPrice: true,
      priceCycleBasePrice: true
    }
  })

  console.log("Peanut Products:", JSON.stringify(peanutProducts, null, 2))
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect()
  })
