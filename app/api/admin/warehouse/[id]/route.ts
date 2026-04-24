import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

// PATCH update a pallet
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session.user as any)?.role !== "ADMIN") {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const body = await req.json()

    // Height validation
    const HEIGHT_LIMITS: Record<string, number> = { TOP: 80, MID: 56, BOT: 40 }

    if (body.palletHeightIn && body.level && body.level !== "FLOOR") {
      const maxHeight = HEIGHT_LIMITS[body.level]
      if (maxHeight && body.palletHeightIn > maxHeight) {
        return NextResponse.json(
          { error: `Pallet height (${body.palletHeightIn}") exceeds max for ${body.level} level (${maxHeight}")` },
          { status: 422 }
        )
      }
    }

    // If we have a pallet by id, check the level from it
    if (body.palletHeightIn && !body.level) {
      const existing = await prisma.warehousePallet.findUnique({ where: { id: params.id } })
      if (existing && existing.level !== "FLOOR") {
        const maxHeight = HEIGHT_LIMITS[existing.level]
        if (maxHeight && body.palletHeightIn > maxHeight) {
          return NextResponse.json(
            { error: `Pallet height (${body.palletHeightIn}") exceeds max for ${existing.level} level (${maxHeight}")` },
            { status: 422 }
          )
        }
      }
    }

    const updateData: any = {}
    if (body.sku !== undefined) updateData.sku = body.sku
    if (body.productName !== undefined) updateData.productName = body.productName
    if (body.quantity !== undefined) updateData.quantity = body.quantity
    if (body.lotNumber !== undefined) updateData.lotNumber = body.lotNumber
    if (body.expirationDate !== undefined) updateData.expirationDate = body.expirationDate ? new Date(body.expirationDate) : null
    if (body.palletHeightIn !== undefined) updateData.palletHeightIn = body.palletHeightIn
    if (body.status !== undefined) updateData.status = body.status
    if (body.notes !== undefined) updateData.notes = body.notes

    const pallet = await prisma.warehousePallet.update({
      where: { id: params.id },
      data: updateData,
    })

    return NextResponse.json(pallet)
  } catch (error) {
    console.error("[WAREHOUSE_PALLET_PATCH]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}

// DELETE clear a pallet (reset to empty)
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session.user as any)?.role !== "ADMIN") {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const pallet = await prisma.warehousePallet.update({
      where: { id: params.id },
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

    return NextResponse.json(pallet)
  } catch (error) {
    console.error("[WAREHOUSE_PALLET_DELETE]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}
