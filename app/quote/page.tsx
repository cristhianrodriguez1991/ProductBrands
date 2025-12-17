"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/components/ui/use-toast"
import { useSession } from "next-auth/react"
import { Navbar } from "@/components/navbar"

export default function QuotePage() {
  const router = useRouter()
  const { toast } = useToast()
  const { data: session } = useSession()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    productCategory: "",
    customCategory: "",
    productDescription: "",
    targetCustomer: "",
    packagingType: "",
    labelingNeeds: [] as string[],
    estimatedQuantity: "",
    targetUnitCost: "",
    timeline: "",
    deadline: "",
    shippingDestination: "",
  })
  const [files, setFiles] = useState<File[]>([])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const formDataToSend = new FormData()
      Object.entries(formData).forEach(([key, value]) => {
        if (key === "labelingNeeds") {
          formDataToSend.append(key, JSON.stringify(value))
        } else {
          formDataToSend.append(key, value as string)
        }
      })

      files.forEach((file) => {
        formDataToSend.append("files", file)
      })

      const res = await fetch("/api/quotes/create", {
        method: "POST",
        body: formDataToSend,
      })

      if (!res.ok) throw new Error("Failed to submit quote")

      toast({
        title: "Success",
        description: "Quote request submitted! We'll review it and get back to you soon.",
      })

      if (session) {
        router.push("/portal/quotes")
      } else {
        router.push("/login")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to submit quote. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const toggleLabelingNeed = (need: string) => {
    setFormData({
      ...formData,
      labelingNeeds: formData.labelingNeeds.includes(need)
        ? formData.labelingNeeds.filter((n) => n !== need)
        : [...formData.labelingNeeds, need],
    })
  }

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* Hero Section */}
      <section className="bg-gradient-to-b from-blue-50 to-white py-12 md:py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 text-gray-900">
              Request a Quote
            </h1>
            <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto">
              Tell us about your product needs and we'll prepare a custom quote
            </p>
          </div>
        </div>
      </section>

      {/* Quote Form */}
      <section className="py-16 md:py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <Card className="border-2 bg-white">
            <CardHeader>
              <CardTitle>Quote Request Form</CardTitle>
              <CardDescription>Step {step} of 3</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {step === 1 && (
                  <>
                    <div>
                      <Label htmlFor="productCategory">Product Category</Label>
                      <Select
                        value={formData.productCategory}
                        onValueChange={(value) =>
                          setFormData({ ...formData, productCategory: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="food">Food & Beverage</SelectItem>
                          <SelectItem value="beauty">Beauty & Personal Care</SelectItem>
                          <SelectItem value="home">Home & Living</SelectItem>
                          <SelectItem value="office">Office & Business</SelectItem>
                          <SelectItem value="pet">Pet Products</SelectItem>
                          <SelectItem value="electronics">Electronics Accessories</SelectItem>
                          <SelectItem value="apparel">Apparel & Textiles</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      {formData.productCategory === "other" && (
                        <Input
                          className="mt-2"
                          placeholder="Specify category"
                          value={formData.customCategory}
                          onChange={(e) =>
                            setFormData({ ...formData, customCategory: e.target.value })
                          }
                        />
                      )}
                    </div>

                    <div>
                      <Label htmlFor="productDescription">Product Description</Label>
                      <Textarea
                        id="productDescription"
                        value={formData.productDescription}
                        onChange={(e) =>
                          setFormData({ ...formData, productDescription: e.target.value })
                        }
                        required
                        rows={4}
                        placeholder="Describe your product, specifications, and requirements"
                      />
                    </div>

                    <div>
                      <Label htmlFor="targetCustomer">Target Customer</Label>
                      <Input
                        id="targetCustomer"
                        value={formData.targetCustomer}
                        onChange={(e) =>
                          setFormData({ ...formData, targetCustomer: e.target.value })
                        }
                        placeholder="e.g., B2B, B2C, Retail, E-commerce"
                      />
                    </div>

                    <Button type="button" onClick={() => setStep(2)} className="w-full">
                      Next
                    </Button>
                  </>
                )}

                {step === 2 && (
                  <>
                    <div>
                      <Label htmlFor="packagingType">Desired Packaging Type</Label>
                      <Select
                        value={formData.packagingType}
                        onValueChange={(value) =>
                          setFormData({ ...formData, packagingType: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select packaging type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="bottles">Bottles</SelectItem>
                          <SelectItem value="boxes">Boxes</SelectItem>
                          <SelectItem value="bags">Bags/Pouches</SelectItem>
                          <SelectItem value="jars">Jars</SelectItem>
                          <SelectItem value="custom">Custom</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Labeling/Branding Needs</Label>
                      <div className="space-y-2 mt-2">
                        {["Custom Labels", "Logo Design", "Brand Guidelines", "Compliance Labels"].map(
                          (need) => (
                            <div key={need} className="flex items-center space-x-2">
                              <Checkbox
                                id={need}
                                checked={formData.labelingNeeds.includes(need)}
                                onCheckedChange={() => toggleLabelingNeed(need)}
                              />
                              <label htmlFor={need} className="text-sm">
                                {need}
                              </label>
                            </div>
                          )
                        )}
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="estimatedQuantity">Estimated Quantity</Label>
                      <Input
                        id="estimatedQuantity"
                        value={formData.estimatedQuantity}
                        onChange={(e) =>
                          setFormData({ ...formData, estimatedQuantity: e.target.value })
                        }
                        placeholder="e.g., 1000-5000, 10000+"
                      />
                    </div>

                    <div>
                      <Label htmlFor="targetUnitCost">Target Unit Cost (optional)</Label>
                      <Input
                        id="targetUnitCost"
                        type="number"
                        step="0.01"
                        value={formData.targetUnitCost}
                        onChange={(e) =>
                          setFormData({ ...formData, targetUnitCost: e.target.value })
                        }
                        placeholder="$0.00"
                      />
                    </div>

                    <div className="flex gap-2">
                      <Button type="button" variant="outline" onClick={() => setStep(1)}>
                        Back
                      </Button>
                      <Button type="button" onClick={() => setStep(3)} className="flex-1">
                        Next
                      </Button>
                    </div>
                  </>
                )}

                {step === 3 && (
                  <>
                    <div>
                      <Label htmlFor="timeline">Timeline</Label>
                      <Input
                        id="timeline"
                        value={formData.timeline}
                        onChange={(e) =>
                          setFormData({ ...formData, timeline: e.target.value })
                        }
                        placeholder="e.g., 8-12 weeks"
                      />
                    </div>

                    <div>
                      <Label htmlFor="deadline">Deadline (optional)</Label>
                      <Input
                        id="deadline"
                        type="date"
                        value={formData.deadline}
                        onChange={(e) =>
                          setFormData({ ...formData, deadline: e.target.value })
                        }
                      />
                    </div>

                    <div>
                      <Label htmlFor="shippingDestination">Shipping Destination</Label>
                      <Input
                        id="shippingDestination"
                        value={formData.shippingDestination}
                        onChange={(e) =>
                          setFormData({ ...formData, shippingDestination: e.target.value })
                        }
                        placeholder="City, State, Country"
                      />
                    </div>

                    <div>
                      <Label>Attach Files (optional)</Label>
                      <Input
                        type="file"
                        multiple
                        onChange={(e) => {
                          const selectedFiles = Array.from(e.target.files || [])
                          setFiles(selectedFiles)
                        }}
                        accept="image/*,.pdf,.doc,.docx"
                        className="mt-2"
                      />
                      {files.length > 0 && (
                        <p className="text-sm text-muted-foreground mt-2">
                          {files.length} file(s) selected
                        </p>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <Button type="button" variant="outline" onClick={() => setStep(2)}>
                        Back
                      </Button>
                      <Button type="submit" className="flex-1" disabled={loading}>
                        {loading ? "Submitting..." : "Submit Quote Request"}
                      </Button>
                    </div>
                  </>
                )}
              </form>
            </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </div>
  )
}

