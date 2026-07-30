import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { PERMISSIONS, hasEffectivePermission } from "@/lib/permissions"
import { getClient } from "@/lib/amazon-sp-api-service"

export const dynamic = "force-dynamic"

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    const userRole = (session?.user as any)?.role
    const customPermissions = (session?.user as any)?.customPermissions || []

    if (!session || !hasEffectivePermission(userRole, customPermissions, PERMISSIONS.AUTOPRICER)) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const { id } = await params
    const body = await req.json()
    const newPrice = Number(body.newPrice)

    if (isNaN(newPrice) || newPrice <= 0) {
      return NextResponse.json({ success: false, error: "Invalid price provided." }, { status: 400 })
    }

    const prod = await prisma.monitoredProduct.findUnique({
      where: { id },
    })

    if (!prod) {
      return NextResponse.json({ success: false, error: "Product not found." }, { status: 404 })
    }

    if (newPrice < prod.minPrice || newPrice > prod.maxPrice) {
      return NextResponse.json(
        { success: false, error: `Price $${newPrice} violates guardrails ($${prod.minPrice} - $${prod.maxPrice}).` },
        { status: 400 }
      )
    }

    // Attempt to push to Amazon SP-API if configured
    if (process.env.AMAZON_SPAPI_CLIENT_ID && prod.sku) {
      const client: any = getClient()
      const sellerId = process.env.AMAZON_SPAPI_SELLER_ID?.trim()
      const marketplaceCode = prod.marketplace
      const marketplaceId =
        marketplaceCode === "US"
          ? "ATVPDKIKX0DER"
          : marketplaceCode === "CA"
          ? "A2EUQ1WTGCTBG2"
          : marketplaceCode === "MX"
          ? "A1AM78C64UM0Y8"
          : "ATVPDKIKX0DER"

      if (sellerId) {
        // Fetch existing listing to preserve the base list price (our_price)
        let basePrice = newPrice
        try {
          const existingListing: any = await client.callAPI({
            operation: "getListingsItem",
            endpoint: "listingsItems",
            path: { sellerId, sku: prod.sku },
            query: {
              marketplaceIds: [marketplaceId],
              includedData: "attributes",
            },
          })
          const existingOffer = existingListing?.attributes?.purchasable_offer?.[0]
          const existingOurPrice = existingOffer?.our_price?.[0]?.schedule?.[0]?.value_with_tax
          if (existingOurPrice) basePrice = existingOurPrice
        } catch (e) {
          console.warn("[MANUAL_PRICE] Failed to fetch base price, using newPrice as base.")
        }

        const now = new Date()
        const end = new Date()
        end.setFullYear(now.getFullYear() + 5)

        // Patch the discounted_price (Sale Price)
        await client.callAPI({
          operation: "patchListingsItem",
          endpoint: "listingsItems",
          path: { sellerId, sku: prod.sku },
          query: { marketplaceIds: [marketplaceId] },
          body: {
            productType: "PRODUCT",
            patches: [
              {
                op: "replace",
                path: "/attributes/purchasable_offer",
                value: [
                  {
                    marketplace_id: marketplaceId,
                    currency: marketplaceCode === "US" ? "USD" : marketplaceCode === "CA" ? "CAD" : marketplaceCode === "MX" ? "MXN" : "USD",
                    our_price: [
                      {
                        schedule: [
                          {
                            value_with_tax: Number(basePrice)
                          }
                        ]
                      }
                    ],
                    discounted_price: [
                      {
                        schedule: [
                          {
                            value_with_tax: newPrice,
                            start_at: now.toISOString(),
                            end_at: end.toISOString()
                          }
                        ]
                      }
                    ]
                  }
                ]
              }
            ]
          },
        })
      }
    }

    // Log the manual change
    await prisma.priceChangeLog.create({
      data: {
        monitoredProductId: prod.id,
        oldPrice: prod.currentPrice,
        newPrice: newPrice,
        recommendedAction: "MANUAL",
        reason: "User initiated manual inline price override from dashboard.",
        status: "APPLIED",
        approvedAt: new Date(),
        approvedByUserId: (session?.user as any)?.id || "admin",
      },
    })

    // Update Product Current Price
    const updated = await prisma.monitoredProduct.update({
      where: { id: prod.id },
      data: {
        currentPrice: newPrice,
        // If the manual price matches the AI's pending recommendation, we clear it out by setting MAINTAIN
        recommendedAction: prod.recommendedPrice === newPrice ? "MAINTAIN" : prod.recommendedAction,
      },
    })

    // If there were any pending approvals, mark them as superseded/rejected
    await prisma.priceChangeLog.updateMany({
      where: { monitoredProductId: prod.id, status: "PENDING_APPROVAL" },
      data: { status: "REJECTED", notes: "Superseded by manual price change." },
    })

    return NextResponse.json({ success: true, product: updated })
  } catch (error: any) {
    console.error("[AUTOPRICER_MANUAL_PRICE]", error)
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to update price" },
      { status: 500 }
    )
  }
}
