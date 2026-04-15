import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session.user as any)?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { confirmText } = await req.json()
    if (confirmText !== "DELETE ALL CLIENTS" && confirmText !== "DELETE ALL") {
      return NextResponse.json({ error: "Invalid confirmation" }, { status: 400 })
    }

    // This will cascade to Quotes, Orders, Invoices, and Contacts due to schema definition
    await prisma.company.deleteMany({})

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
