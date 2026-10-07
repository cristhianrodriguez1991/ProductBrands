import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const order = await prisma.customerOrder.findUnique({
      where: { id: params.id },
      include: {
        items: true,
      },
    })

    if (!order) {
      return new NextResponse("Order not found", { status: 404 })
    }

    // Company profile info
    const companyInfo = {
      name: process.env.COMPANY_NAME || "Product Brands",
      address: process.env.COMPANY_ADDRESS || "8001 NW 54th St, Doral FL, 33166",
      phone: process.env.COMPANY_PHONE || "+1 786-295-4063",
      email: process.env.CONTACT_EMAIL || "info@productbrands.com",
      logoUrl: "/images/logo.png",
    }

    return NextResponse.json({
      order,
      companyInfo,
    })
  } catch (error) {
    console.error("[PUBLIC_ORDER_GET]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}
