import { prisma } from "../lib/prisma";

async function main() {
  try {
    const rankings = await prisma.productRanking.findMany({
      orderBy: { rank: "asc" }
    });
    console.log(JSON.stringify(rankings, null, 2));
  } catch (error) {
    console.error("Database error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
