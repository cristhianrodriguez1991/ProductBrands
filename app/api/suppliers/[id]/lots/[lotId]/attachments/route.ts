import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { uploadFile } from "@/lib/storage"

export async function POST(
  req: Request,
  { params }: { params: { id: string; lotId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session.user as any)?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const formData = await req.formData()
    const files = formData.getAll("files")
    const labels = formData.getAll("labels") as string[]

    const createdAttachments = []

    for (let i = 0; i < files.length; i++) {
      const entry = files[i]
      if (!(entry instanceof File) || entry.size === 0) continue
      try {
        const { url } = await uploadFile(entry, "suppliers-batches")
        const attachment = await prisma.batchLotAttachment.create({
          data: {
            batchLotId: params.lotId,
            fileName: entry.name,
            fileUrl: url,
            fileSize: entry.size,
            mimeType: entry.type,
            label: labels[i] || "Individual Product Note",
          },
        })
        createdAttachments.push(attachment)
      } catch (uploadErr) {
        console.warn(`[BatchLotAttachment POST] File upload skipped:`, uploadErr)
      }
    }

    return NextResponse.json({ attachments: createdAttachments })
  } catch (error) {
    console.error("[BatchLotAttachment POST ERROR]", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
