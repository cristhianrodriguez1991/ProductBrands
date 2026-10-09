import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { PERMISSIONS, hasEffectivePermission } from "@/lib/permissions"

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    const userRole = (session?.user as any)?.role
    const customPermissions = (session?.user as any)?.customPermissions || []

    if (!session || !hasEffectivePermission(userRole, customPermissions, PERMISSIONS.ORDERS)) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const order = await prisma.customerOrder.findUnique({
      where: { id: params.id },
      include: {
        items: true
      }
    })

    if (!order) return new NextResponse("Not Found", { status: 404 })

    return NextResponse.json(order)
  } catch (error) {
    console.error("[CUSTOMER_ORDER_GET]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    const userRole = (session?.user as any)?.role
    const customPermissions = (session?.user as any)?.customPermissions || []

    if (!session || !hasEffectivePermission(userRole, customPermissions, PERMISSIONS.ORDERS)) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    await prisma.customerOrder.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[CUSTOMER_ORDER_DELETE]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    const userRole = (session?.user as any)?.role
    const customPermissions = (session?.user as any)?.customPermissions || []

    if (!session || !hasEffectivePermission(userRole, customPermissions, PERMISSIONS.ORDERS)) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const body = await req.json()
    const { sendCustomerCopy, ...cleanData } = body
    
    const order = await prisma.customerOrder.update({
      where: { id: params.id },
      data: cleanData,
      include: {
        items: true
      }
    })

    if (sendCustomerCopy && order.customerEmail && (order.status === "DELIVERED" || order.status === "COMPLETED")) {
      try {
        const { sendEmail } = await import("@/lib/email")
        const { buildDeliveryConfirmationEmail, INVOICE_EMAIL_FROM } = await import("@/lib/invoice-emails")
        const { subject, html } = buildDeliveryConfirmationEmail(order as any)
        await sendEmail({
          to: order.customerEmail,
          subject,
          html,
          from: INVOICE_EMAIL_FROM,
        })
      } catch (emailErr) {
        console.error("[ADMIN_ORDER_PATCH_EMAIL_ERR]", emailErr)
      }
    }

    return NextResponse.json(order)
  } catch (error) {
    console.error("[CUSTOMER_ORDER_PATCH]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}
