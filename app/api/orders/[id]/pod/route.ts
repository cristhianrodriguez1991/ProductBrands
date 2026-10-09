import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const order = await prisma.customerOrder.findUnique({
      where: { id: params.id },
      include: {
        items: true,
      },
    })

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    return NextResponse.json({ order })
  } catch (error: any) {
    console.error("[POD_GET_ERROR]", error)
    return NextResponse.json(
      { error: error?.message || "Failed to retrieve order" },
      { status: 500 }
    )
  }
}

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json().catch(() => ({}))
    const {
      signatureDataUrl,
      signedByName,
      noSignatureRequired,
      deliveryPhotos,
      deliveryNotes,
      deliveredAt,
      status,
    } = body

    const existing = await prisma.customerOrder.findUnique({
      where: { id: params.id },
    })

    if (!existing) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    const now = new Date()
    const updateData: any = {
      deliveredAt: deliveredAt ? new Date(deliveredAt) : (existing.deliveredAt || now),
      noSignatureRequired: Boolean(noSignatureRequired),
      updatedAt: now,
    }

    if (deliveryPhotos && Array.isArray(deliveryPhotos)) {
      updateData.deliveryPhotos = deliveryPhotos
    }

    if (deliveryNotes !== undefined) {
      updateData.deliveryNotes = deliveryNotes
    }

    if (signatureDataUrl) {
      updateData.signatureDataUrl = signatureDataUrl
      updateData.signedAt = now
      if (signedByName) {
        updateData.signedByName = signedByName
      }
    }

    // Determine status: "DELIVERED" or "COMPLETED"
    if (status) {
      updateData.status = status
      if (status === "COMPLETED") {
        updateData.completedAt = now
      }
    } else {
      // Default to DELIVERED unless it's already COMPLETED
      updateData.status = existing.status === "COMPLETED" ? "COMPLETED" : "DELIVERED"
      if (updateData.status === "COMPLETED") {
        updateData.completedAt = existing.completedAt || now
      }
    }

    const updated = await prisma.customerOrder.update({
      where: { id: params.id },
      data: updateData,
      include: {
        items: true,
      },
    })

    return NextResponse.json({ success: true, order: updated })
  } catch (error: any) {
    console.error("[POD_SUBMIT_ERROR]", error)
    return NextResponse.json(
      { error: error?.message || "Failed to save delivery confirmation" },
      { status: 500 }
    )
  }
}
