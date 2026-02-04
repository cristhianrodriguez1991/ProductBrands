import { requireAdminSession } from "@/lib/rbac"
import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatDate, formatCurrency } from "@/lib/utils"
import { ArrowLeft } from "lucide-react"
import QuoteManageForm from "./quote-manage-form"

export default async function AdminQuoteDetailPage({
  params,
}: {
  params: { id: string }
}) {
  await requireAdminSession()

  const quote = await prisma.quote.findUnique({
    where: { id: params.id },
    include: {
      company: true,
      contact: true,
      createdBy: {
        select: { id: true, name: true, email: true },
      },
      attachments: true,
      lineItems: {
        include: {
          listing: {
            select: { id: true, title: true, slug: true },
          },
          variant: {
            select: { id: true, sku: true },
          },
        },
      },
      messages: {
        include: { user: true },
        orderBy: { createdAt: "desc" },
      },
      quoteMessages: {
        include: {
          senderUser: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { createdAt: "asc" },
      },
      orders: {
        select: { id: true, orderNumber: true, status: true },
      },
    },
  })

  if (!quote) {
    notFound()
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      NEW: "bg-blue-500",
      NEEDS_INFO: "bg-orange-500",
      PRICING: "bg-yellow-500",
      SENT: "bg-purple-500",
      APPROVED: "bg-green-500",
      REJECTED: "bg-red-500",
      ORDERED: "bg-gray-500",
    }
    return colors[status] || "bg-gray-500"
  }

  return (
    <div>
      <Link href="/admin/quotes">
        <Button variant="ghost" className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Quotes
        </Button>
      </Link>

      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold">
              {quote.quoteNumber || `Quote #${quote.id.slice(-8)}`}
            </h1>
            <p className="text-muted-foreground mt-1">
              {quote.company.name}
              {quote.contact && ` • ${quote.contact.name} (${quote.contact.email})`}
              {quote.createdBy && ` • Created by ${quote.createdBy.name || quote.createdBy.email}`}
            </p>
          </div>
          <Badge className={getStatusColor(quote.status)}>
            {quote.status.replace("_", " ")}
          </Badge>
        </div>
      </div>

      <QuoteManageForm quote={quote} />
    </div>
  )
}

