"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { 
  Trash2, 
  Plus, 
  ArrowLeft, 
  Image as ImageIcon, 
  Loader2, 
  Bookmark, 
  Search, 
  Check,
  Package
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useToast } from "@/components/ui/use-toast"
import Image from "next/image"
import { InvoicePreviewDialog } from "@/components/admin/InvoicePreviewDialog"
interface LineItem {
  id: string
  productName: string
  sku: string
  weight: string
  description: string
  quantity: number
  unitPrice: number
  imageUrl: string
  savePreset: boolean
  uploading: boolean
}

const DEFAULT_TERMS = `1. Payment & Authorization: Payment is due in full upon invoice receipt via ACH Direct Debit or Credit/Debit Card. Orders are dispatched upon payment authorization.
2. 48-Hour Inspection & Acceptance: Buyer must inspect all goods immediately within 48 hours of delivery or warehouse pickup. Any discrepancy in count, concealed damage, or defect must be submitted in writing with photographic documentation to info@productbrands.com within 48 hours. After 48 hours, shipment is deemed irrevocably accepted in full.
3. Wholesale Final Sale: All wholesale merchandise and special orders are final sale.
4. Freight & Title: Title and risk of loss transfer to Buyer upon delivery carrier transfer or customer warehouse pickup.`

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
  
  // Terms & Notes
  const [terms, setTerms] = useState(DEFAULT_TERMS)
  const [notes, setNotes] = useState("")

  // Presets from database
  const [presets, setPresets] = useState<any[]>([])
  const [loadingPresets, setLoadingPresets] = useState(false)
  const [activeSearchIndex, setActiveSearchIndex] = useState<number | null>(null)
  const [searchQuery, setSearchQuery] = useState("")

  // Items
  const [items, setItems] = useState<LineItem[]>([{
    id: Date.now().toString(),
    productName: "",
    sku: "",
    weight: "",
    description: "",
    quantity: 1,
    unitPrice: 0.00,
    imageUrl: "",
    savePreset: true,
    uploading: false,
  }])

  useEffect(() => {
    loadPresets()
  }, [])

  const loadPresets = async (q: string = "") => {
    try {
      setLoadingPresets(true)
      const res = await fetch(`/api/admin/customer-orders/presets${q ? `?query=${encodeURIComponent(q)}` : ""}`)
      if (res.ok) {
        const data = await res.json()
        const combined = [...(data.presets || []), ...(data.catalogProducts || [])]
        setPresets(combined)
      }
    } catch (err) {
      console.error("Failed to load presets", err)
    } finally {
      setLoadingPresets(false)
    }
  }

  const addItem = () => {
    setItems([...items, {
      id: Date.now().toString(),
      productName: "",
      sku: "",
      weight: "",
      description: "",
      quantity: 1,
      unitPrice: 0.00,
      imageUrl: "",
      savePreset: true,
      uploading: false,
    }])
  }

  const removeItem = (id: string) => {
    if (items.length === 1) return
    setItems(items.filter(item => item.id !== id))
  }

  const updateItem = (id: string, field: keyof LineItem, value: any) => {
    setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item))
  }

  const selectPresetForItem = (itemId: string, preset: any) => {
    setItems(items.map(item => {
      if (item.id === itemId) {
        return {
          ...item,
          productName: preset.name || item.productName,
          sku: preset.sku || item.sku,
          weight: preset.weight || item.weight,
          description: preset.description || item.description,
          unitPrice: preset.unitPrice || item.unitPrice,
          imageUrl: preset.imageUrl || item.imageUrl,
          savePreset: false, // Already in catalog
        }
      }
      return item
    }))
    setActiveSearchIndex(null)
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
      toast({ 
        title: "Validation Error", 
        description: "Please fill in Customer Name, Customer Email, and Product Name for all items.", 
        variant: "destructive" 
      })
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
            sku: i.sku,
            weight: i.weight,
            description: i.description,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            imageUrl: i.imageUrl,
            savePreset: i.savePreset,
          }))
        })
      })

      if (!res.ok) throw new Error("Failed to create invoice")
      
      toast({ title: "Invoice Created", description: "Your customer invoice has been generated." })
      router.push("/admin/customer-orders")
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-[1300px] mx-auto pb-24">
      <div className="flex items-center gap-4">
        <Link href="/admin/customer-orders">
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Create Customer Invoice</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Generate a professional B2B wholesale order and secure ACH / Card payment link.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          
          {/* Customer Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Customer & Billing Details</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Customer Name *</Label>
                <Input 
                  value={customerName} 
                  onChange={e => setCustomerName(e.target.value)} 
                  placeholder="e.g. John Doe" 
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Customer Email *</Label>
                <Input 
                  type="email" 
                  value={customerEmail} 
                  onChange={e => setCustomerEmail(e.target.value)} 
                  placeholder="billing@customer.com" 
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Phone Number</Label>
                <Input 
                  value={customerPhone} 
                  onChange={e => setCustomerPhone(e.target.value)} 
                  placeholder="+1 (786) 000-0000" 
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Company Name (Optional)</Label>
                <Input 
                  value={companyName} 
                  onChange={e => setCompanyName(e.target.value)} 
                  placeholder="e.g. Acme Wholesale LLC" 
                />
              </div>
            </CardContent>
          </Card>

          {/* Line Items Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <div>
                <CardTitle className="text-base font-semibold">Order Products & Items</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Type to search preset products or enter new ones (auto-saved to your catalog).
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={addItem}>
                <Plus className="h-4 w-4 mr-1.5" />
                Add Item
              </Button>
            </CardHeader>

            <CardContent className="space-y-6">
              {items.map((item, index) => (
                <div key={item.id} className="p-4 border rounded-xl bg-slate-50/50 space-y-4 relative">
                  {items.length > 1 && (
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="absolute -top-3 -right-3 h-7 w-7 rounded-full bg-white border text-red-500 hover:text-red-600 shadow-sm" 
                      onClick={() => removeItem(item.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}

                  <div className="flex flex-col sm:flex-row gap-4">
                    {/* Image Upload Thumbnail */}
                    <div className="flex-shrink-0">
                      <Label htmlFor={`file-${item.id}`} className="cursor-pointer">
                        <div className="h-24 w-24 border-2 border-dashed rounded-xl flex flex-col items-center justify-center bg-white hover:bg-slate-50 transition-colors relative overflow-hidden shadow-xs">
                          {item.imageUrl ? (
                            <Image src={item.imageUrl} alt="Product" fill className="object-cover" />
                          ) : item.uploading ? (
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                          ) : (
                            <>
                              <ImageIcon className="h-6 w-6 text-slate-400 mb-1" />
                              <span className="text-[10px] text-slate-500 font-medium">Add Photo</span>
                            </>
                          )}
                        </div>
                      </Label>
                      <input 
                        type="file" 
                        id={`file-${item.id}`} 
                        className="hidden" 
                        accept="image/*" 
                        onChange={(e) => handleFileUpload(e, item.id)} 
                      />
                    </div>

                    {/* Product Inputs Grid */}
                    <div className="flex-1 grid grid-cols-12 gap-3">
                      {/* Product Name with Auto-Suggest */}
                      <div className="col-span-12 sm:col-span-6 space-y-1.5 relative">
                        <Label className="text-xs flex items-center justify-between">
                          <span>Product Name *</span>
                          <span className="text-[10px] text-muted-foreground">e.g. Chocolate Bar, Coffee Beans</span>
                        </Label>
                        <Input 
                          value={item.productName} 
                          onFocus={() => {
                            setActiveSearchIndex(index)
                            loadPresets(item.productName)
                          }}
                          onChange={e => {
                            updateItem(item.id, "productName", e.target.value)
                            setActiveSearchIndex(index)
                            loadPresets(e.target.value)
                          }} 
                          placeholder="Search or enter product..." 
                        />

                        {/* Dropdown Suggestions */}
                        {activeSearchIndex === index && presets.length > 0 && (
                          <div className="absolute z-30 left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-52 overflow-y-auto divide-y divide-slate-100">
                            <div className="p-1.5 bg-slate-50 text-[10px] font-semibold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                              <span>Saved Catalog & Presets</span>
                              <span className="text-[9px] text-slate-400">Click to auto-fill</span>
                            </div>
                            {presets.map((preset) => (
                              <div
                                key={preset.id}
                                className="p-2.5 hover:bg-slate-50 cursor-pointer flex items-center gap-3 text-xs transition-colors"
                                onMouseDown={(e) => {
                                  e.preventDefault()
                                  selectPresetForItem(item.id, preset)
                                }}
                              >
                                {preset.imageUrl ? (
                                  <div className="relative w-8 h-8 rounded bg-slate-100 overflow-hidden shrink-0">
                                    <Image src={preset.imageUrl} alt="" fill className="object-cover" />
                                  </div>
                                ) : (
                                  <div className="w-8 h-8 rounded bg-slate-100 flex items-center justify-center shrink-0 text-slate-400">
                                    <Package className="h-4 w-4" />
                                  </div>
                                )}
                                <div className="flex-1 min-w-0">
                                  <div className="font-semibold text-slate-900 truncate">{preset.name}</div>
                                  <div className="text-[11px] text-slate-500 flex gap-2">
                                    {preset.sku && <span>SKU: {preset.sku}</span>}
                                    {preset.weight && <span>• {preset.weight}</span>}
                                  </div>
                                </div>
                                <div className="font-bold text-slate-800 shrink-0">
                                  ${Number(preset.unitPrice || 0).toFixed(2)}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* SKU / Code */}
                      <div className="col-span-6 sm:col-span-3 space-y-1.5">
                        <Label className="text-xs">SKU / Item #</Label>
                        <Input 
                          value={item.sku} 
                          onChange={e => updateItem(item.id, "sku", e.target.value)} 
                          placeholder="e.g. CHOC-01" 
                        />
                      </div>

                      {/* Weight / Size Specs */}
                      <div className="col-span-6 sm:col-span-3 space-y-1.5">
                        <Label className="text-xs">Weight / Specs</Label>
                        <Input 
                          value={item.weight} 
                          onChange={e => updateItem(item.id, "weight", e.target.value)} 
                          placeholder="e.g. 16 oz, 2.5 lbs" 
                        />
                      </div>

                      {/* Quantity */}
                      <div className="col-span-4 sm:col-span-4 space-y-1.5">
                        <Label className="text-xs">Quantity</Label>
                        <Input 
                          type="number" 
                          min="1" 
                          value={item.quantity} 
                          onChange={e => updateItem(item.id, "quantity", parseInt(e.target.value) || 1)} 
                        />
                      </div>

                      {/* Unit Price */}
                      <div className="col-span-4 sm:col-span-4 space-y-1.5">
                        <Label className="text-xs">Unit Price ($)</Label>
                        <Input 
                          type="number" 
                          step="0.01" 
                          value={item.unitPrice} 
                          onChange={e => updateItem(item.id, "unitPrice", parseFloat(e.target.value) || 0)} 
                        />
                      </div>

                      {/* Line Total */}
                      <div className="col-span-4 sm:col-span-4 space-y-1.5">
                        <Label className="text-xs">Total ($)</Label>
                        <div className="h-10 px-3 py-2 bg-slate-100 rounded-md text-sm font-bold text-slate-900 flex items-center">
                          ${(item.quantity * item.unitPrice).toFixed(2)}
                        </div>
                      </div>

                      {/* Image URL Link Input */}
                      <div className="col-span-12 space-y-1.5">
                        <Label className="text-xs flex items-center justify-between text-slate-600">
                          <span>Image URL / Direct Link (Optional)</span>
                          <span className="text-[10px] text-muted-foreground">Paste image link from Amazon, supplier, etc.</span>
                        </Label>
                        <Input 
                          value={item.imageUrl} 
                          onChange={e => updateItem(item.id, "imageUrl", e.target.value)} 
                          placeholder="https://... (or click the photo box on the left to upload)" 
                          className="text-xs font-mono h-9" 
                        />
                      </div>

                      {/* Optional Description */}
                      <div className="col-span-12 space-y-1.5">
                        <Label className="text-xs flex items-center justify-between text-slate-600">
                          <span>Product Description & Specifications (Optional)</span>
                          <span className="text-[10px] text-muted-foreground">If filled, creates a clickable dropdown on customer invoice</span>
                        </Label>
                        <Textarea 
                          value={item.description} 
                          onChange={e => updateItem(item.id, "description", e.target.value)} 
                          placeholder="e.g. Premium confectionery chocolate melting wafers, smooth cocoa flavor, easy to melt. Ideal for molding and baking..." 
                          className="h-20 text-xs" 
                        />
                      </div>
                    </div>
                  </div>

                  {/* Save to Catalog Checkbox */}
                  <div className="flex items-center space-x-2 pt-1 border-t border-slate-200/60">
                    <Checkbox
                      id={`preset-${item.id}`}
                      checked={item.savePreset}
                      onCheckedChange={(checked) => updateItem(item.id, "savePreset", !!checked)}
                    />
                    <label
                      htmlFor={`preset-${item.id}`}
                      className="text-xs text-slate-600 font-medium cursor-pointer flex items-center gap-1"
                    >
                      <Bookmark className="h-3 w-3 text-slate-400" />
                      Save this product & price to preset catalog for future invoices
                    </label>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar: Delivery, Terms & Summary */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Fulfillment & Delivery</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Fulfillment Method</Label>
                <Select value={deliveryType} onValueChange={setDeliveryType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SHIPPING">Shipping / Freight Delivery</SelectItem>
                    <SelectItem value="PICKUP">Warehouse Pickup (Doral, FL)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Target Delivery / Ready Date</Label>
                <Input 
                  type="date" 
                  value={deliveryDate} 
                  onChange={e => setDeliveryDate(e.target.value)} 
                />
              </div>

              {deliveryType === "SHIPPING" && (
                <div className="space-y-1.5">
                  <Label className="text-xs">Shipping / Freight Fee ($)</Label>
                  <Input 
                    type="number" 
                    step="0.01" 
                    value={shippingCost} 
                    onChange={e => setShippingCost(e.target.value)} 
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <Label className="text-xs">Terms & Conditions (Protective Wholesale Terms)</Label>
                <Textarea 
                  value={terms} 
                  onChange={e => setTerms(e.target.value)} 
                  className="h-28 text-xs font-mono" 
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Internal Staff Notes</Label>
                <Textarea 
                  value={notes} 
                  onChange={e => setNotes(e.target.value)} 
                  className="h-16 text-xs" 
                  placeholder="Not visible to the customer" 
                />
              </div>
            </CardContent>
          </Card>

          {/* Pricing Summary Card */}
          <Card className="bg-slate-900 text-white shadow-md">
            <CardContent className="p-6 space-y-4">
              <div className="flex justify-between text-sm text-slate-300">
                <span>Subtotal ({items.reduce((acc, i) => acc + i.quantity, 0)} units):</span>
                <span className="font-semibold text-white">${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm text-slate-300">
                <span>{deliveryType === "SHIPPING" ? "Freight / Delivery" : "Warehouse Pickup"}:</span>
                <span className="font-semibold text-white">
                  {deliveryType === "SHIPPING" ? `$${(parseFloat(shippingCost) || 0).toFixed(2)}` : "Free"}
                </span>
              </div>
              <div className="pt-4 border-t border-slate-700 flex justify-between items-baseline">
                <span className="font-bold text-base text-white">Total Amount Due</span>
                <span className="font-black text-2xl text-emerald-400">${total.toFixed(2)}</span>
              </div>
              <Button 
                className="w-full mt-4 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold h-12 text-sm shadow-md" 
                onClick={handleSave} 
                disabled={loading}
              >
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Generate Professional Invoice
              </Button>
              <InvoicePreviewDialog 
                data={{
                  customerName,
                  customerEmail,
                  customerPhone,
                  companyName,
                  deliveryType,
                  deliveryDate,
                  shippingCost,
                  terms,
                  items,
                  subtotal,
                  total,
                }} 
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
