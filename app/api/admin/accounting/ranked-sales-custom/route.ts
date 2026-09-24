import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getSalesMetricsByAsins } from "@/lib/amazon-sp-api-service"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")

    if (!startDate || !endDate) {
      return new NextResponse("Missing startDate or endDate", { status: 400 })
    }

    const products = await prisma.productRanking.findMany({
      select: { asin: true }
    })
    const asins = products.map(p => p.asin).filter(Boolean) as string[]

    const metricsMap = await getSalesMetricsByAsins(asins, 30, startDate, endDate)
    const result: Record<string, number> = {}
    
    for (const [asin, units] of Array.from(metricsMap.entries())) {
      result[asin] = units
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error("[CUSTOM_RANKED_SALES_GET]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}
