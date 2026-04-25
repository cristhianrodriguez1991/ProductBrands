import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

// GET – list all inventory items
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any)?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const items = await prisma.inventoryItem.findMany({
      orderBy: [{ isActive: "desc" }, { name: "asc" }],
    })

    const serialized = items.map((item) => ({
      ...item,
      lastSyncedAt: item.lastSyncedAt?.toISOString() || null,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    }))

    return NextResponse.json(serialized)
  } catch (error: any) {
    console.error("Inventory GET error:", error)
    return NextResponse.json({ error: "Failed to fetch inventory" }, { status: 500 })
  }
}

// POST – create a manual inventory item
export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any)?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const body = await req.json()

    const item = await prisma.inventoryItem.create({
      data: {
        source: "MANUAL",
        name: body.name || "Untitled Item",
        sku: body.sku || null,
        upc: body.upc || null,
        ean: body.ean || null,
        description: body.description || null,
        imageUrl: body.imageUrl || null,
        category: body.category || null,
        location: body.location || null,
        quantityOnHand: parseInt(body.quantityOnHand) || 0,
        quantityReserved: parseInt(body.quantityReserved) || 0,
        reorderPoint: parseInt(body.reorderPoint) || 0,
        unitCost: body.unitCost ? parseFloat(body.unitCost) : null,
        notes: body.notes || null,
        isActive: true,
      },
    })

    return NextResponse.json({
      ...item,
      lastSyncedAt: item.lastSyncedAt?.toISOString() || null,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    })
  } catch (error: any) {
    console.error("Inventory POST error:", error)
    return NextResponse.json({ error: "Failed to create item" }, { status: 500 })
  }
}
