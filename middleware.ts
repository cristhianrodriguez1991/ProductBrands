import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

// Edge-compatible role constants (inlined to avoid importing @prisma/client)
const ADMIN_ROLES = ["OWNER", "ADMIN", "SALES", "OPS", "SUPPORT", "READONLY"] as const

// Permission constants (inlined to avoid importing @/lib/permissions which imports @prisma/client)
const PERMISSIONS = {
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
} as const

// Route-to-permission mapping (inlined)
const ROUTE_PERMISSIONS: Record<string, string> = {
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
}

// Role-to-permissions mapping (inlined)
const ROLE_PERMISSIONS: Record<string, string[]> = {
  OWNER: Object.values(PERMISSIONS),
  ADMIN: Object.values(PERMISSIONS),
  SALES: [
    PERMISSIONS.DASHBOARD,
    PERMISSIONS.QUOTES,
    PERMISSIONS.CLIENTS,
    PERMISSIONS.ORDERS,
    PERMISSIONS.CONTACT,
    PERMISSIONS.CHAT,
  ],
  OPS: [
    PERMISSIONS.DASHBOARD,
    PERMISSIONS.FBA_SHIPMENTS,
    PERMISSIONS.WAREHOUSE,
    PERMISSIONS.INVENTORY,
    PERMISSIONS.MACHINES,
    PERMISSIONS.CLEANING_LOGS,
    PERMISSIONS.SUPPLIERS,
  ],
  SUPPORT: [
    PERMISSIONS.DASHBOARD,
    PERMISSIONS.CONTACT,
    PERMISSIONS.CHAT,
    PERMISSIONS.ORDERS,
    PERMISSIONS.CLIENTS,
  ],
  READONLY: [PERMISSIONS.DASHBOARD],
  CUSTOMER: [],
}

function hasAdminAccess(role: string | undefined | null): boolean {
  if (!role) return false
  return ADMIN_ROLES.includes(role as any)
}

function getRoutePermission(pathname: string): string | null {
  if (ROUTE_PERMISSIONS[pathname]) {
    return ROUTE_PERMISSIONS[pathname]
  }
  const baseRoute = pathname.match(/^\/admin\/[^/?]+/)?.[0]
  if (baseRoute && ROUTE_PERMISSIONS[baseRoute]) {
    return ROUTE_PERMISSIONS[baseRoute]
  }
  return null
}

function getRolePermissions(role: string | undefined): string[] {
  if (!role) return []
  return ROLE_PERMISSIONS[role] || []
}

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const userRole = token?.role as string | undefined
    const isAuth = !!token
    const pathname = req.nextUrl.pathname

    // Skip middleware for login pages and public routes
    if (
      pathname === "/admin-login" ||
      pathname === "/login" ||
      pathname === "/register" ||
      pathname === "/" ||
      pathname.startsWith("/api") ||
      pathname.startsWith("/services") ||
      pathname.startsWith("/brands") ||
      pathname.startsWith("/industries") ||
      pathname.startsWith("/process") ||
      pathname.startsWith("/pricing") ||
      pathname.startsWith("/faq") ||
      pathname.startsWith("/contact") ||
      pathname.startsWith("/terms") ||
      pathname.startsWith("/privacy") ||
      pathname.startsWith("/quote")
    ) {
      return NextResponse.next()
    }

    // Admin routes - check admin access and permissions
    if (pathname.startsWith("/admin")) {
      // Not authenticated or not an admin role - redirect to admin login
      if (!isAuth || !hasAdminAccess(userRole)) {
        return NextResponse.redirect(new URL("/admin-login", req.url))
      }

      // Skip permission check for access-denied page itself
      if (pathname === "/admin/access-denied") {
        return NextResponse.next()
      }

      // Check if user has permission for this route
      const requiredPermission = getRoutePermission(pathname)

      if (requiredPermission) {
        const rolePermissions = getRolePermissions(userRole)

        if (!rolePermissions.includes(requiredPermission)) {
          return NextResponse.redirect(new URL("/admin/access-denied", req.url))
        }
      }
    }

    // Portal routes - clients only
    if (pathname.startsWith("/portal")) {
      if (!isAuth) {
        return NextResponse.redirect(new URL("/login", req.url))
      }
      // Block admins from client portal
      if (hasAdminAccess(userRole)) {
        return NextResponse.redirect(new URL("/admin", req.url))
      }
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      // Always return true - we handle all redirects manually in the middleware function above
      authorized: () => true,
    },
  }
)

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
