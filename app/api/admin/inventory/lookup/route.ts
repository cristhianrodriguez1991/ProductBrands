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
    // Only query if it is purely numeric, since FNSKUs (X00...) are Amazon-specific
    // Strip non-digits for the universal logic
    const numericCode = code.replace(/\D/g, "");
    const isNumeric = /^\d{5,14}$/.test(numericCode);
    if (isNumeric) {
      try {
        // 1. Try UPCItemDB
        const upcRes = await fetch(`https://api.upcitemdb.com/prod/trial/lookup?upc=${numericCode}`);
        let upcData = upcRes.ok ? await upcRes.json() : null;

        if ((!upcData || !upcData.items || upcData.items.length === 0) && (numericCode.length === 11 || numericCode.length === 12)) {
           const paddedRes = await fetch(`https://api.upcitemdb.com/prod/trial/lookup?upc=0${numericCode}`);
           if (paddedRes.ok) upcData = await paddedRes.json();
        }

        if (upcData && upcData.items && upcData.items.length > 0) {
          const externalItem = upcData.items[0];
          return NextResponse.json({
            found: true,
            source: "external",
            item: {
              name: externalItem.title || "",
              upc: externalItem.upc || numericCode,
              ean: externalItem.ean || "",
              asin: externalItem.asin || "",
              description: externalItem.description || "",
              amazonImageUrl: externalItem.images && externalItem.images.length > 0 ? externalItem.images[0] : null,
            }
          });
        }

        // 2. Fallback to OpenFoodFacts (good for international EANs)
        const offRes = await fetch(`https://world.openfoodfacts.org/api/v0/product/${numericCode}.json`);
        if (offRes.ok) {
          const offData = await offRes.json();
          if (offData.status === 1 && offData.product) {
             const p = offData.product;
             return NextResponse.json({
               found: true,
               source: "external",
               item: {
                 name: p.product_name || "",
                 upc: numericCode,
                 ean: numericCode,
                 asin: "",
                 description: p.generic_name || "",
                 amazonImageUrl: p.image_url || null,
               }
             });
          }
        }
        // 3. Fallback to BarcodeSpider (excellent for niche items like Adalya)
        try {
          const spiderRes = await fetch(`https://www.barcodespider.com/${numericCode}`, {
            headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36" }
          });
          if (spiderRes.ok) {
            const html = await spiderRes.text();
            // Look for <title>... - Barcode 8681655717905</title>
            // or <div className="detail-item">...
            const titleMatch = html.match(/<title>(.*?) - Barcode/i);
            if (titleMatch && titleMatch[1]) {
              return NextResponse.json({
                found: true,
                source: "external",
                item: {
                  name: titleMatch[1].trim(),
                  upc: numericCode,
                  ean: numericCode,
                  asin: "",
                  description: "Encontrado vía BarcodeSpider",
                  amazonImageUrl: null,
                }
              });
            }
          }
        } catch (err) {
          console.error("BarcodeSpider lookup error:", err);
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
