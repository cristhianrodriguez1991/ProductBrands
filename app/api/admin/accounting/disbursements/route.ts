import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getRecentDisbursements, getAccountSalesMetrics } from "@/lib/amazon-sp-api-service"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const days = parseInt(searchParams.get("days") || "30")
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")

    const [disbursements, accountSales] = await Promise.all([
      getRecentDisbursements(days, startDate || undefined, endDate || undefined),
      getAccountSalesMetrics(days, startDate || undefined, endDate || undefined)
    ])

    return NextResponse.json({
      disbursements,
      accountSales
    })
  } catch (error) {
    console.error("[DISBURSEMENTS_GET]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}
