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
import QuoteManageForm from "./quote-manage-form"

export default async function AdminQuoteDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any)?.role !== "ADMIN") {
    redirect("/login")
  }

  const quote = await prisma.quote.findUnique({
    where: { id: params.id },
    include: {
      company: true,
      attachments: true,
      lineItems: true,
      messages: {
        include: { user: true },
        orderBy: { createdAt: "desc" },
      },
    },
  })

  if (!quote) {
    return <div>Quote not found</div>
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
          <h1 className="text-3xl font-bold">Quote #{quote.id.slice(-8)}</h1>
          <Badge>{quote.status.replace("_", " ")}</Badge>
        </div>
        <p className="text-muted-foreground">
          {quote.company.name} • Created {formatDate(quote.createdAt)}
        </p>
      </div>

      <QuoteManageForm quote={quote} />
    </div>
  )
}

