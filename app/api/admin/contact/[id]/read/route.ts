import { NextRequest, NextResponse } from "next/server"
import { requireWriteAccess } from "@/lib/rbac"
import { prisma } from "@/lib/prisma"

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireWriteAccess(req)
    if (auth instanceof NextResponse) return auth

    const sub = await prisma.contactSubmission.findUnique({
      where: { id: params.id },
    })
    if (!sub) {
      return NextResponse.json(
        { error: "Contact submission not found" },
        { status: 404 }
      )
    }

    await prisma.contactSubmission.update({
      where: { id: params.id },
      data: { read: true },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Error marking contact as read:", error)
    return NextResponse.json(
      { error: error.message || "Failed to update" },
      { status: 500 }
    )
  }
}
