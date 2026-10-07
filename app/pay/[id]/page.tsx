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
    <div className="min-h-screen bg-slate-100/70 py-10 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Success Alert */}
        {isSuccessParam && (
          <div className="bg-emerald-50 border-2 border-emerald-300 text-emerald-950 rounded-xl p-5 flex items-start gap-3 shadow-xs print:hidden">
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
          <div className="bg-amber-50 border border-amber-300 text-amber-950 rounded-xl p-5 flex items-start gap-3 shadow-xs print:hidden">
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
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden print:border-none print:shadow-none">
          
          {/* Header Bar */}
          <div className="p-6 sm:p-10 border-b border-slate-200 bg-slate-900 text-white">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
              
              {/* Brand Logo & Legal Entity */}
              <div className="flex items-center gap-4">
                <div className="relative w-16 h-16 bg-white rounded-xl p-1.5 shadow-sm flex items-center justify-center shrink-0">
                  <Image
                    src={company?.logoUrl || "/images/logo.png"}
                    alt="Product Brands"
                    width={60}
                    height={60}
                    className="object-contain"
                  />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-2xl font-black tracking-tight text-white uppercase">
                      {company?.name || "Product Brands"}
                    </h1>
                    <span className="text-[10px] bg-slate-800 border border-slate-700 px-2 py-0.5 rounded text-slate-300 font-semibold tracking-wider uppercase">
                      Official Invoice
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-1">
                    Wholesale Distribution & Commercial Supply
                  </p>
                </div>
              </div>

              {/* Status & Invoice Number */}
              <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-2">
                <div className="text-left sm:text-right">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest block">
                    Invoice Number
                  </span>
                  <span className="text-xl font-mono font-bold text-slate-100">
                    INV-{order.id.slice(-8).toUpperCase()}
                  </span>
                </div>
                <div>
                  {isPaid ? (
                    <Badge className="bg-emerald-500 hover:bg-emerald-500 text-slate-950 font-bold px-3 py-1 text-xs uppercase tracking-wider shadow-sm flex items-center gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5 text-slate-950" />
                      Paid & Confirmed
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
                  Product Brands LLC
                </div>
                <div className="text-slate-600 flex items-start gap-2 pt-0.5">
                  <MapPin className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                  <span>{company?.address || "8001 NW 54th St, Doral FL, 33166"}</span>
                </div>
                <div className="text-slate-600 flex items-center gap-2">
                  <Phone className="h-4 w-4 text-slate-400 shrink-0" />
                  <span>{company?.phone || "+1 786-295-4063"}</span>
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
                    {order.items.map((item, idx) => (
                      <tr key={item.id || idx} className="hover:bg-slate-50/50">
                        <td className="py-3.5 px-4">
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
                        <td className="py-3.5 px-4">
                          <span className="font-bold text-slate-900 block">{item.productName}</span>
                          {item.sku && (
                            <span className="text-[11px] text-slate-500 font-mono">
                              SKU: {item.sku}
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-xs text-slate-600">
                          {item.weight || "—"}
                        </td>
                        <td className="py-3.5 px-4 text-center font-bold text-slate-800">
                          {item.quantity}
                        </td>
                        <td className="py-3.5 px-4 text-right text-slate-700 font-medium">
                          {formatMoney(item.unitPrice)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-bold text-slate-900">
                          {formatMoney(item.totalPrice)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Subtotals & Grand Total Breakdown */}
            <div className="flex flex-col sm:flex-row justify-end pt-2">
              <div className="w-full sm:w-80 space-y-2.5 p-5 rounded-xl bg-slate-50 border border-slate-200">
                <div className="flex justify-between text-sm text-slate-600">
                  <span>Subtotal:</span>
                  <span className="font-semibold text-slate-800">{formatMoney(order.subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm text-slate-600">
                  <span>Freight & Delivery:</span>
                  <span className="font-semibold text-slate-800">
                    {order.shippingCost > 0 ? formatMoney(order.shippingCost) : "Free / Included"}
                  </span>
                </div>
                <div className="border-t border-slate-200 pt-3 flex justify-between items-baseline">
                  <span className="font-bold text-slate-900 text-base">Total Due:</span>
                  <span className="font-black text-2xl text-slate-900">{formatMoney(order.totalAmount)}</span>
                </div>
              </div>
            </div>

            {/* Protective Legal Terms & Conditions */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-5 space-y-3">
              <div 
                className="flex items-center justify-between cursor-pointer select-none"
                onClick={() => setShowFullTerms(!showFullTerms)}
              >
                <div className="flex items-center gap-2">
                  <FileCheck2 className="h-4 w-4 text-slate-700" />
                  <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Wholesale Terms of Sale & Inspection Policy
                  </span>
                </div>
                <Button variant="ghost" size="sm" className="h-6 px-1.5 text-xs text-slate-500">
                  {showFullTerms ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </div>

              <div className={`text-xs text-slate-600 space-y-2 leading-relaxed ${showFullTerms ? "block" : "line-clamp-3"}`}>
                <p className="whitespace-pre-line">{order.terms || "Standard Product Brands terms apply."}</p>
              </div>

              {!isPaid && (
                <div className="pt-3 border-t border-slate-200">
                  <div className="flex items-start space-x-2.5">
                    <Checkbox
                      id="termsCheckbox"
                      checked={agreedToTerms}
                      onCheckedChange={(checked) => setAgreedToTerms(!!checked)}
                      className="mt-0.5"
                    />
                    <label
                      htmlFor="termsCheckbox"
                      className="text-xs text-slate-800 font-semibold cursor-pointer select-none leading-snug"
                    >
                      I have read, acknowledge, and agree to Product Brands LLC Wholesale Terms & Conditions, including the 48-hour delivery inspection window, final wholesale sale policy, and payment processing authorization.
                    </label>
                  </div>
                </div>
              )}
            </div>

            {/* Payment Section */}
            <div className="pt-2 print:hidden">
              {isPaid ? (
                <div className="bg-emerald-50 border-2 border-emerald-300 rounded-xl p-8 text-center space-y-4">
                  <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-emerald-100 text-emerald-600">
                    <CheckCircle2 className="h-8 w-8" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-emerald-950">Official Receipt: Payment Confirmed</h3>
                    <p className="text-sm text-emerald-800 mt-1 max-w-lg mx-auto">
                      Payment for this invoice has been fully authorized and recorded. A receipt has been dispatched to {order.customerEmail}.
                    </p>
                    {order.stripePaymentIntent && (
                      <div className="mt-2 text-xs font-mono text-emerald-700">
                        Reference: {order.stripePaymentIntent}
                      </div>
                    )}
                  </div>
                  <Button onClick={handlePrint} variant="outline" className="border-emerald-300 hover:bg-emerald-100 text-emerald-950 font-semibold">
                    <Printer className="h-4 w-4 mr-2" />
                    Print / Save Official Invoice (PDF)
                  </Button>
                </div>
              ) : (
                <div className="bg-slate-900 text-white rounded-xl p-6 sm:p-8 space-y-6 shadow-lg">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <h3 className="text-xl font-bold text-white">Complete Secure Payment</h3>
                      <p className="text-xs text-slate-300 mt-1">
                        Encrypted transaction processed directly by Stripe. Select ACH Direct Debit or Card on next screen.
                      </p>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-300 bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700">
                      <Lock className="h-3.5 w-3.5 text-emerald-400" />
                      <span>Stripe 256-bit SSL</span>
                    </div>
                  </div>

                  {/* Payment Methods Info Box */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="flex items-center gap-3 bg-slate-800/80 border border-slate-700 p-3 rounded-lg">
                      <Landmark className="h-5 w-5 text-emerald-400 shrink-0" />
                      <div>
                        <strong className="block text-white">ACH Direct Debit (Recommended)</strong>
                        <span className="text-slate-400">Directly connect your US business bank account</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 bg-slate-800/80 border border-slate-700 p-3 rounded-lg">
                      <CreditCard className="h-5 w-5 text-blue-400 shrink-0" />
                      <div>
                        <strong className="block text-white">Credit & Debit Cards</strong>
                        <span className="text-slate-400">Visa, Mastercard, Amex, Discover</span>
                      </div>
                    </div>
                  </div>

                  {error && (
                    <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs p-3 rounded-lg">
                      {error}
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row gap-3 pt-2">
                    <Button
                      onClick={handleCheckout}
                      disabled={paying || !agreedToTerms}
                      size="lg"
                      className={`font-bold text-base px-8 h-12 shadow-lg flex-1 ${
                        agreedToTerms 
                          ? "bg-emerald-500 hover:bg-emerald-600 text-slate-950" 
                          : "bg-slate-700 text-slate-400 cursor-not-allowed"
                      }`}
                    >
                      {paying ? (
                        <>
                          <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                          Redirecting to Secure Checkout...
                        </>
                      ) : (
                        <>
                          Proceed to Payment ({formatMoney(order.totalAmount)})
                        </>
                      )}
                    </Button>
                    <Button 
                      onClick={handlePrint} 
                      variant="outline" 
                      size="lg" 
                      className="border-slate-700 text-white hover:bg-slate-800 h-12"
                    >
                      <Printer className="h-4 w-4 mr-2" />
                      Print Invoice
                    </Button>
                  </div>

                  {!agreedToTerms && (
                    <p className="text-[11px] text-amber-300 text-center">
                      * Please check the box above acknowledging the Terms & Conditions to enable payment.
                    </p>
                  )}
                </div>
              )}
            </div>

          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-slate-500 py-4 print:hidden space-y-1">
          <div>Product Brands LLC • Official Commercial Invoice</div>
          <div>
            Need assistance? Reach our billing desk at{" "}
            <a href="mailto:info@productbrands.com" className="underline hover:text-slate-700">
              info@productbrands.com
            </a>{" "}
            or{" "}
            <a href="tel:+17862954063" className="underline hover:text-slate-700">
              +1 786-295-4063
            </a>
          </div>
        </div>

      </div>
    </div>
  )
}
