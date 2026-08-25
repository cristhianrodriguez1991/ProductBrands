import fs from "fs"
import path from "path"

try {
  const envFile = fs.readFileSync(path.join(process.cwd(), ".env.local"), "utf8")
  envFile.split("\n").forEach((line) => {
    const match = line.match(/^([^=]+)=(.*)$/)
    if (match) {
      const key = match[1].trim()
      const value = match[2].trim().replace(/^['"]|['"]$/g, "")
      process.env[key] = value
    }
  })
} catch(e) {}

async function run() {
  const { prisma } = await import("../lib/prisma")
  const products = await prisma.monitoredProduct.findMany({
    take: 20
  })
  console.log("Found products:", JSON.stringify(products.map(p => ({
    id: p.id,
    asin: p.asin,
    sku: p.sku,
    name: p.productName,
    currentPrice: p.currentPrice,
    unitCost: p.unitCost,
    recAction: p.recommendedAction,
    recPrice: p.recommendedPrice,
    recReason: p.recommendationReason
  })), null, 2))
  await prisma.$disconnect()
}

run().catch(console.error)
