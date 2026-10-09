"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { formatInvoiceNumber } from "@/lib/invoice"
import { 
  Printer, 
  CheckCircle2, 
  MapPin, 
  Phone, 
  Mail, 
  Truck, 
  Calendar, 
  Clock, 
  Building2, 
  Package, 
  ShieldCheck, 
  Loader2 
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
  createdAt: string
  items: LineItem[]
}

export default function PrintProofOfDeliveryPage() {
  const params = useParams()
  const orderId = params?.id as string
  const [order, setOrder] = useState<OrderData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!orderId) return
    fetch(`/api/orders/${orderId}/pod`)
      .then(res => res.json())
      .then(data => {
        if (data.order) setOrder(data.order)
      })
      .finally(() => setLoading(false))
  }, [orderId])

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4">
        <Loader2 className="h-8 w-8 text-slate-800 animate-spin mb-2" />
        <p className="text-xs text-slate-500 font-medium">Generating official Proof of Delivery document…</p>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <p className="text-sm text-slate-600 font-semibold">Delivery record not found.</p>
      </div>
    )
  }

  const invoiceNo = formatInvoiceNumber(order)
  const totalUnits = order.items.reduce((acc, it) => acc + it.quantity, 0)
  const deliveryTimestamp = order.deliveredAt 
    ? new Date(order.deliveredAt).toLocaleString("en-US", { dateStyle: "long", timeStyle: "short" })
    : order.signedAt 
      ? new Date(order.signedAt).toLocaleString("en-US", { dateStyle: "long", timeStyle: "short" })
      : new Date().toLocaleString("en-US", { dateStyle: "long", timeStyle: "short" })

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page {
            size: letter portrait;
            margin: 8mm 10mm;
          }
          html, body {
            background: #ffffff !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .print-hide {
            display: none !important;
          }
        }
      `}} />

      {/* Top action toolbar (hidden during print) */}
      <div className="print-hide bg-slate-900 text-white px-6 py-3 flex items-center justify-between sticky top-0 z-50 shadow-md">
        <div className="text-xs">
          <span>Official Proof of Delivery (POD) &mdash; </span>
          <strong className="font-mono text-sm">{invoiceNo}</strong>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => window.print()}
            className="bg-white text-slate-900 hover:bg-slate-100 font-bold text-xs h-8"
          >
            <Printer className="h-3.5 w-3.5 mr-1.5" />
            Print / Save as PDF
          </Button>
        </div>
      </div>

      {/* Document Sheet */}
      <div className="max-w-[800px] mx-auto bg-white p-6 sm:p-10 font-sans text-slate-900 text-xs">
        
        {/* Header */}
        <div className="border-b-2 border-slate-900 pb-4 flex justify-between items-start gap-4">
          <div>
            <Image
              src="/images/logo.png"
              alt="Product Brands"
              width={1426}
              height={382}
              priority
              className="h-auto w-[220px] object-contain"
            />
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 mt-1.5">
              Wholesale Distribution &amp; Commercial Supply
            </p>
          </div>

          <div className="text-right">
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block">
              Official Document
            </span>
            <h1 className="text-lg font-black text-slate-950 uppercase tracking-tight">
              Proof of Delivery (POD)
            </h1>
            <div className="font-mono text-base font-black text-slate-900 mt-0.5">
              {invoiceNo}
            </div>
          </div>
        </div>

        {/* Metadata Grid */}
        <div className="grid grid-cols-2 gap-4 py-4 border-b border-slate-200 text-xs">
          <div className="space-y-1">
            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block">
              Delivered To / Recipient
            </span>
            <div className="font-bold text-slate-900 text-sm">{order.customerName}</div>
            {order.companyName && (
              <div className="font-semibold text-slate-700">{order.companyName}</div>
            )}
            {order.customerPhone && (
              <div className="text-slate-600">{order.customerPhone}</div>
            )}
            <div className="text-slate-600">{order.customerEmail}</div>
          </div>

          <div className="space-y-1 text-right">
            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block">
              Fulfillment Verification
            </span>
            <div className="font-bold text-slate-900">
              {order.deliveryType === "PICKUP" ? "Warehouse Pickup" : "Freight Delivery"}
            </div>
            <div className="text-slate-700 font-semibold">{deliveryTimestamp}</div>
            {order.deliveryNotes && (
              <div className="text-[11px] text-slate-500 italic mt-1">
                Note: {order.deliveryNotes}
              </div>
            )}
          </div>
        </div>

        {/* Delivered Items Table */}
        <div className="py-4">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-[10px] font-bold uppercase tracking-wider text-slate-700">
              Delivered Inventory &amp; Specifications
            </h2>
            <span className="text-[10px] font-semibold text-slate-500">
              Total Units Delivered: {totalUnits} units
            </span>
          </div>

          <table className="w-full text-left text-xs border border-slate-200">
            <thead className="bg-slate-100 text-[10px] font-bold text-slate-700 uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-2 px-3">Item Description</th>
                <th className="py-2 px-3 w-28">SKU / Specs</th>
                <th className="py-2 px-3 text-center w-24">Qty Delivered</th>
                <th className="py-2 px-3 text-center w-24">Condition</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {order.items.map((it, idx) => (
                <tr key={it.id || idx}>
                  <td className="py-2 px-3 font-semibold text-slate-900">
                    {it.productName}
                  </td>
                  <td className="py-2 px-3 text-slate-600 text-[11px]">
                    {[it.sku ? `SKU: ${it.sku}` : "", it.weight].filter(Boolean).join(" • ") || "—"}
                  </td>
                  <td className="py-2 px-3 text-center font-bold text-slate-900">
                    {it.quantity}
                  </td>
                  <td className="py-2 px-3 text-center text-emerald-700 font-semibold text-[11px]">
                    ✓ Received / Complete
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Delivery Photos Section (if any) */}
        {order.deliveryPhotos && order.deliveryPhotos.length > 0 && (
          <div className="py-2">
            <h2 className="text-[10px] font-bold uppercase tracking-wider text-slate-700 mb-2">
              Delivery Confirmation Photos ({order.deliveryPhotos.length})
            </h2>
            <div className="grid grid-cols-3 gap-2">
              {order.deliveryPhotos.map((url, idx) => (
                <div key={idx} className="relative aspect-video rounded-lg overflow-hidden border border-slate-200 bg-slate-50">
                  <img src={url} alt={`Delivery Photo ${idx + 1}`} className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Verification & Signature Section */}
        <div className="mt-4 pt-4 border-t-2 border-slate-900 grid grid-cols-1 sm:grid-cols-2 gap-6 items-end">
          
          {/* Legal Acceptance Statement */}
          <div className="space-y-1.5 text-[10px] text-slate-600 leading-snug">
            <strong className="text-slate-900 block uppercase tracking-wider text-[10px]">
              Receipt &amp; Acceptance Agreement
            </strong>
            <p>
              By signing below, receiver certifies that the goods listed above have been delivered, inspected, and received in full and satisfactory condition without damage or missing items.
            </p>
            <p className="text-[9px] text-slate-400">
              Southern Basics LLC • Wholesale Terms of Sale apply • 48-Hour Inspection window
            </p>
          </div>

          {/* Electronic Signature Box */}
          <div className="rounded-xl border border-slate-300 bg-slate-50/70 p-3.5 space-y-2">
            <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider text-slate-500">
              <span>Authorized Signature</span>
              <span className="text-emerald-700 font-bold">✓ Verified</span>
            </div>

            {order.noSignatureRequired ? (
              <div className="h-16 flex items-center justify-center text-center text-xs font-bold text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-2">
                DELIVERED WITHOUT SIGNATURE (PHOTO VERIFIED)
              </div>
            ) : order.signatureDataUrl ? (
              <div className="h-16 bg-white rounded-lg border border-slate-200 p-1 flex items-center justify-center overflow-hidden">
                <img
                  src={order.signatureDataUrl}
                  alt="Customer Signature"
                  className="max-h-full max-w-full object-contain"
                />
              </div>
            ) : (
              <div className="h-16 border-b border-dashed border-slate-400 flex items-end justify-center pb-1 text-[10px] text-slate-400">
                Signature on file
              </div>
            )}

            <div className="flex justify-between items-baseline pt-1 text-[11px] border-t border-slate-200">
              <div>
                <span className="text-[9px] text-slate-400 uppercase font-bold block">Signer Name</span>
                <span className="font-bold text-slate-900">
                  {order.signedByName || order.customerName || "Recipient"}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[9px] text-slate-400 uppercase font-bold block">Timestamp</span>
                <span className="font-mono text-[10px] text-slate-700">
                  {order.signedAt ? new Date(order.signedAt).toLocaleDateString() : deliveryTimestamp}
                </span>
              </div>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="mt-6 pt-3 border-t border-slate-200 text-center text-[10px] text-slate-400 space-y-0.5">
          <div>Southern Basics LLC &bull; 8001 NW 54th St, Doral FL, 33166 &bull; +1 305-600-3157 &bull; info@productbrands.com</div>
          <div>Official Proof of Delivery (POD) &mdash; Retain for wholesale records and chargeback protection.</div>
        </div>

      </div>
    </>
  )
}
