import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

/**
 * GET /api/admin/shipment-logs
 * Returns all shipment log entries, newest first.
 * Optional query params: ?shipmentId=xxx or ?sku=xxx
 */
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session.user as any)?.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const shipmentId = searchParams.get("shipmentId")
    const sku = searchParams.get("sku")
    const search = searchParams.get("search")

    const where: any = {}
    if (shipmentId) where.shipmentId = shipmentId
    if (sku) where.sku = sku
    if (search) {
      where.OR = [
        { productName: { contains: search, mode: "insensitive" } },
        { sku: { contains: search, mode: "insensitive" } },
        { shipmentName: { contains: search, mode: "insensitive" } },
        { locationCode: { contains: search, mode: "insensitive" } },
      ]
    }

    const logs = await prisma.shipmentLog.findMany({
      where,
      orderBy: { shippedAt: "desc" },
      take: 500,
    })

    return NextResponse.json(logs)
  } catch (error: any) {
    console.error("[SHIPMENT_LOGS_GET]", error)
    return NextResponse.json({ error: "Failed to load logs" }, { status: 500 })
  }
}

/**
 * POST /api/admin/shipment-logs
 * Creates shipment log entries in bulk.
 * Body: { entries: [...] }
 */
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session.user as any)?.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await req.json()
    const { entries } = body

    if (!entries || !Array.isArray(entries) || entries.length === 0) {
      return NextResponse.json({ error: "No entries provided" }, { status: 400 })
    }

    const created = await prisma.shipmentLog.createMany({
      data: entries.map((e: any) => ({
        shipmentId: e.shipmentId,
        shipmentName: e.shipmentName,
        productName: e.productName || "Unknown",
        sku: e.sku || null,
        asin: e.asin || null,
        fnsku: e.fnsku || null,
        upc: e.upc || null,
        totalUnits: e.totalUnits || 0,
        totalBoxes: e.totalBoxes || null,
        qtyPerBox: e.qtyPerBox || null,
        locationCode: e.locationCode || null,
        action: e.action || "SHIPPED",
        notes: e.notes || null,
        shippedAt: new Date(),
      })),
    })

    return NextResponse.json({ created: created.count })
  } catch (error: any) {
    console.error("[SHIPMENT_LOGS_POST]", error)
    return NextResponse.json({ error: "Failed to create logs" }, { status: 500 })
  }
}
