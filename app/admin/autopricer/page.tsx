import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { PERMISSIONS, hasEffectivePermission } from "@/lib/permissions"
import AutopricerClient from "./client-page"

export const dynamic = "force-dynamic"

export default async function AutopricerPage() {
  const session = await getServerSession(authOptions)
  const userRole = (session?.user as any)?.role
  const customPermissions = (session?.user as any)?.customPermissions || []

  if (!session || !hasEffectivePermission(userRole, customPermissions, PERMISSIONS.AUTOPRICER)) {
    redirect("/admin-login")
  }

  return <AutopricerClient />
}
