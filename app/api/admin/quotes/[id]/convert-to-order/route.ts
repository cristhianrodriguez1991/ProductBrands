import { NextRequest, NextResponse } from "next/server"
import { requireWriteAccess } from "@/lib/rbac"
import { prisma } from "@/lib/prisma"
import { quoteConvertToOrderSchema } from "@/lib/validations/admin"
import { logAudit } from "@/lib/audit"
import { generateOrderNumber } from "@/lib/admin-utils"

// POST /api/admin/quotes/[id]/convert-to-order - Convert approved quote to order
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireWriteAccess(req)
    if (auth instanceof NextResponse) return auth

    const quote = await prisma.quote.findUnique({
      where: { id: params.id },
      include: {
        company: true,
        lineItems: true,
      },
    })

    if (!quote) {
      return NextResponse.json(
        { error: "Quote not found" },
        { status: 404 }
      )
    }

    if (quote.status !== "APPROVED") {
      return NextResponse.json(
        { error: "Only approved quotes can be converted to orders" },
        { status: 400 }
      )
    }

    // Check if order already exists
    const existingOrder = await prisma.order.findUnique({
      where: { quoteId: params.id },
    })

    if (existingOrder) {
      return NextResponse.json(
        { error: "Order already exists for this quote" },
        { status: 400 }
      )
    }

    const body = await req.json()
    const data = quoteConvertToOrderSchema.parse(body)

    const orderNumber = data.orderNumber || (await generateOrderNumber())

    // Calculate totals from line items
    const subtotal = quote.lineItems.reduce(
      (sum, item) => sum + (item.lineTotal || item.unitPrice || 0) * (item.quantity || 0),
      0
    )
    const total = subtotal // Add tax/shipping later if needed

    // Create order
    const order = await prisma.order.create({
      data: {
        orderNumber,
        quoteId: params.id,
        companyId: quote.companyId,
        createdById: auth.userId,
        status: "PENDING_DEPOSIT" as any,
        subtotal,
        total,
        balanceDue: total,
        shippingAddress: data.shippingAddress || quote.company.address,
        shippingCity: data.shippingCity || quote.company.city,
        shippingState: data.shippingState || quote.company.state,
        shippingCountry: data.shippingCountry || quote.company.country,
        shippingPostalCode: data.shippingPostalCode || quote.company.postalCode,
        items: {
          create: quote.lineItems.map((item) => ({
            name: item.customTitle || item.description,
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice || 0,
            totalPrice: (item.unitPrice || 0) * item.quantity,
            packagingSpec: item.specs ? JSON.stringify(item.specs) : null,
          })),
        },
      },
      include: {
        company: true,
        items: true,
      },
    })

    // Update quote status to ORDERED
    await prisma.quote.update({
      where: { id: params.id },
      data: { status: "ORDERED" as any },
    })

    // Audit log
    await logAudit({
      actorUserId: auth.userId,
      action: "converted_to_order",
      entityType: "Quote",
      entityId: params.id,
      metadata: {
        orderId: order.id,
        orderNumber: order.orderNumber,
      },
      req,
    })

    await logAudit({
      actorUserId: auth.userId,
      action: "created",
      entityType: "Order",
      entityId: order.id,
      after: order,
      metadata: {
        quoteId: params.id,
      },
      req,
    })

    return NextResponse.json(order, { status: 201 })
  } catch (error: any) {
    console.error("Error converting quote to order:", error)
    if (error.name === "ZodError") {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: error.message || "Failed to convert quote to order" },
      { status: 500 }
    )
  }
}
