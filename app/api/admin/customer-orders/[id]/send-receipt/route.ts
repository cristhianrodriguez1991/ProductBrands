import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { PERMISSIONS, hasEffectivePermission } from "@/lib/permissions"
import { sendEmail } from "@/lib/email"
import { buildReceiptEmail, INVOICE_EMAIL_FROM } from "@/lib/invoice-emails"

export const dynamic = "force-dynamic"

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    const userRole = (session?.user as any)?.role
    const customPermissions = (session?.user as any)?.customPermissions || []

    if (!session || !hasEffectivePermission(userRole, customPermissions, PERMISSIONS.ORDERS)) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const order = await prisma.customerOrder.findUnique({
      where: { id: params.id },
      include: { items: true },
    })

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    if (!order.customerEmail) {
      return NextResponse.json({ error: "Customer does not have an email address" }, { status: 400 })
    }

    const { subject, html } = buildReceiptEmail(order)

    const result = await sendEmail({
      to: order.customerEmail,
      subject,
      html,
      from: INVOICE_EMAIL_FROM,
    })

    if (!result.success) {
      const message = (result.error as any)?.message || "Email provider failed"
      return NextResponse.json({ error: `Failed to send confirmation receipt: ${message}` }, { status: 502 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("[CUSTOMER_ORDER_SEND_RECEIPT_ERROR]", error)
    return NextResponse.json(
      { error: error?.message || "Failed to send confirmation receipt" },
      { status: 500 }
    )
  }
}
