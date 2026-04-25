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

    const { sourceId, targetId } = await req.json()
    if (!sourceId || !targetId) {
      return new NextResponse("Missing source or target", { status: 400 })
    }

    // Use transaction to swap them
    const result = await prisma.$transaction(async (tx) => {
      const source = await tx.warehousePallet.findUnique({ where: { id: sourceId } })
      const target = await tx.warehousePallet.findUnique({ where: { id: targetId } })
      
      if (!source || !target) throw new Error("Pallet no encontrado.")
      if (target.status !== "AVAILABLE" && target.status !== null) {
         throw new Error(`La posición destino ${target.locationCode} ya está ocupada.`)
      }

      // Move source payload to target
      const updatedTarget = await tx.warehousePallet.update({
        where: { id: targetId },
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

      return [emptySource, updatedTarget]
    })

    return NextResponse.json(result)
  } catch (err: any) {
    console.error("[WAREHOUSE_MOVE]", err)
    return new NextResponse(err.message || "Internal Error", { status: 500 })
  }
}
