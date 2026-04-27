import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

/**
 * POST /api/admin/fba-shipments/validate
 * 
 * Validates that the items in an FBA shipment match the warehouse state.
 * Checks each item's location against actual warehouse pallet data.
 * 
 * Body: { items: [{ name, sku, location, totalUnits }] }
 * Returns: { valid: boolean, warnings: [...], errors: [...] }
 */
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session.user as any)?.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { items } = await req.json()
    if (!items || !Array.isArray(items)) {
      return NextResponse.json({ error: "Missing items" }, { status: 400 })
    }

    const warnings: string[] = []
    const errors: string[] = []
    let validCount = 0

    // Get all warehouse pallets for quick lookup
    const pallets = await prisma.warehousePallet.findMany()
    const palletMap = new Map<string, typeof pallets>()
    for (const pallet of pallets) {
      const existing = palletMap.get(pallet.locationCode) || []
      existing.push(pallet)
      palletMap.set(pallet.locationCode, existing)
    }

    for (const item of items) {
      if (!item.location || item.location === "ENVIADO") continue // Skip already-shipped items

      const locations = item.location.split(' + ').filter(Boolean)
      
      if (locations.length === 0) {
        warnings.push(`"${item.name || "Sin nombre"}" has no warehouse location assigned.`)
        continue
      }

      for (const loc of locations) {
        const palletsAtLocation = palletMap.get(loc) || []
        
        if (palletsAtLocation.length === 0) {
          errors.push(`Location ${loc} for "${item.name}" does not exist in the warehouse map.`)
          continue
        }

        const occupiedPallets = palletsAtLocation.filter(p => p.productName || p.sku)
        if (occupiedPallets.length === 0) {
          warnings.push(`Location ${loc} for "${item.name}" is marked as EMPTY in the warehouse. Product may have already been moved.`)
          continue
        }

        // Check if at least one pallet at this location matches the item's SKU
        const itemSku = (item.sku || "").toLowerCase().trim()
        const skuMatches = itemSku
          ? occupiedPallets.some(p => (p.sku || "").toLowerCase().trim() === itemSku)
          : false

        if (itemSku && !skuMatches) {
          const warehouseSkus = [...new Set(occupiedPallets.map(p => p.sku).filter(Boolean))]
          warnings.push(`SKU mismatch at ${loc}: Shipment has "${item.sku}" but warehouse has "${warehouseSkus.join(", ") || "N/A"}".`)
        }

        // Check quantity using sum across pallets at same location
        const locationQty = occupiedPallets.reduce((sum, p) => sum + (p.quantity || 0), 0)
        if (item.totalUnits) {
          const perLocationQty = Math.ceil(item.totalUnits / locations.length)
          if (locationQty > 0 && locationQty < perLocationQty) {
            warnings.push(`Location ${loc}: Warehouse shows ${locationQty} units but shipment expects ~${perLocationQty} units for "${item.name}".`)
          }
        }

        validCount++
      }
    }

    return NextResponse.json({
      valid: errors.length === 0,
      validCount,
      totalItems: items.filter((i: any) => i.location && i.location !== "ENVIADO").length,
      warnings,
      errors,
    })
  } catch (error: any) {
    console.error("[FBA_VALIDATE]", error)
    return NextResponse.json({ error: "Validation failed" }, { status: 500 })
  }
}
