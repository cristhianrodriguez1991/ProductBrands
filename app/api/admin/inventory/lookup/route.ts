import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

/**
 * GET /api/admin/inventory/lookup?code=XXXXX
 *
 * Scans for a matching inventory item by:
 *   1. UPC barcode
 *   2. EAN / IAN barcode
 *   3. ASIN
 *   4. SKU
 *   5. Partial name match (fallback)
 *
 * Returns the matching item if found, or { found: false }.
 * Used by the barcode scanner input on the inventory page.
 */
export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any)?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const code = searchParams.get("code")?.trim()

  if (!code) {
    return NextResponse.json(
      { error: "Missing 'code' parameter" },
      { status: 400 }
    )
  }

  try {
    // Try exact matches in priority order
    let item = await prisma.inventoryItem.findFirst({
      where: { upc: code },
    })

    if (!item) {
      item = await prisma.inventoryItem.findFirst({
        where: { ean: code },
      })
    }

    if (!item) {
      item = await prisma.inventoryItem.findUnique({
        where: { asin: code.toUpperCase() },
      })
    }

    if (!item) {
      item = await prisma.inventoryItem.findFirst({
        where: { sku: { equals: code, mode: "insensitive" } },
      })
    }

    // Fallback: partial name match
    if (!item) {
      item = await prisma.inventoryItem.findFirst({
        where: { name: { contains: code, mode: "insensitive" } },
      })
    }

    if (item) {
      return NextResponse.json({
        found: true,
        item: {
          ...item,
          lastSyncedAt: item.lastSyncedAt?.toISOString() || null,
          createdAt: item.createdAt.toISOString(),
          updatedAt: item.updatedAt.toISOString(),
        },
      })
    }

    return NextResponse.json({ found: false, code })
  } catch (error: any) {
    console.error("Inventory lookup error:", error)
    return NextResponse.json(
      { error: "Lookup failed" },
      { status: 500 }
    )
  }
}
