import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function PATCH(
  req: Request,
  { params }: { params: { id: string; lotId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session.user as any)?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()

    const lot = await prisma.batchLot.update({
      where: { id: params.lotId },
      data: {
        ...body,
        approvedAt:
          body.status === "APPROVED" && !body.approvedAt
            ? new Date()
            : body.approvedAt,
        updatedAt: new Date(),
      },
      include: { attachments: true },
    })

    return NextResponse.json(lot)
  } catch (error) {
    console.error("[BatchLot PATCH]", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string; lotId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session.user as any)?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await prisma.batchLot.delete({ where: { id: params.lotId } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[BatchLot DELETE]", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
