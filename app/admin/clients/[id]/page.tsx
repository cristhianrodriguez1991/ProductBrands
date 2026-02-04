import { requireAdminSession } from "@/lib/rbac"
import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Mail, Phone, Globe, MapPin } from "lucide-react"
import { formatDate } from "@/lib/utils"

export default async function ClientDetailPage({
  params,
}: {
  params: { id: string }
}) {
  await requireAdminSession()

  const company = await prisma.company.findUnique({
    where: { id: params.id },
    include: {
      contacts: {
        orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
      },
      quotes: {
        take: 10,
        orderBy: { createdAt: "desc" },
        include: {
          contact: true,
        },
      },
      orders: {
        take: 10,
        orderBy: { createdAt: "desc" },
      },
      users: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
        },
      },
    },
  })

  if (!company) {
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
      <div className="mb-8">
        <Link href="/admin/clients">
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Clients
          </Button>
        </Link>
        <h1 className="text-3xl font-bold mb-2">{company.name}</h1>
        <p className="text-muted-foreground">Client company details</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Company Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {company.address && (
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-1" />
                  <div>
                    <p className="font-medium">Address</p>
                    <p className="text-sm text-muted-foreground">
                      {company.address}
                      {company.city && `, ${company.city}`}
                      {company.state && `, ${company.state}`}
                      {company.postalCode && ` ${company.postalCode}`}
                      {company.country && `, ${company.country}`}
                    </p>
                  </div>
                </div>
              )}
              {company.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{company.phone}</span>
                </div>
              )}
              {company.website && (
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <a
                    href={company.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    {company.website}
                  </a>
                </div>
              )}
              {company.taxId && (
                <div>
                  <p className="font-medium">Tax ID</p>
                  <p className="text-sm text-muted-foreground">{company.taxId}</p>
                </div>
              )}
              {company.notes && (
                <div>
                  <p className="font-medium">Notes</p>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{company.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Contacts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {company.contacts.map((contact) => (
                  <div key={contact.id} className="flex items-start justify-between p-3 border rounded-lg">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{contact.name}</p>
                        {contact.isPrimary && (
                          <Badge variant="outline" className="text-xs">Primary</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                        <span className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {contact.email}
                        </span>
                        {contact.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {contact.phone}
                          </span>
                        )}
                      </div>
                      {contact.roleTitle && (
                        <p className="text-xs text-muted-foreground mt-1">{contact.roleTitle}</p>
                      )}
                    </div>
                  </div>
                ))}
                {company.contacts.length === 0 && (
                  <p className="text-sm text-muted-foreground">No contacts</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Quotes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {company.quotes.map((quote) => (
                  <Link
                    key={quote.id}
                    href={`/admin/quotes/${quote.id}`}
                    className="block p-3 border rounded-lg hover:bg-muted transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{quote.quoteNumber || `#${quote.id.slice(-8)}`}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(quote.createdAt)}
                          {quote.contact && ` • ${quote.contact.name}`}
                        </p>
                      </div>
                      <Badge className={getStatusColor(quote.status)}>
                        {quote.status.replace("_", " ")}
                      </Badge>
                    </div>
                  </Link>
                ))}
                {company.quotes.length === 0 && (
                  <p className="text-sm text-muted-foreground">No quotes</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Statistics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Total Quotes</p>
                <p className="text-2xl font-bold">{company.quotes.length}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Orders</p>
                <p className="text-2xl font-bold">{company.orders.length}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Users</p>
                <p className="text-2xl font-bold">{company.users.length}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Created</p>
                <p className="text-sm">{formatDate(company.createdAt)}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {company.users.map((user) => (
                  <div key={user.id} className="text-sm">
                    <p className="font-medium">{user.name || user.email}</p>
                    <p className="text-xs text-muted-foreground">
                      {user.email} • {user.role}
                    </p>
                  </div>
                ))}
                {company.users.length === 0 && (
                  <p className="text-sm text-muted-foreground">No users</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
