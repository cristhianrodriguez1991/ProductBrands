import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const snapshots = await prisma.weeklyProfitSnapshot.findMany({
      orderBy: { weekEndDate: "asc" }
    })

    return NextResponse.json(snapshots)
  } catch (error) {
    console.error("[SNAPSHOTS_GET]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}
