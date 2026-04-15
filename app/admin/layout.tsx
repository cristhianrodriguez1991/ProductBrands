"use client"

import { useSession, signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
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
  Building2,
  Tag,
  Inbox,
  Truck,
} from "lucide-react"

import Image from "next/image"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === "unauthenticated" || (status === "authenticated" && (!session || (session.user as any)?.role !== "ADMIN"))) {
      router.push("/admin-login")
    }
  }, [status, session, router])

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (!session || (session.user as any)?.role !== "ADMIN") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="text-muted-foreground">Redirecting...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex">
      <aside className="w-64 border-r bg-muted/40 p-4">
        <div className="mb-8">
          <div className="mb-3">
            <Image
              src="/images/logo.png"
              alt="Product Brands logo"
              width={140}
              height={48}
              className="object-contain"
              priority
            />
          </div>
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Admin Panel</p>
        </div>
        <nav className="space-y-2">
          <Link href="/admin">
            <Button variant="ghost" className="w-full justify-start">
              <LayoutDashboard className="mr-2 h-4 w-4" />
              Dashboard
            </Button>
          </Link>
          <Link href="/admin/users">
            <Button variant="ghost" className="w-full justify-start">
              <Users className="mr-2 h-4 w-4" />
              Users
            </Button>
          </Link>
          <Link href="/admin/brands">
            <Button variant="ghost" className="w-full justify-start">
              <Tag className="mr-2 h-4 w-4" />
              Brands
            </Button>
          </Link>
          <Link href="/admin/suppliers">
            <Button variant="ghost" className="w-full justify-start">
              <Truck className="mr-2 h-4 w-4" />
              Suppliers
            </Button>
          </Link>
          <Link href="/admin/listings">
            <Button variant="ghost" className="w-full justify-start">
              <Package className="mr-2 h-4 w-4" />
              Listings
            </Button>
          </Link>
          <Link href="/admin/quotes">
            <Button variant="ghost" className="w-full justify-start">
              <FileText className="mr-2 h-4 w-4" />
              Quotes
            </Button>
          </Link>
          <Link href="/admin/contact">
            <Button variant="ghost" className="w-full justify-start">
              <Inbox className="mr-2 h-4 w-4" />
              Contact
            </Button>
          </Link>
          <Link href="/admin/clients">
            <Button variant="ghost" className="w-full justify-start">
              <Users className="mr-2 h-4 w-4" />
              Clients
            </Button>
          </Link>
          <Link href="/admin/orders">
            <Button variant="ghost" className="w-full justify-start">
              <Package className="mr-2 h-4 w-4" />
              Orders
            </Button>
          </Link>
          <Link href="/admin/invoices">
            <Button variant="ghost" className="w-full justify-start">
              <Receipt className="mr-2 h-4 w-4" />
              Invoices
            </Button>
          </Link>
          <Link href="/admin/chat">
            <Button variant="ghost" className="w-full justify-start">
              <MessageSquare className="mr-2 h-4 w-4" />
              Live Chat
            </Button>
          </Link>
          <Link href="/admin/settings">
            <Button variant="ghost" className="w-full justify-start">
              <Settings className="mr-2 h-4 w-4" />
              Site Settings
            </Button>
          </Link>
          <Button
            variant="ghost"
            className="w-full justify-start"
            onClick={() => signOut({ callbackUrl: "/" })}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </nav>
      </aside>
      <main className="flex-1 p-8">{children}</main>
    </div>
  )
}

