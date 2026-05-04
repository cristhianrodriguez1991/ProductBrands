import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export async function POST() {
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session.user as any)?.role !== "ADMIN") {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    // Wipe out old format pallets entirely
    await prisma.warehousePallet.deleteMany({})

    const positions: Array<{
      locationCode: string
      rack: string
      level: string
      cellNumber: number
      palletPosition: number
    }> = []

    const RACKS: Record<string, number> = { A: 8, B: 5, C: 5 }
    
    // Level mapping for the letter suffix
    const LEVEL_MAP: Record<string, string> = { "TOP": "T", "MID": "M", "BOT": "L" }

    // Racks (T, M, L)
    for (const [rackName, cellCount] of Object.entries(RACKS)) {
      for (const [levelName, levelLetter] of Object.entries(LEVEL_MAP)) {
        for (let cell = 1; cell <= cellCount; cell++) {
          for (let pallet = 1; pallet <= 2; pallet++) {
            const globalPalletNumber = (cell - 1) * 2 + pallet
            positions.push({
              locationCode: `${rackName}${globalPalletNumber}${levelLetter}`,
              rack: rackName,
              level: levelName,
              cellNumber: cell,
              palletPosition: pallet,
            })
          }
        }
      }
    }

    // Floors (P)
    for (const [rackName, cellCount] of Object.entries(RACKS)) {
      for (let cell = 1; cell <= cellCount; cell++) {
        for (let pallet = 1; pallet <= 2; pallet++) {
          const globalPalletNumber = (cell - 1) * 2 + pallet
          positions.push({
            locationCode: `${rackName}${globalPalletNumber}P`,
            rack: `FLOOR-${rackName}`, // Keep DB rack identification for floors
            level: "FLOOR",
            cellNumber: cell,
            palletPosition: pallet,
          })
        }
      }
    }

    // Extra Floor spaces for B and C (negative direction, at ABAJO/L level)
    const extraSpaces = [
      { code: "W-1", rack: "W" },
      { code: "W-2", rack: "W" },
      { code: "W-3", rack: "W" },
      { code: "W-4", rack: "W" },
      { code: "W-5", rack: "W" },
      { code: "W-6", rack: "W" },
    ]
    for (const extra of extraSpaces) {
      positions.push({
        locationCode: extra.code,
        rack: extra.rack,
        level: "BOT",
        cellNumber: 0,
        palletPosition: 0,
      })
    }

    await prisma.warehousePallet.createMany({
      data: positions.map(pos => ({ ...pos, status: "AVAILABLE" }))
    })

    return NextResponse.json({
      message: `Seeded ${positions.length} new positions with exact format.`,
      totalPositions: positions.length,
      newlyCreated: positions.length,
    })
  } catch (error) {
    console.error("[WAREHOUSE_SEED]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}
