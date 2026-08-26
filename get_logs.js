const { PrismaClient } = require('@prisma/client');
process.env.DATABASE_URL = "postgresql://neondb_owner:npg_0BjVpNHbtrf7@ep-dark-field-ahhqbnn4-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require";
const prisma = new PrismaClient();
async function main() {
  const p = await prisma.monitoredProduct.findFirst({
    where: { sku: 'S1-S26W-I3GH' }
  });
  if (p) {
    console.log("Product Phase:", p.priceCycleCurrentPhase);
    console.log("Product Base Price:", p.priceCycleBasePrice);
    console.log("Product Discount:", p.priceCycleDiscountPct);
    
    const logs = await prisma.priceChangeLog.findMany({
      where: { monitoredProductId: p.id },
      orderBy: { requestedAt: 'desc' },
      take: 5
    });
    console.log("Logs:", logs);
  } else {
    console.log("Product not found");
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
