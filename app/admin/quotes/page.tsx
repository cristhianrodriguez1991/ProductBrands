import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatDate } from "@/lib/utils"

export default async function AdminQuotesPage() {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any)?.role !== "ADMIN") {
    redirect("/login")
  }

  const quotes = await prisma.quote.findMany({
    orderBy: { createdAt: "desc" },
    include: { company: true },
  })

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
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">All Quotes</h1>
        <p className="text-muted-foreground">Manage all quote requests</p>
      </div>

      <div className="space-y-4">
        {quotes.map((quote) => (
          <Card key={quote.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Quote #{quote.id.slice(-8)}</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    {quote.company.name} • {quote.productCategory || "N/A"} • {formatDate(quote.createdAt)}
                  </p>
                </div>
                <Badge className={getStatusColor(quote.status)}>
                  {quote.status.replace("_", " ")}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm mb-4">{quote.productDescription}</p>
              <Link href={`/admin/quotes/${quote.id}`}>
                <Button variant="outline" size="sm">
                  View & Manage
                </Button>
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

