import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { uploadFile } from "@/lib/storage"

// Add new attachments to an existing master batch
export async function POST(
  req: Request,
  { params }: { params: { id: string; masterBatchId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session.user as any)?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const formData = await req.formData()
    const fileEntries = formData.getAll("files")
    const labelEntries = formData.getAll("labels") as string[]
    const created = []

    for (let i = 0; i < fileEntries.length; i++) {
      const entry = fileEntries[i]
      if (!(entry instanceof File) || entry.size === 0) continue
      try {
        const { url } = await uploadFile(entry, "mixed-pallets")
        const att = await prisma.masterBatchAttachment.create({
          data: {
            masterBatchId: params.masterBatchId,
            fileName: entry.name,
            fileUrl: url,
            fileSize: entry.size,
            mimeType: entry.type,
            label: labelEntries[i] || "Shared Document",
          },
        })
        created.push(att)
      } catch (uploadErr) {
        console.warn(`[MasterBatchAttachment POST] File upload skipped:`, uploadErr)
      }
    }

    return NextResponse.json(created)
  } catch (error) {
    console.error("[MasterBatchAttachment POST]", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
