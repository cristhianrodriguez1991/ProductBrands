import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCardSurchargePercent } from "@/lib/invoice"
import { refreshProcessingOrder } from "@/lib/customer-order-payments"

export const dynamic = "force-dynamic"

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const idOrNum = params.id
    let order = await prisma.customerOrder.findUnique({
      where: {
        id: idOrNum,
      },
      include: {
        items: true,
      },
    })

    if (!order && /^PB\d+$/i.test(idOrNum)) {
      const invNum = parseInt(idOrNum.replace(/^PB/i, ""), 10) - 3000
      if (invNum > 0) {
        order = await prisma.customerOrder.findUnique({
          where: { invoiceNumber: invNum },
          include: { items: true },
        })
      }
    }

    if (!order) {
      return new NextResponse("Order not found", { status: 404 })
    }

    // Keep ACH payments that are still clearing up to date
    const refreshed = await refreshProcessingOrder(order)
    if (refreshed) order = refreshed

    // Company profile info
    const companyInfo = {
      name: process.env.COMPANY_NAME || "Product Brands",
      address: process.env.COMPANY_ADDRESS || "8001 NW 54th St, Doral FL, 33166",
      phone: "+1 305-600-3157",
      email: process.env.CONTACT_EMAIL || "info@productbrands.com",
      logoUrl: "/images/logo.png",
    }

    // Publishable key is read at runtime so it can be set without a code change
    const paymentConfig = {
      publishableKey:
        process.env.STRIPE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || null,
      cardSurchargePercent: getCardSurchargePercent(),
    }

    return NextResponse.json({
      order,
      companyInfo,
      paymentConfig,
    })
  } catch (error) {
    console.error("[PUBLIC_ORDER_GET]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}
