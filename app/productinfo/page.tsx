import { prisma } from "@/lib/prisma"
import Link from "next/link"
import Image from "next/image"
import { ChevronRight } from "lucide-react"

export default async function ProductInfoCatalogPage() {
  const products = await prisma.infoProduct.findMany({
    where: { isActive: true },
    orderBy: { createdAt: "desc" }
  })

  return (
    <div className="min-h-screen bg-gray-50 pt-24 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-gray-900">
            Product <span className="text-primary">Catalog</span>
          </h1>
          <p className="mt-4 max-w-2xl mx-auto text-xl text-muted-foreground">
            Explore our curated selection of premium products.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {products.map((product) => (
            <Link key={product.id} href={`/productinfo/${product.slug}`} className="group">
              <div className="bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden border">
                <div className="aspect-[4/3] bg-muted relative overflow-hidden">
                  {product.mediaUrls && product.mediaUrls.length > 0 ? (
                    <Image
                      src={product.mediaUrls[0]}
                      alt={product.name}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground font-medium">
                      No Image Available
                    </div>
                  )}
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-bold text-gray-900 group-hover:text-primary transition-colors">
                    {product.name}
                  </h3>
                  {product.tagline && (
                    <p className="text-sm font-medium text-primary mt-1">{product.tagline}</p>
                  )}
                  {product.description && (
                    <p className="mt-3 text-muted-foreground line-clamp-2 text-sm">
                      {product.description}
                    </p>
                  )}
                  <div className="mt-6 flex items-center text-sm font-semibold text-primary">
                    Learn more
                    <ChevronRight className="ml-1 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </div>
            </Link>
          ))}

          {products.length === 0 && (
            <div className="col-span-full py-20 text-center text-muted-foreground">
              <p className="text-lg">No products available at the moment.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
