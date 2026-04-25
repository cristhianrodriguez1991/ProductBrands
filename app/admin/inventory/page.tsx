"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import {
  Plus,
  RefreshCw,
  Search,
  Package,
  Trash2,
  Save,
  X,
  ImageIcon,
  AlertTriangle,
  ExternalLink,
  ShoppingCart,
  Boxes,
  Eye,
  EyeOff,
  Camera,
  ChevronDown,
  ChevronUp,
  ScanBarcode,
  CheckCircle2,
  Zap,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { compressImage } from "@/lib/image-compression"

// ── Types ──
type InventoryItem = {
  id: string
  source: "AMAZON" | "MANUAL"
  asin: string | null
  amazonTitle: string | null
  amazonImageUrl: string | null
  amazonUrl: string | null
  upc: string | null
  ean: string | null
  name: string
  sku: string | null
  description: string | null
  imageUrl: string | null
  category: string | null
  location: string | null
  quantityOnHand: number
  quantityReserved: number
  reorderPoint: number
  unitCost: number | null
  isActive: boolean
  notes: string | null
  lastSyncedAt: string | null
  createdAt: string
  updatedAt: string
}

// ── Confirm Modal ──
const ConfirmModal = ({ isOpen, onClose, onConfirm, title, message }: any) => (
  <Dialog open={isOpen} onOpenChange={onClose}>
    <DialogContent className="sm:max-w-[420px] p-0 overflow-hidden border-0 shadow-2xl">
      <div className="bg-white p-6 pt-8 text-center">
        <div className="mx-auto w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-4">
          <AlertTriangle className="h-8 w-8 text-red-600" />
        </div>
        <DialogHeader className="p-0">
          <DialogTitle className="text-xl font-black text-slate-900 text-center uppercase tracking-tight">
            {title}
          </DialogTitle>
          <div className="mt-4 text-slate-500 font-medium text-sm leading-relaxed">
            {message}
          </div>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3 mt-8">
          <Button variant="ghost" onClick={onClose} className="h-11 font-black uppercase tracking-widest text-[10px] text-slate-400">
            Cancel
          </Button>
          <Button onClick={() => { onConfirm(); onClose() }} className="h-11 bg-red-600 hover:bg-red-700 text-white font-black uppercase tracking-widest text-[10px]">
            Confirm
          </Button>
        </div>
      </div>
    </DialogContent>
  </Dialog>
)

// ── Manual Item Modal ──
const ManualItemModal = ({ isOpen, onClose, onSubmit }: {
  isOpen: boolean; onClose: () => void; onSubmit: (data: any) => void
}) => {
  const [form, setForm] = useState({ name: "", sku: "", upc: "", ean: "", category: "", location: "", quantityOnHand: "", unitCost: "", description: "", notes: "" })

  const handleSubmit = () => {
    if (!form.name.trim()) { alert("Product name is required"); return }
    onSubmit(form)
    setForm({ name: "", sku: "", upc: "", ean: "", category: "", location: "", quantityOnHand: "", unitCost: "", description: "", notes: "" })
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[560px] p-0 overflow-hidden border-0 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="bg-white p-6">
          <DialogHeader className="p-0 mb-5">
            <DialogTitle className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Plus className="h-5 w-5 text-blue-600" />
              Add Warehouse Item
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Product Name *</label>
              <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Coffee Beans 1lb Bag" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">SKU</label>
                <Input value={form.sku} onChange={e => setForm({ ...form, sku: e.target.value })} placeholder="SKU-001" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">UPC</label>
                <Input value={form.upc} onChange={e => setForm({ ...form, upc: e.target.value })} placeholder="012345678901" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">EAN / IAN</label>
                <Input value={form.ean} onChange={e => setForm({ ...form, ean: e.target.value })} placeholder="0123456789012" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Category</label>
                <Input value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} placeholder="Coffee, Snacks..." />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Location</label>
                <Input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} placeholder="A1T, B3M..." />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Qty On Hand</label>
                <Input type="number" value={form.quantityOnHand} onChange={e => setForm({ ...form, quantityOnHand: e.target.value })} placeholder="0" />
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Unit Cost</label>
              <Input type="number" step="0.01" value={form.unitCost} onChange={e => setForm({ ...form, unitCost: e.target.value })} placeholder="$0.00" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Notes</label>
              <textarea className="w-full border rounded-lg p-2.5 text-sm resize-none h-16 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Internal notes..." />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
            <Button variant="ghost" onClick={onClose} className="text-xs font-bold uppercase tracking-wider">Cancel</Button>
            <Button onClick={handleSubmit} className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider px-6">
              <Plus className="h-4 w-4 mr-2" /> Add Item
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ── Stat Card ──
const StatCard = ({ label, value, icon: Icon, color }: { label: string; value: string | number; icon: any; color: string }) => (
  <div className="flex items-center gap-3 px-4 py-3 rounded-xl border bg-white shadow-sm">
    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
      <Icon className="h-5 w-5 text-white" />
    </div>
    <div>
      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{label}</p>
      <p className="text-xl font-black text-slate-800">{value}</p>
    </div>
  </div>
)

// ══════════════════════════════════════════════════════════════
// MAIN INVENTORY PAGE
// ══════════════════════════════════════════════════════════════
export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterSource, setFilterSource] = useState<"ALL" | "AMAZON" | "MANUAL">("ALL")
  const [filterActive, setFilterActive] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ACTIVE")
  const [isSyncing, setIsSyncing] = useState(false)
  const [showManualModal, setShowManualModal] = useState(false)

  // Scanner state
  const [scannerInput, setScannerInput] = useState("")
  const [scanResult, setScanResult] = useState<{ found: boolean; item?: InventoryItem; code?: string } | null>(null)
  const [scanQty, setScanQty] = useState("1")
  const [isScanning, setIsScanning] = useState(false)
  const scannerRef = useRef<HTMLInputElement>(null)

  const [expandedItem, setExpandedItem] = useState<string | null>(null)
  const [expandedImage, setExpandedImage] = useState<string | null>(null)
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle")
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, title: "", message: "", onConfirm: () => {} })

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedIdForUpload, setSelectedIdForUpload] = useState<string | null>(null)
  const [uploadingId, setUploadingId] = useState<string | null>(null)

  // ── Fetch ──
  const fetchItems = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/inventory")
      if (res.ok) setItems(await res.json())
    } catch (e) { console.error("Fetch failed:", e) }
    finally { setLoading(false) }
  }, [])

  // ── Auto-sync on first load ──
  const autoSync = useCallback(async () => {
    setIsSyncing(true)
    try {
      const res = await fetch("/api/admin/inventory/sync", { method: "POST" })
      const data = await res.json()
      if (res.ok && (data.created > 0 || data.synced > 0)) {
        await fetchItems()
      }
    } catch (e) {
      console.error("Auto-sync failed:", e)
    } finally {
      setIsSyncing(false)
    }
  }, [fetchItems])

  useEffect(() => {
    const init = async () => {
      await fetchItems()
      // Auto-sync Amazon products on load
      autoSync()
    }
    init()
  }, [fetchItems, autoSync])

  // ── Scanner: lookup by barcode/ASIN/SKU ──
  const handleScanSubmit = async () => {
    const code = scannerInput.trim()
    if (!code) return

    setIsScanning(true)
    setScanResult(null)

    try {
      const res = await fetch(`/api/admin/inventory/lookup?code=${encodeURIComponent(code)}`)
      const data = await res.json()

      if (data.found && data.item) {
        setScanResult({ found: true, item: data.item })
      } else {
        setScanResult({ found: false, code })
      }
    } catch (e) {
      setScanResult({ found: false, code })
    } finally {
      setIsScanning(false)
    }
  }

  // ── Scanner: add quantity to found item ──
  const handleScanAddQty = async () => {
    if (!scanResult?.item) return
    const addQty = parseInt(scanQty) || 0
    if (addQty <= 0) return

    const newQty = scanResult.item.quantityOnHand + addQty
    await updateItem(scanResult.item.id, "quantityOnHand", newQty)

    // Update local scan result
    setScanResult({
      ...scanResult,
      item: { ...scanResult.item, quantityOnHand: newQty },
    })
    setScanQty("1")
    setScannerInput("")

    // Flash success, refocus scanner
    setTimeout(() => {
      setScanResult(null)
      scannerRef.current?.focus()
    }, 1500)
  }

  // ── Amazon Sync ──
  const handleManualSync = async () => {
    setIsSyncing(true)
    try {
      const res = await fetch("/api/admin/inventory/sync", { method: "POST" })
      const data = await res.json()
      if (res.ok) {
        await fetchItems()
        alert(`✅ Sync complete!\n${data.created || 0} new items imported\n${data.synced || 0} items updated`)
      } else {
        alert("❌ Sync failed: " + (data.error || "Unknown error"))
      }
    } catch (e) {
      alert("❌ Sync failed. Check your Amazon API credentials.")
    } finally {
      setIsSyncing(false)
    }
  }

  // ── Create Manual Item ──
  const handleCreateManual = async (formData: any) => {
    try {
      const res = await fetch("/api/admin/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })
      if (res.ok) { setShowManualModal(false); await fetchItems() }
      else alert("Failed to create item")
    } catch (e) { alert("Error creating item") }
  }

  // ── Update Item ──
  const updateItem = async (id: string, field: string, value: any) => {
    setSaveStatus("saving")
    setItems(prev => prev.map(i => i.id === id ? { ...i, [field]: value } : i))
    try {
      await fetch(`/api/admin/inventory/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      })
      setSaveStatus("saved")
      setTimeout(() => setSaveStatus("idle"), 2000)
    } catch (e) { setSaveStatus("idle") }
  }

  // ── Delete Item ──
  const deleteItem = (id: string, name: string) => {
    setConfirmDialog({
      isOpen: true, title: "Delete Item?",
      message: `Permanently delete "${name}"? This cannot be undone.`,
      onConfirm: async () => {
        try {
          await fetch(`/api/admin/inventory/${id}`, { method: "DELETE" })
          setItems(prev => prev.filter(i => i.id !== id))
        } catch (e) { alert("Error deleting item") }
      },
    })
  }

  // ── Image Upload ──
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !selectedIdForUpload) return
    setUploadingId(selectedIdForUpload)
    try {
      const compressed = await compressImage(file, 800, 0.8)
      const reader = new FileReader()
      reader.onloadend = async () => {
        await updateItem(selectedIdForUpload, "imageUrl", reader.result as string)
        setUploadingId(null)
      }
      reader.readAsDataURL(compressed)
    } catch {
      const reader = new FileReader()
      reader.onloadend = async () => {
        await updateItem(selectedIdForUpload!, "imageUrl", reader.result as string)
        setUploadingId(null)
      }
      reader.readAsDataURL(file)
    }
    e.target.value = ""
  }

  // ── Filtering ──
  const filteredItems = items.filter(item => {
    if (filterSource !== "ALL" && item.source !== filterSource) return false
    if (filterActive === "ACTIVE" && !item.isActive) return false
    if (filterActive === "INACTIVE" && item.isActive) return false
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      return item.name?.toLowerCase().includes(q) || item.sku?.toLowerCase().includes(q) ||
        item.asin?.toLowerCase().includes(q) || item.category?.toLowerCase().includes(q) ||
        item.location?.toLowerCase().includes(q) || item.upc?.includes(q) || item.ean?.includes(q)
    }
    return true
  })

  // ── Stats ──
  const totalItems = items.filter(i => i.isActive).length
  const amazonItems = items.filter(i => i.source === "AMAZON" && i.isActive).length
  const manualItems = items.filter(i => i.source === "MANUAL" && i.isActive).length
  const lowStockItems = items.filter(i => i.isActive && i.reorderPoint > 0 && i.quantityOnHand <= i.reorderPoint).length

  const getItemImage = (item: InventoryItem) => item.imageUrl || item.amazonImageUrl || null

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-500" />
          <p className="text-sm text-slate-500 font-medium">Loading inventory...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Boxes className="h-7 w-7 text-blue-600" />
            Inventory
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Auto-synced from Amazon • Scan barcodes to update quantities
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {saveStatus === "saving" && (
            <span className="text-xs text-amber-600 font-bold animate-pulse flex items-center gap-1">
              <RefreshCw className="h-3 w-3 animate-spin" /> Saving...
            </span>
          )}
          {saveStatus === "saved" && (
            <span className="text-xs text-green-600 font-bold flex items-center gap-1">
              <Save className="h-3 w-3" /> Saved
            </span>
          )}
          <Button variant="outline" onClick={handleManualSync} disabled={isSyncing}
            className="text-xs font-bold uppercase tracking-wider border-orange-200 text-orange-600 hover:bg-orange-50">
            <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? "animate-spin" : ""}`} />
            {isSyncing ? "Syncing..." : "Sync Amazon"}
          </Button>
          <Button onClick={() => setShowManualModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider">
            <Plus className="h-4 w-4 mr-2" /> Add Manual Item
          </Button>
        </div>
      </div>

      {/* ── SCANNER BAR ── */}
      <Card className="overflow-hidden border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-white shadow-lg">
        <div className="p-4 md:p-6">
          <div className="flex items-center gap-2 mb-3">
            <ScanBarcode className="h-5 w-5 text-blue-600" />
            <h2 className="font-black text-sm text-slate-800 uppercase tracking-wider">
              Barcode Scanner
            </h2>
            <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold uppercase">
              Scan UPC · EAN · ASIN · SKU
            </span>
          </div>

          <div className="flex gap-2">
            <div className="relative flex-1">
              <ScanBarcode className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-blue-400 pointer-events-none" />
              <Input
                ref={scannerRef}
                placeholder="Scan or type barcode / ASIN / SKU..."
                className="pl-11 h-12 text-base font-mono border-blue-200 focus:border-blue-500 focus:ring-blue-200 bg-white shadow-inner"
                value={scannerInput}
                onChange={e => setScannerInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") handleScanSubmit() }}
                autoFocus
              />
            </div>
            <Button onClick={handleScanSubmit} disabled={isScanning || !scannerInput.trim()}
              className="h-12 px-6 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm uppercase tracking-wider">
              {isScanning ? <RefreshCw className="h-5 w-5 animate-spin" /> : "Lookup"}
            </Button>
          </div>

          {/* ── Scan Result ── */}
          {scanResult && (
            <div className="mt-4 animate-in slide-in-from-top-2 duration-200">
              {scanResult.found && scanResult.item ? (
                <div className="flex items-center gap-4 bg-white rounded-xl border border-green-200 p-4 shadow-sm">
                  {/* Product Image */}
                  <div className="w-20 h-20 rounded-lg bg-slate-50 border overflow-hidden flex-shrink-0 flex items-center justify-center">
                    {getItemImage(scanResult.item) ? (
                      <img src={getItemImage(scanResult.item)!} alt="" className="w-full h-full object-contain p-1" />
                    ) : (
                      <ImageIcon className="h-8 w-8 text-slate-200" />
                    )}
                  </div>

                  {/* Product Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                      <h3 className="font-bold text-sm text-slate-900 truncate">{scanResult.item.name}</h3>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-slate-500 flex-wrap">
                      {scanResult.item.asin && <span className="bg-orange-50 text-orange-600 px-1.5 py-0.5 rounded font-mono font-bold">{scanResult.item.asin}</span>}
                      {scanResult.item.sku && <span className="bg-slate-100 px-1.5 py-0.5 rounded font-mono font-bold">{scanResult.item.sku}</span>}
                      {scanResult.item.upc && <span className="bg-purple-50 text-purple-600 px-1.5 py-0.5 rounded font-mono font-bold">UPC: {scanResult.item.upc}</span>}
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Current stock: <span className="font-black text-slate-800">{scanResult.item.quantityOnHand}</span> units
                    </p>
                  </div>

                  {/* Add Qty Controls */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="text-center">
                      <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Add Qty</label>
                      <Input
                        type="number"
                        className="w-20 h-10 text-center text-lg font-black border-blue-200"
                        value={scanQty}
                        onChange={e => setScanQty(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter") handleScanAddQty() }}
                      />
                    </div>
                    <Button onClick={handleScanAddQty}
                      className="h-10 px-4 bg-green-600 hover:bg-green-700 text-white font-black text-xs uppercase">
                      <Zap className="h-4 w-4 mr-1" /> Add
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 bg-amber-50 rounded-xl border border-amber-200 p-4">
                  <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-bold text-amber-800">
                      No item found for &quot;{scanResult.code}&quot;
                    </p>
                    <p className="text-xs text-amber-600 mt-0.5">
                      This code is not in inventory. Add it manually or assign this barcode to an existing item.
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => { setShowManualModal(true); setScanResult(null) }}
                    className="text-xs font-bold border-amber-300 text-amber-700 hover:bg-amber-100">
                    <Plus className="h-3.5 w-3.5 mr-1" /> Add New
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </Card>

      {/* ── Stats Row ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total Items" value={totalItems} icon={Boxes} color="bg-blue-600" />
        <StatCard label="Amazon" value={amazonItems} icon={ShoppingCart} color="bg-orange-500" />
        <StatCard label="Manual" value={manualItems} icon={Package} color="bg-emerald-600" />
        <StatCard label="Low Stock" value={lowStockItems} icon={AlertTriangle} color={lowStockItems > 0 ? "bg-red-500" : "bg-slate-400"} />
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          <Input placeholder="Search name, SKU, ASIN, UPC, location..." className="pl-10 text-sm" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border overflow-hidden bg-white shadow-sm">
            {(["ALL", "AMAZON", "MANUAL"] as const).map(src => (
              <button key={src} onClick={() => setFilterSource(src)}
                className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-wider transition-all ${filterSource === src ? "bg-slate-800 text-white" : "text-slate-500 hover:bg-slate-50"}`}>
                {src === "ALL" ? "All" : src === "AMAZON" ? "🛒 Amazon" : "📦 Manual"}
              </button>
            ))}
          </div>
          <div className="flex rounded-lg border overflow-hidden bg-white shadow-sm">
            {(["ACTIVE", "INACTIVE", "ALL"] as const).map(status => (
              <button key={status} onClick={() => setFilterActive(status)}
                className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-wider transition-all ${filterActive === status ? "bg-slate-800 text-white" : "text-slate-500 hover:bg-slate-50"}`}>
                {status === "ALL" ? "All" : status === "ACTIVE" ? "Active" : "Inactive"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Inventory Grid ── */}
      {filteredItems.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-16 border-dashed">
          <Boxes className="h-16 w-16 text-slate-200 mb-4" />
          <h3 className="text-lg font-bold text-slate-400">No items found</h3>
          <p className="text-sm text-slate-400 mt-1 text-center max-w-sm">
            {items.length === 0
              ? 'Click "Sync Amazon" to auto-import all your Amazon products, or add warehouse items manually.'
              : "No items match your current filters."}
          </p>
          {items.length === 0 && (
            <div className="flex gap-2 mt-4">
              <Button variant="outline" onClick={handleManualSync} className="text-xs font-bold text-orange-600 border-orange-200">
                <ShoppingCart className="h-4 w-4 mr-2" /> Sync Amazon
              </Button>
              <Button onClick={() => setShowManualModal(true)} className="text-xs font-bold bg-blue-600 text-white">
                <Plus className="h-4 w-4 mr-2" /> Add Manual
              </Button>
            </div>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
          {filteredItems.map(item => {
            const img = getItemImage(item)
            const isLow = item.reorderPoint > 0 && item.quantityOnHand <= item.reorderPoint
            const isExpanded = expandedItem === item.id

            return (
              <Card key={item.id} className={`overflow-hidden transition-all duration-200 hover:shadow-lg border ${!item.isActive ? "opacity-60 border-slate-200" : isLow ? "border-red-200 bg-red-50/30" : "border-slate-200 bg-white"}`}>
                {/* Image + Source Badge */}
                <div className="relative bg-slate-50 h-48 flex items-center justify-center group overflow-hidden">
                  {img ? (
                    <img src={img} alt={item.name} className="h-full w-full object-contain p-3 cursor-pointer transition-transform duration-300 group-hover:scale-105" onClick={() => setExpandedImage(img)} />
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-slate-300">
                      <ImageIcon className="h-12 w-12" />
                      <span className="text-xs font-medium">No image</span>
                    </div>
                  )}
                  <div className={`absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider shadow-sm ${item.source === "AMAZON" ? "bg-orange-500 text-white" : "bg-blue-600 text-white"}`}>
                    {item.source === "AMAZON" ? "🛒 Amazon" : "📦 Manual"}
                  </div>
                  {isLow && <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-black bg-red-500 text-white animate-pulse shadow-sm">LOW STOCK</div>}

                  {/* Image upload + active toggle overlays */}
                  <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="secondary" size="icon" className="h-8 w-8 bg-white/90 hover:bg-white shadow-md border"
                      onClick={() => { setSelectedIdForUpload(item.id); fileInputRef.current?.click() }}>
                      {uploadingId === item.id ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                    </Button>
                  </div>
                  <button className="absolute bottom-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => updateItem(item.id, "isActive", !item.isActive)} title={item.isActive ? "Deactivate" : "Activate"}>
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center shadow-md border ${item.isActive ? "bg-green-50 border-green-200 text-green-600" : "bg-slate-50 border-slate-200 text-slate-400"}`}>
                      {item.isActive ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    </div>
                  </button>
                </div>

                {/* Content */}
                <div className="p-4">
                  <h3 className="font-bold text-sm text-slate-900 line-clamp-2 leading-snug mb-1">{item.name}</h3>

                  {/* Identifiers row */}
                  <div className="flex items-center gap-1.5 flex-wrap text-[10px] text-slate-500 mb-3">
                    {item.asin && (
                      <a href={item.amazonUrl || `https://www.amazon.com/dp/${item.asin}`} target="_blank" rel="noopener noreferrer"
                        className="bg-orange-50 text-orange-600 px-1.5 py-0.5 rounded font-mono font-bold hover:bg-orange-100 flex items-center gap-0.5">
                        {item.asin} <ExternalLink className="h-2.5 w-2.5" />
                      </a>
                    )}
                    {item.sku && <span className="bg-slate-100 px-1.5 py-0.5 rounded font-mono font-bold">{item.sku}</span>}
                    {item.upc && <span className="bg-purple-50 text-purple-600 px-1.5 py-0.5 rounded font-mono font-bold">UPC: {item.upc}</span>}
                    {item.ean && <span className="bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded font-mono font-bold">EAN: {item.ean}</span>}
                    {item.category && <span className="bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-bold">{item.category}</span>}
                    {item.location && <span className="bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded font-bold">📍 {item.location}</span>}
                  </div>

                  {/* Quantity Row */}
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <div className="text-center bg-slate-50 rounded-lg py-2 px-1">
                      <p className="text-[9px] font-bold text-slate-400 uppercase">On Hand</p>
                      <p className={`text-lg font-black cursor-pointer hover:text-blue-600 transition-colors ${isLow ? "text-red-600" : "text-slate-800"}`}
                        onClick={() => {
                          const val = prompt("Update quantity on hand:", String(item.quantityOnHand))
                          if (val !== null) updateItem(item.id, "quantityOnHand", val)
                        }}>
                        {item.quantityOnHand}
                      </p>
                    </div>
                    <div className="text-center bg-slate-50 rounded-lg py-2 px-1">
                      <p className="text-[9px] font-bold text-slate-400 uppercase">Reserved</p>
                      <p className="text-lg font-black text-slate-800 cursor-pointer hover:text-blue-600"
                        onClick={() => {
                          const val = prompt("Update reserved quantity:", String(item.quantityReserved))
                          if (val !== null) updateItem(item.id, "quantityReserved", val)
                        }}>
                        {item.quantityReserved}
                      </p>
                    </div>
                    <div className="text-center bg-slate-50 rounded-lg py-2 px-1">
                      <p className="text-[9px] font-bold text-slate-400 uppercase">Available</p>
                      <p className="text-lg font-black text-emerald-600">{item.quantityOnHand - item.quantityReserved}</p>
                    </div>
                  </div>

                  {/* Expand toggle */}
                  <button onClick={() => setExpandedItem(isExpanded ? null : item.id)}
                    className="w-full flex items-center justify-center gap-1 text-[10px] text-slate-400 hover:text-blue-600 font-bold uppercase tracking-wider py-1 transition-colors">
                    {isExpanded ? <>Less <ChevronUp className="h-3 w-3" /></> : <>More <ChevronDown className="h-3 w-3" /></>}
                  </button>

                  {/* Expanded */}
                  {isExpanded && (
                    <div className="border-t pt-3 mt-2 space-y-3 animate-in slide-in-from-top-1 duration-200">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[9px] font-bold text-slate-400 uppercase block mb-0.5">SKU</label>
                          <Input className="h-7 text-xs" value={item.sku || ""} onChange={e => updateItem(item.id, "sku", e.target.value)} placeholder="SKU" />
                        </div>
                        <div>
                          <label className="text-[9px] font-bold text-slate-400 uppercase block mb-0.5">Category</label>
                          <Input className="h-7 text-xs" value={item.category || ""} onChange={e => updateItem(item.id, "category", e.target.value)} placeholder="Category" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[9px] font-bold text-slate-400 uppercase block mb-0.5">UPC</label>
                          <Input className="h-7 text-xs font-mono" value={item.upc || ""} onChange={e => updateItem(item.id, "upc", e.target.value)} placeholder="012345678901" />
                        </div>
                        <div>
                          <label className="text-[9px] font-bold text-slate-400 uppercase block mb-0.5">EAN / IAN</label>
                          <Input className="h-7 text-xs font-mono" value={item.ean || ""} onChange={e => updateItem(item.id, "ean", e.target.value)} placeholder="0123456789012" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[9px] font-bold text-slate-400 uppercase block mb-0.5">Location</label>
                          <Input className="h-7 text-xs" value={item.location || ""} onChange={e => updateItem(item.id, "location", e.target.value)} placeholder="A1T, B3M..." />
                        </div>
                        <div>
                          <label className="text-[9px] font-bold text-slate-400 uppercase block mb-0.5">Unit Cost</label>
                          <Input type="number" step="0.01" className="h-7 text-xs" value={item.unitCost ?? ""} onChange={e => updateItem(item.id, "unitCost", e.target.value)} placeholder="$0.00" />
                        </div>
                      </div>
                      <div>
                        <label className="text-[9px] font-bold text-slate-400 uppercase block mb-0.5">Reorder Point</label>
                        <Input type="number" className="h-7 text-xs" value={item.reorderPoint || ""} onChange={e => updateItem(item.id, "reorderPoint", e.target.value)} placeholder="10" />
                      </div>
                      <div>
                        <label className="text-[9px] font-bold text-slate-400 uppercase block mb-0.5">Notes</label>
                        <textarea className="w-full border rounded-md p-2 text-xs h-16 resize-none focus:outline-none focus:ring-1 focus:ring-blue-200"
                          value={item.notes || ""} onChange={e => updateItem(item.id, "notes", e.target.value)} placeholder="Internal notes..." />
                      </div>
                      {item.lastSyncedAt && (
                        <p className="text-[9px] text-slate-400">Last synced: {new Date(item.lastSyncedAt).toLocaleString()}</p>
                      )}
                      <div className="pt-2 border-t flex justify-end">
                        <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700 hover:bg-red-50 text-[10px] font-bold uppercase tracking-wider"
                          onClick={() => deleteItem(item.id, item.name)}>
                          <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* Summary */}
      {filteredItems.length > 0 && (
        <div className="flex items-center justify-between px-4 py-3 bg-white border rounded-xl shadow-sm text-xs text-slate-500">
          <span>Showing <span className="font-bold text-slate-700">{filteredItems.length}</span> of <span className="font-bold text-slate-700">{items.length}</span> items</span>
          <span>Total on hand: <span className="font-bold text-slate-700">{filteredItems.reduce((sum, i) => sum + i.quantityOnHand, 0).toLocaleString()}</span> units</span>
        </div>
      )}

      {/* Hidden inputs */}
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />

      {/* Expanded Image */}
      <Dialog open={!!expandedImage} onOpenChange={() => setExpandedImage(null)}>
        <DialogContent className="max-w-3xl p-2 bg-white border-0 shadow-2xl">
          {expandedImage && <img src={expandedImage} alt="Product" className="w-full h-auto rounded-lg" />}
        </DialogContent>
      </Dialog>

      {/* Modals */}
      <ManualItemModal isOpen={showManualModal} onClose={() => setShowManualModal(false)} onSubmit={handleCreateManual} />
      <ConfirmModal isOpen={confirmDialog.isOpen} onClose={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
        onConfirm={confirmDialog.onConfirm} title={confirmDialog.title} message={confirmDialog.message} />
    </div>
  )
}
