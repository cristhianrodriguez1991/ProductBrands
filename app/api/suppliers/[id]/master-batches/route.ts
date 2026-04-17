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

    // Create the child BatchLots and handle individual files
    const createdLots = [];
    for (let idx = 0; idx < items.length; idx++) {
      const item = items[idx];
      const batchLot = await prisma.batchLot.create({
        data: {
          supplierId: params.id,
          masterBatchId: masterBatch.id,
          lotNumber: item.lotNumber,
          productName: item.productName,
          productSku: item.productSku,
          category: item.category,
          quantityReceived: item.quantityReceived ? parseInt(item.quantityReceived || "0") : null,
          quantityUnit: item.quantityUnit || "units",
          status: "RECEIVED",
          receivedAt,
          expiresAt: item.expiresAt ? new Date(item.expiresAt) : null,
          invoiceNumber,
          poNumber,
        }
      });
      createdLots.push(batchLot);

      // Handle individual files for this specific item
      const individualFiles = formData.getAll(`item_${idx}_file`);
      for (const entry of individualFiles) {
        if (!(entry instanceof File) || entry.size === 0) continue;
        try {
          const { url } = await uploadFile(entry, "suppliers-batches");
          await prisma.batchLotAttachment.create({
            data: {
              batchLotId: batchLot.id,
              fileName: entry.name,
              fileUrl: url,
              fileSize: entry.size,
              mimeType: entry.type,
              label: "Individual Product Note",
            },
          });
        } catch (uploadErr) {
          console.warn(`[MasterBatch POST] Individual file upload skipped for item ${idx}:`, uploadErr);
        }
      }
    }

    // Shared files (All items in this master delivery)
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
        console.warn(`[MasterBatch POST] Shared file upload skipped:`, uploadErr)
      }
    }

    return NextResponse.json({ masterBatch, batchLots: createdLots })
  } catch (error) {
    console.error("[MasterBatch POST]", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
