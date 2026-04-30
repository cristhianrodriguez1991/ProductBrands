import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { uploadFile } from "@/lib/storage"

export async function PATCH(
  req: Request,
  { params }: { params: { id: string; lotId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session.user as any)?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const contentType = req.headers.get("content-type") || ""
    let updateData: any = {}

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData()
      const rawData: Record<string, any> = {}

      for (const [key, value] of formData.entries()) {
        if (key === "files" || key === "labels") continue
        rawData[key] = value
      }

      // Parse numeric fields leniently
      const parseNum = (v?: any) => {
        if (v === null || v === undefined || String(v).trim() === "") return null
        const n = parseFloat(String(v).replace(/[^0-9.-]/g, ""))
        return isNaN(n) ? null : n
      }

      updateData = {
        ...rawData,
        quantityReceived: rawData.quantityReceived !== undefined ? parseNum(rawData.quantityReceived) : undefined,
        unitCost: rawData.unitCost !== undefined ? parseNum(rawData.unitCost) : undefined,
        totalCost: rawData.totalCost !== undefined ? parseNum(rawData.totalCost) : undefined,
        manufacturedAt: rawData.manufacturedAt ? new Date(rawData.manufacturedAt) : undefined,
        expiresAt: rawData.expiresAt ? new Date(rawData.expiresAt) : undefined,
        receivedAt: rawData.receivedAt ? new Date(rawData.receivedAt) : undefined,
        approvedAt: rawData.status === "APPROVED" ? new Date() : undefined,
        updatedAt: new Date(),
      }

      // Handle file uploads
      const fileEntries = formData.getAll("files")
      const labelEntries = formData.getAll("labels") as string[]

      for (let i = 0; i < fileEntries.length; i++) {
        const entry = fileEntries[i]
        if (!(entry instanceof File) || entry.size === 0 || entry.name === "") continue
        try {
          const { url } = await uploadFile(entry, "batch-lots")
          await prisma.batchLotAttachment.create({
            data: {
              batchLotId: params.lotId,
              fileName: entry.name,
              fileUrl: url,
              fileSize: entry.size,
              mimeType: entry.type,
              label: labelEntries[i] || "Other",
            },
          })
        } catch (uploadErr) {
          console.warn(`[BatchLot PATCH] File upload skipped for "${entry.name}":`, uploadErr)
        }
      }
    } else {
      const body = await req.json()
      updateData = {
        ...body,
        approvedAt:
          body.status === "APPROVED" && !body.approvedAt
            ? new Date()
            : body.approvedAt,
        updatedAt: new Date(),
      }
    }

    // Filter out undefined values from updateData to avoid Prisma errors if fields were missing from form
    const cleanUpdateData = Object.fromEntries(
      Object.entries(updateData).filter(([_, v]) => v !== undefined)
    )

    const lot = await prisma.batchLot.update({
      where: { id: params.lotId },
      data: cleanUpdateData,
      include: { attachments: true },
    })

    return NextResponse.json(lot)
  } catch (error) {
    console.error("[BatchLot PATCH]", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string; lotId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session.user as any)?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await prisma.batchLot.delete({ where: { id: params.lotId } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[BatchLot DELETE]", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
