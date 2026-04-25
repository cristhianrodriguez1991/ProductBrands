"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
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
      // Auto-sync protection logic (every 12 hours max) to prevent Amazon API blocks
      if (fetchedItems && fetchedItems.length > 0) {
        const latestSync = fetchedItems.reduce((latest, item) => {
          if (!item.lastSyncedAt) return latest
          const current = new Date(item.lastSyncedAt).getTime()
          return current > latest ? current : latest
        }, 0)

        // 12 hours in milliseconds = 12 * 60 * 60 * 1000 = 43200000
        const twelveHoursAgo = Date.now() - 43200000
        
        if (latestSync === 0 || latestSync < twelveHoursAgo) {
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

  // ── Rendering ──
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false)
  const [sortBy, setSortBy] = useState<"NAME_ASC" | "NAME_DESC" | "CREATED_DESC" | "CREATED_ASC" | "STOCK_DESC" | "STOCK_ASC" | "DEFAULT">("DEFAULT")
  const [hideOutOfStock, setHideOutOfStock] = useState(false)
  const [pushOutofStockToBottom, setPushOutofStockToBottom] = useState(true)

  // ── Processing (Search, Filter, Sort) ──
  const processedItems = [...items]
    .filter((item) => {
      // 1. Text Search
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        const matches = 
          item.name?.toLowerCase().includes(q) ||
          item.sku?.toLowerCase().includes(q) ||
          item.asin?.toLowerCase().includes(q) ||
          item.upc?.includes(q)
        if (!matches) return false
      }

      // 2. Hide Out of stock filter
      const totalStock = (item.quantityOnHand || 0) + (item.quantityReserved || 0)
      if (hideOutOfStock && totalStock === 0) return false

      return true
    })
    .sort((a, b) => {
      const aStock = (a.quantityOnHand || 0) + (a.quantityReserved || 0)
      const bStock = (b.quantityOnHand || 0) + (b.quantityReserved || 0)

      // Out of stock segregation
      if (pushOutofStockToBottom) {
        if (aStock === 0 && bStock > 0) return 1
        if (bStock === 0 && aStock > 0) return -1
      }

      // Selected Sort
      if (sortBy === "NAME_ASC") return a.name.localeCompare(b.name)
      if (sortBy === "NAME_DESC") return b.name.localeCompare(a.name)
      if (sortBy === "STOCK_DESC") return bStock - aStock
      if (sortBy === "STOCK_ASC") return aStock - bStock
      if (sortBy === "CREATED_DESC") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      if (sortBy === "CREATED_ASC") return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      
      return 0
    })

  return (
    <div className="min-h-screen bg-slate-50 font-sans sm:pb-20">
      
      {/* HEADER - Amazon App Style */}
      <div className="sticky top-0 z-30 bg-white border-b border-slate-200">
        <div className="flex items-center justify-between px-2 h-14 bg-white">
          <Button variant="ghost" size="icon" className="text-slate-600 hover:bg-slate-100">
            <ChevronLeft className="h-6 w-6" />
          </Button>
          <h1 className="text-lg font-bold text-slate-800 absolute left-1/2 -translate-x-1/2">
            Manage Inventory
          </h1>
          {/* Header Buttons */}
          <div className="flex items-center space-x-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => wipeInventory()}
              disabled={isSyncing}
              className="text-red-500 hover:bg-red-50"
              title="Wipe All Inventory"
            >
               <Trash2 className="h-5 w-5" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => syncInventory(true)} 
              disabled={isSyncing} 
              className="text-slate-500 hover:bg-slate-100"
              title="Manual Sync"
            >
              <RefreshCw className={`h-5 w-5 ${isSyncing ? "animate-spin text-blue-600" : ""}`} />
            </Button>
          </div>
        </div>

        {/* SEARCH BAR & COUNTERS */}
        <div className="px-3 pb-3 pt-1">
          {/* Stats Bar */}
          <div className="flex items-center space-x-4 mb-2 px-1 text-sm text-slate-600">
            <div className="font-semibold text-slate-800">
              <span className="text-slate-500 font-normal mr-1">Total Listings:</span> 
              {items.length}
            </div>
            <div className="font-semibold text-blue-600">
              <span className="text-slate-500 font-normal mr-1">Total Items In Stock:</span>
              {items.reduce((acc, curr) => acc + (curr.quantityOnHand || 0) + (curr.quantityReserved || 0), 0).toLocaleString()}
            </div>
          </div>
          
          <div className="relative flex items-center bg-white border border-slate-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 transition-all shadow-sm">
            <div className="pl-3 py-2 text-slate-400">
              <Search className="h-5 w-5" />
            </div>
            <input
              type="text"
              placeholder="Search Inventory or scan barcode..."
              className="flex-1 px-2 py-2.5 outline-none text-[15px] text-slate-800 placeholder-slate-400 w-full"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleScanSubmit()
              }}
          <div className="flex gap-2">
            <div className="relative flex-1 flex items-center bg-white border border-slate-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 transition-all shadow-sm">
              <div className="pl-3 py-2 text-slate-400">
                <Search className="h-5 w-5" />
              </div>
              <input
                type="text"
                placeholder="Search Inventory or scan barcode..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent border-none focus:outline-none focus:ring-0 px-3 py-2.5 text-sm"
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsScanning(true)}
                className="h-full rounded-none px-3 text-slate-400 hover:text-blue-600 hover:bg-blue-50"
              >
                <ScanLine className="h-5 w-5" />
              </Button>
            </div>
            
            <Button
              variant="outline"
              className="px-3 shrink-0"
              onClick={() => setIsFilterModalOpen(true)}
            >
              <ArrowUpDown className="h-4 w-4 mr-2" />
              Sort
            </Button>
          </div>
        </div>
      </div>

      {/* FILTER & SORT MODAL */}
      <Dialog open={isFilterModalOpen} onOpenChange={setIsFilterModalOpen}>
        <DialogContent className="max-w-sm rounded-lg">
          <DialogHeader>
            <DialogTitle>Sort & Filter</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col space-y-4 py-2">
            {/* Sort Logic */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Sort By</label>
              <select 
                title="Sort By"
                value={sortBy} 
                onChange={(e) => setSortBy(e.target.value as any)}
                className="w-full border-slate-300 rounded-md text-sm p-2 bg-white border outline-none"
              >
                <option value="DEFAULT">Default</option>
                <option value="NAME_ASC">Name (A-Z)</option>
                <option value="NAME_DESC">Name (Z-A)</option>
                <option value="STOCK_DESC">Stock (High to Low)</option>
                <option value="STOCK_ASC">Stock (Low to High)</option>
                <option value="CREATED_DESC">Newest First</option>
                <option value="CREATED_ASC">Oldest First</option>
              </select>
            </div>

            {/* Checkboxes */}
            <div className="space-y-3 pt-2 border-t">
              <label className="flex items-center space-x-2 text-sm cursor-pointer">
                <input 
                  type="checkbox" 
                  title="Push Out of Stock to Bottom"
                  checked={pushOutofStockToBottom}
                  onChange={(e) => setPushOutofStockToBottom(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                />
                <span>Push "Out of Stock" to Bottom</span>
              </label>

              <label className="flex items-center space-x-2 text-sm cursor-pointer">
                <input 
                  type="checkbox" 
                  title="Hide Out of Stock completely"
                  checked={hideOutOfStock}
                  onChange={(e) => setHideOutOfStock(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                />
                <span>Hide "Out of Stock" entirely</span>
              </label>
            </div>
            
            <Button onClick={() => setIsFilterModalOpen(false)} className="w-full mt-4">
              Apply
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* LIST CONTAINER */}
      <div className="bg-white">
        {loading ? (
          <div className="py-12 flex justify-center items-center flex-col text-slate-500">
            <RefreshCw className="h-8 w-8 animate-spin mb-4" />
            Loading inventory...
          </div>
        ) : processedItems.length === 0 ? (
          <div className="py-12 text-center text-slate-500">
            No items found.
          </div>
        ) : (
          <div className="flex flex-col">
            {processedItems.map((item) => {
              const isExpanded = expandedItem === item.id
              const img = getItemImage(item)
              // We trigger the "Inactive" tag if it's explicitly inactive, or if qty is 0.
              const isOutOfStock = item.quantityOnHand <= 0
              const showInactiveBadge = !item.isActive || isOutOfStock

              return (
                <div key={item.id} id={`item-${item.id}`} className="border-b border-slate-200 bg-white">
                  
                  {/* MAIN ROW */}
                  <div 
                    className="p-4 cursor-pointer hover:bg-slate-50 transition-colors flex flex-col"
                    onClick={() => setExpandedItem(isExpanded ? null : item.id)}
                  >
                    
                    {/* Inactive / Out of Stock Badge */}
                    {showInactiveBadge && (
                      <div className="mb-2">
                        <span className="bg-orange-500 text-white text-[11px] font-bold px-2 py-0.5 rounded shadow-sm inline-block uppercase tracking-wide">
                          {!item.isActive ? "Inactive" : "Out of Stock"}
                        </span>
                      </div>
                    )}

                    {/* Title */}
                    <h3 className="font-bold text-[14px] text-slate-900 leading-snug line-clamp-2 mb-3 pr-4">
                      {item.name}
                    </h3>

                    {/* Details Container */}
                    <div className="flex items-start justify-between">
                      <div className="flex gap-4 flex-1">
                        
                        {/* Image Square */}
                        <div className="w-[72px] h-[72px] bg-white border border-slate-200 rounded shrink-0 flex items-center justify-center overflow-hidden">
                          {img ? (
                            <img src={img} alt="" className="max-w-full max-h-full object-contain p-1" />
                          ) : (
                            <ImageIcon className="h-6 w-6 text-slate-200" />
                          )}
                        </div>

                        {/* Metadata block (compact Amazon style) */}
                        <div className="flex flex-col text-[13px] text-slate-600 gap-[2px] leading-tight">
                          <div className="whitespace-nowrap">
                            Available: <span className="font-bold text-slate-900">{item.quantityOnHand}</span> ({item.source === "AMAZON" ? "FBA" : "Manual"})
                          </div>
                          {item.unitCost && <div>Price: ${item.unitCost.toFixed(2)}</div>}
                          {item.sku && <div className="truncate max-w-[200px]">SKU: {item.sku}</div>}
                          {item.asin && <div>ASIN: {item.asin}</div>}
                          {item.upc && <div>UPC: {item.upc}</div>}
                          <div>Condition: New</div>
                        </div>

                      </div>

                      {/* Right Chevron */}
                      <div className="flex flex-col items-center justify-center pl-2 pt-4">
                        <ChevronRight className={`h-5 w-5 text-slate-400 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                      </div>
                    </div>
                  </div>

                  {/* EXPANDED EDIT PANEL */}
                  {isExpanded && (
                    <div className="bg-slate-50 border-t border-slate-100 p-4 space-y-4 animate-in slide-in-from-top-2">
                      
                      {/* Action Bar */}
                      <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className={`text-xs h-8 ${item.isActive ? "text-slate-600" : "text-green-600 border-green-200 hover:bg-green-50"}`}
                          onClick={() => updateItem(item.id, "isActive", !item.isActive)}
                        >
                          {item.isActive ? "Deactivate" : "Activate"}
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="text-xs h-8"
                          onClick={() => {
                            const val = prompt("Enter new quantity on hand:", String(item.quantityOnHand))
                            if (val !== null) updateItem(item.id, "quantityOnHand", parseInt(val) || 0)
                          }}
                        >
                          <Zap className="h-3 w-3 mr-1" /> Update Qty
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="text-xs h-8 ml-auto"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          {uploadingId === item.id ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Camera className="h-3 w-3" />}
                        </Button>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase">UPC</label>
                          <Input className="h-8 text-[13px] bg-white border-slate-200" value={item.upc || ""} onChange={(e) => updateItem(item.id, "upc", e.target.value)} placeholder="012345678901" />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase">SKU</label>
                          <Input className="h-8 text-[13px] bg-white border-slate-200" value={item.sku || ""} onChange={(e) => updateItem(item.id, "sku", e.target.value)} placeholder="Seller SKU" />
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase">Category</label>
                          <Input className="h-8 text-[13px] bg-white border-slate-200" value={item.category || ""} onChange={(e) => updateItem(item.id, "category", e.target.value)} placeholder="Category..." />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase">EAN</label>
                          <Input className="h-8 text-[13px] bg-white border-slate-200" value={item.ean || ""} onChange={(e) => updateItem(item.id, "ean", e.target.value)} placeholder="0123456789012" />
                        </div>
                      </div>

                    </div>
                  )}

                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Hidden inputs */}
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />

      {/* SORT / FILTER BOTTOM BAR (Amazon Style Mobile) */}
      <div className="fixed bottom-0 left-0 right-0 h-14 bg-[#1b2633] text-slate-300 md:hidden flex divide-x divide-slate-700 shadow-[0_-4px_10px_rgba(0,0,0,0.1)] z-40">
        <button className="flex-1 flex items-center justify-center flex-col gap-1 hover:text-white transition-colors">
          <ArrowUpDown className="h-4 w-4" />
          <span className="text-[10px] font-medium tracking-wide">Sort</span>
        </button>
        <button className="flex-1 flex items-center justify-center flex-col gap-1 text-blue-400 hover:text-blue-300 transition-colors">
          <Filter className="h-4 w-4" />
          <span className="text-[10px] font-medium tracking-wide">Filter</span>
        </button>
      </div>

    </div>
  )
}
