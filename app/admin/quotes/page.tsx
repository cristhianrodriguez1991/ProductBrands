import { requireAdminSession } from "@/lib/rbac"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { formatDate } from "@/lib/utils"
import { QuoteStatus } from "@prisma/client"
import { Mail, Phone, User } from "lucide-react"

export default async function AdminQuotesPage({
  searchParams,
}: {
  searchParams: { status?: string; search?: string }
}) {
  await requireAdminSession()

  const where: any = {}
  if (searchParams.status && searchParams.status !== "all") {
    where.status = searchParams.status as QuoteStatus
  }
  if (searchParams.search) {
    const q = searchParams.search.trim()
    where.OR = [
      { quoteNumber: { contains: q, mode: "insensitive" } },
      { company: { name: { contains: q, mode: "insensitive" } } },
      { contact: { email: { contains: q, mode: "insensitive" } } },
      { contact: { name: { contains: q, mode: "insensitive" } } },
      { productDescription: { contains: q, mode: "insensitive" } },
    ]
  }

  const quotes = await prisma.quote.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      company: true,
      contact: true,
      _count: { select: { lineItems: true, quoteMessages: true } },
    },
    take: 100,
  })

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
      DRAFT: "bg-gray-500",
      SUBMITTED: "bg-blue-500",
      IN_REVIEW: "bg-yellow-500",
      NEED_INFO: "bg-orange-500",
      ACCEPTED: "bg-green-500",
    }
    return colors[status] || "bg-gray-500"
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Quotes</h1>
        <p className="text-sm text-muted-foreground">Quote requests and customer contact info</p>
      </div>

      <Card className="mb-6">
        <CardContent className="pt-6">
          <form method="get" className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="text-sm font-medium mb-1 block">Search</label>
              <Input
                name="search"
                placeholder="Quote #, company, name, email..."
                defaultValue={searchParams.search}
              />
            </div>
            <div className="w-40">
              <label className="text-sm font-medium mb-1 block">Status</label>
              <select
                name="status"
                defaultValue={searchParams.status || "all"}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="all">All</option>
                <option value="NEW">New</option>
                <option value="NEEDS_INFO">Needs Info</option>
                <option value="PRICING">Pricing</option>
                <option value="SENT">Sent</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
                <option value="ORDERED">Ordered</option>
              </select>
            </div>
            <Button type="submit">Filter</Button>
            {(searchParams.status || searchParams.search) && (
              <Link href="/admin/quotes">
                <Button type="button" variant="outline">Clear</Button>
              </Link>
            )}
          </form>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {quotes.map((quote) => {
          const contact = quote.contact
          const description = quote.productDescription || quote.notesFromClient || "—"
          return (
            <Card key={quote.id}>
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link
                        href={`/admin/quotes/${quote.id}`}
                        className="font-semibold text-foreground hover:underline"
                      >
                        {quote.quoteNumber || `#${quote.id.slice(-8)}`}
                      </Link>
                      <Badge className={getStatusColor(quote.status)}>
                        {quote.status.replace("_", " ")}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {formatDate(quote.createdAt)}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                      {contact ? (
                        <>
                          <span className="flex items-center gap-1">
                            <User className="h-3.5 w-3" />
                            {contact.name}
                          </span>
                          {contact.email && (
                            <a
                              href={`mailto:${contact.email}`}
                              className="flex items-center gap-1 text-primary hover:underline"
                            >
                              <Mail className="h-3.5 w-3" />
                              {contact.email}
                            </a>
                          )}
                          {contact.phone && (
                            <a
                              href={`tel:${contact.phone}`}
                              className="flex items-center gap-1 text-primary hover:underline"
                            >
                              <Phone className="h-3.5 w-3" />
                              {contact.phone}
                            </a>
                          )}
                        </>
                      ) : (
                        <span className="text-muted-foreground">{quote.company.name}</span>
                      )}
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                      {description}
                    </p>
                  </div>
                  <Link href={`/admin/quotes/${quote.id}`}>
                    <Button size="sm">View & manage</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          )
        })}

        {quotes.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No quotes found
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
