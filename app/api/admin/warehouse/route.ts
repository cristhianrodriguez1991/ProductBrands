import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

// GET all pallets
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session.user as any)?.role !== "ADMIN") {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const pallets = await prisma.warehousePallet.findMany({
      orderBy: { locationCode: "asc" },
    })

    return NextResponse.json(pallets)
  } catch (error) {
    console.error("[WAREHOUSE_GET]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}

// POST create or update a pallet at a location
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session.user as any)?.role !== "ADMIN") {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const body = await req.json()
    const {
      locationCode,
      rack,
      level,
      cellNumber,
      palletPosition,
      sku,
      productName,
      quantity,
      lotNumber,
      expirationDate,
      palletHeightIn,
      status,
      notes,
      allowMixed,
    } = body

    if (!locationCode || !rack || !level || !cellNumber || !palletPosition) {
      return new NextResponse("Missing required location fields", { status: 400 })
    }

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
          {
            error: `Pallet height (${palletHeightIn}") exceeds maximum for ${level} level (${maxHeight}")`,
          },
          { status: 422 }
        )
      }
    }

    const normalizedSku = typeof sku === "string" ? sku.trim() : ""
    const normalizedProductName = typeof productName === "string" ? productName.trim() : ""

    // ── Robust Clear Position Logic ──
    if ((status === "AVAILABLE" || status === "ENVIADO") && !normalizedSku && !normalizedProductName) {
      await prisma.warehousePallet.deleteMany({
        where: { locationCode }
      })
      return NextResponse.json({ locationCode, status: "AVAILABLE", cleared: true })
    }

    // Find all existing records at this location code
    const existingPallets = await prisma.warehousePallet.findMany({
      where: { locationCode }
    })

    // 1. Try to find an exact match (Same SKU or Same Name at this location)
    let targetPallet = existingPallets.find(p => {
      const pSku = (p.sku || "").trim().toLowerCase()
      const pName = (p.productName || "").trim().toLowerCase()
      if (normalizedSku && pSku === normalizedSku.toLowerCase()) return true
      if (normalizedProductName && pName === normalizedProductName.toLowerCase()) return true
      return false
    })

    // 2. If no exact match, try to find an AVAILABLE (empty) slot at this location
    if (!targetPallet) {
      targetPallet = existingPallets.find(p => p.status === "AVAILABLE" || (!p.productName && !p.sku))
    }

    // 3. Fallback: If not explicitly adding a mixed pallet, update the first existing record at this location
    if (!targetPallet && !allowMixed && existingPallets.length > 0) {
      targetPallet = existingPallets[0]
    }

    // Clean up duplicate records if any exist at this location for the same product
    if (existingPallets.length > 1 && !allowMixed) {
      const idsToDelete = existingPallets
        .filter(p => targetPallet && p.id !== targetPallet.id)
        .map(p => p.id)
      if (idsToDelete.length > 0) {
        await prisma.warehousePallet.deleteMany({
          where: { id: { in: idsToDelete } }
        })
      }
    }

    const palletData = {
      locationCode,
      rack,
      level,
      cellNumber: typeof cellNumber === "string" ? parseInt(cellNumber) : cellNumber,
      palletPosition: typeof palletPosition === "string" ? parseInt(palletPosition) : palletPosition,
      sku: normalizedSku || null,
      productName: normalizedProductName || null,
      quantity: quantity !== null && quantity !== undefined && quantity !== "" ? parseInt(quantity as any) : null,
      lotNumber: lotNumber || null,
      expirationDate: expirationDate ? new Date(expirationDate) : null,
      palletHeightIn: palletHeightIn ? parseFloat(palletHeightIn) : null,
      status: status || "AVAILABLE",
      notes: notes || null,
    }

    const pallet = targetPallet
      ? await prisma.warehousePallet.update({
          where: { id: targetPallet.id },
          data: palletData,
        })
      : await prisma.warehousePallet.create({
          data: palletData,
        })

    return NextResponse.json(pallet)
  } catch (error) {
    console.error("[WAREHOUSE_POST]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}
