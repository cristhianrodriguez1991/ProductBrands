import { NextRequest, NextResponse } from "next/server"
import { uploadFile } from "@/lib/storage"

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get("file") as File
    
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    const { url } = await uploadFile(file, "product-logos")

    return NextResponse.json({ url })
  } catch (error: any) {
    console.error("Upload error:", error)
    return NextResponse.json({ error: error.message || "Failed to upload file" }, { status: 500 })
  }
}
