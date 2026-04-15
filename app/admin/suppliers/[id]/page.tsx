"use client"

import { useState, useEffect, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
  batchLots: BatchLot[]
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
}: {
  lot: BatchLot
  onStatusChange: (id: string, status: BatchLotStatus) => Promise<void>
}) {
  const [expanded, setExpanded] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)
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
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-sm font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                {lot.lotNumber}
              </span>
              <StatusBadge status={lot.status} />
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
            <h3 className="font-semibold text-base mt-1.5">{lot.productName}</h3>
            <div className="flex items-center gap-3 mt-1 flex-wrap">
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
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {/* Key dates row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm mb-3">
          <div>
            <p className="text-xs text-muted-foreground mb-0.5 flex items-center gap-1">
              <Truck className="h-3 w-3" /> Received
            </p>
            <p className="font-medium text-sm">{formatDate(lot.receivedAt)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-0.5 flex items-center gap-1">
              <Calendar className="h-3 w-3" /> Manufactured
            </p>
            <p className="font-medium text-sm">{formatDate(lot.manufacturedAt)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-0.5 flex items-center gap-1">
              <Calendar className="h-3 w-3" /> Expires
            </p>
            <p
              className={`font-medium text-sm ${
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
            <p className="text-xs text-muted-foreground mb-0.5 flex items-center gap-1">
              <Clock className="h-3 w-3" /> Logged At
            </p>
            <p className="font-medium text-sm">{formatDateTime(lot.createdAt)}</p>
          </div>
        </div>

        {/* Invoice / PO */}
        {(lot.invoiceNumber || lot.poNumber) && (
          <div className="flex gap-4 text-sm mb-3">
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
                Unit Cost: <span className="font-medium text-foreground">${lot.unitCost.toFixed(2)}</span>
              </span>
            )}
            {lot.totalCost != null && (
              <span className="text-muted-foreground">
                Total: <span className="font-medium text-foreground">${lot.totalCost.toFixed(2)}</span>
              </span>
            )}
          </div>
        )}

        {/* Attachments count */}
        {lot.attachments.length > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-3">
            <Paperclip className="h-3.5 w-3.5" />
            {lot.attachments.length} attachment{lot.attachments.length !== 1 ? "s" : ""}
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
            {/* Notes */}
            {lot.internalNotes && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                  Internal Notes
                </p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{lot.internalNotes}</p>
              </div>
            )}
            {lot.qcNotes && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                  QC Notes
                </p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{lot.qcNotes}</p>
              </div>
            )}

            {/* Attachments gallery */}
            {lot.attachments.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Attachments
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {lot.attachments.map((att) => {
                    const isImage = att.mimeType?.startsWith("image/")
                    return (
                      <a
                        key={att.id}
                        href={att.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group block rounded-lg border overflow-hidden hover:border-blue-400 transition-colors"
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
                          <div className="aspect-square bg-gray-50 flex flex-col items-center justify-center gap-2">
                            <FileText className="h-8 w-8 text-blue-400" />
                          </div>
                        )}
                        <div className="px-2 py-1.5">
                          <p className="text-xs font-medium truncate">{att.label || att.fileName}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(att.uploadedAt)}
                          </p>
                        </div>
                      </a>
                    )
                  })}
                </div>
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
  }, [id])

  const handleStatusChange = async (lotId: string, status: BatchLotStatus) => {
    const res = await fetch(`/api/suppliers/${id}/lots/${lotId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    })
    if (res.ok) await fetchSupplier()
  }

  const handleAddFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFiles = Array.from(e.target.files ?? [])
    setFiles((prev) => [
      ...prev,
      ...newFiles.map((f) => ({ file: f, label: "Other" })),
    ])
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const handleSubmitLot = async (e: React.FormEvent) => {
    e.preventDefault()
    setLotError("")
    setSaving(true)
    try {
      const fd = new FormData()
      Object.entries(lotForm).forEach(([k, v]) => {
        if (v !== "" && v !== null && v !== undefined) fd.append(k, String(v))
      })
      files.forEach(({ file, label }) => {
        fd.append("files", file)
        fd.append("labels", label)
      })

      const res = await fetch(`/api/suppliers/${id}/lots`, {
        method: "POST",
        body: fd,
      })
      const data = await res.json()
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
    .sort((a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime())

  // Group by month
  const grouped = filtered.reduce<Record<string, BatchLot[]>>((acc, lot) => {
    const monthKey = new Date(lot.receivedAt).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
    })
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
      <Card className="mb-8">
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
          {supplier.notes && (
            <p className="mt-3 text-sm text-muted-foreground border-t pt-3">{supplier.notes}</p>
          )}
        </CardContent>
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
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Add Batch Lot Modal ── */}
      <Dialog open={showAddLot} onOpenChange={setShowAddLot}>
        <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Hash className="h-5 w-5 text-blue-600" />
              Add Batch / Lot
              <span className="font-normal text-muted-foreground">— {supplier.name}</span>
            </DialogTitle>
            <DialogDescription>
              Enter the lot number, product details, dates, and optionally upload photos or documents.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitLot} className="space-y-6 mt-2">
            {lotError && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-md px-4 py-3">
                {lotError}
              </div>
            )}

            {/* Section: Identification */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                Identification
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 sm:col-span-1">
                  <Label htmlFor="lot-number">
                    Lot Number <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="lot-number"
                    required
                    value={lotForm.lotNumber}
                    onChange={(e) => setLotForm({ ...lotForm, lotNumber: e.target.value })}
                    placeholder="e.g. LOT-2024-001A"
                    className="mt-1 font-mono"
                  />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <Label htmlFor="lot-status">Initial Status</Label>
                  <Select
                    value={lotForm.status}
                    onValueChange={(v) => setLotForm({ ...lotForm, status: v as BatchLotStatus })}
                  >
                    <SelectTrigger id="lot-status" className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                        <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2">
                  <Label htmlFor="lot-product">
                    Product Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="lot-product"
                    required
                    value={lotForm.productName}
                    onChange={(e) => setLotForm({ ...lotForm, productName: e.target.value })}
                    placeholder="e.g. Organic Granola Mix"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="lot-sku">SKU / Part #</Label>
                  <Input
                    id="lot-sku"
                    value={lotForm.productSku}
                    onChange={(e) => setLotForm({ ...lotForm, productSku: e.target.value })}
                    placeholder="SKU-12345"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="lot-category">Category</Label>
                  <Input
                    id="lot-category"
                    value={lotForm.category}
                    onChange={(e) => setLotForm({ ...lotForm, category: e.target.value })}
                    placeholder="e.g. Food, Supplement, Cosmetic"
                    className="mt-1"
                  />
                </div>
              </div>
            </div>

            {/* Section: Quantity */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                Quantity
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="lot-qty">Quantity Received</Label>
                  <Input
                    id="lot-qty"
                    type="number"
                    min="1"
                    value={lotForm.quantityReceived}
                    onChange={(e) => setLotForm({ ...lotForm, quantityReceived: e.target.value })}
                    placeholder="e.g. 5000"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="lot-unit">Unit</Label>
                  <Select
                    value={lotForm.quantityUnit}
                    onValueChange={(v) => setLotForm({ ...lotForm, quantityUnit: v })}
                  >
                    <SelectTrigger id="lot-unit" className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {["units", "boxes", "pallets", "lbs", "kg", "oz", "liters", "cases"].map((u) => (
                        <SelectItem key={u} value={u}>{u}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Section: Dates */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                Dates &amp; Timestamps
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="lot-received">Received At</Label>
                  <Input
                    id="lot-received"
                    type="datetime-local"
                    value={lotForm.receivedAt}
                    onChange={(e) => setLotForm({ ...lotForm, receivedAt: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="lot-manufactured">Manufactured Date</Label>
                  <Input
                    id="lot-manufactured"
                    type="date"
                    value={lotForm.manufacturedAt}
                    onChange={(e) => setLotForm({ ...lotForm, manufacturedAt: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="lot-expires">Expiration Date</Label>
                  <Input
                    id="lot-expires"
                    type="date"
                    value={lotForm.expiresAt}
                    onChange={(e) => setLotForm({ ...lotForm, expiresAt: e.target.value })}
                    className="mt-1"
                  />
                </div>
              </div>
            </div>

            {/* Section: Financial */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                Invoice &amp; Financials
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="lot-invoice">Invoice #</Label>
                  <Input
                    id="lot-invoice"
                    value={lotForm.invoiceNumber}
                    onChange={(e) => setLotForm({ ...lotForm, invoiceNumber: e.target.value })}
                    placeholder="INV-2024-001"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="lot-po">PO Number</Label>
                  <Input
                    id="lot-po"
                    value={lotForm.poNumber}
                    onChange={(e) => setLotForm({ ...lotForm, poNumber: e.target.value })}
                    placeholder="PO-2024-001"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="lot-unit-cost">Unit Cost ($)</Label>
                  <Input
                    id="lot-unit-cost"
                    type="number"
                    step="0.01"
                    value={lotForm.unitCost}
                    onChange={(e) => setLotForm({ ...lotForm, unitCost: e.target.value })}
                    placeholder="0.00"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="lot-total-cost">Total Cost ($)</Label>
                  <Input
                    id="lot-total-cost"
                    type="number"
                    step="0.01"
                    value={lotForm.totalCost}
                    onChange={(e) => setLotForm({ ...lotForm, totalCost: e.target.value })}
                    placeholder="0.00"
                    className="mt-1"
                  />
                </div>
              </div>
            </div>

            {/* Section: Notes */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                Notes
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="lot-notes">Internal Notes</Label>
                  <Textarea
                    id="lot-notes"
                    value={lotForm.internalNotes}
                    onChange={(e) => setLotForm({ ...lotForm, internalNotes: e.target.value })}
                    placeholder="Any internal information about this batch..."
                    rows={3}
                    className="mt-1 resize-none"
                  />
                </div>
                <div>
                  <Label htmlFor="lot-qc">QC Notes</Label>
                  <Textarea
                    id="lot-qc"
                    value={lotForm.qcNotes}
                    onChange={(e) => setLotForm({ ...lotForm, qcNotes: e.target.value })}
                    placeholder="Quality control observations..."
                    rows={3}
                    className="mt-1 resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Section: Attachments */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                Attachments
              </p>
              <p className="text-xs text-muted-foreground mb-3">
                Upload photos of the pallet, invoices, Certificates of Analysis (COA), labels, etc.
              </p>

              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                onChange={handleAddFile}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="gap-2 mb-4"
              >
                <Upload className="h-4 w-4" />
                Select Files
              </Button>

              {files.length > 0 && (
                <div className="space-y-2">
                  {files.map((f, i) => (
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
                          setFiles((prev) =>
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
                        onClick={() => setFiles((prev) => prev.filter((_, xi) => xi !== i))}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowAddLot(false)
                  setFiles([])
                  setLotError("")
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Batch Lot"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
