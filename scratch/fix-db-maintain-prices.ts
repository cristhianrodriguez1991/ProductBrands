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

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = "postgresql://neondb_owner:npg_0BjVpNHbtrf7@ep-dark-field-ahhqbnn4-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require"
}

async function fixMaintainPrices() {
  const { prisma } = await import("../lib/prisma")
  
  const products = await prisma.monitoredProduct.findMany()
  console.log(`Checking ${products.length} products...`)

  let updatedCount = 0
  for (const p of products) {
    if (p.recommendedAction === "MAINTAIN" || !p.recommendedAction) {
      if (p.recommendedPrice !== p.currentPrice) {
        console.log(`Fixing product ${p.sku} (${p.asin}): setting recommendedPrice from ${p.recommendedPrice} -> ${p.currentPrice}`)
        await prisma.monitoredProduct.update({
          where: { id: p.id },
          data: { recommendedPrice: p.currentPrice }
        })
        updatedCount++
      }
    }
  }

  console.log(`Done! Updated ${updatedCount} products where MAINTAIN had an outdated recommendedPrice.`)
  await prisma.$disconnect()
}

fixMaintainPrices().catch(console.error)
