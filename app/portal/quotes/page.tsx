import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatDate } from "@/lib/utils"
import { Plus } from "lucide-react"

export default async function QuotesPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")

  const userId = (session.user as any).id
  const isAdmin = (session.user as any).role === "ADMIN"

  const quotes = await prisma.quote.findMany({
    where: isAdmin ? {} : { createdById: userId },
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
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Quotes</h1>
          <p className="text-muted-foreground">Manage your quote requests</p>
        </div>
        <Link href="/quote">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Quote Request
          </Button>
        </Link>
      </div>

      {quotes.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">No quotes yet</p>
            <Link href="/quote">
              <Button>Create Your First Quote</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {quotes.map((quote) => (
            <Card key={quote.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">
                      Quote #{quote.id.slice(-8)}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      {quote.productCategory || "N/A"} • Created {formatDate(quote.createdAt)}
                    </p>
                  </div>
                  <Badge className={getStatusColor(quote.status)}>
                    {quote.status.replace("_", " ")}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm mb-4">{quote.productDescription}</p>
                <div className="flex items-center gap-4">
                  <Link href={`/portal/quotes/${quote.id}`}>
                    <Button variant="outline" size="sm">
                      View Details
                    </Button>
                  </Link>
                  {quote.totalEstimate && (
                    <span className="text-sm font-medium">
                      Estimate: ${quote.totalEstimate.toLocaleString()}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

