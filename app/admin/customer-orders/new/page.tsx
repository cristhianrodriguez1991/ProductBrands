"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Trash2, Plus, ArrowLeft, Image as ImageIcon, Loader2 } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useToast } from "@/components/ui/use-toast"
import Image from "next/image"

interface LineItem {
  id: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  imageUrl: string;
  uploading: boolean;
}

export default function NewCustomerOrderPage() {
  const router = useRouter()
  const { toast } = useToast()
  
  const [loading, setLoading] = useState(false)
  
  // Customer Details
  const [customerName, setCustomerName] = useState("")
  const [customerEmail, setCustomerEmail] = useState("")
  const [customerPhone, setCustomerPhone] = useState("")
  const [companyName, setCompanyName] = useState("")
  
  // Delivery Details
  const [deliveryType, setDeliveryType] = useState("SHIPPING")
  const [deliveryDate, setDeliveryDate] = useState("")
  const [shippingCost, setShippingCost] = useState("0.00")
  
  // Terms
  const [terms, setTerms] = useState("Payment is due upon receipt.")
  const [notes, setNotes] = useState("")

  // Items
  const [items, setItems] = useState<LineItem[]>([{
    id: Date.now().toString(),
    productName: "",
    quantity: 1,
    unitPrice: 0.00,
    imageUrl: "",
    uploading: false
  }])

  const addItem = () => {
    setItems([...items, {
      id: Date.now().toString(),
      productName: "",
      quantity: 1,
      unitPrice: 0.00,
      imageUrl: "",
      uploading: false
    }])
  }

  const removeItem = (id: string) => {
    if (items.length === 1) return
    setItems(items.filter(item => item.id !== id))
  }

  const updateItem = (id: string, field: keyof LineItem, value: any) => {
    setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item))
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, id: string) => {
    const file = e.target.files?.[0]
    if (!file) return

    updateItem(id, "uploading", true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      })
      if (!res.ok) throw new Error("Upload failed")
      const data = await res.json()
      updateItem(id, "imageUrl", data.url)
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" })
    } finally {
      updateItem(id, "uploading", false)
    }
  }

  const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0)
  const total = subtotal + (parseFloat(shippingCost) || 0)

  const handleSave = async () => {
    if (!customerName || !customerEmail || items.some(i => !i.productName)) {
      toast({ title: "Validation Error", description: "Please fill in customer name, email, and all product names.", variant: "destructive" })
      return
    }

    setLoading(true)
    try {
      const res = await fetch("/api/admin/customer-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName,
          customerEmail,
          customerPhone,
          companyName,
          deliveryDate,
          deliveryType,
          shippingCost,
          terms,
          notes,
          items: items.map(i => ({
            productName: i.productName,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            imageUrl: i.imageUrl
          }))
        })
      })

      if (!res.ok) throw new Error("Failed to create invoice")
      
      toast({ title: "Success", description: "Invoice created successfully." })
      router.push("/admin/customer-orders")
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-[1200px] mx-auto pb-24">
      <div className="flex items-center gap-4">
        <Link href="/admin/customer-orders">
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Create Invoice</h1>
          <p className="text-muted-foreground mt-1 text-sm">Build a new order and generate a payment link.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Customer Details</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Full Name *</Label>
                <Input value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="John Doe" />
              </div>
              <div className="space-y-2">
                <Label>Email Address *</Label>
                <Input type="email" value={customerEmail} onChange={e => setCustomerEmail(e.target.value)} placeholder="john@example.com" />
              </div>
              <div className="space-y-2">
                <Label>Phone Number</Label>
                <Input value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} placeholder="+1 (555) 000-0000" />
              </div>
              <div className="space-y-2">
                <Label>Company Name (Optional)</Label>
                <Input value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="Acme Corp" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Line Items</CardTitle>
              <Button variant="outline" size="sm" onClick={addItem}>
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {items.map((item, index) => (
                <div key={item.id} className="flex flex-col sm:flex-row gap-4 p-4 border rounded-lg bg-muted/20 relative">
                  {items.length > 1 && (
                    <Button variant="ghost" size="icon" className="absolute -top-3 -right-3 h-8 w-8 rounded-full bg-background border text-red-500 hover:text-red-600 shadow-sm" onClick={() => removeItem(item.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                  
                  <div className="flex-shrink-0">
                    <Label htmlFor={`file-${item.id}`} className="cursor-pointer">
                      <div className="h-24 w-24 border-2 border-dashed rounded-md flex flex-col items-center justify-center bg-muted/50 hover:bg-muted transition-colors relative overflow-hidden">
                        {item.imageUrl ? (
                          <Image src={item.imageUrl} alt="Product" fill className="object-cover" />
                        ) : item.uploading ? (
                          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        ) : (
                          <>
                            <ImageIcon className="h-6 w-6 text-muted-foreground mb-1" />
                            <span className="text-[10px] text-muted-foreground">Add Photo</span>
                          </>
                        )}
                      </div>
                    </Label>
                    <input type="file" id={`file-${item.id}`} className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, item.id)} />
                  </div>

                  <div className="flex-1 grid grid-cols-12 gap-3">
                    <div className="col-span-12 sm:col-span-6 space-y-2">
                      <Label>Product Name</Label>
                      <Input value={item.productName} onChange={e => updateItem(item.id, "productName", e.target.value)} placeholder="e.g. Premium Widget" />
                    </div>
                    <div className="col-span-6 sm:col-span-3 space-y-2">
                      <Label>Quantity</Label>
                      <Input type="number" min="1" value={item.quantity} onChange={e => updateItem(item.id, "quantity", parseInt(e.target.value) || 1)} />
                    </div>
                    <div className="col-span-6 sm:col-span-3 space-y-2">
                      <Label>Unit Price ($)</Label>
                      <Input type="number" step="0.01" value={item.unitPrice} onChange={e => updateItem(item.id, "unitPrice", parseFloat(e.target.value) || 0)} />
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Delivery & Terms</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Delivery Type</Label>
                <Select value={deliveryType} onValueChange={setDeliveryType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SHIPPING">Shipping</SelectItem>
                    <SelectItem value="PICKUP">Local Pickup</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Delivery / Ready Date</Label>
                <Input type="date" value={deliveryDate} onChange={e => setDeliveryDate(e.target.value)} />
              </div>
              {deliveryType === "SHIPPING" && (
                <div className="space-y-2">
                  <Label>Shipping Cost ($)</Label>
                  <Input type="number" step="0.01" value={shippingCost} onChange={e => setShippingCost(e.target.value)} />
                </div>
              )}
              <div className="space-y-2">
                <Label>Terms</Label>
                <Textarea value={terms} onChange={e => setTerms(e.target.value)} className="h-20 text-sm" />
              </div>
              <div className="space-y-2">
                <Label>Internal Notes</Label>
                <Textarea value={notes} onChange={e => setNotes(e.target.value)} className="h-20 text-sm" placeholder="Not visible to customer" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-6 space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{deliveryType === "SHIPPING" ? "Shipping" : "Pickup"}</span>
                <span>{deliveryType === "SHIPPING" ? `$${(parseFloat(shippingCost) || 0).toFixed(2)}` : "Free"}</span>
              </div>
              <div className="pt-4 border-t border-border/50 flex justify-between font-bold text-lg">
                <span>Total</span>
                <span>${total.toFixed(2)}</span>
              </div>
              <Button className="w-full mt-4" size="lg" onClick={handleSave} disabled={loading}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Save & Generate Link
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
