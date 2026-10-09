import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { PERMISSIONS, hasEffectivePermission } from "@/lib/permissions"
import { formatInvoiceNumber, buildInvoiceSmsMessage } from "@/lib/invoice"
import { sendTwilioSms, isTwilioConfigured } from "@/lib/sms"

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

    // Allow overriding or specifying the phone number from the request body
    const body = await req.json().catch(() => ({}))
    const targetPhone = (body?.phone || order.customerPhone || "").trim()

    if (!targetPhone) {
      return NextResponse.json(
        { error: "Customer does not have a phone number on file" },
        { status: 400 }
      )
    }

    // Determine public origin for payment link
    let origin = process.env.NEXTAUTH_URL || ""
    try {
      const headerOrigin = req.headers.get("origin") || req.headers.get("referer")
      if (headerOrigin) {
        origin = new URL(headerOrigin).origin
      }
    } catch {
      // fallback
    }
    if (!origin || origin.includes("localhost")) origin = "https://www.productbrands.com"

    const invoiceNo = formatInvoiceNumber(order)
    const payUrl = `${origin}/pay/${order.id}`

    const smsText = buildInvoiceSmsMessage({
      invoiceNumber: invoiceNo,
      customerName: order.customerName,
      totalAmount: order.totalAmount,
      payUrl,
    })

    if (!isTwilioConfigured()) {
      return NextResponse.json({
        success: false,
        configured: false,
        error: "Twilio credentials are not configured yet.",
        smsText,
        payUrl,
      })
    }

    const smsResult = await sendTwilioSms({
      to: targetPhone,
      body: smsText,
    })

    if (!smsResult.success) {
      return NextResponse.json({
        success: false,
        configured: true,
        error: smsResult.error || "Failed to send SMS via Twilio",
        smsText,
        payUrl,
      }, { status: 502 })
    }

    // If order phone was updated or empty, save it
    if (body?.phone && body.phone !== order.customerPhone) {
      await prisma.customerOrder.update({
        where: { id: order.id },
        data: { customerPhone: targetPhone },
      })
    }

    // Update status to SENT if it was DRAFT
    if (order.status === "DRAFT") {
      await prisma.customerOrder.update({
        where: { id: order.id },
        data: { status: "SENT" },
      })
    }

    return NextResponse.json({
      success: true,
      configured: true,
      messageId: smsResult.messageId,
      sentTo: targetPhone,
      smsText,
      payUrl,
    })
  } catch (error: any) {
    console.error("[CUSTOMER_ORDER_SEND_SMS_ERROR]", error)
    return NextResponse.json(
      { error: error?.message || "Failed to process SMS request" },
      { status: 500 }
    )
  }
}
