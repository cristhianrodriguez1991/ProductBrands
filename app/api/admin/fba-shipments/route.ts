import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session.user as any)?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Attempt to find the active shipment
    let activeShipment = await prisma.fbaShipment.findFirst({
      where: { status: "ACTIVE" },
      include: {
        items: {
          orderBy: { createdAt: "asc" }
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

    // Check if there is an active shipment. We only allow 1 active shipment.
    const currentActive = await prisma.fbaShipment.findFirst({
      where: { status: "ACTIVE" }
    })
    
    if (currentActive) {
      return NextResponse.json({ error: "Please close the current active shipment first." }, { status: 400 })
    }

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
