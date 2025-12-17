import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Coffee, Heart, Home, Briefcase, PawPrint, Zap, Shirt, Package, Award } from "lucide-react"
import { Navbar } from "@/components/navbar"

export const metadata = {
  title: "Industries - Product Brands",
  description: "We serve businesses across multiple industries with private label solutions",
}

const industries = [
  { name: "Food & Beverage", icon: Coffee, description: "Coffee, snacks, supplements, beverages" },
  { name: "Beauty & Personal Care", icon: Heart, description: "Skincare, cosmetics, personal care products" },
  { name: "Home & Living", icon: Home, description: "Home goods, cleaning products, decor" },
  { name: "Office & Business", icon: Briefcase, description: "Office supplies, corporate gifts" },
  { name: "Pet Products", icon: PawPrint, description: "Pet food, treats, accessories" },
  { name: "Electronics Accessories", icon: Zap, description: "Cables, cases, tech accessories" },
  { name: "Apparel & Textiles", icon: Shirt, description: "Custom apparel, accessories" },
  { name: "Supplements", icon: Package, description: "Vitamins, protein powders, health supplements" },
  { name: "Candy & Confectionery", icon: Award, description: "Chocolates, candies, sweets" },
]

export default function IndustriesPage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* Hero Section */}
      <section className="bg-gradient-to-b from-blue-50 to-white py-12 md:py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 text-gray-900">
              Industries We Serve
            </h1>
            <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto">
              Category-agnostic private label solutions for any industry
            </p>
          </div>
        </div>
      </section>

      {/* Industries Grid */}
      <section className="py-16 md:py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {industries.map((industry) => {
              const Icon = industry.icon
              return (
                <Card key={industry.name} className="text-center hover:shadow-md transition-shadow cursor-pointer border-2 hover:border-blue-500 bg-white">
                  <CardContent className="p-6">
                    <Icon className="h-12 w-12 mx-auto mb-4 text-gray-600" />
                    <h3 className="font-semibold text-gray-900 mb-2">{industry.name}</h3>
                    <p className="text-sm text-gray-600">{industry.description}</p>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      </section>

      {/* Additional Info */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-gray-900">Don't See Your Industry?</h2>
            <p className="text-lg text-gray-600 mb-8">
              We work across all categories. Contact us to discuss your specific needs.
            </p>
            <Link href="/contact">
              <Button size="lg" className="text-base px-8 py-6 text-black">
                Contact Us
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
