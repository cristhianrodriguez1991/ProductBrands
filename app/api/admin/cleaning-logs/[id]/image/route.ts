import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { put } from "@vercel/blob"

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session.user as any)?.role !== "ADMIN") {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const { id } = params
    const formData = await req.formData()
    const file = formData.get("file") as File

    if (!file) {
      return new NextResponse("No file provided", { status: 400 })
    }

    const blob = await put(file.name, file, {
      access: "public",
    })

    const log = await prisma.cleaningLog.update({
      where: { id },
      data: {
        imageUrls: {
          push: blob.url
        }
      },
    })

    return NextResponse.json(log)
  } catch (error) {
    console.error("[CLEANING_LOG_IMAGE_POST]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}
