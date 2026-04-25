import { prisma } from "./lib/prisma"
import { getFbaQuantities } from "./lib/amazon-sp-api-service"

async function test() {
  try {
    const qtyMap = await getFbaQuantities()
    console.log("Map size:", qtyMap.size)
    let totalFul = 0
    let totalRes = 0
    qtyMap.forEach(v => {
      totalFul += v.fulfillable;
      totalRes += v.reserved;
    })
    console.log("Total Fulfillable:", totalFul, "Total Reserved:", totalRes)
  } catch (e) {
    console.error("Error:", e)
  }
}
test()
