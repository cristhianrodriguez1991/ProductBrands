import { prisma } from "../lib/prisma"

async function runDiagnostic() {
  try {
    console.log("Fetching active FBA shipment items from database...")
    // Fetch all items that are in shipment and have location assigned, not ENVIADO
    const items = await prisma.fbaShipmentItem.findMany({
      where: {
        status: "IN_SHIPMENT",
        location: {
          not: "ENVIADO"
        }
      }
    })

    console.log(`Found ${items.length} items to validate.`)
    if (items.length === 0) {
      console.log("No items found to validate! Checking all items in the database...")
      const allItems = await prisma.fbaShipmentItem.findMany({ take: 10 })
      console.log("Sample items:", allItems)
      return
    }

    const warnings: string[] = []
    const errors: string[] = []
    let validCount = 0

    console.log("Fetching all warehouse pallets...")
    const pallets = await prisma.warehousePallet.findMany()
    console.log(`Found ${pallets.length} warehouse pallets.`)

    const palletMap = new Map<string, typeof pallets>()
    for (const pallet of pallets) {
      const existing = palletMap.get(pallet.locationCode) || []
      existing.push(pallet)
      palletMap.set(pallet.locationCode, existing)
    }

    console.log("Starting validation loop...")
    for (const item of items) {
      if (!item.location || item.location === "ENVIADO") continue

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

    console.log("Validation completed successfully!")
    console.log("Validation results:", {
      valid: errors.length === 0,
      validCount,
      totalItems: items.filter((i: any) => i.location && i.location !== "ENVIADO").length,
      warningsCount: warnings.length,
      errorsCount: errors.length,
      warnings,
      errors
    })

  } catch (error) {
    console.error("DIAGNOSTIC FAILED WITH EXCEPTION:")
    console.error(error)
  }
}

runDiagnostic()
