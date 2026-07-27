import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { PERMISSIONS, hasEffectivePermission } from "@/lib/permissions"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    const userRole = (session?.user as any)?.role
    const customPermissions = (session?.user as any)?.customPermissions || []

    if (!session || !hasEffectivePermission(userRole, customPermissions, PERMISSIONS.AUTOPRICER)) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    // 1. Fetch existing monitored products to flag duplicates
    const monitored = await prisma.monitoredProduct.findMany({
      select: { asin: true, sku: true },
    })
    const monitoredSet = new Set<string>()
    monitored.forEach((m) => {
      if (m.asin) monitoredSet.add(`asin:${m.asin.trim().toLowerCase()}`)
      if (m.sku) monitoredSet.add(`sku:${m.sku.trim().toLowerCase()}`)
    })

    // 2. Fetch Amazon / Manual Inventory Items
    const amazonItems = await prisma.inventoryItem.findMany({
      where: { isActive: true },
      orderBy: { updatedAt: "desc" },
    })
    const inventorySkus = new Set(amazonItems.map((i) => i.sku?.trim().toLowerCase()).filter(Boolean))

    // 3. Fetch Warehouse Pallets (grouped by product/SKU)
    const pallets = await prisma.warehousePallet.findMany({
      where: {
        AND: [
          {
            OR: [
              { productName: { not: null } },
              { sku: { not: null } },
            ],
          },
          {
            status: { notIn: ["AVAILABLE", "ENVIADO"] },
          },
        ],
      },
    })

    const warehouseMap = new Map<string, {
      productName: string
      sku: string | null
      totalQuantity: number
    }>()

    for (const p of pallets) {
      const name = p.productName?.trim() || "Unnamed Product"
      const sku = p.sku?.trim() || null
      const key = `${name.toLowerCase()}___${(sku || "").toLowerCase()}`

      if (!warehouseMap.has(key)) {
        warehouseMap.set(key, {
          productName: name,
          sku,
          totalQuantity: p.quantity || 0,
        })
      } else {
        const existing = warehouseMap.get(key)!
        existing.totalQuantity += (p.quantity || 0)
      }
    }

    const catalog: any[] = []
    const addedKeys = new Set<string>()

    // Add Amazon / Manual Items to catalog
    for (const item of amazonItems) {
      const asin = item.asin?.trim() || `MANUAL-${item.id.slice(-6)}`
      const sku = item.sku?.trim() || `SKU-${item.id.slice(-6)}`
      const name = item.amazonTitle || item.name || "Amazon Product"
      const key = `${asin.toLowerCase()}___${sku.toLowerCase()}`

      if (addedKeys.has(key)) continue
      addedKeys.add(key)

      const isMonitored = monitoredSet.has(`asin:${asin.toLowerCase()}`) || monitoredSet.has(`sku:${sku.toLowerCase()}`)
      const hasCost = Boolean(item.unitCost && item.unitCost > 0)
      const cost = hasCost ? item.unitCost! : 6.50
      const price = item.sellingPrice && item.sellingPrice > 0 ? item.sellingPrice : Math.round((cost * 2.6) * 100) / 100

      catalog.push({
        id: item.id,
        source: item.source === "AMAZON" ? "AMAZON" : "INVENTORY",
        asin,
        sku,
        name,
        category: item.category || "General",
        imageUrl: item.amazonImageUrl || item.imageUrl || null,
        unitCost: cost,
        currentPrice: price,
        fulfillmentMethod: item.fulfillmentChannel === "MERCHANT" ? "FBM" : "FBA",
        quantity: item.quantityOnHand || 0,
        isAlreadyMonitored: isMonitored,
        hasCost,
      })
    }

    // Add Warehouse items not already covered by InventoryItem
    for (const [_, w] of warehouseMap.entries()) {
      const sku = w.sku?.trim() || `WH-SKU-${Math.random().toString(36).substring(2, 8).toUpperCase()}`
      if (w.sku && inventorySkus.has(w.sku.toLowerCase())) {
        // Already added via amazonItems
        continue
      }

      const asin = `WH-${Math.random().toString(36).substring(2, 8).toUpperCase()}`
      const key = `${asin.toLowerCase()}___${sku.toLowerCase()}`

      if (addedKeys.has(key)) continue
      addedKeys.add(key)

      const isMonitored = monitoredSet.has(`asin:${asin.toLowerCase()}`) || monitoredSet.has(`sku:${sku.toLowerCase()}`)
      const cost = 8.50
      const price = Math.round((cost * 2.5) * 100) / 100

      catalog.push({
        id: `wh-${Math.random().toString(36).substring(2, 9)}`,
        source: "WAREHOUSE",
        asin,
        sku,
        name: w.productName,
        category: "Warehouse Stock",
        imageUrl: null,
        unitCost: cost,
        currentPrice: price,
        fulfillmentMethod: "FBA",
        quantity: w.totalQuantity,
        isAlreadyMonitored: isMonitored,
        hasCost: false,
      })
    }

    return NextResponse.json({
      success: true,
      catalog,
      totalCount: catalog.length,
    })
  } catch (error) {
    console.error("[AUTOPRICER_IMPORT_CATALOG]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}
