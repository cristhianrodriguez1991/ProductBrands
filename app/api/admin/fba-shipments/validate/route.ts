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
    const palletMap = new Map(pallets.map(p => [p.locationCode, p]))

    for (const item of items) {
      if (!item.location || item.location === "ENVIADO") continue // Skip already-shipped items

      const locations = item.location.split(' + ').filter(Boolean)
      
      if (locations.length === 0) {
        warnings.push(`"${item.name || "Sin nombre"}" has no warehouse location assigned.`)
        continue
      }

      for (const loc of locations) {
        const pallet = palletMap.get(loc)
        
        if (!pallet) {
          errors.push(`Location ${loc} for "${item.name}" does not exist in the warehouse map.`)
          continue
        }

        if (!pallet.productName && !pallet.sku) {
          warnings.push(`Location ${loc} for "${item.name}" is marked as EMPTY in the warehouse. Product may have already been moved.`)
          continue
        }

        // Check if the product matches
        const palletSku = (pallet.sku || "").toLowerCase().trim()
        const itemSku = (item.sku || "").toLowerCase().trim()
        
        if (itemSku && palletSku && palletSku !== itemSku) {
          warnings.push(`SKU mismatch at ${loc}: Shipment has "${item.sku}" but warehouse has "${pallet.sku}".`)
        }

        // Check quantity
        if (pallet.quantity !== null && item.totalUnits) {
          const perLocationQty = Math.ceil(item.totalUnits / locations.length)
          if (pallet.quantity < perLocationQty) {
            warnings.push(`Location ${loc}: Warehouse shows ${pallet.quantity} units but shipment expects ~${perLocationQty} units for "${item.name}".`)
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
