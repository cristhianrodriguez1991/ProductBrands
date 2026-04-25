import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

// PATCH – update an inventory item with two-way sync
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any)?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const body = await req.json()
    const { id } = params

    const data: any = {}

    if (body.name !== undefined) data.name = body.name
    if (body.sku !== undefined) data.sku = body.sku || null
    if (body.upc !== undefined) data.upc = body.upc || null
    if (body.ean !== undefined) data.ean = body.ean || null
    if (body.fnsku !== undefined) data.fnsku = body.fnsku || null
    if (body.asin !== undefined) data.asin = body.asin || null
    if (body.description !== undefined) data.description = body.description || null
    if (body.imageUrl !== undefined) data.imageUrl = body.imageUrl || null
    if (body.category !== undefined) data.category = body.category || null
    if (body.location !== undefined) data.location = body.location || null
    if (body.quantityOnHand !== undefined) data.quantityOnHand = parseInt(body.quantityOnHand) || 0
    if (body.quantityReserved !== undefined) data.quantityReserved = parseInt(body.quantityReserved) || 0
    if (body.reorderPoint !== undefined) data.reorderPoint = parseInt(body.reorderPoint) || 0
    if (body.unitCost !== undefined) data.unitCost = body.unitCost ? parseFloat(body.unitCost) : null
    if (body.notes !== undefined) data.notes = body.notes || null
    if (body.isActive !== undefined) data.isActive = body.isActive

    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.inventoryItem.findUnique({ where: { id } })
      if (!existing) throw new Error("Item not found")

      const item = await tx.inventoryItem.update({
        where: { id },
        data,
      })

      // Two-way sync: Update warehouse pallets that share the same SKU
      const skuToSync = data.sku !== undefined ? data.sku : existing.sku
      if (skuToSync) {
        const palletUpdate: any = {}
        if (data.name !== undefined) palletUpdate.productName = data.name
        if (data.sku !== undefined) palletUpdate.sku = data.sku

        if (Object.keys(palletUpdate).length > 0) {
          // Update pallets with the old SKU if SKU is changing
          const oldSku = existing.sku
          if (oldSku) {
            await tx.warehousePallet.updateMany({
              where: { sku: oldSku },
              data: palletUpdate,
            })
          }
        }
      }

      // Two-way sync: Update FBA shipment items that share the same SKU
      const fbaSkuToSync = data.sku !== undefined ? existing.sku : existing.sku
      if (fbaSkuToSync) {
        const fbaUpdate: any = {}
        if (data.name !== undefined) fbaUpdate.name = data.name
        if (data.sku !== undefined) fbaUpdate.sku = data.sku
        if (data.upc !== undefined) fbaUpdate.upc = data.upc
        if (data.fnsku !== undefined) fbaUpdate.fnsku = data.fnsku
        if (data.asin !== undefined) fbaUpdate.asin = data.asin

        if (Object.keys(fbaUpdate).length > 0) {
          await tx.fbaShipmentItem.updateMany({
            where: { sku: fbaSkuToSync },
            data: fbaUpdate,
          })
        }
      }

      return item
    })

    return NextResponse.json({
      ...result,
      lastSyncedAt: result.lastSyncedAt?.toISOString() || null,
      createdAt: result.createdAt.toISOString(),
      updatedAt: result.updatedAt.toISOString(),
    })
  } catch (error: any) {
    console.error("Inventory PATCH error:", error)
    return NextResponse.json({ error: "Failed to update item" }, { status: 500 })
  }
}

// DELETE – delete an inventory item with two-way sync cleanup
export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any)?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    await prisma.$transaction(async (tx) => {
      const existing = await tx.inventoryItem.findUnique({ where: { id: params.id } })
      if (!existing) throw new Error("Item not found")

      // Delete the inventory item
      await tx.inventoryItem.delete({
        where: { id: params.id },
      })
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Inventory DELETE error:", error)
    return NextResponse.json({ error: "Failed to delete item" }, { status: 500 })
  }
}
