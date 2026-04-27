import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"
import { UserRole } from "@prisma/client"
import { ADMIN_ROLES, hasAdminAccess } from "@/lib/rbac"
import { getRoutePermission, PERMISSIONS } from "@/lib/permissions"

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const userRole = token?.role as UserRole | undefined
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
        // Get user's effective permissions (token doesn't have customPermissions,
        // so we check role-based permissions only at middleware level)
        const rolePermissions = getRolePermissionsForToken(userRole)

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

// Helper function to get permissions based on role (middleware context doesn't have customPermissions)
function getRolePermissionsForToken(role: UserRole | undefined): string[] {
  if (!role) return []

  // OWNER and ADMIN get all permissions
  if (role === UserRole.OWNER || role === UserRole.ADMIN) {
    return Object.values(PERMISSIONS)
  }

  // SALES permissions
  if (role === UserRole.SALES) {
    return [
      PERMISSIONS.DASHBOARD,
      PERMISSIONS.QUOTES,
      PERMISSIONS.CLIENTS,
      PERMISSIONS.ORDERS,
      PERMISSIONS.CONTACT,
      PERMISSIONS.CHAT,
    ]
  }

  // OPS permissions
  if (role === UserRole.OPS) {
    return [
      PERMISSIONS.DASHBOARD,
      PERMISSIONS.FBA_SHIPMENTS,
      PERMISSIONS.WAREHOUSE,
      PERMISSIONS.INVENTORY,
      PERMISSIONS.MACHINES,
      PERMISSIONS.CLEANING_LOGS,
      PERMISSIONS.SUPPLIERS,
    ]
  }

  // SUPPORT permissions
  if (role === UserRole.SUPPORT) {
    return [
      PERMISSIONS.DASHBOARD,
      PERMISSIONS.CONTACT,
      PERMISSIONS.CHAT,
      PERMISSIONS.ORDERS,
      PERMISSIONS.CLIENTS,
    ]
  }

  // READONLY permissions
  if (role === UserRole.READONLY) {
    return [PERMISSIONS.DASHBOARD]
  }

  // CUSTOMER has no admin permissions
  return []
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
