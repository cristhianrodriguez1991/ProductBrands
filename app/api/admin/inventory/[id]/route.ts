import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

// PATCH – update an inventory item
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

    const item = await prisma.inventoryItem.update({
      where: { id },
      data,
    })

    return NextResponse.json({
      ...item,
      lastSyncedAt: item.lastSyncedAt?.toISOString() || null,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    })
  } catch (error: any) {
    console.error("Inventory PATCH error:", error)
    return NextResponse.json({ error: "Failed to update item" }, { status: 500 })
  }
}

// DELETE – delete an inventory item
export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any)?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    await prisma.inventoryItem.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Inventory DELETE error:", error)
    return NextResponse.json({ error: "Failed to delete item" }, { status: 500 })
  }
}
