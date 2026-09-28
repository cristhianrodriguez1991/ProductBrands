import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session.user as any).role !== "ADMIN" && (session.user as any).role !== "OWNER") {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const payables = await prisma.accountPayable.findMany({
      orderBy: { dueDate: 'asc' }
    })

    return NextResponse.json(payables)
  } catch (error: any) {
    console.error("[ACCOUNTS_PAYABLE_GET]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session.user as any).role !== "ADMIN" && (session.user as any).role !== "OWNER") {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const body = await req.json()
    const { supplierName, amount, dueDate, lastDayToPay, notes } = body

    if (!supplierName || amount === undefined || !dueDate) {
      return new NextResponse("Missing required fields", { status: 400 })
    }

    const payable = await prisma.accountPayable.create({
      data: {
        supplierName,
        amount: parseFloat(amount),
        dueDate: new Date(dueDate),
        lastDayToPay: lastDayToPay ? new Date(lastDayToPay) : null,
        notes,
      }
    })

    return NextResponse.json(payable)
  } catch (error: any) {
    console.error("[ACCOUNTS_PAYABLE_POST]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}
