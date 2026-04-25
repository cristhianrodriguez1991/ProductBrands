"use client"

import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { compressImage } from "@/lib/image-compression"
import {
  ChevronLeft,
  ScanLine,
  Search,
  ChevronRight,
  ImageIcon,
  Plus,
  RefreshCw,
  Camera,
  Trash2,
  Save,
  Zap,
  ArrowUpDown,
  Filter,
  Check,
  X
} from "lucide-react"

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

// ── Helper ──
const getItemImage = (item: InventoryItem) => item.imageUrl || item.amazonImageUrl || null

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")

  // Scan & Expand State
  const [expandedItem, setExpandedItem] = useState<string | null>(null)
  const [scannerInput, setScannerInput] = useState("")
  const [isScanning, setIsScanning] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  
  // File upload state for manual image
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploadingId, setUploadingId] = useState<string | null>(null)
  
  const scannerRef = useRef<HTMLInputElement>(null)

  const fetchItems = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/inventory")
      if (res.ok) {
        const data = await res.json()
        setItems(data)
        return data
      }
    } catch (e) {
      console.error("Fetch failed:", e)
    } finally {
      setLoading(false)
    }
    return []
  }, [])

  // ── Fetch ──
  const syncInventory = useCallback(async (showAlert = true) => {
    setIsSyncing(true)
    try {
      const res = await fetch("/api/admin/inventory/sync", { method: "POST" })
      const data = await res.json()
      
      if (res.ok && data.success !== false) {
        await fetchItems()
        if (showAlert) alert(`✅ Sync response:\nCreated: ${data.created || 0}\nUpdated: ${data.updated || 0}\nMessage: ${data.message || "Done"}`)
      } else {
        if (showAlert) alert("❌ Amazon API Error:\n" + (data.error || "Unknown") + "\nDetails: " + (data.details || ""))
      }
    } catch (e) {
      console.error("Auto-sync failed:", e)
      if (showAlert) alert("❌ Sync request failed to connect to API.")
    } finally {
      setIsSyncing(false)
    }
  }, [fetchItems])

  const wipeInventory = useCallback(async () => {
    if (!confirm("Are you sure you want to DELETE ALL inventory items? This cannot be undone.")) return
    
    setIsSyncing(true)
    try {
      const res = await fetch("/api/admin/inventory/wipe", { method: "DELETE" })
      const data = await res.json().catch(() => ({}))
      
      if (res.ok) {
        await fetchItems()
        alert("🗑️ All inventory has been deleted.")
      } else {
        alert("❌ Failed to wipe inventory: " + (data.error || "Unknown server error"))
      }
    } catch (e: any) {
      console.error(e)
      alert("❌ Wipe request failed: " + e.message)
    } finally {
      setIsSyncing(false)
    }
  }, [fetchItems])

  useEffect(() => {
    fetchItems().then((fetchedItems: InventoryItem[]) => {
      // Auto-sync protection logic (every 24 hours max) to prevent Amazon API blocks
      if (fetchedItems && fetchedItems.length > 0) {
        const latestSync = fetchedItems.reduce((latest, item) => {
          if (!item.lastSyncedAt) return latest
          const current = new Date(item.lastSyncedAt).getTime()
          return current > latest ? current : latest
        }, 0)

        // 24 hours in milliseconds
        const twentyFourHoursAgo = Date.now() - 86400000
        
        if (latestSync === 0 || latestSync < twentyFourHoursAgo) {
          syncInventory(false) // Auto-sync in background
        }
      } else {
        // If DB is empty, sync immediately
        syncInventory(false)
      }
    })
  }, [fetchItems, syncInventory])

  // ── Scanner Lookup ──
  const handleScanSubmit = async (codeOverride?: string) => {
    const code = (codeOverride || searchQuery || scannerInput).trim()
    if (!code) return

    setIsScanning(true)
    try {
      const res = await fetch(`/api/admin/inventory/lookup?code=${encodeURIComponent(code)}`)
      const data = await res.json()

      if (data.found && data.item) {
        // Scroll to and expand the requested item
        setSearchQuery("") // Clear search to ensure visible
        setExpandedItem(data.item.id)
        setTimeout(() => {
          document.getElementById(`item-${data.item.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }, 100)
      } else {
        alert(`No item found for barcode: ${code}`)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setIsScanning(false)
      setScannerInput("")
    }
  }

  // ── Item Actions ──
  const updateItem = async (id: string, field: string, value: any) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, [field]: value } : i)))
    try {
      await fetch(`/api/admin/inventory/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      })
    } catch (e) {
      console.error(e)
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !expandedItem) return
    setUploadingId(expandedItem)
    const renderUpload = async (imgData: string) => {
      await updateItem(expandedItem, "imageUrl", imgData)
      setUploadingId(null)
    }
    
    try {
      const compressed = await compressImage(file, 800, 0.8)
      const reader = new FileReader()
      reader.onloadend = () => renderUpload(reader.result as string)
      reader.readAsDataURL(compressed)
    } catch {
      const reader = new FileReader()
      reader.onloadend = () => renderUpload(reader.result as string)
      reader.readAsDataURL(file)
    }
    e.target.value = ""
  }

  // ── Rendering States ──
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false)
  const [sortBy, setSortBy] = useState<"NAME_ASC" | "NAME_DESC" | "CREATED_DESC" | "CREATED_ASC" | "STOCK_DESC" | "STOCK_ASC" | "DEFAULT">("DEFAULT")
  const [statusFilter, setStatusFilter] = useState("ALL")
  const [fulfillmentFilter, setFulfillmentFilter] = useState("ALL")
  const [pushOutofStockToBottom, setPushOutofStockToBottom] = useState(true)

  // ── Processing (Search, Filter, Sort) ──
  const processedItems = useMemo(() => {
    return [...items]
      .filter((item) => {
        // 1. Text Search
        if (searchQuery) {
          const q = searchQuery.toLowerCase()
          const matches = 
            item.name?.toLowerCase().includes(q) ||
            item.sku?.toLowerCase().includes(q) ||
            item.asin?.toLowerCase().includes(q) ||
            item.upc?.toLowerCase().includes(q)
          if (!matches) return false
        }

        // 2. Status Filter
        if (statusFilter !== "ALL") {
          if (statusFilter === "ACTIVE" && !item.isActive) return false
          if (statusFilter === "INACTIVE" && item.isActive) return false
          if (statusFilter === "OUT_OF_STOCK") {
            const s = (item.quantityOnHand || 0) + (item.quantityReserved || 0)
            if (s > 0) return false
          }
          if (statusFilter === "INCOMPLETE") {
            const amzStatus = (item as any).amazonStatus?.toLowerCase() || ""
            if (!amzStatus.includes("incomplete")) return false
          }
        }

        // 3. Fulfillment Filter
        if (fulfillmentFilter !== "ALL") {
          const channel = (item as any).fulfillmentChannel?.toUpperCase() || ""
          if (fulfillmentFilter === "AMAZON" && !channel.includes("AMAZON")) return false
          if (fulfillmentFilter === "MERCHANT" && !channel.includes("MERCHANT")) return false
        }

        return true
      })
      .sort((a, b) => {
        if (pushOutofStockToBottom) {
          const aTotal = (a.quantityOnHand || 0) + (a.quantityReserved || 0)
          const bTotal = (b.quantityOnHand || 0) + (b.quantityReserved || 0)
          if (aTotal > 0 && bTotal === 0) return -1
          if (aTotal === 0 && bTotal > 0) return 1
        }

        switch (sortBy) {
          case "NAME_ASC": return a.name.localeCompare(b.name)
          case "NAME_DESC": return b.name.localeCompare(a.name)
          case "STOCK_DESC": return (b.quantityOnHand + (b.quantityReserved||0)) - (a.quantityOnHand + (a.quantityReserved||0))
          case "STOCK_ASC": return (a.quantityOnHand + (a.quantityReserved||0)) - (b.quantityOnHand + (b.quantityReserved||0))
          case "CREATED_DESC": return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
          case "CREATED_ASC": return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime()
          default: return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
        }
      })
  }, [items, searchQuery, statusFilter, fulfillmentFilter, pushOutofStockToBottom, sortBy])

  // ── Counts for Filters ──
  const filterCounts = useMemo(() => {
    return {
      all: items.length,
      active: items.filter(i => i.isActive).length,
      inactive: items.filter(i => (i.source === 'AMAZON' && !i.isActive)).length,
      outOfStock: items.filter(i => (i.quantityOnHand + (i.quantityReserved || 0)) === 0).length,
      amazon: items.filter(i => ((i as any).fulfillmentChannel || '').toUpperCase().includes('AMAZON')).length,
      merchant: items.filter(i => ((i as any).fulfillmentChannel || '').toUpperCase().includes('MERCHANT')).length,
    }
  }, [items])

  return (
    <div className="min-h-screen bg-slate-50 font-sans sm:pb-20 -mx-4 -mt-4 md:-mx-8 md:-mt-8">
      
      {/* HEADER - Sticky and Opaque */}
      <div className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-md">
        <div className="flex items-center justify-between px-2 h-14 bg-white">
          <Button variant="ghost" size="icon" className="text-slate-600 hover:bg-slate-100">
            <ChevronLeft className="h-6 w-6" />
          </Button>
          <h1 className="text-lg font-bold text-slate-800 absolute left-1/2 -translate-x-1/2">
            Manage Inventory
          </h1>
          <div className="flex items-center space-x-1">
            <Button variant="ghost" size="icon" onClick={() => wipeInventory()} disabled={isSyncing} className="text-red-500 hover:bg-red-50" title="Wipe">
               <Trash2 className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => syncInventory(true)} disabled={isSyncing} className="text-slate-500 hover:bg-slate-100">
              <RefreshCw className={`h-5 w-5 ${isSyncing ? "animate-spin text-blue-600" : ""}`} />
            </Button>
          </div>
        </div>

        <div className="px-3 pb-3 pt-1 border-t border-slate-100">
          <div className="flex items-center space-x-4 mb-2 px-1 text-sm text-slate-600">
            <div className="font-semibold text-slate-800">
              <span className="text-slate-500 font-normal mr-1">Total Listings:</span> {items.length}
            </div>
            <div className="font-semibold text-blue-600">
              <span className="text-slate-500 font-normal mr-1">Total Items:</span>
              {items.reduce((acc, curr) => acc + (curr.quantityOnHand || 0) + (curr.quantityReserved || 0), 0).toLocaleString()}
            </div>
          </div>

          <div className="flex gap-2">
            <div className="relative flex-1 flex items-center bg-white border border-slate-300 rounded-lg focus-within:ring-2 focus-within:ring-blue-500 shadow-sm">
              <div className="pl-3 py-2 text-slate-400"><Search className="h-5 w-5" /></div>
              <input
                type="text"
                placeholder="Search or scan..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent border-none focus:outline-none px-3 py-2.5 text-sm"
              />
              <Button variant="ghost" size="icon" onClick={() => setIsScanning(true)} className="h-full rounded-none px-3 text-slate-400">
                <ScanLine className="h-5 w-5" />
              </Button>
            </div>
            <Button variant="outline" className="px-3 shrink-0" onClick={() => setIsFilterModalOpen(true)}>
              <ArrowUpDown className="h-4 w-4 mr-2" /> Sort
            </Button>
          </div>
        </div>
      </div>

      {/* FILTER DIALOG */}
      <Dialog open={isFilterModalOpen} onOpenChange={setIsFilterModalOpen}>
        <DialogContent className="max-w-md p-0 overflow-hidden bg-white sm:rounded-xl">
          <div className="flex items-center justify-between px-4 h-14 border-b">
             <button onClick={() => setIsFilterModalOpen(false)} className="text-blue-600 text-sm font-medium">Cancel</button>
             <h2 className="font-bold text-slate-800">Filter</h2>
             <button onClick={() => setIsFilterModalOpen(false)} className="text-blue-600 text-sm font-bold">Apply</button>
          </div>
          <div className="max-h-[80vh] overflow-y-auto">
            <div className="px-4 py-2 bg-slate-50 text-[11px] font-bold text-slate-500 uppercase border-b">Status</div>
            {[
              { id: "ALL", label: "All", count: filterCounts.all },
              { id: "ACTIVE", label: "Active", count: filterCounts.active },
              { id: "INACTIVE", label: "Inactive", count: filterCounts.inactive },
              { id: "OUT_OF_STOCK", label: "Out of stock", count: filterCounts.outOfStock },
              { id: "INCOMPLETE", label: "Incomplete", count: 0 },
            ].map((opt) => (
              <button key={opt.id} onClick={() => setStatusFilter(opt.id)} className="w-full flex items-center justify-between px-4 py-3.5 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-3">
                  <span className={`text-[15px] ${statusFilter === opt.id ? "font-bold text-slate-900" : "text-slate-700"}`}>{opt.label}</span>
                  <span className="text-[12px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full">{opt.count}</span>
                </div>
                {statusFilter === opt.id && <Check className="h-4 w-4 text-orange-500" />}
              </button>
            ))}
            <div className="px-4 py-2 bg-slate-50 text-[11px] font-bold text-slate-500 uppercase border-b mt-2">Fulfilled By</div>
            {[
              { id: "ALL", label: "All", count: filterCounts.all },
              { id: "AMAZON", label: "Amazon", count: filterCounts.amazon },
              { id: "MERCHANT", label: "Merchant", count: filterCounts.merchant },
            ].map((opt) => (
              <button key={opt.id} onClick={() => setFulfillmentFilter(opt.id)} className="w-full flex items-center justify-between px-4 py-3.5 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-3">
                  <span className={`text-[15px] ${fulfillmentFilter === opt.id ? "font-bold text-slate-900" : "text-slate-700"}`}>{opt.label}</span>
                  <span className="text-[12px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full">{opt.count}</span>
                </div>
                {fulfillmentFilter === opt.id && <Check className="h-4 w-4 text-orange-500" />}
              </button>
            ))}
            <div className="px-4 py-2 bg-slate-50 text-[11px] font-bold text-slate-500 uppercase border-b mt-2">Sort Options</div>
            <div className="p-4">
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)} className="w-full border-slate-300 rounded-lg text-sm p-3 bg-white border outline-none shadow-sm h-12">
                <option value="DEFAULT">Default (Newest First)</option>
                <option value="NAME_ASC">Name (A-Z)</option>
                <option value="NAME_DESC">Name (Z-A)</option>
                <option value="STOCK_DESC">Stock (High to Low)</option>
                <option value="STOCK_ASC">Stock (Low to High)</option>
                <option value="CREATED_DESC">Creation (Newest First)</option>
                <option value="CREATED_ASC">Creation (Oldest First)</option>
              </select>
              <div className="mt-4">
                <label className="flex items-center justify-between group cursor-pointer">
                  <span className="text-sm text-slate-700">Push "Out of Stock" to Bottom</span>
                  <input type="checkbox" checked={pushOutofStockToBottom} onChange={(e) => setPushOutofStockToBottom(e.target.checked)} className="h-5 w-5 rounded border-slate-300 text-blue-600" />
                </label>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* LIST CONTAINER */}
      <div className="bg-white">
        {loading ? (
          <div className="py-12 flex justify-center items-center flex-col text-slate-500">
            <RefreshCw className="h-8 w-8 animate-spin mb-4" /> Loading inventory...
          </div>
        ) : processedItems.length === 0 ? (
          <div className="py-12 text-center text-slate-500">No items found.</div>
        ) : (
          <div className="flex flex-col">
            {processedItems.map((item) => {
              const isExpanded = expandedItem === item.id
              const img = getItemImage(item)
              const showInactiveBadge = !item.isActive || item.quantityOnHand <= 0
              return (
                <div key={item.id} id={`item-` + item.id} className="border-b border-slate-200 bg-white">
                  <div className="p-4 cursor-pointer hover:bg-slate-50 flex flex-col" onClick={() => setExpandedItem(isExpanded ? null : item.id)}>
                    {showInactiveBadge && (
                      <div className="mb-2">
                        <span className="bg-orange-500 text-white text-[11px] font-bold px-2 py-0.5 rounded uppercase tracking-wide">
                          {!item.isActive ? "Inactive" : "Out of Stock"}
                        </span>
                      </div>
                    )}
                    <h3 className="font-bold text-[14px] text-slate-900 leading-snug line-clamp-2 mb-3 pr-4">{item.name}</h3>
                    <div className="flex items-start justify-between">
                      <div className="flex gap-4 flex-1">
                        <div className="w-[72px] h-[72px] bg-white border border-slate-200 rounded shrink-0 flex items-center justify-center overflow-hidden">
                          {img ? <img src={img} alt="" className="max-w-full max-h-full object-contain p-1" /> : <ImageIcon className="h-6 w-6 text-slate-200" />}
                        </div>
                        <div className="flex flex-col text-[13px] text-slate-600 gap-[2px] leading-tight">
                          <div>Available: <span className="font-bold text-slate-900">{item.quantityOnHand}</span></div>
                          {item.sku && <div className="truncate max-w-[180px]">SKU: {item.sku}</div>}
                          {item.asin && <div>ASIN: {item.asin}</div>}
                          {item.upc && <div>UPC: {item.upc}</div>}
                        </div>
                      </div>
                      <ChevronRight className={`h-5 w-5 text-slate-400 self-center transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="bg-slate-50 border-t p-4 space-y-4 animate-in slide-in-from-top-2">
                      <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
                        <Button variant="outline" size="sm" className="text-xs h-8" onClick={() => updateItem(item.id, "isActive", !item.isActive)}>
                          {item.isActive ? "Deactivate" : "Activate"}
                        </Button>
                        <Button variant="outline" size="sm" className="text-xs h-8" onClick={() => {
                          const val = prompt("New quantity:", String(item.quantityOnHand))
                          if (val !== null) updateItem(item.id, "quantityOnHand", parseInt(val) || 0)
                        }}> <Zap className="h-3 w-3 mr-1" /> Qty </Button>
                        <Button variant="outline" size="sm" className="text-xs h-8 ml-auto" onClick={() => fileInputRef.current?.click()}>
                          {uploadingId === item.id ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Camera className="h-3 w-3" />}
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-[12px]">
                        <div><label className="font-bold text-slate-500 uppercase text-[10px]">UPC</label><Input className="h-8 text-[13px]" value={item.upc||""} onChange={(e)=>updateItem(item.id, "upc", e.target.value)} /></div>
                        <div><label className="font-bold text-slate-500 uppercase text-[10px]">SKU</label><Input className="h-8 text-[13px]" value={item.sku||""} onChange={(e)=>updateItem(item.id, "sku", e.target.value)} /></div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />

      {/* MOBILE ACTIONS */}
      <div className="fixed bottom-0 left-0 right-0 h-14 bg-[#1b2633] text-slate-300 md:hidden flex divide-x divide-slate-700 z-40">
        <button className="flex-1 flex items-center justify-center flex-col gap-1 hover:text-white" onClick={()=>setIsFilterModalOpen(true)}>
          <ArrowUpDown className="h-4 w-4" />
          <span className="text-[10px]">Sort</span>
        </button>
        <button className="flex-1 flex items-center justify-center flex-col gap-1 text-blue-400" onClick={()=>setIsFilterModalOpen(true)}>
          <Filter className="h-4 w-4" />
          <span className="text-[10px]">Filter</span>
        </button>
      </div>

    </div>
  )
}
