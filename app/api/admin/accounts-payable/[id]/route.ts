import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session.user as any).role !== "ADMIN" && (session.user as any).role !== "OWNER") {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const body = await req.json()
    const { supplierName, amount, dueDate, lastDayToPay, notes, isPaid, proofOfPaymentUrl } = body

    const updateData: any = {}
    if (supplierName !== undefined) updateData.supplierName = supplierName
    if (amount !== undefined) updateData.amount = parseFloat(amount)
    if (dueDate !== undefined) updateData.dueDate = new Date(dueDate)
    if (lastDayToPay !== undefined) updateData.lastDayToPay = lastDayToPay ? new Date(lastDayToPay) : null
    if (notes !== undefined) updateData.notes = notes
    if (isPaid !== undefined) updateData.isPaid = isPaid
    if (proofOfPaymentUrl !== undefined) updateData.proofOfPaymentUrl = proofOfPaymentUrl

    const payable = await prisma.accountPayable.update({
      where: { id: params.id },
      data: updateData
    })

    return NextResponse.json(payable)
  } catch (error: any) {
    console.error("[ACCOUNTS_PAYABLE_PATCH]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session.user as any).role !== "ADMIN" && (session.user as any).role !== "OWNER") {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    await prisma.accountPayable.delete({
      where: { id: params.id }
    })

    return new NextResponse(null, { status: 204 })
  } catch (error: any) {
    console.error("[ACCOUNTS_PAYABLE_DELETE]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}
