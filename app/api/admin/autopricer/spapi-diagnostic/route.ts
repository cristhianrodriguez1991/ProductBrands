import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { PERMISSIONS, hasEffectivePermission } from "@/lib/permissions"
import { getClient } from "@/lib/amazon-sp-api-service"

export const dynamic = "force-dynamic"
export const maxDuration = 30

/**
 * SP-API diagnostic. Confirms WHICH Amazon app is configured (by printing the
 * LWA client ID — a public identifier, not a secret) and whether the current
 * refresh token is valid via a live getMarketplaceParticipations call.
 *
 * Hit: /api/admin/autopricer/spapi-diagnostic
 *
 * Use this to answer "is 'Product Brands' the app I'm using?" — compare the
 * GUID in clientId to the amzn1.sp.solution.<guid> you see in Seller Central.
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    const userRole = (session?.user as any)?.role
    const customPermissions = (session?.user as any)?.customPermissions || []
    if (!session || !hasEffectivePermission(userRole, customPermissions, PERMISSIONS.AUTOPRICER)) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const clientId = process.env.AMAZON_SPAPI_CLIENT_ID || ""
    const region = process.env.AMAZON_SPAPI_REGION || "na"

    // Extract the GUID from amzn1.application-oa2-client.<guid>
    const guidMatch = clientId.match(/amzn1\.application-oa2-client\.(.+)/)
    const guid = guidMatch ? guidMatch[1] : "(unrecognized format)"

    // Live call: getMarketplaceParticipations — proves the refresh token works
    // and reveals the seller id + authorized marketplaces.
    let live: any = null
    if (clientId && process.env.AMAZON_SPAPI_CLIENT_SECRET && process.env.AMAZON_SPAPI_REFRESH_TOKEN) {
      try {
        const client: any = getClient()
        const resp: any = await client.callAPI({
          operation: "getMarketplaceParticipations",
          endpoint: "sellers",
        })
        // Normalize across library versions (v1.2.1 returns the array directly, older versions wrapped in payload)
        const parts = Array.isArray(resp) ? resp : (resp?.payload?.marketplaceParticipations || resp?.marketplaceParticipations || [])
        live = {
          ok: true,
          storeId: parts[0]?.store?.id || "(unknown)", // this is your Seller/Merchant ID
          storeName: parts[0]?.store?.name || "(unknown)",
          marketplaces: parts.map((p: any) => ({
            id: p?.marketplace?.id,
            name: p?.marketplace?.name,
            countryCode: p?.marketplace?.countryCode,
          })),
        }
      } catch (e: any) {
        live = { ok: false, error: e?.message || String(e) }
      }
      
      let feedTest: any = null
      try {
        const client: any = getClient()
        const feedDoc = await client.callAPI({
          operation: "createFeedDocument",
          endpoint: "feeds",
          body: { contentType: "text/tab-separated-values; charset=UTF-8" },
          options: { raw_result: true }
        })
        feedTest = { ok: true, data: feedDoc }
      } catch (e: any) {
        feedTest = { 
          ok: false, 
          error: e?.message || String(e),
          details: e?.response?.data || e?.response || e,
          stack: e?.stack
        }
      }

    return NextResponse.json({
      success: true,
      env: {
        AMAZON_SPAPI_CLIENT_ID: clientId || "(empty)", // public identifier, not a secret
        clientIdGuid: guid,
        AMAZON_SPAPI_CLIENT_SECRET_set: !!process.env.AMAZON_SPAPI_CLIENT_SECRET,
        AMAZON_SPAPI_REFRESH_TOKEN_set: !!process.env.AMAZON_SPAPI_REFRESH_TOKEN,
        AMAZON_SPAPI_REGION: region,
      },
      liveMarketplaceParticipations: live,
      feedTest,
      note:
        "Compare clientIdGuid to the GUID in your Seller Central app's amzn1.sp.solution.<guid> — if they match, that is the app being used. The Pricing role must be added to THIS app in Developer Central, then re-authorize to get a new refresh token carrying Pricing scope.",
    })
    }

    return NextResponse.json({
      success: true,
      env: {
        AMAZON_SPAPI_CLIENT_ID: clientId || "(empty)", // public identifier, not a secret
        clientIdGuid: guid,
        AMAZON_SPAPI_CLIENT_SECRET_set: !!process.env.AMAZON_SPAPI_CLIENT_SECRET,
        AMAZON_SPAPI_REFRESH_TOKEN_set: !!process.env.AMAZON_SPAPI_REFRESH_TOKEN,
        AMAZON_SPAPI_REGION: region,
      },
      liveMarketplaceParticipations: live,
      note:
        "Compare clientIdGuid to the GUID in your Seller Central app's amzn1.sp.solution.<guid> — if they match, that is the app being used. The Pricing role must be added to THIS app in Developer Central, then re-authorize to get a new refresh token carrying Pricing scope.",
    })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || "Unknown error" }, { status: 500 })
  }
}