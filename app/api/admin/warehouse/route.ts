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

    const pallet = await prisma.warehousePallet.upsert({
      where: { locationCode },
      update: {
        sku,
        productName,
        quantity,
        lotNumber,
        expirationDate: expirationDate ? new Date(expirationDate) : null,
        palletHeightIn,
        status: status || "AVAILABLE",
        notes,
      },
      create: {
        locationCode,
        rack,
        level,
        cellNumber,
        palletPosition,
        sku,
        productName,
        quantity,
        lotNumber,
        expirationDate: expirationDate ? new Date(expirationDate) : null,
        palletHeightIn,
        status: status || "AVAILABLE",
        notes,
      },
    })

    return NextResponse.json(pallet)
  } catch (error) {
    console.error("[WAREHOUSE_POST]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}
