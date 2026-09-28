import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session.user as any).role !== "ADMIN" && (session.user as any).role !== "OWNER") {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const body = await req.json()
    const { amount, proofOfPaymentUrl } = body

    if (!amount) {
      return new NextResponse("Missing required fields", { status: 400 })
    }

    // Check if AccountPayable exists
    const accountPayable = await prisma.accountPayable.findUnique({
      where: { id: params.id },
      include: { payments: true }
    })

    if (!accountPayable) {
      return new NextResponse("Account Payable not found", { status: 404 })
    }

    const paymentAmount = parseFloat(amount)

    // Create the payment
    const payment = await prisma.accountPayablePayment.create({
      data: {
        accountPayableId: params.id,
        amount: paymentAmount,
        proofOfPaymentUrl: proofOfPaymentUrl || null,
      }
    })

    // Check if the total paid >= total amount
    const totalPaidSoFar = accountPayable.payments.reduce((acc, p) => acc + p.amount, 0) + paymentAmount
    if (totalPaidSoFar >= accountPayable.amount && !accountPayable.isPaid) {
      // Mark as fully paid
      await prisma.accountPayable.update({
        where: { id: params.id },
        data: { isPaid: true }
      })
    }

    return NextResponse.json(payment)
  } catch (error: any) {
    console.error("[ACCOUNTS_PAYABLE_PAYMENT_POST]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}
