import { NextRequest, NextResponse } from "next/server"
import { requireWriteAccess } from "@/lib/rbac"
import { prisma } from "@/lib/prisma"

// GET /api/admin/clients - List all clients
export async function GET(req: NextRequest) {
  try {
    const auth = await requireWriteAccess(req)
    if (auth instanceof NextResponse) return auth

    const companies = await prisma.company.findMany({
      include: {
        contacts: {
          where: { isPrimary: true },
          take: 1,
        },
        _count: {
          select: {
            quotes: true,
            orders: true,
            users: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json({ companies })
  } catch (error: any) {
    console.error("Error fetching clients:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch clients" },
      { status: 500 }
    )
  }
}
