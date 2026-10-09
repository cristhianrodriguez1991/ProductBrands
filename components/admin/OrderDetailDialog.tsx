"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/components/ui/use-toast"
import { formatInvoiceNumber } from "@/lib/invoice"
import { QRCodeSVG } from "qrcode.react"
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
  Check,
  Camera,
  Trash2,
  QrCode,
  PenTool,
  Printer,
  ShieldCheck,
  Eye
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
  deliveryPhotos?: string[]
  signatureDataUrl?: string | null
  signedByName?: string | null
  signedAt?: string | null
  noSignatureRequired?: boolean
  deliveredAt?: string | null
  deliveryNotes?: string | null
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
  const [sendingPodEmail, setSendingPodEmail] = useState(false)
  const [sendCustomerCopy, setSendCustomerCopy] = useState(true)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)
  const [copiedPodLink, setCopiedPodLink] = useState(false)
  const [showQrModal, setShowQrModal] = useState(false)
  const [selectedPhotoPreview, setSelectedPhotoPreview] = useState<string | null>(null)
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({})

  // Form state
  const [selectedStatus, setSelectedStatus] = useState<string>(order?.status || "DRAFT")
  const [completedDate, setCompletedDate] = useState<string>(
    order?.completedAt ? new Date(order.completedAt).toISOString().split("T")[0] : new Date().toISOString().split("T")[0]
  )
  const [completionNotes, setCompletionNotes] = useState<string>(order?.completionNotes || "")
  const [deliveredDate, setDeliveredDate] = useState<string>(
    order?.deliveredAt ? new Date(order.deliveredAt).toISOString().split("T")[0] : new Date().toISOString().split("T")[0]
  )
  const [deliveryNotes, setDeliveryNotes] = useState<string>(order?.deliveryNotes || "")
  const [deliveryPhotos, setDeliveryPhotos] = useState<string[]>(order?.deliveryPhotos || [])
  const [noSignatureRequired, setNoSignatureRequired] = useState<boolean>(Boolean(order?.noSignatureRequired))

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
      setDeliveredDate(
        order.deliveredAt ? new Date(order.deliveredAt).toISOString().split("T")[0] : new Date().toISOString().split("T")[0]
      )
      setDeliveryNotes(order.deliveryNotes || "")
      setDeliveryPhotos(order.deliveryPhotos || [])
      setNoSignatureRequired(Boolean(order.noSignatureRequired))
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
  const origin = typeof window !== "undefined" ? window.location.origin : "https://www.productbrands.com"
  const payUrl = `${origin}/pay/${order.id}`
  const podUrl = `${origin}/orders/${order.id}/pod`
  const podPrintUrl = `/orders/${order.id}/pod/print`

  const toggleItemExpand = (id: string) => {
    setExpandedItems(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const handleCopyLink = () => {
    navigator.clipboard.writeText(payUrl)
    setCopiedLink(true)
    toast({ title: "Invoice Link Copied", description: "Customer payment link copied to clipboard." })
    setTimeout(() => setCopiedLink(false), 2000)
  }

  const handleCopyPodLink = () => {
    navigator.clipboard.writeText(podUrl)
    setCopiedPodLink(true)
    toast({ title: "Sign Link Copied", description: "Mobile signature & delivery link copied to clipboard." })
    setTimeout(() => setCopiedPodLink(false), 2000)
  }

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    try {
      setUploadingPhoto(true)
      const newUrls: string[] = []

      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const fd = new FormData()
        fd.append("file", file)
        const res = await fetch("/api/upload", {
          method: "POST",
          body: fd,
        })
        const data = await res.json()
        if (data.url) {
          newUrls.push(data.url)
        }
      }

      const updatedList = [...deliveryPhotos, ...newUrls]
      setDeliveryPhotos(updatedList)

      // Automatically auto-save uploaded photos to order
      await fetch(`/api/admin/customer-orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deliveryPhotos: updatedList }),
      })

      toast({ title: "Photo Attached", description: `${newUrls.length} delivery proof photo(s) added.` })
      onOrderUpdated()
    } catch (err: any) {
      toast({ title: "Upload Failed", description: err.message, variant: "destructive" })
    } finally {
      setUploadingPhoto(false)
    }
  }

  const removePhoto = async (index: number) => {
    const updated = deliveryPhotos.filter((_, i) => i !== index)
    setDeliveryPhotos(updated)
    await fetch(`/api/admin/customer-orders/${order.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deliveryPhotos: updated }),
    })
    onOrderUpdated()
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

  const handleSendPodEmail = async () => {
    try {
      setSendingPodEmail(true)
      const res = await fetch(`/api/admin/customer-orders/${order.id}/send-pod-email`, { method: "POST" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to send delivery proof email")
      toast({ 
        title: "Proof of Delivery Sent", 
        description: `Official delivery confirmation with photos and PDF receipt dispatched to ${order.customerEmail}` 
      })
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" })
    } finally {
      setSendingPodEmail(false)
    }
  }

  const handleSaveStatus = async () => {
    try {
      setUpdating(true)
      const payload: any = {
        status: selectedStatus,
        deliveryPhotos,
        noSignatureRequired,
      }

      if (deliveryNotes) {
        payload.deliveryNotes = deliveryNotes
      }

      if (selectedStatus === "DELIVERED" || selectedStatus === "COMPLETED") {
        payload.deliveredAt = deliveredDate ? new Date(deliveredDate).toISOString() : new Date().toISOString()
        payload.sendCustomerCopy = sendCustomerCopy
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
      toast({ title: "Order Updated", description: `Order status changed to ${selectedStatus}` })
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
            Finished
          </Badge>
        )
      case "DELIVERED":
        return (
          <Badge className="bg-purple-600 hover:bg-purple-600 text-white flex items-center gap-1.5 px-3 py-1 font-bold">
            <Truck className="h-3.5 w-3.5" />
            Delivered
          </Badge>
        )
      case "CONFIRMED":
        return (
          <Badge className="bg-sky-600 hover:bg-sky-600 text-white flex items-center gap-1.5 px-3 py-1 font-bold">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Order Confirmed
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
    <>
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

              {/* Mobile POD Sign Link */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowQrModal(true)}
                className="h-9 text-xs font-semibold text-slate-800 border-slate-300 hover:bg-slate-100"
              >
                <QrCode className="h-3.5 w-3.5 mr-1 text-slate-700" />
                Sign on Phone
              </Button>

              {/* Print POD Button */}
              <a href={podPrintUrl} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm" className="h-9 text-xs font-semibold text-slate-800 border-slate-300 hover:bg-slate-100">
                  <Printer className="h-3.5 w-3.5 mr-1 text-slate-700" />
                  Proof of Delivery (PDF)
                </Button>
              </a>

              {/* Email Proof of Delivery Button */}
              {(order.status === "DELIVERED" || order.status === "COMPLETED" || order.signatureDataUrl || (order.deliveryPhotos && order.deliveryPhotos.length > 0)) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSendPodEmail}
                  disabled={sendingPodEmail}
                  className="h-9 text-xs font-semibold text-purple-700 border-purple-200 hover:bg-purple-50"
                  title="Email proof of delivery photos and PDF receipt to customer"
                >
                  {sendingPodEmail ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <FileCheck2 className="h-3.5 w-3.5 mr-1" />}
                  Email Proof of Delivery
                </Button>
              )}

              {order.status === "PAID" || order.status === "DELIVERED" || order.status === "COMPLETED" ? (
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
            
            {/* Status & Fulfillment Tracking Box */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-5 space-y-5">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-3 border-b border-slate-200">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                    Order Status &amp; Fulfillment
                  </h3>
                  <p className="text-xs text-slate-500">
                    Update payment, delivery confirmation, and fulfillment state
                  </p>
                </div>
                <div className="w-full sm:w-64">
                  <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                    <SelectTrigger className="bg-white font-semibold text-xs h-9">
                      <SelectValue placeholder="Select Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DRAFT">Draft</SelectItem>
                      <SelectItem value="SENT">Sent</SelectItem>
                      <SelectItem value="PAID">Paid</SelectItem>
                      <SelectItem value="CONFIRMED">Order Confirmed</SelectItem>
                      <SelectItem value="DELIVERED">Delivered (Fulfillment Verified)</SelectItem>
                      <SelectItem value="COMPLETED">Finished (Order Completed)</SelectItem>
                      <SelectItem value="CANCELLED">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Delivery Dates & Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-semibold text-slate-700">Date Delivered / Received</Label>
                  <Input
                    type="date"
                    value={deliveredDate}
                    onChange={(e) => setDeliveredDate(e.target.value)}
                    className="mt-1 bg-white text-xs h-9"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    When the customer received or picked up the goods
                  </p>
                </div>
                <div>
                  <Label className="text-xs font-semibold text-slate-700">Delivery / Fulfillment Notes</Label>
                  <Input
                    type="text"
                    placeholder="e.g. Delivered to loading dock bay 3 / Received by Mike"
                    value={deliveryNotes}
                    onChange={(e) => setDeliveryNotes(e.target.value)}
                    className="mt-1 bg-white text-xs h-9"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Carrier, tracking #, or recipient details
                  </p>
                </div>
              </div>

              {/* Proof of Delivery (POD) Photos Section for Chargebacks */}
              <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                      <Camera className="h-4 w-4 text-slate-700" />
                      Delivery Confirmation Photos ({deliveryPhotos.length})
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Upload proof of delivery photos with timestamp for bulletproof chargeback defense.
                    </p>
                  </div>

                  <div className="relative">
                    <input
                      type="file"
                      id="adminPhotoUpload"
                      accept="image/*"
                      multiple
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                    <label
                      htmlFor="adminPhotoUpload"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-800 cursor-pointer transition-colors shadow-2xs"
                    >
                      {uploadingPhoto ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-600" />
                          <span>Uploading…</span>
                        </>
                      ) : (
                        <>
                          <Camera className="h-3.5 w-3.5 text-slate-600" />
                          <span>Upload Photos</span>
                        </>
                      )}
                    </label>
                  </div>
                </div>

                {deliveryPhotos.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                    {deliveryPhotos.map((url, idx) => (
                      <div key={idx} className="relative aspect-video rounded-lg overflow-hidden border border-slate-200 group bg-slate-50">
                        <img src={url} alt={`Delivery Proof ${idx + 1}`} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedPhotoPreview(url)}
                            className="p-1.5 rounded-full bg-white/90 text-slate-900 hover:bg-white cursor-pointer"
                            title="View Full Size"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => removePhoto(idx)}
                            className="p-1.5 rounded-full bg-rose-600 text-white hover:bg-rose-700 cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-4 text-center border border-dashed border-slate-200 rounded-lg text-xs text-slate-400">
                    No delivery proof photos uploaded yet. Click &quot;Upload Photos&quot; to attach proof pictures.
                  </div>
                )}
              </div>

              {/* Customer Signature & Mobile Signing Card */}
              <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                      <PenTool className="h-4 w-4 text-slate-700" />
                      Mobile Signature Verification
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Customer signature captured on phone upon goods delivery.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCopyPodLink}
                      className="h-8 text-xs font-semibold text-slate-700"
                    >
                      {copiedPodLink ? <Check className="h-3 w-3 mr-1 text-emerald-600" /> : <Copy className="h-3 w-3 mr-1" />}
                      {copiedPodLink ? "Link Copied" : "Copy Mobile Sign Link"}
                    </Button>
                    <a href={podUrl} target="_blank" rel="noopener noreferrer">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs font-semibold text-slate-700"
                      >
                        <ExternalLink className="h-3 w-3 mr-1" />
                        Open Sign Pad
                      </Button>
                    </a>
                  </div>
                </div>

                {/* Signature status presentation */}
                {order.signatureDataUrl ? (
                  <div className="p-3 rounded-lg border border-emerald-200 bg-emerald-50/50 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="bg-white border border-slate-200 rounded p-1 w-32 h-14 flex items-center justify-center overflow-hidden">
                        <img src={order.signatureDataUrl} alt="Customer Signature" className="max-h-full max-w-full object-contain" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                          <span>Signed by {order.signedByName || order.customerName}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {order.signedAt ? new Date(order.signedAt).toLocaleString() : "Verified on delivery"}
                        </div>
                      </div>
                    </div>
                    <a href={podPrintUrl} target="_blank" rel="noopener noreferrer">
                      <Button size="sm" variant="outline" className="h-8 text-xs font-semibold text-slate-800">
                        <Printer className="h-3.5 w-3.5 mr-1" />
                        View Signed POD (PDF)
                      </Button>
                    </a>
                  </div>
                ) : order.noSignatureRequired ? (
                  <div className="p-3 rounded-lg border border-amber-200 bg-amber-50/70 text-xs text-amber-900 flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-amber-600 shrink-0" />
                    <span>Delivered without signature (Photo verified delivery).</span>
                  </div>
                ) : (
                  <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 text-xs text-slate-600 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-slate-400 shrink-0" />
                      <span>Awaiting signature. Share the sign link or scan QR code on your phone when handing over delivery.</span>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => setShowQrModal(true)}
                      className="bg-slate-900 hover:bg-slate-800 text-white text-xs h-7 px-2.5 font-semibold shrink-0 cursor-pointer"
                    >
                      <QrCode className="h-3 w-3 mr-1" />
                      Show QR Code
                    </Button>
                  </div>
                )}
              </div>

              {/* Send Copy to Customer Checkbox */}
              {(selectedStatus === "DELIVERED" || selectedStatus === "COMPLETED") && (
                <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-50/70 border border-emerald-200">
                  <div className="flex items-center gap-2.5">
                    <Checkbox
                      id="adminSendCopyCheckbox"
                      checked={sendCustomerCopy}
                      onCheckedChange={(c) => setSendCustomerCopy(Boolean(c))}
                    />
                    <label htmlFor="adminSendCopyCheckbox" className="text-xs font-semibold text-slate-800 cursor-pointer">
                      Send copy of delivery confirmation &amp; PDF receipt to customer ({order.customerEmail})
                    </label>
                  </div>
                  <Badge variant="outline" className="text-[10px] bg-white text-emerald-800 border-emerald-300">
                    Photos + Signature + PDF
                  </Badge>
                </div>
              )}

              {/* Save Status Action Button */}
              <div className="flex justify-end pt-1">
                <Button
                  onClick={handleSaveStatus}
                  disabled={updating}
                  size="sm"
                  className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold h-10 px-6 cursor-pointer"
                >
                  {updating ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />}
                  Save Status &amp; Fulfillment Changes
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
                  <div className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                    <Building2 className="h-4 w-4 text-slate-400" />
                    <span>{order.companyName}</span>
                  </div>
                )}
                <div className="text-xs text-slate-600 flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-slate-400" />
                  <span>{order.customerEmail}</span>
                </div>
                {order.customerPhone && (
                  <div className="text-xs text-slate-600 flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 text-slate-400" />
                    <span>{order.customerPhone}</span>
                  </div>
                )}
              </div>

              {/* Fulfillment & Delivery */}
              <div className="rounded-xl border border-slate-200 p-4 space-y-2.5 bg-white">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                  Fulfillment &amp; Delivery
                </span>
                <div className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <Truck className="h-4 w-4 text-slate-600" />
                  <span>{order.deliveryType === "PICKUP" ? "Warehouse Pickup" : "Freight Delivery"}</span>
                </div>
                <div className="text-xs text-slate-600 flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-slate-400" />
                  <span>
                    Estimated: {order.deliveryDate ? new Date(order.deliveryDate).toLocaleDateString() : "Confirmed upon payment"}
                  </span>
                </div>
                {order.stripePaymentIntent && (
                  <div className="text-[11px] font-mono text-slate-500 pt-1">
                    Payment Ref: {order.stripePaymentIntent}
                  </div>
                )}
              </div>
            </div>

            {/* Ordered Products Table */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Ordered Products ({order.items.reduce((acc, it) => acc + it.quantity, 0)} units)
                </h3>
              </div>

              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    <tr>
                      <th className="py-2.5 px-4 w-14">Item</th>
                      <th className="py-2.5 px-4">Description</th>
                      <th className="py-2.5 px-4 w-28">Weight / Specs</th>
                      <th className="py-2.5 px-4 text-center w-16">Qty</th>
                      <th className="py-2.5 px-4 text-right w-24">Unit Price</th>
                      <th className="py-2.5 px-4 text-right w-28">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {order.items.map((item, idx) => {
                      const itemKey = item.id || `item-${idx}`
                      const isExpanded = !!expandedItems[itemKey]
                      const hasDesc = !!(item.description && item.description.trim())

                      return (
                        <tr key={itemKey}>
                          <td colSpan={6} className="p-0">
                            <table className="w-full text-left text-xs">
                              <tbody>
                                <tr className="hover:bg-slate-50/50">
                                  <td className="py-2.5 px-4 w-14 align-top">
                                    {item.imageUrl ? (
                                      <div className="relative w-10 h-10 rounded border border-slate-200 overflow-hidden bg-white shrink-0">
                                        <Image
                                          src={item.imageUrl}
                                          alt={item.productName}
                                          fill
                                          className="object-cover"
                                        />
                                      </div>
                                    ) : (
                                      <div className="w-10 h-10 rounded bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400">
                                        <Package className="h-4 w-4" />
                                      </div>
                                    )}
                                  </td>
                                  <td className="py-2.5 px-4 align-top">
                                    <span className="font-bold text-slate-900 block">{item.productName}</span>
                                    <div className="flex items-center gap-2 mt-0.5 text-[11px]">
                                      {item.sku && <span className="text-slate-500 font-mono">SKU: {item.sku}</span>}
                                      {hasDesc && (
                                        <button
                                          type="button"
                                          onClick={() => toggleItemExpand(itemKey)}
                                          className="text-blue-600 hover:underline flex items-center gap-0.5 cursor-pointer"
                                        >
                                          <span>{isExpanded ? "Hide" : "View Description"}</span>
                                          {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                                        </button>
                                      )}
                                    </div>
                                  </td>
                                  <td className="py-2.5 px-4 w-28 text-slate-600 align-top">{item.weight || "—"}</td>
                                  <td className="py-2.5 px-4 text-center font-bold text-slate-800 w-16 align-top">{item.quantity}</td>
                                  <td className="py-2.5 px-4 text-right text-slate-600 w-24 align-top">{formatMoney(item.unitPrice)}</td>
                                  <td className="py-2.5 px-4 text-right font-bold text-slate-900 w-28 align-top">
                                    {formatMoney(item.totalPrice ?? item.unitPrice * item.quantity)}
                                  </td>
                                </tr>
                                {hasDesc && isExpanded && (
                                  <tr>
                                    <td colSpan={6} className="bg-slate-50 px-6 py-2.5 border-t border-slate-100 text-slate-600 text-xs">
                                      <p className="whitespace-pre-line">{item.description}</p>
                                    </td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Subtotals & Grand Total Breakdown */}
            <div className="flex justify-end pt-1">
              <div className="w-full sm:w-72 space-y-2 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs">
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
                <div className="border-t border-slate-200 pt-2 flex justify-between items-baseline font-bold text-sm text-slate-900">
                  <span>Total Amount:</span>
                  <span className="text-base font-black">
                    {formatMoney(order.totalAmount + (order.processingFee || 0))}
                  </span>
                </div>
              </div>
            </div>

          </div>
        </DialogContent>
      </Dialog>

      {/* QR Code Modal to Sign on Phone */}
      <Dialog open={showQrModal} onOpenChange={setShowQrModal}>
        <DialogContent className="max-w-sm text-center p-6 border-slate-200 bg-white">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              Sign Delivery on Phone
            </DialogTitle>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <p className="text-xs text-slate-500">
              Point your phone camera at this QR code to open the mobile signature &amp; delivery confirmation page.
            </p>

            <div className="bg-white p-4 rounded-xl border border-slate-200 inline-block shadow-sm">
              <QRCodeSVG value={podUrl} size={200} level="H" />
            </div>

            <div className="text-xs font-mono font-bold text-slate-700 bg-slate-50 py-1.5 px-3 rounded-lg border border-slate-200">
              {invoiceNo} &bull; {order.customerName}
            </div>

            <div className="space-y-2 pt-1">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyPodLink}
                className="w-full text-xs font-semibold h-9"
              >
                {copiedPodLink ? <Check className="h-3.5 w-3.5 mr-1 text-emerald-600" /> : <Copy className="h-3.5 w-3.5 mr-1" />}
                {copiedPodLink ? "Link Copied!" : "Copy Link to Clipboard"}
              </Button>
              <a href={podUrl} target="_blank" rel="noopener noreferrer" className="block">
                <Button className="w-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold h-9">
                  <ExternalLink className="h-3.5 w-3.5 mr-1" />
                  Open Sign Pad in New Tab
                </Button>
              </a>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Photo Lightbox Preview Modal */}
      {selectedPhotoPreview && (
        <Dialog open={!!selectedPhotoPreview} onOpenChange={() => setSelectedPhotoPreview(null)}>
          <DialogContent className="max-w-3xl p-2 bg-black border-none">
            <div className="relative aspect-video w-full flex items-center justify-center overflow-hidden rounded-lg">
              <img src={selectedPhotoPreview} alt="Delivery Proof Fullsize" className="max-h-full max-w-full object-contain" />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}
