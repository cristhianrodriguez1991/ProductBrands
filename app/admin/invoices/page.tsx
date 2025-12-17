import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatDate, formatCurrency } from "@/lib/utils"

export default async function AdminInvoicesPage() {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any)?.role !== "ADMIN") {
    redirect("/login")
  }

  const invoices = await prisma.invoice.findMany({
    orderBy: { createdAt: "desc" },
    include: { company: true, order: true },
  })

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
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">All Invoices</h1>
        <p className="text-muted-foreground">Manage all invoices</p>
      </div>

      <div className="space-y-4">
        {invoices.map((invoice) => (
          <Card key={invoice.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">{invoice.invoiceNumber}</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    {invoice.company.name} • {formatDate(invoice.createdAt)}
                  </p>
                </div>
                <Badge className={getStatusColor(invoice.status)}>{invoice.status}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Amount</p>
                  <p className="text-lg font-bold">{formatCurrency(invoice.total)}</p>
                </div>
                <Link href={`/admin/invoices/${invoice.id}`}>
                  <Button variant="outline" size="sm">
                    View & Manage
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

