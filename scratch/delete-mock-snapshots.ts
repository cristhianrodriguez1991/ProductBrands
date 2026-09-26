import { prisma } from "../lib/prisma"

async function main() {
  console.log("Deleting all mock WeeklyProfitSnapshots...")
  await prisma.weeklyProfitSnapshot.deleteMany()
  console.log("Done. Database is clean and ready for real data on Monday.")
}

main().catch(console.error).finally(() => prisma.$disconnect())
