"use client"

import { useState, useEffect, useMemo } from "react"
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Plus,
  Building2,
  Phone,
  Mail,
  Globe,
  MapPin,
  Package,
  ChevronRight,
  Search,
  Loader2,
  Hash,
  X,
} from "lucide-react"
import Link from "next/link"

// ─── Types ─────────────────────────────────────────────────────
type BatchLotStatus =
  | "INCOMING" | "RECEIVED" | "IN_QC" | "APPROVED"
  | "ON_HOLD" | "RECALLED" | "DISPOSED"

type LotPreview = {
  id: string
  lotNumber: string
  productName: string
  productSku: string | null
  category: string | null
  invoiceNumber: string | null
  poNumber: string | null
  status: BatchLotStatus
  receivedAt: string
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
  createdAt: string
  _count: { batchLots: number }
  batchLots: LotPreview[]
}

type LotSearchResult = {
  lot: LotPreview
  supplier: Supplier
}

const STATUS_COLORS: Record<BatchLotStatus, string> = {
  INCOMING:  "bg-blue-100 text-blue-700",
  RECEIVED:  "bg-teal-100 text-teal-700",
  IN_QC:     "bg-yellow-100 text-yellow-700",
  APPROVED:  "bg-green-100 text-green-700",
  ON_HOLD:   "bg-orange-100 text-orange-700",
  RECALLED:  "bg-red-100 text-red-700",
  DISPOSED:  "bg-gray-100 text-gray-600",
}

const STATUS_LABELS: Record<BatchLotStatus, string> = {
  INCOMING: "Incoming", RECEIVED: "Received", IN_QC: "In QC",
  APPROVED: "Approved", ON_HOLD: "On Hold", RECALLED: "Recalled", DISPOSED: "Disposed",
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
}

// ─── Form ──────────────────────────────────────────────────────
const EMPTY_FORM = {
  name: "", contactName: "", email: "", phone: "",
  address: "", city: "", state: "", country: "", website: "", notes: "",
}

// ─── Page ──────────────────────────────────────────────────────
export default function AdminSuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [error, setError] = useState("")

  const fetchSuppliers = async () => {
    try {
      const res = await fetch("/api/suppliers")
      if (res.ok) setSuppliers(await res.json())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchSuppliers() }, [])

  // ── Global search: matches suppliers AND their batch lots ──
  const q = search.trim().toLowerCase()

  const lotResults = useMemo<LotSearchResult[]>(() => {
    if (!q) return []
    const results: LotSearchResult[] = []
    for (const supplier of suppliers) {
      for (const lot of supplier.batchLots) {
        const hit =
          lot.lotNumber.toLowerCase().includes(q) ||
          lot.productName.toLowerCase().includes(q) ||
          (lot.productSku ?? "").toLowerCase().includes(q) ||
          (lot.category ?? "").toLowerCase().includes(q) ||
          (lot.invoiceNumber ?? "").toLowerCase().includes(q) ||
          (lot.poNumber ?? "").toLowerCase().includes(q) ||
          supplier.name.toLowerCase().includes(q) ||
          (supplier.contactName ?? "").toLowerCase().includes(q)
        if (hit) results.push({ lot, supplier })
      }
    }
    return results
  }, [q, suppliers])

  const filteredSuppliers = useMemo(() => {
    if (!q) return suppliers
    return suppliers.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.contactName ?? "").toLowerCase().includes(q) ||
        (s.email ?? "").toLowerCase().includes(q) ||
        s.batchLots.some(
          (l) =>
            l.lotNumber.toLowerCase().includes(q) ||
            l.productName.toLowerCase().includes(q) ||
            (l.productSku ?? "").toLowerCase().includes(q) ||
            (l.invoiceNumber ?? "").toLowerCase().includes(q) ||
            (l.poNumber ?? "").toLowerCase().includes(q)
        )
    )
  }, [q, suppliers])

  const isGlobalSearch = q.length > 0
  const totalLots = suppliers.reduce((sum, s) => sum + s._count.batchLots, 0)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSaving(true)
    try {
      const res = await fetch("/api/suppliers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to create supplier")
      setShowModal(false)
      setForm(EMPTY_FORM)
      await fetchSuppliers()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-1">Suppliers</h1>
          <p className="text-muted-foreground">
            Manage suppliers and track product lots &amp; batches
          </p>
        </div>
        <Button onClick={() => setShowModal(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Supplier
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-blue-600">{suppliers.length}</div>
            <p className="text-sm text-muted-foreground mt-1">Total Suppliers</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">
              {suppliers.filter((s) => s.isActive).length}
            </div>
            <p className="text-sm text-muted-foreground mt-1">Active</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-purple-600">{totalLots}</div>
            <p className="text-sm text-muted-foreground mt-1">Total Batch Lots</p>
          </CardContent>
        </Card>
      </div>

      {/* ── Global Search Bar ── */}
      <div className="relative mb-2">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by lot #, product name, SKU, invoice #, PO #, supplier name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 pr-10"
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      <p className="text-xs text-muted-foreground mb-6">
        Searches across suppliers, lot numbers, products, SKUs, invoice &amp; PO numbers.
      </p>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* ── Lot results (when searching) ── */}
          {isGlobalSearch && lotResults.length > 0 && (
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-3">
                <Hash className="h-4 w-4 text-purple-600" />
                <h2 className="font-semibold text-sm">
                  Batch Lots matching &ldquo;{search}&rdquo;
                </h2>
                <span className="text-xs text-muted-foreground">
                  — {lotResults.length} result{lotResults.length !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left px-4 py-2.5 font-medium text-xs uppercase tracking-wider text-muted-foreground">Lot #</th>
                      <th className="text-left px-4 py-2.5 font-medium text-xs uppercase tracking-wider text-muted-foreground">Product</th>
                      <th className="text-left px-4 py-2.5 font-medium text-xs uppercase tracking-wider text-muted-foreground hidden sm:table-cell">SKU</th>
                      <th className="text-left px-4 py-2.5 font-medium text-xs uppercase tracking-wider text-muted-foreground hidden md:table-cell">Invoice / PO</th>
                      <th className="text-left px-4 py-2.5 font-medium text-xs uppercase tracking-wider text-muted-foreground">Supplier</th>
                      <th className="text-left px-4 py-2.5 font-medium text-xs uppercase tracking-wider text-muted-foreground hidden lg:table-cell">Received</th>
                      <th className="text-left px-4 py-2.5 font-medium text-xs uppercase tracking-wider text-muted-foreground">Status</th>
                      <th className="px-4 py-2.5" />
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {lotResults.map(({ lot, supplier }) => (
                      <tr key={lot.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3">
                          <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                            {lot.lotNumber}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium">{lot.productName}</p>
                          {lot.category && (
                            <p className="text-xs text-muted-foreground">{lot.category}</p>
                          )}
                        </td>
                        <td className="px-4 py-3 hidden sm:table-cell text-muted-foreground text-xs">
                          {lot.productSku || "—"}
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          <div className="text-xs space-y-0.5">
                            {lot.invoiceNumber && <div className="text-muted-foreground">INV: <span className="text-foreground">{lot.invoiceNumber}</span></div>}
                            {lot.poNumber && <div className="text-muted-foreground">PO: <span className="text-foreground">{lot.poNumber}</span></div>}
                            {!lot.invoiceNumber && !lot.poNumber && <span className="text-muted-foreground">—</span>}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <Building2 className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                            <span className="text-sm">{supplier.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell text-sm text-muted-foreground">
                          {formatDate(lot.receivedAt)}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[lot.status]}`}>
                            {STATUS_LABELS[lot.status]}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <Link
                            href={`/admin/suppliers/${supplier.id}`}
                            className="text-xs text-blue-600 hover:underline whitespace-nowrap"
                          >
                            View →
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── Supplier cards ── */}
          {filteredSuppliers.length === 0 && !isGlobalSearch ? (
            <Card>
              <CardContent className="py-16 text-center">
                <Building2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-40" />
                <p className="font-semibold text-lg mb-1">No suppliers yet</p>
                <p className="text-muted-foreground text-sm mb-6">
                  Add your first supplier to get started.
                </p>
                <Button onClick={() => setShowModal(true)} variant="outline" className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add Supplier
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Only show supplier-grid header when something to show */}
              {filteredSuppliers.length > 0 && (
                <>
                  {isGlobalSearch && (
                    <div className="flex items-center gap-2 mb-3">
                      <Building2 className="h-4 w-4 text-blue-600" />
                      <h2 className="font-semibold text-sm">
                        Suppliers matching &ldquo;{search}&rdquo;
                      </h2>
                      <span className="text-xs text-muted-foreground">
                        — {filteredSuppliers.length} result{filteredSuppliers.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                    {filteredSuppliers.map((supplier) => (
                      <Link key={supplier.id} href={`/admin/suppliers/${supplier.id}`}>
                        <Card className="hover:shadow-md hover:border-blue-200 transition-all cursor-pointer group">
                          <CardHeader className="pb-3">
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                                  <Building2 className="h-5 w-5 text-blue-600" />
                                </div>
                                <div>
                                  <CardTitle className="text-base">{supplier.name}</CardTitle>
                                  {supplier.contactName && (
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                      {supplier.contactName}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-blue-600 transition-colors mt-1" />
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-2">
                            {supplier.email && (
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Mail className="h-3.5 w-3.5 flex-shrink-0" />
                                <span className="truncate">{supplier.email}</span>
                              </div>
                            )}
                            {supplier.phone && (
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Phone className="h-3.5 w-3.5 flex-shrink-0" />
                                {supplier.phone}
                              </div>
                            )}
                            {(supplier.city || supplier.country) && (
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                                {[supplier.city, supplier.state, supplier.country].filter(Boolean).join(", ")}
                              </div>
                            )}
                            <div className="pt-3 border-t flex items-center justify-between">
                              <div className="flex items-center gap-1.5 text-sm font-medium">
                                <Package className="h-4 w-4 text-purple-600" />
                                <span className="text-purple-600">{supplier._count.batchLots}</span>
                                <span className="text-muted-foreground">batch lots</span>
                              </div>
                              <Badge
                                variant={supplier.isActive ? "default" : "secondary"}
                                className="text-xs"
                              >
                                {supplier.isActive ? "Active" : "Inactive"}
                              </Badge>
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    ))}
                  </div>
                </>
              )}

              {/* No results at all */}
              {isGlobalSearch && filteredSuppliers.length === 0 && lotResults.length === 0 && (
                <Card>
                  <CardContent className="py-14 text-center">
                    <Search className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-40" />
                    <p className="font-semibold mb-1">No results for &ldquo;{search}&rdquo;</p>
                    <p className="text-muted-foreground text-sm">
                      Try a different search — lot #, product name, SKU, invoice, PO, or supplier name.
                    </p>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </>
      )}

      {/* ── Add Supplier Modal ── */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Supplier</DialogTitle>
            <DialogDescription>
              Add a supplier to start tracking their products and batch lots.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-5 mt-2">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-md px-4 py-3">
                {error}
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label htmlFor="sup-name">
                  Supplier / Company Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="sup-name"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Acme Packaging Co."
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="sup-contact">Contact Person</Label>
                <Input id="sup-contact" value={form.contactName}
                  onChange={(e) => setForm({ ...form, contactName: e.target.value })}
                  placeholder="John Smith" className="mt-1" />
              </div>
              <div>
                <Label htmlFor="sup-email">Email</Label>
                <Input id="sup-email" type="email" value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="contact@supplier.com" className="mt-1" />
              </div>
              <div>
                <Label htmlFor="sup-phone">Phone</Label>
                <Input id="sup-phone" value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="+1 (555) 000-0000" className="mt-1" />
              </div>
              <div>
                <Label htmlFor="sup-website">Website</Label>
                <Input id="sup-website" value={form.website}
                  onChange={(e) => setForm({ ...form, website: e.target.value })}
                  placeholder="https://supplier.com" className="mt-1" />
              </div>
              <div>
                <Label htmlFor="sup-address">Street Address</Label>
                <Input id="sup-address" value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  placeholder="123 Main St" className="mt-1" />
              </div>
              <div>
                <Label htmlFor="sup-city">City</Label>
                <Input id="sup-city" value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  placeholder="Miami" className="mt-1" />
              </div>
              <div>
                <Label htmlFor="sup-state">State / Province</Label>
                <Input id="sup-state" value={form.state}
                  onChange={(e) => setForm({ ...form, state: e.target.value })}
                  placeholder="FL" className="mt-1" />
              </div>
              <div>
                <Label htmlFor="sup-country">Country</Label>
                <Input id="sup-country" value={form.country}
                  onChange={(e) => setForm({ ...form, country: e.target.value })}
                  placeholder="USA" className="mt-1" />
              </div>
              <div className="col-span-2">
                <Label htmlFor="sup-notes">Notes</Label>
                <Textarea id="sup-notes" value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Any additional information about this supplier..."
                  rows={3} className="mt-1 resize-none" />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</>
                ) : "Save Supplier"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
