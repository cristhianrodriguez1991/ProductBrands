const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const item = await prisma.fbaShipmentItem.findFirst();
  if(!item) {
    console.log("no items"); return;
  }
  console.log("Original UPC:", item.upc);
  try {
    const updated = await prisma.fbaShipmentItem.update({
      where: { id: item.id },
      data: { upc: "123456789" }
    });
    console.log("Updated successfully:", updated.upc);
  } catch (err) {
    console.error("Update error:", err);
  }
}
main().catch(console.error).finally(()=>prisma.$disconnect());
