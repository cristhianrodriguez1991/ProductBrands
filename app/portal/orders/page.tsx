import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatDate, formatCurrency } from "@/lib/utils"

export default async function OrdersPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")

  const userId = (session.user as any).id
  const isAdmin = (session.user as any).role === "ADMIN"

  const orders = await prisma.order.findMany({
    where: isAdmin ? {} : { createdById: userId },
    orderBy: { createdAt: "desc" },
    include: { company: true, items: true },
  })

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      PENDING_DEPOSIT: "bg-yellow-500",
      IN_PRODUCTION: "bg-blue-500",
      QA: "bg-purple-500",
      READY_TO_SHIP: "bg-green-500",
      SHIPPED: "bg-teal-500",
      DELIVERED: "bg-green-600",
      CANCELLED: "bg-red-500",
    }
    return colors[status] || "bg-gray-500"
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Orders</h1>
        <p className="text-muted-foreground">Track your orders</p>
      </div>

      {orders.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No orders yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <Card key={order.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Order #{order.id.slice(-8)}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      {formatDate(order.createdAt)} • {order.items.length} item(s)
                    </p>
                  </div>
                  <Badge className={getStatusColor(order.status)}>
                    {order.status.replace("_", " ")}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total</p>
                    <p className="text-lg font-bold">{formatCurrency(order.total)}</p>
                  </div>
                  <Link href={`/portal/orders/${order.id}`}>
                    <Button variant="outline" size="sm">
                      View Details
                    </Button>
                  </Link>
                </div>
                {order.trackingNumber && (
                  <p className="text-sm text-muted-foreground mt-2">
                    Tracking: {order.trackingNumber}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

