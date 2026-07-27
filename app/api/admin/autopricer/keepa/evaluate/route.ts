import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { PERMISSIONS, hasEffectivePermission } from "@/lib/permissions"
import { isRankImproving, isRankWorsening } from "@/lib/keepa/analytics/rank-trend"

export const maxDuration = 120
export const dynamic = "force-dynamic"

export async function POST() {
  try {
    const session = await getServerSession(authOptions)
    const userRole = (session?.user as any)?.role
    const customPermissions = (session?.user as any)?.customPermissions || []

    if (!session || !hasEffectivePermission(userRole, customPermissions, PERMISSIONS.AUTOPRICER)) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const jobs = await prisma.keepaEvaluationJob.findMany({
      where: { status: "IN_PROGRESS" },
      include: { monitoredProduct: true },
    })

    if (jobs.length === 0) {
      return NextResponse.json({
        success: true,
        evaluatedCount: 0,
        message: "No in-progress evaluation jobs to check.",
      })
    }

    const now = new Date().getTime()
    let evaluatedCount = 0

    for (const job of jobs) {
      const appliedTime = job.appliedAt.getTime()
      const elapsedHours = (now - appliedTime) / (3600 * 1000)

      // Fetch observations since the job was applied
      const history = await prisma.keepaProductHistory.findMany({
        where: {
          monitoredProductId: job.monitoredProductId,
          timestamp: { gte: new Date(appliedTime - 3600 * 1000) },
        },
        orderBy: { timestamp: "asc" },
      })

      if (history.length === 0) continue

      // Find rank at checkpoints
      const getRankAtHour = (targetHours: number) => {
        const targetTime = appliedTime + targetHours * 3600 * 1000
        const closest = history.reduce((prev, curr) => {
          return Math.abs(curr.timestamp.getTime() - targetTime) < Math.abs(prev.timestamp.getTime() - targetTime)
            ? curr
            : prev
        }, history[0])
        if (Math.abs(closest.timestamp.getTime() - targetTime) < 12 * 3600 * 1000) {
          return closest.salesRank
        }
        return null
      }

      const rankBefore = job.rankBefore ?? history[0]?.salesRank ?? null
      const rank6h = job.rank6h ?? (elapsedHours >= 6 ? getRankAtHour(6) : null)
      const rank12h = job.rank12h ?? (elapsedHours >= 12 ? getRankAtHour(12) : null)
      const rank24h = job.rank24h ?? (elapsedHours >= 24 ? getRankAtHour(24) : null)
      const rank3d = job.rank3d ?? (elapsedHours >= 72 ? getRankAtHour(72) : null)
      const rank7d = job.rank7d ?? (elapsedHours >= 168 ? getRankAtHour(168) : null)

      let status = "IN_PROGRESS"
      let findings = job.findings

      if (elapsedHours >= 168 && rank7d && rankBefore) {
        status = "COMPLETED"
        if (isRankImproving(rankBefore, rank7d)) {
          findings = `SUCCESS: Sales Rank improved numerically from ${rankBefore.toLocaleString()} to ${rank7d.toLocaleString()} (+${Math.round(((rankBefore - rank7d) / rankBefore) * 100)}% ranking improvement) after moving price from $${job.oldPrice.toFixed(2)} to $${job.newPrice.toFixed(2)}.`
        } else if (isRankWorsening(rankBefore, rank7d)) {
          findings = `DETERIORATION: Sales Rank worsened numerically from ${rankBefore.toLocaleString()} to ${rank7d.toLocaleString()} despite price change from $${job.oldPrice.toFixed(2)} to $${job.newPrice.toFixed(2)}. Suggest investigating external competition or Buy Box issues.`
        } else {
          findings = `STABLE: Sales Rank remained relatively unchanged around ${rank7d.toLocaleString()} after price adjustment.`
        }
      }

      await prisma.keepaEvaluationJob.update({
        where: { id: job.id },
        data: {
          rankBefore,
          rank6h,
          rank12h,
          rank24h,
          rank3d,
          rank7d,
          status,
          findings,
          updatedAt: new Date(),
        },
      })

      evaluatedCount++
    }

    return NextResponse.json({
      success: true,
      evaluatedCount,
      message: `Checked and updated ${evaluatedCount} post-change learning evaluation jobs.`,
    })
  } catch (error: any) {
    console.error("[KEEPA_EVALUATE_ERROR]", error)
    return NextResponse.json({ success: false, error: error?.message || "Failed to run evaluations" }, { status: 500 })
  }
}
