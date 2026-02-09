import { requireAdminSession } from "@/lib/rbac"
import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatDate } from "@/lib/utils"
import { ArrowLeft, Mail, Phone, User, Building2 } from "lucide-react"
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
          listing: { select: { id: true, title: true, slug: true } },
          variant: { select: { id: true, sku: true } },
        },
      },
      messages: {
        include: { user: true },
        orderBy: { createdAt: "desc" },
      },
      quoteMessages: {
        include: {
          senderUser: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: "asc" },
      },
      orders: { select: { id: true, orderNumber: true, status: true } },
    },
  })

  if (!quote) notFound()

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      NEW: "bg-blue-500",
      NEEDS_INFO: "bg-orange-500",
      PRICING: "bg-yellow-500",
      SENT: "bg-purple-500",
      APPROVED: "bg-green-500",
      REJECTED: "bg-red-500",
      ORDERED: "bg-gray-500",
      EXPIRED: "bg-red-500",
    }
    return colors[status] || "bg-gray-500"
  }

  const contact = quote.contact
  const requestText = quote.productDescription || quote.notesFromClient

  return (
    <div className="space-y-6">
      <Link href="/admin/quotes">
        <Button variant="ghost" size="sm">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Quotes
        </Button>
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">
            {quote.quoteNumber || `Quote #${quote.id.slice(-8)}`}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {quote.company.name}
            {quote.createdBy && ` • Created by ${quote.createdBy.name || quote.createdBy.email}`}
          </p>
        </div>
        <Badge className={getStatusColor(quote.status)}>
          {quote.status.replace("_", " ")}
        </Badge>
      </div>

      {/* Customer / contact – easy to reach */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <User className="h-4 w-4" />
            Customer
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {contact ? (
            <div className="flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span>{contact.name}</span>
              </div>
              {contact.email && (
                <a
                  href={`mailto:${contact.email}`}
                  className="flex items-center gap-2 text-primary hover:underline"
                >
                  <Mail className="h-4 w-4" />
                  {contact.email}
                </a>
              )}
              {contact.phone && (
                <a
                  href={`tel:${contact.phone}`}
                  className="flex items-center gap-2 text-primary hover:underline"
                >
                  <Phone className="h-4 w-4" />
                  {contact.phone}
                </a>
              )}
              <div className="flex items-center gap-2 text-muted-foreground">
                <Building2 className="h-4 w-4" />
                {quote.company.name}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No contact on file. Company: {quote.company.name}
              {quote.createdBy?.email && (
                <>
                  {" "}
                  • <a href={`mailto:${quote.createdBy.email}`} className="text-primary hover:underline">{quote.createdBy.email}</a>
                </>
              )}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Request content */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Request</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-sm whitespace-pre-wrap text-foreground">
            {requestText || "No description provided."}
          </p>
          {quote.attachments.length > 0 && (
            <div className="mt-3 pt-3 border-t">
              <p className="text-xs font-medium text-muted-foreground mb-1">Attachments</p>
              <ul className="text-sm space-y-1">
                {quote.attachments.map((a) => (
                  <li key={a.id}>
                    <a
                      href={a.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      {a.fileName}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      <QuoteManageForm quote={quote} />
    </div>
  )
}
