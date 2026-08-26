const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const dbUrl = env.split('\n').find(line => line.startsWith('DATABASE_URL=')).split('=')[1].replace(/"/g, '').trim();
process.env.DATABASE_URL = dbUrl;
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const products = await prisma.monitoredProduct.findMany({
    where: { OR: [ { priceCycleBasePrice: 8.99 }, { priceCycleBasePrice: 7.99 } ] },
    select: { id: true, productName: true, sku: true, currentPrice: true, priceCycleBasePrice: true }
  });
  console.log("Products:", products);
  const logs = await prisma.priceChangeLog.findMany({
    where: { productId: { in: products.map(p => p.id) } },
    orderBy: { createdAt: 'desc' },
    take: 10
  });
  console.log("Logs:", logs);
}
main().catch(console.error).finally(() => prisma.$disconnect());
