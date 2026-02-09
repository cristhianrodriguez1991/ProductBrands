import { requireAdminSession } from "@/lib/rbac"
import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatDateTime } from "@/lib/utils"
import { ArrowLeft, Mail, User, Building2 } from "lucide-react"
import { MarkReadButton } from "./mark-read-button"

export default async function AdminContactDetailPage({
  params,
}: {
  params: { id: string }
}) {
  await requireAdminSession()

  const sub = await prisma.contactSubmission.findUnique({
    where: { id: params.id },
  })

  if (!sub) notFound()

  return (
    <div className="space-y-6">
      <Link href="/admin/contact">
        <Button variant="ghost" size="sm">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Contact
        </Button>
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{sub.name}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {formatDateTime(sub.createdAt)}
            {!sub.read && (
              <span className="ml-2 text-primary font-medium">• Unread</span>
            )}
          </p>
        </div>
        {!sub.read && <MarkReadButton submissionId={sub.id} />}
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <User className="h-4 w-4" />
            Contact details
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span>{sub.name}</span>
            </div>
            <a
              href={`mailto:${sub.email}`}
              className="flex items-center gap-2 text-primary hover:underline"
            >
              <Mail className="h-4 w-4" />
              {sub.email}
            </a>
            {sub.company && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Building2 className="h-4 w-4" />
                {sub.company}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Message</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-sm whitespace-pre-wrap text-foreground">
            {sub.message}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
