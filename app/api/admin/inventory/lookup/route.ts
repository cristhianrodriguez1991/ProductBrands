import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

/**
 * Fetch with a hard timeout to prevent hanging on slow external APIs.
 */
async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 8000): Promise<Response> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { ...options, signal: controller.signal })
  } finally {
    clearTimeout(timeout)
  }
}

/**
 * GET /api/admin/inventory/lookup?code=XXXXX
 *
 * Multi-tier product lookup:
 *   Tier 1: Local database (UPC, EAN, FNSKU, ASIN, SKU, partial name)
 *   Tier 2: UPCItemDB API (universal barcode database)
 *   Tier 3: Open Food Facts (food/beverage products)
 *   Tier 4: Go-UPC API (broad product coverage)
 *   Tier 5: BarcodeSpider web scraping (last resort)
 *
 * Returns { found: true, source, item } or { found: false }.
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

  const saveAndReturn = async (itemData: any, source: string) => {
    try {
      const newItem = await prisma.inventoryItem.create({
        data: {
          source: "MANUAL",
          name: itemData.name || "Unknown Product",
          upc: itemData.upc || null,
          ean: itemData.ean || null,
          asin: itemData.asin || null,
          amazonTitle: itemData.name || null,
          amazonImageUrl: itemData.amazonImageUrl || null,
          imageUrl: itemData.amazonImageUrl || null,
          description: itemData.description || null,
          isActive: true,
        }
      })
      return NextResponse.json({
        found: true,
        source: source,
        item: {
          ...itemData,
          ...newItem,
        }
      })
    } catch (err: any) {
      console.error("[LOOKUP] Failed to save external item to DB:", err.message)
      return NextResponse.json({
        found: true,
        source: source,
        item: itemData
      })
    }
  }

  try {
    // ─── TIER 1: Local Database Lookup ───────────────────────────────
    // Generate variations to handle missing/extra leading zeros on UPCs
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

    // ─── TIER 2+: External Universal UPC Lookups ────────────────────
    // Only run external lookups for numeric barcodes (UPC/EAN)
    // FNSKUs like X00... are Amazon-specific and won't exist in universal DBs
    const numericCode = code.replace(/\D/g, "")
    const isBarcode = /^\d{5,14}$/.test(numericCode)

    if (isBarcode) {
      // Prepare padded variants for UPC-A normalization
      const padded = numericCode.padStart(13, "0")
      const barcodesToTry = Array.from(new Set([numericCode, padded, numericCode.padStart(12, "0")]))

      // ── Tier 2: UPCItemDB ──
      try {
        console.log(`[LOOKUP] Tier 2: UPCItemDB for ${numericCode}`)
        const upcRes = await fetchWithTimeout(
          `https://api.upcitemdb.com/prod/trial/lookup?upc=${numericCode}`,
          {},
          6000
        )

        if (upcRes.ok) {
          let upcData = await upcRes.json()

          // If no results, try with zero-padded variant
          if ((!upcData?.items || upcData.items.length === 0) && numericCode.length <= 12) {
            const paddedCode = numericCode.padStart(13, "0")
            try {
              const paddedRes = await fetchWithTimeout(
                `https://api.upcitemdb.com/prod/trial/lookup?upc=${paddedCode}`,
                {},
                6000
              )
              if (paddedRes.ok) {
                upcData = await paddedRes.json()
              }
            } catch (padErr) {
              console.warn("[LOOKUP] UPCItemDB padded lookup failed:", padErr)
            }
          }

          if (upcData?.items && upcData.items.length > 0) {
            const externalItem = upcData.items[0]
            console.log(`[LOOKUP] ✅ UPCItemDB HIT: "${externalItem.title}"`)
            return saveAndReturn({
              name: externalItem.title || "",
              upc: externalItem.upc || numericCode,
              ean: externalItem.ean || "",
              asin: externalItem.asin || "",
              description: externalItem.description || "",
              amazonImageUrl: externalItem.images && externalItem.images.length > 0 ? externalItem.images[0] : null,
            }, "external")
          }
        } else if (upcRes.status === 429) {
          console.warn("[LOOKUP] UPCItemDB rate limited (429). Skipping to next tier.")
        } else {
          console.warn(`[LOOKUP] UPCItemDB returned ${upcRes.status}`)
        }
      } catch (err: any) {
        if (err?.name === "AbortError") {
          console.warn("[LOOKUP] UPCItemDB timed out after 6s")
        } else {
          console.error("[LOOKUP] UPCItemDB error:", err?.message)
        }
      }

      // ── Tier 3: Open Food Facts (good for international EANs & food items) ──
      try {
        console.log(`[LOOKUP] Tier 3: OpenFoodFacts for ${numericCode}`)
        const offRes = await fetchWithTimeout(
          `https://world.openfoodfacts.org/api/v0/product/${numericCode}.json`,
          {},
          6000
        )
        if (offRes.ok) {
          const offData = await offRes.json()
          if (offData.status === 1 && offData.product) {
            const p = offData.product
            console.log(`[LOOKUP] ✅ OpenFoodFacts HIT: "${p.product_name}"`)
            return saveAndReturn({
              name: p.product_name || "",
              upc: numericCode,
              ean: numericCode,
              asin: "",
              description: p.generic_name || p.categories || "",
              amazonImageUrl: p.image_url || p.image_front_url || null,
            }, "external")
          }
        }
      } catch (err: any) {
        if (err?.name === "AbortError") {
          console.warn("[LOOKUP] OpenFoodFacts timed out")
        } else {
          console.error("[LOOKUP] OpenFoodFacts error:", err?.message)
        }
      }

      // ── Tier 4: Go-UPC (broad coverage, free tier) ──
      try {
        console.log(`[LOOKUP] Tier 4: Go-UPC for ${numericCode}`)
        const goUpcRes = await fetchWithTimeout(
          `https://go-upc.com/api/v1/code/${numericCode}`,
          {
            headers: {
              "Accept": "application/json",
              "User-Agent": "WarehouseInventory/1.0",
            },
          },
          6000
        )
        if (goUpcRes.ok) {
          const goData = await goUpcRes.json()
          if (goData?.product?.name) {
            console.log(`[LOOKUP] ✅ Go-UPC HIT: "${goData.product.name}"`)
            return saveAndReturn({
              name: goData.product.name || "",
              upc: numericCode,
              ean: goData.product.ean || numericCode,
              asin: "",
              description: goData.product.description || goData.product.category || "",
              amazonImageUrl: goData.product.imageUrl || null,
            }, "external")
          }
        }
      } catch (err: any) {
        if (err?.name === "AbortError") {
          console.warn("[LOOKUP] Go-UPC timed out")
        } else {
          console.error("[LOOKUP] Go-UPC error:", err?.message)
        }
      }

      // ── Tier 5: BarcodeSpider Web Scraping (last resort) ──
      try {
        console.log(`[LOOKUP] Tier 5: BarcodeSpider for ${numericCode}`)
        const spiderRes = await fetchWithTimeout(
          `https://www.barcodespider.com/${numericCode}`,
          {
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
              "Accept": "text/html,application/xhtml+xml",
            },
          },
          6000
        )
        if (spiderRes.ok) {
          const html = await spiderRes.text()

          // Try to extract product name from <title>
          const titleMatch = html.match(/<title>(.*?) - Barcode/i)

          // Try to extract from <h2 class="product-name"> or similar
          const h2Match = html.match(/<h2[^>]*class="[^"]*product[^"]*"[^>]*>(.*?)<\/h2>/i)

          const productName = titleMatch?.[1]?.trim() || h2Match?.[1]?.trim()

          // Try to extract image
          const imgMatch = html.match(/<img[^>]*class="[^"]*product[^"]*"[^>]*src="([^"]+)"/i)

          if (productName && productName !== "Not Found" && !productName.toLowerCase().includes("not found")) {
            console.log(`[LOOKUP] ✅ BarcodeSpider HIT: "${productName}"`)
            return saveAndReturn({
              name: productName,
              upc: numericCode,
              ean: numericCode,
              asin: "",
              description: "",
              amazonImageUrl: imgMatch?.[1] || null,
            }, "external")
          }
        }
      } catch (err: any) {
        if (err?.name === "AbortError") {
          console.warn("[LOOKUP] BarcodeSpider timed out")
        } else {
          console.error("[LOOKUP] BarcodeSpider error:", err?.message)
        }
      }

      // ── Tier 6: Digit Eyes (alternative barcode database) ──
      try {
        console.log(`[LOOKUP] Tier 6: BarcodeLookup.com for ${numericCode}`)
        const blRes = await fetchWithTimeout(
          `https://www.barcodelookup.com/${numericCode}`,
          {
            headers: {
              "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
              "Accept": "text/html,application/xhtml+xml",
            },
          },
          6000
        )
        if (blRes.ok) {
          const html = await blRes.text()
          // barcodelookup.com has <h4 class="product-name">Product Name</h4>
          const nameMatch = html.match(/<h4[^>]*class="[^"]*product-name[^"]*"[^>]*>(.*?)<\/h4>/i)
          // Also try the <title> tag
          const titleMatch = html.match(/<title>(.*?)\s*[-|]\s*Barcode/i)
          const productName = nameMatch?.[1]?.trim() || titleMatch?.[1]?.trim()

          const imgMatch = html.match(/<img[^>]*class="[^"]*product-image[^"]*"[^>]*src="([^"]+)"/i)

          if (productName && productName.length > 2 && !productName.toLowerCase().includes("not found")) {
            console.log(`[LOOKUP] ✅ BarcodeLookup HIT: "${productName}"`)
            return saveAndReturn({
              name: productName,
              upc: numericCode,
              ean: numericCode,
              asin: "",
              description: "",
              amazonImageUrl: imgMatch?.[1] || null,
            }, "external")
          }
        }
      } catch (err: any) {
        if (err?.name === "AbortError") {
          console.warn("[LOOKUP] BarcodeLookup timed out")
        } else {
          console.error("[LOOKUP] BarcodeLookup error:", err?.message)
        }
      }
    }

    // ─── FINAL: Amazon PA-API Keyword Search (for non-UPC codes like ASINs) ──
    // Only try if code looks like it could be an ASIN or keyword
    if (!isBarcode || code.length === 10) {
      try {
        console.log(`[LOOKUP] Amazon PA-API search for "${code}"`)
        const { searchItems } = await import("@/lib/amazon-service")
        const amazonItems = await searchItems(code);
        if (amazonItems && amazonItems.length > 0) {
          const amz = amazonItems[0];
          console.log(`[LOOKUP] ✅ Amazon PA-API HIT: "${amz.ItemInfo?.Title?.DisplayValue}"`)
          return saveAndReturn({
            name: amz.ItemInfo?.Title?.DisplayValue || "",
            upc: code,
            sku: "",
            ean: "",
            asin: amz.ASIN || "",
            description: amz.ItemInfo?.Features?.DisplayValues?.join(". ") || "",
            amazonImageUrl: amz.Images?.Primary?.Large?.URL || null,
          }, "amazon")
        }
      } catch (err: any) {
        console.warn("[LOOKUP] Amazon PA-API search failed:", err?.message)
      }
    }

    console.log(`[LOOKUP] ❌ No results found for code: ${code}`)
    return NextResponse.json({ found: false, code })
  } catch (error: any) {
    console.error("Inventory lookup error:", error)
    return NextResponse.json(
      { error: "Lookup failed" },
      { status: 500 }
    )
  }
}
