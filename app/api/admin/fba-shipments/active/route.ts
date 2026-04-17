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

    const activeShipments = await prisma.fbaShipment.findMany({
      where: { status: "ACTIVE" },
      include: {
        items: {
          orderBy: [
            { sortOrder: "asc" },
            { createdAt: "asc" }
          ]
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(activeShipments)
  } catch (error) {
    console.error("[FBA_ACTIVE_GET]", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
