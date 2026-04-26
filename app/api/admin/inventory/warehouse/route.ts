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
        palletId: string
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
        palletId: p.id,
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

/**
 * POST /api/admin/inventory/warehouse
 *
 * Manually add a product to the warehouse by creating a WarehousePallet record
 * at a specified location.
 */
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session.user as any)?.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await req.json()
    const {
      productName,
      sku,
      quantity,
      locationCode,
      rack,
      level,
      cellNumber,
      palletPosition,
      lotNumber,
      expirationDate,
      palletHeightIn,
      status,
      notes,
    } = body

    if (!productName) {
      return NextResponse.json({ error: "Product name is required" }, { status: 400 })
    }

    // If locationCode is provided, create a pallet at that location
    if (locationCode && rack && level && cellNumber && palletPosition) {
      // Intercept receiving area (temporary location)
      const finalLocationCode = locationCode.toUpperCase().startsWith("RECEIVING")
        ? `RECEIVING-${Date.now()}`
        : locationCode

      // Height validation for rack levels
      const HEIGHT_LIMITS: Record<string, number> = {
        TOP: 80,
        MID: 56,
        BOT: 40,
      }

      if (level !== "FLOOR" && palletHeightIn) {
        const maxHeight = HEIGHT_LIMITS[level]
        if (maxHeight && palletHeightIn > maxHeight) {
          return NextResponse.json(
            { error: `Pallet height (${palletHeightIn}") exceeds maximum for ${level} level (${maxHeight}")` },
            { status: 422 }
          )
        }
      }

      const pallet = locationCode.toUpperCase().startsWith("RECEIVING")
        ? await prisma.warehousePallet.create({
            data: {
              locationCode: finalLocationCode,
              rack: "RECEIVING",
              level: "FLOOR",
              cellNumber: parseInt(cellNumber) || 1,
              palletPosition: parseInt(palletPosition) || 1,
              sku: sku || null,
              productName,
              quantity: quantity ? parseInt(quantity) : null,
              lotNumber: lotNumber || null,
              expirationDate: expirationDate ? new Date(expirationDate) : null,
              palletHeightIn: palletHeightIn ? parseFloat(palletHeightIn) : null,
              status: status || "AVAILABLE",
              notes: notes || null,
            }
          })
        : await prisma.warehousePallet.upsert({
            where: { locationCode: finalLocationCode },
        update: {
          sku: sku || null,
          productName,
          quantity: quantity ? parseInt(quantity) : null,
          lotNumber: lotNumber || null,
          expirationDate: expirationDate ? new Date(expirationDate) : null,
          palletHeightIn: palletHeightIn ? parseFloat(palletHeightIn) : null,
          status: status || "AVAILABLE",
          notes: notes || null,
        },
        create: {
          locationCode,
          rack,
          level,
          cellNumber: parseInt(cellNumber),
          palletPosition: parseInt(palletPosition),
          sku: sku || null,
          productName,
          quantity: quantity ? parseInt(quantity) : null,
          lotNumber: lotNumber || null,
          expirationDate: expirationDate ? new Date(expirationDate) : null,
          palletHeightIn: palletHeightIn ? parseFloat(palletHeightIn) : null,
          status: status || "AVAILABLE",
          notes: notes || null,
        },
      })

      // If UPC or Amazon fields are provided, link or create an InventoryItem
      const { upc, fnsku, asin, imageUrl, description } = body
      if (sku || upc || fnsku || asin) {
        // Find existing match
        let exItem = null
        if (sku) exItem = await prisma.inventoryItem.findFirst({ where: { sku: { equals: sku, mode: "insensitive" } } })
        if (!exItem && upc) exItem = await prisma.inventoryItem.findFirst({ where: { upc: { in: [upc, `0${upc}`] } } })
        if (!exItem && fnsku) exItem = await prisma.inventoryItem.findFirst({ where: { fnsku } })

        if (exItem) {
          // Update existing
          await prisma.inventoryItem.update({
            where: { id: exItem.id },
            data: {
              upc: upc || exItem.upc,
              fnsku: fnsku || exItem.fnsku,
              asin: asin || exItem.asin,
              imageUrl: imageUrl || exItem.imageUrl,
              description: description || exItem.description,
            }
          })
        } else {
          // Create new record for this product to hold Universal data
          await prisma.inventoryItem.create({
            data: {
              source: "MANUAL",
              name: productName,
              sku: sku || upc || fnsku || `WHS-${Date.now()}`,
              upc: upc || null,
              fnsku: fnsku || null,
              asin: asin || null,
              imageUrl: imageUrl || null,
              description: description || null,
              quantityOnHand: quantity ? parseInt(quantity) : 0,
            }
          })
          
          if (!sku) {
             // Link back to pallet if sku wasn't provided so they join correctly
             await prisma.warehousePallet.update({
               where: { id: pallet.id },
               data: { sku: upc || fnsku || `WHS-${Date.now()}` }
             })
          }
        }
      }

      return NextResponse.json(pallet)
    }

    // If no location specified, just return success (product added conceptually)
    return NextResponse.json({ success: true, message: "Product registered. Assign a location via the warehouse map." })
  } catch (error: any) {
    console.error("[WAREHOUSE_INVENTORY_POST]", error)
    return NextResponse.json({ error: "Failed to add product" }, { status: 500 })
  }
}

/**
 * DELETE /api/admin/inventory/warehouse
 * 
 * Bulk delete warehouse inventory. Clears all occupied pallets.
 * If body contains { palletIds: string[] }, only clears those specific pallets.
 */
export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session.user as any)?.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    let body: any = {}
    try {
      body = await req.json()
    } catch {
      // No body means wipe all
    }

    if (body.palletIds && Array.isArray(body.palletIds) && body.palletIds.length > 0) {
      // Clear specific pallets
      await prisma.warehousePallet.updateMany({
        where: { id: { in: body.palletIds } },
        data: {
          sku: null,
          productName: null,
          quantity: null,
          lotNumber: null,
          expirationDate: null,
          palletHeightIn: null,
          status: "AVAILABLE",
          notes: null,
        },
      })
      return NextResponse.json({ success: true, cleared: body.palletIds.length })
    }

    if (body.productKey) {
      // Clear all pallets for a specific product (by productName + sku combo)
      const where: any = {}
      if (body.productName) where.productName = body.productName
      if (body.sku) where.sku = body.sku

      const cleared = await prisma.warehousePallet.updateMany({
        where: {
          AND: [
            body.productName ? { productName: body.productName } : {},
            body.sku ? { sku: body.sku } : {},
          ],
        },
        data: {
          sku: null,
          productName: null,
          quantity: null,
          lotNumber: null,
          expirationDate: null,
          palletHeightIn: null,
          status: "AVAILABLE",
          notes: null,
        },
      })
      return NextResponse.json({ success: true, cleared: cleared.count })
    }

    // Wipe ALL occupied pallets
    const cleared = await prisma.warehousePallet.updateMany({
      where: {
        OR: [
          { productName: { not: null } },
          { sku: { not: null } },
        ],
      },
      data: {
        sku: null,
        productName: null,
        quantity: null,
        lotNumber: null,
        expirationDate: null,
        palletHeightIn: null,
        status: "AVAILABLE",
        notes: null,
      },
    })

    return NextResponse.json({ success: true, cleared: cleared.count })
  } catch (error: any) {
    console.error("[WAREHOUSE_INVENTORY_DELETE]", error)
    return NextResponse.json({ error: "Failed to clear warehouse inventory" }, { status: 500 })
  }
}
