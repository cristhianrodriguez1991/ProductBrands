"use client"

import { useEffect, useState } from "react"
import { useParams, useSearchParams } from "next/navigation"
import Image from "next/image"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
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
  PackageCheck
} from "lucide-react"

interface OrderItem {
  id: string
  productName: string
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
        throw new Error("Unable to load invoice details")
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
      console.error("Payment verification failed", err)
    } finally {
      setVerifyingPayment(false)
    }
  }

  const handleCheckout = async () => {
    if (!order) return
    try {
      setPaying(true)
      setError(null)
      const res = await fetch(`/api/orders/${order.id}/checkout`, {
        method: "POST",
      })
      const data = await res.json()
      if (!res.ok || !data.url) {
        throw new Error(data.error || "Failed to initialize payment checkout")
      }
      // Redirect to Stripe Checkout
      window.location.href = data.url
    } catch (err: any) {
      setError(err.message || "Something went wrong while launching checkout.")
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
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <Loader2 className="h-10 w-10 text-primary animate-spin mb-4" />
        <p className="text-muted-foreground text-sm">Loading invoice...</p>
      </div>
    )
  }

  if (error && !order) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <Card className="max-w-md w-full text-center p-6">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900 mb-2">Invoice Not Found</h2>
          <p className="text-muted-foreground text-sm mb-6">{error}</p>
          <Button onClick={() => window.location.reload()} variant="outline">
            Try Again
          </Button>
        </Card>
      </div>
    )
  }

  if (!order) return null

  const isPaid = order.status === "PAID" || paymentSuccess

  return (
    <div className="min-h-screen bg-slate-50/80 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Success / Canceled Notifications */}
        {isSuccessParam && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl p-4 sm:p-5 flex items-start gap-3 shadow-sm print:hidden">
            <CheckCircle2 className="h-6 w-6 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-emerald-950">Payment Successful!</h3>
              <p className="text-sm text-emerald-800 mt-0.5">
                Thank you for your payment. Your transaction has been completed and your invoice is marked as paid.
              </p>
            </div>
          </div>
        )}

        {isCanceledParam && !isPaid && (
          <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-xl p-4 sm:p-5 flex items-start gap-3 shadow-sm print:hidden">
            <AlertCircle className="h-6 w-6 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-amber-950">Payment Incomplete</h3>
              <p className="text-sm text-amber-800 mt-0.5">
                The payment checkout was canceled or closed. You can review the details below and proceed whenever you are ready.
              </p>
            </div>
          </div>
        )}

        {/* Invoice Main Sheet */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
          
          {/* Top Header */}
          <div className="p-6 sm:p-8 border-b border-slate-100 bg-slate-900 text-white">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
              <div className="flex items-center gap-4">
                <div className="relative w-14 h-14 bg-white rounded-xl p-1 shadow-sm flex items-center justify-center shrink-0">
                  <Image
                    src={company?.logoUrl || "/images/logo.png"}
                    alt="Product Brands"
                    width={56}
                    height={56}
                    className="object-contain"
                  />
                </div>
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-white">{company?.name || "Product Brands"}</h1>
                  <p className="text-xs text-slate-300 mt-0.5">Order Invoice & Delivery Agreement</p>
                </div>
              </div>

              <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-2">
                <div className="text-left sm:text-right">
                  <span className="text-xs text-slate-400 uppercase tracking-wider block">Invoice Number</span>
                  <span className="text-lg font-mono font-bold text-slate-100">
                    INV-{order.id.slice(-8).toUpperCase()}
                  </span>
                </div>
                <div>
                  {isPaid ? (
                    <Badge className="bg-emerald-500 hover:bg-emerald-500 text-white font-semibold px-3 py-1 text-xs uppercase tracking-wider shadow-sm flex items-center gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Paid
                    </Badge>
                  ) : (
                    <Badge className="bg-amber-500/90 text-white font-semibold px-3 py-1 text-xs uppercase tracking-wider">
                      Payment Due
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="p-6 sm:p-8 space-y-8">
            
            {/* Business & Customer Information Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pb-6 border-b border-slate-100">
              {/* Issued By */}
              <div>
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Issued By</h3>
                <div className="text-sm font-bold text-slate-900">{company?.name || "Product Brands LLC"}</div>
                <div className="text-sm text-slate-600 mt-1 flex items-start gap-1.5">
                  <MapPin className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                  <span>{company?.address || "8001 NW 54th St, Doral FL, 33166"}</span>
                </div>
                <div className="text-sm text-slate-600 mt-1 flex items-center gap-1.5">
                  <Phone className="h-4 w-4 text-slate-400 shrink-0" />
                  <span>{company?.phone || "+1 786-295-4063"}</span>
                </div>
                <div className="text-sm text-slate-600 mt-1 flex items-center gap-1.5">
                  <Mail className="h-4 w-4 text-slate-400 shrink-0" />
                  <span>{company?.email || "info@productbrands.com"}</span>
                </div>
              </div>

              {/* Billed To */}
              <div>
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Billed To</h3>
                <div className="text-sm font-bold text-slate-900">{order.customerName}</div>
                {order.companyName && (
                  <div className="text-sm text-slate-600 mt-1 flex items-center gap-1.5">
                    <Building2 className="h-4 w-4 text-slate-400 shrink-0" />
                    <span className="font-medium text-slate-700">{order.companyName}</span>
                  </div>
                )}
                <div className="text-sm text-slate-600 mt-1 flex items-center gap-1.5">
                  <Mail className="h-4 w-4 text-slate-400 shrink-0" />
                  <span>{order.customerEmail}</span>
                </div>
                {order.customerPhone && (
                  <div className="text-sm text-slate-600 mt-1 flex items-center gap-1.5">
                    <Phone className="h-4 w-4 text-slate-400 shrink-0" />
                    <span>{order.customerPhone}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Order & Delivery Metadata */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100 text-sm">
              <div>
                <span className="text-xs text-slate-500 block">Date Issued</span>
                <span className="font-semibold text-slate-800">
                  {new Date(order.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </span>
              </div>
              <div>
                <span className="text-xs text-slate-500 block">Delivery Method</span>
                <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                  <Truck className="h-3.5 w-3.5 text-slate-500" />
                  {order.deliveryType === "PICKUP" ? "Warehouse Pickup" : "Delivery / Shipping"}
                </span>
              </div>
              <div>
                <span className="text-xs text-slate-500 block">Target Delivery</span>
                <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-slate-500" />
                  {order.deliveryDate 
                    ? new Date(order.deliveryDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                    : "To be confirmed"}
                </span>
              </div>
              <div>
                <span className="text-xs text-slate-500 block">Payment Method</span>
                <span className="font-semibold text-slate-800">
                  {isPaid ? "Paid via Stripe" : "ACH Bank / Card"}
                </span>
              </div>
            </div>

            {/* Line Items Table */}
            <div>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3">Order Items</h3>
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase">
                    <tr>
                      <th className="py-3 px-4 w-16">Item</th>
                      <th className="py-3 px-4">Description</th>
                      <th className="py-3 px-4 text-center w-24">Qty</th>
                      <th className="py-3 px-4 text-right w-28">Price</th>
                      <th className="py-3 px-4 text-right w-32">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {order.items.map((item, idx) => (
                      <tr key={item.id || idx} className="hover:bg-slate-50/50">
                        <td className="py-3.5 px-4">
                          {item.imageUrl ? (
                            <div className="relative w-12 h-12 rounded-lg border border-slate-200 overflow-hidden bg-white shrink-0">
                              <Image
                                src={item.imageUrl}
                                alt={item.productName}
                                fill
                                className="object-cover"
                              />
                            </div>
                          ) : (
                            <div className="w-12 h-12 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400">
                              <PackageCheck className="h-5 w-5" />
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-semibold text-slate-900 block">{item.productName}</span>
                        </td>
                        <td className="py-3.5 px-4 text-center font-medium text-slate-700">
                          {item.quantity}
                        </td>
                        <td className="py-3.5 px-4 text-right text-slate-600">
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

            {/* Calculations & Totals */}
            <div className="flex flex-col sm:flex-row justify-end">
              <div className="w-full sm:w-80 space-y-2.5 p-4 rounded-xl bg-slate-50/80 border border-slate-100">
                <div className="flex justify-between text-sm text-slate-600">
                  <span>Subtotal:</span>
                  <span className="font-semibold text-slate-800">{formatMoney(order.subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm text-slate-600">
                  <span>Delivery / Shipping:</span>
                  <span className="font-semibold text-slate-800">
                    {order.shippingCost > 0 ? formatMoney(order.shippingCost) : "Free / Included"}
                  </span>
                </div>
                <div className="border-t border-slate-200 pt-2.5 flex justify-between items-baseline">
                  <span className="font-bold text-slate-900 text-base">Total Amount:</span>
                  <span className="font-black text-2xl text-slate-900">{formatMoney(order.totalAmount)}</span>
                </div>
              </div>
            </div>

            {/* Terms & Notes */}
            {(order.terms || order.notes) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100 text-xs">
                {order.terms && (
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                    <h4 className="font-bold text-slate-900 mb-1">Terms & Conditions</h4>
                    <p className="text-slate-600 leading-relaxed whitespace-pre-line">{order.terms}</p>
                  </div>
                )}
                {order.notes && (
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                    <h4 className="font-bold text-slate-900 mb-1">Special Notes</h4>
                    <p className="text-slate-600 leading-relaxed whitespace-pre-line">{order.notes}</p>
                  </div>
                )}
              </div>
            )}

            {/* Payment Action Bar */}
            <div className="pt-6 border-t border-slate-100 print:hidden">
              {isPaid ? (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 text-center space-y-3">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-100 text-emerald-600">
                    <CheckCircle2 className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-emerald-950">This invoice has been fully paid</h3>
                    <p className="text-sm text-emerald-800 mt-1">
                      A confirmation email has been sent to {order.customerEmail}. You can print this page for your records.
                    </p>
                  </div>
                  <Button onClick={handlePrint} variant="outline" className="mt-2 border-emerald-300 hover:bg-emerald-100">
                    <Printer className="h-4 w-4 mr-2" />
                    Print / Save Receipt
                  </Button>
                </div>
              ) : (
                <div className="bg-slate-900 text-white rounded-xl p-6 sm:p-8 space-y-6 shadow-md">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <h3 className="text-xl font-bold text-white">Ready to pay this invoice?</h3>
                      <p className="text-sm text-slate-300 mt-1">
                        Secure instant payment powered by Stripe. You can pay via ACH Direct Bank Transfer or Credit/Debit Card.
                      </p>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-300 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700">
                      <ShieldCheck className="h-4 w-4 text-emerald-400" />
                      <span>256-bit Encrypted</span>
                    </div>
                  </div>

                  {/* Payment Options Callout */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="flex items-center gap-3 bg-slate-800/60 border border-slate-700/60 p-3 rounded-lg">
                      <Landmark className="h-5 w-5 text-emerald-400 shrink-0" />
                      <div>
                        <strong className="block text-white">ACH Direct Debit (Recommended)</strong>
                        <span className="text-slate-400">Directly connect your US bank account</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 bg-slate-800/60 border border-slate-700/60 p-3 rounded-lg">
                      <CreditCard className="h-5 w-5 text-blue-400 shrink-0" />
                      <div>
                        <strong className="block text-white">Credit & Debit Cards</strong>
                        <span className="text-slate-400">Visa, Mastercard, Amex, Discover</span>
                      </div>
                    </div>
                  </div>

                  {error && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-200 text-xs p-3 rounded-lg">
                      {error}
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row gap-3 pt-2">
                    <Button
                      onClick={handleCheckout}
                      disabled={paying || verifyingPayment}
                      size="lg"
                      className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-base px-8 h-12 shadow-lg flex-1"
                    >
                      {paying ? (
                        <>
                          <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                          Opening Secure Checkout...
                        </>
                      ) : (
                        <>
                          Pay {formatMoney(order.totalAmount)} Now
                        </>
                      )}
                    </Button>
                    <Button onClick={handlePrint} variant="outline" size="lg" className="border-slate-700 text-white hover:bg-slate-800 h-12">
                      <Printer className="h-4 w-4 mr-2" />
                      Print Invoice
                    </Button>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-slate-400 py-4 print:hidden">
          Product Brands LLC • Questions about this invoice? Contact{" "}
          <a href="mailto:info@productbrands.com" className="underline hover:text-slate-600">
            info@productbrands.com
          </a>{" "}
          or call{" "}
          <a href="tel:+17862954063" className="underline hover:text-slate-600">
            +1 786-295-4063
          </a>
        </div>

      </div>
    </div>
  )
}
