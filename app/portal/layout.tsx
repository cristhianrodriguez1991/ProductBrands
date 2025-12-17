"use client"

import { useSession, signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  LayoutDashboard,
  FileText,
  Package,
  MessageSquare,
  Receipt,
  Settings,
  LogOut,
} from "lucide-react"

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { data: session, status } = useSession()
  const router = useRouter()

  if (status === "loading") {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  }

  if (!session) {
    router.push("/login")
    return null
  }

  const isAdmin = (session.user as any)?.role === "ADMIN"

  return (
    <div className="min-h-screen flex">
      <aside className="w-64 border-r bg-muted/40 p-4">
        <div className="mb-8">
          <h2 className="text-xl font-bold">Product Brands</h2>
          <p className="text-sm text-muted-foreground">Client Portal</p>
        </div>
        <nav className="space-y-2">
          <Link href="/portal">
            <Button variant="ghost" className="w-full justify-start">
              <LayoutDashboard className="mr-2 h-4 w-4" />
              Dashboard
            </Button>
          </Link>
          <Link href="/portal/quotes">
            <Button variant="ghost" className="w-full justify-start">
              <FileText className="mr-2 h-4 w-4" />
              Quotes
            </Button>
          </Link>
          <Link href="/portal/orders">
            <Button variant="ghost" className="w-full justify-start">
              <Package className="mr-2 h-4 w-4" />
              Orders
            </Button>
          </Link>
          <Link href="/portal/messages">
            <Button variant="ghost" className="w-full justify-start">
              <MessageSquare className="mr-2 h-4 w-4" />
              Messages
            </Button>
          </Link>
          <Link href="/portal/invoices">
            <Button variant="ghost" className="w-full justify-start">
              <Receipt className="mr-2 h-4 w-4" />
              Invoices
            </Button>
          </Link>
          <Link href="/portal/account">
            <Button variant="ghost" className="w-full justify-start">
              <Settings className="mr-2 h-4 w-4" />
              Account
            </Button>
          </Link>
          {isAdmin && (
            <Link href="/admin">
              <Button variant="ghost" className="w-full justify-start">
                <Settings className="mr-2 h-4 w-4" />
                Admin Panel
              </Button>
            </Link>
          )}
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

