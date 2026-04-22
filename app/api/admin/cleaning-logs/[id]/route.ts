import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session.user as any)?.role !== "ADMIN") {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const { id } = params
    const body = await req.json()
    
    // Convert date if provided
    if (body.date) {
      body.date = new Date(body.date)
    }

    const log = await prisma.cleaningLog.update({
      where: { id },
      data: body,
    })

    return NextResponse.json(log)
  } catch (error) {
    console.error("[CLEANING_LOG_PATCH]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session.user as any)?.role !== "ADMIN") {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const { id } = params

    await prisma.cleaningLog.delete({
      where: { id },
    })

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error("[CLEANING_LOG_DELETE]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}
