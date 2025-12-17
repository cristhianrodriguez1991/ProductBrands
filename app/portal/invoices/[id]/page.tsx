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

export default async function InvoiceDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")

  const userId = (session.user as any).id
  const isAdmin = (session.user as any).role === "ADMIN"

  const invoice = await prisma.invoice.findUnique({
    where: { id: params.id },
    include: { order: true, company: true },
  })

  if (!invoice) {
    return <div>Invoice not found</div>
  }

  if (!isAdmin && invoice.createdById !== userId) {
    redirect("/portal/invoices")
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      DRAFT: "bg-gray-500",
      SENT: "bg-blue-500",
      PAID: "bg-green-500",
      OVERDUE: "bg-red-500",
      CANCELLED: "bg-gray-400",
    }
    return colors[status] || "bg-gray-500"
  }

  return (
    <div>
      <Link href="/portal/invoices">
        <Button variant="ghost" className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Invoices
        </Button>
      </Link>

      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-3xl font-bold">{invoice.invoiceNumber}</h1>
          <Badge className={getStatusColor(invoice.status)}>{invoice.status}</Badge>
        </div>
        <p className="text-muted-foreground">
          Created {formatDate(invoice.createdAt)} • {invoice.company.name}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Invoice Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Invoice Number</p>
              <p>{invoice.invoiceNumber}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Status</p>
              <p className="capitalize">{invoice.status}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Amount</p>
              <p className="text-lg font-bold">{formatCurrency(invoice.amount)}</p>
            </div>
            {invoice.tax > 0 && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Tax</p>
                <p>{formatCurrency(invoice.tax)}</p>
              </div>
            )}
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total</p>
              <p className="text-lg font-bold">{formatCurrency(invoice.total)}</p>
            </div>
            {invoice.dueDate && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Due Date</p>
                <p>{formatDate(invoice.dueDate)}</p>
              </div>
            )}
            {invoice.paidAt && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Paid On</p>
                <p>{formatDate(invoice.paidAt)}</p>
              </div>
            )}
          </div>
          {invoice.notes && (
            <div>
              <p className="text-sm font-medium text-muted-foreground">Notes</p>
              <p>{invoice.notes}</p>
            </div>
          )}
          {invoice.order && (
            <div>
              <p className="text-sm font-medium text-muted-foreground">Related Order</p>
              <Link href={`/portal/orders/${invoice.order.id}`} className="text-primary hover:underline">
                Order #{invoice.order.id.slice(-8)}
              </Link>
            </div>
          )}
          {invoice.status === "SENT" && (
            <div className="pt-4 border-t">
              <Button>Pay Invoice</Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

