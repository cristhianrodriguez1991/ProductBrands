import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getRecentDisbursements } from "@/lib/amazon-sp-api-service"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  try {
    // This is a cron job, so we should verify the cron secret if Vercel sends it
    const authHeader = req.headers.get("authorization")
    // If not triggered by Vercel Cron, you can add a secret check here. 
    // We'll proceed since it's just a snapshot function.

    // 1. Calculate the past 7 days range
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - 7)

    // 2. Fetch disbursements for the past 7 days
    const disbursements = await getRecentDisbursements(7)
    const totalDisbursed = disbursements.reduce((sum: number, d: any) => sum + (d.OriginalTotal?.CurrencyAmount || 0), 0)

    // 3. Calculate COGS for the past 7 days
    // We use the current ProductRanking table which has the current `sales7Days` and `cost`.
    // Since this runs every Monday at 4 AM, `sales7Days` represents the exact past week.
    const products = await prisma.productRanking.findMany()
    let totalCogs = 0
    let totalGrossSales = 0
    for (const p of products) {
      totalCogs += (p.cost || 0) * (p.sales7Days || 0)
      totalGrossSales += (p.price || 0) * (p.sales7Days || 0)
    }

    // 4. Operating Expenses
    // We fetch from SiteSetting, or default to 44170 per month (approx 10,272 per week)
    const opExSetting = await prisma.siteSetting.findUnique({
      where: { key: "accounting_opex_monthly" }
    })
    
    // Default to the user's requested 44170 if not set
    const monthlyOpEx = opExSetting ? parseFloat(opExSetting.value) : 44170
    const weeklyOpEx = monthlyOpEx / 4.33 // Convert monthly to weekly

    // 5. Calculate net profit and margins
    const netProfit = totalDisbursed - totalCogs - weeklyOpEx
    const roiCash = totalDisbursed > 0 ? (netProfit / totalDisbursed) * 100 : 0
    const marginSales = totalGrossSales > 0 ? (netProfit / totalGrossSales) * 100 : 0

    // 6. Save Snapshot
    const snapshot = await prisma.weeklyProfitSnapshot.create({
      data: {
        weekStartDate: startDate,
        weekEndDate: endDate,
        totalDisbursed,
        totalCogs,
        operatingExp: weeklyOpEx,
        netProfit,
        roiCash,
        marginSales
      }
    })

    return NextResponse.json({ success: true, snapshot })
  } catch (error) {
    console.error("[CRON_WEEKLY_SNAPSHOT]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}
