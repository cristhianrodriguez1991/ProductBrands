import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default async function AdminDashboard() {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any)?.role !== "ADMIN") {
    redirect("/login")
  }

  const [users, quotes, orders, invoices] = await Promise.all([
    prisma.user.count(),
    prisma.quote.count(),
    prisma.order.count(),
    prisma.invoice.count(),
  ])

  const recentQuotes = await prisma.quote.findMany({
    take: 5,
    orderBy: { createdAt: "desc" },
    include: { company: true },
  })

  const recentOrders = await prisma.order.findMany({
    take: 5,
    orderBy: { createdAt: "desc" },
    include: { company: true },
  })

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
        <p className="text-muted-foreground">Overview of system activity</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Total Quotes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{quotes}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{orders}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Total Invoices</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{invoices}</div>
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
                <div key={quote.id} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">#{quote.id.slice(-8)}</p>
                    <p className="text-sm text-muted-foreground">{quote.company.name}</p>
                  </div>
                  <span className="text-sm capitalize">{quote.status.toLowerCase().replace("_", " ")}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentOrders.map((order) => (
                <div key={order.id} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">#{order.id.slice(-8)}</p>
                    <p className="text-sm text-muted-foreground">{order.company.name}</p>
                  </div>
                  <span className="text-sm capitalize">{order.status.toLowerCase().replace("_", " ")}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

