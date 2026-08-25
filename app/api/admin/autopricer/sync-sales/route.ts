import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { downloadReport, getClient } from "@/lib/amazon-sp-api-service"

export const dynamic = 'force-dynamic'
export const maxDuration = 300 // allow up to 5 minutes

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const forceNew = url.searchParams.get("force") === "true"
    const client: any = getClient()
    const usMarketplaceId = "ATVPDKIKX0DER"

    let targetReportDocumentId: string | null = null

    // ──────────────────────────────────────────────────────
    // STEP 1: Check for existing DONE reports from the last hour
    // ──────────────────────────────────────────────────────
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
        targetReportDocumentId = recentReports[0].reportDocumentId
        console.log(`[SYNC-SALES] Found recent DONE report document: ${targetReportDocumentId}`)
      }
    }

    // ──────────────────────────────────────────────────────
    // STEP 2: Create a new report and poll if none exists
    // ──────────────────────────────────────────────────────
    if (!targetReportDocumentId) {
      const dataStartTime = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      const dataEndTime = new Date().toISOString()

      console.log(`[SYNC-SALES] Requesting new report from ${dataStartTime} to ${dataEndTime}...`)
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
      if (!newReportId) {
        throw new Error("Failed to create report: No reportId returned.")
      }

      console.log(`[SYNC-SALES] Report requested: ${newReportId}. Polling for completion...`)

      // Poll for up to 4 minutes (48 attempts * 5 seconds = 240 seconds)
      let reportStatus = "IN_QUEUE"
      let attempts = 0
      while (reportStatus !== "DONE" && attempts < 48) {
        await new Promise(r => setTimeout(r, 5000))
        const statusRes: any = await client.callAPI({
          operation: "getReport",
          endpoint: "reports",
          path: { reportId: newReportId },
        })
        reportStatus = statusRes?.processingStatus
        
        if (reportStatus === "DONE") {
          targetReportDocumentId = statusRes?.reportDocumentId
          console.log(`[SYNC-SALES] Report ${newReportId} is DONE. Document ID: ${targetReportDocumentId}`)
        } else if (reportStatus === "CANCELLED" || reportStatus === "FATAL") {
          throw new Error(`Report ${newReportId} failed with status: ${reportStatus}`)
        } else {
          console.log(`[SYNC-SALES] Report ${newReportId} status: ${reportStatus}...`)
        }
        attempts++
      }

      if (!targetReportDocumentId) {
        throw new Error(`Report ${newReportId} did not complete within 4 minutes.`)
      }
    }

    // ──────────────────────────────────────────────────────
    // STEP 3: Download and parse the document
    // ──────────────────────────────────────────────────────
    console.log(`[SYNC-SALES] Downloading report document: ${targetReportDocumentId}`)
    const docRes: any = await client.callAPI({
      operation: "getReportDocument",
      endpoint: "reports",
      path: { reportDocumentId: targetReportDocumentId },
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

    // Aggregate by product-id + Date
    const dailyAggregations = new Map<string, { units: number, sales: number, asin: string, productId: string, sku: string }>()

    let matchedBySku = 0
    let matchedByAsin = 0
    const unmatchedSkus = new Set<string>()
    const unmatchedAsins = new Set<string>()

    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split("\t")
      const sku = (cols[skuIdx] || "").trim().toLowerCase()
      const rowAsin = (cols[asinIdx] || "").trim().toLowerCase()

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
        continue
      }

      const dateRaw = (cols[dateIdx] || "").trim()
      const dateStr = dateRaw.split("T")[0]
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

    console.log(`[SYNC-SALES] Matched: ${matchedBySku} by SKU, ${matchedByAsin} by ASIN.`)

    return NextResponse.json({
      success: true,
      message: `Successfully synced ${savedCount} daily sales records.`,
      details: {
        totalOrderLines: lines.length - 1,
        matchedToMonitoredProducts: savedCount,
        matchedBySku,
        matchedByAsin,
        unmatchedSkuCount: unmatchedSkus.size,
        unmatchedAsinCount: unmatchedAsins.size,
      }
    })

  } catch (error: any) {
    console.error("[SYNC-SALES] Error:", error?.message || error)
    return NextResponse.json({ success: false, error: error?.message || "Unknown error" }, { status: 500 })
  }
}
