"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import { ArrowLeft, Save, Package } from "lucide-react"

type Brand = {
  id: string
  name: string
  slug: string
  parentId: string | null
}

export default function EditBrandPage() {
  const router = useRouter()
  const params = useParams()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [brands, setBrands] = useState<Brand[]>([])
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    parentId: "",
    description: "",
    heroImage: "",
    sortOrder: "0",
  })

  useEffect(() => {
    if (params.id) {
      fetchBrand()
      fetchBrands()
    }
  }, [params.id])

  const fetchBrand = async () => {
    try {
      const res = await fetch(`/api/admin/brands/${params.id}`)
      if (!res.ok) throw new Error("Failed to fetch brand")
      const data = await res.json()
      setFormData({
        name: data.name || "",
        slug: data.slug || "",
        parentId: data.parentId || "",
        description: data.description || "",
        heroImage: data.heroImage || "",
        sortOrder: data.sortOrder?.toString() || "0",
      })
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  const fetchBrands = async () => {
    try {
      const res = await fetch("/api/admin/brands")
      if (res.ok) {
        const data = await res.json()
        // Filter out current brand and its children
        setBrands(data.filter((b: any) => b.id !== params.id && !b.parentId))
      }
    } catch (error) {
      console.error("Error fetching brands:", error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const payload = {
        name: formData.name,
        slug: formData.slug,
        parentId: formData.parentId || null,
        description: formData.description || null,
        heroImage: formData.heroImage || null,
        sortOrder: parseInt(formData.sortOrder) || 0,
      }

      const res = await fetch(`/api/admin/brands/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || "Failed to update brand")
      }

      toast({
        title: "Success",
        description: "Brand updated successfully",
      })
      fetchBrand()
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

  return (
    <div>
      <div className="mb-8">
        <Link href="/admin/brands">
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Brands
          </Button>
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Edit Brand</h1>
            <p className="text-muted-foreground">{formData.name}</p>
          </div>
          <Link href={`/admin/brands/${params.id}/products`}>
            <Button variant="outline">
              <Package className="mr-2 h-4 w-4" />
              Manage Products
            </Button>
          </Link>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Brand Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="name">Brand Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="slug">URL Slug *</Label>
                <Input
                  id="slug"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  required
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Will appear as: /brands/{formData.slug}
                </p>
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="heroImage">Hero Image URL</Label>
                <Input
                  id="heroImage"
                  value={formData.heroImage}
                  onChange={(e) => setFormData({ ...formData, heroImage: e.target.value })}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="parentId">Parent Brand</Label>
                <Select
                  value={formData.parentId || "none"}
                  onValueChange={(value) => setFormData({ ...formData, parentId: value === "none" ? "" : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select parent brand" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None (Top-level brand)</SelectItem>
                    {brands.map((brand) => (
                      <SelectItem key={brand.id} value={brand.id}>
                        {brand.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="sortOrder">Sort Order</Label>
                <Input
                  id="sortOrder"
                  type="number"
                  value={formData.sortOrder}
                  onChange={(e) => setFormData({ ...formData, sortOrder: e.target.value })}
                />
              </div>

              <Button type="submit" disabled={loading} className="w-full mt-6">
                <Save className="mr-2 h-4 w-4" />
                {loading ? "Saving..." : "Save Changes"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </form>
    </div>
  )
}
