const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const positions = []
  const extraSpaces = [
    { code: "B0P", rack: "FLOOR-B" },
    { code: "B-1P", rack: "FLOOR-B" },
    { code: "B-2P", rack: "FLOOR-B" },
    { code: "C0P", rack: "FLOOR-C" },
    { code: "C-1P", rack: "FLOOR-C" },
    { code: "C-2P", rack: "FLOOR-C" },
  ]
  for (const extra of extraSpaces) {
    positions.push({
      locationCode: extra.code,
      rack: extra.rack,
      level: "FLOOR",
      cellNumber: 0,
      palletPosition: 0,
      status: "AVAILABLE"
    })
  }

  for (const pos of positions) {
    await prisma.warehousePallet.upsert({
      where: { locationCode: pos.locationCode },
      update: {},
      create: pos
    })
  }
  console.log("Extra floor spaces added successfully!")
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
