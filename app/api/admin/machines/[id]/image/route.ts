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

    const { searchParams } = new URL(req.url)
    const type = searchParams.get("type") // productImageUrl, weightingImageUrl, etc.

    if (!type) {
      return NextResponse.json({ error: "Type is required" }, { status: 400 })
    }

    const formData = await req.formData()
    const file = formData.get("file") as File
    
    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 })
    }

    const { url } = await uploadFile(file, "machine-setups")
    
    let updated;
    if (type === "dynamic") {
      updated = await prisma.machineSetup.update({
        where: { id: params.id },
        data: { imageUrls: { push: url } }
      })
    } else {
      updated = await prisma.machineSetup.update({
        where: { id: params.id },
        data: { [type]: url }
      })
    }

    return NextResponse.json(updated)
  } catch (error) {
    console.error("[MACHINE_IMAGE_POST]", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
