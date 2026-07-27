import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { PERMISSIONS, hasEffectivePermission } from "@/lib/permissions"

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
    const { logIds, action, notes, modifiedPrice, isTemporary, restorePrice, expiresAt } = body // action: "APPROVE" | "REJECT"

    if (!Array.isArray(logIds) || logIds.length === 0 || !["APPROVE", "REJECT"].includes(action)) {
      return new NextResponse("Invalid request body. Expected logIds array and action ('APPROVE' or 'REJECT')", { status: 400 })
    }

    let processedCount = 0

    for (const logId of logIds) {
      const log = await prisma.priceChangeLog.findUnique({
        where: { id: logId },
        include: { monitoredProduct: true },
      })

      if (!log || log.status !== "PENDING_APPROVAL") continue

      if (action === "APPROVE") {
        const finalPrice = modifiedPrice && Number(modifiedPrice) > 0 ? Number(modifiedPrice) : log.newPrice
        const tempRestore = restorePrice && Number(restorePrice) > 0 ? Number(restorePrice) : log.oldPrice
        const tempExpiry = expiresAt ? new Date(expiresAt) : new Date(Date.now() + 24 * 3600 * 1000)

        // 1. Mark log as APPROVED & APPLIED
        await prisma.priceChangeLog.update({
          where: { id: logId },
          data: {
            newPrice: finalPrice,
            status: "APPROVED",
            approvedAt: new Date(),
            approvedByUserId: userId,
            notes: notes || "Explicitly approved by seller.",
            isTemporary: Boolean(isTemporary),
            restorePrice: Boolean(isTemporary) ? tempRestore : null,
            expiresAt: Boolean(isTemporary) ? tempExpiry : null,
          },
        })

        // 2. ONLY UPON EXPLICIT CONSENT: Apply the new price to the monitored product record
        await prisma.monitoredProduct.update({
          where: { id: log.monitoredProductId },
          data: {
            currentPrice: finalPrice,
            recommendedAction: "MAINTAIN",
            recommendationReason: `Price successfully updated from $${log.oldPrice.toFixed(2)} to $${finalPrice.toFixed(2)} upon seller approval.${Boolean(isTemporary) ? ` (Temporary approval: restores to $${tempRestore.toFixed(2)} on ${tempExpiry.toLocaleString()})` : ""}`,
            recommendedPrice: finalPrice,
          },
        })

        // 3. Create post-change Keepa learning job
        try {
          await prisma.keepaEvaluationJob.create({
            data: {
              monitoredProductId: log.monitoredProductId,
              priceChangeLogId: logId,
              oldPrice: log.oldPrice,
              newPrice: finalPrice,
              appliedAt: new Date(),
              status: "IN_PROGRESS",
            },
          })
        } catch {
          // ignore
        }
      } else {
        // REJECT
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
      }

      processedCount++
    }

    return NextResponse.json({
      success: true,
      processedCount,
      message: `Successfully ${action === "APPROVE" ? "approved and applied" : "rejected"} ${processedCount} price change requests.`,
    })
  } catch (error) {
    console.error("[AUTOPRICER_APPROVE]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}
