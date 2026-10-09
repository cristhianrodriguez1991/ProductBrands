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

    if (!customerName || (!customerEmail && !customerPhone) || !items || !items.length) {
      return new NextResponse("Missing required fields (Customer Name, Email or Phone, and Items)", { status: 400 })
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
        sku: item.sku || null,
        weight: item.weight || null,
        description: item.description || null,
        imageUrl: item.imageUrl || null,
        quantity: qty,
        unitPrice: price,
        totalPrice: total
      }
    })

    // Also auto-save/update any items marked as savePreset into InvoiceProductPreset
    for (const item of items) {
      if (item.savePreset && item.productName) {
        try {
          const existing = await prisma.invoiceProductPreset.findFirst({
            where: {
              OR: [
                { name: { equals: item.productName, mode: "insensitive" as const } },
                ...(item.sku ? [{ sku: { equals: item.sku, mode: "insensitive" as const } }] : [])
              ]
            }
          })
          if (existing) {
            await prisma.invoiceProductPreset.update({
              where: { id: existing.id },
              data: {
                sku: item.sku || existing.sku,
                weight: item.weight || existing.weight,
                description: item.description || existing.description,
                unitPrice: parseFloat(item.unitPrice) || existing.unitPrice,
                imageUrl: item.imageUrl || existing.imageUrl,
              }
            })
          } else {
            await prisma.invoiceProductPreset.create({
              data: {
                name: item.productName,
                sku: item.sku || null,
                weight: item.weight || null,
                description: item.description || null,
                unitPrice: parseFloat(item.unitPrice) || 0,
                imageUrl: item.imageUrl || null,
              }
            })
          }
        } catch (presetErr) {
          console.error("Failed to auto-save preset:", presetErr)
        }
      }
    }

    const parsedShippingCost = parseFloat(shippingCost) || 0
    const totalAmount = subtotal + parsedShippingCost

    const order = await prisma.customerOrder.create({
      data: {
        customerName,
        customerEmail: customerEmail || "",
        customerPhone: customerPhone || null,
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
