import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { PERMISSIONS, hasEffectivePermission } from "@/lib/permissions"

export const dynamic = "force-dynamic"

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    const userRole = (session?.user as any)?.role
    const customPermissions = (session?.user as any)?.customPermissions || []

    if (!session || !hasEffectivePermission(userRole, customPermissions, PERMISSIONS.AUTOPRICER)) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const { isAutopilot } = await req.json()
    const id = params.id

    const product = await prisma.monitoredProduct.findUnique({
      where: { id },
    })

    if (!product) {
      return NextResponse.json({ success: false, error: "Product not found" }, { status: 404 })
    }

    let updates: any = { isAutopilot }

    if (isAutopilot) {
      // User is enabling autopilot. Snapshot the current state.
      // Try to fetch latest Keepa rank first, or fallback to 0.
      const latestKeepa = await prisma.keepaProductHistory.findFirst({
        where: { monitoredProductId: id },
        orderBy: { timestamp: "desc" },
      })
      const currentRank = latestKeepa?.salesRank || 0

      updates = {
        isAutopilot: true,
        autopilotStartedAt: new Date(),
        autopilotStartRank: currentRank,
        autopilotStartPrice: product.currentPrice,
      }
    } else {
      // User is disabling autopilot. Clear the snapshots.
      updates = {
        isAutopilot: false,
        autopilotStartedAt: null,
        autopilotStartRank: null,
        autopilotStartPrice: null,
      }
    }

    const updated = await prisma.monitoredProduct.update({
      where: { id },
      data: updates,
    })

    return NextResponse.json({ success: true, product: updated })
  } catch (error: any) {
    console.error("[AUTOPILOT_TOGGLE_POST]", error)
    return NextResponse.json({ success: false, error: error?.message || "Internal error" }, { status: 500 })
  }
}
