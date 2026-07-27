"use client"

import { useSession, signOut } from "next-auth/react"
import { useRouter, usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  LayoutDashboard,
  Users,
  FileText,
  Package,
  Receipt,
  Settings,
  LogOut,
  MessageSquare,
  Tag,
  Inbox,
  Truck,
  Ship,
  Menu,
  X,
  Cpu,
  ClipboardCheck,
  MapPin,
  Boxes,
  TrendingUp,
} from "lucide-react"
import Image from "next/image"
import { cn } from "@/lib/utils"
import { UserRole } from "@prisma/client"
import { PERMISSIONS, Permission, getEffectivePermissions } from "@/lib/permissions"

interface NavItem {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  exact?: boolean
  permission: Permission
}

const NAV_ITEMS: NavItem[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true, permission: PERMISSIONS.DASHBOARD },
  { href: "/admin/users", label: "Users", icon: Users, permission: PERMISSIONS.USERS },
  { href: "/admin/brands", label: "Brands", icon: Tag, permission: PERMISSIONS.BRANDS },
  { href: "/admin/suppliers", label: "Suppliers", icon: Truck, permission: PERMISSIONS.SUPPLIERS },
  { href: "/admin/fba-shipments", label: "FBA Shipments", icon: Ship, permission: PERMISSIONS.FBA_SHIPMENTS },
  { href: "/admin/machines", label: "Machine Setup", icon: Cpu, permission: PERMISSIONS.MACHINES },
  { href: "/admin/warehouse", label: "Warehouse Map", icon: MapPin, permission: PERMISSIONS.WAREHOUSE },
  { href: "/admin/inventory", label: "Inventory", icon: Boxes, permission: PERMISSIONS.INVENTORY },
  { href: "/admin/cleaning-logs", label: "Clean Logs", icon: ClipboardCheck, permission: PERMISSIONS.CLEANING_LOGS },
  { href: "/admin/listings", label: "Listings", icon: Package, permission: PERMISSIONS.LISTINGS },
  { href: "/admin/quotes", label: "Quotes", icon: FileText, permission: PERMISSIONS.QUOTES },
  { href: "/admin/contact", label: "Contact", icon: Inbox, permission: PERMISSIONS.CONTACT },
  { href: "/admin/clients", label: "Clients", icon: Users, permission: PERMISSIONS.CLIENTS },
  { href: "/admin/orders", label: "Orders", icon: Package, permission: PERMISSIONS.ORDERS },
  { href: "/admin/invoices", label: "Invoices", icon: Receipt, permission: PERMISSIONS.INVOICES },
  { href: "/admin/chat", label: "Live Chat", icon: MessageSquare, permission: PERMISSIONS.CHAT },
  { href: "/admin/autopricer", label: "Autopricer", icon: TrendingUp, permission: PERMISSIONS.AUTOPRICER },
  { href: "/admin/settings", label: "Site Settings", icon: Settings, permission: PERMISSIONS.SETTINGS },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [desktopCollapsed, setDesktopCollapsed] = useState(false)

  const userRole = (session?.user as any)?.role as UserRole | undefined
  const customPermissions = (session?.user as any)?.customPermissions || []
  const userPermissions = getEffectivePermissions(userRole, customPermissions)

  useEffect(() => {
    if (
      status === "unauthenticated" ||
      (status === "authenticated" && (!session || !userRole || !getEffectivePermissions(userRole, customPermissions).includes(PERMISSIONS.DASHBOARD)))
    ) {
      router.push("/admin-login")
    }
  }, [status, session, router, userRole, customPermissions])

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileSidebarOpen(false)
  }, [pathname])

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (!session || !userRole || !getEffectivePermissions(userRole, customPermissions).includes(PERMISSIONS.DASHBOARD)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
          <p className="text-muted-foreground">Redirecting...</p>
        </div>
      </div>
    )
  }

  const Sidebar = ({ mobile = false }) => (
    <aside
      className={cn(
        "flex flex-col border-r transition-all duration-300 ease-in-out",
        mobile
          ? "fixed inset-y-0 left-0 z-50 w-72 shadow-xl bg-white dark:bg-gray-950"
          : cn(
              "hidden md:flex h-screen sticky top-0 flex-shrink-0 bg-muted/40",
              desktopCollapsed ? "w-20" : "w-64"
            )
      )}
    >
      {/* Sidebar Header */}
      <div className={cn(
        "p-4 border-b flex-shrink-0 flex items-center justify-center",
      )}>
        {(!desktopCollapsed || mobile) ? (
          <div className="overflow-hidden">
            <div className="mb-0.5">
              <Image
                src="/images/logo.png"
                alt="Product Brands logo"
                width={140}
                height={50}
                className="object-contain"
                priority
              />
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center">
            <Image
              src="/images/favicon.png"
              alt="Logo"
              width={40}
              height={40}
              className="object-contain"
              priority
            />
          </div>
        )}
        
        {mobile && (
          <button
            onClick={() => setMobileSidebarOpen(false)}
            className="absolute right-4 p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {!desktopCollapsed || mobile ? (
        <div className="px-4 py-2 border-b bg-muted/20">
          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Admin Panel</p>
        </div>
      ) : (
        <div className="py-2 border-b bg-muted/20 flex justify-center">
          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Adm</p>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {NAV_ITEMS
          .filter(({ permission }) => userPermissions.includes(permission))
          .map(({ href, label, icon: Icon, exact }) => {
            const isActive = exact
              ? pathname === "/admin"
              : pathname.startsWith(href.split("?")[0])

            return (
              <Link key={href} href={href}>
                <Button
                  variant={isActive ? "secondary" : "ghost"}
                  className={cn(
                    "w-full text-sm h-10 transition-all",
                    !mobile && desktopCollapsed ? "justify-center px-0" : "justify-start"
                  )}
                  title={!mobile && desktopCollapsed ? label : ""}
                >
                  <Icon className={cn("h-4 w-4 flex-shrink-0", (!mobile && desktopCollapsed) ? "" : "mr-3")} />
                  {(!mobile && !desktopCollapsed) && (
                    <span className="truncate">{label}</span>
                  )}
                  {mobile && (
                    <span className="truncate">{label}</span>
                  )}
                </Button>
              </Link>
            )
          })}
      </nav>

      {/* Bottom Actions */}
      <div className="p-3 border-t flex-shrink-0 space-y-1">
        {!mobile && (
          <Button
            variant="ghost"
            className={cn(
              "w-full text-sm h-10 transition-all text-muted-foreground",
              desktopCollapsed ? "justify-center px-0" : "justify-start"
            )}
            onClick={() => setDesktopCollapsed(!desktopCollapsed)}
            title={desktopCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <Menu className={cn("h-4 w-4 flex-shrink-0", desktopCollapsed ? "" : "mr-3")} />
            {!desktopCollapsed && <span>Collapse Sidebar</span>}
          </Button>
        )}

        <Button
          variant="ghost"
          className={cn(
            "w-full text-sm h-10 text-red-600 hover:text-red-700 hover:bg-red-50 transition-all",
            !mobile && desktopCollapsed ? "justify-center px-0" : "justify-start"
          )}
          onClick={() => signOut({ callbackUrl: "/" })}
          title={!mobile && desktopCollapsed ? "Logout" : ""}
        >
          <LogOut className={cn("h-4 w-4", (!mobile && desktopCollapsed) ? "" : "mr-3")} />
          {(!mobile && !desktopCollapsed) && <span>Logout</span>}
          {mobile && <span>Logout</span>}
        </Button>
      </div>
    </aside>
  )

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop sidebar */}
      <Sidebar />

      {/* Mobile overlay */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden animate-in fade-in duration-300"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      {mobileSidebarOpen && <Sidebar mobile />}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile top bar */}
        <header className="md:hidden flex items-center justify-between px-4 py-3 border-b bg-background flex-shrink-0 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="p-1.5 rounded-md hover:bg-muted transition-colors"
            >
              <Menu className="h-5 w-5" />
            </button>
            <Image
              src="/images/logo.png"
              alt="Product Brands"
              width={110}
              height={40}
              className="object-contain"
              priority
            />
          </div>
        </header>

        {/* Page content */}
        <main
          className="flex-1 overflow-y-auto overscroll-contain p-4 md:p-8 pb-24 md:pb-8"
          style={{ paddingBottom: "max(6rem, calc(2rem + env(safe-area-inset-bottom, 0px)))" }}
        >
          {children}
        </main>
      </div>
    </div>
  )
}
