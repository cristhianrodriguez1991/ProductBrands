import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { PERMISSIONS, hasEffectivePermission } from "@/lib/permissions"
import { getPriceFeedResult } from "@/lib/amazon-sp-api-service"

export const dynamic = "force-dynamic"
export const maxDuration = 30

/**
 * Poll the status of a previously submitted Amazon price feed and finalize the
 * matching logs once Amazon finishes processing.
 *
 * GET /api/admin/autopricer/approve/feed-status?feedSubmissionId=...
 *   → { status: "IN_PROGRESS"|"DONE", accepted?, errors?, finalized }
 *
 * Used by the client when /approve returned status: "PROCESSING" (feed was
 * still being processed after the server-side poll window). Mirrors the
 * sync-sales client-polling pattern so we never hit Vercel's serverless
 * timeout.
 */
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    const userRole = (session?.user as any)?.role
    const customPermissions = (session?.user as any)?.customPermissions || []
    if (!session || !hasEffectivePermission(userRole, customPermissions, PERMISSIONS.AUTOPRICER)) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const feedSubmissionId = searchParams.get("feedSubmissionId")
    if (!feedSubmissionId) {
      return NextResponse.json({ success: false, error: "Missing feedSubmissionId" }, { status: 400 })
    }

    const result = await getPriceFeedResult(feedSubmissionId)

    if (!result.done) {
      return NextResponse.json({ success: true, feedSubmissionId, status: "IN_PROGRESS", finalized: false })
    }

    // Amazon finished — finalize the matching logs (those still SUBMITTED_TO_AMAZON
    // for this feed id).
    const pendingLogs = await prisma.priceChangeLog.findMany({
      where: { status: "SUBMITTED_TO_AMAZON" },
      include: { monitoredProduct: true },
    })

    const matching = pendingLogs.filter((log) => {
      try {
        const parsed = JSON.parse(log.notes || "{}")
        return parsed.feedSubmissionId === feedSubmissionId
      } catch {
        return false
      }
    })

    for (const log of matching) {
      try {
        const parsed = JSON.parse(log.notes || "{}")
        const submittedPrice: number = Number(parsed.submittedPrice ?? log.newPrice)
        if (result.accepted) {
          await prisma.priceChangeLog.update({
            where: { id: log.id },
            data: { status: "APPLIED", notes: JSON.stringify({ feedSubmissionId, submittedPrice, accepted: true }) },
          })
          await prisma.monitoredProduct.update({
            where: { id: log.monitoredProductId },
            data: {
              currentPrice: submittedPrice,
              recommendedAction: "MAINTAIN",
              recommendationReason: `Price successfully updated to $${submittedPrice.toFixed(2)} on Amazon upon seller approval.`,
              recommendedPrice: submittedPrice,
            },
          })
          try {
            await prisma.keepaEvaluationJob.create({
              data: {
                monitoredProductId: log.monitoredProductId,
                priceChangeLogId: log.id,
                oldPrice: log.oldPrice,
                newPrice: submittedPrice,
                appliedAt: new Date(),
                status: "IN_PROGRESS",
              },
            })
          } catch {
            // ignore
          }
        } else {
          await prisma.priceChangeLog.update({
            where: { id: log.id },
            data: {
              status: "AMAZON_REJECTED",
              notes: JSON.stringify({ feedSubmissionId, submittedPrice, accepted: false, errors: result.errors }),
            },
          })
          await prisma.monitoredProduct.update({
            where: { id: log.monitoredProductId },
            data: {
              recommendedAction: "MAINTAIN",
              recommendationReason: `Amazon rejected the price update to $${submittedPrice.toFixed(2)}: ${result.errors.join(" | ") || "unknown error"}. Live price unchanged.`,
            },
          })
        }
      } catch (e) {
        // ignore individual log finalization errors
      }
    }

    return NextResponse.json({
      success: true,
      feedSubmissionId,
      status: "DONE",
      accepted: result.accepted,
      errors: result.errors,
      resultPreview: result.resultPreview,
      finalized: matching.length,
    })
  } catch (error: any) {
    console.error("[AUTOPRICER_FEED_STATUS]", error)
    return NextResponse.json({ success: false, error: error?.message || "Failed to check feed status" }, { status: 500 })
  }
}