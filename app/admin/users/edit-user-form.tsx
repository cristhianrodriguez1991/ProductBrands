"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { UserRole } from "@prisma/client"
import { PERMISSIONS, Permission, ROLE_PERMISSIONS } from "@/lib/permissions"
import { cn } from "@/lib/utils"

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

interface EditUserFormProps {
  userId: string
  onSuccess?: () => void
}

export function EditUserForm({ userId, onSuccess }: EditUserFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [useCustomPermissions, setUseCustomPermissions] = useState(false)
  const [selectedPermissions, setSelectedPermissions] = useState<Permission[]>([])
  const [currentUser, setCurrentUser] = useState<any>(null)

  const { register, handleSubmit, watch, setValue } = useForm<{
    email: string
    name: string
    role: UserRole
    isActive: boolean
  }>()

  const selectedRole = watch("role")

  // Load user data
  useEffect(() => {
    const loadUser = async () => {
      try {
        const response = await fetch(`/api/admin/users/${userId}`)
        const data = await response.json()
        setCurrentUser(data)

        if (data) {
          setValue("email", data.email)
          setValue("name", data.name || "")
          setValue("role", data.role)
          setValue("isActive", data.isActive)

          // Parse custom permissions
          if (data.customPermissions && data.customPermissions.length > 0) {
            setUseCustomPermissions(true)
            // Start with role permissions
            const rolePerms = [...(ROLE_PERMISSIONS[data.role as UserRole] || [])]
            // Apply custom overrides
            data.customPermissions.forEach((override: string) => {
              const perm = override.slice(1) as Permission
              if (override.startsWith("+")) {
                if (!rolePerms.includes(perm)) rolePerms.push(perm)
              } else if (override.startsWith("-")) {
                const idx = rolePerms.indexOf(perm)
                if (idx > -1) rolePerms.splice(idx, 1)
              }
            })
            setSelectedPermissions(rolePerms)
          } else {
            setSelectedPermissions(ROLE_PERMISSIONS[data.role as UserRole] || [])
          }
        }
      } catch (error) {
        setError("Failed to load user data")
      }
    }
    loadUser()
  }, [userId, setValue])

  const rolePermissions = ROLE_PERMISSIONS[selectedRole] || []

  const togglePermission = (permission: Permission) => {
    setSelectedPermissions((prev) =>
      prev.includes(permission)
        ? prev.filter((p) => p !== permission)
        : [...prev, permission]
    )
  }

  const onSubmit = async (data: any) => {
    setIsLoading(true)
    setError(null)

    try {
      const customPermissions: string[] = []

      if (useCustomPermissions) {
        selectedPermissions.forEach((p) => {
          if (!rolePermissions.includes(p)) {
            customPermissions.push(`+${p}`)
          }
        })
        rolePermissions.forEach((p) => {
          if (!selectedPermissions.includes(p)) {
            customPermissions.push(`-${p}`)
          }
        })
      }

      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          customPermissions,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Failed to update user")
      }

      onSuccess?.()
      window.location.reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  const displayPermissions = useCustomPermissions ? selectedPermissions : rolePermissions

  if (!currentUser) {
    return <div className="text-center py-4 text-muted-foreground">Loading...</div>
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {error && (
        <div className="p-3 text-sm text-red-500 bg-red-50 rounded border border-red-200">
          {error}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          {...register("email", { required: "Email is required" })}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          type="text"
          {...register("name")}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="role">Role</Label>
        <Select
          value={selectedRole}
          onValueChange={(value: UserRole) => setValue("role", value)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.values(UserRole).filter(r => r !== UserRole.CUSTOMER).map((role) => (
              <SelectItem key={role} value={role}>
                {role}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox
          id="isActive"
          checked={watch("isActive")}
          onCheckedChange={(checked) => setValue("isActive", !!checked)}
        />
        <Label htmlFor="isActive" className="text-sm">User is active</Label>
      </div>

      <div className="flex items-center space-x-2 pt-2 border-t">
        <Checkbox
          id="customPerms"
          checked={useCustomPermissions}
          onCheckedChange={(checked) => {
            setUseCustomPermissions(!!checked)
            if (!checked) {
              setSelectedPermissions(rolePermissions)
            }
          }}
        />
        <Label htmlFor="customPerms" className="text-sm font-medium">
          Customize permissions (override role defaults)
        </Label>
      </div>

      <div className="border rounded-lg p-3 space-y-2">
        <Label className="text-sm">
          {useCustomPermissions ? "Select Permissions" : "Included Permissions (read-only)"}
        </Label>
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(PERMISSION_LABELS).map(([key, label]) => {
            const permission = key as Permission
            const isEnabled = displayPermissions.includes(permission)
            const isDisabled = !useCustomPermissions

            return (
              <div
                key={key}
                className={cn(
                  "flex items-center space-x-2 p-2 rounded border",
                  isDisabled && "opacity-60",
                  isEnabled && "bg-green-50 border-green-200",
                  !isEnabled && "bg-gray-50"
                )}
              >
                {useCustomPermissions ? (
                  <Checkbox
                    id={`perm-${key}`}
                    checked={selectedPermissions.includes(permission)}
                    onCheckedChange={() => togglePermission(permission)}
                  />
                ) : (
                  <div
                    className={cn(
                      "h-4 w-4 rounded border",
                      isEnabled ? "bg-green-500 border-green-500" : "bg-gray-200"
                    )}
                  />
                )}
                <Label
                  htmlFor={useCustomPermissions ? `perm-${key}` : undefined}
                  className={cn("text-xs flex-1", isEnabled ? "text-green-700" : "text-muted-foreground")}
                >
                  {label}
                </Label>
              </div>
            )
          })}
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={() => onSuccess?.()}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </form>
  )
}
