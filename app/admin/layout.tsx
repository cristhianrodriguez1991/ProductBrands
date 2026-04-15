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
  Menu,
  X,
  Star,
} from "lucide-react"
import Image from "next/image"
import { cn } from "@/lib/utils"

const NAV_ITEMS = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/brands", label: "Brands", icon: Tag },
  { href: "/admin/suppliers?tab=suppliers", label: "Suppliers", icon: Truck },
  { href: "/admin/suppliers?tab=private-labels", label: "Private Labels", icon: Star },
  { href: "/admin/listings", label: "Listings", icon: Package },
  { href: "/admin/quotes", label: "Quotes", icon: FileText },
  { href: "/admin/contact", label: "Contact", icon: Inbox },
  { href: "/admin/clients", label: "Clients", icon: Users },
  { href: "/admin/orders", label: "Orders", icon: Package },
  { href: "/admin/invoices", label: "Invoices", icon: Receipt },
  { href: "/admin/chat", label: "Live Chat", icon: MessageSquare },
  { href: "/admin/settings", label: "Site Settings", icon: Settings },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    if (
      status === "unauthenticated" ||
      (status === "authenticated" && (!session || (session.user as any)?.role !== "ADMIN"))
    ) {
      router.push("/admin-login")
    }
  }, [status, session, router])

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false)
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

  if (!session || (session.user as any)?.role !== "ADMIN") {
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
        "flex flex-col bg-muted/40 border-r",
        mobile
          ? "fixed inset-y-0 left-0 z-50 w-72 shadow-xl"
          : "hidden md:flex w-64 h-screen sticky top-0 flex-shrink-0"
      )}
    >
      {/* Logo */}
      <div className="p-4 border-b flex-shrink-0">
        <div className="mb-1">
          <Image
            src="/images/logo.png"
            alt="Product Brands logo"
            width={180}
            height={60}
            className="object-contain"
            priority
          />
        </div>
        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Admin Panel</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
        {NAV_ITEMS.map(({ href, label, icon: Icon, exact }) => {
          const isActive = exact
            ? pathname === "/admin"
            : pathname.startsWith(href.split("?")[0])
          return (
            <Link key={href} href={href}>
              <Button
                variant={isActive ? "secondary" : "ghost"}
                className="w-full justify-start text-sm h-9"
              >
                <Icon className="mr-2 h-4 w-4 flex-shrink-0" />
                {label}
              </Button>
            </Link>
          )
        })}
      </nav>

      {/* Logout */}
      <div className="p-3 border-t flex-shrink-0">
        <Button
          variant="ghost"
          className="w-full justify-start text-sm h-9 text-red-600 hover:text-red-700 hover:bg-red-50"
          onClick={() => signOut({ callbackUrl: "/" })}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </Button>
      </div>
    </aside>
  )

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop sidebar */}
      <Sidebar />

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      {sidebarOpen && <Sidebar mobile />}

      {/* Main content — this is the ONLY scrollable area on mobile */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile top bar */}
        <header className="md:hidden flex items-center gap-3 px-4 py-3 border-b bg-background flex-shrink-0 sticky top-0 z-30">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-1.5 rounded-md hover:bg-muted transition-colors"
          >
            <Menu className="h-5 w-5" />
          </button>
          <Image
            src="/images/logo.png"
            alt="Product Brands"
            width={120}
            height={40}
            className="object-contain"
            priority
          />
        </header>

        {/* Page content — scrolls independently */}
        <main className="flex-1 overflow-y-auto overscroll-contain p-4 md:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}
