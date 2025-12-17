import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatDate } from "@/lib/utils"

export default async function AdminUsersPage() {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any)?.role !== "ADMIN") {
    redirect("/login")
  }

  const users = await prisma.user.findMany({
    include: { company: true },
    orderBy: { createdAt: "desc" },
  })

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Users</h1>
        <p className="text-muted-foreground">Manage all users and companies</p>
      </div>

      <div className="space-y-4">
        {users.map((user) => (
          <Card key={user.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">{user.name || user.email}</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    {user.email} • {user.company?.name || "No company"}
                  </p>
                </div>
                <Badge>{user.role}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Created {formatDate(user.createdAt)}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

