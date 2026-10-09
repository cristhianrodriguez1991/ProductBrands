"use client"

import { useEffect, useRef, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Image from "next/image"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"
import { formatInvoiceNumber } from "@/lib/invoice"
import {
  CheckCircle2,
  Camera,
  Trash2,
  RotateCcw,
  PenTool,
  Printer,
  Loader2,
  AlertCircle,
  Truck,
  Building2,
  Package,
  Calendar,
  Clock,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  FileCheck2
} from "lucide-react"

interface LineItem {
  id: string
  productName: string
  sku?: string | null
  weight?: string | null
  quantity: number
  unitPrice: number
  totalPrice?: number
}

interface OrderData {
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
  subtotal: number
  totalAmount: number
  deliveryPhotos?: string[]
  signatureDataUrl?: string | null
  signedByName?: string | null
  signedAt?: string | null
  noSignatureRequired?: boolean
  deliveredAt?: string | null
  deliveryNotes?: string | null
  items: LineItem[]
}

export default function MobileProofOfDeliveryPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const orderId = params?.id as string

  const [order, setOrder] = useState<OrderData | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  // Form State
  const [signedByName, setSignedByName] = useState("")
  const [noSignatureRequired, setNoSignatureRequired] = useState(false)
  const [deliveryPhotos, setDeliveryPhotos] = useState<string[]>([])
  const [deliveryNotes, setDeliveryNotes] = useState("")
  const [showItemsList, setShowItemsList] = useState(true)

  // Canvas Signature Pad
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [hasDrawn, setHasDrawn] = useState(false)

  useEffect(() => {
    if (!orderId) return
    loadOrder()
  }, [orderId])

  const loadOrder = async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/orders/${orderId}/pod`)
      const data = await res.json()
      if (!res.ok || !data.order) {
        throw new Error(data.error || "Order not found")
      }
      setOrder(data.order)
      setSignedByName(data.order.signedByName || data.order.customerName || "")
      setNoSignatureRequired(Boolean(data.order.noSignatureRequired))
      setDeliveryPhotos(data.order.deliveryPhotos || [])
      setDeliveryNotes(data.order.deliveryNotes || "")
      if (data.order.signatureDataUrl || data.order.deliveredAt) {
        setSubmitted(true)
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  // Canvas Drawing Logic
  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    }
  }

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (noSignatureRequired) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    const { x, y } = getCoordinates(e)
    ctx.beginPath()
    ctx.moveTo(x, y)
    setIsDrawing(true)
  }

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || noSignatureRequired) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    const { x, y } = getCoordinates(e)
    ctx.lineTo(x, y)
    ctx.strokeStyle = "#0f172a"
    ctx.lineWidth = 3
    ctx.lineCap = "round"
    ctx.lineJoin = "round"
    ctx.stroke()
    setHasDrawn(true)
  }

  const stopDrawing = () => {
    setIsDrawing(false)
  }

  const clearSignature = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setHasDrawn(false)
  }

  // Photo Upload Handler
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

      setDeliveryPhotos(prev => [...prev, ...newUrls])
      toast({ title: "Photo Uploaded", description: `${newUrls.length} delivery photo(s) attached.` })
    } catch (err: any) {
      toast({ title: "Upload Failed", description: err.message, variant: "destructive" })
    } finally {
      setUploadingPhoto(false)
    }
  }

  const removePhoto = (index: number) => {
    setDeliveryPhotos(prev => prev.filter((_, i) => i !== index))
  }

  // Submission Handler
  const handleSubmit = async () => {
    if (!noSignatureRequired && !hasDrawn && !order?.signatureDataUrl) {
      toast({
        title: "Signature Required",
        description: "Please sign in the box above or check 'No Signature Required'.",
        variant: "destructive"
      })
      return
    }

    if (!noSignatureRequired && !signedByName.trim()) {
      toast({
        title: "Name Required",
        description: "Please enter the printed name of the person receiving the order.",
        variant: "destructive"
      })
      return
    }

    try {
      setSubmitting(true)
      let signatureDataUrl = order?.signatureDataUrl || null
      if (hasDrawn && canvasRef.current) {
        signatureDataUrl = canvasRef.current.toDataURL("image/png")
      }

      const res = await fetch(`/api/orders/${orderId}/pod`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          signatureDataUrl: noSignatureRequired ? null : signatureDataUrl,
          signedByName: noSignatureRequired ? null : signedByName,
          noSignatureRequired,
          deliveryPhotos,
          deliveryNotes,
          deliveredAt: new Date().toISOString(),
          status: "DELIVERED",
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to confirm delivery")

      setOrder(data.order)
      setSubmitted(true)
      toast({ title: "Delivery Confirmed", description: "Proof of delivery has been securely recorded." })
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <Loader2 className="h-9 w-9 text-slate-800 animate-spin mb-3" />
        <p className="text-sm font-medium text-slate-600">Loading delivery details…</p>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <Card className="max-w-md w-full p-6 text-center border-slate-200">
          <AlertCircle className="h-10 w-10 text-rose-600 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-slate-900">Order Not Found</h2>
          <p className="text-sm text-slate-500 mt-1">Unable to locate the specified order for delivery confirmation.</p>
        </Card>
      </div>
    )
  }

  const invoiceNo = formatInvoiceNumber(order)
  const totalUnits = order.items.reduce((acc, it) => acc + it.quantity, 0)

  return (
    <div className="min-h-screen bg-slate-100/70 py-6 px-3 sm:px-6 font-sans">
      <div className="max-w-lg mx-auto space-y-4">
        
        {/* Header Bar */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block">
              Official Proof of Delivery (POD)
            </span>
            <h1 className="text-xl font-mono font-black text-slate-900 mt-0.5">
              {invoiceNo}
            </h1>
          </div>
          <Badge className="bg-slate-900 text-white font-bold px-2.5 py-1 text-xs uppercase tracking-wider">
            {order.deliveryType === "PICKUP" ? "Warehouse Pickup" : "Freight Delivery"}
          </Badge>
        </div>

        {/* Customer & Destination Summary */}
        <Card className="border-slate-200 shadow-2xs overflow-hidden">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Recipient
                </span>
                <div className="font-bold text-slate-900 text-base">{order.customerName}</div>
                {order.companyName && (
                  <div className="text-xs font-semibold text-slate-600 flex items-center gap-1 mt-0.5">
                    <Building2 className="h-3.5 w-3.5 text-slate-400" />
                    <span>{order.companyName}</span>
                  </div>
                )}
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Total Units
                </span>
                <span className="text-base font-bold text-slate-900">{totalUnits} units</span>
              </div>
            </div>

            {/* Collapsible Ordered Items List */}
            <div className="pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowItemsList(!showItemsList)}
                className="w-full flex items-center justify-between text-xs font-bold text-slate-700 hover:text-slate-900 cursor-pointer py-1"
              >
                <div className="flex items-center gap-1.5">
                  <Package className="h-3.5 w-3.5 text-slate-500" />
                  <span>Verify Delivered Items ({order.items.length})</span>
                </div>
                {showItemsList ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </button>

              {showItemsList && (
                <div className="mt-2 space-y-1.5 max-h-48 overflow-y-auto">
                  {order.items.map((it, idx) => (
                    <div key={it.id || idx} className="flex justify-between items-center text-xs p-2 rounded-lg bg-slate-50 border border-slate-100">
                      <div className="pr-2">
                        <span className="font-semibold text-slate-900 block">{it.productName}</span>
                        {it.weight && <span className="text-[11px] text-slate-500">{it.weight}</span>}
                      </div>
                      <span className="font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200 shrink-0">
                        x{it.quantity}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Confirmed Delivery View */}
        {submitted ? (
          <Card className="border-emerald-200 bg-white shadow-2xs overflow-hidden">
            <CardContent className="p-6 text-center space-y-4">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-emerald-100 text-emerald-600">
                <CheckCircle2 className="h-8 w-8" />
              </div>

              <div>
                <h2 className="text-xl font-bold text-emerald-950">Delivery Confirmed &amp; Verified</h2>
                <p className="text-xs text-slate-600 mt-1">
                  Proof of delivery has been securely recorded with complete timestamp and verification metadata.
                </p>
                {order.deliveredAt && (
                  <div className="text-xs font-medium text-slate-500 mt-2 flex items-center justify-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    <span>{new Date(order.deliveredAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}</span>
                  </div>
                )}
              </div>

              {/* Recorded Signature or Waiver */}
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 text-left space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Signature Verification
                </span>
                {order.noSignatureRequired ? (
                  <div className="text-xs font-semibold text-slate-700 bg-amber-50 border border-amber-200 p-2.5 rounded-lg">
                    ✓ Delivered Without Signature (Photo Verified Delivery)
                  </div>
                ) : (
                  <div>
                    <div className="text-xs font-bold text-slate-900">
                      Signed By: <span className="font-medium text-slate-700">{order.signedByName || "Recipient"}</span>
                    </div>
                    {order.signatureDataUrl && (
                      <div className="mt-2 bg-white rounded-lg border border-slate-200 p-2 flex justify-center">
                        <img
                          src={order.signatureDataUrl}
                          alt="Customer Signature"
                          className="max-h-24 w-auto object-contain"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Photos Gallery */}
              {deliveryPhotos.length > 0 && (
                <div className="text-left space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Proof Photos ({deliveryPhotos.length})
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    {deliveryPhotos.map((url, idx) => (
                      <a key={idx} href={url} target="_blank" rel="noopener noreferrer" className="relative aspect-video rounded-lg overflow-hidden border border-slate-200 group block">
                        <img src={url} alt={`Delivery Photo ${idx + 1}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-2 space-y-2">
                <a href={`/orders/${order.id}/pod/print`} target="_blank" rel="noopener noreferrer" className="block">
                  <Button className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold h-11 text-xs">
                    <Printer className="h-4 w-4 mr-2" />
                    Download / Print Proof of Delivery (PDF)
                  </Button>
                </a>
                <a href={`/pay/${order.id}`} className="block">
                  <Button variant="outline" className="w-full text-xs font-semibold h-10">
                    View Customer Invoice
                  </Button>
                </a>
              </div>
            </CardContent>
          </Card>
        ) : (
          /* Active Signature Form View */
          <div className="space-y-4">
            
            {/* Delivery Photos Uploader */}
            <Card className="border-slate-200 shadow-2xs">
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-sm font-bold text-slate-900 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Camera className="h-4 w-4 text-slate-700" />
                    Delivery Confirmation Photos
                  </span>
                  <span className="text-[11px] font-normal text-slate-500">
                    {deliveryPhotos.length} Attached
                  </span>
                </CardTitle>
                <p className="text-[11px] text-slate-500">
                  Take a photo of the delivered boxes, pallet, or dock for bulletproof chargeback protection.
                </p>
              </CardHeader>
              <CardContent className="p-4 pt-1 space-y-3">
                {deliveryPhotos.length > 0 && (
                  <div className="grid grid-cols-3 gap-2">
                    {deliveryPhotos.map((url, idx) => (
                      <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-slate-200 group">
                        <img src={url} alt={`Delivery Photo ${idx + 1}`} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => removePhoto(idx)}
                          className="absolute top-1 right-1 bg-rose-600/90 hover:bg-rose-700 text-white rounded-full p-1 shadow-xs cursor-pointer"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="relative">
                  <input
                    type="file"
                    id="photoUpload"
                    accept="image/*"
                    capture="environment"
                    multiple
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                  <label
                    htmlFor="photoUpload"
                    className="w-full h-11 rounded-xl border border-dashed border-slate-300 hover:border-slate-400 bg-slate-50 hover:bg-slate-100 flex items-center justify-center gap-2 text-xs font-bold text-slate-700 cursor-pointer transition-colors"
                  >
                    {uploadingPhoto ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin text-slate-600" />
                        <span>Uploading Photo…</span>
                      </>
                    ) : (
                      <>
                        <Camera className="h-4 w-4 text-slate-600" />
                        <span>Take Photo with Camera / Upload</span>
                      </>
                    )}
                  </label>
                </div>
              </CardContent>
            </Card>

            {/* Signature Pad Card */}
            <Card className="border-slate-200 shadow-2xs">
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-sm font-bold text-slate-900 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <PenTool className="h-4 w-4 text-slate-700" />
                    Customer Delivery Signature
                  </span>
                  {!noSignatureRequired && hasDrawn && (
                    <button
                      type="button"
                      onClick={clearSignature}
                      className="text-[11px] text-rose-600 hover:text-rose-700 font-semibold flex items-center gap-0.5 cursor-pointer"
                    >
                      <RotateCcw className="h-3 w-3" />
                      Clear
                    </button>
                  )}
                </CardTitle>
                <p className="text-[11px] text-slate-500">
                  Recipient can sign directly on this screen using their finger.
                </p>
              </CardHeader>
              <CardContent className="p-4 pt-1 space-y-3">
                {/* No Signature Required Toggle */}
                <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                  <Checkbox
                    id="noSignatureCheckbox"
                    checked={noSignatureRequired}
                    onCheckedChange={(checked) => setNoSignatureRequired(!!checked)}
                    className="mt-0.5"
                  />
                  <label
                    htmlFor="noSignatureCheckbox"
                    className="text-xs text-slate-800 font-semibold cursor-pointer select-none leading-snug"
                  >
                    No Signature Required (Left at dock, door, or receiver unavailable)
                  </label>
                </div>

                {!noSignatureRequired && (
                  <>
                    {/* Interactive Signature Canvas */}
                    <div className="space-y-1">
                      <div className="relative border-2 border-dashed border-slate-300 rounded-xl bg-white overflow-hidden touch-none h-44 shadow-2xs">
                        <canvas
                          ref={canvasRef}
                          width={480}
                          height={176}
                          onMouseDown={startDrawing}
                          onMouseMove={draw}
                          onMouseUp={stopDrawing}
                          onMouseLeave={stopDrawing}
                          onTouchStart={startDrawing}
                          onTouchMove={draw}
                          onTouchEnd={stopDrawing}
                          className="w-full h-full cursor-crosshair"
                        />
                        {!hasDrawn && (
                          <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 pointer-events-none">
                            <PenTool className="h-6 w-6 mb-1 text-slate-300" />
                            <span className="text-xs font-semibold">Sign here with finger</span>
                          </div>
                        )}
                        <div className="absolute bottom-2 left-4 right-4 border-b border-slate-200 pointer-events-none" />
                      </div>
                      <p className="text-[10px] text-slate-400 text-center">
                        Touch the box above to sign using your finger or stylus.
                      </p>
                    </div>

                    {/* Signer Printed Name */}
                    <div>
                      <Label htmlFor="signedByName" className="text-xs font-semibold text-slate-700">
                        Printed Name of Receiver
                      </Label>
                      <Input
                        id="signedByName"
                        type="text"
                        placeholder="e.g. Mike Rodriguez (Receiving Manager)"
                        value={signedByName}
                        onChange={(e) => setSignedByName(e.target.value)}
                        className="mt-1 bg-white text-xs h-10"
                      />
                    </div>
                  </>
                )}

                {/* Delivery Notes */}
                <div>
                  <Label htmlFor="deliveryNotes" className="text-xs font-semibold text-slate-700">
                    Delivery / Receiving Notes (Optional)
                  </Label>
                  <Textarea
                    id="deliveryNotes"
                    placeholder="e.g. Delivered to warehouse bay 2, pallet in good condition."
                    value={deliveryNotes}
                    onChange={(e) => setDeliveryNotes(e.target.value)}
                    rows={2}
                    className="mt-1 bg-white text-xs resize-none"
                  />
                </div>

                {/* Submit Button */}
                <div className="pt-2">
                  <Button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="w-full h-12 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm shadow-md cursor-pointer"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Recording Confirmation…
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Confirm &amp; Complete Delivery
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

          </div>
        )}

        {/* Footer */}
        <div className="text-center text-[11px] text-slate-400 py-2 space-y-0.5">
          <div>Southern Basics LLC • Official Delivery Confirmation</div>
          <div className="flex items-center justify-center gap-1">
            <ShieldCheck className="h-3 w-3 text-slate-400" />
            <span>Encrypted electronic proof of delivery</span>
          </div>
        </div>

      </div>
    </div>
  )
}
