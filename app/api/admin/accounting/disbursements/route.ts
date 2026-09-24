import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getRecentDisbursements } from "@/lib/amazon-sp-api-service"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const days = parseInt(searchParams.get("days") || "30")

    const disbursements = await getRecentDisbursements(days)
    return NextResponse.json(disbursements)
  } catch (error) {
    console.error("[DISBURSEMENTS_GET]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}
