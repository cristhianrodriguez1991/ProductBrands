import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { PERMISSIONS, hasEffectivePermission } from "@/lib/permissions"

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

    const existing = await prisma.monitoredProduct.findUnique({
      where: { id },
    })

    if (!existing) {
      return new NextResponse("Monitored product not found", { status: 404 })
    }

    const updated = await prisma.monitoredProduct.update({
      where: { id },
      data: {
        productName: body.productName !== undefined ? body.productName.trim() : undefined,
        imageUrl: body.imageUrl !== undefined ? body.imageUrl : undefined,
        category: body.category !== undefined ? body.category : undefined,
        unitCost: body.unitCost !== undefined ? Number(body.unitCost) : undefined,
        fulfillmentMethod: body.fulfillmentMethod !== undefined ? body.fulfillmentMethod : undefined,
        minPrice: body.minPrice !== undefined ? Number(body.minPrice) : undefined,
        maxPrice: body.maxPrice !== undefined ? Number(body.maxPrice) : undefined,
        minMarginPercent: body.minMarginPercent !== undefined ? Number(body.minMarginPercent) : undefined,
        referralFeePercent: body.referralFeePercent !== undefined ? Number(body.referralFeePercent) : undefined,
        fbaFee: body.fbaFee !== undefined ? Number(body.fbaFee) : undefined,
        status: body.status !== undefined ? body.status : undefined,
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error("[AUTOPRICER_PATCH_PRODUCT]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    const userRole = (session?.user as any)?.role
    const customPermissions = (session?.user as any)?.customPermissions || []

    if (!session || !hasEffectivePermission(userRole, customPermissions, PERMISSIONS.AUTOPRICER)) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const { id } = await params

    await prisma.monitoredProduct.delete({
      where: { id },
    })

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error("[AUTOPRICER_DELETE_PRODUCT]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}
