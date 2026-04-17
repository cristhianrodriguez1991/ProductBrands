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

    const { items } = await req.json()
    if (!Array.isArray(items)) {
      return NextResponse.json({ error: "Items must be an array" }, { status: 400 })
    }

    // Execute all updates in a single transaction
    await prisma.$transaction(
      items.map((item: { id: string, sortOrder: number }) =>
        prisma.fbaShipmentItem.update({
          where: { id: item.id },
          data: { sortOrder: item.sortOrder }
        })
      )
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[FBA_SHIPMENT_ITEM_REORDER]", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
