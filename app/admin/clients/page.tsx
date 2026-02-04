import { requireAdminSession } from "@/lib/rbac"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Building2, Mail, Phone, Globe } from "lucide-react"

export default async function AdminClientsPage() {
  await requireAdminSession()

  const companies = await prisma.company.findMany({
    include: {
      _count: {
        select: {
          quotes: true,
          orders: true,
          users: true,
          contacts: true,
        },
      },
      contacts: {
        where: { isPrimary: true },
        take: 1,
      },
    },
    orderBy: { createdAt: "desc" },
  })

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Clients</h1>
        <p className="text-muted-foreground">Manage client companies and contacts</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {companies.map((company) => (
          <Card key={company.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg mb-2">{company.name}</CardTitle>
                  {company.tags && company.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {company.tags.map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
                <Building2 className="h-5 w-5 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {(company.phone || company.website) && (
                  <div className="space-y-1 text-sm">
                    {company.phone && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Phone className="h-3 w-3" />
                        {company.phone}
                      </div>
                    )}
                    {company.website && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Globe className="h-3 w-3" />
                        <a
                          href={company.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:text-blue-600"
                        >
                          {company.website}
                        </a>
                      </div>
                    )}
                  </div>
                )}

                {company.contacts.length > 0 && (
                  <div className="pt-2 border-t">
                    <p className="text-xs font-medium text-muted-foreground mb-1">
                      Primary Contact
                    </p>
                    <p className="text-sm">
                      {company.contacts[0].name}
                      {company.contacts[0].email && (
                        <span className="text-muted-foreground"> • {company.contacts[0].email}</span>
                      )}
                    </p>
                  </div>
                )}

                <div className="pt-2 border-t flex items-center justify-between text-xs text-muted-foreground">
                  <span>{company._count.quotes} quotes</span>
                  <span>{company._count.orders} orders</span>
                  <span>{company._count.users} users</span>
                </div>

                <Link href={`/admin/clients/${company.id}`}>
                  <Button variant="outline" className="w-full mt-4" size="sm">
                    View Details
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ))}

        {companies.length === 0 && (
          <Card className="col-span-full">
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">No clients found</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
