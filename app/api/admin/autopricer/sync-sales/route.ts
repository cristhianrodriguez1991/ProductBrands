import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { downloadReport, getClient } from "@/lib/amazon-sp-api-service"

export const dynamic = 'force-dynamic'
export const maxDuration = 300

/**
 * Sync daily sales by SKU using the Flat File Orders report.
 * 
 * This report gives us EVERY order with SKU, quantity, and price in one download.
 * No pagination needed, no N+1 API calls. Just one report with all the data.
 * 
 * Flow:
 *   1. GET /api/admin/autopricer/sync-sales → Creates the report request
 *   2. GET /api/admin/autopricer/sync-sales → Checks if report is DONE, downloads & parses
 */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const reportDocumentId = url.searchParams.get("reportDocumentId")
    const reportId = url.searchParams.get("reportId")
    const client: any = getClient()
    const usMarketplaceId = "ATVPDKIKX0DER"

    // ──────────────────────────────────────────────────────
    // STEP 2b: Poll the status of a specific report we already created.
    // This prevents creating a NEW report on every reload while Amazon
    // is still generating the previous one (30-day all-orders reports can
    // take 5–15+ minutes, not 2–3).
    // ──────────────────────────────────────────────────────
    if (reportId && !reportDocumentId) {
      console.log(`[SYNC-SALES] Polling report status: ${reportId}`)
      const statusRes: any = await client.callAPI({
        operation: "getReport",
        endpoint: "reports",
        path: { reportId },
      })

      const status = statusRes?.processingStatus
      if (status === "DONE") {
        const docId = statusRes?.reportDocumentId
        return NextResponse.json({
          success: true,
          message: `Report is DONE. Call again with ?reportDocumentId=${docId}`,
          reportDocumentId: docId,
          reportId,
        })
      }

      if (status === "CANCELLED" || status === "FATAL") {
        return NextResponse.json({
          success: false,
          error: `Report ${reportId} failed with status: ${status}. Reload without reportId to create a new one.`,
          reportId,
        }, { status: 400 })
      }

      // Still IN_QUEUE / PROCESSING — return the SAME reportId so the caller
      // keeps polling this one instead of spawning a new report.
      return NextResponse.json({
        success: true,
        message: `Report is still processing (status: ${status || "UNKNOWN"}). Wait a bit and reload this page.`,
        reportId,
        processingStatus: status,
      })
    }

    // ──────────────────────────────────────────────────────
    // STEP 3: If reportDocumentId is provided, download and parse
    // ──────────────────────────────────────────────────────
    if (reportDocumentId) {
      console.log(`[SYNC-SALES] Downloading report document: ${reportDocumentId}`)
      const docRes: any = await client.callAPI({
        operation: "getReportDocument",
        endpoint: "reports",
        path: { reportDocumentId },
      })

      const tsvContent = await downloadReport(docRes.url)
      const lines = tsvContent.split("\n").filter((l: string) => l.trim())

      if (lines.length < 2) {
        return NextResponse.json({ success: false, error: "Report is empty" }, { status: 400 })
      }

      // Parse TSV header to find column indices
      const headers = lines[0].split("\t").map((h: string) => h.trim().toLowerCase())
      const skuIdx = headers.findIndex((h: string) => h === "sku")
      const qtyIdx = headers.findIndex((h: string) => h === "quantity" || h === "quantity-purchased")
      const priceIdx = headers.findIndex((h: string) => h === "item-price" || h === "item-total")
      const dateIdx = headers.findIndex((h: string) => h === "purchase-date" || h === "order-date")
      const asinIdx = headers.findIndex((h: string) => h === "asin")

      if (skuIdx === -1 || dateIdx === -1) {
        return NextResponse.json({ 
          success: false, 
          error: "Could not find required columns in report", 
          headers: headers.slice(0, 30) 
        }, { status: 400 })
      }

      // Fetch all MonitoredProducts to map sku -> product AND asin -> product
      const products = await prisma.monitoredProduct.findMany({
        select: { id: true, sku: true, asin: true }
      })
      const skuMap = new Map<string, any>()
      const asinMap = new Map<string, any>()
      for (const p of products) {
        if (p.sku) skuMap.set(p.sku.trim().toLowerCase(), p)
        if (p.asin) asinMap.set(p.asin.trim().toLowerCase(), p)
      }

      // Aggregate by product-id + Date (keyed on productId so SKU/ASIN matches merge)
      const dailyAggregations = new Map<string, { units: number, sales: number, asin: string, productId: string, sku: string }>()

      // Diagnostics: track how each order line matched (or didn't)
      let matchedBySku = 0
      let matchedByAsin = 0
      const unmatchedSkus = new Set<string>()
      const unmatchedAsins = new Set<string>()

      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split("\t")
        const sku = (cols[skuIdx] || "").trim().toLowerCase()
        const rowAsin = (cols[asinIdx] || "").trim().toLowerCase()

        // Match by SKU first, then fall back to ASIN. Amazon order rows sometimes
        // use a different/child SKU than what's stored on the monitored product,
        // but the ASIN is stable — so ASIN fallback recovers those sales.
        let product = sku ? skuMap.get(sku) : null
        if (product) {
          matchedBySku++
        } else if (rowAsin) {
          product = asinMap.get(rowAsin)
          if (product) matchedByAsin++
        }
        if (!product) {
          if (sku) unmatchedSkus.add(sku)
          if (rowAsin) unmatchedAsins.add(rowAsin)
          continue // Only track monitored products
        }

        const dateRaw = (cols[dateIdx] || "").trim()
        const dateStr = dateRaw.split("T")[0] // "2026-06-28T21:41:17+00:00" → "2026-06-28"
        if (!dateStr) continue

        const qty = parseInt(cols[qtyIdx] || "1", 10) || 1
        const price = parseFloat(cols[priceIdx] || "0") || 0
        const asin = (cols[asinIdx] || product.asin || "").trim()

        const key = `${product.id}__${dateStr}`
        const current = dailyAggregations.get(key) || { units: 0, sales: 0, asin, productId: product.id, sku: product.sku }
        dailyAggregations.set(key, {
          units: current.units + qty,
          sales: current.sales + price,
          asin: asin || current.asin,
          productId: product.id,
          sku: product.sku
        })
      }

      // Upsert into database
      let savedCount = 0
      for (const [key, data] of dailyAggregations.entries()) {
        const [_productId, dateStr] = key.split("__")

        await prisma.amazonDailySales.upsert({
          where: { sku_date: { sku: data.sku, date: dateStr } },
          update: {
            unitsOrdered: data.units,
            orderedProductSales: data.sales,
          },
          create: {
            monitoredProductId: data.productId,
            sku: data.sku,
            asin: data.asin,
            date: dateStr,
            unitsOrdered: data.units,
            orderedProductSales: data.sales,
          }
        })
        savedCount++
      }

      console.log(`[SYNC-SALES] Matched: ${matchedBySku} by SKU, ${matchedByAsin} by ASIN. Unmatched SKUs: ${unmatchedSkus.size}, Unmatched ASINs: ${unmatchedAsins.size}`)

      return NextResponse.json({
        success: true,
        message: `Successfully synced ${savedCount} daily sales records from flat file orders report.`,
        details: {
          totalOrderLines: lines.length - 1,
          matchedToMonitoredProducts: savedCount,
          matchedBySku,
          matchedByAsin,
          unmatchedSkuCount: unmatchedSkus.size,
          unmatchedAsinCount: unmatchedAsins.size,
          unmatchedSkusSample: [...unmatchedSkus].slice(0, 20),
          unmatchedAsinsSample: [...unmatchedAsins].slice(0, 20),
          monitoredSkus: [...skuMap.keys()],
          monitoredAsins: [...asinMap.keys()]
        }
      })
    }

    // ──────────────────────────────────────────────────────
    // STEP 1: Check for existing DONE reports from the last 12 hours
    // ──────────────────────────────────────────────────────
    // Allow explicit force parameter to bypass report caching if fresh sync is requested
    const forceNew = url.searchParams.get("force") === "true"

    if (!forceNew) {
      const createdSince = new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString()
      const recentReportsRes: any = await client.callAPI({
        operation: "getReports",
        endpoint: "reports",
        query: {
          reportTypes: ["GET_FLAT_FILE_ALL_ORDERS_DATA_BY_ORDER_DATE_GENERAL"],
          processingStatuses: ["DONE"],
          createdSince,
          pageSize: 1,
        },
      })

      const recentReports = recentReportsRes?.reports || recentReportsRes?.Reports || []
      if (recentReports.length > 0) {
        const recentDocId = recentReports[0].reportDocumentId
        return NextResponse.json({
          success: true,
          message: `Found recent DONE report. Call again with ?reportDocumentId=${recentDocId}`,
          reportDocumentId: recentDocId
        })
      }
    }

    // ──────────────────────────────────────────────────────
    // STEP 2: Create a new Flat File Orders report for the last 30 days
    // ──────────────────────────────────────────────────────
    const dataStartTime = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    const dataEndTime = new Date().toISOString()

    const createRes: any = await client.callAPI({
      operation: "createReport",
      endpoint: "reports",
      body: {
        reportType: "GET_FLAT_FILE_ALL_ORDERS_DATA_BY_ORDER_DATE_GENERAL",
        dataStartTime,
        dataEndTime,
        marketplaceIds: [usMarketplaceId],
      },
    })

    const newReportId = createRes?.reportId || createRes?.ReportId
    return NextResponse.json({
      success: true,
      message: "Report requested for the last 30 days. Wait a few minutes, then reload with ?reportId=<reportId> to check status.",
      reportId: newReportId
    })

  } catch (error: any) {
    console.error("[SYNC-SALES] Error:", error?.message || error)
    return NextResponse.json({ success: false, error: error?.message || "Unknown error" }, { status: 500 })
  }
}
