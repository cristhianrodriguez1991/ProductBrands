import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

// POST — seed all warehouse positions (idempotent: skips existing)
export async function POST() {
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session.user as any)?.role !== "ADMIN") {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const positions: Array<{
      locationCode: string
      rack: string
      level: string
      cellNumber: number
      palletPosition: number
    }> = []

    const RACKS: Record<string, number> = { A: 8, B: 5, C: 5 }
    const LEVELS = ["TOP", "MID", "BOT"]

    // Rack positions
    for (const [rackName, cellCount] of Object.entries(RACKS)) {
      for (const level of LEVELS) {
        for (let cell = 1; cell <= cellCount; cell++) {
          for (let pallet = 1; pallet <= 2; pallet++) {
            const cellStr = String(cell).padStart(2, "0")
            positions.push({
              locationCode: `${rackName}-${level}-${cellStr}-P${pallet}`,
              rack: rackName,
              level,
              cellNumber: cell,
              palletPosition: pallet,
            })
          }
        }
      }
    }

    // Floor positions
    for (const [rackName, cellCount] of Object.entries(RACKS)) {
      for (let cell = 1; cell <= cellCount; cell++) {
        for (let pallet = 1; pallet <= 2; pallet++) {
          const cellStr = String(cell).padStart(2, "0")
          positions.push({
            locationCode: `FLOOR-${rackName}-${cellStr}-P${pallet}`,
            rack: `FLOOR-${rackName}`,
            level: "FLOOR",
            cellNumber: cell,
            palletPosition: pallet,
          })
        }
      }
    }

    let created = 0
    for (const pos of positions) {
      const exists = await prisma.warehousePallet.findUnique({
        where: { locationCode: pos.locationCode },
      })
      if (!exists) {
        await prisma.warehousePallet.create({
          data: { ...pos, status: "AVAILABLE" },
        })
        created++
      }
    }

    return NextResponse.json({
      message: `Seeded ${created} new positions. Total defined: ${positions.length}.`,
      totalPositions: positions.length,
      newlyCreated: created,
    })
  } catch (error) {
    console.error("[WAREHOUSE_SEED]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}
