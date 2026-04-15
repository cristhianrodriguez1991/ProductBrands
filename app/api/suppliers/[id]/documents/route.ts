import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { uploadFile } from "@/lib/storage"

// GET — list documents for a supplier / private label client
export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session.user as any)?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const docs = await prisma.clientDocument.findMany({
      where: { supplierId: params.id },
      orderBy: { uploadedAt: "desc" },
    })
    return NextResponse.json(docs)
  } catch (error) {
    console.error("[ClientDocuments GET]", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST — upload a new document
export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session.user as any)?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const formData = await req.formData()
    const name = (formData.get("name") as string) || "Document"
    const file = formData.get("file") as File | null

    if (!file || file.size === 0) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    let fileUrl = ""
    let mimeType = file.type || "application/octet-stream"
    let finalFileName = file.name

    try {
      // Handle HEIC conversion via storage util
      const result = await uploadFile(file, `client-docs/${params.id}`)
      fileUrl = result.url
    } catch (err) {
      console.error("[ClientDocuments] Upload failed:", err)
      return NextResponse.json({ error: "File upload failed" }, { status: 500 })
    }

    const doc = await prisma.clientDocument.create({
      data: {
        supplierId: params.id,
        name,
        fileUrl,
        fileName: finalFileName,
        fileSize: file.size,
        mimeType,
      },
    })

    return NextResponse.json(doc)
  } catch (error) {
    console.error("[ClientDocuments POST]", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
