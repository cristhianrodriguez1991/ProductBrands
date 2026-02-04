"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import { ArrowLeft, Save, Copy, Archive } from "lucide-react"
import Link from "next/link"

export default function EditListingPage() {
  const router = useRouter()
  const params = useParams()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [listing, setListing] = useState<any>(null)
  const [formData, setFormData] = useState({
    title: "",
    slug: "",
    description: "",
    status: "DRAFT",
    categoryId: "",
    brand: "",
    moq: "",
    leadTimeDays: "",
    basePrice: "",
    pricingModel: "unit",
  })

  useEffect(() => {
    if (params.id) {
      fetchListing()
    }
  }, [params.id])

  const fetchListing = async () => {
    try {
      const res = await fetch(`/api/admin/listings/${params.id}`)
      if (!res.ok) throw new Error("Failed to fetch listing")
      const data = await res.json()
      setListing(data)
      setFormData({
        title: data.title || "",
        slug: data.slug || "",
        description: data.description || "",
        status: data.status || "DRAFT",
        categoryId: data.categoryId || "",
        brand: data.brand || "",
        moq: data.moq?.toString() || "",
        leadTimeDays: data.leadTimeDays?.toString() || "",
        basePrice: data.basePrice?.toString() || "",
        pricingModel: data.pricingModel || "unit",
      })
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const payload = {
        ...formData,
        moq: formData.moq ? parseInt(formData.moq) : undefined,
        leadTimeDays: formData.leadTimeDays ? parseInt(formData.leadTimeDays) : undefined,
        basePrice: formData.basePrice ? parseFloat(formData.basePrice) : undefined,
      }

      const res = await fetch(`/api/admin/listings/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || "Failed to update listing")
      }

      toast({
        title: "Success",
        description: "Listing updated successfully",
      })
      fetchListing()
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

  const handleDuplicate = async () => {
    try {
      const res = await fetch(`/api/admin/listings/${params.id}/duplicate`, {
        method: "POST",
      })
      if (!res.ok) throw new Error("Failed to duplicate listing")
      const duplicated = await res.json()
      toast({
        title: "Success",
        description: "Listing duplicated successfully",
      })
      router.push(`/admin/listings/${duplicated.id}`)
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  const handleArchive = async () => {
    if (!confirm("Are you sure you want to archive this listing?")) return

    try {
      const res = await fetch(`/api/admin/listings/${params.id}`, {
        method: "DELETE",
      })
      if (!res.ok) throw new Error("Failed to archive listing")
      toast({
        title: "Success",
        description: "Listing archived successfully",
      })
      router.push("/admin/listings")
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  if (!listing) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading listing...</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8">
        <Link href="/admin/listings">
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Listings
          </Button>
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Edit Listing</h1>
            <p className="text-muted-foreground">{listing.title}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleDuplicate}>
              <Copy className="mr-2 h-4 w-4" />
              Duplicate
            </Button>
            <Button variant="outline" onClick={handleArchive}>
              <Archive className="mr-2 h-4 w-4" />
              Archive
            </Button>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="slug">Slug</Label>
                  <Input
                    id="slug"
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={6}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Pricing & Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="moq">Minimum Order Quantity (MOQ)</Label>
                    <Input
                      id="moq"
                      type="number"
                      value={formData.moq}
                      onChange={(e) => setFormData({ ...formData, moq: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="leadTimeDays">Lead Time (days)</Label>
                    <Input
                      id="leadTimeDays"
                      type="number"
                      value={formData.leadTimeDays}
                      onChange={(e) => setFormData({ ...formData, leadTimeDays: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="basePrice">Base Price</Label>
                    <Input
                      id="basePrice"
                      type="number"
                      step="0.01"
                      value={formData.basePrice}
                      onChange={(e) => setFormData({ ...formData, basePrice: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="pricingModel">Pricing Model</Label>
                    <Select
                      value={formData.pricingModel}
                      onValueChange={(value) => setFormData({ ...formData, pricingModel: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unit">Unit</SelectItem>
                        <SelectItem value="tiered">Tiered</SelectItem>
                        <SelectItem value="custom">Custom</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label htmlFor="brand">Brand</Label>
                  <Input
                    id="brand"
                    value={formData.brand}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => setFormData({ ...formData, status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DRAFT">Draft</SelectItem>
                      <SelectItem value="ACTIVE">Active</SelectItem>
                      <SelectItem value="ARCHIVED">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="categoryId">Category</Label>
                  <Select
                    value={formData.categoryId || "none"}
                    onValueChange={(value) => setFormData({ ...formData, categoryId: value === "none" ? "" : value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-2">
              <Button type="submit" disabled={loading} className="flex-1">
                <Save className="mr-2 h-4 w-4" />
                {loading ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}
