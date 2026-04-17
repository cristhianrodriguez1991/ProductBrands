"use client"

import { useState, useEffect, useRef } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { convertHeicToJpeg } from "@/lib/convert-heic"
import { compressImage } from "@/lib/image-compression"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import {
  Plus,
  Building2,
  Phone,
  Mail,
  Globe,
  MapPin,
  Package,
  Calendar,
  Clock,
  FileText,
  Image as ImageIcon,
  ArrowLeft,
  Loader2,
  Hash,
  Layers,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Truck,
  FlaskConical,
  ChevronDown,
  ChevronUp,
  Paperclip,
  Upload,
  Search,
  Pencil,
  Trash2,
  Star,
  FolderOpen,
  Download,
  X,
  PlusCircle,
  AlertCircle,
  PackageSearch,
  UploadCloud,
  FileCheck,
  Camera,
} from "lucide-react"
import Link from "next/link"

// ─── Types ────────────────────────────────────────────────────
type BatchLotStatus =
  | "INCOMING"
  | "RECEIVED"
  | "IN_QC"
  | "APPROVED"
  | "ON_HOLD"
  | "RECALLED"
  | "DISPOSED"

type Attachment = {
  id: string
  fileName: string
  fileUrl: string
  fileSize: number | null
  mimeType: string | null
  label: string | null
  uploadedAt: string
}

type BatchLot = {
  id: string
  lotNumber: string
  productName: string
  productSku: string | null
  category: string | null
  quantityReceived: number | null
  quantityUnit: string | null
  manufacturedAt: string | null
  expiresAt: string | null
  receivedAt: string
  approvedAt: string | null
  status: BatchLotStatus
  internalNotes: string | null
  qcNotes: string | null
  invoiceNumber: string | null
  poNumber: string | null
  unitCost: number | null
  totalCost: number | null
  createdAt: string
  updatedAt: string
  attachments: Attachment[]
  masterBatch?: {
    id: string
    name: string | null
    attachments: Attachment[]
  } | null
}

type Supplier = {
  id: string
  name: string
  contactName: string | null
  email: string | null
  phone: string | null
  address: string | null
  city: string | null
  state: string | null
  country: string | null
  website: string | null
  notes: string | null
  isActive: boolean
  category: string
  batchLots: BatchLot[]
}

type ClientDocument = {
  id: string
  name: string
  fileUrl: string
  fileName: string
  fileSize: number | null
  mimeType: string | null
  uploadedAt: string
}

// ─── Status config ────────────────────────────────────────────
const STATUS_CONFIG: Record<
  BatchLotStatus,
  { label: string; color: string; icon: React.ReactNode }
> = {
  INCOMING: {
    label: "Incoming",
    color: "bg-blue-100 text-blue-700 border-blue-200",
    icon: <Truck className="h-3.5 w-3.5" />,
  },
  RECEIVED: {
    label: "Received",
    color: "bg-teal-100 text-teal-700 border-teal-200",
    icon: <Package className="h-3.5 w-3.5" />,
  },
  IN_QC: {
    label: "In QC",
    color: "bg-yellow-100 text-yellow-700 border-yellow-200",
    icon: <FlaskConical className="h-3.5 w-3.5" />,
  },
  APPROVED: {
    label: "Approved",
    color: "bg-green-100 text-green-700 border-green-200",
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
  },
  ON_HOLD: {
    label: "On Hold",
    color: "bg-orange-100 text-orange-700 border-orange-200",
    icon: <AlertTriangle className="h-3.5 w-3.5" />,
  },
  RECALLED: {
    label: "Recalled",
    color: "bg-red-100 text-red-700 border-red-200",
    icon: <XCircle className="h-3.5 w-3.5" />,
  },
  DISPOSED: {
    label: "Disposed",
    color: "bg-gray-100 text-gray-600 border-gray-200",
    icon: <XCircle className="h-3.5 w-3.5" />,
  },
}

function StatusBadge({ status }: { status: BatchLotStatus }) {
  const cfg = STATUS_CONFIG[status]
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${cfg.color}`}
    >
      {cfg.icon}
      {cfg.label}
    </span>
  )
}

function formatDate(d: string | null) {
  if (!d) return "—"
  return new Date(d).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

function formatDateTime(d: string | null) {
  if (!d) return "—"
  return new Date(d).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function TimestampButton({ onInsert }: { onInsert: (ts: string) => void }) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="h-7 text-[10px] uppercase font-bold text-blue-600 hover:text-blue-700 hover:bg-blue-50 gap-1 px-2"
      onClick={(e) => {
        e.preventDefault()
        const now = new Date()
        const ts = `[${now.toLocaleDateString()} ${now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}] - `
        onInsert(ts)
      }}
    >
      <Clock className="h-3 w-3" />
      Timestamp
    </Button>
  )
}

/** Format currency without forced 2dp — preserves 0.017, 0.5, 1.25 etc. */
function formatCost(n: number | null | undefined): string {
  if (n === null || n === undefined) return "0"
  if (n === 0) return "0"
  try {
    // Show up to 6 decimal places for precision sensitive values (like unit cost)
    // but avoid extreme cases or NaN.
    const s = n.toPrecision(6).replace(/\.?0+$/, "")
    const parsed = parseFloat(s)
    return isNaN(parsed) ? n.toString() : parsed.toString()
  } catch {
    return n.toString()
  }
}

const ATTACHMENT_LABELS = ["Pallet Photo", "Invoice", "COA", "Product Label", "Packaging", "Other"]

const EMPTY_LOT_FORM = {
  lotNumber: "",
  productName: "",
  productSku: "",
  category: "",
  quantityReceived: "",
  quantityUnit: "units",
  manufacturedAt: "",
  expiresAt: "",
  receivedAt: new Date().toISOString().slice(0, 16),
  status: "INCOMING" as BatchLotStatus,
  internalNotes: "",
  qcNotes: "",
  invoiceNumber: "",
  poNumber: "",
  unitCost: "",
  totalCost: "",
}

// ─── BatchLot card ─────────────────────────────────────────────
function BatchLotCard({
  lot,
  onStatusChange,
  onEdit,
  onDelete,
  onPreview,
  onClearNote,
  onDeleteAttachment,
  onDeleteSharedAttachment,
  onAddSharedAttachment,
}: {
  lot: BatchLot
  onStatusChange: (id: string, status: BatchLotStatus) => Promise<void>
  onEdit: (lot: BatchLot) => void
  onDelete: (lot: BatchLot) => void
  onPreview: (url: string, name: string) => void
  onClearNote?: (lotId: string) => void
  onDeleteAttachment?: (lotId: string, attachmentId: string) => Promise<void>
  onDeleteSharedAttachment?: (masterBatchId: string, attachmentId: string) => Promise<void>
  onAddSharedAttachment?: (masterBatchId: string, files: File[]) => Promise<void>
}) {
  const [expanded, setExpanded] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [deletingAttId, setDeletingAttId] = useState<string | null>(null)
  const [addingShared, setAddingShared] = useState(false)
  const isExpired =
    lot.expiresAt && new Date(lot.expiresAt) < new Date()
  const isExpiringSoon =
    lot.expiresAt &&
    !isExpired &&
    new Date(lot.expiresAt) < new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)

  const handleStatusChange = async (newStatus: string) => {
    setUpdatingStatus(true)
    await onStatusChange(lot.id, newStatus as BatchLotStatus)
    setUpdatingStatus(false)
  }

  return (
    <Card className="border hover:shadow-sm transition-shadow">
      <CardHeader className="pb-2 pt-3 px-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => onEdit(lot)}
                className="font-mono text-sm font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100 hover:bg-blue-100 transition-colors cursor-pointer"
                title="Click to edit lot"
              >
                {lot.lotNumber}
              </button>
              <StatusBadge status={lot.status} />
              {lot.masterBatch && (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200 shadow-sm animate-in fade-in zoom-in-95">
                  <Layers className="h-3 w-3" /> 
                  Shipment: <span className="text-blue-900">{lot.masterBatch.name || "Mixed Delivery"}</span>
                </span>
              )}
              {isExpired && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">
                  <AlertTriangle className="h-3 w-3" /> Expired
                </span>
              )}
              {isExpiringSoon && !isExpired && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-700">
                  <AlertTriangle className="h-3 w-3" /> Exp. Soon
                </span>
              )}
            </div>
            <h3 className="font-semibold text-sm mt-1">{lot.productName}</h3>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              {lot.productSku && (
                <span className="text-xs text-muted-foreground">SKU: {lot.productSku}</span>
              )}
              {lot.category && (
                <span className="text-xs text-muted-foreground">{lot.category}</span>
              )}
              {lot.quantityReceived && (
                <span className="text-xs font-medium text-gray-700">
                  {lot.quantityReceived.toLocaleString()} {lot.quantityUnit || "units"}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Select
              value={lot.status}
              onValueChange={handleStatusChange}
              disabled={updatingStatus}
            >
              <SelectTrigger className="w-32 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                  <SelectItem key={key} value={key} className="text-xs">
                    {cfg.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <button
              type="button"
              onClick={() => onEdit(lot)}
              title="Edit lot"
              className="h-8 w-8 flex items-center justify-center rounded-md border border-transparent hover:border-gray-200 hover:bg-gray-50 text-muted-foreground hover:text-blue-600 transition-colors"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onDelete(lot)}
              title="Delete lot"
              className="h-8 w-8 flex items-center justify-center rounded-md border border-transparent hover:border-red-100 hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0 pb-3 px-4">
        {/* Key dates row */}
        <div className="grid grid-cols-4 gap-2 text-sm mb-2">
          <div>
            <p className="text-xs text-muted-foreground mb-0 flex items-center gap-1">
              <Truck className="h-3 w-3" /> Received
            </p>
            <p className="font-medium text-xs">{formatDate(lot.receivedAt)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-0 flex items-center gap-1">
              <Calendar className="h-3 w-3" /> Manufactured
            </p>
            <p className="font-medium text-xs">{formatDate(lot.manufacturedAt)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-0 flex items-center gap-1">
              <Calendar className="h-3 w-3" /> Expires
            </p>
            <p
              className={`font-medium text-xs ${
                isExpired
                  ? "text-red-600"
                  : isExpiringSoon
                  ? "text-yellow-600"
                  : ""
              }`}
            >
              {formatDate(lot.expiresAt)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-0 flex items-center gap-1">
              <Clock className="h-3 w-3" /> Logged At
            </p>
            <p className="font-medium text-xs">{formatDateTime(lot.createdAt)}</p>
          </div>
        </div>

        {/* Invoice / PO */}
        {(lot.invoiceNumber || lot.poNumber || lot.unitCost != null || lot.totalCost != null) && (
          <div className="flex gap-3 text-xs mb-2 flex-wrap">
            {lot.invoiceNumber && (
              <span className="text-muted-foreground">
                Invoice: <span className="font-medium text-foreground">{lot.invoiceNumber}</span>
              </span>
            )}
            {lot.poNumber && (
              <span className="text-muted-foreground">
                PO: <span className="font-medium text-foreground">{lot.poNumber}</span>
              </span>
            )}
            {lot.unitCost != null && (
              <span className="text-muted-foreground">
                Unit Cost: <span className="font-medium text-foreground">${formatCost(lot.unitCost)}</span>
              </span>
            )}
            {lot.totalCost != null && (
              <span className="text-muted-foreground">
                Total: <span className="font-medium text-foreground">${formatCost(lot.totalCost)}</span>
              </span>
            )}
          </div>
        )}

        {/* Internal Notes - Always visible and orange if present */}
        {lot.internalNotes && (
          <div className="group/note mb-3 p-3 rounded-lg border border-orange-200 bg-orange-50/50 relative">
            <div className="flex items-center justify-between mb-1">
              <p className="text-[10px] font-bold text-orange-600 uppercase tracking-widest flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" /> Internal Notes
              </p>
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 text-orange-400 hover:text-red-600 opacity-0 group-hover/note:opacity-100 transition-opacity"
                onClick={(e) => {
                  e.stopPropagation()
                  onClearNote?.(lot.id)
                }}
                title="Clear internal notes"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
            <p className="text-sm text-orange-900 whitespace-pre-wrap">{lot.internalNotes}</p>
          </div>
        )}

        {/* Attachments - show both individual and shared (master) */}
        {(lot.attachments.length > 0 || (lot.masterBatch?.attachments?.length || 0) > 0) && (
          <div className="flex flex-wrap items-center gap-3 mb-2">
            {lot.attachments.length > 0 && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Paperclip className="h-3 w-3" />
                {lot.attachments.length} individual attachment{lot.attachments.length !== 1 ? "s" : ""}
              </div>
            )}
            {lot.masterBatch && lot.masterBatch.attachments.length > 0 && (
              <div className="flex items-center gap-1 text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded border border-blue-100 font-bold uppercase tracking-wider">
                <FileCheck className="h-3.5 w-3.5" />
                {lot.masterBatch.attachments.length} Shared Document{lot.masterBatch.attachments.length !== 1 ? "s" : ""} (from mixed pallet)
              </div>
            )}
          </div>
        )}

        {/* Expand toggle */}
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 transition-colors"
        >
          {expanded ? (
            <>
              <ChevronUp className="h-3.5 w-3.5" /> Hide details
            </>
          ) : (
            <>
              <ChevronDown className="h-3.5 w-3.5" /> View details
            </>
          )}
        </button>

        {expanded && (
          <div className="mt-4 space-y-4 border-t pt-4">
            {lot.qcNotes && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                  QC Notes
                </p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{lot.qcNotes}</p>
              </div>
            )}

            {/* Individual Attachments gallery */}
            {lot.attachments.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Individual Attachments
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {lot.attachments.map((att) => {
                    const isImage = att.mimeType?.startsWith("image/")
                    return (
                      <div
                        key={att.id}
                        className={cn(
                          "group relative block rounded-lg border overflow-hidden hover:border-blue-400 transition-colors",
                          isImage && "cursor-pointer"
                        )}
                      >
                        {/* Delete button */}
                        <button
                          type="button"
                          className="absolute top-1.5 right-1.5 z-10 h-6 w-6 rounded-full bg-red-500/90 text-white flex items-center justify-center shadow-md hover:bg-red-600 transition-all"
                          onClick={async (e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            setDeletingAttId(att.id)
                            await onDeleteAttachment?.(lot.id, att.id)
                            setDeletingAttId(null)
                          }}
                          title="Delete attachment"
                        >
                          {deletingAttId === att.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />}
                        </button>
                        <div
                          onClick={(e) => {
                            if (isImage) {
                              e.preventDefault()
                              e.stopPropagation()
                              onPreview(att.fileUrl, att.label || att.fileName)
                            }
                          }}
                        >
                          {isImage ? (
                            <div className="aspect-square bg-gray-50 overflow-hidden">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={att.fileUrl}
                                alt={att.label || att.fileName}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                              />
                            </div>
                          ) : (
                            <a
                              href={att.fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="aspect-square bg-gray-50 flex flex-col items-center justify-center gap-2"
                            >
                              <FileText className="h-8 w-8 text-blue-400" />
                            </a>
                          )}
                        </div>
                        <div className="px-2 py-1.5">
                          <p className="text-xs font-medium truncate">{att.label || att.fileName}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(att.uploadedAt)}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Shared Shipment Attachments */}
            {lot.masterBatch && (
              <div className="mt-4 pt-4 border-t border-blue-50">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider flex items-center gap-1.5">
                    <FileCheck className="h-3.5 w-3.5" /> Shared Shipment Documents
                  </p>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      className="h-7 px-2.5 rounded-md text-[10px] font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 flex items-center gap-1 transition-colors"
                      onClick={() => {
                        const input = document.createElement('input');
                        input.type = 'file';
                        input.accept = 'image/*';
                        input.setAttribute('capture', 'environment');
                        input.onchange = async (e) => {
                          const files = Array.from((e.target as HTMLInputElement).files || []);
                          if (files.length > 0 && lot.masterBatch) {
                            setAddingShared(true);
                            await onAddSharedAttachment?.(lot.masterBatch.id, files);
                            setAddingShared(false);
                          }
                        };
                        input.click();
                      }}
                    >
                      <Camera className="h-3 w-3" /> Photo
                    </button>
                    <button
                      type="button"
                      className="h-7 px-2.5 rounded-md text-[10px] font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 flex items-center gap-1 transition-colors"
                      onClick={() => {
                        const input = document.createElement('input');
                        input.type = 'file';
                        input.accept = 'image/*,.pdf,.doc,.docx,.xls,.xlsx';
                        input.multiple = true;
                        input.onchange = async (e) => {
                          const files = Array.from((e.target as HTMLInputElement).files || []);
                          if (files.length > 0 && lot.masterBatch) {
                            setAddingShared(true);
                            await onAddSharedAttachment?.(lot.masterBatch.id, files);
                            setAddingShared(false);
                          }
                        };
                        input.click();
                      }}
                    >
                      {addingShared ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />} Add
                    </button>
                  </div>
                </div>
                {lot.masterBatch.attachments.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {lot.masterBatch.attachments.map((att) => {
                      const isImage = att.mimeType?.startsWith("image/")
                      return (
                        <div
                          key={att.id}
                          className={cn(
                            "group relative block rounded-lg border border-blue-100 overflow-hidden hover:border-blue-400 bg-blue-50/10 transition-colors",
                            isImage && "cursor-pointer"
                          )}
                        >
                          {/* Delete button */}
                          <button
                            type="button"
                            className="absolute top-1.5 right-1.5 z-10 h-6 w-6 rounded-full bg-red-500/90 text-white flex items-center justify-center shadow-md hover:bg-red-600 transition-all"
                            onClick={async (e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              if (lot.masterBatch) {
                                setDeletingAttId(att.id)
                                await onDeleteSharedAttachment?.(lot.masterBatch.id, att.id)
                                setDeletingAttId(null)
                              }
                            }}
                            title="Delete shared document"
                          >
                            {deletingAttId === att.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />}
                          </button>
                          <div
                            onClick={(e) => {
                              if (isImage) {
                                e.preventDefault()
                                e.stopPropagation()
                                onPreview(att.fileUrl, att.label || att.fileName)
                              }
                            }}
                          >
                            {isImage ? (
                              <div className="aspect-square bg-white overflow-hidden">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={att.fileUrl}
                                  alt={att.label || att.fileName}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                />
                              </div>
                            ) : (
                              <a
                                href={att.fileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="aspect-square bg-white flex flex-col items-center justify-center gap-2"
                              >
                                <FileText className="h-8 w-8 text-blue-300" />
                              </a>
                            )}
                          </div>
                          <div className="px-2 py-1.5 bg-blue-50/30">
                            <p className="text-[10px] font-bold text-blue-700 uppercase tracking-tighter truncate">{att.label || "Shared Document"}</p>
                            <p className="text-[10px] text-blue-500/70">
                              {formatDate(att.uploadedAt)}
                            </p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic py-2">No shared documents yet. Use the buttons above to add.</p>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ─── Main page ─────────────────────────────────────────────────
export default function SupplierDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [supplier, setSupplier] = useState<Supplier | null>(null)
  const [loading, setLoading] = useState(true)
  const [showAddLot, setShowAddLot] = useState(false)
  const [saving, setSaving] = useState(false)
  const [lotForm, setLotForm] = useState(EMPTY_LOT_FORM)
  const [lotError, setLotError] = useState("")
  const [files, setFiles] = useState<{ file: File; label: string }[]>([])
  const [search, setSearch] = useState("")
  const [filterStatus, setFilterStatus] = useState<BatchLotStatus | "ALL">("ALL")
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Edit state
  const [editingLot, setEditingLot] = useState<BatchLot | null>(null)
  const [editForm, setEditForm] = useState(EMPTY_LOT_FORM)
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState("")
  const [editFiles, setEditFiles] = useState<{ file: File; label: string }[]>([])
  const editFileInputRef = useRef<HTMLInputElement>(null)

  // Delete state
  const [deletingLot, setDeletingLot] = useState<BatchLot | null>(null)
  const [deleteConfirming, setDeleteConfirming] = useState(false)

  // ── Client Documents (Private Label) ──
  const [documents, setDocuments] = useState<ClientDocument[]>([])
  const [showDocs, setShowDocs] = useState(false)
  const [isEditingNotes, setIsEditingNotes] = useState(false)
  const [tempNotes, setTempNotes] = useState("")
  const [newNote, setNewNote] = useState("")
  const [editingEntryIndex, setEditingEntryIndex] = useState<number | null>(null)
  const [editingEntryText, setEditingEntryText] = useState("")
  const [savingNotes, setSavingNotes] = useState(false)
  const [previewImage, setPreviewImage] = useState<{ url: string; name: string } | null>(null)
  const [docUploading, setDocUploading] = useState(false)
  const [docName, setDocName] = useState("")
  const [docFile, setDocFile] = useState<File | null>(null)
  const [docError, setDocError] = useState("")
  const [deletingDocId, setDeletingDocId] = useState<string | null>(null)
  const docFileRef = useRef<HTMLInputElement>(null)
  const [isMixedPallet, setIsMixedPallet] = useState(false)
  const [mixedItems, setMixedItems] = useState<{ id: string; productName: string; lotNumber: string; expiresAt: string; category: string; quantityReceived: string; quantityUnit: string; files: File[] }[]>([
    { id: '1', productName: '', lotNumber: '', expiresAt: '', category: '', quantityReceived: '', quantityUnit: 'units', files: [] }
  ])

  const fetchDocuments = async () => {
    if (!id) return
    try {
      const res = await fetch(`/api/suppliers/${id}/documents`)
      if (res.ok) setDocuments(await res.json())
    } catch {}
  }

  const handleSaveNotes = async () => {
    if (!supplier) return
    setSavingNotes(true)
    try {
      const resp = await fetch(`/api/suppliers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: tempNotes }),
      })
      if (resp.ok) {
        setIsEditingNotes(false)
        fetchSupplier()
      }
    } finally {
      setSavingNotes(false)
    }
  }

  const handleAddLogEntry = async () => {
    if (!newNote.trim() || !supplier) return
    setSavingNotes(true)
    const now = new Date()
    const ts = `[${now.toLocaleDateString()} ${now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}] - `
    const entry = ts + newNote.trim()
    
    // Check if we need a newline separator
    const currentNotes = supplier.notes || ""
    const updatedNotes = currentNotes 
      ? (currentNotes.endsWith("\n") ? currentNotes + entry : currentNotes + "\n" + entry)
      : entry
      
    try {
      const resp = await fetch(`/api/suppliers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: updatedNotes }),
      })
      if (resp.ok) {
        setNewNote("")
        fetchSupplier()
      }
    } finally {
      setSavingNotes(false)
    }
  }

  const handleDeleteEntry = async (index: number) => {
    if (!supplier) return
    const lines = (supplier.notes || "").split("\n").filter(l => l.trim())
    lines.splice(index, 1)
    const updatedNotes = lines.join("\n")
    
    // Optimistic update
    setSupplier({ ...supplier, notes: updatedNotes })
    
    setSavingNotes(true)
    try {
      const resp = await fetch(`/api/suppliers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: updatedNotes }),
      })
      if (!resp.ok) fetchSupplier() // Revert on failure
    } finally {
      setSavingNotes(false)
    }
  }

  const handleClearBatchNote = async (lotId: string) => {
    if (!supplier) return
    try {
      // Create FormData to clear the note
      const fd = new FormData()
      fd.append("internalNotes", "")
      
      const resp = await fetch(`/api/suppliers/${id}/lots/${lotId}`, {
        method: "PATCH",
        body: fd,
      })
      
      if (resp.ok) fetchSupplier()
    } catch {}
  }

  const handleSaveEditEntry = async (index: number) => {
    if (!supplier) return
    const lines = (supplier.notes || "").split("\n").filter(l => l.trim())
    
    // Preserve timestamp if possible
    const oldLine = lines[index]
    const tsMatch = oldLine.match(/^\[.*?\] - /)
    const prefix = tsMatch ? tsMatch[0] : ""
    
    lines[index] = prefix + editingEntryText.trim()
    const updatedNotes = lines.join("\n")
    
    setSavingNotes(true)
    try {
      const resp = await fetch(`/api/suppliers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: updatedNotes }),
      })
      if (resp.ok) {
        setEditingEntryIndex(null)
        fetchSupplier()
      }
    } finally {
      setSavingNotes(false)
    }
  }

  const handleDocUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!docFile) { setDocError("Please select a file"); return }
    setDocError("")
    setDocUploading(true)
    try {
      // Convert HEIC to JPEG if needed and then compress heavily
      const convertedFile = await convertHeicToJpeg(docFile)
      const compressedFile = await compressImage(convertedFile)
      const fd = new FormData()
      fd.append("name", docName || compressedFile.name)
      fd.append("file", compressedFile)
      const res = await fetch(`/api/suppliers/${id}/documents`, { method: "POST", body: fd })
      let data: any = {}
      try {
        data = await res.json()
      } catch (err) {
        if (!res.ok) {
          if (res.status === 413) throw new Error("File too large. Please limit total size before uploading.")
          throw new Error(`Server error: ${res.status} ${res.statusText}`)
        }
      }
      if (!res.ok) throw new Error(data.error || "Upload failed")
      setDocName("")
      setDocFile(null)
      if (docFileRef.current) docFileRef.current.value = ""
      await fetchDocuments()
    } catch (err) {
      setDocError(err instanceof Error ? err.message : "Upload failed")
    } finally {
      setDocUploading(false)
    }
  }

  const handleDocDelete = async (docId: string) => {
    setDeletingDocId(docId)
    try {
      await fetch(`/api/suppliers/${id}/documents/${docId}`, { method: "DELETE" })
      await fetchDocuments()
    } finally {
      setDeletingDocId(null)
    }
  }

  const fetchSupplier = async () => {
    try {
      const res = await fetch(`/api/suppliers/${id}`)
      if (res.ok) setSupplier(await res.json())
      else router.push("/admin/suppliers")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSupplier()
    fetchDocuments()
  }, [id])

  // Auto-open batch modal if navigated with ?addBatch=true
  useEffect(() => {
    if (searchParams.get('addBatch') === 'true' && !loading) {
      setShowAddLot(true)
      // Clean up the URL param
      router.replace(`/admin/suppliers/${id}`, { scroll: false })
    }
  }, [searchParams, loading])

  const handleStatusChange = async (lotId: string, status: BatchLotStatus) => {
    const res = await fetch(`/api/suppliers/${id}/lots/${lotId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    })
    if (res.ok) await fetchSupplier()
  }

  // Open edit modal pre-filled
  const handleOpenEdit = (lot: BatchLot) => {
    setEditForm({
      lotNumber: lot.lotNumber,
      productName: lot.productName,
      productSku: lot.productSku ?? "",
      category: lot.category ?? "",
      quantityReceived: lot.quantityReceived?.toString() ?? "",
      quantityUnit: lot.quantityUnit ?? "units",
      manufacturedAt: lot.manufacturedAt ? new Date(lot.manufacturedAt).toISOString().slice(0, 10) : "",
      expiresAt: lot.expiresAt ? new Date(lot.expiresAt).toISOString().slice(0, 10) : "",
      receivedAt: new Date(lot.receivedAt).toISOString().slice(0, 16),
      status: lot.status,
      internalNotes: lot.internalNotes ?? "",
      qcNotes: lot.qcNotes ?? "",
      invoiceNumber: lot.invoiceNumber ?? "",
      poNumber: lot.poNumber ?? "",
      unitCost: lot.unitCost?.toString() ?? "",
      totalCost: lot.totalCost?.toString() ?? "",
    })
    setEditError("")
    setEditingLot(lot)
    setEditFiles([])
  }

  const handleEditAddFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFiles = Array.from(e.target.files ?? [])
    setEditFiles((prev) => [
      ...prev,
      ...newFiles.map((f) => ({ file: f, label: "Other" })),
    ])
    if (editFileInputRef.current) editFileInputRef.current.value = ""
  }

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingLot || editSaving) return
    setEditError("")
    setEditSaving(true)
    try {
      const fd = new FormData()
      Object.entries(editForm).forEach(([k, v]) => {
        if (v !== "" && v !== null && v !== undefined) fd.append(k, String(v))
      })

      // Convert any HEIC files to JPEG and compress before uploading
      const convertedFiles = await Promise.all(
        editFiles.map(async ({ file, label }) => ({
          file: await compressImage(await convertHeicToJpeg(file)),
          label,
        }))
      )
      convertedFiles.forEach(({ file, label }) => {
        fd.append("files", file)
        fd.append("labels", label)
      })

      const res = await fetch(`/api/suppliers/${id}/lots/${editingLot.id}`, {
        method: "PATCH",
        body: fd,
      })
      let data: any = {}
      try {
        data = await res.json()
      } catch (err) {
        if (!res.ok) {
          if (res.status === 413) throw new Error("File too large. Please limit total size before uploading.")
          throw new Error(`Server error: ${res.status} ${res.statusText}`)
        }
      }
      if (!res.ok) throw new Error(data.error || "Failed to update")
      setEditingLot(null)
      setEditFiles([])
      await fetchSupplier()
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setEditSaving(false)
    }
  }

  const handleDeleteConfirm = async () => {
    if (!deletingLot) return
    setDeleteConfirming(true)
    try {
      const res = await fetch(`/api/suppliers/${id}/lots/${deletingLot.id}`, {
        method: "DELETE",
      })
      if (res.ok) {
        setDeletingLot(null)
        await fetchSupplier()
      }
    } finally {
      setDeleteConfirming(false)
    }
  }

  const handleDeleteAttachment = async (lotId: string, attachmentId: string) => {
    try {
      const res = await fetch(`/api/suppliers/${id}/lots/${lotId}/attachments/${attachmentId}`, {
        method: "DELETE",
      })
      if (res.ok) await fetchSupplier()
    } catch {}
  }

  const handleDeleteSharedAttachment = async (masterBatchId: string, attachmentId: string) => {
    try {
      const res = await fetch(`/api/suppliers/${id}/master-batches/${masterBatchId}/attachments/${attachmentId}`, {
        method: "DELETE",
      })
      if (res.ok) await fetchSupplier()
    } catch {}
  }

  const handleAddSharedAttachment = async (masterBatchId: string, files: File[]) => {
    try {
      const fd = new FormData()
      for (const f of files) {
        const converted = await convertHeicToJpeg(f)
        fd.append("files", converted)
        fd.append("labels", "Shared Document")
      }
      const res = await fetch(`/api/suppliers/${id}/master-batches/${masterBatchId}/attachments`, {
        method: "POST",
        body: fd,
      })
      if (res.ok) await fetchSupplier()
    } catch {}
  }

  const handleAddFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFiles = Array.from(e.target.files ?? [])
    setFiles((prev) => [
      ...prev,
      ...newFiles.map((f) => ({ file: f, label: "Other" })),
    ])
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const handleSubmitMasterBatch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (saving) return
    setLotError("")
    setSaving(true)
    try {
      if (mixedItems.length === 0 || mixedItems.some(i => !i.productName)) {
        throw new Error("Please add at least one product with a name.")
      }

      const fd = new FormData()
      fd.append("name", lotForm.lotNumber || "Mixed Pallet")
      fd.append("invoiceNumber", lotForm.invoiceNumber)
      fd.append("poNumber", lotForm.poNumber)
      fd.append("receivedAt", lotForm.receivedAt)
      fd.append("notes", lotForm.internalNotes)
      fd.append("items", JSON.stringify(mixedItems))
      
      // 1. Submit JSON payload ONLY
      const res = await fetch(`/api/suppliers/${id}/master-batches`, {
        method: "POST",
        body: fd,
      })
      let data: any = {}
      try {
        data = await res.json()
      } catch (err) {
        if (!res.ok) {
          if (res.status === 413) throw new Error("Payload too large. Please upload smaller files or fewer items at once to stay under 4.5MB.")
          throw new Error(`Server error: ${res.status} ${res.statusText}`)
        }
      }
      if (!res.ok) throw new Error(data.error || "Failed to create mixed pallet")
      
      const masterBatchId = data.masterBatch?.id;
      const batchLots = data.batchLots || [];

      // 2. Upload Shared files one request at a time
      for (const { file, label } of files) {
        const converted = await convertHeicToJpeg(file);
        const compressed = await compressImage(converted);
        
        const fileFd = new FormData();
        fileFd.append("files", compressed);
        fileFd.append("labels", label);
        
        await fetch(`/api/suppliers/${id}/master-batches/${masterBatchId}/attachments`, {
          method: "POST",
          body: fileFd
        });
      }

      // 3. Upload Individual item files one request at a time
      for (let idx = 0; idx < mixedItems.length; idx++) {
        const item = mixedItems[idx];
        const lotId = batchLots[idx]?.id;
        if (!lotId) continue; // Skip if backend didn't return matching lot

        if (item.files && item.files.length > 0) {
          for (const f of item.files) {
            const converted = await convertHeicToJpeg(f);
            const compressed = await compressImage(converted);
            
            const fileFd = new FormData();
            fileFd.append("files", compressed);
            fileFd.append("labels", "Individual Product Note");
            
            await fetch(`/api/suppliers/${id}/lots/${lotId}/attachments`, {
              method: "POST",
              body: fileFd
            });
          }
        }
      }
      
      setShowAddLot(false)
      setLotForm(EMPTY_LOT_FORM)
      setMixedItems([{ id: '1', productName: '', lotNumber: '', expiresAt: '', category: '', quantityReceived: '', quantityUnit: 'units', files: [] }])
      setIsMixedPallet(false)
      setFiles([])
      await fetchSupplier()
    } catch (err) {
      setLotError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setSaving(false)
    }
  }

  const handleSubmitLot = async (e: React.FormEvent) => {
    e.preventDefault()
    if (saving) return
    setLotError("")
    setSaving(true)
    try {
      const fd = new FormData()
      Object.entries(lotForm).forEach(([k, v]) => {
        if (v !== "" && v !== null && v !== undefined) fd.append(k, String(v))
      })
      // Convert any HEIC files to JPEG and compress before uploading
      const convertedFiles = await Promise.all(
        files.map(async ({ file, label }) => ({
          file: await compressImage(await convertHeicToJpeg(file)),
          label,
        }))
      )
      convertedFiles.forEach(({ file, label }) => {
        fd.append("files", file)
        fd.append("labels", label)
      })

      const res = await fetch(`/api/suppliers/${id}/lots`, {
        method: "POST",
        body: fd,
      })
      let data: any = {}
      try {
        data = await res.json()
      } catch (err) {
        if (!res.ok) {
          if (res.status === 413) throw new Error("Payload too large. Please upload smaller files or fewer items to stay under 4.5MB.")
          throw new Error(`Server error: ${res.status} ${res.statusText}`)
        }
      }
      if (!res.ok) throw new Error(data.error || "Failed to create batch lot")

      setShowAddLot(false)
      setLotForm(EMPTY_LOT_FORM)
      setFiles([])
      await fetchSupplier()
    } catch (err) {
      setLotError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setSaving(false)
    }
  }

  // Filtering & sorting
  const lots = supplier?.batchLots ?? []
  const filtered = lots
    .filter((lot) => {
      const matchSearch =
        lot.lotNumber.toLowerCase().includes(search.toLowerCase()) ||
        lot.productName.toLowerCase().includes(search.toLowerCase()) ||
        (lot.productSku ?? "").toLowerCase().includes(search.toLowerCase()) ||
        (lot.invoiceNumber ?? "").toLowerCase().includes(search.toLowerCase())
      const matchStatus = filterStatus === "ALL" || lot.status === filterStatus
      return matchSearch && matchStatus
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  // Group by month
  const grouped = filtered.reduce<Record<string, BatchLot[]>>((acc, lot) => {
    let monthKey = "Unknown Date"
    try {
      const date = new Date(lot.receivedAt)
      if (!isNaN(date.getTime())) {
        monthKey = date.toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
        })
      }
    } catch {}
    
    if (!acc[monthKey]) acc[monthKey] = []
    acc[monthKey].push(lot)
    return acc
  }, {})

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!supplier) return null

  return (
    <div>
      {/* Back / Header */}
      <div className="mb-6">
        <Link
          href="/admin/suppliers"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Suppliers
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center flex-shrink-0">
              <Building2 className="h-7 w-7 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{supplier.name}</h1>
              {supplier.contactName && (
                <p className="text-muted-foreground">{supplier.contactName}</p>
              )}
            </div>
          </div>
          <Button onClick={() => setShowAddLot(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Batch Lot
          </Button>
        </div>
      </div>

      {/* Supplier info strip */}
      <Card className="mb-8 overflow-hidden">
        <CardContent className="pt-5 pb-5">
          <div className="flex flex-wrap gap-x-8 gap-y-3">
            {supplier.email && (
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <a href={`mailto:${supplier.email}`} className="hover:text-blue-600">
                  {supplier.email}
                </a>
              </div>
            )}
            {supplier.phone && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground" />
                {supplier.phone}
              </div>
            )}
            {supplier.website && (
              <div className="flex items-center gap-2 text-sm">
                <Globe className="h-4 w-4 text-muted-foreground" />
                <a href={supplier.website} target="_blank" rel="noopener noreferrer" className="hover:text-blue-600">
                  {supplier.website}
                </a>
              </div>
            )}
            {(supplier.city || supplier.country) && (
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                {[supplier.address, supplier.city, supplier.state, supplier.country]
                  .filter(Boolean)
                  .join(", ")}
              </div>
            )}
          </div>
        </CardContent>
        <div className="border-t bg-muted/10 p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5" /> Supplier Logs & Reminders
            </h3>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-7 text-[10px] uppercase font-bold text-muted-foreground hover:text-blue-600"
              onClick={() => {
                setTempNotes(supplier.notes || "")
                setIsEditingNotes(!isEditingNotes)
              }}
            >
              {isEditingNotes ? "Exit manual edit" : "Edit Full Log"}
            </Button>
          </div>

          {isEditingNotes ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-[10px] text-muted-foreground italic">Manual edit allows you to fix typos or reorganize the logs.</p>
                <div className="flex items-center gap-2">
                  <TimestampButton onInsert={(ts) => setTempNotes(tempNotes + ts)} />
                  <Button size="sm" className="h-7 text-xs px-4" onClick={handleSaveNotes} disabled={savingNotes}>
                    {savingNotes ? <Loader2 className="h-3 w-3 animate-spin" /> : "Save All"}
                  </Button>
                </div>
              </div>
              <Textarea 
                value={tempNotes}
                onChange={(e) => setTempNotes(e.target.value)}
                placeholder="Full log content..."
                className="resize-none text-sm min-h-[150px] font-mono"
                autoFocus
              />
            </div>
          ) : (
            <div className="space-y-4">
              {/* Log List */}
              <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                {supplier.notes ? (
                  supplier.notes.split("\n").filter(line => line.trim()).map((line, idx) => {
                    const tsMatch = line.match(/^\[(.*? \d\d:\d\d [AP]M)\] - (.*)/)
                    const isEditing = editingEntryIndex === idx
                    const content = tsMatch ? tsMatch[2] : line
                    const timestamp = tsMatch ? tsMatch[1] : null

                    return (
                      <div key={idx} className="group relative bg-white border rounded-lg p-2.5 shadow-sm hover:border-blue-200 transition-colors">
                        {isEditing ? (
                          <div className="space-y-2">
                            {timestamp && (
                              <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded uppercase tracking-wider">
                                {timestamp}
                              </span>
                            )}
                            <Textarea
                              value={editingEntryText}
                              onChange={(e) => setEditingEntryText(e.target.value)}
                              className="text-sm min-h-[60px] resize-none"
                              autoFocus
                            />
                            <div className="flex justify-end gap-2">
                              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setEditingEntryIndex(null)}>Cancel</Button>
                              <Button size="sm" className="h-7 text-xs bg-blue-600" onClick={() => handleSaveEditEntry(idx)} disabled={savingNotes}>
                                Save
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center justify-between mb-1">
                              {timestamp && (
                                <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded uppercase tracking-wider">
                                  {timestamp}
                                </span>
                              )}
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-6 w-6 text-muted-foreground hover:text-blue-600"
                                  onClick={() => {
                                    setEditingEntryText(content)
                                    setEditingEntryIndex(idx)
                                  }}
                                >
                                  <Pencil className="h-3 w-3" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-6 w-6 text-muted-foreground hover:text-red-600"
                                  onClick={() => handleDeleteEntry(idx)}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                            <p className="text-sm text-gray-800 leading-relaxed pr-8">{content}</p>
                          </>
                        )}
                      </div>
                    )
                  })
                ) : (
                  <div className="py-6 text-center border-2 border-dashed border-gray-100 rounded-xl">
                    <p className="text-sm text-muted-foreground italic">No logs added yet. Use the field below to add a reminder or update.</p>
                  </div>
                )}
              </div>

              {/* Add New Entry */}
              <div className="flex gap-2 pt-2 border-t border-dashed">
                <div className="flex-1 relative">
                  <Textarea
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="Add a new log entry (delivery update, reminder...)"
                    className="resize-none text-sm min-h-[60px] pr-20"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault()
                        handleAddLogEntry()
                      }
                    }}
                  />
                  <div className="absolute bottom-2 right-2 flex items-center gap-1.5">
                    <Button 
                      size="sm" 
                      className="h-7 text-xs px-3 bg-blue-600 hover:bg-blue-700"
                      onClick={handleAddLogEntry}
                      disabled={savingNotes || !newNote.trim()}
                    >
                      {savingNotes ? <Loader2 className="h-3 w-3 animate-spin" /> : "Add Note"}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="pt-5">
            <div className="text-2xl font-bold">{lots.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Total Lots</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="text-2xl font-bold text-green-600">
              {lots.filter((l) => l.status === "APPROVED").length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Approved</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="text-2xl font-bold text-orange-600">
              {lots.filter((l) => l.status === "ON_HOLD").length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">On Hold</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="text-2xl font-bold text-red-600">
              {lots.filter((l) => l.status === "RECALLED").length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Recalled</p>
          </CardContent>
        </Card>
      </div>

      {/* ── Client Documents Section ── */}
      <Card className="mb-8 border-purple-100 shadow-sm overflow-hidden">
        <CardHeader className="py-4 bg-purple-50/50 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setShowDocs(!showDocs)}>
            <FolderOpen className="h-5 w-5 text-purple-600" />
            <CardTitle className="text-base font-semibold">Client Documents</CardTitle>
            <Badge variant="secondary" className="bg-purple-100 text-purple-700 hover:bg-purple-100">
              {documents.length}
            </Badge>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setShowDocs(!showDocs)}
            className="text-purple-700 hover:bg-purple-100/50"
          >
            {showDocs ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </CardHeader>

        {showDocs && (
          <CardContent className="pt-5 pb-6">
            {/* Upload form */}
            <form onSubmit={handleDocUpload} className="flex flex-col sm:flex-row gap-3 mb-6">
              <div className="flex-1">
                <Input
                  placeholder="Document name (e.g. Contract 2024, Invoice #001)"
                  value={docName}
                  onChange={(e) => setDocName(e.target.value)}
                  className="border-purple-100 focus-visible:ring-purple-500"
                />
              </div>
              <div className="flex-1">
                <input
                  ref={docFileRef}
                  type="file"
                  accept="*/*"
                  onChange={(e) => setDocFile(e.target.files?.[0] || null)}
                  className="block w-full text-sm text-muted-foreground file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100 cursor-pointer border border-purple-100 rounded-md h-10 px-3 pt-1.5"
                />
              </div>
              <Button type="submit" disabled={docUploading || !docFile} className="gap-2 shrink-0 bg-purple-600 hover:bg-purple-700">
                {docUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                Upload Document
              </Button>
            </form>
            {docError && <p className="text-red-600 text-xs mt-2 mb-4">{docError}</p>}

            {/* Document list (List Manner) */}
            {documents.length === 0 ? (
              <div className="py-10 text-center border-2 border-dashed border-purple-50 rounded-xl">
                <FolderOpen className="h-12 w-12 mx-auto mb-3 text-purple-200" />
                <p className="text-sm text-muted-foreground">No documents uploaded yet.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {documents.map((doc) => {
                  const isImage = doc.mimeType?.startsWith("image/")
                  const isPdf = doc.mimeType === "application/pdf"
                  return (
                    <div key={doc.id} className="flex items-center justify-between p-3 rounded-xl border border-gray-100 bg-white hover:border-purple-200 hover:shadow-sm transition-all group">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="h-10 w-10 rounded-lg border bg-purple-50 flex items-center justify-center shrink-0 overflow-hidden cursor-pointer hover:ring-2 hover:ring-purple-400 transition-all"
                             onClick={(e) => {
                               if (isImage) {
                                 e.preventDefault()
                                 e.stopPropagation()
                                 setPreviewImage({ url: doc.fileUrl, name: doc.name })
                               }
                             }}>
                          {isImage ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={doc.fileUrl} alt={doc.name} className="w-full h-full object-cover" />
                          ) : (
                            <FileText className={`h-5 w-5 ${isPdf ? "text-red-400" : "text-blue-400"}`} />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-sm truncate text-gray-900">{doc.name}</p>
                          <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                            {doc.fileSize ? `${(doc.fileSize / 1024).toFixed(0)} KB · ` : ""}
                            {new Date(doc.uploadedAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 pr-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <a
                          href={doc.fileUrl}
                          download={doc.fileName}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border bg-white hover:bg-gray-50 transition-colors"
                        >
                          <Download className="h-3.5 w-3.5" />
                          Open
                        </a>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDocDelete(doc.id)}
                          disabled={deletingDocId === doc.id}
                          className="h-8 w-8 text-muted-foreground hover:text-red-600 hover:bg-red-50"
                        >
                          {deletingDocId === doc.id
                            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            : <Trash2 className="h-3.5 w-3.5" />}
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* Lot & Batch Tracker header */}
      <div className="mb-5">
        <h2 className="text-xl font-bold mb-1 flex items-center gap-2">
          <Layers className="h-5 w-5 text-blue-600" />
          Lot &amp; Batch Tracker
        </h2>
        <p className="text-sm text-muted-foreground">
          All product batches from this supplier, sorted by most recent arrival.
        </p>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap mb-6">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search lot #, product, SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select
          value={filterStatus}
          onValueChange={(v) => setFilterStatus(v as any)}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Statuses</SelectItem>
            {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
              <SelectItem key={key} value={key}>
                {cfg.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Lots — grouped by month */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-40" />
            <p className="font-semibold text-lg mb-1">No batch lots found</p>
            <p className="text-muted-foreground text-sm mb-6">
              {search || filterStatus !== "ALL"
                ? "Try adjusting your filters."
                : "Add the first batch lot for this supplier."}
            </p>
            {!search && filterStatus === "ALL" && (
              <Button onClick={() => setShowAddLot(true)} variant="outline" className="gap-2">
                <Plus className="h-4 w-4" />
                Add Batch Lot
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {Object.entries(grouped).map(([month, monthLots]) => (
            <div key={month}>
              <div className="flex items-center gap-3 mb-4">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  {month}
                </h3>
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted-foreground">{monthLots.length} lot{monthLots.length !== 1 ? "s" : ""}</span>
              </div>
              <div className="space-y-4">
                {monthLots.map((lot) => (
                  <BatchLotCard
                    key={lot.id}
                    lot={lot}
                    onStatusChange={handleStatusChange}
                    onEdit={handleOpenEdit}
                    onDelete={setDeletingLot}
                    onPreview={(url, name) => setPreviewImage({ url, name })}
                    onClearNote={handleClearBatchNote}
                    onDeleteAttachment={handleDeleteAttachment}
                    onDeleteSharedAttachment={handleDeleteSharedAttachment}
                    onAddSharedAttachment={handleAddSharedAttachment}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Delete Confirmation Modal ── */}
      <Dialog open={!!deletingLot} onOpenChange={(o) => { if (!o) setDeletingLot(null) }}>
        <DialogContent 
          className="max-w-md"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="h-5 w-5" />
              Delete Batch Lot
            </DialogTitle>
            <DialogDescription>
              This will permanently delete lot{" "}
              <span className="font-mono font-bold text-foreground">{deletingLot?.lotNumber}</span>{" "}
              ({deletingLot?.productName}). This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setDeletingLot(null)} disabled={deleteConfirming}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={deleteConfirming}
            >
              {deleteConfirming ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Deleting...</>
              ) : "Delete Permanently"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Edit Batch Lot Modal ── */}
      <Dialog open={!!editingLot} onOpenChange={(o) => { if (!o) setEditingLot(null) }}>
        <DialogContent 
          className="max-w-3xl max-h-[92vh] overflow-y-auto"
          onInteractOutside={(e) => e.preventDefault()}
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5 text-blue-600" />
              Edit Batch Lot
              <span className="font-mono text-sm font-normal text-muted-foreground">{editingLot?.lotNumber}</span>
            </DialogTitle>
            <DialogDescription>
              Update the details for this batch lot.
            </DialogDescription>
          </DialogHeader>
          {editingLot && (
            <form onSubmit={handleSaveEdit} className="space-y-6 mt-2">
              {editError && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-md px-4 py-3">
                  {editError}
                </div>
              )}
              {/* Identification */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Identification</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 sm:col-span-1">
                    <Label htmlFor="edit-lot-number">Lot Number <span className="text-red-500">*</span></Label>
                    <Input id="edit-lot-number" required value={editForm.lotNumber}
                      onChange={(e) => setEditForm({ ...editForm, lotNumber: e.target.value })}
                      className="mt-1 font-mono" />
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <Label htmlFor="edit-lot-status">Status</Label>
                    <Select value={editForm.status} onValueChange={(v) => setEditForm({ ...editForm, status: v as BatchLotStatus })}>
                      <SelectTrigger id="edit-lot-status" className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                          <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2">
                    <Label htmlFor="edit-product">Product Name <span className="text-red-500">*</span></Label>
                    <Input id="edit-product" required value={editForm.productName}
                      onChange={(e) => setEditForm({ ...editForm, productName: e.target.value })}
                      className="mt-1" />
                  </div>
                  <div>
                    <Label htmlFor="edit-sku">SKU / Part #</Label>
                    <Input id="edit-sku" value={editForm.productSku}
                      onChange={(e) => setEditForm({ ...editForm, productSku: e.target.value })}
                      className="mt-1" />
                  </div>
                  <div>
                    <Label htmlFor="edit-category">Category</Label>
                    <Input id="edit-category" value={editForm.category}
                      onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                      className="mt-1" />
                  </div>
                </div>
              </div>
              {/* Quantity */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Quantity</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-qty">Quantity Received</Label>
                    <Input id="edit-qty" value={editForm.quantityReceived}
                      onChange={(e) => setEditForm({ ...editForm, quantityReceived: e.target.value })}
                      className="mt-1" />
                  </div>
                  <div>
                    <Label htmlFor="edit-unit">Unit</Label>
                    <Select value={editForm.quantityUnit} onValueChange={(v) => setEditForm({ ...editForm, quantityUnit: v })}>
                      <SelectTrigger id="edit-unit" className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["units","boxes","pallets","lbs","kg","oz","liters","cases"].map((u) => (
                          <SelectItem key={u} value={u}>{u}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              {/* Dates */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Dates &amp; Timestamps</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="edit-received">Received At</Label>
                    <Input id="edit-received" type="datetime-local" value={editForm.receivedAt}
                      onChange={(e) => setEditForm({ ...editForm, receivedAt: e.target.value })}
                      className="mt-1" />
                  </div>
                  <div>
                    <Label htmlFor="edit-manufactured">Manufactured Date</Label>
                    <Input id="edit-manufactured" type="date" value={editForm.manufacturedAt}
                      onChange={(e) => setEditForm({ ...editForm, manufacturedAt: e.target.value })}
                      className="mt-1" />
                  </div>
                  <div>
                    <Label htmlFor="edit-expires">Expiration Date</Label>
                    <Input id="edit-expires" type="date" value={editForm.expiresAt}
                      onChange={(e) => setEditForm({ ...editForm, expiresAt: e.target.value })}
                      className="mt-1" />
                  </div>
                </div>
              </div>
              {/* Financials */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Invoice &amp; Financials</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-invoice">Invoice #</Label>
                    <Input id="edit-invoice" value={editForm.invoiceNumber}
                      onChange={(e) => setEditForm({ ...editForm, invoiceNumber: e.target.value })}
                      className="mt-1" />
                  </div>
                  <div>
                    <Label htmlFor="edit-po">PO Number</Label>
                    <Input id="edit-po" value={editForm.poNumber}
                      onChange={(e) => setEditForm({ ...editForm, poNumber: e.target.value })}
                      className="mt-1" />
                  </div>
                  <div>
                    <Label htmlFor="edit-unit-cost">Unit Cost ($)</Label>
                    <Input id="edit-unit-cost" value={editForm.unitCost}
                      onChange={(e) => setEditForm({ ...editForm, unitCost: e.target.value })}
                      className="mt-1" />
                  </div>
                  <div>
                    <Label htmlFor="edit-total-cost">Total Cost ($)</Label>
                    <Input id="edit-total-cost" value={editForm.totalCost}
                      onChange={(e) => setEditForm({ ...editForm, totalCost: e.target.value })}
                      className="mt-1" />
                  </div>
                </div>
              </div>
              {/* Notes */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Notes</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <Label htmlFor="edit-notes">Internal Notes</Label>
                      <TimestampButton onInsert={(ts) => setEditForm(prev => ({ ...prev, internalNotes: (prev.internalNotes || "") + ts }))} />
                    </div>
                    <Textarea id="edit-notes" value={editForm.internalNotes}
                      onChange={(e) => setEditForm({ ...editForm, internalNotes: e.target.value })}
                      rows={3} className="mt-1 resize-none" />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <Label htmlFor="edit-qc">QC Notes</Label>
                      <TimestampButton onInsert={(ts) => setEditForm(prev => ({ ...prev, qcNotes: (prev.qcNotes || "") + ts }))} />
                    </div>
                    <Textarea id="edit-qc" value={editForm.qcNotes}
                      onChange={(e) => setEditForm({ ...editForm, qcNotes: e.target.value })}
                      rows={3} className="mt-1 resize-none" />
                  </div>
                </div>
              </div>
              {/* Attachments */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Attachments</p>
              {/* Existing Attachments */}
              {editingLot.attachments.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Current Attachments</p>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                    {editingLot.attachments.map((att) => {
                      const isImage = att.mimeType?.startsWith("image/")
                      return (
                        <div key={att.id} className="group relative rounded-lg border overflow-hidden hover:border-blue-400 transition-colors">
                          <button
                            type="button"
                            className="absolute top-1.5 right-1.5 z-10 h-6 w-6 rounded-full bg-red-500/90 text-white flex items-center justify-center shadow-md hover:bg-red-600 transition-all"
                            onClick={async () => {
                              await handleDeleteAttachment(editingLot.id, att.id)
                              setEditingLot({ ...editingLot, attachments: editingLot.attachments.filter(a => a.id !== att.id) })
                            }}
                            title="Delete attachment"
                          >
                            <X className="h-3 w-3" />
                          </button>
                          {isImage ? (
                            <div className="aspect-square bg-gray-50 overflow-hidden cursor-pointer" onClick={() => setPreviewImage({ url: att.fileUrl, name: att.label || att.fileName })}>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={att.fileUrl} alt={att.label || att.fileName} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                            </div>
                          ) : (
                            <a href={att.fileUrl} target="_blank" rel="noopener noreferrer" className="aspect-square bg-gray-50 flex items-center justify-center">
                              <FileText className="h-8 w-8 text-blue-400" />
                            </a>
                          )}
                          <div className="px-2 py-1">
                            <p className="text-[10px] font-medium truncate">{att.label || att.fileName}</p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              <p className="text-xs text-muted-foreground mb-3">
                  Upload additional photos of the pallet, invoices, COAs, etc.
                </p>

                <input
                  ref={editFileInputRef}
                  type="file"
                  multiple
                  accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                  onChange={handleEditAddFile}
                  className="hidden"
                />
                <div className="flex gap-2 mb-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.accept = 'image/*';
                      input.setAttribute('capture', 'environment');
                      input.onchange = (e) => {
                        const newFiles = Array.from((e.target as HTMLInputElement).files || []);
                        if (newFiles.length > 0) {
                          setEditFiles((prev) => [
                            ...prev,
                            ...newFiles.map((f) => ({ file: f, label: "Other" })),
                          ]);
                        }
                      };
                      input.click();
                    }}
                    className="gap-2"
                  >
                    <Camera className="h-4 w-4" />
                    Take Photo
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => editFileInputRef.current?.click()}
                    className="gap-2"
                  >
                    <Upload className="h-4 w-4" />
                    Select Files
                  </Button>
                </div>

                {editFiles.length > 0 && (
                  <div className="space-y-2">
                    {editFiles.map((f, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30"
                      >
                        {f.file.type.startsWith("image/") ? (
                          <ImageIcon className="h-4 w-4 text-blue-500 flex-shrink-0" />
                        ) : (
                          <FileText className="h-4 w-4 text-blue-500 flex-shrink-0" />
                        )}
                        <span className="text-sm truncate flex-1">{f.file.name}</span>
                        <Select
                          value={f.label}
                          onValueChange={(v) =>
                            setEditFiles((prev) =>
                              prev.map((x, xi) => (xi === i ? { ...x, label: v } : x))
                            )
                          }
                        >
                          <SelectTrigger className="w-36 h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ATTACHMENT_LABELS.map((l) => (
                              <SelectItem key={l} value={l} className="text-xs">{l}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <button
                          type="button"
                          className="text-muted-foreground hover:text-red-500 text-xs transition-colors"
                          onClick={() => setEditFiles((prev) => prev.filter((_, xi) => xi !== i))}
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditingLot(null)}>Cancel</Button>
                <Button type="submit" disabled={editSaving}>
                  {editSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : "Save Changes"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Add Batch Lot Modal ── */}
      <Dialog open={showAddLot} onOpenChange={(open) => {
        setShowAddLot(open)
        if (!open) {
          setIsMixedPallet(false)
          setLotError("")
          setFiles([])
        }
      }}>
        <DialogContent 
          className="max-w-4xl max-h-[95vh] flex flex-col p-0 overflow-hidden"
          onInteractOutside={(e) => e.preventDefault()}
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <div className="p-6 pb-0 bg-white border-b">
            <DialogHeader className="mb-4">
              <DialogTitle className="flex items-center gap-2 text-xl">
                <PlusCircle className="h-6 w-6 text-blue-600" />
                Add New Delivery / Batch
                <span className="font-normal text-muted-foreground ml-2">— {supplier.name}</span>
              </DialogTitle>
              <DialogDescription>
                Select if this is a single product batch or a mixed delivery with multiple products.
              </DialogDescription>
            </DialogHeader>

            <Tabs defaultValue="single" className="w-full" onValueChange={(v) => setIsMixedPallet(v === "mixed")}>
              <TabsList className="grid w-full grid-cols-2 mb-4 bg-muted/50 p-1 h-11">
                <TabsTrigger value="single" className="gap-2 text-sm font-semibold h-9 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                  <Package className="h-4 w-4" /> Single Product
                </TabsTrigger>
                <TabsTrigger value="mixed" className="gap-2 text-sm font-semibold h-9 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                  <Layers className="h-4 w-4" /> Mixed Pallet / Delivery
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
            <form id="add-batch-form" onSubmit={isMixedPallet ? handleSubmitMasterBatch : handleSubmitLot} className="space-y-8">
              {lotError && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" /> {lotError}
                </div>
              )}

              {/* Shared Header Section */}
              <div className="bg-blue-50/50 p-5 rounded-2xl border border-blue-100/50 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-blue-600 flex items-center gap-2">
                    <Truck className="h-4 w-4" /> Delivery Information {isMixedPallet && "(Shared for all products)"}
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-5">
                  <div className="space-y-1.5">
                    <Label htmlFor="master-received" className="text-xs font-semibold">Received Date</Label>
                    <Input
                      id="master-received"
                      type="datetime-local"
                      value={lotForm.receivedAt}
                      onChange={(e) => setLotForm({ ...lotForm, receivedAt: e.target.value })}
                      className="bg-white"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="master-name" className="text-xs font-semibold">Master Shipment Name</Label>
                    <Input
                      id="master-name"
                      value={lotForm.lotNumber}
                      onChange={(e) => setLotForm({ ...lotForm, lotNumber: e.target.value })}
                      placeholder="e.g. Mixed Pallet #1"
                      className="bg-white"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="master-invoice" className="text-xs font-semibold">Invoice / Delivery #</Label>
                    <Input
                      id="master-invoice"
                      value={lotForm.invoiceNumber}
                      onChange={(e) => setLotForm({ ...lotForm, invoiceNumber: e.target.value })}
                      placeholder="INV-..."
                      className="bg-white"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="master-po" className="text-xs font-semibold">PO Number</Label>
                    <Input
                      id="master-po"
                      value={lotForm.poNumber}
                      onChange={(e) => setLotForm({ ...lotForm, poNumber: e.target.value })}
                      placeholder="PO-..."
                      className="bg-white"
                    />
                  </div>
                </div>
              </div>

              {!isMixedPallet ? (
                /* SINGLE PRODUCT MODE */
                <div className="space-y-6 animate-in fade-in slide-in-from-top-1 duration-200">
                  <div className="grid grid-cols-2 gap-5">
                    <div className="col-span-2 sm:col-span-1 space-y-1.5">
                      <Label className="text-xs font-semibold">Lot Number <span className="text-red-500">*</span></Label>
                      <Input
                        required
                        value={lotForm.lotNumber}
                        onChange={(e) => setLotForm({ ...lotForm, lotNumber: e.target.value })}
                        placeholder="e.g. LOT-2024-001"
                        className="font-mono text-sm"
                      />
                    </div>
                    <div className="col-span-2 sm:col-span-1 space-y-1.5">
                      <Label className="text-xs font-semibold">Product Name <span className="text-red-500">*</span></Label>
                      <Input
                        required
                        value={lotForm.productName}
                        onChange={(e) => setLotForm({ ...lotForm, productName: e.target.value })}
                        placeholder="e.g. Organic Granola Mix"
                        className="text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">SKU / Part #</Label>
                      <Input
                        value={lotForm.productSku}
                        onChange={(e) => setLotForm({ ...lotForm, productSku: e.target.value })}
                        placeholder="SKU-..."
                        className="text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Category</Label>
                      <Input
                        value={lotForm.category}
                        onChange={(e) => setLotForm({ ...lotForm, category: e.target.value })}
                        placeholder="Food, cosmetic, etc."
                        className="text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Quantity</Label>
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          value={lotForm.quantityReceived}
                          onChange={(e) => setLotForm({ ...lotForm, quantityReceived: e.target.value })}
                          className="w-28 text-sm"
                        />
                        <Select value={lotForm.quantityUnit} onValueChange={(v) => setLotForm({ ...lotForm, quantityUnit: v })}>
                          <SelectTrigger className="flex-1 text-sm bg-muted/20">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="units">units</SelectItem>
                            <SelectItem value="lbs">lbs</SelectItem>
                            <SelectItem value="kg">kg</SelectItem>
                            <SelectItem value="boxes">boxes</SelectItem>
                            <SelectItem value="pallets">pallets</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Expiration Date</Label>
                      <Input
                        type="date"
                        value={lotForm.expiresAt}
                        onChange={(e) => setLotForm({ ...lotForm, expiresAt: e.target.value })}
                        className="text-sm"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                /* MIXED PALLET MODE */
                <div className="space-y-5 animate-in fade-in slide-in-from-top-1 duration-200">
                  <div className="flex items-center justify-between pb-1">
                    <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                      <PackageSearch className="h-3.5 w-3.5" /> Products in this Mixed Delivery
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 text-[11px] font-bold uppercase gap-1.5 border-blue-200 text-blue-600 hover:bg-blue-50"
                      onClick={() => setMixedItems([...mixedItems, { id: Math.random().toString(), productName: '', lotNumber: '', expiresAt: '', category: '', quantityReceived: '', quantityUnit: 'units', files: [] }])}
                    >
                      <Plus className="h-3.5 w-3.5" /> Add Another Product
                    </Button>
                  </div>

                  <div className="space-y-4">
                    {mixedItems.map((item, idx) => (
                      <div key={item.id} className="relative p-5 border rounded-2xl bg-white shadow-sm ring-1 ring-black/[0.03] group/item">
                        <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-1.5 h-10 bg-blue-500 rounded-full" />
                        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                          <div className="md:col-span-2 space-y-1">
                            <Label className="text-[10px] font-bold text-muted-foreground">PRODUCT NAME <span className="text-red-500">*</span></Label>
                            <Input
                              value={item.productName}
                              onChange={(e) => {
                                const newItems = [...mixedItems]
                                newItems[idx].productName = e.target.value
                                setMixedItems(newItems)
                              }}
                              placeholder="Name"
                              className="h-9 text-sm border-muted-foreground/20"
                              required
                            />
                          </div>
                          <div>
                            <Label className="text-[10px] font-bold text-muted-foreground">LOT NUMBER</Label>
                            <Input
                              value={item.lotNumber}
                              onChange={(e) => {
                                const newItems = [...mixedItems]
                                newItems[idx].lotNumber = e.target.value
                                setMixedItems(newItems)
                              }}
                              placeholder="Lot #"
                              className="h-9 text-sm font-mono border-muted-foreground/20"
                            />
                          </div>
                          <div>
                            <Label className="text-[10px] font-bold text-muted-foreground">EXPIRATION DATE</Label>
                            <Input
                              type="date"
                              value={item.expiresAt}
                              onChange={(e) => {
                                const newItems = [...mixedItems]
                                newItems[idx].expiresAt = e.target.value
                                setMixedItems(newItems)
                              }}
                              className="h-9 text-sm border-muted-foreground/20"
                            />
                          </div>
                          <div className="md:col-span-1 border-l pl-4 flex flex-col justify-center gap-2">
                            <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Product Photo</Label>
                            <div className="flex items-center gap-1.5">
                              <Button
                                type="button"
                                variant="outline"
                                className="h-8 w-8 p-0 rounded-lg flex-shrink-0 bg-blue-50/50 hover:bg-blue-100 border-blue-100 text-blue-600"
                                title="Open Camera"
                                onClick={() => {
                                  const input = document.createElement('input');
                                  input.type = 'file';
                                  input.accept = 'image/*';
                                  input.setAttribute('capture', 'environment');
                                  input.onchange = (e) => {
                                    const files = Array.from((e.target as HTMLInputElement).files || []);
                                    if (files.length > 0) {
                                      const newItems = [...mixedItems];
                                      newItems[idx].files = [...newItems[idx].files, ...files];
                                      setMixedItems(newItems);
                                    }
                                  };
                                  input.click();
                                }}
                              >
                                <Camera className="h-4 w-4" />
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                className="h-8 w-8 p-0 rounded-lg flex-shrink-0 bg-muted/20"
                                title="Upload File"
                                onClick={() => {
                                  const input = document.createElement('input');
                                  input.type = 'file';
                                  input.accept = 'image/*';
                                  input.multiple = true;
                                  input.onchange = (e) => {
                                    const files = Array.from((e.target as HTMLInputElement).files || []);
                                    if (files.length > 0) {
                                      const newItems = [...mixedItems];
                                      newItems[idx].files = [...newItems[idx].files, ...files];
                                      setMixedItems(newItems);
                                    }
                                  };
                                  input.click();
                                }}
                              >
                                <Upload className="h-3.5 w-3.5" />
                              </Button>
                              <div className="flex -space-x-2 overflow-hidden ml-1">
                                {item.files.map((file, fIdx) => (
                                  <div key={fIdx} className="h-7 w-7 rounded-sm border bg-white flex items-center justify-center relative group shadow-sm">
                                    <ImageIcon className="h-3 w-3 text-blue-400" />
                                    <button 
                                      type="button"
                                      className="absolute inset-0 bg-red-500/80 text-white flex items-center justify-center transition-opacity"
                                      onClick={() => {
                                        const newItems = [...mixedItems];
                                        newItems[idx].files = newItems[idx].files.filter((_, i) => i !== fIdx);
                                        setMixedItems(newItems);
                                      }}
                                    >
                                      <X className="h-2.5 w-2.5" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                          <div className="md:col-span-2 space-y-1">
                            <Label className="text-[10px] font-bold text-muted-foreground">QUANTITY</Label>
                            <div className="flex gap-2">
                              <Input
                                type="number"
                                value={item.quantityReceived}
                                onChange={(e) => {
                                  const newItems = [...mixedItems]
                                  newItems[idx].quantityReceived = e.target.value
                                  setMixedItems(newItems)
                                }}
                                className="h-9 text-sm w-20 border-muted-foreground/20"
                              />
                              <Select 
                                value={item.quantityUnit} 
                                onValueChange={(v) => {
                                  const newItems = [...mixedItems]
                                  newItems[idx].quantityUnit = v
                                  setMixedItems(newItems)
                                }}
                              >
                                <SelectTrigger className="h-9 text-xs flex-1 bg-muted/10">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="units">units</SelectItem>
                                  <SelectItem value="lbs">lbs</SelectItem>
                                  <SelectItem value="kg">kg</SelectItem>
                                  <SelectItem value="boxes">boxes</SelectItem>
                                  <SelectItem value="pallets">pallets</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </div>
                        {mixedItems.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setMixedItems(mixedItems.filter((_, i) => i !== idx))}
                            className="absolute -top-3 -right-3 h-7 w-7 rounded-full bg-white text-red-500 flex items-center justify-center border border-red-100 opacity-0 group-hover/item:opacity-100 transition-all hover:bg-red-50 shadow-md"
                            title="Remove product"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setMixedItems([...mixedItems, { id: Math.random().toString(), productName: '', lotNumber: '', expiresAt: '', category: '', quantityReceived: '', quantityUnit: 'units', files: [] }])}
                      className="w-full py-8 border-2 border-dashed border-muted hover:border-blue-400 hover:bg-blue-50/30 text-muted-foreground rounded-2xl transition-all h-auto gap-2"
                    >
                      <Plus className="h-5 w-5" />
                      Add another product to this delivery
                    </Button>
                  </div>
                </div>
              )}

              {/* Shared Notes & Documents Area */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 pt-6 border-t border-muted">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                      <FileText className="h-3.5 w-3.5" /> Internal Notes / QC Findings
                    </Label>
                    <TimestampButton onInsert={(ts) => setLotForm({ ...lotForm, internalNotes: (lotForm.internalNotes || '') + ts })} />
                  </div>
                  <Textarea
                    value={lotForm.internalNotes}
                    onChange={(e) => setLotForm({ ...lotForm, internalNotes: e.target.value })}
                    placeholder="Enter any specific findings, damages, or notes relevant to this delivery..."
                    className="min-h-[120px] text-sm resize-none rounded-xl"
                  />
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                      <Paperclip className="h-3.5 w-3.5" /> Shared Delivery Files
                    </Label>
                    <div className="flex gap-1.5">
                      <Button 
                        type="button" 
                        onClick={() => {
                          const input = document.createElement('input');
                          input.type = 'file';
                          input.accept = 'image/*';
                          input.setAttribute('capture', 'environment');
                          input.onchange = (e) => {
                            const newFiles = Array.from((e.target as HTMLInputElement).files ?? []);
                            setFiles((prev) => [
                              ...prev,
                              ...newFiles.map((f) => ({ file: f, label: "Other" })),
                            ]);
                          };
                          input.click();
                        }}
                        variant="ghost" 
                        className="h-8 w-8 p-0 text-blue-600 font-bold hover:bg-blue-50"
                        title="Take Photo"
                      >
                        <Camera className="h-4 w-4" />
                      </Button>
                      <Button 
                        type="button" 
                        onClick={() => fileInputRef.current?.click()} 
                        variant="ghost" 
                        className="h-8 text-xs text-blue-600 font-bold hover:bg-blue-50"
                      >
                        <Plus className="h-3.5 w-3.5 mr-1" /> Add Files
                      </Button>
                    </div>
                  </div>
                  <Input type="file" ref={fileInputRef} multiple className="hidden" onChange={handleAddFile} />

                  <div className="bg-muted/30 rounded-2xl p-4 border border-dashed min-h-[120px] flex flex-col justify-center">
                    {files.length > 0 ? (
                      <div className="space-y-2">
                        {files.map((f, i) => (
                          <div key={i} className="flex items-center gap-3 p-2 bg-white rounded-lg border shadow-sm group/file">
                            <div className="h-8 w-8 bg-blue-50 text-blue-600 rounded flex items-center justify-center">
                              {f.file.type.startsWith("image/") ? <ImageIcon className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[11px] font-medium truncate">{f.file.name}</p>
                              <Select
                                value={f.label}
                                onValueChange={(v) =>
                                  setFiles((prev) =>
                                    prev.map((x, xi) => (xi === i ? { ...x, label: v } : x))
                                  )
                                }
                              >
                                <SelectTrigger className="h-6 py-0 px-2 text-[9px] w-32 border-none font-bold bg-muted/20">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {ATTACHMENT_LABELS.map((l) => (
                                    <SelectItem key={l} value={l} className="text-[10px]">{l}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-red-400 opacity-0 group-hover/file:opacity-100"
                              onClick={() => setFiles(files.filter((_, xi) => xi !== i))}
                            >
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-4">
                        <UploadCloud className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-30" />
                        <p className="text-[10px] text-muted-foreground italic">No shared documents for this delivery.<br/>Upload invoices or pallet photos here.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </form>
          </div>

          <DialogFooter className="p-6 bg-white border-t flex items-center justify-between shadow-[0_-5px_20px_-10px_rgba(0,0,0,0.1)]">
            <Button type="button" variant="ghost" onClick={() => setShowAddLot(false)} className="text-muted-foreground font-semibold">
              Discard Changes
            </Button>
            <Button 
              type="submit" 
              form="add-batch-form"
              disabled={saving}
              className="px-8 shadow-lg shadow-blue-500/20 bg-blue-600 hover:bg-blue-700 h-10 font-bold"
            >
              {saving ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</>
              ) : (
                isMixedPallet ? "Create Mixed Delivery" : "Save Single Batch"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


      {/* ── Image Preview Modal ── */}
      <Dialog open={!!previewImage} onOpenChange={(o) => !o && setPreviewImage(null)}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden bg-transparent border-none shadow-none flex items-center justify-center h-[90vh]">
          {previewImage && (
            <div className="relative w-full h-full flex items-center justify-center">
              <button 
                onClick={() => setPreviewImage(null)}
                className="absolute top-4 right-4 z-50 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
                title="Close"
              >
                <X className="h-6 w-6" />
              </button>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                src={previewImage.url} 
                alt={previewImage.name} 
                className="max-w-full max-h-full object-contain shadow-2xl rounded-lg"
              />
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 text-white px-4 py-2 rounded-full text-sm font-medium backdrop-blur-sm">
                {previewImage.name}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

    </div>
  )
}
