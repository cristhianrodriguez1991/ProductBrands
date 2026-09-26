import { prisma } from "../lib/prisma"

async function main() {
  console.log("Deleting existing snapshots...")
  await prisma.weeklyProfitSnapshot.deleteMany()

  const snapshots = []
  
  // Create 12 weeks of data
  // Let's assume current net profit is around $9,500 based on the screenshot.
  // We'll simulate a steady growth from 12 weeks ago.
  
  let baseProfit = 7000
  let baseMargin = 12.0 // %

  for (let i = 12; i >= 0; i--) {
    const endDate = new Date()
    endDate.setDate(endDate.getDate() - (i * 7))
    // Align to nearest Monday
    const day = endDate.getDay()
    const diff = endDate.getDate() - day + (day == 0 ? -6 : 1) // adjust when day is sunday
    endDate.setDate(diff)
    endDate.setHours(4, 0, 0, 0)
    
    const startDate = new Date(endDate)
    startDate.setDate(startDate.getDate() - 7)

    // Add some random noise
    const profitVariation = (Math.random() * 800) - 200 // -$200 to +$600
    const marginVariation = (Math.random() * 1.5) - 0.5
    
    const currentProfit = baseProfit + profitVariation
    const currentMargin = baseMargin + marginVariation
    
    snapshots.push({
      weekStartDate: startDate,
      weekEndDate: endDate,
      totalDisbursed: currentProfit * 8.5, // Rough estimate
      totalCogs: currentProfit * 4.2,
      operatingExp: 10193, // 44170 / 4.33
      netProfit: currentProfit,
      roiCash: currentMargin,
      marginSales: currentMargin * 0.6
    })

    // Trend upward
    baseProfit += 250
    baseMargin += 0.2
  }

  console.log("Inserting 13 weeks of data...")
  for (const s of snapshots) {
    await prisma.weeklyProfitSnapshot.create({ data: s })
  }

  console.log("Done.")
}

main().catch(console.error).finally(() => prisma.$disconnect())
