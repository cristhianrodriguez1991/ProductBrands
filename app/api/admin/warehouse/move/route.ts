import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session.user as any)?.role !== "ADMIN") {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const { sourceId, targetId, targetLocCode, targetRack, targetLevel, targetPosition } = await req.json()
    if (!sourceId) return new NextResponse("Missing source", { status: 400 })

    const result = await prisma.$transaction(async (tx) => {
      const source = await tx.warehousePallet.findUnique({ where: { id: sourceId } })
      if (!source) throw new Error("Pallet origen no encontrado.")

      let target = null
      if (targetId && !targetId.startsWith("dummy-")) {
        target = await tx.warehousePallet.findUnique({ where: { id: targetId } })
      }

      if (!target && targetLocCode) {
        // Self-heal: Target location is completely empty in DB. Create placeholder.
        const rackCode = targetRack || targetLocCode.charAt(0)
        const lvlCode = targetLevel || "TOP"
        const cellNum = targetPosition ? Math.ceil(targetPosition / 2) : 1
        const posNum = targetPosition ? (targetPosition % 2 === 0 ? 2 : 1) : 1

        target = await tx.warehousePallet.create({
          data: {
            locationCode: targetLocCode,
            rack: rackCode,
            level: lvlCode,
            cellNumber: cellNum,
            palletPosition: posNum,
            status: "AVAILABLE",
          }
        })
      }

      if (!target) throw new Error("Pallet destino no pudo ser resuelto.")

      let finalTargetId = target.id
      const isTargetOccupied = !!target.productName || !!target.sku

      if (isTargetOccupied && source.locationCode !== target.locationCode) {
        // Find an empty record at same location or create a new one
        const emptyAtLoc = await tx.warehousePallet.findFirst({
          where: { locationCode: target.locationCode, productName: null, sku: null }
        })
        if (emptyAtLoc) {
          finalTargetId = emptyAtLoc.id
        } else {
          // Mixed pallet: Create a new record at the location
          const newPalletAtLoc = await tx.warehousePallet.create({
            data: {
              locationCode: target.locationCode,
              rack: target.rack,
              level: target.level,
              cellNumber: target.cellNumber,
              palletPosition: target.palletPosition,
              status: "AVAILABLE",
            }
          })
          finalTargetId = newPalletAtLoc.id
        }
      }

      // Move source payload to final target
      const updatedTarget = await tx.warehousePallet.update({
        where: { id: finalTargetId },
        data: {
          sku: source.sku,
          productName: source.productName,
          quantity: source.quantity,
          lotNumber: source.lotNumber,
          expirationDate: source.expirationDate,
          palletHeightIn: source.palletHeightIn,
          status: source.status,
          notes: source.notes,
        }
      })

      // Clear source payload
      const emptySource = await tx.warehousePallet.update({
        where: { id: sourceId },
        data: {
          sku: null,
          productName: null,
          quantity: null,
          lotNumber: null,
          expirationDate: null,
          palletHeightIn: null,
          status: "AVAILABLE",
          notes: null,
        }
      })

      // ── Handle Bi-directional Sync with FBA Shipments ──
      // If we moved a pallet, we need to update any FBA items that point to the old location
      const sourceCode = source.locationCode
      const targetCode = target.locationCode

      const itemsToUpdate = await tx.fbaShipmentItem.findMany({
        where: {
          location: { contains: sourceCode }
        }
      })

      for (const item of itemsToUpdate) {
        if (item.location) {
          const locs = item.location.split(' + ').filter(Boolean)
          const newLocs = locs.map(l => l === sourceCode ? targetCode : l)
          const newLocationString = newLocs.join(' + ')

          if (newLocationString !== item.location) {
            await tx.fbaShipmentItem.update({
              where: { id: item.id },
              data: { location: newLocationString }
            })
          }
        }
      }

      return [emptySource, updatedTarget]
    })

    return NextResponse.json(result)
  } catch (err: any) {
    console.error("[WAREHOUSE_MOVE]", err)
    return new NextResponse(err.message || "Internal Error", { status: 500 })
  }
}
