import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

/**
 * PATCH /api/admin/inventory/warehouse/pallet
 *
 * Edit a warehouse pallet with full two-way sync:
 * - Updates the WarehousePallet record
 * - Syncs changes to FbaShipmentItem records referencing this location
 * - Updates InventoryItem if SKU matches
 */
export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session.user as any)?.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await req.json()
    const { palletId, ...updates } = body

    if (!palletId) {
      return NextResponse.json({ error: "palletId is required" }, { status: 400 })
    }

    // Height validation for rack levels
    const HEIGHT_LIMITS: Record<string, number> = { TOP: 80, MID: 56, BOT: 40 }

    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.warehousePallet.findUnique({ where: { id: palletId } })
      if (!existing) throw new Error("Pallet not found")

      // Build update data
      const updateData: any = {}
      if (updates.productName !== undefined) updateData.productName = updates.productName || null
      if (updates.sku !== undefined) updateData.sku = updates.sku || null
      if (updates.quantity !== undefined) updateData.quantity = updates.quantity !== null && updates.quantity !== "" ? parseInt(updates.quantity) : null
      if (updates.lotNumber !== undefined) updateData.lotNumber = updates.lotNumber || null
      if (updates.expirationDate !== undefined) updateData.expirationDate = updates.expirationDate ? new Date(updates.expirationDate) : null
      if (updates.palletHeightIn !== undefined) updateData.palletHeightIn = updates.palletHeightIn !== null && updates.palletHeightIn !== "" ? parseFloat(updates.palletHeightIn) : null
      if (updates.status !== undefined) updateData.status = updates.status
      if (updates.notes !== undefined) updateData.notes = updates.notes || null

      // Height validation
      if (updateData.palletHeightIn && existing.level !== "FLOOR") {
        const maxHeight = HEIGHT_LIMITS[existing.level]
        if (maxHeight && updateData.palletHeightIn > maxHeight) {
          throw new Error(`Pallet height (${updateData.palletHeightIn}") exceeds max for ${existing.level} level (${maxHeight}")`)
        }
      }

      // 1. Update the pallet itself
      const pallet = await tx.warehousePallet.update({
        where: { id: palletId },
        data: updateData,
      })

      // 2. Two-way sync: Update FbaShipmentItem records referencing this location
      if (updateData.sku !== undefined || updateData.productName !== undefined || updateData.quantity !== undefined) {
        const fbaItems = await tx.fbaShipmentItem.findMany({
          where: {
            location: { contains: existing.locationCode }
          }
        })

        for (const item of fbaItems) {
          const fbaUpdate: any = {}
          if (updateData.sku !== undefined) fbaUpdate.sku = updateData.sku
          if (updateData.productName !== undefined) fbaUpdate.name = updateData.productName
          if (Object.keys(fbaUpdate).length > 0) {
            await tx.fbaShipmentItem.update({
              where: { id: item.id },
              data: fbaUpdate,
            })
          }
        }
      }

      // 3. Two-way sync: Update InventoryItem if SKU matches
      const skuToMatch = updateData.sku !== undefined ? updateData.sku : existing.sku
      if (skuToMatch) {
        const invItem = await tx.inventoryItem.findFirst({
          where: { sku: skuToMatch }
        })
        if (invItem) {
          const invUpdate: any = {}
          if (updateData.productName !== undefined && !invItem.amazonTitle) {
            invUpdate.name = updateData.productName
          }
          if (Object.keys(invUpdate).length > 0) {
            await tx.inventoryItem.update({
              where: { id: invItem.id },
              data: invUpdate,
            })
          }
        }
      }

      return pallet
    })

    return NextResponse.json(result)
  } catch (error: any) {
    console.error("[WAREHOUSE_PALLET_EDIT]", error)
    return NextResponse.json({ error: error.message || "Failed to update pallet" }, { status: 500 })
  }
}

/**
 * POST /api/admin/inventory/warehouse/pallet
 *
 * Move a pallet to a new location with two-way sync.
 * Body: { palletId, newLocationCode, newRack, newLevel, newCellNumber, newPalletPosition }
 */
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session.user as any)?.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await req.json()
    const { palletId, newLocationCode, newRack, newLevel, newCellNumber, newPalletPosition } = body

    if (!palletId || !newLocationCode) {
      return NextResponse.json({ error: "palletId and newLocationCode are required" }, { status: 400 })
    }

    const result = await prisma.$transaction(async (tx) => {
      const source = await tx.warehousePallet.findUnique({ where: { id: palletId } })
      if (!source) throw new Error("Source pallet not found")

      const oldLocationCode = source.locationCode

      // Intercept receiving area (temporary location)
      const finalLocationCode = newLocationCode.toUpperCase().startsWith("RECEIVING")
        ? `RECEIVING-${Date.now()}`
        : newLocationCode

      // Check if target location exists
      const target = await tx.warehousePallet.findFirst({ where: { locationCode: finalLocationCode } })

      // If target exists, update it with source data
      if (target) {
        await tx.warehousePallet.update({
          where: { id: target.id },
          data: {
            sku: source.sku,
            productName: source.productName,
            quantity: source.quantity,
            lotNumber: source.lotNumber,
            expirationDate: source.expirationDate,
            palletHeightIn: source.palletHeightIn,
            status: source.status,
            notes: source.notes,
          },
        })
      } else {
        // Create new pallet position
        await tx.warehousePallet.create({
          data: {
            locationCode: finalLocationCode,
            rack: finalLocationCode.toUpperCase().startsWith("RECEIVING") ? "RECEIVING" : newRack,
            level: finalLocationCode.toUpperCase().startsWith("RECEIVING") ? "FLOOR" : newLevel,
            cellNumber: finalLocationCode.toUpperCase().startsWith("RECEIVING") ? 1 : parseInt(newCellNumber) || 1,
            palletPosition: finalLocationCode.toUpperCase().startsWith("RECEIVING") ? 1 : parseInt(newPalletPosition) || 1,
            sku: source.sku,
            productName: source.productName,
            quantity: source.quantity,
            lotNumber: source.lotNumber,
            expirationDate: source.expirationDate,
            palletHeightIn: source.palletHeightIn,
            status: source.status,
            notes: source.notes,
          },
        })
      }

      // Clear the source
      await tx.warehousePallet.update({
        where: { id: palletId },
        data: {
          sku: null,
          productName: null,
          quantity: null,
          lotNumber: null,
          expirationDate: null,
          palletHeightIn: null,
          status: "AVAILABLE",
          notes: null,
        },
      })

      // Two-way sync: Update FBA shipment items that reference the old location
      const fbaItems = await tx.fbaShipmentItem.findMany({
        where: { location: { contains: oldLocationCode } }
      })

      for (const item of fbaItems) {
        if (item.location) {
          const locs = item.location.split(' + ').filter(Boolean)
          const newLocs = locs.map(l => l === oldLocationCode ? finalLocationCode : l)
          await tx.fbaShipmentItem.update({
            where: { id: item.id },
            data: { location: newLocs.join(' + ') }
          })
        }
      }

      return { success: true, from: oldLocationCode, to: finalLocationCode }
    })

    return NextResponse.json(result)
  } catch (error: any) {
    console.error("[WAREHOUSE_PALLET_MOVE]", error)
    return NextResponse.json({ error: error.message || "Failed to move pallet" }, { status: 500 })
  }
}
