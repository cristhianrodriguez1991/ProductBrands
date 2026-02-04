import { NextRequest, NextResponse } from "next/server"
import { requireWriteAccess } from "@/lib/rbac"
import { prisma } from "@/lib/prisma"
import { quoteListQuerySchema } from "@/lib/validations/admin"

// GET /api/admin/quotes - List all quotes with filters
export async function GET(req: NextRequest) {
  try {
    const auth = await requireWriteAccess(req)
    if (auth instanceof NextResponse) return auth

    const { searchParams } = new URL(req.url)
    const query = quoteListQuerySchema.parse({
      status: searchParams.get("status"),
      search: searchParams.get("search"),
      companyId: searchParams.get("companyId"),
      page: searchParams.get("page"),
      limit: searchParams.get("limit"),
    })

    const where: any = {}
    if (query.status) where.status = query.status
    if (query.companyId) where.companyId = query.companyId
    if (query.search) {
      where.OR = [
        { quoteNumber: { contains: query.search, mode: "insensitive" } },
        { company: { name: { contains: query.search, mode: "insensitive" } } },
        { contact: { email: { contains: query.search, mode: "insensitive" } } },
        { contact: { name: { contains: query.search, mode: "insensitive" } } },
      ]
    }

    const [quotes, total] = await Promise.all([
      prisma.quote.findMany({
        where,
        include: {
          company: true,
          contact: true,
          createdBy: {
            select: { id: true, name: true, email: true },
          },
          lineItems: true,
          _count: {
            select: {
              quoteMessages: true,
              attachments: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      prisma.quote.count({ where }),
    ])

    return NextResponse.json({
      quotes,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    })
  } catch (error: any) {
    console.error("Error fetching quotes:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch quotes" },
      { status: 500 }
    )
  }
}
