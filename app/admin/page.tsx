import { requireAdminSession } from "@/lib/rbac"
import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { QuoteStatus } from "@prisma/client"
import { formatDate } from "@/lib/utils"

export default async function AdminDashboard() {
  await requireAdminSession()

  const now = new Date()
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  // KPIs
  const [
    quotesNew,
    quotesNeedsInfo,
    quotesPricing,
    quotesApprovedThisWeek,
    ordersInProduction,
    recentActivity,
  ] = await Promise.all([
    prisma.quote.count({ where: { status: "NEW" } }),
    prisma.quote.count({ where: { status: "NEEDS_INFO" } }),
    prisma.quote.count({ where: { status: "PRICING" } }),
    prisma.quote.count({
      where: {
        status: "APPROVED",
        updatedAt: { gte: weekAgo },
      },
    }),
    prisma.order.count({
      where: { status: "IN_PRODUCTION" },
    }),
    prisma.auditLog.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      include: {
        actor: {
          select: { id: true, name: true, email: true },
        },
      },
    }),
  ])

  const recentQuotes = await prisma.quote.findMany({
    take: 5,
    orderBy: { createdAt: "desc" },
    include: {
      company: true,
      contact: true,
    },
  })

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
        <p className="text-muted-foreground">Overview of system activity</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">New Quotes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{quotesNew}</div>
            <Link href="/admin/quotes?status=NEW">
              <Button variant="link" className="p-0 h-auto text-xs mt-1">
                View all →
              </Button>
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Needs Info</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{quotesNeedsInfo}</div>
            <Link href="/admin/quotes?status=NEEDS_INFO">
              <Button variant="link" className="p-0 h-auto text-xs mt-1">
                View all →
              </Button>
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">In Pricing</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{quotesPricing}</div>
            <Link href="/admin/quotes?status=PRICING">
              <Button variant="link" className="p-0 h-auto text-xs mt-1">
                View all →
              </Button>
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Approved (Week)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{quotesApprovedThisWeek}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">In Production</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{ordersInProduction}</div>
            <Link href="/admin/orders?status=IN_PRODUCTION">
              <Button variant="link" className="p-0 h-auto text-xs mt-1">
                View all →
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Recent Quotes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentQuotes.map((quote) => (
                <Link
                  key={quote.id}
                  href={`/admin/quotes/${quote.id}`}
                  className="block p-3 rounded-lg hover:bg-muted transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{quote.quoteNumber || `#${quote.id.slice(-8)}`}</p>
                      <p className="text-sm text-muted-foreground">
                        {quote.company.name}
                        {quote.contact && ` • ${quote.contact.name}`}
                      </p>
                    </div>
                    <span className="text-sm capitalize px-2 py-1 rounded bg-muted">
                      {quote.status.toLowerCase().replace("_", " ")}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.map((log) => (
                <div key={log.id} className="text-sm">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium">
                      {log.actor?.name || log.actor?.email || "System"}
                    </span>
                    <span className="text-muted-foreground text-xs">
                      {formatDate(log.createdAt)}
                    </span>
                  </div>
                  <p className="text-muted-foreground">
                    <span className="font-semibold">{log.action}</span> on {log.entityType}
                    {log.entityId && ` (${log.entityId.slice(-8)})`}
                  </p>
                </div>
              ))}
              {recentActivity.length === 0 && (
                <p className="text-sm text-muted-foreground">No recent activity</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

