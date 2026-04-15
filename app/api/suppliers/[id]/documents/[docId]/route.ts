import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { deleteFile } from "@/lib/storage"

// DELETE — remove a single document
export async function DELETE(
  req: Request,
  { params }: { params: { id: string; docId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session.user as any)?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const doc = await prisma.clientDocument.findUnique({ where: { id: params.docId } })
    if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 })

    // Best-effort file deletion (may not exist if stored as base64)
    if (doc.fileUrl && !doc.fileUrl.startsWith("data:")) {
      try { await deleteFile(doc.fileUrl) } catch {}
    }

    await prisma.clientDocument.delete({ where: { id: params.docId } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[ClientDocument DELETE]", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// PATCH — rename a document
export async function PATCH(
  req: Request,
  { params }: { params: { id: string; docId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session.user as any)?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const { name } = await req.json()
    const doc = await prisma.clientDocument.update({
      where: { id: params.docId },
      data: { name },
    })
    return NextResponse.json(doc)
  } catch (error) {
    console.error("[ClientDocument PATCH]", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
