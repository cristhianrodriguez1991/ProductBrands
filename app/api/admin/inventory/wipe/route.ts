import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export async function DELETE() {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any)?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    await prisma.inventoryItem.deleteMany({})
    
    return NextResponse.json({
      success: true,
      message: "All inventory has been deleted.",
    })
  } catch (error: any) {
    console.error("Wipe inventory error:", error)
    return NextResponse.json(
      { error: "Failed to delete inventory: " + (error?.message || "Unknown error") },
      { status: 500 }
    )
  }
}
