import { requireAdminSession } from "@/lib/rbac"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { formatDate } from "@/lib/utils"
import { QuoteStatus } from "@prisma/client"

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
    where.OR = [
      { quoteNumber: { contains: searchParams.search, mode: "insensitive" } },
      { company: { name: { contains: searchParams.search, mode: "insensitive" } } },
    ]
  }

  const quotes = await prisma.quote.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      company: true,
      contact: true,
      createdBy: {
        select: { id: true, name: true, email: true },
      },
      _count: {
        select: {
          lineItems: true,
          quoteMessages: true,
        },
      },
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
      // Legacy
      SUBMITTED: "bg-blue-500",
      IN_REVIEW: "bg-yellow-500",
      NEED_INFO: "bg-orange-500",
      ACCEPTED: "bg-green-500",
    }
    return colors[status] || "bg-gray-500"
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Quotes</h1>
        <p className="text-muted-foreground">Manage all quote requests</p>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <form method="get" className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Search</label>
              <Input
                name="search"
                placeholder="Quote number, company name..."
                defaultValue={searchParams.search}
              />
            </div>
            <div className="w-48">
              <label className="text-sm font-medium mb-2 block">Status</label>
              <Select name="status" defaultValue={searchParams.status || "all"}>
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="NEW">New</SelectItem>
                  <SelectItem value="NEEDS_INFO">Needs Info</SelectItem>
                  <SelectItem value="PRICING">Pricing</SelectItem>
                  <SelectItem value="SENT">Sent</SelectItem>
                  <SelectItem value="APPROVED">Approved</SelectItem>
                  <SelectItem value="REJECTED">Rejected</SelectItem>
                  <SelectItem value="ORDERED">Ordered</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit">Filter</Button>
            {searchParams.status || searchParams.search ? (
              <Link href="/admin/quotes">
                <Button type="button" variant="outline">
                  Clear
                </Button>
              </Link>
            ) : null}
          </form>
        </CardContent>
      </Card>

      {/* Quotes List */}
      <div className="space-y-4">
        {quotes.map((quote) => (
          <Card key={quote.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg">
                    <Link
                      href={`/admin/quotes/${quote.id}`}
                      className="hover:text-blue-600"
                    >
                      {quote.quoteNumber || `Quote #${quote.id.slice(-8)}`}
                    </Link>
                  </CardTitle>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                    <span>{quote.company.name}</span>
                    {quote.contact && <span>• {quote.contact.name}</span>}
                    {quote.productCategory && <span>• {quote.productCategory}</span>}
                    <span>• {formatDate(quote.createdAt)}</span>
                  </div>
                  {quote.productDescription && (
                    <p className="text-sm mt-2 line-clamp-2">{quote.productDescription}</p>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right text-sm text-muted-foreground">
                    <div>{quote._count.lineItems} items</div>
                    <div>{quote._count.quoteMessages} messages</div>
                  </div>
                  <Badge className={getStatusColor(quote.status)}>
                    {quote.status.replace("_", " ")}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Link href={`/admin/quotes/${quote.id}`}>
                <Button variant="outline" size="sm">
                  View & Manage
                </Button>
              </Link>
            </CardContent>
          </Card>
        ))}

        {quotes.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">No quotes found</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

