import { getServerSession } from "next-auth"
import { authOptions } from "./auth"
import { UserRole } from "@prisma/client"
import { redirect } from "next/navigation"
import { NextRequest, NextResponse } from "next/server"
import { Permission, hasPermission, hasEffectivePermission, getEffectivePermissions, getRoutePermission } from "./permissions"

/**
 * Admin roles that can access admin portal
 */
export const ADMIN_ROLES: UserRole[] = [
  UserRole.OWNER,
  UserRole.ADMIN,
  UserRole.SALES,
  UserRole.OPS,
  UserRole.SUPPORT,
  UserRole.READONLY,
]

/**
 * Roles that can write/modify data (not readonly)
 */
export const WRITE_ROLES: UserRole[] = [
  UserRole.OWNER,
  UserRole.ADMIN,
  UserRole.SALES,
  UserRole.OPS,
  UserRole.SUPPORT,
]

/**
 * Check if user has admin access
 */
export function hasAdminAccess(role: UserRole | undefined | null): boolean {
  if (!role) return false
  return ADMIN_ROLES.includes(role)
}

/**
 * Check if user can write/modify data
 */
export function canWrite(role: UserRole | undefined | null): boolean {
  if (!role) return false
  return WRITE_ROLES.includes(role)
}

/**
 * Check if user has specific role(s)
 */
export function hasRole(
  userRole: UserRole | undefined | null,
  allowedRoles: UserRole[]
): boolean {
  if (!userRole) return false
  return allowedRoles.includes(userRole)
}

/**
 * Server-side: Require admin session (for pages/components)
 * Throws redirect if not authenticated or not admin
 */
export async function requireAdminSession() {
  const session = await getServerSession(authOptions)
  
  if (!session || !session.user) {
    redirect("/login")
  }

  const role = (session.user as any)?.role as UserRole | undefined
  
  if (!hasAdminAccess(role)) {
    redirect("/login")
  }

  return {
    session,
    user: session.user,
    userId: (session.user as any).id as string,
    role: role!,
  }
}

/**
 * Server-side: Require specific role(s) (for pages/components)
 */
export async function requireRole(allowedRoles: UserRole[]) {
  const { session, user, userId, role } = await requireAdminSession()
  
  if (!hasRole(role, allowedRoles)) {
    redirect("/admin")
  }

  return {
    session,
    user,
    userId,
    role,
  }
}

/**
 * API route: Require admin session (returns NextResponse if unauthorized)
 */
export async function requireAdminApi(req: NextRequest) {
  const session = await getServerSession(authOptions)
  
  if (!session || !session.user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    )
  }

  const role = (session.user as any)?.role as UserRole | undefined
  
  if (!hasAdminAccess(role)) {
    return NextResponse.json(
      { error: "Forbidden: Admin access required" },
      { status: 403 }
    )
  }

  return {
    session,
    user: session.user,
    userId: (session.user as any).id as string,
    role: role!,
  }
}

/**
 * API route: Require specific role(s) (returns NextResponse if unauthorized)
 */
export async function requireRoleApi(req: NextRequest, allowedRoles: UserRole[]) {
  const auth = await requireAdminApi(req)
  
  if (auth instanceof NextResponse) {
    return auth
  }

  if (!hasRole(auth.role, allowedRoles)) {
    return NextResponse.json(
      { error: `Forbidden: Requires one of: ${allowedRoles.join(", ")}` },
      { status: 403 }
    )
  }

  return auth
}

/**
 * API route: Require write access (not readonly)
 */
export async function requireWriteAccess(req: NextRequest) {
  const auth = await requireAdminApi(req)

  if (auth instanceof NextResponse) {
    return auth
  }

  if (!canWrite(auth.role)) {
    return NextResponse.json(
      { error: "Forbidden: Write access required" },
      { status: 403 }
    )
  }

  return auth
}

/**
 * Server-side: Require specific permission for pages/components
 */
export async function requirePermission(permission: Permission) {
  const { session, user, userId, role } = await requireAdminSession()

  const userCustomPermissions = (user as any).customPermissions || []
  if (!hasEffectivePermission(role, userCustomPermissions, permission)) {
    redirect("/admin/access-denied")
  }

  return {
    session,
    user,
    userId,
    role,
  }
}

/**
 * Server-side: Require any of multiple permissions
 */
export async function requireAnyPermission(permissions: Permission[]) {
  const { session, user, userId, role } = await requireAdminSession()

  const userCustomPermissions = (user as any).customPermissions || []
  const hasAny = permissions.some(p => hasEffectivePermission(role, userCustomPermissions, p))

  if (!hasAny) {
    redirect("/admin/access-denied")
  }

  return {
    session,
    user,
    userId,
    role,
  }
}

/**
 * API route: Require specific permission
 */
export async function requirePermissionApi(req: NextRequest, permission: Permission) {
  const auth = await requireAdminApi(req)

  if (auth instanceof NextResponse) {
    return auth
  }

  const userCustomPermissions = (auth.user as any).customPermissions || []
  if (!hasEffectivePermission(auth.role, userCustomPermissions, permission)) {
    return NextResponse.json(
      { error: `Forbidden: Requires ${permission} permission` },
      { status: 403 }
    )
  }

  return auth
}

/**
 * API route: Check permission based on route
 */
export async function requireRoutePermission(req: NextRequest) {
  const auth = await requireAdminApi(req)

  if (auth instanceof NextResponse) {
    return auth
  }

  const pathname = req.nextUrl.pathname
  const requiredPermission = getRoutePermission(pathname)

  if (!requiredPermission) {
    // No specific permission required, allow admin access
    return auth
  }

  const userCustomPermissions = (auth.user as any).customPermissions || []
  if (!hasEffectivePermission(auth.role, userCustomPermissions, requiredPermission)) {
    return NextResponse.json(
      { error: `Forbidden: Requires ${requiredPermission} permission` },
      { status: 403 }
    )
  }

  return auth
}

/**
 * Get user's effective permissions (for API responses)
 */
export function getUserPermissions(role: UserRole, customPermissions: string[] = []): Permission[] {
  return getEffectivePermissions(role, customPermissions)
}
