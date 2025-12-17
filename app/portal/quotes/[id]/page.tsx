import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatDate, formatCurrency } from "@/lib/utils"
import { ArrowLeft } from "lucide-react"

export default async function QuoteDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")

  const userId = (session.user as any).id
  const isAdmin = (session.user as any).role === "ADMIN"

  const quote = await prisma.quote.findUnique({
    where: { id: params.id },
    include: {
      company: true,
      attachments: true,
      lineItems: true,
      messages: {
        include: { user: true },
        orderBy: { createdAt: "desc" },
      },
    },
  })

  if (!quote) {
    return <div>Quote not found</div>
  }

  if (!isAdmin && quote.createdById !== userId) {
    redirect("/portal/quotes")
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      DRAFT: "bg-gray-500",
      SUBMITTED: "bg-blue-500",
      IN_REVIEW: "bg-yellow-500",
      NEED_INFO: "bg-orange-500",
      SENT: "bg-purple-500",
      ACCEPTED: "bg-green-500",
      REJECTED: "bg-red-500",
    }
    return colors[status] || "bg-gray-500"
  }

  return (
    <div>
      <Link href="/portal/quotes">
        <Button variant="ghost" className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Quotes
        </Button>
      </Link>

      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-3xl font-bold">Quote #{quote.id.slice(-8)}</h1>
          <Badge className={getStatusColor(quote.status)}>
            {quote.status.replace("_", " ")}
          </Badge>
        </div>
        <p className="text-muted-foreground">
          Created {formatDate(quote.createdAt)} • {quote.company.name}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Product Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Category</p>
                <p>{quote.productCategory || "N/A"}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Description</p>
                <p>{quote.productDescription || "N/A"}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Target Customer</p>
                <p>{quote.targetCustomer || "N/A"}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Packaging Type</p>
                <p>{quote.packagingType || "N/A"}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Estimated Quantity</p>
                <p>{quote.estimatedQuantity || "N/A"}</p>
              </div>
              {quote.targetUnitCost && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Target Unit Cost</p>
                  <p>{formatCurrency(quote.targetUnitCost)}</p>
                </div>
              )}
              <div>
                <p className="text-sm font-medium text-muted-foreground">Timeline</p>
                <p>{quote.timeline || "N/A"}</p>
              </div>
              {quote.deadline && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Deadline</p>
                  <p>{formatDate(quote.deadline)}</p>
                </div>
              )}
              <div>
                <p className="text-sm font-medium text-muted-foreground">Shipping Destination</p>
                <p>{quote.shippingDestination || "N/A"}</p>
              </div>
            </CardContent>
          </Card>

          {quote.lineItems.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Quote Line Items</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {quote.lineItems.map((item) => (
                    <div key={item.id} className="border-b pb-4 last:border-0">
                      <p className="font-medium">{item.description}</p>
                      {item.quantity && (
                        <p className="text-sm text-muted-foreground">
                          Qty: {item.quantity} × {formatCurrency(item.unitPrice)} ={" "}
                          {formatCurrency(item.totalPrice)}
                        </p>
                      )}
                      {item.notes && (
                        <p className="text-sm text-muted-foreground mt-2">{item.notes}</p>
                      )}
                    </div>
                  ))}
                  {quote.totalEstimate && (
                    <div className="pt-4 border-t">
                      <p className="text-lg font-bold">
                        Total Estimate: {formatCurrency(quote.totalEstimate)}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {quote.attachments.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Attachments</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {quote.attachments.map((attachment) => (
                    <a
                      key={attachment.id}
                      href={attachment.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block text-sm text-primary hover:underline"
                    >
                      {attachment.fileName}
                    </a>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {quote.adminNotes && (
            <Card>
              <CardHeader>
                <CardTitle>Admin Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p>{quote.adminNotes}</p>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          {quote.status === "SENT" && (
            <Card>
              <CardHeader>
                <CardTitle>Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <form action={`/api/quotes/${quote.id}/accept`} method="POST">
                  <Button type="submit" className="w-full">
                    Accept Quote
                  </Button>
                </form>
                <form action={`/api/quotes/${quote.id}/reject`} method="POST">
                  <Button type="submit" variant="destructive" className="w-full">
                    Reject Quote
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Messages</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {quote.messages.map((message) => (
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

