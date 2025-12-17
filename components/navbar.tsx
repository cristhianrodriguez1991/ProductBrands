import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Logo } from "@/components/logo"

export function Navbar() {
  return (
    <nav className="border-b bg-white sticky top-0 z-50 shadow-sm">
      <div className="container mx-auto px-4 py-3 md:py-4 flex items-center justify-between">
        <div className="flex-shrink-0">
          <Logo />
        </div>
        <div className="hidden md:flex items-center gap-6">
          <Link
            href="/"
            className="text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors"
          >
            Home
          </Link>
          <Link
            href="/services"
            className="text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors"
          >
            Private Label
          </Link>
          <Link
            href="/process"
            className="text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors"
          >
            About Us
          </Link>
          <Link
            href="/contact"
            className="text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors"
          >
            Contact
          </Link>
          <Link href="/login">
            <Button variant="outline" size="sm" className="text-xs">
              Client Portal
            </Button>
          </Link>
          <Link href="/quote">
            <Button size="sm" className="text-xs">
              Get a Quote
            </Button>
          </Link>
        </div>
      </div>
    </nav>
  )
}


