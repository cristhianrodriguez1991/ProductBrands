import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { uploadFile } from "@/lib/storage"
import { sendEmail, getQuoteSubmittedEmail } from "@/lib/email"
import { z } from "zod"

const quoteSchema = z.object({
  productCategory: z.string().optional(),
  customCategory: z.string().optional(),
  productDescription: z.string().min(1),
  targetCustomer: z.string().optional(),
  packagingType: z.string().optional(),
  labelingNeeds: z.string().optional(),
  estimatedQuantity: z.string().optional(),
  targetUnitCost: z.string().optional(),
  timeline: z.string().optional(),
  deadline: z.string().optional(),
  shippingDestination: z.string().optional(),
})

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const formData = await req.formData()
    const data: Record<string, string> = {}
    formData.forEach((value, key) => {
      if (key !== "files") {
        data[key] = value as string
      }
    })

    const validated = quoteSchema.parse(data)
    const userId = (session.user as any).id
    const companyId = (session.user as any).companyId

    if (!companyId) {
      return NextResponse.json({ error: "No company associated" }, { status: 400 })
    }

    // Parse labeling needs
    let labelingNeeds: string[] = []
    if (data.labelingNeeds) {
      try {
        labelingNeeds = JSON.parse(data.labelingNeeds)
      } catch {
        labelingNeeds = []
      }
    }

    // Create quote
    const quote = await prisma.quote.create({
      data: {
        companyId,
        createdById: userId,
        status: "SUBMITTED",
        productCategory: validated.productCategory || validated.customCategory || null,
        productDescription: validated.productDescription,
        targetCustomer: validated.targetCustomer || null,
        packagingType: validated.packagingType || null,
        labelingNeeds,
        estimatedQuantity: validated.estimatedQuantity || null,
        targetUnitCost: validated.targetUnitCost ? parseFloat(validated.targetUnitCost) : null,
        timeline: validated.timeline || null,
        deadline: validated.deadline ? new Date(validated.deadline) : null,
        shippingDestination: validated.shippingDestination || null,
      },
    })

    // Upload files
    const files = formData.getAll("files") as File[]
    for (const file of files) {
      if (file.size > 0) {
        const { url, key } = await uploadFile(file, "quotes")
        await prisma.quoteAttachment.create({
          data: {
            quoteId: quote.id,
            fileName: file.name,
            fileUrl: url,
            fileSize: file.size,
            mimeType: file.type,
          },
        })
      }
    }

    // Send email notification
    const company = await prisma.company.findUnique({ where: { id: companyId } })
    if (company) {
      const emailData = getQuoteSubmittedEmail(quote.id, company.name)
      await sendEmail({
        to: session.user?.email || "",
        ...emailData,
      })
    }

    return NextResponse.json({ success: true, quoteId: quote.id })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 }
      )
    }
    console.error("Quote creation error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

