"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import { formatInvoiceNumber } from "@/lib/invoice"
import Image from "next/image"
import { 
  Building2, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  Truck, 
  Package, 
  ExternalLink, 
  Copy, 
  Send, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
  Receipt,
  FileCheck2,
  Check
} from "lucide-react"

interface LineItem {
  id: string
  productName: string
  sku?: string | null
  weight?: string | null
  description?: string | null
  quantity: number
  unitPrice: number
  totalPrice?: number
  imageUrl?: string | null
}

export interface CustomerOrderData {
  id: string
  invoiceNumber?: number | null
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
  processingFee?: number | null
  paymentMethodType?: string | null
  completedAt?: string | null
  completionNotes?: string | null
  receivedDate?: string | null
  stripeSessionId?: string | null
  stripePaymentIntent?: string | null
  createdAt: string
  items: LineItem[]
}

interface OrderDetailDialogProps {
  order: CustomerOrderData | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onOrderUpdated: () => void
}

export function OrderDetailDialog({
  order,
  open,
  onOpenChange,
  onOrderUpdated
}: OrderDetailDialogProps) {
  const { toast } = useToast()
  const [updating, setUpdating] = useState(false)
  const [sendingReceipt, setSendingReceipt] = useState(false)
  const [sendingInvoice, setSendingInvoice] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({})

  // Status & completion form state
  const [selectedStatus, setSelectedStatus] = useState<string>(order?.status || "DRAFT")
  const [completedDate, setCompletedDate] = useState<string>(
    order?.completedAt ? new Date(order.completedAt).toISOString().split("T")[0] : new Date().toISOString().split("T")[0]
  )
  const [completionNotes, setCompletionNotes] = useState<string>(order?.completionNotes || "")

  // Reset form when order changes
  const prevId = order?.id
  const [currentId, setCurrentId] = useState(prevId)
  if (prevId !== currentId) {
    setCurrentId(prevId)
    if (order) {
      setSelectedStatus(order.status)
      setCompletedDate(
        order.completedAt ? new Date(order.completedAt).toISOString().split("T")[0] : new Date().toISOString().split("T")[0]
      )
      setCompletionNotes(order.completionNotes || "")
    }
  }

  if (!order) return null

  const formatMoney = (val: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(val || 0)
  }

  const invoiceNo = formatInvoiceNumber(order)
  const payUrl = typeof window !== "undefined" ? `${window.location.origin}/pay/${order.id}` : `/pay/${order.id}`

  const toggleItemExpand = (id: string) => {
    setExpandedItems(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const handleCopyLink = () => {
    navigator.clipboard.writeText(payUrl)
    setCopiedLink(true)
    toast({ title: "Link Copied", description: "Payment link copied to clipboard." })
    setTimeout(() => setCopiedLink(false), 2000)
  }

  const handleSendInvoiceEmail = async () => {
    try {
      setSendingInvoice(true)
      const res = await fetch(`/api/admin/customer-orders/${order.id}/send-email`, { method: "POST" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to send invoice email")
      toast({ title: "Invoice Sent", description: `Invoice email dispatched to ${order.customerEmail}` })
      onOrderUpdated()
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" })
    } finally {
      setSendingInvoice(false)
    }
  }

  const handleSendReceiptEmail = async () => {
    try {
      setSendingReceipt(true)
      const res = await fetch(`/api/admin/customer-orders/${order.id}/send-receipt`, { method: "POST" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to send confirmation receipt")
      toast({ title: "Confirmation Sent", description: `Order confirmation & receipt dispatched to ${order.customerEmail}` })
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" })
    } finally {
      setSendingReceipt(false)
    }
  }

  const handleSaveStatus = async () => {
    try {
      setUpdating(true)
      const payload: any = {
        status: selectedStatus,
      }

      if (selectedStatus === "COMPLETED") {
        payload.completedAt = completedDate ? new Date(completedDate).toISOString() : new Date().toISOString()
        payload.completionNotes = completionNotes
      } else if (order.status === "COMPLETED" && selectedStatus !== "COMPLETED") {
        payload.completedAt = null
        payload.completionNotes = null
      }

      const res = await fetch(`/api/admin/customer-orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!res.ok) throw new Error("Failed to update order status")
      toast({ title: "Order Updated", description: `Status changed to ${selectedStatus}` })
      onOrderUpdated()
      onOpenChange(false)
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" })
    } finally {
      setUpdating(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return (
          <Badge className="bg-indigo-600 hover:bg-indigo-600 text-white flex items-center gap-1.5 px-3 py-1 font-bold">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Order Completed
          </Badge>
        )
      case "PAID":
        return (
          <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white flex items-center gap-1.5 px-3 py-1 font-bold">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Paid
          </Badge>
        )
      case "SENT":
        return (
          <Badge className="bg-blue-600 hover:bg-blue-600 text-white flex items-center gap-1.5 px-3 py-1 font-bold">
            <Clock className="h-3.5 w-3.5" />
            Sent
          </Badge>
        )
      case "CANCELLED":
        return <Badge variant="destructive" className="px-3 py-1 font-bold">Cancelled</Badge>
      default:
        return <Badge variant="secondary" className="px-3 py-1 font-bold">Draft</Badge>
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto p-0 border border-slate-200 bg-white">
        {/* Top Header */}
        <div className="p-6 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-black text-slate-900 font-mono tracking-tight">
                {invoiceNo}
              </h2>
              {getStatusBadge(order.status)}
            </div>
            <p className="text-xs text-slate-500">
              Created on {new Date(order.createdAt).toLocaleDateString()} at {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyLink}
              className="h-9 text-xs font-semibold"
            >
              {copiedLink ? <Check className="h-3.5 w-3.5 mr-1 text-emerald-600" /> : <Copy className="h-3.5 w-3.5 mr-1" />}
              {copiedLink ? "Copied" : "Copy Link"}
            </Button>
            <a href={payUrl} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm" className="h-9 text-xs font-semibold">
                <ExternalLink className="h-3.5 w-3.5 mr-1" />
                View Invoice
              </Button>
            </a>
            {order.status === "PAID" || order.status === "COMPLETED" ? (
              <Button
                variant="outline"
                size="sm"
                onClick={handleSendReceiptEmail}
                disabled={sendingReceipt}
                className="h-9 text-xs font-semibold text-emerald-700 border-emerald-200 hover:bg-emerald-50"
              >
                {sendingReceipt ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Receipt className="h-3.5 w-3.5 mr-1" />}
                Send Confirmation Receipt
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={handleSendInvoiceEmail}
                disabled={sendingInvoice}
                className="h-9 text-xs font-semibold"
              >
                {sendingInvoice ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Send className="h-3.5 w-3.5 mr-1" />}
                Send Invoice Email
              </Button>
            )}
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Status & Completion Tracking Box */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-5 space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-3 border-b border-slate-200">
              <div>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  Order Status &amp; Fulfillment
                </h3>
                <p className="text-xs text-slate-500">
                  Update payment and delivery completion status
                </p>
              </div>
              <div className="w-full sm:w-56">
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger className="bg-white font-semibold text-xs h-9">
                    <SelectValue placeholder="Select Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DRAFT">Draft</SelectItem>
                    <SelectItem value="SENT">Sent</SelectItem>
                    <SelectItem value="PAID">Paid</SelectItem>
                    <SelectItem value="COMPLETED">Order Completed (Finished)</SelectItem>
                    <SelectItem value="CANCELLED">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {selectedStatus === "COMPLETED" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div>
                  <Label className="text-xs font-semibold text-slate-700">Date Received / Completed</Label>
                  <Input
                    type="date"
                    value={completedDate}
                    onChange={(e) => setCompletedDate(e.target.value)}
                    className="mt-1 bg-white text-xs h-9"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    When the customer received or picked up the goods
                  </p>
                </div>
                <div>
                  <Label className="text-xs font-semibold text-slate-700">Completion / Pickup Notes</Label>
                  <Input
                    type="text"
                    placeholder="e.g. Delivered by freight / Picked up by customer"
                    value={completionNotes}
                    onChange={(e) => setCompletionNotes(e.target.value)}
                    className="mt-1 bg-white text-xs h-9"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Carrier, tracking #, or who picked it up
                  </p>
                </div>
              </div>
            )}

            <div className="flex justify-end pt-1">
              <Button
                onClick={handleSaveStatus}
                disabled={updating}
                size="sm"
                className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold h-9 px-5"
              >
                {updating ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />}
                Save Status Changes
              </Button>
            </div>
          </div>

          {/* Customer & Delivery Information Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Customer Details */}
            <div className="rounded-xl border border-slate-200 p-4 space-y-2.5 bg-white">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                Customer Details
              </span>
              <div className="font-bold text-slate-900 text-base">{order.customerName}</div>
              {order.companyName && (
                <div className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  <span>{order.companyName}</span>
                </div>
              )}
              <div className="text-xs text-slate-600 flex items-center gap-2">
                <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                <a href={`mailto:${order.customerEmail}`} className="hover:underline">{order.customerEmail}</a>
              </div>
              {order.customerPhone && (
                <div className="text-xs text-slate-600 flex items-center gap-2">
                  <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  <a href={`tel:${order.customerPhone}`} className="hover:underline">{order.customerPhone}</a>
                </div>
              )}
            </div>

            {/* Delivery & Fulfillment Details */}
            <div className="rounded-xl border border-slate-200 p-4 space-y-2.5 bg-white">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                Fulfillment &amp; Delivery
              </span>
              <div className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
                <Truck className="h-4 w-4 text-slate-500" />
                <span>{order.deliveryType === "PICKUP" ? "Warehouse Pickup" : "Freight Delivery"}</span>
              </div>
              <div className="text-xs text-slate-600 flex items-center gap-2">
                <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                <span>
                  Estimated: {order.deliveryDate ? new Date(order.deliveryDate).toLocaleDateString() : "Confirmed upon payment"}
                </span>
              </div>
              {order.completedAt && (
                <div className="text-xs text-indigo-700 font-semibold flex items-center gap-1.5 bg-indigo-50 p-2 rounded-lg">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                  <span>Completed: {new Date(order.completedAt).toLocaleDateString()}</span>
                  {order.completionNotes && <span className="text-slate-600 font-normal">({order.completionNotes})</span>}
                </div>
              )}
              {order.stripePaymentIntent && (
                <div className="text-[11px] text-slate-500 font-mono pt-1">
                  Payment Ref: {order.stripePaymentIntent}
                </div>
              )}
            </div>
          </div>

          {/* Ordered Products Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Ordered Products ({order.items.reduce((acc, i) => acc + (i.quantity || 0), 0)} units)
              </h3>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-100/80 border-b border-slate-200 text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                  <tr>
                    <th className="py-2.5 px-4 w-16">Item</th>
                    <th className="py-2.5 px-4">Description</th>
                    <th className="py-2.5 px-4 w-28">Weight / Specs</th>
                    <th className="py-2.5 px-4 text-center w-20">Qty</th>
                    <th className="py-2.5 px-4 text-right w-28">Unit Price</th>
                    <th className="py-2.5 px-4 text-right w-32">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {order.items.map((item) => {
                    const isExpanded = !!expandedItems[item.id]
                    const hasDesc = !!(item.description && item.description.trim())

                    return (
                      <tr key={item.id}>
                        <td colSpan={6} className="p-0">
                          <div className="hover:bg-slate-50/60 transition-colors">
                            <table className="w-full text-left text-sm">
                              <tbody>
                                <tr>
                                  <td className="py-3 px-4 w-16 align-top">
                                    {item.imageUrl ? (
                                      <div className="relative w-12 h-12 rounded-lg border border-slate-200 overflow-hidden bg-white shrink-0">
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
                                  <td className="py-3 px-4 align-top">
                                    <div className="space-y-1">
                                      <span className="font-bold text-slate-900 block">
                                        {item.productName}
                                      </span>
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
                                            className="inline-flex items-center gap-1 font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 px-2 py-0.5 rounded cursor-pointer select-none"
                                          >
                                            <span>{isExpanded ? "Hide Description" : "View Description"}</span>
                                            {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  </td>
                                  <td className="py-3 px-4 w-28 text-xs text-slate-600 align-top">
                                    {item.weight || "—"}
                                  </td>
                                  <td className="py-3 px-4 text-center w-20 font-bold text-slate-800 align-top">
                                    {item.quantity}
                                  </td>
                                  <td className="py-3 px-4 text-right w-28 text-slate-700 font-medium align-top">
                                    {formatMoney(item.unitPrice)}
                                  </td>
                                  <td className="py-3 px-4 text-right w-32 font-bold text-slate-900 align-top">
                                    {formatMoney(item.quantity * item.unitPrice)}
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                          </div>

                          {hasDesc && isExpanded && (
                            <div className="px-6 pb-3 pt-1 bg-slate-50/90 border-t border-slate-200/70 border-b border-slate-200/70">
                              <div className="bg-white p-3 rounded-lg border border-slate-200 text-xs text-slate-700 whitespace-pre-line leading-relaxed">
                                {item.description}
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

          {/* Financial Totals */}
          <div className="flex justify-end">
            <div className="w-full sm:w-80 space-y-2 p-4 rounded-xl bg-slate-50 border border-slate-200 text-sm">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal:</span>
                <span className="font-semibold text-slate-900">{formatMoney(order.subtotal)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Freight &amp; Delivery:</span>
                <span className="font-semibold text-slate-900">
                  {order.shippingCost > 0 ? formatMoney(order.shippingCost) : "Free / Included"}
                </span>
              </div>
              {(order.processingFee || 0) > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>Credit Card Surcharge:</span>
                  <span className="font-semibold text-slate-900">{formatMoney(order.processingFee || 0)}</span>
                </div>
              )}
              <div className="border-t border-slate-200 pt-2 flex justify-between items-baseline">
                <span className="font-bold text-slate-900">Total Amount:</span>
                <span className="font-black text-xl text-slate-900">
                  {formatMoney(order.totalAmount + (order.processingFee || 0))}
                </span>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
