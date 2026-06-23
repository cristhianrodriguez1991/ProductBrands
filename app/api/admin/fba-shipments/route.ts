import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session.user as any)?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const id = searchParams.get("id")
    const type = searchParams.get("type")

    if (type === "pending") {
      // 1) Auto-sync HOLD pallets from Warehouse Map into FBA Shipments
      const activeShipment = await prisma.fbaShipment.findFirst({ where: { status: "ACTIVE" } })
      if (activeShipment) {
        const holdPallets = await prisma.warehousePallet.findMany({
          where: { status: "HOLD" }
        })
        const existingFbaItems = await prisma.fbaShipmentItem.findMany({
          where: { 
            status: { in: ["PENDING", "IN_SHIPMENT"] },
            location: { not: null }
          }
        })
        const existingLocs = new Set(existingFbaItems.map(i => i.location))
        
        const orphans = holdPallets.filter(p => p.locationCode && !existingLocs.has(p.locationCode))
        
        for (const orphan of orphans) {
          // If we can find the matching inventory product to prefill FnSKU/UPC, do it
          const product = orphan.sku ? await prisma.inventoryItem.findFirst({ where: { sku: orphan.sku } }) : null;
          
          await prisma.fbaShipmentItem.create({
            data: {
              shipmentId: activeShipment.id,
              location: orphan.locationCode,
              name: orphan.productName || product?.name || orphan.notes || "",
              description: orphan.notes || "",
              sku: orphan.sku || "",
              fnsku: product?.fnsku || "",
              upc: product?.upc || "",
              asin: product?.asin || "",
              imageUrls: product?.imageUrl ? [product.imageUrl] : product?.amazonImageUrl ? [product.amazonImageUrl] : [],
              qtyPerBox: null,
              totalBoxes: orphan.quantity || null,
              expDate: orphan.expirationDate ? orphan.expirationDate.toISOString().split("T")[0] : "",
              status: "PENDING",
            }
          })
        }
      }

      // 2) Return all pending items
      const pendingItems = await prisma.fbaShipmentItem.findMany({
        where: { status: "PENDING" },
        orderBy: { createdAt: "desc" }
      })
      return NextResponse.json(pendingItems)
    }

    if (id) {
      const shipment = await prisma.fbaShipment.findUnique({
        where: { id },
        include: {
          items: {
            orderBy: [
              { sortOrder: "asc" },
              { createdAt: "asc" }
            ]
          }
        }
      })
      return NextResponse.json(shipment)
    }

    // Attempt to find the first active shipment (legacy support)
    let activeShipment = await prisma.fbaShipment.findFirst({
      where: { status: "ACTIVE" },
      include: {
        items: {
          orderBy: [
            { sortOrder: "asc" },
            { createdAt: "asc" }
          ]
        }
      }
    })

    return NextResponse.json(activeShipment)
  } catch (error) {
    console.error("[FBA_SHIPMENT_GET]", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session.user as any)?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { name } = await req.json()
    if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 })


    // Gather all PENDING items from any past shipment that haven't been completed
    const pendingItems = await prisma.fbaShipmentItem.findMany({
      where: { status: "PENDING" }
    })

    // Create the new shipment
    const newShipment = await prisma.fbaShipment.create({
      data: {
        name,
        status: "ACTIVE",
      }
    })

    // Rollover pending items to the new shipment
    if (pendingItems.length > 0) {
      await prisma.fbaShipmentItem.updateMany({
        where: { status: "PENDING" },
        data: { shipmentId: newShipment.id }
      })
    }

    return NextResponse.json(newShipment)
  } catch (error) {
    console.error("[FBA_SHIPMENT_POST]", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
