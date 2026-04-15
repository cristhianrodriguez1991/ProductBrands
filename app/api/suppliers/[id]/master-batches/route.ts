import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { uploadFile } from "@/lib/storage"

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session.user as any)?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const formData = await req.formData()
    
    // Master data
    const name = formData.get("name") as string
    const invoiceNumber = formData.get("invoiceNumber") as string
    const poNumber = formData.get("poNumber") as string
    const receivedAt = formData.get("receivedAt") ? new Date(formData.get("receivedAt") as string) : new Date()
    const notes = formData.get("notes") as string
    
    // Items (JSON string or multiple fields)
    const itemsJson = formData.get("items") as string
    const items = JSON.parse(itemsJson) as any[]

    // Create the Master Batch
    const masterBatch = await prisma.masterBatch.create({
      data: {
        supplierId: params.id,
        name,
        invoiceNumber,
        poNumber,
        receivedAt,
        notes,
      }
    })

    // Create the child BatchLots
    for (const item of items) {
      await prisma.batchLot.create({
        data: {
          supplierId: params.id,
          masterBatchId: masterBatch.id,
          lotNumber: item.lotNumber,
          productName: item.productName,
          productSku: item.productSku,
          category: item.category,
          quantityReceived: item.quantityReceived ? parseInt(item.quantityReceived) : null,
          quantityUnit: item.quantityUnit || "units",
          status: "RECEIVED",
          receivedAt,
          invoiceNumber,
          poNumber,
        }
      })
    }

    // Shared files
    const fileEntries = formData.getAll("files")
    const labelEntries = formData.getAll("labels") as string[]

    for (let i = 0; i < fileEntries.length; i++) {
      const entry = fileEntries[i]
      if (!(entry instanceof File) || entry.size === 0) continue
      try {
        const { url } = await uploadFile(entry, "mixed-pallets")
        await prisma.masterBatchAttachment.create({
          data: {
            masterBatchId: masterBatch.id,
            fileName: entry.name,
            fileUrl: url,
            fileSize: entry.size,
            mimeType: entry.type,
            label: labelEntries[i] || "Shared Document",
          },
        })
      } catch (uploadErr) {
        console.warn(`[MasterBatch POST] File upload skipped:`, uploadErr)
      }
    }

    return NextResponse.json(masterBatch)
  } catch (error) {
    console.error("[MasterBatch POST]", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
