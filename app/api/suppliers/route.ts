import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const supplierSchema = z.object({
  name: z.string().min(1, "Name is required"),
  contactName: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  website: z.string().optional(),
  notes: z.string().optional(),
  category: z.enum(["SUPPLIER", "PRIVATE_LABEL"]).default("SUPPLIER"),
})

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session.user as any)?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const suppliers = await prisma.supplier.findMany({
      orderBy: { name: "asc" },
      include: {
        _count: { select: { batchLots: true } },
        batchLots: {
          select: {
            id: true,
            lotNumber: true,
            productName: true,
            productSku: true,
            category: true,
            invoiceNumber: true,
            poNumber: true,
            status: true,
            receivedAt: true,
          },
          orderBy: { receivedAt: "desc" },
        },
      },
    })

    return NextResponse.json(suppliers)
  } catch (error) {
    console.error("[Suppliers GET]", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session.user as any)?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const data = supplierSchema.parse(body)

    const supplier = await prisma.supplier.create({
      data: {
        name: data.name,
        contactName: data.contactName || null,
        email: data.email || null,
        phone: data.phone || null,
        address: data.address || null,
        city: data.city || null,
        state: data.state || null,
        country: data.country || null,
        website: data.website || null,
        notes: data.notes || null,
        category: data.category,
      },
    })

    return NextResponse.json(supplier, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0]?.message }, { status: 400 })
    }
    console.error("[Suppliers POST]", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
