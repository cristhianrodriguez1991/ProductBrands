import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

/**
 * GET /api/admin/inventory/warehouse
 *
 * Aggregates all occupied WarehousePallet records into a product-grouped
 * inventory listing. Groups by productName+SKU so you see each unique
 * product with all its pallet locations, quantities, and statuses.
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session.user as any)?.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Get all occupied pallets (have product or SKU)
    const pallets = await prisma.warehousePallet.findMany({
      where: {
        OR: [
          { productName: { not: null } },
          { sku: { not: null } },
        ],
      },
      orderBy: { locationCode: "asc" },
    })

    // Group by productName + SKU
    const groupMap = new Map<string, {
      productName: string
      sku: string | null
      totalQuantity: number
      palletCount: number
      locations: {
        locationCode: string
        quantity: number | null
        status: string
        level: string
        rack: string
        expirationDate: string | null
        palletHeightIn: number | null
        notes: string | null
        lotNumber: string | null
      }[]
      statuses: string[]
      expirationDates: (string | null)[]
    }>()

    for (const p of pallets) {
      const key = `${(p.productName || "").trim().toLowerCase()}|||${(p.sku || "").trim().toLowerCase()}`

      if (!groupMap.has(key)) {
        groupMap.set(key, {
          productName: p.productName || p.sku || "Unknown",
          sku: p.sku,
          totalQuantity: 0,
          palletCount: 0,
          locations: [],
          statuses: [],
          expirationDates: [],
        })
      }

      const group = groupMap.get(key)!
      group.totalQuantity += p.quantity || 0
      group.palletCount += 1
      group.locations.push({
        locationCode: p.locationCode,
        quantity: p.quantity,
        status: p.status,
        level: p.level,
        rack: p.rack,
        expirationDate: p.expirationDate?.toISOString() || null,
        palletHeightIn: p.palletHeightIn,
        notes: p.notes,
        lotNumber: p.lotNumber,
      })
      if (!group.statuses.includes(p.status)) {
        group.statuses.push(p.status)
      }
      if (p.expirationDate) {
        group.expirationDates.push(p.expirationDate.toISOString())
      }
    }

    // Also try to enrich with InventoryItem data (Amazon images, ASIN, etc.)
    const allSkus = [...new Set(pallets.map(p => p.sku).filter(Boolean))] as string[]
    const inventoryItems = allSkus.length > 0
      ? await prisma.inventoryItem.findMany({
          where: { sku: { in: allSkus } },
        })
      : []
    const inventoryBySku = new Map(inventoryItems.map(i => [i.sku?.toLowerCase(), i]))

    // Convert to array
    const result = Array.from(groupMap.values()).map((group, idx) => {
      const invItem = group.sku ? inventoryBySku.get(group.sku.toLowerCase()) : null

      // Find earliest expiration
      const validDates = group.expirationDates.filter(Boolean) as string[]
      const earliestExp = validDates.length > 0
        ? validDates.sort()[0]
        : null

      return {
        id: `wh-${idx}`,
        productName: group.productName,
        sku: group.sku,
        totalQuantity: group.totalQuantity,
        palletCount: group.palletCount,
        locations: group.locations,
        statuses: group.statuses,
        earliestExpiration: earliestExp,
        // Enriched from InventoryItem
        asin: invItem?.asin || null,
        fnsku: invItem?.fnsku || null,
        upc: invItem?.upc || null,
        imageUrl: invItem?.amazonImageUrl || invItem?.imageUrl || null,
        amazonTitle: invItem?.amazonTitle || null,
      }
    })

    // Sort: most pallets first, then alphabetical
    result.sort((a, b) => b.palletCount - a.palletCount || a.productName.localeCompare(b.productName))

    return NextResponse.json(result)
  } catch (error: any) {
    console.error("[WAREHOUSE_INVENTORY_GET]", error)
    return NextResponse.json({ error: "Failed to load warehouse inventory" }, { status: 500 })
  }
}
