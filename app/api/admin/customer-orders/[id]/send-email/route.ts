import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { PERMISSIONS, hasEffectivePermission } from "@/lib/permissions"
import { sendEmail } from "@/lib/email"

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

    let origin = process.env.NEXTAUTH_URL || ""
    try {
      const headerOrigin = req.headers.get("origin") || req.headers.get("referer")
      if (headerOrigin) {
        origin = new URL(headerOrigin).origin
      }
    } catch {
      // fallback
    }
    if (!origin) origin = "https://www.productbrands.com"

    const payUrl = `${origin}/pay/${order.id}`
    const formattedTotal = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(order.totalAmount)

    const deliveryText = order.deliveryDate
      ? new Date(order.deliveryDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
      : "To be confirmed"

    await sendEmail({
      to: order.customerEmail,
      subject: `Invoice #${order.id.slice(-8).toUpperCase()} from Product Brands`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 620px; margin: 0 auto; padding: 32px 24px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; color: #1e293b;">
          <div style="border-bottom: 2px solid #0f172a; padding-bottom: 20px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: center;">
            <div>
              <h1 style="font-size: 24px; font-weight: 800; color: #0f172a; margin: 0; letter-spacing: -0.5px;">PRODUCT BRANDS</h1>
              <p style="margin: 4px 0 0 0; color: #64748b; font-size: 13px;">8001 NW 54th St, Doral FL, 33166 • info@productbrands.com</p>
            </div>
          </div>

          <p style="font-size: 16px; margin: 0 0 16px 0;">Hello <strong>${order.customerName}</strong>,</p>
          <p style="font-size: 14px; color: #475569; margin: 0 0 24px 0; line-height: 1.5;">
            Thank you for your business. Please find your invoice details below. You can view the full order details and complete your payment securely via ACH (Bank Transfer) or Credit Card using the button below.
          </p>

          <div style="background-color: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0; padding: 20px; margin-bottom: 24px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 12px; font-size: 14px;">
              <span style="color: #64748b;">Invoice Number:</span>
              <span style="font-weight: 600; color: #0f172a;">#${order.id.slice(-8).toUpperCase()}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 12px; font-size: 14px;">
              <span style="color: #64748b;">Estimated Delivery:</span>
              <span style="font-weight: 600; color: #0f172a;">${deliveryText} (${order.deliveryType})</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 12px; font-size: 14px;">
              <span style="color: #64748b;">Items Count:</span>
              <span style="font-weight: 600; color: #0f172a;">${order.items.reduce((acc, i) => acc + i.quantity, 0)} units</span>
            </div>
            <div style="border-top: 1px dashed #cbd5e1; padding-top: 12px; margin-top: 12px; display: flex; justify-content: space-between; font-size: 18px;">
              <span style="font-weight: 700; color: #0f172a;">Total Amount Due:</span>
              <span style="font-weight: 800; color: #16a34a;">${formattedTotal}</span>
            </div>
          </div>

          <div style="text-align: center; margin: 32px 0;">
            <a href="${payUrl}" style="background-color: #0f172a; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
              View & Pay Invoice Online
            </a>
            <p style="font-size: 12px; color: #94a3b8; margin-top: 10px;">
              Direct Link: <a href="${payUrl}" style="color: #3b82f6;">${payUrl}</a>
            </p>
          </div>

          ${order.terms ? `
            <div style="margin-top: 24px; padding: 16px; background-color: #f1f5f9; border-radius: 6px; font-size: 13px; color: #475569;">
              <strong style="color: #1e293b; display: block; margin-bottom: 4px;">Terms & Conditions:</strong>
              ${order.terms}
            </div>
          ` : ""}

          <div style="margin-top: 32px; border-top: 1px solid #e2e8f0; padding-top: 16px; font-size: 12px; color: #94a3b8; text-align: center;">
            Product Brands LLC • Questions? Reach us at <a href="mailto:info@productbrands.com" style="color: #64748b;">info@productbrands.com</a> or +1 786-295-4063.
          </div>
        </div>
      `,
    })

    // Update status to SENT if it was DRAFT
    if (order.status === "DRAFT") {
      await prisma.customerOrder.update({
        where: { id: order.id },
        data: { status: "SENT" },
      })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("[CUSTOMER_ORDER_SEND_EMAIL_ERROR]", error)
    return NextResponse.json(
      { error: error?.message || "Failed to send invoice email" },
      { status: 500 }
    )
  }
}
