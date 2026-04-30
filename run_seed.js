const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  await prisma.warehousePallet.deleteMany({});
  
  const positions = [];
  const RACKS = { A: 8, B: 5, C: 5 };
  const LEVEL_MAP = { "TOP": "T", "MID": "M", "BOT": "L" };
  
  for (const [rackName, cellCount] of Object.entries(RACKS)) {
    for (const [levelName, levelLetter] of Object.entries(LEVEL_MAP)) {
      for (let cell = 1; cell <= cellCount; cell++) {
        for (let pallet = 1; pallet <= 2; pallet++) {
          const globalPalletNumber = (cell - 1) * 2 + pallet;
          positions.push({
            locationCode: `${rackName}${globalPalletNumber}${levelLetter}`,
            rack: rackName,
            level: levelName,
            cellNumber: cell,
            palletPosition: pallet,
            status: "AVAILABLE",
          });
        }
      }
    }
  }
  
  for (const [rackName, cellCount] of Object.entries(RACKS)) {
    for (let cell = 1; cell <= cellCount; cell++) {
      for (let pallet = 1; pallet <= 2; pallet++) {
        const globalPalletNumber = (cell - 1) * 2 + pallet;
        positions.push({
          locationCode: `${rackName}${globalPalletNumber}P`,
          rack: `FLOOR-${rackName}`,
          level: "FLOOR",
          cellNumber: cell,
          palletPosition: pallet,
          status: "AVAILABLE",
        });
      }
    }
  }
  
  const res = await prisma.warehousePallet.createMany({ data: positions });
  console.log('Seeded pallets: ', res);
}
run();
