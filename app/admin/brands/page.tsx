"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"
import { Plus, Edit, Trash2, Package, ExternalLink } from "lucide-react"

type Brand = {
  id: string
  name: string
  slug: string
  parentId: string | null
  parent: { id: string; name: string; slug: string } | null
  children: { id: string; name: string; slug: string }[]
  description: string | null
  heroImage: string | null
  sortOrder: number
  _count: { products: number }
}

export default function AdminBrandsPage() {
  const { toast } = useToast()
  const [brands, setBrands] = useState<Brand[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchBrands()
  }, [])

  const fetchBrands = async () => {
    try {
      const res = await fetch("/api/admin/brands")
      if (!res.ok) throw new Error("Failed to fetch brands")
      const data = await res.json()
      setBrands(data)
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"? This will also delete all products under this brand.`)) {
      return
    }

    try {
      const res = await fetch(`/api/admin/brands/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to delete brand")
      
      toast({
        title: "Success",
        description: "Brand deleted successfully",
      })
      fetchBrands()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  // Organize brands into parent/child hierarchy
  const parentBrands = brands.filter(b => !b.parentId)
  const getChildren = (parentId: string) => brands.filter(b => b.parentId === parentId)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading brands...</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Brands</h1>
          <p className="text-muted-foreground">
            Manage your brands and their products for the "Our Brands" section
          </p>
        </div>
        <Link href="/admin/brands/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Brand
          </Button>
        </Link>
      </div>

      {brands.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No brands yet</h3>
            <p className="text-muted-foreground mb-4">
              Get started by creating your first brand
            </p>
            <Link href="/admin/brands/new">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Brand
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {parentBrands.map((brand) => (
            <Card key={brand.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CardTitle className="text-xl">{brand.name}</CardTitle>
                    <Badge variant="outline">/{brand.slug}</Badge>
                    <Badge variant="secondary">{brand._count.products} products</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link href={`/brands/${brand.slug}`} target="_blank">
                      <Button variant="ghost" size="sm">
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </Link>
                    <Link href={`/admin/brands/${brand.id}/products`}>
                      <Button variant="outline" size="sm">
                        <Package className="mr-2 h-4 w-4" />
                        Products
                      </Button>
                    </Link>
                    <Link href={`/admin/brands/${brand.id}`}>
                      <Button variant="outline" size="sm">
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                      </Button>
                    </Link>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(brand.id, brand.name)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
                {brand.description && (
                  <p className="text-sm text-muted-foreground mt-2">{brand.description}</p>
                )}
              </CardHeader>
              
              {/* Child brands */}
              {getChildren(brand.id).length > 0 && (
                <CardContent className="pt-0">
                  <div className="pl-6 border-l-2 border-muted space-y-3">
                    {getChildren(brand.id).map((child) => (
                      <div key={child.id} className="flex items-center justify-between py-2">
                        <div className="flex items-center gap-3">
                          <span className="font-medium">{child.name}</span>
                          <Badge variant="outline" className="text-xs">/{child.slug}</Badge>
                          <Badge variant="secondary" className="text-xs">{child._count.products} products</Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <Link href={`/brands/${child.slug}`} target="_blank">
                            <Button variant="ghost" size="sm">
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Link href={`/admin/brands/${child.id}/products`}>
                            <Button variant="ghost" size="sm">
                              <Package className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Link href={`/admin/brands/${child.id}`}>
                            <Button variant="ghost" size="sm">
                              <Edit className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(child.id, child.name)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
