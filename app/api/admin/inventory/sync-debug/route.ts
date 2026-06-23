import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export const maxDuration = 300;
export const dynamic = "force-dynamic";

/**
 * GET – Debug endpoint that tests every step of Amazon sync individually
 * and reports exactly what succeeds and what fails.
 */
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any)?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const log: string[] = []
  const addLog = (msg: string) => { log.push(`[${new Date().toISOString()}] ${msg}`); console.log(msg) }

  // Step 0: Check credentials
  addLog("=== SYNC DEBUG START ===")
  const hasClientId = !!process.env.AMAZON_SPAPI_CLIENT_ID
  const hasClientSecret = !!process.env.AMAZON_SPAPI_CLIENT_SECRET
  const hasRefreshToken = !!process.env.AMAZON_SPAPI_REFRESH_TOKEN
  addLog(`Credentials: CLIENT_ID=${hasClientId}, CLIENT_SECRET=${hasClientSecret}, REFRESH_TOKEN=${hasRefreshToken}`)

  if (!hasClientId || !hasClientSecret || !hasRefreshToken) {
    addLog("❌ MISSING CREDENTIALS — sync cannot work!")
    return NextResponse.json({ success: false, log })
  }

  // Step 1: Initialize client
  let client: any
  try {
    const SellingPartnerAPI = require("amazon-sp-api")
    client = new SellingPartnerAPI({
      region: process.env.AMAZON_SPAPI_REGION || "na",
      refresh_token: process.env.AMAZON_SPAPI_REFRESH_TOKEN,
      options: { auto_request_tokens: true },
      credentials: {
        SELLING_PARTNER_APP_CLIENT_ID: process.env.AMAZON_SPAPI_CLIENT_ID,
        SELLING_PARTNER_APP_CLIENT_SECRET: process.env.AMAZON_SPAPI_CLIENT_SECRET,
        AWS_ACCESS_KEY_ID: "dummy_access_key_since_iam_deprecated",
        AWS_SECRET_ACCESS_KEY: "dummy_secret_key_since_iam_deprecated",
        AWS_SELLING_PARTNER_ROLE: "arn:aws:iam::123456789012:role/dummy_role",
      },
      use_sandbox: false,
    })
    addLog("✅ SP-API client initialized successfully")
  } catch (e: any) {
    addLog(`❌ SP-API client init FAILED: ${e.message}`)
    return NextResponse.json({ success: false, log })
  }

  // Step 2: Try to list any existing reports
  try {
    const reportsRes: any = await client.callAPI({
      operation: "getReports",
      endpoint: "reports",
      query: {
        reportTypes: ["GET_MERCHANT_LISTINGS_DATA"],
        pageSize: 5,
      },
    })
    const reports = reportsRes?.reports || []
    addLog(`📋 Found ${reports.length} existing GET_MERCHANT_LISTINGS_DATA reports`)
    for (const r of reports.slice(0, 3)) {
      addLog(`   Report ID: ${r.reportId}, Status: ${r.processingStatus}, Created: ${r.createdTime}, DocID: ${r.reportDocumentId || "N/A"}`)
    }
  } catch (e: any) {
    addLog(`⚠️ getReports failed: ${e.message}`)
  }

  // Step 3: Create a FRESH report
  let reportId: string | null = null
  try {
    const createRes: any = await client.callAPI({
      operation: "createReport",
      endpoint: "reports",
      body: {
        reportType: "GET_MERCHANT_LISTINGS_DATA",
        marketplaceIds: ["ATVPDKIKX0DER"],
      },
    })
    reportId = createRes?.reportId
    addLog(`✅ New report requested: ${reportId}`)
  } catch (e: any) {
    addLog(`❌ createReport FAILED: ${e.message}`)
    // Try the ALL_DATA variant as fallback
    try {
      addLog("Trying GET_MERCHANT_LISTINGS_ALL_DATA as fallback...")
      const createRes2: any = await client.callAPI({
        operation: "createReport",
        endpoint: "reports",
        body: {
          reportType: "GET_MERCHANT_LISTINGS_ALL_DATA",
          marketplaceIds: ["ATVPDKIKX0DER"],
        },
      })
      reportId = createRes2?.reportId
      addLog(`✅ Fallback report requested: ${reportId}`)
    } catch (e2: any) {
      addLog(`❌ Fallback createReport also FAILED: ${e2.message}`)
    }
  }

  if (!reportId) {
    addLog("❌ Could not create any report. Stopping debug.")
    return NextResponse.json({ success: false, log })
  }

  // Step 4: Poll for completion (up to ~90 seconds)
  let reportDocumentId: string | null = null
  let reportStatus = "IN_QUEUE"
  let attempts = 0

  while (reportStatus !== "DONE" && attempts < 18) { // 18 * 5s = 90s
    await new Promise(r => setTimeout(r, 5000))
    attempts++
    try {
      const statusRes: any = await client.callAPI({
        operation: "getReport",
        endpoint: "reports",
        path: { reportId },
      })
      reportStatus = statusRes?.processingStatus
      addLog(`   Poll #${attempts}: status=${reportStatus}`)
      if (reportStatus === "DONE") {
        reportDocumentId = statusRes?.reportDocumentId
      } else if (reportStatus === "CANCELLED" || reportStatus === "FATAL") {
        addLog(`❌ Report failed with status: ${reportStatus}`)
        break
      }
    } catch (e: any) {
      addLog(`   Poll #${attempts}: ERROR - ${e.message}`)
    }
  }

  if (!reportDocumentId) {
    addLog(`❌ Report did not complete in time. Last status: ${reportStatus}`)
    return NextResponse.json({ success: false, log })
  }

  // Step 5: Download and parse
  try {
    const docRes: any = await client.callAPI({
      operation: "getReportDocument",
      endpoint: "reports",
      path: { reportDocumentId },
    })
    addLog(`✅ Report document URL obtained`)

    const downloadRes = await fetch(docRes.url)
    const rawBuffer = Buffer.from(await downloadRes.arrayBuffer())
    addLog(`✅ Report downloaded: ${rawBuffer.length} bytes`)
    
    // Check for gzip compression (magic bytes 0x1F 0x8B)
    let tsvContent: string
    if (rawBuffer.length >= 2 && rawBuffer[0] === 0x1f && rawBuffer[1] === 0x8b) {
      addLog("📦 Report is GZIP compressed — decompressing...")
      const { gunzipSync } = require("zlib")
      tsvContent = gunzipSync(rawBuffer).toString("utf-8")
      addLog(`✅ Decompressed to ${tsvContent.length} chars`)
    } else {
      tsvContent = rawBuffer.toString("utf-8")
      addLog("📄 Report is plain text (not compressed)")
    }

    // Parse
    const lines = tsvContent.split("\n").filter((l: string) => l.trim().length > 0)
    if (lines.length < 2) {
      addLog("❌ Report has no data rows!")
      addLog(`   Raw content (first 500 chars): ${tsvContent.substring(0, 500)}`)
      return NextResponse.json({ success: false, log })
    }

    const headers = lines[0].split("\t").map((h: string) => h.trim())
    addLog(`✅ Report headers: ${headers.join(", ")}`)
    addLog(`✅ Total data rows: ${lines.length - 1}`)

    // Show first 3 items
    for (let i = 1; i <= Math.min(3, lines.length - 1); i++) {
      const cols = lines[i].split("\t")
      const row: any = {}
      headers.forEach((h: string, idx: number) => { row[h] = cols[idx]?.trim() || "" })
      const sku = row["seller-sku"] || row["sku"] || "?"
      const title = row["item-name"] || row["product-name"] || "?"
      const asin = row["asin1"] || row["ASIN"] || "?"
      const status = row["status"] || row["item-status"] || "?"
      addLog(`   Item ${i}: SKU="${sku}" ASIN="${asin}" Status="${status}" Title="${title.substring(0, 60)}"`)
    }

    // Check current DB count
    const dbCount = await prisma.inventoryItem.count({ where: { source: "AMAZON" } })
    const dbActiveCount = await prisma.inventoryItem.count({ where: { source: "AMAZON", isActive: true } })
    addLog(`📊 Current DB: ${dbCount} total Amazon items, ${dbActiveCount} active`)

    addLog("=== DEBUG COMPLETE - Everything looks functional ===")
    return NextResponse.json({
      success: true,
      reportItems: lines.length - 1,
      dbTotal: dbCount,
      dbActive: dbActiveCount,
      headers,
      log,
    })
  } catch (e: any) {
    addLog(`❌ Download/parse FAILED: ${e.message}`)
    return NextResponse.json({ success: false, log })
  }
}
