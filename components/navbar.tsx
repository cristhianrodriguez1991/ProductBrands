"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Logo } from "@/components/logo"
import { OurBrandsMenu } from "@/components/our-brands-menu"
import { Menu, X } from "lucide-react"

export function Navbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  return (
    <nav className="border-b bg-white sticky top-0 z-50 shadow-sm w-full">
      <div className="w-full px-4 md:px-6 lg:px-8 xl:px-12 2xl:px-16 py-3 md:py-4 flex items-center justify-between">
        <div className="flex-shrink-0">
          <Logo />
        </div>
        
        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-6">
          <Link
            href="/"
            className="text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors"
          >
            Home
          </Link>

          {/* Our Brands mega menu */}
          <OurBrandsMenu />

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
          <Link href="/portal">
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

        {/* Mobile Menu Button */}
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="md:hidden p-2 rounded-md text-gray-700 hover:bg-gray-100 transition-colors"
          aria-label="Toggle menu"
        >
          {isMobileMenuOpen ? (
            <X className="h-6 w-6" />
          ) : (
            <Menu className="h-6 w-6" />
          )}
        </button>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t bg-white w-full">
          <div className="w-full px-4 md:px-6 lg:px-8 xl:px-12 2xl:px-16 py-4 space-y-3">
            <Link
              href="/"
              onClick={() => setIsMobileMenuOpen(false)}
              className="block text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors py-2"
            >
              Home
            </Link>
            
            <Link
              href="/brands"
              onClick={() => setIsMobileMenuOpen(false)}
              className="block text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors py-2"
            >
              Our Brands
            </Link>

            <Link
              href="/services"
              onClick={() => setIsMobileMenuOpen(false)}
              className="block text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors py-2"
            >
              Private Label
            </Link>
            <Link
              href="/process"
              onClick={() => setIsMobileMenuOpen(false)}
              className="block text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors py-2"
            >
              About Us
            </Link>
            <Link
              href="/contact"
              onClick={() => setIsMobileMenuOpen(false)}
              className="block text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors py-2"
            >
              Contact
            </Link>
            <div className="pt-2 space-y-2 border-t">
              <Link href="/portal" onClick={() => setIsMobileMenuOpen(false)}>
                <Button variant="outline" size="sm" className="w-full text-xs">
                  Client Portal
                </Button>
              </Link>
              <Link href="/quote" onClick={() => setIsMobileMenuOpen(false)}>
                <Button size="sm" className="w-full text-xs">
                  Get a Quote
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}


