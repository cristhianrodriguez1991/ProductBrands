const { PrismaClient } = require('@prisma/client');
process.env.DATABASE_URL = "postgresql://neondb_owner:npg_0BjVpNHbtrf7@ep-dark-field-ahhqbnn4-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require";
const prisma = new PrismaClient();
async function main() {
  const p = await prisma.monitoredProduct.findFirst({
    where: { sku: '6O-5IXG-HFBW' }
  });
  if (p) {
    const logs = await prisma.priceChangeLog.findMany({
      where: { monitoredProductId: p.id },
      orderBy: { requestedAt: 'desc' },
      take: 5
    });
    console.log("Logs:", logs);
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
