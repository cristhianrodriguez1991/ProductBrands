"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { useToast } from "@/components/ui/use-toast"
import { ArrowLeft, Plus, Edit, Trash2, ExternalLink, Package, Store, X } from "lucide-react"

type StoreLink = {
  id?: string
  storeName: string
  storeUrl: string
  storeId?: string
  price?: number
  isDefault: boolean
}

type Product = {
  id: string
  name: string
  description: string | null
  bullets: string[]
  category: string | null
  imageUrl: string | null
  amazonUrl: string | null
  asin: string | null
  priceAmount: number | null
  isActive: boolean
  sortOrder: number
  storeLinks: StoreLink[]
}

type Brand = {
  id: string
  name: string
  slug: string
}

const STORE_OPTIONS = [
  "Amazon",
  "Walmart",
  "eBay",
  "Target",
  "Costco",
  "Sam's Club",
  "Alibaba",
  "AliExpress",
  "Etsy",
  "Other",
]

export default function BrandProductsPage() {
  const params = useParams()
  const { toast } = useToast()
  const [brand, setBrand] = useState<Brand | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [formLoading, setFormLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "",
    imageUrl: "",
    priceAmount: "",
    sortOrder: "0",
  })
  const [storeLinks, setStoreLinks] = useState<StoreLink[]>([])
  const [showNewCategory, setShowNewCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState("")
  const [customCategory, setCustomCategory] = useState<string | null>(null)

  // Get unique categories from existing products + any custom category being created
  const existingCategories = [...new Set([
    ...products.map(p => p.category).filter(Boolean),
    ...(customCategory ? [customCategory] : []),
  ])] as string[]

  useEffect(() => {
    if (params.id) {
      fetchBrand()
      fetchProducts()
    }
  }, [params.id])

  const fetchBrand = async () => {
    try {
      const res = await fetch(`/api/admin/brands/${params.id}`)
      if (res.ok) {
        const data = await res.json()
        setBrand(data)
      }
    } catch (error) {
      console.error("Error fetching brand:", error)
    }
  }

  const fetchProducts = async () => {
    try {
      const res = await fetch(`/api/admin/brands/${params.id}/products`)
      if (!res.ok) throw new Error("Failed to fetch products")
      const data = await res.json()
      setProducts(data)
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

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      category: "",
      imageUrl: "",
      priceAmount: "",
      sortOrder: "0",
    })
    setStoreLinks([{ storeName: "Amazon", storeUrl: "", storeId: "", isDefault: true }])
    setEditingProduct(null)
    setShowNewCategory(false)
    setNewCategoryName("")
    setCustomCategory(null)
  }

  const openAddDialog = () => {
    resetForm()
    setDialogOpen(true)
  }

  const openEditDialog = (product: Product) => {
    setEditingProduct(product)
    setFormData({
      name: product.name,
      description: product.description || "",
      category: product.category || "",
      imageUrl: product.imageUrl || "",
      priceAmount: product.priceAmount?.toString() || "",
      sortOrder: product.sortOrder.toString(),
    })
    
    // Load existing store links or create from legacy amazonUrl
    if (product.storeLinks && product.storeLinks.length > 0) {
      setStoreLinks(product.storeLinks)
    } else if (product.amazonUrl) {
      setStoreLinks([{
        storeName: "Amazon",
        storeUrl: product.amazonUrl,
        storeId: product.asin || "",
        isDefault: true,
      }])
    } else {
      setStoreLinks([{ storeName: "Amazon", storeUrl: "", storeId: "", isDefault: true }])
    }
    
    setDialogOpen(true)
  }

  const addStoreLink = () => {
    setStoreLinks([...storeLinks, { storeName: "Amazon", storeUrl: "", storeId: "", isDefault: false }])
  }

  const removeStoreLink = (index: number) => {
    const newLinks = storeLinks.filter((_, i) => i !== index)
    // If we removed the default, make the first one default
    if (storeLinks[index].isDefault && newLinks.length > 0) {
      newLinks[0].isDefault = true
    }
    setStoreLinks(newLinks)
  }

  const updateStoreLink = (index: number, field: keyof StoreLink, value: any) => {
    const newLinks = [...storeLinks]
    if (field === "isDefault" && value === true) {
      // Only one can be default
      newLinks.forEach((link, i) => {
        link.isDefault = i === index
      })
    } else {
      (newLinks[index] as any)[field] = value
    }
    setStoreLinks(newLinks)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormLoading(true)

    // Validate at least one store link has a URL
    const validLinks = storeLinks.filter(link => link.storeUrl.trim())
    if (validLinks.length === 0) {
      toast({
        title: "Error",
        description: "Please add at least one store link with a URL",
        variant: "destructive",
      })
      setFormLoading(false)
      return
    }

    try {
      // Get the default link for backward compatibility
      const defaultLink = validLinks.find(l => l.isDefault) || validLinks[0]
      
      const payload = {
        name: formData.name,
        description: formData.description || null,
        bullets: [],
        category: formData.category || null,
        imageUrl: formData.imageUrl || null,
        // Legacy fields for backward compatibility
        amazonUrl: defaultLink.storeName === "Amazon" ? defaultLink.storeUrl : validLinks.find(l => l.storeName === "Amazon")?.storeUrl || defaultLink.storeUrl,
        asin: defaultLink.storeName === "Amazon" ? defaultLink.storeId : validLinks.find(l => l.storeName === "Amazon")?.storeId || null,
        priceAmount: formData.priceAmount ? parseFloat(formData.priceAmount) : null,
        sortOrder: parseInt(formData.sortOrder) || 0,
        storeLinks: validLinks.map((link, index) => ({
          storeName: link.storeName,
          storeUrl: link.storeUrl,
          storeId: link.storeId || null,
          price: link.price || null,
          isDefault: link.isDefault,
          sortOrder: index,
        })),
      }

      let res
      if (editingProduct) {
        res = await fetch(`/api/admin/products/${editingProduct.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
      } else {
        res = await fetch(`/api/admin/brands/${params.id}/products`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
      }

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || "Failed to save product")
      }

      toast({
        title: "Success",
        description: editingProduct ? "Product updated" : "Product added",
      })
      setDialogOpen(false)
      resetForm()
      fetchProducts()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setFormLoading(false)
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return

    try {
      const res = await fetch(`/api/admin/products/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to delete product")
      
      toast({
        title: "Success",
        description: "Product deleted",
      })
      fetchProducts()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  // Group products by category
  const productsByCategory = products.reduce((acc, product) => {
    const cat = product.category || "Uncategorized"
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(product)
    return acc
  }, {} as Record<string, Product[]>)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <Link href="/admin/brands">
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Brands
            </Button>
          </Link>
          <h1 className="text-3xl font-bold mb-2">{brand?.name} Products</h1>
          <p className="text-muted-foreground">
            {products.length} products • {Object.keys(productsByCategory).length} categories
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openAddDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Add Product
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingProduct ? "Edit Product" : "Add Product"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label htmlFor="name">Product Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="category">Category</Label>
                  {showNewCategory ? (
                    <div className="flex gap-2">
                      <Input
                        id="newCategory"
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        placeholder="Enter new category name"
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (newCategoryName.trim()) {
                            const newCat = newCategoryName.trim()
                            setCustomCategory(newCat)
                            setFormData({ ...formData, category: newCat })
                          }
                          setShowNewCategory(false)
                          setNewCategoryName("")
                        }}
                      >
                        Add
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setShowNewCategory(false)
                          setNewCategoryName("")
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <Select
                      value={formData.category || "none"}
                      onValueChange={(value) => {
                        if (value === "new") {
                          setShowNewCategory(true)
                        } else {
                          setFormData({ ...formData, category: value === "none" ? "" : value })
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Uncategorized</SelectItem>
                        {existingCategories.map((cat) => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                        <SelectItem value="new" className="text-blue-600 font-medium">
                          + Create New Category
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>

                <div>
                  <Label htmlFor="priceAmount">Price ($)</Label>
                  <Input
                    id="priceAmount"
                    type="number"
                    step="0.01"
                    value={formData.priceAmount}
                    onChange={(e) => setFormData({ ...formData, priceAmount: e.target.value })}
                  />
                </div>

                <div className="col-span-2">
                  <Label htmlFor="imageUrl">Image URL</Label>
                  <Input
                    id="imageUrl"
                    value={formData.imageUrl}
                    onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                    placeholder="https://example.com/image.jpg"
                  />
                </div>

                {/* Store Links Section */}
                <div className="col-span-2 border rounded-lg p-4 bg-slate-50">
                  <div className="flex items-center justify-between mb-3">
                    <Label className="text-base font-semibold flex items-center gap-2">
                      <Store className="h-4 w-4" />
                      Store Links *
                    </Label>
                    <Button type="button" variant="outline" size="sm" onClick={addStoreLink}>
                      <Plus className="h-4 w-4 mr-1" />
                      Add Store
                    </Button>
                  </div>
                  
                  <div className="space-y-3">
                    {storeLinks.map((link, index) => (
                      <div key={index} className="flex gap-2 items-start p-3 bg-white rounded border">
                        <div className="flex-1 grid grid-cols-3 gap-2">
                          <div>
                            <Label className="text-xs">Store</Label>
                            <Select
                              value={link.storeName}
                              onValueChange={(value) => updateStoreLink(index, "storeName", value)}
                            >
                              <SelectTrigger className="h-9">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {STORE_OPTIONS.map((store) => (
                                  <SelectItem key={store} value={store}>{store}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="col-span-2">
                            <Label className="text-xs">URL *</Label>
                            <Input
                              className="h-9"
                              value={link.storeUrl}
                              onChange={(e) => updateStoreLink(index, "storeUrl", e.target.value)}
                              placeholder="https://..."
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Store ID (optional)</Label>
                            <Input
                              className="h-9"
                              value={link.storeId || ""}
                              onChange={(e) => updateStoreLink(index, "storeId", e.target.value)}
                              placeholder="ASIN, SKU, etc."
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Price (optional)</Label>
                            <Input
                              className="h-9"
                              type="number"
                              step="0.01"
                              value={link.price || ""}
                              onChange={(e) => updateStoreLink(index, "price", e.target.value ? parseFloat(e.target.value) : undefined)}
                              placeholder="$"
                            />
                          </div>
                          <div className="flex items-end">
                            <label className="flex items-center gap-2 cursor-pointer h-9">
                              <input
                                type="checkbox"
                                checked={link.isDefault}
                                onChange={(e) => updateStoreLink(index, "isDefault", e.target.checked)}
                                className="rounded"
                              />
                              <span className="text-xs">Default</span>
                            </label>
                          </div>
                        </div>
                        {storeLinks.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="mt-5"
                            onClick={() => removeStoreLink(index)}
                          >
                            <X className="h-4 w-4 text-red-500" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Add links to different stores where this product is available. The default link will be shown first.
                  </p>
                </div>

                <div className="col-span-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Enter product description..."
                    rows={4}
                  />
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
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={formLoading}>
                  {formLoading ? "Saving..." : (editingProduct ? "Update" : "Add Product")}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {products.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No products yet</h3>
            <p className="text-muted-foreground mb-4">
              Add your first product to this brand
            </p>
            <Button onClick={openAddDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Add Product
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {Object.entries(productsByCategory).map(([category, categoryProducts]) => (
            <div key={category}>
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                {category}
                <Badge variant="secondary">{categoryProducts.length}</Badge>
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {categoryProducts.map((product) => (
                  <Card key={product.id}>
                    <CardContent className="p-4">
                      <div className="flex gap-4">
                        {product.imageUrl ? (
                          <div className="w-20 h-20 relative flex-shrink-0">
                            <Image
                              src={product.imageUrl}
                              alt={product.name}
                              fill
                              className="object-contain rounded"
                            />
                          </div>
                        ) : (
                          <div className="w-20 h-20 bg-muted rounded flex items-center justify-center flex-shrink-0">
                            <Package className="h-8 w-8 text-muted-foreground" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-sm line-clamp-2">{product.name}</h3>
                          {product.storeLinks && product.storeLinks.length > 0 ? (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {product.storeLinks.map((link, i) => (
                                <Badge key={i} variant="outline" className="text-xs">
                                  {link.storeName}
                                </Badge>
                              ))}
                            </div>
                          ) : product.asin ? (
                            <p className="text-xs text-muted-foreground mt-1">ASIN: {product.asin}</p>
                          ) : null}
                          {product.priceAmount && (
                            <p className="text-sm font-medium text-green-600 mt-1">
                              ${product.priceAmount.toFixed(2)}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-4 pt-4 border-t">
                        <div className="flex gap-1">
                          {product.storeLinks && product.storeLinks.length > 0 ? (
                            product.storeLinks.slice(0, 2).map((link, i) => (
                              <a key={i} href={link.storeUrl} target="_blank" rel="noopener noreferrer">
                                <Button variant="ghost" size="sm" title={link.storeName}>
                                  <ExternalLink className="h-4 w-4" />
                                </Button>
                              </a>
                            ))
                          ) : product.amazonUrl ? (
                            <a href={product.amazonUrl} target="_blank" rel="noopener noreferrer">
                              <Button variant="ghost" size="sm">
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                            </a>
                          ) : null}
                        </div>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" onClick={() => openEditDialog(product)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(product.id, product.name)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
