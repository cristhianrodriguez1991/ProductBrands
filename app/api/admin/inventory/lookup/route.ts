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
    // Generate variations of the code to handle missing/extra leading zeros
    const strippedCode = code.replace(/^0+/, "") || code;
    const codeVariations = [
      code,
      strippedCode,
      "0" + strippedCode,
      "00" + strippedCode,
      "000" + strippedCode,
      "0000" + strippedCode
    ];

    // Try exact matches in priority order with variations for barcodes
    let item = await prisma.inventoryItem.findFirst({
      where: { upc: { in: codeVariations } },
    })

    if (!item) {
      item = await prisma.inventoryItem.findFirst({
        where: { fnsku: code },
      })
    }

    if (!item) {
      item = await prisma.inventoryItem.findFirst({
        where: { ean: { in: codeVariations } },
      })
    }

    if (!item) {
      item = await prisma.inventoryItem.findFirst({
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
        source: "amazon",
        item: {
          ...item,
          lastSyncedAt: item.lastSyncedAt?.toISOString() || null,
          createdAt: item.createdAt.toISOString(),
          updatedAt: item.updatedAt.toISOString(),
        },
      })
    }

    // Fallback: Universal UPC Database (UPCItemDB)
    const isEanUpc = /^\d{8,14}$/.test(code);
    if (isEanUpc) {
      try {
        const upcRes = await fetch(`https://api.upcitemdb.com/prod/trial/lookup?upc=${code}`);
        if (upcRes.ok) {
          const upcData = await upcRes.json();
          if (upcData && upcData.items && upcData.items.length > 0) {
            const externalItem = upcData.items[0];
            return NextResponse.json({
              found: true,
              source: "external",
              item: {
                name: externalItem.title || "",
                upc: externalItem.upc || code,
                ean: externalItem.ean || "",
                asin: externalItem.asin || "",
                description: externalItem.description || "",
                amazonImageUrl: externalItem.images && externalItem.images.length > 0 ? externalItem.images[0] : null,
              }
            });
          }
        }
      } catch (err) {
        console.error("External UPC lookup error:", err);
      }
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
