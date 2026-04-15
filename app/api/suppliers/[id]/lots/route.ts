import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { uploadFile } from "@/lib/storage"
import { z } from "zod"

const batchLotSchema = z.object({
  lotNumber: z.string().min(1, "Lot number is required"),
  productName: z.string().min(1, "Product name is required"),
  productSku: z.string().optional(),
  category: z.string().optional(),
  quantityReceived: z.string().optional(),
  quantityUnit: z.string().optional(),
  manufacturedAt: z.string().optional(),
  expiresAt: z.string().optional(),
  receivedAt: z.string().optional(),
  status: z.enum(["INCOMING", "RECEIVED", "IN_QC", "APPROVED", "ON_HOLD", "RECALLED", "DISPOSED"]).optional(),
  internalNotes: z.string().optional(),
  qcNotes: z.string().optional(),
  unitCost: z.string().optional(),
  totalCost: z.string().optional(),
  invoiceNumber: z.string().optional(),
  poNumber: z.string().optional(),
})

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session.user as any)?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Verify supplier exists
    const supplier = await prisma.supplier.findUnique({ where: { id: params.id } })
    if (!supplier) {
      return NextResponse.json({ error: "Supplier not found" }, { status: 404 })
    }

    const formData = await req.formData()

    // Extract and validate text fields
    const rawData: Record<string, string> = {}
    for (const [key, value] of formData.entries()) {
      if (typeof value === "string") rawData[key] = value
    }

    const data = batchLotSchema.parse(rawData)

    // Parse numeric fields leniently — accept any text, store number if parseable
    const parseNum = (v?: string) => {
      if (!v || v.trim() === "") return null
      const n = parseFloat(v.replace(/[^0-9.-]/g, ""))
      return isNaN(n) ? null : n
    }

    // Create the batch lot
    const batchLot = await prisma.batchLot.create({
      data: {
        supplierId: params.id,
        lotNumber: data.lotNumber,
        productName: data.productName,
        productSku: data.productSku || null,
        category: data.category || null,
        quantityReceived: parseNum(data.quantityReceived) ?? null,
        quantityUnit: data.quantityUnit || null,
        manufacturedAt: data.manufacturedAt ? new Date(data.manufacturedAt) : null,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
        receivedAt: data.receivedAt ? new Date(data.receivedAt) : new Date(),
        status: (data.status as any) ?? "INCOMING",
        internalNotes: data.internalNotes || null,
        qcNotes: data.qcNotes || null,
        unitCost: parseNum(data.unitCost) ?? null,
        totalCost: parseNum(data.totalCost) ?? null,
        invoiceNumber: data.invoiceNumber || null,
        poNumber: data.poNumber || null,
      },
    })

    // Handle file uploads — each file is independent, failures don't abort the lot
    const fileEntries = formData.getAll("files")
    const labelEntries = formData.getAll("labels") as string[]

    for (let i = 0; i < fileEntries.length; i++) {
      const entry = fileEntries[i]
      // Only process actual File objects with content
      if (!(entry instanceof File) || entry.size === 0 || entry.name === "") continue
      try {
        const { url } = await uploadFile(entry, "batch-lots")
        await prisma.batchLotAttachment.create({
          data: {
            batchLotId: batchLot.id,
            fileName: entry.name,
            fileUrl: url,
            fileSize: entry.size,
            mimeType: entry.type,
            label: labelEntries[i] || "Other",
          },
        })
      } catch (uploadErr) {
        // Log but don't fail the whole request over one attachment
        console.warn(`[BatchLot] File upload skipped for "${entry.name}":`, uploadErr)
      }
    }

    const result = await prisma.batchLot.findUnique({
      where: { id: batchLot.id },
      include: { attachments: true },
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0]?.message }, { status: 400 })
    }
    const msg = error instanceof Error ? error.message : String(error)
    console.error("[BatchLot POST]", msg, error)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
