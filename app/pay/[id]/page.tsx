"use client"

import { useEffect, useState } from "react"
import { useParams, useSearchParams } from "next/navigation"
import Image from "next/image"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { 
  Building2, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  Truck, 
  CheckCircle2, 
  CreditCard, 
  Landmark, 
  Printer, 
  Loader2, 
  AlertCircle,
  ShieldCheck,
  Package,
  FileCheck2,
  Lock,
  ChevronDown,
  ChevronUp
} from "lucide-react"
import { formatInvoiceNumber } from "@/lib/invoice"
import { InvoicePaymentPanel } from "@/components/pay/InvoicePaymentPanel"

interface OrderItem {
  id: string
  productName: string
  sku?: string | null
  weight?: string | null
  description?: string | null
  imageUrl?: string | null
  quantity: number
  unitPrice: number
  totalPrice: number
}

interface OrderData {
  id: string
  customerName: string
  customerEmail: string
  customerPhone?: string | null
  companyName?: string | null
  status: string
  deliveryDate?: string | null
  deliveryType: string
  shippingCost: number
  terms?: string | null
  notes?: string | null
  subtotal: number
  totalAmount: number
  invoiceNumber?: number | null
  processingFee?: number | null
  paymentMethodType?: string | null
  stripePaymentIntent?: string | null
  createdAt: string
  items: OrderItem[]
}

interface CompanyInfo {
  name: string
  address: string
  phone: string
  email: string
  logoUrl: string
}

export default function CustomerInvoicePayPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const orderId = params?.id as string

  const [order, setOrder] = useState<OrderData | null>(null)
  const [company, setCompany] = useState<CompanyInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [paying, setPaying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [paymentSuccess, setPaymentSuccess] = useState(false)
  const [verifyingPayment, setVerifyingPayment] = useState(false)
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [showFullTerms, setShowFullTerms] = useState(false)
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({})
  const [paymentConfig, setPaymentConfig] = useState<{
    publishableKey: string | null
    cardSurchargePercent: number
  }>({ publishableKey: null, cardSurchargePercent: 3 })

  const toggleItemExpand = (id: string) => {
    setExpandedItems(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const isSuccessParam = searchParams.get("success") === "true"
  const isCanceledParam = searchParams.get("canceled") === "true"
  const sessionId = searchParams.get("session_id")

  useEffect(() => {
    if (!orderId) return
    loadOrder()
  }, [orderId])

  useEffect(() => {
    if (isSuccessParam && sessionId && orderId) {
      verifyPayment(sessionId)
    }
  }, [isSuccessParam, sessionId, orderId])

  const loadOrder = async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/orders/${orderId}`)
      if (!res.ok) {
        throw new Error("Unable to locate invoice")
      }
      const data = await res.json()
      setOrder(data.order)
      setCompany(data.companyInfo)
      if (data.paymentConfig) {
        setPaymentConfig(data.paymentConfig)
      }
    } catch (err: any) {
      setError(err.message || "Failed to load order")
    } finally {
      setLoading(false)
    }
  }

  const verifyPayment = async (sid: string) => {
    try {
      setVerifyingPayment(true)
      const res = await fetch(`/api/orders/${orderId}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: sid }),
      })
      const data = await res.json()
      if (data.paid && data.order) {
        setOrder(data.order)
        setPaymentSuccess(true)
      }
    } catch (err) {
      console.error("Payment verification error", err)
    } finally {
      setVerifyingPayment(false)
    }
  }

  const handleCheckout = async () => {
    if (!order) return
    if (!agreedToTerms) {
      setError("Please review and accept the Terms & Conditions before proceeding to payment.")
      return
    }

    try {
      setPaying(true)
      setError(null)
      const res = await fetch(`/api/orders/${order.id}/checkout`, {
        method: "POST",
      })
      const data = await res.json()
      if (!res.ok || !data.url) {
        throw new Error(data.error || "Failed to initiate payment checkout")
      }
      window.location.href = data.url
    } catch (err: any) {
      setError(err.message || "An error occurred during checkout initialization.")
      setPaying(false)
    }
  }

  const formatMoney = (val: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(val || 0)
  }

  const handlePrint = () => {
    window.print()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100/60 flex flex-col items-center justify-center p-4">
        <Loader2 className="h-10 w-10 text-slate-800 animate-spin mb-4" />
        <p className="text-slate-600 text-sm font-medium">Loading official invoice...</p>
      </div>
    )
  }

  if (error && !order) {
    return (
      <div className="min-h-screen bg-slate-100/60 flex flex-col items-center justify-center p-4">
        <Card className="max-w-md w-full text-center p-8 bg-white shadow-md border-slate-200">
          <AlertCircle className="h-12 w-12 text-rose-600 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900 mb-2">Invoice Not Found</h2>
          <p className="text-slate-600 text-sm mb-6">{error}</p>
          <Button onClick={() => window.location.reload()} variant="outline">
            Reload Page
          </Button>
        </Card>
      </div>
    )
  }

  if (!order) return null

  const isPaid = order.status === "PAID" || paymentSuccess

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page {
            size: letter portrait;
            margin: 10mm 12mm;
          }
          html, body {
            background: #ffffff !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}} />

      <div className="min-h-screen bg-slate-100/70 py-8 px-4 sm:px-6 lg:px-8 font-sans print:min-h-0 print:bg-white print:p-0 print:m-0">
        <div className="max-w-4xl mx-auto space-y-5 print:max-w-none print:space-y-0">
          
          {/* Success Alert */}
          {isSuccessParam && (
            <div className="bg-emerald-50 border-2 border-emerald-300 text-emerald-950 rounded-xl p-4 flex items-start gap-3 shadow-xs print:hidden">
              <CheckCircle2 className="h-6 w-6 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold text-emerald-950 text-base">Payment Confirmed</h3>
                <p className="text-sm text-emerald-800 mt-1">
                  Thank you! Your payment of <strong>{formatMoney(order.totalAmount)}</strong> has been processed successfully. Your order is confirmed for fulfillment.
                </p>
              </div>
            </div>
          )}

          {isCanceledParam && !isPaid && (
            <div className="bg-amber-50 border border-amber-300 text-amber-950 rounded-xl p-4 flex items-start gap-3 shadow-xs print:hidden">
              <AlertCircle className="h-6 w-6 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold text-amber-950 text-base">Payment Not Completed</h3>
                <p className="text-sm text-amber-800 mt-1">
                  The checkout session was closed without charging your account. You can review the invoice details and proceed whenever ready.
                </p>
              </div>
            </div>
          )}

          {/* Official Document Sheet */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden print:border-none print:shadow-none print:rounded-none">
            
            {/* Header Bar */}
            <div className="px-6 py-6 sm:px-8 sm:py-7 border-b border-slate-200 bg-white print:px-0 print:py-2 print:border-b-2 print:border-slate-800">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                
                {/* Brand Logo */}
                <div className="flex flex-col items-start">
                  <h1 className="sr-only">{company?.name || "Product Brands"} — Official Invoice</h1>
                  <Image
                    src={company?.logoUrl || "/images/logo.png"}
                    alt="Product Brands"
                    width={1426}
                    height={382}
                    priority
                    className="h-auto w-[240px] sm:w-[320px] md:w-[380px] print:w-[190px] object-contain"
                  />
                  <p className="text-xs sm:text-sm text-slate-500 font-semibold uppercase tracking-[0.2em] mt-2 print:mt-1 print:text-[10px]">
                    Wholesale Distribution &amp; Commercial Supply
                  </p>
                </div>

              {/* Status & Invoice Number */}
              <div className="flex md:flex-col items-center md:items-end justify-between w-full md:w-auto gap-2">
                <div className="text-left md:text-right">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest block">
                    Official Invoice
                  </span>
                  <span className="text-2xl font-mono font-black text-slate-900 tracking-tight">
                    {formatInvoiceNumber(order)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={handlePrint}
                    variant="outline"
                    size="sm"
                    className="h-7 px-2.5 text-xs font-semibold text-slate-700 border-slate-200 hover:bg-slate-100 hover:text-slate-900 print:hidden shadow-2xs"
                  >
                    <Printer className="h-3.5 w-3.5 mr-1 text-slate-500" />
                    Print / PDF
                  </Button>
                  {isPaid ? (
                    <Badge className="bg-emerald-500 hover:bg-emerald-500 text-slate-950 font-bold px-3 py-1 text-xs uppercase tracking-wider shadow-sm flex items-center gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5 text-slate-950" />
                      Paid &amp; Confirmed
                    </Badge>
                  ) : (
                    <Badge className="bg-amber-400 text-slate-950 font-bold px-3 py-1 text-xs uppercase tracking-wider">
                      Balance Due
                    </Badge>
                  )}
                </div>
              </div>

            </div>
          </div>

          <div className="p-6 sm:p-10 space-y-8">
            
            {/* Business & Customer Address Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pb-6 border-b border-slate-200">
              {/* Issued By */}
              <div className="space-y-1 text-sm">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
                  Issued By
                </span>
                <div className="font-bold text-slate-900 text-base">
                  Southern Basics LLC
                </div>
                <div className="text-slate-600 flex items-start gap-2 pt-0.5">
                  <MapPin className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                  <span>{company?.address || "8001 NW 54th St, Doral FL, 33166"}</span>
                </div>
                <div className="text-slate-600 flex items-center gap-2">
                  <Phone className="h-4 w-4 text-slate-400 shrink-0" />
                  <span>{company?.phone || "+1 305-600-3157"}</span>
                </div>
                <div className="text-slate-600 flex items-center gap-2">
                  <Mail className="h-4 w-4 text-slate-400 shrink-0" />
                  <span>{company?.email || "info@productbrands.com"}</span>
                </div>
              </div>

              {/* Billed To */}
              <div className="space-y-1 text-sm bg-slate-50/80 p-5 rounded-xl border border-slate-200/80">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
                  Billed To (Customer)
                </span>
                <div className="font-bold text-slate-900 text-base">{order.customerName}</div>
                {order.companyName && (
                  <div className="text-slate-700 font-semibold flex items-center gap-1.5 pt-0.5">
                    <Building2 className="h-4 w-4 text-slate-400 shrink-0" />
                    <span>{order.companyName}</span>
                  </div>
                )}
                <div className="text-slate-600 flex items-center gap-2">
                  <Mail className="h-4 w-4 text-slate-400 shrink-0" />
                  <span>{order.customerEmail}</span>
                </div>
                {order.customerPhone && (
                  <div className="text-slate-600 flex items-center gap-2">
                    <Phone className="h-4 w-4 text-slate-400 shrink-0" />
                    <span>{order.customerPhone}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Order Specs Metadata */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs">
              <div>
                <span className="text-slate-500 font-medium block">Issue Date</span>
                <span className="font-bold text-slate-900 text-sm mt-0.5 block">
                  {new Date(order.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </span>
              </div>
              <div>
                <span className="text-slate-500 font-medium block">Fulfillment Method</span>
                <span className="font-bold text-slate-900 text-sm mt-0.5 flex items-center gap-1.5">
                  <Truck className="h-4 w-4 text-slate-600" />
                  {order.deliveryType === "PICKUP" ? "Warehouse Pickup" : "Freight Delivery"}
                </span>
              </div>
              <div>
                <span className="text-slate-500 font-medium block">Estimated Delivery</span>
                <span className="font-bold text-slate-900 text-sm mt-0.5 flex items-center gap-1.5">
                  <Calendar className="h-4 w-4 text-slate-600" />
                  {order.deliveryDate 
                    ? new Date(order.deliveryDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                    : "Confirmed Upon Payment"}
                </span>
              </div>
              <div>
                <span className="text-slate-500 font-medium block">Payment Method</span>
                <span className="font-bold text-slate-900 text-sm mt-0.5 block">
                  {isPaid ? "Paid via Stripe" : "ACH Bank Transfer / Card"}
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
                  Total Items: {order.items.reduce((acc, i) => acc + i.quantity, 0)} units
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
                    {order.items.map((item, idx) => {
                      const itemKey = item.id || `item-${idx}`
                      const isExpanded = !!expandedItems[itemKey]
                      const hasDesc = !!(item.description && item.description.trim())

                      return (
                        <tr key={itemKey} className="group">
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
                                            alt={item.productName}
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
                                          <span className="font-bold text-slate-900 block">{item.productName}</span>
                                        </div>

                                        <div className="flex flex-wrap items-center gap-2 text-[11px]">
                                          {item.sku && (
                                            <span className="text-slate-500 font-mono">
                                              SKU: {item.sku}
                                            </span>
                                          )}
                                          
                                          {/* Optional Dropdown Toggle Button */}
                                          {hasDesc && (
                                            <button
                                              type="button"
                                              onClick={() => toggleItemExpand(itemKey)}
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
                                      {item.quantity}
                                    </td>
                                    <td className="py-3.5 px-4 text-right w-28 text-slate-700 font-medium align-top">
                                      {formatMoney(item.unitPrice)}
                                    </td>
                                    <td className="py-3.5 px-4 text-right w-32 font-bold text-slate-900 align-top">
                                      {formatMoney(item.totalPrice)}
                                    </td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>

                            {/* Dropdown Content Area (Only if description exists AND expanded) */}
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

            {/* Screen Mode: Unpaid Unified Checkout or Paid Receipt */}
            {!isPaid ? (
              <>
                <div className="pt-2 print:hidden">
                  <InvoicePaymentPanel
                    orderId={order.id}
                    amountDue={order.totalAmount}
                    subtotal={order.subtotal}
                    shippingCost={order.shippingCost}
                    deliveryType={order.deliveryType}
                    publishableKey={paymentConfig.publishableKey}
                    surchargePercent={paymentConfig.cardSurchargePercent}
                    agreedToTerms={agreedToTerms}
                    onToggleTerms={(checked) => setAgreedToTerms(checked)}
                    onRequireTerms={() => {
                      setError("Please review and agree to the Wholesale Terms & Conditions before paying.")
                      const el = document.getElementById("termsCheckbox")
                      el?.scrollIntoView({ behavior: "smooth", block: "center" })
                      el?.focus()
                    }}
                    onPaymentComplete={(updatedOrder) => {
                      setOrder(updatedOrder)
                      setPaymentSuccess(true)
                    }}
                    termsText={order.terms}
                  />
                </div>

                {/* Print Mode Only: Compact Single-Page Invoice Footer */}
                <div className="hidden print:grid print:grid-cols-12 print:gap-4 print:pt-3 print:border-t print:border-slate-200">
                  <div className="print:col-span-7 space-y-1">
                    <span className="text-[10px] font-bold text-slate-800 uppercase tracking-wider block">
                      Wholesale Terms of Sale &amp; Inspection Policy
                    </span>
                    <p className="text-[10px] text-slate-600 leading-snug line-clamp-4 whitespace-pre-line">
                      {order.terms || "Standard Product Brands wholesale terms apply. Payment is due in full upon invoice receipt via ACH Direct Debit or Credit/Debit Card. Buyer must inspect all goods immediately within 48 hours of delivery or warehouse pickup."}
                    </p>
                  </div>
                  <div className="print:col-span-5 space-y-1 text-xs text-slate-700 p-2.5 rounded-lg border border-slate-300 bg-slate-50/60">
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span className="font-semibold">{formatMoney(order.subtotal)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Freight &amp; Delivery:</span>
                      <span className="font-semibold">
                        {order.shippingCost > 0 ? formatMoney(order.shippingCost) : "Free / Included"}
                      </span>
                    </div>
                    <div className="flex justify-between font-bold text-slate-900 border-t border-slate-300 pt-1 text-sm">
                      <span>Total Due:</span>
                      <span>{formatMoney(order.totalAmount)}</span>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="pt-2 space-y-4">
                {/* Paid Receipt Summary */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 print:hidden">
                  <div className="lg:col-span-7 rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-2">
                    <div className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <FileCheck2 className="h-4 w-4 text-slate-600" />
                      <span>Wholesale Terms of Sale &amp; Inspection Policy</span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line line-clamp-4">
                      {order.terms || "Standard Product Brands terms apply."}
                    </p>
                  </div>
                  <div className="lg:col-span-5 bg-emerald-50 border-2 border-emerald-300 rounded-xl p-5 text-center space-y-3">
                    <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-emerald-100 text-emerald-600">
                      <CheckCircle2 className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-emerald-950">Payment Confirmed</h3>
                      <p className="text-xs text-emerald-800 mt-0.5">
                        Total Paid: <strong>{formatMoney(order.totalAmount + (order.processingFee || 0))}</strong>
                      </p>
                      {order.stripePaymentIntent && (
                        <div className="text-[10px] font-mono text-emerald-700 mt-1">
                          Ref: {order.stripePaymentIntent}
                        </div>
                      )}
                    </div>
                    <Button 
                      onClick={handlePrint} 
                      size="sm"
                      className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs shadow-xs"
                    >
                      <Printer className="h-3.5 w-3.5 mr-1.5" />
                      Print / Save Official Invoice (PDF)
                    </Button>
                  </div>
                </div>

                {/* Print View for Paid Order */}
                <div className="hidden print:grid print:grid-cols-12 print:gap-4 print:pt-3 print:border-t print:border-slate-200">
                  <div className="print:col-span-7 space-y-1">
                    <span className="text-[10px] font-bold text-slate-800 uppercase tracking-wider block">
                      Wholesale Terms of Sale &amp; Inspection Policy
                    </span>
                    <p className="text-[10px] text-slate-600 leading-snug line-clamp-4 whitespace-pre-line">
                      {order.terms || "Standard Product Brands terms apply."}
                    </p>
                  </div>
                  <div className="print:col-span-5 space-y-1 text-xs text-slate-700 p-2.5 rounded-lg border border-slate-300 bg-slate-50/60">
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span className="font-semibold">{formatMoney(order.subtotal)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Freight &amp; Delivery:</span>
                      <span className="font-semibold">
                        {order.shippingCost > 0 ? formatMoney(order.shippingCost) : "Free / Included"}
                      </span>
                    </div>
                    <div className="flex justify-between font-bold text-emerald-900 border-t border-slate-300 pt-1 text-sm">
                      <span>Total Paid:</span>
                      <span>{formatMoney(order.totalAmount + (order.processingFee || 0))}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-slate-500 py-4 print:hidden space-y-1">
          <div>Southern Basics LLC • Official Commercial Invoice</div>
          <div>
            Need assistance? Reach our billing desk at{" "}
            <a href="mailto:info@productbrands.com" className="underline hover:text-slate-700">
              info@productbrands.com
            </a>{" "}
            or{" "}
            <a href="tel:+13056003157" className="underline hover:text-slate-700">
              +1 305-600-3157
            </a>
          </div>
        </div>

      </div>
    </div>
    </>
  )
}
