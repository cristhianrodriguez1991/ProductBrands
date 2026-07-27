import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { PERMISSIONS, hasEffectivePermission } from "@/lib/permissions"
import { keepaProvider } from "@/lib/keepa/provider"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    const userRole = (session?.user as any)?.role
    const customPermissions = (session?.user as any)?.customPermissions || []

    if (!session || !hasEffectivePermission(userRole, customPermissions, PERMISSIONS.AUTOPRICER)) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    let config = await prisma.keepaConfig.findUnique({
      where: { id: "default_keepa_config" },
    })

    if (!config) {
      config = await prisma.keepaConfig.create({
        data: {
          id: "default_keepa_config",
          apiKey: null,
          tokensLeft: 300,
          refillRate: 12,
          connectionStatus: "UNCONFIGURED",
        },
      })
    }

    const hasKey = Boolean(config.apiKey && config.apiKey.trim().length > 0)
    const isDemoKey = config.apiKey?.startsWith("demo_") || config.apiKey?.startsWith("test_")

    return NextResponse.json({
      success: true,
      config: {
        hasKey,
        isDemoKey,
        maskedKey: hasKey ? `${config.apiKey!.substring(0, 6)}••••••••••••••••` : null,
        tokensLeft: config.tokensLeft ?? 300,
        refillRate: config.refillRate ?? 12,
        lastCheckedAt: config.lastCheckedAt,
        connectionStatus: config.connectionStatus || (hasKey ? (isDemoKey ? "TEST_MODE" : "CONNECTED") : "UNCONFIGURED"),
      },
    })
  } catch (error: any) {
    console.error("[KEEPA_CONFIG_GET]", error)
    return NextResponse.json({ success: false, error: error?.message || "Failed to fetch Keepa config" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    const userRole = (session?.user as any)?.role
    const customPermissions = (session?.user as any)?.customPermissions || []

    if (!session || !hasEffectivePermission(userRole, customPermissions, PERMISSIONS.AUTOPRICER)) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const body = await req.json()
    const { apiKey, action } = body

    if (action === "TEST_CONNECTION") {
      const status = await keepaProvider.getTokenStatus()
      return NextResponse.json({
        success: status.success,
        status,
        message: status.success
          ? `Connected to Keepa API successfully! Tokens remaining: ${status.tokensLeft} (refills at ${status.refillRate}/min).`
          : `Connection failed: ${status.error}`,
      })
    }

    if (apiKey !== undefined) {
      const trimmed = apiKey === null ? null : String(apiKey).trim()
      const status = trimmed ? (trimmed.startsWith("demo_") || trimmed.startsWith("test_") ? "TEST_MODE" : "CONNECTED") : "UNCONFIGURED"

      await prisma.keepaConfig.upsert({
        where: { id: "default_keepa_config" },
        update: {
          apiKey: trimmed,
          connectionStatus: status,
          lastCheckedAt: new Date(),
        },
        create: {
          id: "default_keepa_config",
          apiKey: trimmed,
          connectionStatus: status,
          tokensLeft: 300,
          refillRate: 12,
          lastCheckedAt: new Date(),
        },
      })

      // Try testing token immediately if live key
      if (trimmed && status === "CONNECTED") {
        await keepaProvider.getTokenStatus()
      }

      return NextResponse.json({
        success: true,
        message: trimmed ? "Keepa API Key saved securely!" : "Keepa API Key removed.",
      })
    }

    return NextResponse.json({ success: false, error: "Invalid request action or missing apiKey" }, { status: 400 })
  } catch (error: any) {
    console.error("[KEEPA_CONFIG_POST]", error)
    return NextResponse.json({ success: false, error: error?.message || "Failed to update Keepa config" }, { status: 500 })
  }
}
