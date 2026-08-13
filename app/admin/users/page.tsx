import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatDate } from "@/lib/utils"
import { UserRole } from "@prisma/client"
import { getRolePermissions, PERMISSIONS, Permission } from "@/lib/permissions"
import { requirePermission } from "@/lib/rbac"

import { DeleteAllButton } from "../components/delete-all-button"
import { CreateUserButton } from "./create-user-button"
import { UserActions } from "./user-actions"

const ADMIN_ROLES: UserRole[] = [UserRole.OWNER, UserRole.ADMIN]

// Permission display names
const PERMISSION_LABELS: Record<Permission, string> = {
  dashboard: "Dashboard",
  users: "Users",
  brands: "Brands",
  suppliers: "Suppliers",
  fba_shipments: "FBA Shipments",
  machines: "Machine Setup",
  warehouse: "Warehouse Map",
  inventory: "Inventory",
  cleaning_logs: "Clean Logs",
  listings: "Listings",
  quotes: "Quotes",
  contact: "Contact",
  clients: "Clients",
  orders: "Orders",
  invoices: "Invoices",
  chat: "Live Chat",
  settings: "Site Settings",
  autopricer: "Autopricer",
  productinfo: "Product Info",
}

export default async function AdminUsersPage() {
  await requirePermission(PERMISSIONS.USERS)

  const session = await getServerSession(authOptions)
  const currentUserRole = (session?.user as any)?.role as UserRole

  const users = await prisma.user.findMany({
    include: { company: true },
    orderBy: { createdAt: "desc" },
  })

  // Check if current user can manage other users
  const canManageUsers = ADMIN_ROLES.includes(currentUserRole)

  return (
    <div>
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Users</h1>
          <p className="text-muted-foreground">Manage all users and their permissions</p>
        </div>
        <div className="flex gap-2">
          {canManageUsers && <CreateUserButton />}
          <DeleteAllButton
            entityName="Users"
            endpoint="/api/admin/users/delete-all"
            confirmationText="DELETE ALL USERS"
          />
        </div>
      </div>

<div className="space-y-4">
        {users.map((user) => (
          <Card key={user.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">{user.name || user.email}</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    {user.email} {user.company?.name && `• ${user.company.name}`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={user.isActive ? "default" : "secondary"}>
                    {user.isActive ? "Active" : "Inactive"}
                  </Badge>
                  <Badge>{user.role}</Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Created {formatDate(user.createdAt)}
                </p>

                {/* User's effective permissions */}
                <div>
                  <p className="text-sm font-medium mb-2">Permissions</p>
                  <div className="flex flex-wrap gap-1">
                    {(() => {
                      const userPerms = getRolePermissions(user.role as UserRole)
                      return userPerms.map((p) => (
                        <Badge key={p} variant="outline" className="text-xs">
                          {PERMISSION_LABELS[p]}
                        </Badge>
                      ))
                    })()}
                  </div>
                </div>

                {/* Actions - only for OWNER/ADMIN */}
                {canManageUsers && (
                  <UserActions userId={user.id} currentRole={user.role as UserRole} />
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
