import { UserRole } from "@prisma/client"

/**
 * Permission keys for each admin section
 */
export const PERMISSIONS = {
  DASHBOARD: 'dashboard',
  USERS: 'users',
  BRANDS: 'brands',
  SUPPLIERS: 'suppliers',
  FBA_SHIPMENTS: 'fba_shipments',
  MACHINES: 'machines',
  WAREHOUSE: 'warehouse',
  INVENTORY: 'inventory',
  CLEANING_LOGS: 'cleaning_logs',
  LISTINGS: 'listings',
  QUOTES: 'quotes',
  CONTACT: 'contact',
  CLIENTS: 'clients',
  ORDERS: 'orders',
  INVOICES: 'invoices',
  CHAT: 'chat',
  SETTINGS: 'settings',
  AUTOPRICER: 'autopricer',
} as const

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS]

/**
 * Default role configurations - maps each role to its default permissions
 */
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  [UserRole.OWNER]: Object.values(PERMISSIONS),
  [UserRole.ADMIN]: Object.values(PERMISSIONS),
  [UserRole.SALES]: [
    PERMISSIONS.DASHBOARD,
    PERMISSIONS.QUOTES,
    PERMISSIONS.CLIENTS,
    PERMISSIONS.ORDERS,
    PERMISSIONS.CONTACT,
    PERMISSIONS.CHAT,
    PERMISSIONS.AUTOPRICER,
  ],
  [UserRole.OPS]: [
    PERMISSIONS.DASHBOARD,
    PERMISSIONS.FBA_SHIPMENTS,
    PERMISSIONS.WAREHOUSE,
    PERMISSIONS.INVENTORY,
    PERMISSIONS.MACHINES,
    PERMISSIONS.CLEANING_LOGS,
    PERMISSIONS.SUPPLIERS,
    PERMISSIONS.AUTOPRICER,
  ],
  [UserRole.SUPPORT]: [
    PERMISSIONS.DASHBOARD,
    PERMISSIONS.CONTACT,
    PERMISSIONS.CHAT,
    PERMISSIONS.ORDERS,
    PERMISSIONS.CLIENTS,
  ],
  [UserRole.READONLY]: [PERMISSIONS.DASHBOARD],
  [UserRole.CUSTOMER]: [],
}

/**
 * Get default permissions for a role
 */
export function getRolePermissions(role: UserRole): Permission[] {
  return ROLE_PERMISSIONS[role] || []
}

/**
 * Check if a role has a specific permission by default
 */
export function hasPermission(role: UserRole | undefined | null, permission: Permission): boolean {
  if (!role) return false
  const permissions = getRolePermissions(role)
  return permissions.includes(permission)
}

/**
 * Get effective permissions for a user, combining role permissions with custom overrides
 * customPermissions can:
 * - Add permissions: prefixed with '+' (e.g., '+users')
 * - Remove permissions: prefixed with '-' (e.g., '-quotes')
 */
export function getEffectivePermissions(
  role: UserRole | undefined | null,
  customPermissions: string[] = []
): Permission[] {
  if (!role) return []

  let permissions = new Set(getRolePermissions(role))

  for (const custom of customPermissions) {
    if (custom.startsWith('+')) {
      const perm = custom.slice(1) as Permission
      if (Object.values(PERMISSIONS).includes(perm)) {
        permissions.add(perm)
      }
    } else if (custom.startsWith('-')) {
      const perm = custom.slice(1) as Permission
      permissions.delete(perm)
    }
  }

  return Array.from(permissions)
}

/**
 * Check if a user has a specific permission, considering custom overrides
 */
export function hasEffectivePermission(
  role: UserRole | undefined | null,
  customPermissions: string[] = [],
  permission: Permission
): boolean {
  const effectivePermissions = getEffectivePermissions(role, customPermissions)
  return effectivePermissions.includes(permission)
}

/**
 * Map admin routes to their required permissions
 */
export const ROUTE_PERMISSIONS: Record<string, Permission> = {
  '/admin': PERMISSIONS.DASHBOARD,
  '/admin/users': PERMISSIONS.USERS,
  '/admin/brands': PERMISSIONS.BRANDS,
  '/admin/suppliers': PERMISSIONS.SUPPLIERS,
  '/admin/fba-shipments': PERMISSIONS.FBA_SHIPMENTS,
  '/admin/machines': PERMISSIONS.MACHINES,
  '/admin/warehouse': PERMISSIONS.WAREHOUSE,
  '/admin/inventory': PERMISSIONS.INVENTORY,
  '/admin/cleaning-logs': PERMISSIONS.CLEANING_LOGS,
  '/admin/listings': PERMISSIONS.LISTINGS,
  '/admin/quotes': PERMISSIONS.QUOTES,
  '/admin/contact': PERMISSIONS.CONTACT,
  '/admin/clients': PERMISSIONS.CLIENTS,
  '/admin/orders': PERMISSIONS.ORDERS,
  '/admin/invoices': PERMISSIONS.INVOICES,
  '/admin/chat': PERMISSIONS.CHAT,
  '/admin/settings': PERMISSIONS.SETTINGS,
  '/admin/autopricer': PERMISSIONS.AUTOPRICER,
}

/**
 * Get required permission for a given admin route
 */
export function getRoutePermission(pathname: string): Permission | null {
  // Handle exact matches first
  if (ROUTE_PERMISSIONS[pathname]) {
    return ROUTE_PERMISSIONS[pathname]
  }

  // Handle sub-routes (e.g., /admin/users/123 -> /admin/users)
  const baseRoute = pathname.match(/^\/admin\/[^/?]+/)?.[0]
  if (baseRoute && ROUTE_PERMISSIONS[baseRoute]) {
    return ROUTE_PERMISSIONS[baseRoute]
  }

  return null
}
