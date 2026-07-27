import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

// PATCH update a pallet with full two-way sync
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session.user as any)?.role !== "ADMIN") {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const body = await req.json()

    // If quantity is exactly 0, interpret this as "clear/empty the pallet" completely
    if (body.quantity === 0) {
      const result = await prisma.$transaction(async (tx) => {
        const existing = await tx.warehousePallet.findUnique({ where: { id: params.id } })
        if (!existing) throw new Error("Pallet no encontrado.")

        const locationCode = existing.locationCode

        const palletsAtLoc = await tx.warehousePallet.findMany({ where: { locationCode } })
        let finalPallet = null;
        if (palletsAtLoc.length > 1) {
          await tx.warehousePallet.delete({ where: { id: params.id } })
        } else {
          finalPallet = await tx.warehousePallet.update({
            where: { id: params.id },
            data: {
              sku: null,
              productName: null,
              quantity: null,
              lotNumber: null,
              expirationDate: null,
              palletHeightIn: null,
              status: "AVAILABLE",
              notes: null
            }
          })
        }

        const itemsToUpdate = await tx.fbaShipmentItem.findMany({
          where: { location: { contains: locationCode } }
        })

        for (const item of itemsToUpdate) {
          if (item.location) {
            const locs = item.location.split(' + ').filter(Boolean)
            const newLocs = locs.filter(l => l !== locationCode)
            await tx.fbaShipmentItem.update({
              where: { id: item.id },
              data: { location: newLocs.join(' + ') }
            })
          }
        }
        
        if (finalPallet) return finalPallet;
        return { id: params.id, locationCode, deleted: true }
      })
      return NextResponse.json(result)
    }

    // Height validation
    const HEIGHT_LIMITS: Record<string, number> = { TOP: 80, MID: 56, BOT: 40 }

    if (body.palletHeightIn && body.level && body.level !== "FLOOR") {
      const maxHeight = HEIGHT_LIMITS[body.level]
      if (maxHeight && body.palletHeightIn > maxHeight) {
        return NextResponse.json(
          { error: `Pallet height (${body.palletHeightIn}") exceeds max for ${body.level} level (${maxHeight}")` },
          { status: 422 }
        )
      }
    }

    // If we have a pallet by id, check the level from it
    if (body.palletHeightIn && !body.level) {
      const existing = await prisma.warehousePallet.findUnique({ where: { id: params.id } })
      if (existing && existing.level !== "FLOOR") {
        const maxHeight = HEIGHT_LIMITS[existing.level]
        if (maxHeight && body.palletHeightIn > maxHeight) {
          return NextResponse.json(
            { error: `Pallet height (${body.palletHeightIn}") exceeds max for ${existing.level} level (${maxHeight}")` },
            { status: 422 }
          )
        }
      }
    }

    const updateData: any = {}
    if (body.sku !== undefined) updateData.sku = body.sku
    if (body.productName !== undefined) updateData.productName = body.productName
    if (body.quantity !== undefined) updateData.quantity = body.quantity
    if (body.lotNumber !== undefined) updateData.lotNumber = body.lotNumber
    if (body.expirationDate !== undefined) updateData.expirationDate = body.expirationDate ? new Date(body.expirationDate) : null
    if (body.palletHeightIn !== undefined) updateData.palletHeightIn = body.palletHeightIn
    if (body.status !== undefined) updateData.status = body.status
    if (body.notes !== undefined) updateData.notes = body.notes

    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.warehousePallet.findUnique({ where: { id: params.id } })
      if (!existing) throw new Error("Pallet no encontrado.")

      const pallet = await tx.warehousePallet.update({
        where: { id: params.id },
        data: updateData,
      })

      // Two-way sync: Update FBA shipment items referencing this location
      if (updateData.sku !== undefined || updateData.productName !== undefined || updateData.quantity !== undefined) {
        const itemsToUpdate = await tx.fbaShipmentItem.findMany({
          where: {
            location: { contains: existing.locationCode }
          }
        })

        for (const item of itemsToUpdate) {
          const updateItemData: any = {}
          if (updateData.sku !== undefined) updateItemData.sku = updateData.sku
          if (updateData.productName !== undefined) updateItemData.name = updateData.productName
          if (Object.keys(updateItemData).length > 0) {
            await tx.fbaShipmentItem.update({
              where: { id: item.id },
              data: updateItemData
            })
          }
        }
      }

      // Two-way sync: Update InventoryItem if SKU matches
      const skuToSync = updateData.sku !== undefined ? updateData.sku : existing.sku
      if (skuToSync) {
        const invItem = await tx.inventoryItem.findFirst({
          where: { sku: skuToSync }
        })
        if (invItem) {
          const invUpdate: any = {}
          if (updateData.productName !== undefined && !invItem.amazonTitle) {
            invUpdate.name = updateData.productName
          }
          if (Object.keys(invUpdate).length > 0) {
            await tx.inventoryItem.update({
              where: { id: invItem.id },
              data: invUpdate
            })
          }
        }
      }

      return pallet
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error("[WAREHOUSE_PALLET_PATCH]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}

// DELETE clear a pallet (reset to empty) with two-way sync
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session.user as any)?.role !== "ADMIN") {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.warehousePallet.findUnique({ where: { id: params.id } })
      if (!existing) throw new Error("Pallet no encontrado.")

      const locationCode = existing.locationCode
      const palletsAtLoc = await tx.warehousePallet.findMany({ where: { locationCode } })

      // Delete the targeted pallet record first
      await tx.warehousePallet.delete({ where: { id: params.id } })

      // Check remaining pallets at location
      const remaining = palletsAtLoc.filter(p => p.id !== params.id)
      const remainingOccupied = remaining.filter(p => p.status !== "AVAILABLE" && p.quantity !== 0 && (p.productName || p.sku))

      if (remainingOccupied.length === 0) {
        // No remaining occupied pallets at this location! Clean up all records at this location code
        await tx.warehousePallet.deleteMany({ where: { locationCode } })

        // Re-create a clean single AVAILABLE slot for this location
        const cleanAvailable = await tx.warehousePallet.create({
          data: {
            locationCode,
            rack: existing.rack,
            level: existing.level,
            cellNumber: existing.cellNumber,
            palletPosition: existing.palletPosition,
            status: "AVAILABLE",
            sku: null,
            productName: null,
            quantity: null,
            lotNumber: null,
            expirationDate: null,
            palletHeightIn: null,
            notes: null,
          }
        })

        // Two-way sync: Update FBA shipments referencing this location
        const itemsToUpdate = await tx.fbaShipmentItem.findMany({
          where: { location: { contains: locationCode } }
        })
        for (const item of itemsToUpdate) {
          if (item.location) {
            const locs = item.location.split(' + ').filter(Boolean)
            const newLocs = locs.filter(l => l !== locationCode)
            await tx.fbaShipmentItem.update({
              where: { id: item.id },
              data: { location: newLocs.join(' + ') }
            })
          }
        }

        return { id: params.id, locationCode, deleted: true, clearedAll: true, pallet: cleanAvailable }
      }

      // Two-way sync for FBA items
      const itemsToUpdate = await tx.fbaShipmentItem.findMany({
        where: { location: { contains: locationCode } }
      })
      for (const item of itemsToUpdate) {
        if (item.location) {
          const locs = item.location.split(' + ').filter(Boolean)
          const newLocs = locs.filter(l => l !== locationCode)
          await tx.fbaShipmentItem.update({
            where: { id: item.id },
            data: { location: newLocs.join(' + ') }
          })
        }
      }

      return { id: params.id, locationCode, deleted: true, remainingCount: remainingOccupied.length }
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error("[WAREHOUSE_PALLET_DELETE]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}
