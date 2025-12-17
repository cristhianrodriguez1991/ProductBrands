import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatDate, formatCurrency } from "@/lib/utils"
import { ArrowLeft } from "lucide-react"

export default async function OrderDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")

  const userId = (session.user as any).id
  const isAdmin = (session.user as any).role === "ADMIN"

  const order = await prisma.order.findUnique({
    where: { id: params.id },
    include: {
      company: true,
      items: true,
      quote: true,
      messages: {
        include: { user: true },
        orderBy: { createdAt: "desc" },
      },
    },
  })

  if (!order) {
    return <div>Order not found</div>
  }

  if (!isAdmin && order.createdById !== userId) {
    redirect("/portal/orders")
  }

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
      <Link href="/portal/orders">
        <Button variant="ghost" className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Orders
        </Button>
      </Link>

      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-3xl font-bold">Order #{order.id.slice(-8)}</h1>
          <Badge className={getStatusColor(order.status)}>
            {order.status.replace("_", " ")}
          </Badge>
        </div>
        <p className="text-muted-foreground">
          Created {formatDate(order.createdAt)} • {order.company.name}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Order Items</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {order.items.map((item) => (
                  <div key={item.id} className="border-b pb-4 last:border-0">
                    <p className="font-medium">{item.name}</p>
                    {item.sku && <p className="text-sm text-muted-foreground">SKU: {item.sku}</p>}
                    <p className="text-sm text-muted-foreground">
                      Qty: {item.quantity} × {formatCurrency(item.unitPrice)} ={" "}
                      {formatCurrency(item.totalPrice)}
                    </p>
                    {item.description && (
                      <p className="text-sm text-muted-foreground mt-2">{item.description}</p>
                    )}
                  </div>
                ))}
                <div className="pt-4 border-t space-y-2">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>{formatCurrency(order.subtotal)}</span>
                  </div>
                  {order.tax > 0 && (
                    <div className="flex justify-between">
                      <span>Tax</span>
                      <span>{formatCurrency(order.tax)}</span>
                    </div>
                  )}
                  {order.shipping > 0 && (
                    <div className="flex justify-between">
                      <span>Shipping</span>
                      <span>{formatCurrency(order.shipping)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-lg pt-2 border-t">
                    <span>Total</span>
                    <span>{formatCurrency(order.total)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {order.shippingAddress && (
            <Card>
              <CardHeader>
                <CardTitle>Shipping Address</CardTitle>
              </CardHeader>
              <CardContent>
                <p>{order.shippingAddress}</p>
                {order.shippingCity && <p>{order.shippingCity}</p>}
                {order.shippingState && <p>{order.shippingState}</p>}
                {order.shippingCountry && <p>{order.shippingCountry}</p>}
                {order.shippingPostalCode && <p>{order.shippingPostalCode}</p>}
              </CardContent>
            </Card>
          )}

          {order.trackingNumber && (
            <Card>
              <CardHeader>
                <CardTitle>Tracking</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-mono">{order.trackingNumber}</p>
                {order.shippedAt && (
                  <p className="text-sm text-muted-foreground mt-2">
                    Shipped on {formatDate(order.shippedAt)}
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Status</span>
                <span className="capitalize">{order.status.replace("_", " ")}</span>
              </div>
              {order.estimatedShipDate && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Est. Ship Date</span>
                  <span>{formatDate(order.estimatedShipDate)}</span>
                </div>
              )}
              {order.depositPaid > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Deposit Paid</span>
                  <span>{formatCurrency(order.depositPaid)}</span>
                </div>
              )}
              {order.balanceDue > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Balance Due</span>
                  <span className="font-medium">{formatCurrency(order.balanceDue)}</span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Messages</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {order.messages.map((message) => (
                  <div key={message.id}>
                    <p className="text-sm font-medium">{message.user.name || message.user.email}</p>
                    <p className="text-sm text-muted-foreground">{message.content}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDate(message.createdAt)}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

