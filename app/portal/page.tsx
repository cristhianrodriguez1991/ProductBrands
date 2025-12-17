import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FileText, Package, MessageSquare, Receipt } from "lucide-react"
import { formatCurrency, formatDate } from "@/lib/utils"

export default async function PortalDashboard() {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")

  const userId = (session.user as any).id
  const isAdmin = (session.user as any).role === "ADMIN"

  const [quotes, orders, messages, invoices] = await Promise.all([
    prisma.quote.findMany({
      where: isAdmin ? {} : { createdById: userId },
      take: 5,
      orderBy: { createdAt: "desc" },
      include: { company: true },
    }),
    prisma.order.findMany({
      where: isAdmin ? {} : { createdById: userId },
      take: 5,
      orderBy: { createdAt: "desc" },
      include: { company: true },
    }),
    prisma.message.findMany({
      where: isAdmin ? {} : { userId },
      take: 5,
      orderBy: { createdAt: "desc" },
    }),
    prisma.invoice.findMany({
      where: isAdmin ? {} : { createdById: userId },
      take: 5,
      orderBy: { createdAt: "desc" },
      include: { company: true },
    }),
  ])

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back, {session.user?.name || session.user?.email}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Quotes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{quotes.length}</div>
            <p className="text-xs text-muted-foreground">Recent quotes</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{orders.length}</div>
            <p className="text-xs text-muted-foreground">Recent orders</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Messages</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{messages.length}</div>
            <p className="text-xs text-muted-foreground">Unread messages</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Invoices</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{invoices.length}</div>
            <p className="text-xs text-muted-foreground">Recent invoices</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Recent Quotes</CardTitle>
              <Link href="/portal/quotes">
                <Button variant="ghost" size="sm">
                  View All
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {quotes.length === 0 ? (
              <p className="text-sm text-muted-foreground">No quotes yet</p>
            ) : (
              <div className="space-y-4">
                {quotes.map((quote) => (
                  <div key={quote.id} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">#{quote.id.slice(-8)}</p>
                      <p className="text-sm text-muted-foreground">
                        {quote.productCategory || "N/A"} • {formatDate(quote.createdAt)}
                      </p>
                    </div>
                    <span className="text-sm capitalize">{quote.status.toLowerCase().replace("_", " ")}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Recent Orders</CardTitle>
              <Link href="/portal/orders">
                <Button variant="ghost" size="sm">
                  View All
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {orders.length === 0 ? (
              <p className="text-sm text-muted-foreground">No orders yet</p>
            ) : (
              <div className="space-y-4">
                {orders.map((order) => (
                  <div key={order.id} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">#{order.id.slice(-8)}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatCurrency(order.total)} • {formatDate(order.createdAt)}
                      </p>
                    </div>
                    <span className="text-sm capitalize">{order.status.toLowerCase().replace("_", " ")}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

