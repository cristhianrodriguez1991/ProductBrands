import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { PERMISSIONS, hasEffectivePermission } from "@/lib/permissions"
import { submitPriceUpdateFeed, getPriceFeedResult } from "@/lib/amazon-sp-api-service"

export const dynamic = "force-dynamic"
export const maxDuration = 60

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

interface SubmittedItem {
  logId: string
  sku: string
  oldPrice: number
  requestedPrice: number
  finalPrice: number
  clamped: boolean
  clampNote: string
  productName: string
  scheduledFor: Date | null
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    const userRole = (session?.user as any)?.role
    const userId = (session?.user as any)?.id || "admin"
    const customPermissions = (session?.user as any)?.customPermissions || []

    if (!session || !hasEffectivePermission(userRole, customPermissions, PERMISSIONS.AUTOPRICER)) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const body = await req.json()
    const {
      logIds,
      action, // "APPROVE" | "REJECT"
      notes,
      modifiedPrice,
      isTemporary,
      restorePrice,
      expiresAt,
      dryRun = false, // when true, NO Amazon call & NO DB change — just a preview
    } = body

    if (!Array.isArray(logIds) || logIds.length === 0 || !["APPROVE", "REJECT"].includes(action)) {
      return new NextResponse("Invalid request body. Expected logIds array and action ('APPROVE' or 'REJECT')", { status: 400 })
    }

    // ── REJECT ──────────────────────────────────────────────────────────────
    if (action === "REJECT") {
      let processedCount = 0
      for (const logId of logIds) {
        const log = await prisma.priceChangeLog.findUnique({ where: { id: logId }, include: { monitoredProduct: true } })
        if (!log || log.status === "APPLIED") continue
        await prisma.priceChangeLog.update({
          where: { id: logId },
          data: {
            status: "REJECTED",
            approvedAt: new Date(),
            approvedByUserId: userId,
            notes: notes || "Rejected by seller.",
          },
        })
        await prisma.monitoredProduct.update({
          where: { id: log.monitoredProductId },
          data: {
            recommendedAction: "MAINTAIN",
            recommendationReason: `Recommended price change to $${log.newPrice.toFixed(2)} was rejected by seller. Maintaining current price of $${log.oldPrice.toFixed(2)}.`,
          },
        })
        processedCount++
      }
      return NextResponse.json({ success: true, processedCount, message: `Rejected ${processedCount} price change requests.` })
    }

    // ── APPROVE ─────────────────────────────────────────────────────────────
    // Load all requested logs with their products.
    const logs = await prisma.priceChangeLog.findMany({
      where: { id: { in: logIds }, status: "PENDING_APPROVAL" },
      include: { monitoredProduct: true },
    })

    if (logs.length === 0) {
      return NextResponse.json({ success: false, error: "No pending price change logs found for the given IDs." }, { status: 404 })
    }

    // 1. Compute the final price for each log, hard-enforcing the product's
    //    min/max bounds so the autopricer can NEVER push a price outside the
    //    floor/ceiling the seller set.
    const items: SubmittedItem[] = []
    for (const log of logs) {
      const product = log.monitoredProduct
      const requested = modifiedPrice && Number(modifiedPrice) > 0 ? Number(modifiedPrice) : log.newPrice
      let finalPrice = requested
      let clampNote = ""
      if (finalPrice < product.minPrice) {
        finalPrice = product.minPrice
        clampNote = `Clamped up to your min floor of $${product.minPrice.toFixed(2)}.`
      } else if (finalPrice > product.maxPrice) {
        finalPrice = product.maxPrice
        clampNote = `Clamped down to your max ceiling of $${product.maxPrice.toFixed(2)}.`
      }
      items.push({
        logId: log.id,
        sku: product.sku,
        oldPrice: log.oldPrice,
        requestedPrice: requested,
        finalPrice,
        clamped: clampNote !== "",
        clampNote,
        productName: product.productName,
        scheduledFor: log.scheduledFor,
      })
    }

    // Filter out items scheduled for the future
    const now = new Date()
    const immediateItems = items.filter(it => !it.scheduledFor || new Date(it.scheduledFor) <= now)
    const scheduledItems = items.filter(it => it.scheduledFor && new Date(it.scheduledFor) > now)

    // Handle scheduled items immediately (no Amazon call)
    if (scheduledItems.length > 0 && !dryRun) {
      for (const it of scheduledItems) {
        await prisma.priceChangeLog.update({
          where: { id: it.logId },
          data: {
            status: "APPROVED_SCHEDULED",
            approvedAt: new Date(),
            approvedByUserId: userId,
            notes: notes || `Scheduled for ${new Date(it.scheduledFor!).toDateString()}`,
            newPrice: it.finalPrice,
          }
        })
      }
    }

    // If there are no items to submit immediately, we can return early
    if (immediateItems.length === 0) {
      return NextResponse.json({
        success: true,
        dryRun,
        status: "DONE",
        scheduledCount: scheduledItems.length,
        message: `✅ Scheduled ${scheduledItems.length} price change(s) for future execution. No immediate changes to Amazon.`
      })
    }

    // 2. DRY RUN — return a preview, change nothing.
    if (dryRun) {
      const tsvPreview = ["sku\tprice\tquantity", ...immediateItems.map((it) => `${it.sku}\t${it.finalPrice.toFixed(2)}\t`)].join("\n")
      return NextResponse.json({
        success: true,
        dryRun: true,
        marketplace: logs[0]?.monitoredProduct?.marketplace || "US",
        items: immediateItems.map((it) => ({
          logId: it.logId,
          productName: it.productName,
          sku: it.sku,
          currentPrice: it.oldPrice,
          requestedPrice: it.requestedPrice,
          finalPrice: it.finalPrice,
          clamped: it.clamped,
          clampNote: it.clampNote,
        })),
        feedTsvPreview: tsvPreview,
        message: `Dry run: would push ${immediateItems.length} price change(s) to Amazon (and ${scheduledItems.length} scheduled). Nothing was sent.`,
      })
    }

    // 3. LIVE — submit the price feed to Amazon.
    const marketplaceCode = logs[0]?.monitoredProduct?.marketplace || "US"
    const feedItems = immediateItems.map((it) => ({ sku: it.sku, price: it.finalPrice }))

    let feedSubmissionId: string
    try {
      const submitted = await submitPriceUpdateFeed(feedItems, marketplaceCode)
      feedSubmissionId = submitted.feedSubmissionId
    } catch (feedErr: any) {
      // Submission failed before Amazon accepted it — leave logs PENDING so the
      // seller can retry. Surface the exact error.
      return NextResponse.json({
        success: false,
        error: `Amazon rejected the price feed submission: ${feedErr?.message || String(feedErr)}`,
        items: items.map((it) => ({ logId: it.logId, sku: it.sku, finalPrice: it.finalPrice })),
      }, { status: 502 })
    }

    // Mark all immediate logs as SUBMITTED_TO_AMAZON with the feed id + submitted price.
    const approvedAt = new Date()
    for (const it of immediateItems) {
      const log = logs.find((l) => l.id === it.logId)!
      const tempRestore = restorePrice && Number(restorePrice) > 0 ? Number(restorePrice) : log.oldPrice
      const tempExpiry = expiresAt ? new Date(expiresAt) : new Date(Date.now() + 24 * 3600 * 1000)
      await prisma.priceChangeLog.update({
        where: { id: it.logId },
        data: {
          newPrice: it.finalPrice,
          status: "SUBMITTED_TO_AMAZON",
          approvedAt,
          approvedByUserId: userId,
          isTemporary: Boolean(isTemporary),
          restorePrice: Boolean(isTemporary) ? tempRestore : null,
          expiresAt: Boolean(isTemporary) ? tempExpiry : null,
          notes: JSON.stringify({
            feedSubmissionId,
            submittedPrice: it.finalPrice,
            clampNote: it.clampNote || undefined,
            sellerNote: notes || undefined,
            submittedAt: approvedAt.toISOString(),
          }),
        },
      })
    }

    // 4. Short bounded server-side poll (≈40s) to catch the common fast case.
    //    If Amazon hasn't finished, return PROCESSING and let the client poll
    //    /api/admin/autopricer/approve/feed-status — same pattern as sync-sales.
    let result = await getPriceFeedResult(feedSubmissionId)
    for (let attempt = 0; attempt < 10 && !result.done; attempt++) {
      await sleep(4000)
      result = await getPriceFeedResult(feedSubmissionId)
    }

    if (result.done) {
      await finalizeFeedResult(feedSubmissionId, result, immediateItems, logs)
      return NextResponse.json({
        success: true,
        dryRun: false,
        feedSubmissionId,
        status: "DONE",
        accepted: result.accepted,
        errors: result.errors,
        resultPreview: result.resultPreview,
        processedCount: immediateItems.length,
        scheduledCount: scheduledItems.length,
        message: result.accepted
          ? `✅ Amazon accepted the price update for ${immediateItems.length} SKU(s). ${scheduledItems.length > 0 ? `(${scheduledItems.length} scheduled).` : ''}`
          : `⚠️ Amazon finished processing but reported ${result.errors.length} error(s). See details.`,
      })
    }

    return NextResponse.json({
      success: true,
      dryRun: false,
      feedSubmissionId,
      status: "PROCESSING",
      processedCount: immediateItems.length,
      scheduledCount: scheduledItems.length,
      message: `Price feed submitted to Amazon (id ${feedSubmissionId}). Still processing — the panel will poll until it resolves.`,
    })
  } catch (error: any) {
    console.error("[AUTOPRICER_APPROVE]", error)
    return NextResponse.json({ success: false, error: error?.message || "Failed to process approval" }, { status: 500 })
  }
}

/**
 * Apply the final Amazon feed result to the matching logs + products.
 * - accepted → log status APPLIED, product.currentPrice = submitted price.
 * - rejected → log status AMAZON_REJECTED, product unchanged, errors stored.
 */
async function finalizeFeedResult(
  feedSubmissionId: string,
  result: { accepted: boolean; errors: string[] },
  items: SubmittedItem[],
  logs: { id: string; monitoredProductId: string; oldPrice: number }[]
) {
  for (const it of items) {
    const log = logs.find((l) => l.id === it.logId)
    if (!log) continue
    if (result.accepted) {
      await prisma.priceChangeLog.update({
        where: { id: it.logId },
        data: { status: "APPLIED", notes: JSON.stringify({ feedSubmissionId, submittedPrice: it.finalPrice, accepted: true }) },
      })
      await prisma.monitoredProduct.update({
        where: { id: log.monitoredProductId },
        data: {
          currentPrice: it.finalPrice,
          recommendedAction: "MAINTAIN",
          recommendationReason: `Price successfully updated from $${it.oldPrice.toFixed(2)} to $${it.finalPrice.toFixed(2)} on Amazon upon seller approval.`,
          recommendedPrice: it.finalPrice,
        },
      })
      // Post-change Keepa learning job
      try {
        await prisma.keepaEvaluationJob.create({
          data: {
            monitoredProductId: log.monitoredProductId,
            priceChangeLogId: it.logId,
            oldPrice: it.oldPrice,
            newPrice: it.finalPrice,
            appliedAt: new Date(),
            status: "IN_PROGRESS",
          },
        })
      } catch {
        // ignore
      }
    } else {
      await prisma.priceChangeLog.update({
        where: { id: it.logId },
        data: {
          status: "AMAZON_REJECTED",
          notes: JSON.stringify({ feedSubmissionId, submittedPrice: it.finalPrice, accepted: false, errors: result.errors }),
        },
      })
      await prisma.monitoredProduct.update({
        where: { id: log.monitoredProductId },
        data: {
          recommendedAction: "MAINTAIN",
          recommendationReason: `Amazon rejected the price update to $${it.finalPrice.toFixed(2)}: ${result.errors.join(" | ") || "unknown error"}. Live price unchanged at $${it.oldPrice.toFixed(2)}.`,
        },
      })
    }
  }
}