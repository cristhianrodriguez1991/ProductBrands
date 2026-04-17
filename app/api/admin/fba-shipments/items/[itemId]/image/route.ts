import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { uploadFile } from "@/lib/storage"

export async function POST(
  req: Request,
  { params }: { params: { itemId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session.user as any)?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const formData = await req.formData()
    const file = formData.get("file") as File
    
    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 })
    }

    const { url } = await uploadFile(file, "fba-shipments")
    
    // We update imageUrls with { push: url } so we support infinite photos
    // We also set imageUrl for backwards compatibility if needed
    const updatedItem = await prisma.fbaShipmentItem.update({
      where: { id: params.itemId },
      data: { 
        imageUrl: url,
        imageUrls: { push: url }
      }
    })

    return NextResponse.json(updatedItem)
  } catch (error) {
    console.error("[FBA_ITEM_IMAGE_POST]", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
