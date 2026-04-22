import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session.user as any)?.role !== "ADMIN") {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const logs = await prisma.cleaningLog.findMany({
      orderBy: { date: "desc" },
    })

    return NextResponse.json(logs)
  } catch (error) {
    console.error("[CLEANING_LOGS_GET]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session.user as any)?.role !== "ADMIN") {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const body = await req.json()
    const { 
      date,
      time,
      areaCleaned,
      tasksCompleted,
      cleanedBy,
      supervisorInitials,
      notes,
      imageUrl
    } = body

    const log = await prisma.cleaningLog.create({
      data: {
        date: date ? new Date(date) : new Date(),
        time,
        areaCleaned,
        tasksCompleted,
        cleanedBy,
        supervisorInitials,
        notes,
        imageUrl
      },
    })

    return NextResponse.json(log)
  } catch (error) {
    console.error("[CLEANING_LOGS_POST]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}
