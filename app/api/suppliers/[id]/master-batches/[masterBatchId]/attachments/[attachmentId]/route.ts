import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function DELETE(
  req: Request,
  { params }: { params: { id: string; masterBatchId: string; attachmentId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session.user as any)?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await prisma.masterBatchAttachment.delete({
      where: { id: params.attachmentId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[MasterBatchAttachment DELETE]", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
