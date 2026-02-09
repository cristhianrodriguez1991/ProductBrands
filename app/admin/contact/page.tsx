import { requireAdminSession } from "@/lib/rbac"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { formatDateTime } from "@/lib/utils"
import { Mail, Building2 } from "lucide-react"

export default async function AdminContactPage({
  searchParams,
}: {
  searchParams: { search?: string; unread?: string }
}) {
  await requireAdminSession()

  const where: any = {}
  if (searchParams.search) {
    const q = searchParams.search.trim()
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
      { company: { contains: q, mode: "insensitive" } },
      { message: { contains: q, mode: "insensitive" } },
    ]
  }
  if (searchParams.unread === "true") {
    where.read = false
  }

  const submissions = await prisma.contactSubmission.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 100,
  })

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Contact</h1>
        <p className="text-sm text-muted-foreground">
          Inquiries from the website contact form
        </p>
      </div>

      <Card className="mb-6">
        <CardContent className="pt-6">
          <form method="get" className="flex flex-wrap gap-3 items-end">
            {searchParams.unread === "true" && (
              <input type="hidden" name="unread" value="true" />
            )}
            <div className="flex-1 min-w-[200px]">
              <label className="text-sm font-medium mb-1 block">Search</label>
              <Input
                name="search"
                placeholder="Name, email, company, message..."
                defaultValue={searchParams.search}
              />
            </div>
            <Button type="submit">Search</Button>
            <Link
              href={
                searchParams.unread === "true"
                  ? "/admin/contact"
                  : "/admin/contact?unread=true"
              }
            >
              <Button type="button" variant="outline">
                {searchParams.unread === "true" ? "Show all" : "Unread only"}
              </Button>
            </Link>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {submissions.map((sub) => (
          <Card key={sub.id} className={sub.read ? "" : "border-l-4 border-l-primary"}>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link
                      href={`/admin/contact/${sub.id}`}
                      className="font-semibold text-foreground hover:underline"
                    >
                      {sub.name}
                    </Link>
                    {!sub.read && (
                      <Badge variant="secondary" className="bg-blue-500 text-white">
                        New
                      </Badge>
                    )}
                    <span className="text-sm text-muted-foreground">
                      {formatDateTime(sub.createdAt)}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                    <a
                      href={`mailto:${sub.email}`}
                      className="flex items-center gap-1 text-primary hover:underline"
                    >
                      <Mail className="h-3.5 w-3" />
                      {sub.email}
                    </a>
                    {sub.company && (
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Building2 className="h-3.5 w-3" />
                        {sub.company}
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                    {sub.message}
                  </p>
                </div>
                <Link href={`/admin/contact/${sub.id}`} className="shrink-0">
                  <Button size="sm">View</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ))}

        {submissions.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No contact submissions found
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
