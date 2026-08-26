"use client"

import { useState, useMemo, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Calendar, Repeat, Play, Pause, XCircle, Loader2 } from "lucide-react"

interface Product {
  id: string
  productName: string
  sku: string
  asin: string
  currentPrice: number
  priceCycleEnabled: boolean
  priceCycleStatus: string
  priceCycleDiscountPct: number | null
  priceCycleRegularDays: number | null
  priceCycleDiscountDays: number | null
  priceCycleBasePrice: number | null
  priceCycleCurrentPhase: string | null
  priceCycleNextChangeAt: string | null
}

interface PriceCycleCardProps {
  products: Product[]
  onRefresh: () => void
}

export function PriceCycleCard({ products, onRefresh }: PriceCycleCardProps) {
  const [selectedProductId, setSelectedProductId] = useState<string>("")
  const [selectedAmazonProduct, setSelectedAmazonProduct] = useState<any>(null)
  
  const [searchQuery, setSearchQuery] = useState("")
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [amazonResults, setAmazonResults] = useState<any[]>([])
  const [isSearchingAmazon, setIsSearchingAmazon] = useState(false)
  
  const selectedProduct = useMemo(() => {
    if (selectedAmazonProduct) return selectedAmazonProduct
    return products.find(p => p.id === selectedProductId)
  }, [products, selectedProductId, selectedAmazonProduct])

  const filteredProducts = useMemo(() => {
    if (!searchQuery) return products
    const q = searchQuery.toLowerCase()
    return products.filter(p => 
      p.asin.toLowerCase().includes(q) || 
      p.sku.toLowerCase().includes(q) || 
      p.productName.toLowerCase().includes(q)
    )
  }, [products, searchQuery])

  useEffect(() => {
    if (searchQuery.length < 3) {
      setAmazonResults([])
      return
    }
    const timer = setTimeout(async () => {
      setIsSearchingAmazon(true)
      try {
        const res = await fetch(`/api/admin/amazon/search-inventory?q=${encodeURIComponent(searchQuery)}`)
        const data = await res.json()
        if (data.results) {
          // Filter out results that are already in our local portfolio
          const localAsins = new Set(products.map(p => p.asin))
          setAmazonResults(data.results.filter((r: any) => !localAsins.has(r.asin)))
        }
      } catch (err) {
        console.error("Failed to search Amazon", err)
      } finally {
        setIsSearchingAmazon(false)
      }
    }, 500)
    return () => clearTimeout(timer)
  }, [searchQuery, products])

  const [regularPrice, setRegularPrice] = useState("12.99")
  const [regularDays, setRegularDays] = useState("14")
  const [discountPct, setDiscountPct] = useState("10")
  const [discountDays, setDiscountDays] = useState("7")
  const [repeatCycle, setRepeatCycle] = useState(true)
  const [startPhase, setStartPhase] = useState<"REGULAR" | "DISCOUNT">("DISCOUNT")
  const [saving, setSaving] = useState(false)

  // Sync state when product selected
  useMemo(() => {
    if (selectedProduct) {
      setRegularPrice(selectedProduct.priceCycleBasePrice?.toString() || selectedProduct.price?.toString() || selectedProduct.currentPrice?.toString() || "0")
      setRegularDays(selectedProduct.priceCycleRegularDays?.toString() || "14")
      setDiscountPct(selectedProduct.priceCycleDiscountPct?.toString() || "10")
      setDiscountDays(selectedProduct.priceCycleDiscountDays?.toString() || "7")
      setRepeatCycle(selectedProduct.priceCycleEnabled !== false)
      // Infer start phase from the existing schedule logic
      // If it hasn't started yet (or was paused), it might be tricky to infer, so default to DISCOUNT for new.
    }
  }, [selectedProduct])

  const calculatedDiscountPrice = (parseFloat(regularPrice || "0") * (1 - parseFloat(discountPct || "0") / 100)).toFixed(2)
  const totalDays = parseInt(regularDays || "0") + parseInt(discountDays || "0")
  
  // Calculate next date (mock for display)
  const today = new Date()
  const nextDate = new Date(today)
  if (startPhase === "DISCOUNT") {
    nextDate.setDate(today.getDate() + parseInt(discountDays || "0"))
  } else {
    nextDate.setDate(today.getDate() + parseInt(regularDays || "0"))
  }
  
  const handleSave = async () => {
    if (!selectedProductId && !selectedAmazonProduct) return
    setSaving(true)
    try {
      const payload: any = {
        priceCycleEnabled: repeatCycle,
        priceCycleDiscountPct: parseFloat(discountPct),
        priceCycleRegularDays: parseInt(regularDays),
        priceCycleDiscountDays: parseInt(discountDays),
        priceCycleBasePrice: parseFloat(regularPrice),
        startPhase
      }
      
      if (selectedProductId) {
        payload.productId = selectedProductId
      } else if (selectedAmazonProduct) {
        payload.newAmazonProduct = {
          asin: selectedAmazonProduct.asin,
          sku: selectedAmazonProduct.sku,
          productName: selectedAmazonProduct.productName,
          currentPrice: selectedAmazonProduct.price
        }
      }

      const res = await fetch("/api/admin/autopricer/price-cycle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })
      if (!res.ok) throw new Error("Failed to save schedule")
      
      // Clear selection so the UI resets
      setSelectedProductId("")
      setSelectedAmazonProduct(null)
      setSearchQuery("")
      
      onRefresh()
      alert("Schedule saved successfully!")
    } catch (e: any) {
      alert(e.message || "Error saving schedule")
    } finally {
      setSaving(false)
    }
  }

  const activeCycles = products.filter(p => p.priceCycleEnabled)

  return (
    <div className="space-y-6 max-w-4xl">
      <Card className="p-6 bg-white shadow-sm border-slate-200 text-slate-900 rounded-xl">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-slate-900">Automatic Price Cycle</h2>
          <p className="text-slate-500 text-sm">Schedule recurring price changes</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">Product</label>
            <div className="relative">
              <Input
                type="text"
                className="w-full bg-white shadow-sm"
                placeholder="Search by ASIN, SKU, or Name..."
                value={isDropdownOpen ? searchQuery : (selectedProduct ? `${selectedProduct.productName} — ${selectedProduct.asin}` : searchQuery)}
                title={selectedProduct ? selectedProduct.productName : ""}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  if (!isDropdownOpen) setIsDropdownOpen(true)
                  if (selectedProductId) setSelectedProductId("")
                }}
                onFocus={() => setIsDropdownOpen(true)}
                onBlur={() => {
                  // Delay blur slightly to allow clicking on dropdown options
                  setTimeout(() => setIsDropdownOpen(false), 200)
                }}
              />
              {isDropdownOpen && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-md shadow-lg max-h-80 overflow-y-auto">
                  {/* Local Products */}
                  {filteredProducts.length > 0 && (
                    <div className="px-3 py-1 text-xs font-bold text-slate-400 bg-slate-50 uppercase tracking-wider">
                      Monitored Portfolio
                    </div>
                  )}
                  {filteredProducts.map(p => (
                    <div
                      key={p.id}
                      className="px-3 py-2 text-sm cursor-pointer hover:bg-slate-100 border-b border-slate-50 last:border-0"
                      onMouseDown={() => {
                        setSelectedProductId(p.id)
                        setSelectedAmazonProduct(null)
                        setSearchQuery("")
                        setIsDropdownOpen(false)
                      }}
                    >
                      <div className="font-medium text-slate-900 truncate" title={p.productName}>{p.productName}</div>
                      <div className="text-xs text-slate-500">ASIN: {p.asin} | SKU: {p.sku} | Base: ${p.priceCycleBasePrice || p.currentPrice}</div>
                    </div>
                  ))}

                  {/* Amazon Live Search */}
                  {searchQuery.length >= 3 && (
                    <div className="px-3 py-1 text-xs font-bold text-blue-500 bg-blue-50/50 uppercase tracking-wider flex items-center justify-between border-t border-slate-100 mt-1">
                      <span>Amazon Catalog</span>
                      {isSearchingAmazon && <Loader2 className="h-3 w-3 animate-spin" />}
                    </div>
                  )}
                  {searchQuery.length >= 3 && amazonResults.map(p => (
                    <div
                      key={p.asin}
                      className="px-3 py-2 text-sm cursor-pointer hover:bg-blue-50 border-b border-slate-50 last:border-0"
                      onMouseDown={() => {
                        setSelectedProductId("")
                        setSelectedAmazonProduct(p)
                        setSearchQuery("")
                        setIsDropdownOpen(false)
                      }}
                    >
                      <div className="font-medium text-slate-900 truncate" title={p.productName}>{p.productName}</div>
                      <div className="text-xs text-slate-500">ASIN: {p.asin} | SKU: {p.sku} | Price: ${p.price}</div>
                      <div className="text-[10px] text-blue-600 font-medium mt-0.5">Will be added to Price Cycle</div>
                    </div>
                  ))}

                  {filteredProducts.length === 0 && amazonResults.length === 0 && !isSearchingAmazon && (
                    <div className="px-3 py-4 text-sm text-center text-slate-500">
                      No products found. {searchQuery.length < 3 && "Type at least 3 characters to search Amazon."}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">Regular price</label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-slate-500">$</span>
              <Input 
                className="pl-7" 
                value={regularPrice} 
                onChange={(e) => setRegularPrice(e.target.value)} 
                type="number"
                step="0.01"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">Start phase</label>
            <select className="w-full h-10 px-3 bg-white border border-slate-300 rounded-md text-sm shadow-sm font-medium" value={startPhase} onChange={(e: any) => setStartPhase(e.target.value)}>
              <option value="DISCOUNT">Discount (Starts Tonight)</option>
              <option value="REGULAR">Regular (Wait {regularDays} Days)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">Regular-price period</label>
            <select className="w-full h-10 px-3 bg-white border border-slate-300 rounded-md text-sm shadow-sm" value={regularDays} onChange={(e) => setRegularDays(e.target.value)}>
              <option value="7">7 days</option>
              <option value="14">14 days</option>
              <option value="21">21 days</option>
              <option value="30">30 days</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">Discount</label>
            <select className="w-full h-10 px-3 bg-white border border-slate-300 rounded-md text-sm shadow-sm" value={discountPct} onChange={(e) => setDiscountPct(e.target.value)}>
              <option value="5">5% off</option>
              <option value="10">10% off</option>
              <option value="15">15% off</option>
              <option value="20">20% off</option>
              <option value="25">25% off</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">Discount period</label>
            <select className="w-full h-10 px-3 bg-white border border-slate-300 rounded-md text-sm shadow-sm" value={discountDays} onChange={(e) => setDiscountDays(e.target.value)}>
              <option value="3">3 days</option>
              <option value="5">5 days</option>
              <option value="7">7 days</option>
              <option value="14">14 days</option>
            </select>
          </div>
          <div className="flex flex-col">
            <label className="block text-xs font-medium text-slate-700 mb-2.5">Repeat cycle</label>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setRepeatCycle(!repeatCycle)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${repeatCycle ? 'bg-emerald-600' : 'bg-slate-300'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${repeatCycle ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
              <span className="text-sm font-medium">{repeatCycle ? "On" : "Off"}</span>
            </div>
          </div>
        </div>

        <div className="mb-8">
          <h3 className="font-bold text-slate-900 mb-2">{totalDays}-Day Cycle</h3>
          <div className="flex items-center gap-2">
            <div className="flex flex-1 rounded-md overflow-hidden text-center text-sm font-medium text-white shadow-inner">
              {startPhase === "DISCOUNT" ? (
                <>
                  <div 
                    className="bg-[#16a34a] py-4 flex flex-col justify-center items-center transition-all"
                    style={{ flex: parseInt(discountDays || "0") }}
                  >
                    <span>Days 1–{discountDays}</span>
                    <span className="text-green-100 font-normal text-xs">{discountPct}% Off · ${calculatedDiscountPrice}</span>
                  </div>
                  <div 
                    className="bg-[#2563eb] border-l border-white/20 py-4 flex flex-col justify-center items-center transition-all"
                    style={{ flex: parseInt(regularDays || "0") }}
                  >
                    <span>Days {parseInt(discountDays || "0") + 1}–{totalDays}</span>
                    <span className="text-blue-100 font-normal text-xs">Regular Price · ${parseFloat(regularPrice || "0").toFixed(2)}</span>
                  </div>
                </>
              ) : (
                <>
                  <div 
                    className="bg-[#2563eb] py-4 flex flex-col justify-center items-center transition-all"
                    style={{ flex: parseInt(regularDays || "0") }}
                  >
                    <span>Days 1–{regularDays}</span>
                    <span className="text-blue-100 font-normal text-xs">Regular Price · ${parseFloat(regularPrice || "0").toFixed(2)}</span>
                  </div>
                  <div 
                    className="bg-[#16a34a] border-l border-white/20 py-4 flex flex-col justify-center items-center transition-all"
                    style={{ flex: parseInt(discountDays || "0") }}
                  >
                    <span>Days {parseInt(regularDays || "0") + 1}–{totalDays}</span>
                    <span className="text-green-100 font-normal text-xs">{discountPct}% Off · ${calculatedDiscountPrice}</span>
                  </div>
                </>
              )}
            </div>
            <div className="flex flex-col justify-center items-center text-slate-500 pl-4 w-32 shrink-0">
              <Repeat className="h-6 w-6 text-[#16a34a] mb-1" />
              <span className="text-[10px] text-center leading-tight font-medium">Then repeat automatically</span>
            </div>
          </div>
        </div>

        <div className="flex items-end justify-between border-t border-slate-100 pt-6">
          <div className="flex items-center gap-3 text-slate-700">
            <div className="bg-slate-100 p-2 rounded-lg">
              <Calendar className="h-6 w-6 text-slate-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Next price change</p>
              <p className="font-bold text-base">
                {selectedProduct?.priceCycleNextChangeAt 
                  ? (new Date(selectedProduct.priceCycleNextChangeAt).getFullYear() <= 1970 
                      ? "Tonight at 3:15 AM" 
                      : new Date(selectedProduct.priceCycleNextChangeAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }))
                  : nextDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
                }
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" className="px-6 border-slate-300 text-slate-700 font-medium hover:bg-slate-50" onClick={() => { setSelectedProductId(""); setSelectedAmazonProduct(null); }}>
              Cancel
            </Button>
            <Button className="px-6 bg-[#16a34a] hover:bg-green-700 text-white font-medium shadow-sm" onClick={handleSave} disabled={(!selectedProductId && !selectedAmazonProduct) || saving}>
              {saving ? "Saving..." : "Save Schedule"}
            </Button>
          </div>
        </div>
      </Card>

      {/* Active Schedules Table */}
      {activeCycles.length > 0 && (
        <Card className="p-0 bg-white shadow-sm border-slate-200 rounded-xl">
          <div className="p-4 border-b border-slate-100 bg-slate-50 rounded-t-xl">
            <h3 className="font-bold text-slate-800">Active Schedules</h3>
          </div>
          <div className="overflow-visible pb-10">
            <table className="w-full text-sm text-left whitespace-nowrap">
              <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3">Regular Price</th>
                  <th className="px-4 py-3">Discounted Price</th>
                  <th className="px-4 py-3">Current Phase</th>
                  <th className="px-4 py-3">Next Change</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {activeCycles.map(p => {
                  const salePrice = (Number(p.priceCycleBasePrice || p.currentPrice) * (1 - (p.priceCycleDiscountPct || 0)/100)).toFixed(2)
                  const isPending = p.priceCycleNextChangeAt && new Date(p.priceCycleNextChangeAt).getFullYear() <= 1970
                  const isActivePhase = p.priceCycleCurrentPhase === "DISCOUNT" && !isPending
                  return (
                    <tr key={p.id} className="hover:bg-slate-50 transition-colors group/row relative hover:z-50">
                      <td className="px-4 py-3 max-w-[250px] relative">
                        <div className="truncate font-medium text-slate-900 cursor-help">{p.productName}</div>
                        <div className="text-slate-400 font-normal text-xs mt-0.5">SKU: {p.sku}</div>
                        
                        <div className="absolute left-4 top-[80%] hidden group-hover/row:block bg-slate-900 text-white text-xs rounded shadow-xl p-2 z-[100] w-[300px] whitespace-normal border border-slate-700">
                          {p.productName}
                        </div>
                      </td>
                      <td className="px-4 py-3">${Number(p.priceCycleBasePrice).toFixed(2)}</td>
                      <td className="px-4 py-3">${salePrice} <span className="text-xs text-emerald-600 ml-1 bg-emerald-50 px-1 rounded">-{p.priceCycleDiscountPct}%</span></td>
                      <td className="px-4 py-3">
                        {isPending ? (
                          <span className="px-2 py-1 rounded text-[10px] font-bold tracking-wider bg-orange-100 text-orange-700">
                            PENDING START
                          </span>
                        ) : (
                          <span className={`px-2 py-1 rounded text-[10px] font-bold tracking-wider ${isActivePhase ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                            {p.priceCycleCurrentPhase || "REGULAR"}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {p.priceCycleNextChangeAt ? (new Date(p.priceCycleNextChangeAt).getFullYear() <= 1970 ? "Tonight at 3:15 AM" : new Date(p.priceCycleNextChangeAt).toLocaleDateString()) : "Pending"}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${p.priceCycleStatus === 'Active' ? 'bg-green-100 text-green-700' : p.priceCycleStatus === 'Failed' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-700'}`}>
                          {p.priceCycleStatus || "Active"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-indigo-600" onClick={() => setSelectedProductId(p.id)} title="Edit"><Play className="h-3 w-3" /></Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-rose-500" onClick={async () => {
                             await fetch("/api/admin/autopricer/price-cycle", { method: "POST", body: JSON.stringify({ productId: p.id, priceCycleEnabled: false })})
                             onRefresh()
                          }} title="Cancel"><XCircle className="h-3 w-3" /></Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}
