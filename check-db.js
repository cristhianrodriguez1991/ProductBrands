const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const activeShipment = await prisma.fbaShipment.findFirst({ where: { status: "ACTIVE" } })
  console.log("Active Shipment:", activeShipment)

  const holdPallets = await prisma.warehousePallet.findMany({
    where: { status: "HOLD" }
  })
  console.log("Hold Pallets:", holdPallets.map(p => p.locationCode))
  
  const existingFbaItems = await prisma.fbaShipmentItem.findMany({
    where: { 
      status: { in: ["PENDING", "IN_SHIPMENT"] },
      location: { not: null }
    }
  })
  console.log("Existing FBA Item Locs:", existingFbaItems.map(i => i.location))
  
  const pendingItems = await prisma.fbaShipmentItem.findMany({
    where: { status: "PENDING" }
  })
  console.log("Pending FBA Items:", pendingItems.map(i => i.id))
}

main().catch(console.error).finally(() => prisma.$disconnect())
