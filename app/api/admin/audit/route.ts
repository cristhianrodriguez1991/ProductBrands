import { NextRequest, NextResponse } from "next/server"
import { requireAdminApi } from "@/lib/rbac"
import { prisma } from "@/lib/prisma"
import { auditLogQuerySchema } from "@/lib/validations/admin"

// GET /api/admin/audit - Get audit logs
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAdminApi(req)
    if (auth instanceof NextResponse) return auth

    const { searchParams } = new URL(req.url)
    const query = auditLogQuerySchema.parse({
      entityType: searchParams.get("entityType"),
      entityId: searchParams.get("entityId"),
      action: searchParams.get("action"),
      actorUserId: searchParams.get("actorUserId"),
      page: searchParams.get("page"),
      limit: searchParams.get("limit"),
    })

    const where: any = {}
    if (query.entityType) where.entityType = query.entityType
    if (query.entityId) where.entityId = query.entityId
    if (query.action) where.action = query.action
    if (query.actorUserId) where.actorUserId = query.actorUserId

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: {
          actor: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      prisma.auditLog.count({ where }),
    ])

    return NextResponse.json({
      logs,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    })
  } catch (error: any) {
    console.error("Error fetching audit logs:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch audit logs" },
      { status: 500 }
    )
  }
}
