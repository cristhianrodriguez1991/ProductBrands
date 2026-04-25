"use client"

import { useState, useEffect, useRef } from "react"
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
  Star,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import Image from "next/image"
import { compressImage } from "@/lib/image-compression"

// ── Types ──
type InventoryItem = {
  id: string
  source: "AMAZON" | "MANUAL"
  asin: string | null
  amazonTitle: string | null
  amazonImageUrl: string | null
  amazonPrice: number | null
  amazonUrl: string | null
  amazonRating: number | null
  amazonReviewCount: number | null
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
  unitPrice: number | null
  isActive: boolean
  notes: string | null
  lastSyncedAt: string | null
  createdAt: string
  updatedAt: string
}

// ── Confirmation Modal ──
const ConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
}: any) => (
  <Dialog open={isOpen} onOpenChange={onClose}>
    <DialogContent className="sm:max-w-[420px] p-0 overflow-hidden border-0 shadow-2xl">
      <div className="bg-white p-6 pt-8 text-center">
        <div className="mx-auto w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-4 animate-bounce">
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
          <Button
            variant="ghost"
            onClick={onClose}
            className="h-11 font-black uppercase tracking-widest text-[10px] text-slate-400 hover:bg-slate-50"
          >
            Cancel
          </Button>
          <Button
            onClick={() => {
              onConfirm()
              onClose()
            }}
            className="h-11 bg-red-600 hover:bg-red-700 text-white font-black uppercase tracking-widest text-[10px] shadow-lg shadow-red-200"
          >
            Confirm Delete
          </Button>
        </div>
      </div>
    </DialogContent>
  </Dialog>
)

// ── Amazon ASIN Input Modal ──
const AsinInputModal = ({
  isOpen,
  onClose,
  onSubmit,
  isSyncing,
}: {
  isOpen: boolean
  onClose: () => void
  onSubmit: (asins: string[]) => void
  isSyncing: boolean
}) => {
  const [asinText, setAsinText] = useState("")

  const handleSubmit = () => {
    const asins = asinText
      .split(/[\n,;\s]+/)
      .map((a) => a.trim().toUpperCase())
      .filter((a) => a.length > 0 && /^[A-Z0-9]{10}$/.test(a))
    if (asins.length === 0) {
      alert("Please enter at least one valid ASIN (10 characters)")
      return
    }
    onSubmit(asins)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden border-0 shadow-2xl">
        <div className="bg-white p-6">
          <DialogHeader className="p-0 mb-4">
            <DialogTitle className="text-lg font-black text-slate-900 flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-orange-500" />
              Import from Amazon
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-500 mb-4">
            Enter Amazon ASINs (one per line or comma-separated). The system
            will fetch product details, images, and pricing automatically.
          </p>
          <textarea
            className="w-full h-40 border rounded-lg p-3 text-sm font-mono placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-400 resize-none"
            placeholder={"B0XXXXXXXXX\nB0YYYYYYYYY\nB0ZZZZZZZZZ"}
            value={asinText}
            onChange={(e) => setAsinText(e.target.value)}
          />
          <div className="flex items-center justify-between mt-4">
            <span className="text-xs text-slate-400">
              {
                asinText
                  .split(/[\n,;\s]+/)
                  .filter((a) => a.trim().length > 0).length
              }{" "}
              ASINs entered
            </span>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                onClick={onClose}
                className="text-xs font-bold uppercase tracking-wider"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isSyncing}
                className="bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs uppercase tracking-wider px-6"
              >
                {isSyncing ? (
                  <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <ShoppingCart className="h-4 w-4 mr-2" />
                )}
                {isSyncing ? "Importing..." : "Import"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ── Manual Item Modal ──
const ManualItemModal = ({
  isOpen,
  onClose,
  onSubmit,
}: {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: any) => void
}) => {
  const [form, setForm] = useState({
    name: "",
    sku: "",
    category: "",
    location: "",
    quantityOnHand: "",
    unitCost: "",
    unitPrice: "",
    reorderPoint: "",
    description: "",
    notes: "",
  })

  const handleSubmit = () => {
    if (!form.name.trim()) {
      alert("Product name is required")
      return
    }
    onSubmit(form)
    setForm({
      name: "",
      sku: "",
      category: "",
      location: "",
      quantityOnHand: "",
      unitCost: "",
      unitPrice: "",
      reorderPoint: "",
      description: "",
      notes: "",
    })
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
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">
                Product Name *
              </label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Coffee Beans 1lb Bag"
                className="border-slate-200 focus:border-blue-400"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">
                  SKU
                </label>
                <Input
                  value={form.sku}
                  onChange={(e) => setForm({ ...form, sku: e.target.value })}
                  placeholder="SKU-001"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">
                  Category
                </label>
                <Input
                  value={form.category}
                  onChange={(e) =>
                    setForm({ ...form, category: e.target.value })
                  }
                  placeholder="Coffee, Snacks..."
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">
                  Location
                </label>
                <Input
                  value={form.location}
                  onChange={(e) =>
                    setForm({ ...form, location: e.target.value })
                  }
                  placeholder="A1T, B3M..."
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">
                  Qty On Hand
                </label>
                <Input
                  type="number"
                  value={form.quantityOnHand}
                  onChange={(e) =>
                    setForm({ ...form, quantityOnHand: e.target.value })
                  }
                  placeholder="0"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">
                  Unit Cost
                </label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.unitCost}
                  onChange={(e) =>
                    setForm({ ...form, unitCost: e.target.value })
                  }
                  placeholder="$0.00"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">
                  Unit Price
                </label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.unitPrice}
                  onChange={(e) =>
                    setForm({ ...form, unitPrice: e.target.value })
                  }
                  placeholder="$0.00"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">
                  Reorder Point
                </label>
                <Input
                  type="number"
                  value={form.reorderPoint}
                  onChange={(e) =>
                    setForm({ ...form, reorderPoint: e.target.value })
                  }
                  placeholder="10"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">
                Description
              </label>
              <textarea
                className="w-full border rounded-lg p-2.5 text-sm resize-none h-20 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                placeholder="Brief product description..."
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">
                Notes
              </label>
              <textarea
                className="w-full border rounded-lg p-2.5 text-sm resize-none h-16 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Internal notes..."
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
            <Button
              variant="ghost"
              onClick={onClose}
              className="text-xs font-bold uppercase tracking-wider"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider px-6"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Item
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ── Stat Card Component ──
const StatCard = ({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string
  value: string | number
  icon: any
  color: string
}) => (
  <div
    className={`flex items-center gap-3 px-4 py-3 rounded-xl border bg-white shadow-sm`}
  >
    <div
      className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}
    >
      <Icon className="h-5 w-5 text-white" />
    </div>
    <div>
      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
        {label}
      </p>
      <p className="text-xl font-black text-slate-800">{value}</p>
    </div>
  </div>
)

// ── Main Inventory Page ──
export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterSource, setFilterSource] = useState<"ALL" | "AMAZON" | "MANUAL">(
    "ALL"
  )
  const [filterActive, setFilterActive] = useState<
    "ALL" | "ACTIVE" | "INACTIVE"
  >("ACTIVE")
  const [isSyncing, setIsSyncing] = useState(false)
  const [showAsinModal, setShowAsinModal] = useState(false)
  const [showManualModal, setShowManualModal] = useState(false)

  const [editingItem, setEditingItem] = useState<string | null>(null)
  const [expandedItem, setExpandedItem] = useState<string | null>(null)
  const [expandedImage, setExpandedImage] = useState<string | null>(null)
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">(
    "idle"
  )
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
  })

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedIdForUpload, setSelectedIdForUpload] = useState<string | null>(
    null
  )
  const [uploadingId, setUploadingId] = useState<string | null>(null)

  // ── Fetch Items ──
  const fetchItems = async () => {
    try {
      const res = await fetch("/api/admin/inventory")
      if (res.ok) {
        const data = await res.json()
        setItems(data)
      }
    } catch (e) {
      console.error("Failed to fetch inventory:", e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchItems()
  }, [])

  // ── Amazon Sync ──
  const handleAmazonSync = async (asins?: string[]) => {
    setIsSyncing(true)
    try {
      const res = await fetch("/api/admin/inventory/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(asins ? { asins } : {}),
      })
      const data = await res.json()
      if (res.ok) {
        setShowAsinModal(false)
        await fetchItems()
        alert(
          `✅ Sync complete!\n${data.created || 0} new items imported\n${data.synced || 0} items updated`
        )
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
      if (res.ok) {
        setShowManualModal(false)
        await fetchItems()
      } else {
        alert("Failed to create item")
      }
    } catch (e) {
      alert("Error creating item")
    }
  }

  // ── Update Item ──
  const updateItem = async (id: string, field: string, value: any) => {
    setSaveStatus("saving")
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, [field]: value } : i))
    )

    try {
      await fetch(`/api/admin/inventory/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      })
      setSaveStatus("saved")
      setTimeout(() => setSaveStatus("idle"), 2000)
    } catch (e) {
      setSaveStatus("idle")
    }
  }

  // ── Delete Item ──
  const deleteItem = (id: string, name: string) => {
    setConfirmDialog({
      isOpen: true,
      title: "Delete Item?",
      message: `Are you sure you want to permanently delete "${name}"? This cannot be undone.`,
      onConfirm: async () => {
        try {
          await fetch(`/api/admin/inventory/${id}`, { method: "DELETE" })
          setItems((prev) => prev.filter((i) => i.id !== id))
        } catch (e) {
          alert("Error deleting item")
        }
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
        const base64 = reader.result as string
        await updateItem(selectedIdForUpload, "imageUrl", base64)
        setUploadingId(null)
      }
      reader.readAsDataURL(compressed)
    } catch {
      // Fallback: read original file
      const reader = new FileReader()
      reader.onloadend = async () => {
        const base64 = reader.result as string
        await updateItem(selectedIdForUpload!, "imageUrl", base64)
        setUploadingId(null)
      }
      reader.readAsDataURL(file)
    }
    e.target.value = ""
  }

  // ── Filtering ──
  const filteredItems = items.filter((item) => {
    if (filterSource !== "ALL" && item.source !== filterSource) return false
    if (filterActive === "ACTIVE" && !item.isActive) return false
    if (filterActive === "INACTIVE" && item.isActive) return false
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      return (
        item.name?.toLowerCase().includes(q) ||
        item.sku?.toLowerCase().includes(q) ||
        item.asin?.toLowerCase().includes(q) ||
        item.category?.toLowerCase().includes(q) ||
        item.location?.toLowerCase().includes(q)
      )
    }
    return true
  })

  // ── Stats ──
  const totalItems = items.filter((i) => i.isActive).length
  const amazonItems = items.filter(
    (i) => i.source === "AMAZON" && i.isActive
  ).length
  const manualItems = items.filter(
    (i) => i.source === "MANUAL" && i.isActive
  ).length
  const lowStockItems = items.filter(
    (i) => i.isActive && i.reorderPoint > 0 && i.quantityOnHand <= i.reorderPoint
  ).length

  // ── Get display image ──
  const getItemImage = (item: InventoryItem) =>
    item.imageUrl || item.amazonImageUrl || null

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-500" />
          <p className="text-sm text-slate-500 font-medium">
            Loading inventory...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Boxes className="h-7 w-7 text-blue-600" />
            Inventory
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage your Amazon and warehouse inventory in one place
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

          <Button
            variant="outline"
            onClick={() => handleAmazonSync()}
            disabled={
              isSyncing ||
              items.filter((i) => i.source === "AMAZON").length === 0
            }
            className="text-xs font-bold uppercase tracking-wider border-orange-200 text-orange-600 hover:bg-orange-50"
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${isSyncing ? "animate-spin" : ""}`}
            />
            Refresh Amazon
          </Button>
          <Button
            onClick={() => setShowAsinModal(true)}
            className="bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs uppercase tracking-wider"
          >
            <ShoppingCart className="h-4 w-4 mr-2" />
            Import from Amazon
          </Button>
          <Button
            onClick={() => setShowManualModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Manual Item
          </Button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          label="Total Items"
          value={totalItems}
          icon={Boxes}
          color="bg-blue-600"
        />
        <StatCard
          label="Amazon"
          value={amazonItems}
          icon={ShoppingCart}
          color="bg-orange-500"
        />
        <StatCard
          label="Manual/Warehouse"
          value={manualItems}
          icon={Package}
          color="bg-emerald-600"
        />
        <StatCard
          label="Low Stock"
          value={lowStockItems}
          icon={AlertTriangle}
          color={lowStockItems > 0 ? "bg-red-500" : "bg-slate-400"}
        />
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          <Input
            placeholder="Search by name, SKU, ASIN, category, location..."
            className="pl-10 text-sm border-slate-200"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-slate-200 overflow-hidden bg-white shadow-sm">
            {(["ALL", "AMAZON", "MANUAL"] as const).map((src) => (
              <button
                key={src}
                onClick={() => setFilterSource(src)}
                className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-wider transition-all ${
                  filterSource === src
                    ? "bg-slate-800 text-white"
                    : "text-slate-500 hover:bg-slate-50"
                }`}
              >
                {src === "ALL"
                  ? "All"
                  : src === "AMAZON"
                    ? "🛒 Amazon"
                    : "📦 Manual"}
              </button>
            ))}
          </div>
          <div className="flex rounded-lg border border-slate-200 overflow-hidden bg-white shadow-sm">
            {(["ACTIVE", "INACTIVE", "ALL"] as const).map((status) => (
              <button
                key={status}
                onClick={() => setFilterActive(status)}
                className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-wider transition-all ${
                  filterActive === status
                    ? "bg-slate-800 text-white"
                    : "text-slate-500 hover:bg-slate-50"
                }`}
              >
                {status === "ALL"
                  ? "All"
                  : status === "ACTIVE"
                    ? "Active"
                    : "Inactive"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Inventory Grid */}
      {filteredItems.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-16 border-dashed">
          <Boxes className="h-16 w-16 text-slate-200 mb-4" />
          <h3 className="text-lg font-bold text-slate-400">
            No items found
          </h3>
          <p className="text-sm text-slate-400 mt-1 text-center max-w-sm">
            {items.length === 0
              ? "Start by importing from Amazon or adding manual warehouse items."
              : "No items match your current filters."}
          </p>
          {items.length === 0 && (
            <div className="flex gap-2 mt-4">
              <Button
                variant="outline"
                onClick={() => setShowAsinModal(true)}
                className="text-xs font-bold text-orange-600 border-orange-200"
              >
                <ShoppingCart className="h-4 w-4 mr-2" />
                Import Amazon
              </Button>
              <Button
                onClick={() => setShowManualModal(true)}
                className="text-xs font-bold bg-blue-600 text-white"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Manual
              </Button>
            </div>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
          {filteredItems.map((item) => {
            const img = getItemImage(item)
            const isLow =
              item.reorderPoint > 0 &&
              item.quantityOnHand <= item.reorderPoint
            const isExpanded = expandedItem === item.id

            return (
              <Card
                key={item.id}
                className={`overflow-hidden transition-all duration-200 hover:shadow-lg border ${
                  !item.isActive
                    ? "opacity-60 border-slate-200"
                    : isLow
                      ? "border-red-200 bg-red-50/30"
                      : "border-slate-200 bg-white"
                }`}
              >
                {/* Image + Source Badge */}
                <div className="relative bg-slate-50 h-48 flex items-center justify-center group overflow-hidden">
                  {img ? (
                    <img
                      src={img}
                      alt={item.name}
                      className="h-full w-full object-contain p-3 cursor-pointer transition-transform duration-300 group-hover:scale-105"
                      onClick={() => setExpandedImage(img)}
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-slate-300">
                      <ImageIcon className="h-12 w-12" />
                      <span className="text-xs font-medium">No image</span>
                    </div>
                  )}

                  {/* Source badge */}
                  <div
                    className={`absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider shadow-sm ${
                      item.source === "AMAZON"
                        ? "bg-orange-500 text-white"
                        : "bg-blue-600 text-white"
                    }`}
                  >
                    {item.source === "AMAZON" ? "🛒 Amazon" : "📦 Manual"}
                  </div>

                  {/* Low stock warning */}
                  {isLow && (
                    <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-black bg-red-500 text-white animate-pulse shadow-sm">
                      LOW STOCK
                    </div>
                  )}

                  {/* Image upload overlay */}
                  <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="secondary"
                      size="icon"
                      className="h-8 w-8 bg-white/90 hover:bg-white shadow-md border"
                      onClick={() => {
                        setSelectedIdForUpload(item.id)
                        fileInputRef.current?.click()
                      }}
                    >
                      {uploadingId === item.id ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <Camera className="h-4 w-4" />
                      )}
                    </Button>
                  </div>

                  {/* Active/inactive toggle */}
                  <button
                    className="absolute bottom-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() =>
                      updateItem(item.id, "isActive", !item.isActive)
                    }
                    title={item.isActive ? "Deactivate" : "Activate"}
                  >
                    <div
                      className={`h-8 w-8 rounded-full flex items-center justify-center shadow-md border ${item.isActive ? "bg-green-50 border-green-200 text-green-600" : "bg-slate-50 border-slate-200 text-slate-400"}`}
                    >
                      {item.isActive ? (
                        <Eye className="h-4 w-4" />
                      ) : (
                        <EyeOff className="h-4 w-4" />
                      )}
                    </div>
                  </button>
                </div>

                {/* Content */}
                <div className="p-4">
                  {/* Title */}
                  <h3 className="font-bold text-sm text-slate-900 line-clamp-2 leading-snug mb-1">
                    {item.name}
                  </h3>

                  {/* Meta row */}
                  <div className="flex items-center gap-2 flex-wrap text-[10px] text-slate-500 mb-3">
                    {item.sku && (
                      <span className="bg-slate-100 px-1.5 py-0.5 rounded font-mono font-bold">
                        {item.sku}
                      </span>
                    )}
                    {item.asin && (
                      <a
                        href={
                          item.amazonUrl ||
                          `https://www.amazon.com/dp/${item.asin}`
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-orange-50 text-orange-600 px-1.5 py-0.5 rounded font-mono font-bold hover:bg-orange-100 flex items-center gap-0.5"
                      >
                        {item.asin}
                        <ExternalLink className="h-2.5 w-2.5" />
                      </a>
                    )}
                    {item.category && (
                      <span className="bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-bold">
                        {item.category}
                      </span>
                    )}
                    {item.location && (
                      <span className="bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded font-bold">
                        📍 {item.location}
                      </span>
                    )}
                  </div>

                  {/* Amazon rating */}
                  {item.amazonRating && (
                    <div className="flex items-center gap-1 mb-3">
                      <div className="flex items-center">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`h-3 w-3 ${
                              star <= Math.round(item.amazonRating!)
                                ? "text-amber-400 fill-amber-400"
                                : "text-slate-200"
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-[10px] text-slate-500 font-medium">
                        {item.amazonRating}
                        {item.amazonReviewCount
                          ? ` (${item.amazonReviewCount.toLocaleString()})`
                          : ""}
                      </span>
                    </div>
                  )}

                  {/* Quantity + Price row */}
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <div className="text-center bg-slate-50 rounded-lg py-2 px-1">
                      <p className="text-[9px] font-bold text-slate-400 uppercase">
                        On Hand
                      </p>
                      {editingItem === item.id ? (
                        <Input
                          type="number"
                          className="h-6 text-xs text-center border-0 bg-transparent p-0 font-black"
                          value={item.quantityOnHand}
                          onChange={(e) =>
                            updateItem(
                              item.id,
                              "quantityOnHand",
                              e.target.value
                            )
                          }
                        />
                      ) : (
                        <p
                          className={`text-lg font-black cursor-pointer hover:text-blue-600 transition-colors ${isLow ? "text-red-600" : "text-slate-800"}`}
                          onClick={() => setEditingItem(item.id)}
                        >
                          {item.quantityOnHand}
                        </p>
                      )}
                    </div>
                    <div className="text-center bg-slate-50 rounded-lg py-2 px-1">
                      <p className="text-[9px] font-bold text-slate-400 uppercase">
                        Reserved
                      </p>
                      {editingItem === item.id ? (
                        <Input
                          type="number"
                          className="h-6 text-xs text-center border-0 bg-transparent p-0 font-black"
                          value={item.quantityReserved}
                          onChange={(e) =>
                            updateItem(
                              item.id,
                              "quantityReserved",
                              e.target.value
                            )
                          }
                        />
                      ) : (
                        <p
                          className="text-lg font-black text-slate-800 cursor-pointer hover:text-blue-600"
                          onClick={() => setEditingItem(item.id)}
                        >
                          {item.quantityReserved}
                        </p>
                      )}
                    </div>
                    <div className="text-center bg-slate-50 rounded-lg py-2 px-1">
                      <p className="text-[9px] font-bold text-slate-400 uppercase">
                        Available
                      </p>
                      <p className="text-lg font-black text-emerald-600">
                        {item.quantityOnHand - item.quantityReserved}
                      </p>
                    </div>
                  </div>

                  {/* Price row */}
                  <div className="flex items-center justify-between text-xs mb-3">
                    <div className="flex items-center gap-3">
                      {item.unitCost !== null && (
                        <span className="text-slate-500">
                          Cost:{" "}
                          <span className="font-bold text-slate-700">
                            ${item.unitCost.toFixed(2)}
                          </span>
                        </span>
                      )}
                      {(item.unitPrice || item.amazonPrice) && (
                        <span className="text-slate-500">
                          Price:{" "}
                          <span className="font-bold text-emerald-600">
                            $
                            {(item.unitPrice || item.amazonPrice)?.toFixed(2)}
                          </span>
                        </span>
                      )}
                    </div>
                    {item.lastSyncedAt && (
                      <span
                        className="text-[9px] text-slate-400"
                        title={`Last synced: ${new Date(item.lastSyncedAt).toLocaleString()}`}
                      >
                        Synced{" "}
                        {new Date(item.lastSyncedAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>

                  {/* Expand toggle */}
                  <button
                    onClick={() =>
                      setExpandedItem(isExpanded ? null : item.id)
                    }
                    className="w-full flex items-center justify-center gap-1 text-[10px] text-slate-400 hover:text-blue-600 font-bold uppercase tracking-wider py-1 transition-colors"
                  >
                    {isExpanded ? (
                      <>
                        Less <ChevronUp className="h-3 w-3" />
                      </>
                    ) : (
                      <>
                        More <ChevronDown className="h-3 w-3" />
                      </>
                    )}
                  </button>

                  {/* Expanded details */}
                  {isExpanded && (
                    <div className="border-t pt-3 mt-2 space-y-3 animate-in slide-in-from-top-1 duration-200">
                      {/* Editable fields */}
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[9px] font-bold text-slate-400 uppercase block mb-0.5">
                            SKU
                          </label>
                          <Input
                            className="h-7 text-xs"
                            value={item.sku || ""}
                            onChange={(e) =>
                              updateItem(item.id, "sku", e.target.value)
                            }
                            placeholder="SKU"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-bold text-slate-400 uppercase block mb-0.5">
                            Category
                          </label>
                          <Input
                            className="h-7 text-xs"
                            value={item.category || ""}
                            onChange={(e) =>
                              updateItem(item.id, "category", e.target.value)
                            }
                            placeholder="Category"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[9px] font-bold text-slate-400 uppercase block mb-0.5">
                            Location
                          </label>
                          <Input
                            className="h-7 text-xs"
                            value={item.location || ""}
                            onChange={(e) =>
                              updateItem(item.id, "location", e.target.value)
                            }
                            placeholder="A1T"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-bold text-slate-400 uppercase block mb-0.5">
                            Reorder Point
                          </label>
                          <Input
                            type="number"
                            className="h-7 text-xs"
                            value={item.reorderPoint || ""}
                            onChange={(e) =>
                              updateItem(
                                item.id,
                                "reorderPoint",
                                e.target.value
                              )
                            }
                            placeholder="10"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[9px] font-bold text-slate-400 uppercase block mb-0.5">
                            Unit Cost
                          </label>
                          <Input
                            type="number"
                            step="0.01"
                            className="h-7 text-xs"
                            value={item.unitCost ?? ""}
                            onChange={(e) =>
                              updateItem(item.id, "unitCost", e.target.value)
                            }
                            placeholder="$0.00"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-bold text-slate-400 uppercase block mb-0.5">
                            Unit Price
                          </label>
                          <Input
                            type="number"
                            step="0.01"
                            className="h-7 text-xs"
                            value={item.unitPrice ?? ""}
                            onChange={(e) =>
                              updateItem(item.id, "unitPrice", e.target.value)
                            }
                            placeholder="$0.00"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-[9px] font-bold text-slate-400 uppercase block mb-0.5">
                          Notes
                        </label>
                        <textarea
                          className="w-full border rounded-md p-2 text-xs h-16 resize-none focus:outline-none focus:ring-1 focus:ring-blue-200"
                          value={item.notes || ""}
                          onChange={(e) =>
                            updateItem(item.id, "notes", e.target.value)
                          }
                          placeholder="Internal notes..."
                        />
                      </div>

                      {/* Delete button */}
                      <div className="pt-2 border-t flex justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 text-[10px] font-bold uppercase tracking-wider"
                          onClick={() => deleteItem(item.id, item.name)}
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-1" />
                          Delete Item
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

      {/* Summary bar */}
      {filteredItems.length > 0 && (
        <div className="flex items-center justify-between px-4 py-3 bg-white border rounded-xl shadow-sm text-xs text-slate-500">
          <span>
            Showing{" "}
            <span className="font-bold text-slate-700">
              {filteredItems.length}
            </span>{" "}
            of{" "}
            <span className="font-bold text-slate-700">{items.length}</span>{" "}
            items
          </span>
          <span>
            Total on hand:{" "}
            <span className="font-bold text-slate-700">
              {filteredItems
                .reduce((sum, i) => sum + i.quantityOnHand, 0)
                .toLocaleString()}
            </span>{" "}
            units
          </span>
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleImageUpload}
      />

      {/* Expanded Image Dialog */}
      <Dialog
        open={!!expandedImage}
        onOpenChange={() => setExpandedImage(null)}
      >
        <DialogContent className="max-w-3xl p-2 bg-white border-0 shadow-2xl">
          {expandedImage && (
            <img
              src={expandedImage}
              alt="Product"
              className="w-full h-auto rounded-lg"
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Modals */}
      <AsinInputModal
        isOpen={showAsinModal}
        onClose={() => setShowAsinModal(false)}
        onSubmit={handleAmazonSync}
        isSyncing={isSyncing}
      />
      <ManualItemModal
        isOpen={showManualModal}
        onClose={() => setShowManualModal(false)}
        onSubmit={handleCreateManual}
      />
      <ConfirmModal
        isOpen={confirmDialog.isOpen}
        onClose={() =>
          setConfirmDialog({ ...confirmDialog, isOpen: false })
        }
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        message={confirmDialog.message}
      />
    </div>
  )
}
