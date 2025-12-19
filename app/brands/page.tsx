import Link from "next/link"
import { Navbar } from "@/components/navbar"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Coffee, ShoppingBag } from "lucide-react"

export const metadata = {
  title: "Our Brands - Product Brands",
  description: "Explore our core private label brands across coffee, snacks, and candy.",
}

export default function BrandsIndexPage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* Hero */}
      <section className="bg-gradient-to-b from-blue-50 to-white py-12 md:py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 text-gray-900">
              Our Brands
            </h1>
            <p className="text-lg md:text-xl text-gray-600">
              A focused portfolio of private label programs you can plug into your business and
              scale on Amazon, retail, and wholesale channels.
            </p>
          </div>
        </div>
      </section>

      {/* Brand cards */}
      <section className="py-16 md:py-20 bg-white">
        <div className="container mx-auto px-4 max-w-5xl grid grid-cols-1 md:grid-cols-3 gap-8">
          <Link href="/brands/way-coffee">
            <Card className="h-full cursor-pointer hover:shadow-lg transition-shadow border-2 hover:border-blue-500">
              <CardHeader className="text-center pb-3">
                <div className="h-16 w-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Coffee className="h-8 w-8 text-blue-600" />
                </div>
                <CardTitle className="text-lg">WAY Coffee</CardTitle>
                <CardDescription className="text-sm">
                  Specialty coffees for cafés, offices, and retail.
                </CardDescription>
              </CardHeader>
              <CardContent className="text-xs text-gray-600 text-center">
                Click to see product details and Amazon link.
              </CardContent>
            </Card>
          </Link>

          <Link href="/brands/office-roast">
            <Card className="h-full cursor-pointer hover:shadow-lg transition-shadow border-2 hover:border-blue-500">
              <CardHeader className="text-center pb-3">
                <div className="h-16 w-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Coffee className="h-8 w-8 text-blue-600" />
                </div>
                <CardTitle className="text-lg">Office Roast</CardTitle>
                <CardDescription className="text-sm">
                  Workplace and hospitality coffee programs.
                </CardDescription>
              </CardHeader>
              <CardContent className="text-xs text-gray-600 text-center">
                Click to see product details and Amazon link.
              </CardContent>
            </Card>
          </Link>

          <Link href="/brands/way-snacks">
            <Card className="h-full cursor-pointer hover:shadow-lg transition-shadow border-2 hover:border-blue-500">
              <CardHeader className="text-center pb-3">
                <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <ShoppingBag className="h-8 w-8 text-green-600" />
                </div>
                <CardTitle className="text-lg">WAY Snacks</CardTitle>
                <CardDescription className="text-sm">
                  Modern snack lines for retail, vending, and online.
                </CardDescription>
              </CardHeader>
              <CardContent className="text-xs text-gray-600 text-center">
                Click to see product details and Amazon link.
              </CardContent>
            </Card>
          </Link>

        </div>
      </section>
    </div>
  )
}


