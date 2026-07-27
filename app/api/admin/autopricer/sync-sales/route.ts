import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { downloadReport, getClient } from "@/lib/amazon-sp-api-service"

export const maxDuration = 300 // allow up to 5 minutes if supported by vercel plan

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const reportDocumentId = url.searchParams.get("reportDocumentId")
    const client: any = getClient()
    
    // If reportDocumentId is passed, we are in STEP 3: Download and Parse
    if (reportDocumentId) {
      console.log(`[SYNC-SALES] Downloading report document: ${reportDocumentId}`)
      const docRes: any = await client.callAPI({
        operation: "getReportDocument",
        endpoint: "reports",
        path: { reportDocumentId },
      })

      const jsonContent = await downloadReport(docRes.url)
      const data = JSON.parse(jsonContent)
      
      const salesByAsin = data?.salesAndTrafficByAsin || []
      
      if (!Array.isArray(salesByAsin) || salesByAsin.length === 0) {
        return NextResponse.json({ success: false, error: "Report contains no ASIN data." }, { status: 400 })
      }

      console.log(`[SYNC-SALES] Parsing ${salesByAsin.length} ASIN records...`)

      // GET_SALES_AND_TRAFFIC_REPORT with dateGranularity=DAY and asinGranularity=SKU 
      // returns records with: { sku, asin, date, salesByAsin: { unitsOrdered, orderedProductSales: { amount } } }
      
      let savedCount = 0
      
      // Fetch all MonitoredProducts to map sku -> monitoredProductId
      const products = await prisma.monitoredProduct.findMany({
        select: { id: true, sku: true }
      })
      const skuMap = new Map<string, string>()
      for (const p of products) {
        skuMap.set(p.sku.toLowerCase(), p.id)
      }

      for (const record of salesByAsin) {
        const sku = record.sku || ""
        const asin = record.childAsin || record.parentAsin || ""
        const dateStr = record.date || "" // YYYY-MM-DD
        
        const units = record.salesByAsin?.unitsOrdered || 0
        const salesAmount = record.salesByAsin?.orderedProductSales?.amount || 0
        
        if (!sku || !dateStr) continue

        const monitoredProductId = skuMap.get(sku.toLowerCase())
        if (!monitoredProductId) continue // Only save sales for products we are actively monitoring

        await prisma.amazonDailySales.upsert({
          where: { sku_date: { sku: sku, date: dateStr } },
          update: {
            unitsOrdered: units,
            orderedProductSales: salesAmount,
            asin: asin,
          },
          create: {
            monitoredProductId,
            sku: sku,
            asin: asin,
            date: dateStr,
            unitsOrdered: units,
            orderedProductSales: salesAmount,
          }
        })
        savedCount++
      }
      
      if (savedCount === 0) {
        return NextResponse.json({ 
          success: false, 
          message: "Successfully synced 0 daily sales records. The report structure might not match expectations.",
          debugAsin: salesByAsin[0] || null,
          debugDate: data?.salesAndTrafficByDate?.[0] || null
        })
      }

      return NextResponse.json({ success: true, message: `Successfully synced ${savedCount} daily sales records across up to 2 years.` })
    }

    // STEP 1: Check for existing DONE reports in the last 12 hours
    const createdSince = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString()
    const recentReportsRes: any = await client.callAPI({
      operation: "getReports",
      endpoint: "reports",
      query: {
        reportTypes: ["GET_SALES_AND_TRAFFIC_REPORT"],
        processingStatuses: ["DONE"],
        createdSince,
        pageSize: 1,
      },
    })

    if (recentReportsRes?.reports && recentReportsRes.reports.length > 0) {
      const recentDocId = recentReportsRes.reports[0].reportDocumentId
      return NextResponse.json({ 
        success: true, 
        message: "Found recent DONE report. Call this endpoint again with ?reportDocumentId=" + recentDocId,
        reportDocumentId: recentDocId 
      })
    }

    // STEP 2: Create a new Report for MAXIMUM Amazon history (2 years is the SP-API limit)
    // Esto asegura que la IA tenga el historial completo desde el "Día 1".
    const dataStartTime = new Date(Date.now() - 730 * 24 * 60 * 60 * 1000).toISOString()
    const dataEndTime = new Date().toISOString()

    const createRes: any = await client.callAPI({
      operation: "createReport",
      endpoint: "reports",
      body: {
        reportType: "GET_SALES_AND_TRAFFIC_REPORT",
        dataStartTime,
        dataEndTime,
        marketplaceIds: ["ATVPDKIKX0DER"],
        reportOptions: {
          dateGranularity: "DAY",
          asinGranularity: "SKU"
        }
      },
    })

    return NextResponse.json({ 
      success: true, 
      message: "Report creation requested for 2 Years of history. Wait 3 minutes and check Amazon SP-API.", 
      reportId: createRes.reportId 
    })

  } catch (error: any) {
    console.error("[SYNC-SALES] Error:", error?.message || error)
    return NextResponse.json({ success: false, error: error?.message || "Unknown error" }, { status: 500 })
  }
}
