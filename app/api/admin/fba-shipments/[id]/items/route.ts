import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session.user as any)?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const data = await req.json()
    
    const newItem = await prisma.fbaShipmentItem.create({
      data: {
        shipmentId: params.id,
        location: data.location || "",
        boxOrder: data.boxOrder || "",
        name: data.name || "",
        fnsku: data.fnsku || "",
        sku: data.sku || "",
        qtyPerBox: data.qtyPerBox ? parseInt(data.qtyPerBox) : null,
        totalBoxes: data.totalBoxes ? parseInt(data.totalBoxes) : null,
        totalUnits: data.totalUnits ? parseInt(data.totalUnits) : null,
        expDate: data.expDate || "",
        length: data.length ? parseFloat(data.length) : null,
        width: data.width ? parseFloat(data.width) : null,
        height: data.height ? parseFloat(data.height) : null,
        boxWeight: data.boxWeight ? parseFloat(data.boxWeight) : null,
        description: data.description || "",
        status: "IN_SHIPMENT",
        sortOrder: data.sortOrder || 0
      }
    })

    return NextResponse.json(newItem)
  } catch (error) {
    console.error("[FBA_SHIPMENT_ITEM_POST]", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
