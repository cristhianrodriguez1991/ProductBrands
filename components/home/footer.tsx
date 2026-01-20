"use client"

import Link from "next/link"
import { Shield, Award, CheckCircle } from "lucide-react"

export function HomeFooter() {
  return (
    <footer className="border-t bg-white">
      <div className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          {/* Company Info */}
          <div>
            <h3 className="font-bold text-lg mb-4 text-gray-900">ProductBrands</h3>
            <p className="text-sm text-gray-600 leading-relaxed mb-4">
              Private label manufacturer and supplier. We help you launch and scale your brand with quality products, packaging, and fulfillment.
            </p>
            {/* Certifications */}
            <div className="flex flex-wrap gap-2 mt-4">
              <div className="inline-flex items-center gap-1 px-2 py-1 bg-gray-50 rounded text-xs text-gray-600">
                <Shield className="h-3 w-3" />
                FDA Compliant
              </div>
              <div className="inline-flex items-center gap-1 px-2 py-1 bg-gray-50 rounded text-xs text-gray-600">
                <Award className="h-3 w-3" />
                ISO Certified
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold mb-4 text-gray-900">Capabilities</h4>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>
                <Link href="/services" className="hover:text-amber-600 transition-colors">
                  Private Label
                </Link>
              </li>
              <li>
                <Link href="/services" className="hover:text-amber-600 transition-colors">
                  Contract Manufacturing
                </Link>
              </li>
              <li>
                <Link href="/services" className="hover:text-amber-600 transition-colors">
                  Packaging & Design
                </Link>
              </li>
              <li>
                <Link href="/services" className="hover:text-amber-600 transition-colors">
                  Fulfillment
                </Link>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="font-semibold mb-4 text-gray-900">Company</h4>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>
                <Link href="/process" className="hover:text-amber-600 transition-colors">
                  Our Process
                </Link>
              </li>
              <li>
                <Link href="/brands" className="hover:text-amber-600 transition-colors">
                  Our Brands
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-amber-600 transition-colors">
                  Contact
                </Link>
              </li>
              <li>
                <Link href="/faq" className="hover:text-amber-600 transition-colors">
                  FAQ
                </Link>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="font-semibold mb-4 text-gray-900">Get Started</h4>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>
                <Link href="/quote" className="hover:text-amber-600 transition-colors">
                  Get a Quote
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-amber-600 transition-colors">
                  Request Catalog
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-amber-600 transition-colors">
                  Terms
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-amber-600 transition-colors">
                  Privacy
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t text-center text-sm text-gray-500">
          © {new Date().getFullYear()} ProductBrands. All rights reserved.
        </div>
      </div>
    </footer>
  )
}
