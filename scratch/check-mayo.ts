import { prisma } from "../lib/prisma"

async function checkMayo() {
  try {
    const shipment = await prisma.fbaShipment.findFirst({
      where: {
        name: {
          contains: "mayo",
          mode: "insensitive"
        }
      },
      include: {
        items: true
      }
    })

    if (!shipment) {
      console.log("No shipment named 'mayo' found!")
      return
    }

    console.log(`Shipment found: ID=${shipment.id}, Name=${shipment.name}, Status=${shipment.status}`)
    console.log(`Items count: ${shipment.items.length}`)
    
    const inShipmentItems = shipment.items.filter(i => i.status === "IN_SHIPMENT" && i.location && i.location !== "ENVIADO")
    console.log(`Active IN_SHIPMENT items count: ${inShipmentItems.length}`)

    for (const item of inShipmentItems) {
      console.log(`- Item ID: ${item.id}`)
      console.log(`  Name: ${item.name}`)
      console.log(`  SKU: ${item.sku}`)
      console.log(`  Location: ${item.location} (type=${typeof item.location})`)
      console.log(`  TotalUnits: ${item.totalUnits} (type=${typeof item.totalUnits})`)
    }

  } catch (error) {
    console.error("FAILED TO FETCH MAYO:", error)
  }
}

checkMayo()
