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

interface CreateUserFormProps {
  onSuccess?: () => void
}

export function CreateUserForm({ onSuccess }: CreateUserFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [useCustomPermissions, setUseCustomPermissions] = useState(false)
  const [selectedPermissions, setSelectedPermissions] = useState<Permission[]>([])

  const { register, handleSubmit, watch, setValue } = useForm<{
    email: string
    name: string
    password: string
    role: UserRole
    isActive: boolean
  }>({
    defaultValues: {
      role: UserRole.SUPPORT,
      isActive: true,
    },
  })

  const selectedRole = watch("role")

  // Get permissions for selected role
  const rolePermissions = ROLE_PERMISSIONS[selectedRole as UserRole] || []

  // Toggle permission for custom mode
  const togglePermission = (permission: Permission) => {
    setSelectedPermissions((prev) =>
      prev.includes(permission)
        ? prev.filter((p) => p !== permission)
        : [...prev, permission]
    )
  }

  // Reset to role permissions when switching from custom mode
  useEffect(() => {
    if (!useCustomPermissions) {
      setSelectedPermissions(rolePermissions)
    }
  }, [useCustomPermissions, selectedRole])

  const onSubmit = async (data: any) => {
    setIsLoading(true)
    setError(null)

    try {
      // Build custom permissions array
      const customPermissions: string[] = []

      if (useCustomPermissions) {
        // Add permissions that are selected but not in role
        selectedPermissions.forEach((p) => {
          if (!rolePermissions.includes(p)) {
            customPermissions.push(`+${p}`)
          }
        })
        // Remove permissions that are in role but not selected
        rolePermissions.forEach((p) => {
          if (!selectedPermissions.includes(p)) {
            customPermissions.push(`-${p}`)
          }
        })
      }

      const response = await fetch("/api/admin/users/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          customPermissions,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Failed to create user")
      }

      onSuccess?.()
      window.location.reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  // Get display permissions (either role-based or custom)
  const displayPermissions = useCustomPermissions ? selectedPermissions : rolePermissions

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
      {error && (
        <div className="p-3 text-sm text-red-500 bg-red-50 rounded border border-red-200">
          {error}
        </div>
      )}

      <div className="space-y-1">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="user@example.com"
          {...register("email", { required: "Email is required" })}
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          type="text"
          placeholder="John Doe"
          {...register("name")}
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          placeholder="••••••••"
          {...register("password", {
            required: "Password is required",
            minLength: { value: 8, message: "Password must be at least 8 characters" },
          })}
        />
      </div>

      <div className="space-y-1">
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
        <p className="text-xs text-muted-foreground">
          {selectedRole === UserRole.OWNER || selectedRole === UserRole.ADMIN
            ? "Full access to all sections"
            : selectedRole === UserRole.SALES
            ? "Access to Quotes, Clients, Orders, Contact, and Chat"
            : selectedRole === UserRole.OPS
            ? "Access to FBA, Warehouse, Inventory, Machines, Clean Logs, and Suppliers"
            : selectedRole === UserRole.SUPPORT
            ? "Access to Contact, Chat, Orders, and Clients"
            : "Dashboard view only"}
        </p>
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox
          id="isActive"
          checked={watch("isActive")}
          onCheckedChange={(checked) => setValue("isActive", !!checked)}
        />
        <Label htmlFor="isActive" className="text-sm">User is active</Label>
      </div>

      {/* Custom Permissions Toggle */}
      <div className="flex items-center space-x-2 pt-1 border-t">
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

      {/* Permissions Grid */}
      <div className="border rounded-lg p-2 space-y-1">
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

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={() => onSuccess?.()}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Creating..." : "Create User"}
        </Button>
      </div>
    </form>
  )
}
