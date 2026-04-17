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

    const pastShipments = await prisma.fbaShipment.findMany({
      where: { status: "CLOSED" },
      orderBy: { updatedAt: "desc" },
      include: {
        items: {
          orderBy: [
            { sortOrder: "asc" },
            { createdAt: "asc" }
          ]
        }
      }
    })

    return NextResponse.json(pastShipments)
  } catch (error) {
    console.error("[FBA_SHIPMENT_HISTORY_GET]", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
