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
    
    const updatedItem = await prisma.fbaShipmentItem.update({
      where: { id: params.itemId },
      data: updates
    })

    return NextResponse.json(updatedItem)
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
    
    await prisma.fbaShipmentItem.delete({
      where: { id: params.itemId }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[FBA_SHIPMENT_ITEM_DELETE]", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
