"use client"

import { useState, useEffect, useMemo } from "react"
import { useSearchParams, useRouter } from "next/navigation"
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Plus,
  Building2,
  Phone,
  Mail,
  MapPin,
  Package,
  ChevronRight,
  Search,
  Loader2,
  X,
  Pencil,
  Trash2,
  Star,
  Truck,
  Hash,
} from "lucide-react"
import Link from "next/link"

type BatchLotStatus =
  | "INCOMING" | "RECEIVED" | "IN_QC" | "APPROVED"
  | "ON_HOLD" | "RECALLED" | "DISPOSED"

type LotPreview = {
  id: string; lotNumber: string; productName: string; productSku: string | null
  category: string | null; invoiceNumber: string | null; poNumber: string | null
  status: BatchLotStatus; receivedAt: string
}

type Supplier = {
  id: string; name: string; contactName: string | null; email: string | null
  phone: string | null; address: string | null; city: string | null
  state: string | null; country: string | null; website: string | null
  notes: string | null; isActive: boolean; category: string
  createdAt: string; _count: { batchLots: number }; batchLots: LotPreview[]
}

const STATUS_COLORS: Record<BatchLotStatus, string> = {
  INCOMING: "bg-blue-100 text-blue-700", RECEIVED: "bg-teal-100 text-teal-700",
  IN_QC: "bg-yellow-100 text-yellow-700", APPROVED: "bg-green-100 text-green-700",
  ON_HOLD: "bg-orange-100 text-orange-700", RECALLED: "bg-red-100 text-red-700",
  DISPOSED: "bg-gray-100 text-gray-600",
}

const STATUS_LABELS: Record<BatchLotStatus, string> = {
  INCOMING: "Incoming", RECEIVED: "Received", IN_QC: "In QC",
  APPROVED: "Approved", ON_HOLD: "On Hold", RECALLED: "Recalled", DISPOSED: "Disposed",
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
}

const EMPTY_FORM = {
  name: "", contactName: "", email: "", phone: "",
  address: "", city: "", state: "", country: "", website: "", notes: "",
}
type SupplierForm = typeof EMPTY_FORM

function SupplierFormFields({ form, onChange, prefix }: {
  form: SupplierForm; onChange: (f: SupplierForm) => void; prefix: string
}) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="col-span-2">
        <Label htmlFor={`${prefix}-name`}>Company / Client Name <span className="text-red-500">*</span></Label>
        <Input id={`${prefix}-name`} required value={form.name}
          onChange={(e) => onChange({ ...form, name: e.target.value })}
          placeholder="e.g. Acme Packaging Co." className="mt-1" />
      </div>
      <div>
        <Label htmlFor={`${prefix}-contact`}>Contact Person</Label>
        <Input id={`${prefix}-contact`} value={form.contactName}
          onChange={(e) => onChange({ ...form, contactName: e.target.value })}
          placeholder="John Smith" className="mt-1" />
      </div>
      <div>
        <Label htmlFor={`${prefix}-email`}>Email</Label>
        <Input id={`${prefix}-email`} type="email" value={form.email}
          onChange={(e) => onChange({ ...form, email: e.target.value })}
          placeholder="contact@company.com" className="mt-1" />
      </div>
      <div>
        <Label htmlFor={`${prefix}-phone`}>Phone</Label>
        <Input id={`${prefix}-phone`} value={form.phone}
          onChange={(e) => onChange({ ...form, phone: e.target.value })}
          placeholder="+1 (555) 000-0000" className="mt-1" />
      </div>
      <div>
        <Label htmlFor={`${prefix}-website`}>Website</Label>
        <Input id={`${prefix}-website`} value={form.website}
          onChange={(e) => onChange({ ...form, website: e.target.value })}
          placeholder="https://company.com" className="mt-1" />
      </div>
      <div>
        <Label htmlFor={`${prefix}-address`}>Street Address</Label>
        <Input id={`${prefix}-address`} value={form.address}
          onChange={(e) => onChange({ ...form, address: e.target.value })}
          placeholder="123 Main St" className="mt-1" />
      </div>
      <div>
        <Label htmlFor={`${prefix}-city`}>City</Label>
        <Input id={`${prefix}-city`} value={form.city}
          onChange={(e) => onChange({ ...form, city: e.target.value })}
          placeholder="Miami" className="mt-1" />
      </div>
      <div>
        <Label htmlFor={`${prefix}-state`}>State / Province</Label>
        <Input id={`${prefix}-state`} value={form.state}
          onChange={(e) => onChange({ ...form, state: e.target.value })}
          placeholder="FL" className="mt-1" />
      </div>
      <div>
        <Label htmlFor={`${prefix}-country`}>Country</Label>
        <Input id={`${prefix}-country`} value={form.country}
          onChange={(e) => onChange({ ...form, country: e.target.value })}
          placeholder="USA" className="mt-1" />
      </div>
      <div className="col-span-2">
        <Label htmlFor={`${prefix}-notes`}>Notes</Label>
        <Textarea id={`${prefix}-notes`} value={form.notes}
          onChange={(e) => onChange({ ...form, notes: e.target.value })}
          placeholder="Any additional information..."
          rows={2} className="mt-1 resize-none" />
      </div>
    </div>
  )
}

function SupplierCard({
  supplier,
  onEdit,
  onDelete,
}: {
  supplier: Supplier
  onEdit: (s: Supplier, e: React.MouseEvent) => void
  onDelete: (s: Supplier, e: React.MouseEvent) => void
}) {
  const isPrivateLabel = supplier.category === "PRIVATE_LABEL"
  return (
    <div className="relative group">
      <Link href={`/admin/suppliers/${supplier.id}`}>
        <Card className="hover:shadow-md hover:border-blue-200 transition-all cursor-pointer">
          <CardHeader className="pb-2 pt-3 px-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div className={`h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0 ${isPrivateLabel ? "bg-purple-50" : "bg-blue-50"}`}>
                  {isPrivateLabel
                    ? <Star className="h-4 w-4 text-purple-600" />
                    : <Truck className="h-4 w-4 text-blue-600" />}
                </div>
                <div>
                  <CardTitle className="text-sm">{supplier.name}</CardTitle>
                  {supplier.contactName && (
                    <p className="text-xs text-muted-foreground mt-0.5">{supplier.contactName}</p>
                  )}
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-blue-600 transition-colors mt-0.5 flex-shrink-0" />
            </div>
          </CardHeader>
          <CardContent className="pt-0 pb-3 px-4 space-y-1.5">
            {supplier.email && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Mail className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">{supplier.email}</span>
              </div>
            )}
            {supplier.phone && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Phone className="h-3 w-3 flex-shrink-0" />
                {supplier.phone}
              </div>
            )}
            {(supplier.city || supplier.country) && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3 flex-shrink-0" />
                {[supplier.city, supplier.state, supplier.country].filter(Boolean).join(", ")}
              </div>
            )}
            <div className="pt-2 border-t flex items-center justify-between">
              <div className="flex items-center gap-1 text-xs font-medium">
                <Package className="h-3.5 w-3.5 text-purple-600" />
                <span className="text-purple-600">{supplier._count.batchLots}</span>
                <span className="text-muted-foreground">batch lots</span>
              </div>
              <Badge variant={supplier.isActive ? "default" : "secondary"} className="text-xs h-5">
                {supplier.isActive ? "Active" : "Inactive"}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </Link>
      {/* Hover action buttons */}
      <div className="absolute top-2.5 right-7 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <button onClick={(e) => onEdit(supplier, e)} title="Edit"
          className="h-6 w-6 flex items-center justify-center rounded-md bg-white border shadow-sm text-muted-foreground hover:text-blue-600 hover:border-blue-300 transition-colors">
          <Pencil className="h-3 w-3" />
        </button>
        <button onClick={(e) => onDelete(supplier, e)} title="Delete"
          className="h-6 w-6 flex items-center justify-center rounded-md bg-white border shadow-sm text-muted-foreground hover:text-red-600 hover:border-red-200 transition-colors">
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
    </div>
  )
}

export default function AdminSuppliersPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const activeTab = (searchParams.get("tab") || "suppliers") as "suppliers" | "private-labels"

  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  // Add
  const [showAddModal, setShowAddModal] = useState(false)
  const [addCategory, setAddCategory] = useState<"SUPPLIER" | "PRIVATE_LABEL">("SUPPLIER")
  const [addCategoryChosen, setAddCategoryChosen] = useState(false)
  const [addForm, setAddForm] = useState<SupplierForm>(EMPTY_FORM)
  const [addSaving, setAddSaving] = useState(false)
  const [addError, setAddError] = useState("")

  // Edit
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null)
  const [editForm, setEditForm] = useState<SupplierForm>(EMPTY_FORM)
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState("")

  // Delete
  const [deletingSupplier, setDeletingSupplier] = useState<Supplier | null>(null)
  const [deleteConfirming, setDeleteConfirming] = useState(false)

  // Add Batch (pick supplier first)
  const [showAddChoice, setShowAddChoice] = useState(false)
  const [showPickSupplier, setShowPickSupplier] = useState(false)

  const fetchSuppliers = async () => {
    try {
      const res = await fetch("/api/suppliers")
      if (res.ok) setSuppliers(await res.json())
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { fetchSuppliers() }, [])

  const q = search.trim().toLowerCase()

  const suppliersList = useMemo(() =>
    suppliers.filter((s) => s.category === "SUPPLIER"), [suppliers])
  const privateLabelsList = useMemo(() =>
    suppliers.filter((s) => s.category === "PRIVATE_LABEL"), [suppliers])

  const activeList = activeTab === "suppliers" ? suppliersList : privateLabelsList

  const filteredList = useMemo(() => {
    if (!q) return activeList
    return activeList.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.contactName ?? "").toLowerCase().includes(q) ||
        (s.email ?? "").toLowerCase().includes(q) ||
        s.batchLots.some(
          (l) =>
            l.lotNumber.toLowerCase().includes(q) ||
            l.productName.toLowerCase().includes(q) ||
            (l.productSku ?? "").toLowerCase().includes(q)
        )
    )
  }, [q, activeList])

  const lotResults = useMemo(() => {
    if (!q) return []
    const results: { lot: LotPreview; supplier: Supplier }[] = []
    for (const s of activeList) {
      for (const lot of s.batchLots) {
        if (
          lot.lotNumber.toLowerCase().includes(q) ||
          lot.productName.toLowerCase().includes(q) ||
          (lot.productSku ?? "").toLowerCase().includes(q) ||
          (lot.invoiceNumber ?? "").toLowerCase().includes(q) ||
          s.name.toLowerCase().includes(q)
        ) results.push({ lot, supplier: s })
      }
    }
    return results
  }, [q, activeList])

  const totalLots = (activeTab === "suppliers" ? suppliersList : privateLabelsList)
    .reduce((sum, s) => sum + s._count.batchLots, 0)

  // ── Add ──
  const openAddModal = (forceCategory?: "SUPPLIER" | "PRIVATE_LABEL") => {
    const cat = forceCategory ?? (activeTab === "private-labels" ? "PRIVATE_LABEL" : "SUPPLIER")
    setAddCategory(cat)
    setAddCategoryChosen(!!forceCategory) // skip picker if category was explicit
    setAddForm(EMPTY_FORM)
    setAddError("")
    setShowAddModal(true)
  }

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    setAddError("")
    setAddSaving(true)
    try {
      const res = await fetch("/api/suppliers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...addForm, category: addCategory }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to create")
      setShowAddModal(false)
      await fetchSuppliers()
    } catch (err) {
      setAddError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setAddSaving(false)
    }
  }

  // ── Edit ──
  const handleOpenEdit = (s: Supplier, e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation()
    setEditForm({
      name: s.name, contactName: s.contactName ?? "", email: s.email ?? "",
      phone: s.phone ?? "", address: s.address ?? "", city: s.city ?? "",
      state: s.state ?? "", country: s.country ?? "", website: s.website ?? "", notes: s.notes ?? "",
    })
    setEditError("")
    setEditingSupplier(s)
  }

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingSupplier) return
    setEditError(""); setEditSaving(true)
    try {
      const res = await fetch(`/api/suppliers/${editingSupplier.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to update")
      setEditingSupplier(null)
      await fetchSuppliers()
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setEditSaving(false)
    }
  }

  // ── Delete ──
  const handleOpenDelete = (s: Supplier, e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation()
    setDeletingSupplier(s)
  }

  const handleDeleteConfirm = async () => {
    if (!deletingSupplier) return
    setDeleteConfirming(true)
    try {
      const res = await fetch(`/api/suppliers/${deletingSupplier.id}`, { method: "DELETE" })
      if (res.ok) { setDeletingSupplier(null); await fetchSuppliers() }
    } finally { setDeleteConfirming(false) }
  }

  const isPrivateLabel = activeTab === "private-labels"
  const TAB_CONFIG = {
    suppliers: { label: "Suppliers", icon: Truck, color: "text-blue-600", desc: "Companies you buy from", emptyMsg: "No suppliers yet" },
    "private-labels": { label: "Private Labels", icon: Star, color: "text-purple-600", desc: "Clients you manufacture for", emptyMsg: "No private label clients yet" },
  }
  const tabCfg = TAB_CONFIG[activeTab]

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold mb-0.5">Suppliers & Private Labels</h1>
          <p className="text-sm text-muted-foreground">Track your supply chain and private label clients</p>
        </div>
        <Button onClick={() => setShowAddChoice(true)} className="gap-2 shrink-0">
          <Plus className="h-4 w-4" />Add
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-muted/50 p-1 rounded-lg w-fit">
        {(["suppliers", "private-labels"] as const).map((tab) => {
          const cfg = TAB_CONFIG[tab]
          const Icon = cfg.icon
          const count = tab === "suppliers" ? suppliersList.length : privateLabelsList.length
          return (
            <button
              key={tab}
              onClick={() => router.push(`/admin/suppliers?tab=${tab}`)}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                activeTab === tab
                  ? "bg-white shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className={`h-4 w-4 ${activeTab === tab ? cfg.color : ""}`} />
              {cfg.label}
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${activeTab === tab ? "bg-muted" : "bg-muted/50"}`}>{count}</span>
            </button>
          )
        })}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <Card><CardContent className="pt-5 pb-4">
          <div className={`text-xl font-bold ${tabCfg.color}`}>{activeList.length}</div>
          <p className="text-xs text-muted-foreground mt-0.5">{isPrivateLabel ? "Private Label Clients" : "Total Suppliers"}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-5 pb-4">
          <div className="text-xl font-bold text-green-600">{activeList.filter((s) => s.isActive).length}</div>
          <p className="text-xs text-muted-foreground mt-0.5">Active</p>
        </CardContent></Card>
        <Card><CardContent className="pt-5 pb-4">
          <div className="text-xl font-bold text-purple-600">{totalLots}</div>
          <p className="text-xs text-muted-foreground mt-0.5">Batch Lots</p>
        </CardContent></Card>
      </div>

      {/* Search */}
      <div className="relative mb-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={`Search ${tabCfg.label.toLowerCase()}, lot #, product, SKU...`}
          value={search} onChange={(e) => setSearch(e.target.value)}
          className="pl-9 pr-9"
        />
        {search && (
          <button onClick={() => setSearch("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      <p className="text-xs text-muted-foreground mb-5">Search by name, lot #, product, SKU, invoice, or PO.</p>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* Lot search results */}
          {q && lotResults.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-2">
                <Hash className="h-4 w-4 text-purple-600" />
                <span className="text-sm font-semibold">Batch Lots — {lotResults.length} match{lotResults.length !== 1 ? "es" : ""}</span>
              </div>
              <div className="border rounded-lg overflow-x-auto">
                <table className="w-full text-sm min-w-[540px]">
                  <thead className="bg-muted/50">
                    <tr>{["Lot #", "Product", "Supplier", "Received", "Status", ""].map((h) => (
                      <th key={h} className="text-left px-3 py-2 text-xs font-medium uppercase text-muted-foreground">{h}</th>
                    ))}</tr>
                  </thead>
                  <tbody className="divide-y">
                    {lotResults.map(({ lot, supplier }) => (
                      <tr key={lot.id} className="hover:bg-muted/30">
                        <td className="px-3 py-2.5">
                          <Link href={`/admin/suppliers/${supplier.id}`}>
                            <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded cursor-pointer hover:bg-blue-100 transition-colors">{lot.lotNumber}</span>
                          </Link>
                        </td>
                        <td className="px-3 py-2.5 font-medium text-sm">
                          <Link href={`/admin/suppliers/${supplier.id}`} className="hover:text-blue-600 transition-colors">
                            {lot.productName}
                          </Link>
                        </td>
                        <td className="px-3 py-2.5 text-sm text-muted-foreground">{supplier.name}</td>
                        <td className="px-3 py-2.5 text-xs text-muted-foreground">{formatDate(lot.receivedAt)}</td>
                        <td className="px-3 py-2.5">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[lot.status]}`}>
                            {STATUS_LABELS[lot.status]}
                          </span>
                        </td>
                        <td className="px-3 py-2.5">
                          <Link href={`/admin/suppliers/${supplier.id}`} className="text-xs text-blue-600 hover:underline">View →</Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Cards grid */}
          {filteredList.length === 0 ? (
            <Card>
              <CardContent className="py-14 text-center">
                {isPrivateLabel
                  ? <Star className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-30" />
                  : <Building2 className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-30" />}
                <p className="font-semibold mb-1">{q ? `No results for "${search}"` : tabCfg.emptyMsg}</p>
                {!q && (
                  <Button onClick={() => openAddModal(isPrivateLabel ? "PRIVATE_LABEL" : "SUPPLIER")} variant="outline" className="mt-4 gap-2">
                    <Plus className="h-4 w-4" />Add {isPrivateLabel ? "Private Label Client" : "Supplier"}
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredList.map((supplier) => (
                <SupplierCard
                  key={supplier.id}
                  supplier={supplier}
                  onEdit={handleOpenEdit}
                  onDelete={handleOpenDelete}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* ── Add Choice Modal ── */}
      <Dialog open={showAddChoice} onOpenChange={(o) => { if (!o) setShowAddChoice(false) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>What would you like to add?</DialogTitle>
            <DialogDescription>Choose an option below.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-3 mt-2">
            <button
              onClick={() => { setShowAddChoice(false); openAddModal() }}
              className="flex items-center gap-4 p-4 rounded-xl border-2 border-transparent hover:border-blue-300 hover:bg-blue-50 transition-all text-left"
            >
              <div className="h-11 w-11 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                <Truck className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="font-semibold text-sm">New Supplier / Client</p>
                <p className="text-xs text-muted-foreground">Create a new supplier or private label</p>
              </div>
            </button>
            <button
              onClick={() => { setShowAddChoice(false); setShowPickSupplier(true) }}
              className="flex items-center gap-4 p-4 rounded-xl border-2 border-transparent hover:border-green-300 hover:bg-green-50 transition-all text-left"
            >
              <div className="h-11 w-11 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                <Package className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="font-semibold text-sm">New Batch / Delivery</p>
                <p className="text-xs text-muted-foreground">Add a batch lot to an existing supplier</p>
              </div>
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Pick Supplier for Batch ── */}
      <Dialog open={showPickSupplier} onOpenChange={(o) => { if (!o) setShowPickSupplier(false) }}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-hidden flex flex-col p-0">
          <div className="p-6 pb-2">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2"><Package className="h-5 w-5 text-green-600" />Select Supplier / Client</DialogTitle>
              <DialogDescription>Choose where to add a batch lot to.</DialogDescription>
            </DialogHeader>
          </div>
          
          <Tabs defaultValue="SUPPLIER" className="flex-1 flex flex-col min-h-0">
            <div className="px-6 pb-2">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="SUPPLIER" className="gap-2">
                  <Truck className="h-4 w-4" /> Suppliers
                </TabsTrigger>
                <TabsTrigger value="PRIVATE_LABEL" className="gap-2">
                  <Star className="h-4 w-4" /> Private Labels
                </TabsTrigger>
              </TabsList>
            </div>
            
            <div className="flex-1 overflow-y-auto px-6 pb-6">
              <TabsContent value="SUPPLIER" className="m-0 mt-2 space-y-2">
                {suppliers.filter(s => s.isActive && s.category === 'SUPPLIER').map((s) => (
                  <button
                    key={s.id}
                    onClick={() => {
                      setShowPickSupplier(false)
                      router.push(`/admin/suppliers/${s.id}?addBatch=true`)
                    }}
                    className="w-full flex items-center gap-3 p-3 rounded-lg border hover:border-blue-300 hover:bg-blue-50/50 transition-all text-left"
                  >
                    <div className="h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-blue-50">
                      <Truck className="h-4 w-4 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{s.name}</p>
                      <p className="text-xs text-muted-foreground">{s._count.batchLots} batch lots</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  </button>
                ))}
                {suppliers.filter(s => s.isActive && s.category === 'SUPPLIER').length === 0 && (
                  <p className="text-center text-sm text-muted-foreground py-6">No active suppliers.</p>
                )}
              </TabsContent>

              <TabsContent value="PRIVATE_LABEL" className="m-0 mt-2 space-y-2">
                {suppliers.filter(s => s.isActive && s.category === 'PRIVATE_LABEL').map((s) => (
                  <button
                    key={s.id}
                    onClick={() => {
                      setShowPickSupplier(false)
                      router.push(`/admin/suppliers/${s.id}?addBatch=true`)
                    }}
                    className="w-full flex items-center gap-3 p-3 rounded-lg border hover:border-purple-300 hover:bg-purple-50/50 transition-all text-left"
                  >
                    <div className="h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-purple-50">
                      <Star className="h-4 w-4 text-purple-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{s.name}</p>
                      <p className="text-xs text-muted-foreground">{s._count.batchLots} batch lots</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  </button>
                ))}
                {suppliers.filter(s => s.isActive && s.category === 'PRIVATE_LABEL').length === 0 && (
                  <p className="text-center text-sm text-muted-foreground py-6">No active private label clients.</p>
                )}
              </TabsContent>
            </div>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* ── Add Supplier Modal — Step 1: choose category ── */}
      <Dialog open={showAddModal && !addCategoryChosen} onOpenChange={(o) => { if (!o) setShowAddModal(false) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>What are you adding?</DialogTitle>
            <DialogDescription>Choose the category for this entry.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 mt-2">
            <button
              onClick={() => { setAddCategory("SUPPLIER"); setAddCategoryChosen(true) }}
              className="flex flex-col items-center gap-3 p-5 rounded-xl border-2 border-transparent hover:border-blue-300 hover:bg-blue-50 transition-all"
            >
              <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                <Truck className="h-6 w-6 text-blue-600" />
              </div>
              <div className="text-center">
                <p className="font-semibold text-sm">Supplier</p>
                <p className="text-xs text-muted-foreground mt-0.5">Company I buy from</p>
              </div>
            </button>
            <button
              onClick={() => { setAddCategory("PRIVATE_LABEL"); setAddCategoryChosen(true) }}
              className="flex flex-col items-center gap-3 p-5 rounded-xl border-2 border-transparent hover:border-purple-300 hover:bg-purple-50 transition-all"
            >
              <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center">
                <Star className="h-6 w-6 text-purple-600" />
              </div>
              <div className="text-center">
                <p className="font-semibold text-sm">Private Label</p>
                <p className="text-xs text-muted-foreground mt-0.5">Client I manufacture for</p>
              </div>
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Add Modal — Step 2: form ── */}
      <Dialog open={showAddModal && addCategoryChosen} onOpenChange={(o) => { if (!o) { setShowAddModal(false); setAddCategoryChosen(false) } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {addCategory === "SUPPLIER"
                ? <><Truck className="h-5 w-5 text-blue-600" />Add Supplier</>
                : <><Star className="h-5 w-5 text-purple-600" />Add Private Label Client</>}
            </DialogTitle>
            <DialogDescription>
              {addCategory === "SUPPLIER"
                ? "Add a supplier to track their products and batch lots."
                : "Add a private label client to manage their documents and orders."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAdd} className="space-y-5 mt-2">
            {addError && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-md px-4 py-3">{addError}</div>
            )}
            <SupplierFormFields form={addForm} onChange={setAddForm} prefix="add" />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddCategoryChosen(false)}>← Back</Button>
              <Button type="submit" disabled={addSaving}>
                {addSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Edit Modal ── */}
      <Dialog open={!!editingSupplier} onOpenChange={(o) => { if (!o) setEditingSupplier(null) }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5 text-blue-600" />Edit {editingSupplier?.category === "PRIVATE_LABEL" ? "Private Label Client" : "Supplier"}
            </DialogTitle>
          </DialogHeader>
          {editingSupplier && (
            <form onSubmit={handleSaveEdit} className="space-y-5 mt-2">
              {editError && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-md px-4 py-3">{editError}</div>}
              <SupplierFormFields form={editForm} onChange={setEditForm} prefix="edit" />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditingSupplier(null)}>Cancel</Button>
                <Button type="submit" disabled={editSaving}>
                  {editSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : "Save Changes"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Delete Modal ── */}
      <Dialog open={!!deletingSupplier} onOpenChange={(o) => { if (!o) setDeletingSupplier(null) }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="h-5 w-5" />Delete {deletingSupplier?.category === "PRIVATE_LABEL" ? "Private Label Client" : "Supplier"}
            </DialogTitle>
            <DialogDescription>
              Permanently delete <span className="font-semibold text-foreground">{deletingSupplier?.name}</span>?
              All batch lots and documents will also be deleted. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setDeletingSupplier(null)} disabled={deleteConfirming}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteConfirm} disabled={deleteConfirming}>
              {deleteConfirming ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Deleting...</> : "Delete Permanently"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
