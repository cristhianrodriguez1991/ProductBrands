import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Eye, Building2, MapPin, Phone, Mail, Calendar, Truck, Package, ChevronDown, ChevronUp } from "lucide-react"
import Image from "next/image"
import { useState } from "react"
import { Badge } from "@/components/ui/badge"

interface LineItem {
  id: string
  productName: string
  sku: string
  weight: string
  description: string
  quantity: number
  unitPrice: number
  imageUrl: string
}

interface InvoicePreviewProps {
  customerName: string
  customerEmail: string
  customerPhone: string
  companyName: string
  deliveryType: string
  deliveryDate: string
  shippingCost: string
  terms: string
  items: LineItem[]
  subtotal: number
  total: number
}

export function InvoicePreviewDialog({ data }: { data: InvoicePreviewProps }) {
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({})

  const toggleItemExpand = (id: string) => {
    setExpandedItems(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const formatMoney = (val: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(val || 0)
  }

  const today = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
  const estDelivery = data.deliveryDate 
    ? new Date(data.deliveryDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : "Confirmed Upon Payment"

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full font-semibold border-slate-700 bg-transparent text-white hover:bg-slate-800 hover:text-white shadow-sm mt-3 h-12">
          <Eye className="mr-2 h-4 w-4" />
          Preview Invoice
        </Button>
      </DialogTrigger>
      <DialogContent
        onOpenAutoFocus={(e) => e.preventDefault()}
        className="max-w-5xl max-h-[90vh] overflow-y-auto p-0 border-0 bg-slate-100 outline-none ring-0 focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 [&>button]:ring-0 [&>button]:ring-offset-0 [&>button]:focus:ring-0 [&>button]:focus:outline-none"
      >
        <DialogHeader className="p-4 bg-white border-b sticky top-0 z-10 hidden">
          <DialogTitle>Invoice Preview</DialogTitle>
        </DialogHeader>

        <div className="p-4 sm:p-8 font-sans">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            {/* Header Bar */}
            <div className="px-6 py-8 sm:px-10 sm:py-10 border-b border-slate-200 bg-white">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="flex flex-col items-start">
                  <Image
                    src="/images/logo.png"
                    alt="Product Brands"
                    width={1426}
                    height={382}
                    priority
                    className="h-auto w-[280px] sm:w-[380px] md:w-[440px] object-contain"
                  />
                  <p className="text-xs sm:text-sm text-slate-500 font-semibold uppercase tracking-[0.2em] mt-3">
                    Wholesale Distribution &amp; Commercial Supply
                  </p>
                </div>

                <div className="flex md:flex-col items-center md:items-end justify-between w-full md:w-auto gap-2">
                  <div className="text-left md:text-right">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest block">
                      Official Invoice
                    </span>
                    <span className="text-xl font-mono font-bold text-slate-900">
                      PB3040 <span className="text-xs text-slate-400 font-sans font-normal">(Preview)</span>
                    </span>
                  </div>
                  <Badge className="bg-amber-400 text-slate-950 font-bold px-3 py-1 text-xs uppercase tracking-wider">
                    Balance Due
                  </Badge>
                </div>
              </div>
            </div>

            <div className="p-6 sm:p-10 space-y-8">
              {/* Business & Customer Address Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pb-6 border-b border-slate-200">
                <div className="space-y-1 text-sm">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
                    Issued By
                  </span>
                  <div className="font-bold text-slate-900 text-base">Southern Basics LLC</div>
                  <div className="text-slate-600 flex items-start gap-2 pt-0.5">
                    <MapPin className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                    <span>8001 NW 54th St, Doral FL, 33166</span>
                  </div>
                  <div className="text-slate-600 flex items-center gap-2">
                    <Phone className="h-4 w-4 text-slate-400 shrink-0" />
                    <span>+1 305-600-3157</span>
                  </div>
                  <div className="text-slate-600 flex items-center gap-2">
                    <Mail className="h-4 w-4 text-slate-400 shrink-0" />
                    <span>info@productbrands.com</span>
                  </div>
                </div>

                <div className="space-y-1 text-sm bg-slate-50/80 p-5 rounded-xl border border-slate-200/80">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
                    Billed To (Customer)
                  </span>
                  <div className="font-bold text-slate-900 text-base">{data.customerName || "Customer Name"}</div>
                  {data.companyName && (
                    <div className="text-slate-700 font-semibold flex items-center gap-1.5 pt-0.5">
                      <Building2 className="h-4 w-4 text-slate-400 shrink-0" />
                      <span>{data.companyName}</span>
                    </div>
                  )}
                  <div className="text-slate-600 flex items-center gap-2">
                    <Mail className="h-4 w-4 text-slate-400 shrink-0" />
                    <span>{data.customerEmail || "customer@email.com"}</span>
                  </div>
                  {data.customerPhone && (
                    <div className="text-slate-600 flex items-center gap-2">
                      <Phone className="h-4 w-4 text-slate-400 shrink-0" />
                      <span>{data.customerPhone}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Order Specs Metadata */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                <div>
                  <span className="text-slate-500 font-medium block">Issue Date</span>
                  <span className="font-bold text-slate-900 text-sm mt-0.5 block">{today}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-medium block">Fulfillment Method</span>
                  <span className="font-bold text-slate-900 text-sm mt-0.5 flex items-center gap-1.5">
                    <Truck className="h-4 w-4 text-slate-600" />
                    {data.deliveryType === "PICKUP" ? "Warehouse Pickup" : "Freight Delivery"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 font-medium block">Estimated Delivery</span>
                  <span className="font-bold text-slate-900 text-sm mt-0.5 flex items-center gap-1.5">
                    <Calendar className="h-4 w-4 text-slate-600" />
                    {estDelivery}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 font-medium block">Payment Method</span>
                  <span className="font-bold text-slate-900 text-sm mt-0.5 block">
                    ACH Bank Transfer / Card
                  </span>
                </div>
              </div>

              {/* Items Table */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Ordered Products & Inventory
                  </h3>
                  <span className="text-xs text-slate-500">
                    Total Items: {data.items.reduce((acc, i) => acc + (i.quantity || 0), 0)} units
                  </span>
                </div>

                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-100/80 border-b border-slate-200 text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                      <tr>
                        <th className="py-3 px-4 w-16">Item</th>
                        <th className="py-3 px-4">Description</th>
                        <th className="py-3 px-4 w-28">Weight / Specs</th>
                        <th className="py-3 px-4 text-center w-20">Qty</th>
                        <th className="py-3 px-4 text-right w-28">Unit Price</th>
                        <th className="py-3 px-4 text-right w-32">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {data.items.map((item, idx) => {
                        const isExpanded = !!expandedItems[item.id]
                        const hasDesc = !!(item.description && item.description.trim())

                        return (
                          <tr key={item.id} className="group">
                            <td colSpan={6} className="p-0">
                              <div className="hover:bg-slate-50/60 transition-colors">
                                <table className="w-full text-left text-sm">
                                  <tbody>
                                    <tr>
                                      <td className="py-3.5 px-4 w-16 align-top">
                                        {item.imageUrl ? (
                                          <div className="relative w-12 h-12 rounded-lg border border-slate-200 overflow-hidden bg-white shrink-0 shadow-2xs">
                                            <Image
                                              src={item.imageUrl}
                                              alt={item.productName || "Product"}
                                              fill
                                              className="object-cover"
                                            />
                                          </div>
                                        ) : (
                                          <div className="w-12 h-12 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400">
                                            <Package className="h-5 w-5" />
                                          </div>
                                        )}
                                      </td>
                                      <td className="py-3.5 px-4 align-top">
                                        <div className="space-y-1">
                                          <div className="flex items-center gap-2">
                                            <span className="font-bold text-slate-900 block">
                                              {item.productName || "Unnamed Product"}
                                            </span>
                                          </div>

                                          <div className="flex flex-wrap items-center gap-2 text-[11px]">
                                            {item.sku && (
                                              <span className="text-slate-500 font-mono">
                                                SKU: {item.sku}
                                              </span>
                                            )}
                                            
                                            {hasDesc && (
                                              <button
                                                type="button"
                                                onClick={() => toggleItemExpand(item.id)}
                                                className="inline-flex items-center gap-1 font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2 py-0.5 rounded transition-colors cursor-pointer select-none"
                                              >
                                                <span>{isExpanded ? "Hide Description" : "View Description & Details"}</span>
                                                {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                                              </button>
                                            )}
                                          </div>
                                        </div>
                                      </td>
                                      <td className="py-3.5 px-4 w-28 text-xs text-slate-600 align-top">
                                        {item.weight || "—"}
                                      </td>
                                      <td className="py-3.5 px-4 text-center w-20 font-bold text-slate-800 align-top">
                                        {item.quantity || 0}
                                      </td>
                                      <td className="py-3.5 px-4 text-right w-28 text-slate-700 font-medium align-top">
                                        {formatMoney(item.unitPrice || 0)}
                                      </td>
                                      <td className="py-3.5 px-4 text-right w-32 font-bold text-slate-900 align-top">
                                        {formatMoney((item.quantity || 0) * (item.unitPrice || 0))}
                                      </td>
                                    </tr>
                                  </tbody>
                                </table>
                              </div>

                              {hasDesc && isExpanded && (
                                <div className="px-6 pb-4 pt-1 bg-slate-50/90 border-t border-slate-200/70 border-b border-slate-200/70">
                                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-1.5">
                                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                                      <span>Product Description & Specifications</span>
                                    </div>
                                    <p className="text-xs text-slate-700 whitespace-pre-line leading-relaxed">
                                      {item.description}
                                    </p>
                                  </div>
                                </div>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Subtotals & Grand Total Breakdown */}
              <div className="flex flex-col sm:flex-row justify-end pt-2">
                <div className="w-full sm:w-80 space-y-2.5 p-5 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="flex justify-between text-sm text-slate-600">
                    <span>Subtotal:</span>
                    <span className="font-semibold text-slate-800">{formatMoney(data.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-slate-600">
                    <span>Freight & Delivery:</span>
                    <span className="font-semibold text-slate-800">
                      {parseFloat(data.shippingCost) > 0 ? formatMoney(parseFloat(data.shippingCost)) : "Free / Included"}
                    </span>
                  </div>
                  <div className="border-t border-slate-200 pt-3 flex justify-between items-baseline">
                    <span className="font-bold text-slate-900 text-base">Total Due:</span>
                    <span className="font-black text-2xl text-slate-900">{formatMoney(data.total)}</span>
                  </div>
                </div>
              </div>

              <div className="text-center text-xs text-slate-500 mt-4">
                This is a preview of what the customer will see when they click the invoice link.
              </div>

            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
