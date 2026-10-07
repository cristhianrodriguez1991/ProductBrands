import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { PERMISSIONS, hasEffectivePermission } from "@/lib/permissions"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    const userRole = (session?.user as any)?.role
    const customPermissions = (session?.user as any)?.customPermissions || []

    if (!session || !hasEffectivePermission(userRole, customPermissions, PERMISSIONS.ORDERS)) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const orders = await prisma.customerOrder.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        items: true
      }
    })

    return NextResponse.json(orders)
  } catch (error) {
    console.error("[CUSTOMER_ORDERS_GET]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    const userRole = (session?.user as any)?.role
    const customPermissions = (session?.user as any)?.customPermissions || []

    if (!session || !hasEffectivePermission(userRole, customPermissions, PERMISSIONS.ORDERS)) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const body = await req.json()
    const { 
      customerName, 
      customerEmail, 
      customerPhone,
      companyName,
      deliveryDate,
      deliveryType,
      shippingCost,
      terms,
      notes,
      items
    } = body

    if (!customerName || !customerEmail || !items || !items.length) {
      return new NextResponse("Missing required fields", { status: 400 })
    }

    // Calculate subtotal and total
    let subtotal = 0
    const processedItems = items.map((item: any) => {
      const qty = parseInt(item.quantity) || 1
      const price = parseFloat(item.unitPrice) || 0
      const total = qty * price
      subtotal += total
      return {
        productName: item.productName,
        imageUrl: item.imageUrl,
        quantity: qty,
        unitPrice: price,
        totalPrice: total
      }
    })

    const parsedShippingCost = parseFloat(shippingCost) || 0
    const totalAmount = subtotal + parsedShippingCost

    const order = await prisma.customerOrder.create({
      data: {
        customerName,
        customerEmail,
        customerPhone,
        companyName,
        deliveryDate: deliveryDate ? new Date(deliveryDate) : null,
        deliveryType,
        shippingCost: parsedShippingCost,
        terms,
        notes,
        subtotal,
        totalAmount,
        status: "DRAFT",
        items: {
          create: processedItems
        }
      },
      include: {
        items: true
      }
    })

    return NextResponse.json(order)
  } catch (error) {
    console.error("[CUSTOMER_ORDERS_POST]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}
