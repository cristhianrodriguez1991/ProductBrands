import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

const INT_FIELDS = ["qtyPerBox", "totalBoxes", "totalUnits"]
const FLOAT_FIELDS = ["length", "width", "height", "boxWeight"]

export async function PATCH(
  req: Request,
  { params }: { params: { itemId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session.user as any)?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const updates: any = {}

    // Type casting for numeric fields to ensure Prisma doesn't reject string numbers
    for (const key in body) {
      const val = body[key]
      if (val === null || val === "") {
        updates[key] = null
      } else if (INT_FIELDS.includes(key)) {
        updates[key] = parseInt(val)
      } else if (FLOAT_FIELDS.includes(key)) {
        updates[key] = parseFloat(val)
      } else {
        updates[key] = val
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.fbaShipmentItem.findUnique({ where: { id: params.itemId } })
      if (!existing) throw new Error("Item not found")

      const updatedItem = await tx.fbaShipmentItem.update({
        where: { id: params.itemId },
        data: updates
      })

      // ── Two-way sync: FBA → Warehouse Pallets ──
      // When location changes, update warehouse pallet data
      if (updates.location !== undefined && existing.location) {
        const oldLocs = existing.location.split(' + ').filter(Boolean)
        const newLocs = (updates.location || "").split(' + ').filter(Boolean)
        
        // Find locations that were removed
        const removedLocs = oldLocs.filter(l => !newLocs.includes(l) && l !== "ENVIADO")
        
        // Clear removed locations in warehouse — only delete the pallet matching this item's SKU/Name robustly
        for (const loc of removedLocs) {
          const itemSku = (existing.sku || "").trim().toLowerCase()
          const itemName = (existing.name || "").trim().toLowerCase()

          const palletsAtLoc = await tx.warehousePallet.findMany({
            where: { locationCode: loc }
          })

          const bestMatch = palletsAtLoc.find(p => {
            const pSku = (p.sku || "").trim().toLowerCase()
            const pName = (p.productName || "").trim().toLowerCase()
            return (itemSku && pSku === itemSku) || (itemName && pName === itemName)
          }) || palletsAtLoc[0]

          if (bestMatch) {
            await tx.warehousePallet.delete({ where: { id: bestMatch.id } })
          }
        }
      }

      // When name/sku changes on FBA item, sync to warehouse pallets at those locations
      if ((updates.name !== undefined || updates.sku !== undefined) && existing.location) {
        const locs = existing.location.split(' + ').filter(Boolean).filter(l => l !== "ENVIADO")
        for (const loc of locs) {
          const matchingPallet = updatedItem.sku
            ? await tx.warehousePallet.findFirst({ where: { locationCode: loc, sku: updatedItem.sku } })
            : await tx.warehousePallet.findFirst({ where: { locationCode: loc } })
          if (matchingPallet) {
            const palletUpdate: any = {}
            if (updates.name !== undefined) palletUpdate.productName = updates.name
            if (updates.sku !== undefined) palletUpdate.sku = updates.sku
            if (Object.keys(palletUpdate).length > 0) {
              await tx.warehousePallet.update({
                where: { id: matchingPallet.id },
                data: palletUpdate
              })
            }
          }
        }
      }

      // ── Two-way sync: FBA → InventoryItem ──
      const skuToSync = updates.sku !== undefined ? updates.sku : existing.sku
      if (skuToSync) {
        const invItem = await tx.inventoryItem.findFirst({ where: { sku: skuToSync } })
        if (invItem) {
          const invUpdate: any = {}
          if (updates.upc !== undefined) invUpdate.upc = updates.upc
          if (updates.fnsku !== undefined) invUpdate.fnsku = updates.fnsku
          if (updates.asin !== undefined) invUpdate.asin = updates.asin
          if (updates.name !== undefined && !invItem.amazonTitle) invUpdate.name = updates.name
          if (Object.keys(invUpdate).length > 0) {
            await tx.inventoryItem.update({
              where: { id: invItem.id },
              data: invUpdate
            })
          }
        }
      }

      return updatedItem
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error("[FBA_SHIPMENT_ITEM_PATCH]", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { itemId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session.user as any)?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await prisma.$transaction(async (tx) => {
      const existing = await tx.fbaShipmentItem.findUnique({ where: { id: params.itemId } })
      if (!existing) throw new Error("Item not found")

      // Delete associated warehouse pallet records (only matching this item's SKU/Name robustly)
      if (existing.location) {
        const locs = existing.location.split(' + ').filter(Boolean).filter(l => l !== "ENVIADO")
        for (const loc of locs) {
          const itemSku = (existing.sku || "").trim().toLowerCase()
          const itemName = (existing.name || "").trim().toLowerCase()

          const palletsAtLoc = await tx.warehousePallet.findMany({
            where: { locationCode: loc }
          })

          const bestMatch = palletsAtLoc.find(p => {
            const pSku = (p.sku || "").trim().toLowerCase()
            const pName = (p.productName || "").trim().toLowerCase()
            return (itemSku && pSku === itemSku) || (itemName && pName === itemName)
          }) || palletsAtLoc[0]

          if (bestMatch) {
            await tx.warehousePallet.delete({ where: { id: bestMatch.id } })
          }
        }
      }

      await tx.fbaShipmentItem.delete({
        where: { id: params.itemId }
      })
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[FBA_SHIPMENT_ITEM_DELETE]", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
