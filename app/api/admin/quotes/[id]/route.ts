import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const updateQuoteSchema = z.object({
  status: z.string().optional(),
  adminNotes: z.string().optional(),
  totalEstimate: z.number().nullable().optional(),
  lineItems: z.array(z.any()).optional(),
})

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session.user as any)?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const data = updateQuoteSchema.parse(body)

    // Update quote
    const quote = await prisma.quote.update({
      where: { id: params.id },
      data: {
        status: data.status,
        adminNotes: data.adminNotes,
        totalEstimate: data.totalEstimate,
      },
    })

    // Update line items
    if (data.lineItems) {
      // Delete existing line items
      await prisma.quoteLineItem.deleteMany({
        where: { quoteId: params.id },
      })

      // Create new line items
      for (const item of data.lineItems) {
        if (!item.id?.startsWith("temp-")) {
          await prisma.quoteLineItem.create({
            data: {
              quoteId: params.id,
              description: item.description,
              quantity: item.quantity || null,
              unitPrice: item.unitPrice || null,
              totalPrice: item.totalPrice || null,
              notes: item.notes || null,
            },
          })
        }
      }
    }

    return NextResponse.json({ success: true, quote })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 }
      )
    }
    console.error("Quote update error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

