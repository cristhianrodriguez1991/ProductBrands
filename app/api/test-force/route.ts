import { NextResponse } from "next/server"
import { submitScheduledSaleUpdate } from "@/lib/amazon-sp-api-service"

export async function GET() {
  try {
    const sku = "WB-B3V2-ZNMA"
    const now = new Date()
    const end = new Date()
    end.setFullYear(now.getFullYear() + 5)
    
    // We want to force it to REGULAR price to see if the sale clears
    const res = await submitScheduledSaleUpdate(
      sku,
      7.50, // Base price
      null, // Sale price (null means clear it)
      now,
      end,
      "US"
    )

    return NextResponse.json({ success: true, res })
  } catch (err: any) {
    const details = err?.response?.data || err?.response || err?.message || String(err)
    return NextResponse.json({ error: details }, { status: 500 })
  }
}
