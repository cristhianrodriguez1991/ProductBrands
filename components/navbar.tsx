import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Logo } from "@/components/logo"
import { OurBrandsMenu } from "@/components/our-brands-menu"

export function Navbar() {
  return (
    <nav className="border-b bg-white sticky top-0 z-50 shadow-sm">
      <div className="container mx-auto px-4 py-3 md:py-4 flex items-center justify-between">
        <div className="flex-shrink-0">
          <Logo />
        </div>
        <div className="hidden md:flex items-center gap-8">
          <Link
            href="/services"
            className="text-sm font-medium text-gray-700 hover:text-amber-600 transition-colors"
          >
            Capabilities
          </Link>
          <OurBrandsMenu />
          <Link
            href="/industries"
            className="text-sm font-medium text-gray-700 hover:text-amber-600 transition-colors"
          >
            Industries
          </Link>
          <Link
            href="/process"
            className="text-sm font-medium text-gray-700 hover:text-amber-600 transition-colors"
          >
            Process
          </Link>
          <Link
            href="/process"
            className="text-sm font-medium text-gray-700 hover:text-amber-600 transition-colors"
          >
            About
          </Link>
          <Link
            href="/contact"
            className="text-sm font-medium text-gray-700 hover:text-amber-600 transition-colors"
          >
            Contact
          </Link>
          <div className="flex items-center gap-3 ml-4">
            <Link href="/contact">
              <Button variant="outline" size="sm" className="text-xs border-gray-300 hover:border-amber-600 hover:text-amber-600">
                Download Catalog
              </Button>
            </Link>
            <Link href="/quote">
              <Button size="sm" className="text-xs bg-amber-600 hover:bg-amber-700 text-white">
                Get a Quote
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </nav>
  )
}


