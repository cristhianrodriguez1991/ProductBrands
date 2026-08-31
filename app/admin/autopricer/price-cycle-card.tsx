"use client"

import React, { useState, useMemo, useEffect, Fragment } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Calendar, Repeat, Play, Pause, XCircle, Loader2, Pencil, LineChart, RefreshCw } from "lucide-react"
import { ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'

interface Product {
  id: string
  productName: string
  sku: string
  asin: string
  currentPrice: number
  priceCycleEnabled: boolean
  priceCycleStatus: string
  priceCycleError?: string | null
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

function PriceCycleHistoryChart({ productId }: { productId: string }) {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchHistory() {
      try {
        const res = await fetch(`/api/admin/autopricer/price-cycle/${productId}/history`)
        const json = await res.json()
        if (json.success) {
          // Format date for x-axis
          const formattedData = json.data.map((d: any) => ({
            ...d,
            formattedDate: new Date(d.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
          }))
          setData(formattedData)
        }
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    fetchHistory()
  }, [productId])

  if (loading) {
    return <div className="h-64 flex items-center justify-center text-slate-400"><Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading Keepa Analysis...</div>
  }
  
  if (data.length === 0) {
    return <div className="h-64 flex items-center justify-center text-slate-400">No historical data found for the last 40 days.</div>
  }

  return (
    <div className="h-72 w-full pt-4">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
          <XAxis 
            dataKey="formattedDate" 
            tick={{ fontSize: 11, fill: '#64748b' }} 
            axisLine={false} 
            tickLine={false}
            minTickGap={30}
          />
          <YAxis 
            yAxisId="rank" 
            orientation="left" 
            tick={{ fontSize: 11, fill: '#64748b' }} 
            axisLine={false}
            tickLine={false}
            domain={['dataMin - 1000', 'dataMax + 1000']}
          />
          <YAxis 
            yAxisId="price" 
            orientation="right" 
            tick={{ fontSize: 11, fill: '#10b981' }} 
            tickFormatter={(val) => `$${val}`}
            axisLine={false}
            tickLine={false}
            domain={['dataMin - 2', 'dataMax + 2']}
          />
          <Tooltip 
            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
            labelStyle={{ fontWeight: 'bold', color: '#0f172a', marginBottom: '4px' }}
            formatter={(value: any, name: any) => [
              name === 'rank' ? value.toLocaleString() : `$${Number(value).toFixed(2)}`,
              name === 'rank' ? 'Sales Rank' : 'Price'
            ]}
          />
          <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
          <Line 
            yAxisId="rank" 
            type="monotone" 
            dataKey="rank" 
            stroke="#6366f1" 
            strokeWidth={2} 
            dot={false}
            connectNulls={true}
            name="rank"
          />
          <Line 
            yAxisId="price" 
            type="stepAfter" 
            dataKey="price" 
            stroke="#10b981" 
            strokeWidth={2} 
            dot={(props: any) => {
              if (props.payload.isShift) {
                return <circle key={`dot-${props.index}`} cx={props.cx} cy={props.cy} r={4} fill="#f59e0b" stroke="#fff" strokeWidth={1} />
              }
              return null;
            }}
            activeDot={{ r: 6 }}
            name="price"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}

export function PriceCycleCard({ products, onRefresh }: PriceCycleCardProps) {
  const [selectedProductId, setSelectedProductId] = useState<string>("")
  const [selectedAmazonProduct, setSelectedAmazonProduct] = useState<any>(null)
  const [expandedCharts, setExpandedCharts] = useState<Set<string>>(new Set())
  
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
  const [discountType, setDiscountType] = useState<"PERCENTAGE" | "FIXED_PRICE">("PERCENTAGE")
  const [discountValue, setDiscountValue] = useState("10")
  const [discountDays, setDiscountDays] = useState("7")
  const [repeatCycle, setRepeatCycle] = useState(true)
  const [startPhase, setStartPhase] = useState<"REGULAR" | "DISCOUNT">("DISCOUNT")
  const [pushImmediately, setPushImmediately] = useState<boolean>(false)
  const [saving, setSaving] = useState(false)

  // Sync state when product selected
  useMemo(() => {
    if (selectedProduct) {
      setRegularPrice(selectedProduct.priceCycleBasePrice?.toString() || selectedProduct.price?.toString() || selectedProduct.currentPrice?.toString() || "0")
      setRegularDays(selectedProduct.priceCycleRegularDays?.toString() || "14")
      setDiscountType(selectedProduct.priceCycleDiscountType as "PERCENTAGE" | "FIXED_PRICE" || "PERCENTAGE")
      setDiscountValue(selectedProduct.priceCycleDiscountValue?.toString() || selectedProduct.priceCycleDiscountPct?.toString() || "10")
      setDiscountDays(selectedProduct.priceCycleDiscountDays?.toString() || "7")
      setRepeatCycle(selectedProduct.priceCycleEnabled !== false)
    }
  }, [selectedProduct])

  const calculatedDiscountPrice = discountType === "FIXED_PRICE"
    ? parseFloat(discountValue || "0").toFixed(2)
    : (parseFloat(regularPrice || "0") * (1 - parseFloat(discountValue || "0") / 100)).toFixed(2)
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
        priceCycleEnabled: true,
        priceCycleDiscountType: discountType,
        priceCycleDiscountValue: parseFloat(discountValue),
        priceCycleRegularDays: parseInt(regularDays),
        priceCycleDiscountDays: parseInt(discountDays),
        priceCycleBasePrice: parseFloat(regularPrice),
        startPhase,
        pushImmediately
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
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || "Failed to save schedule")
      }
      
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

  const handleEdit = (p: Product) => {
    setSelectedProductId(p.id)
    setSelectedAmazonProduct(null)
    setSearchQuery(`${p.productName} — ${p.asin}`)
    setRegularPrice(p.priceCycleBasePrice?.toString() || p.currentPrice.toString())
    setDiscountType(p.priceCycleDiscountType as "PERCENTAGE" | "FIXED_PRICE" || "PERCENTAGE")
    setDiscountValue(p.priceCycleDiscountValue?.toString() || p.priceCycleDiscountPct?.toString() || "10")
    setRegularDays(p.priceCycleRegularDays?.toString() || "14")
    setDiscountDays(p.priceCycleDiscountDays?.toString() || "7")
    setStartPhase(p.priceCycleCurrentPhase === "DISCOUNT" ? "DISCOUNT" : "REGULAR")
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

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

        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-8">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">Start phase</label>
            <select className="w-full h-10 px-3 bg-white border border-slate-300 rounded-md text-sm shadow-sm font-medium" value={startPhase} onChange={(e: any) => setStartPhase(e.target.value)}>
              <option value="DISCOUNT">Discount</option>
              <option value="REGULAR">Regular Price</option>
            </select>
          </div>
          <div className="flex flex-col">
            <label className="block text-xs font-medium text-slate-700 mb-2.5">Sync Time</label>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setPushImmediately(!pushImmediately)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${pushImmediately ? 'bg-indigo-600' : 'bg-slate-300'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${pushImmediately ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
              <span className="text-sm font-medium whitespace-nowrap">{pushImmediately ? "Push Now" : "Wait for 3:15 AM"}</span>
            </div>
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
            <label className="block text-xs font-medium text-slate-700 mb-1.5 flex justify-between">
              Discount
              <div className="flex gap-1 text-[10px] bg-slate-100 p-0.5 rounded">
                <button 
                  className={`px-1.5 py-0.5 rounded ${discountType === "PERCENTAGE" ? "bg-white shadow-sm font-bold" : "text-slate-500"}`}
                  onClick={() => setDiscountType("PERCENTAGE")}
                >%</button>
                <button 
                  className={`px-1.5 py-0.5 rounded ${discountType === "FIXED_PRICE" ? "bg-white shadow-sm font-bold" : "text-slate-500"}`}
                  onClick={() => setDiscountType("FIXED_PRICE")}
                >$</button>
              </div>
            </label>
            <div className="relative">
              {discountType === "FIXED_PRICE" && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">$</span>}
              <input
                type="number"
                className={`w-full h-10 ${discountType === "FIXED_PRICE" ? "pl-6" : "pl-3"} pr-8 bg-white border border-slate-300 rounded-md text-sm shadow-sm focus:ring-1 focus:ring-emerald-500 outline-none`}
                value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value)}
              />
              {discountType === "PERCENTAGE" && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">%</span>}
            </div>
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
                    <span className="text-green-100 font-normal text-xs">
                      {discountType === "PERCENTAGE" ? `${discountValue}% Off · ` : ''}${calculatedDiscountPrice}
                    </span>
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
                    <span className="text-green-100 font-normal text-xs">
                      {discountType === "PERCENTAGE" ? `${discountValue}% Off · ` : ''}${calculatedDiscountPrice}
                    </span>
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
                  : (pushImmediately ? "Immediately on Save" : nextDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }))
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
          <div className="p-4 border-b border-slate-100 bg-slate-50 rounded-t-xl flex justify-between items-center">
            <h3 className="font-bold text-slate-800">Active Schedules</h3>
            <Button 
              variant="outline" 
              size="sm" 
              className="h-8 font-medium bg-white text-indigo-600 border-indigo-200 hover:bg-indigo-50"
              onClick={async () => {
                if (confirm("Do you want to instantly force-sync all active schedules to Amazon right now to fix any stuck prices?")) {
                  try {
                    const res = await fetch("/api/admin/autopricer/force-sync-all")
                    const data = await res.json()
                    
                    const errors = data.results?.filter((r: any) => !r.success) || []
                    if (errors.length > 0) {
                      alert("Sync finished, but with errors:\n\n" + errors.map((e: any) => `${e.sku}: ${e.error}`).join("\n\n"))
                    } else {
                      alert("Sync command sent successfully! All active schedules have been pushed to Amazon without errors.")
                    }
                    onRefresh()
                  } catch (e: any) {
                    alert("Failed to sync: " + e.message)
                  }
                }
              }}
            >
              <RefreshCw className="h-3 w-3 mr-1.5" />
              Force Sync to Amazon Now
            </Button>
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
                  const salePrice = p.priceCycleDiscountType === "FIXED_PRICE"
                    ? Number(p.priceCycleDiscountValue || p.priceCycleBasePrice || p.currentPrice).toFixed(2)
                    : (Number(p.priceCycleBasePrice || p.currentPrice) * (1 - (p.priceCycleDiscountValue || p.priceCycleDiscountPct || 0)/100)).toFixed(2)
                  const isPending = p.priceCycleNextChangeAt && new Date(p.priceCycleNextChangeAt).getFullYear() <= 1970
                  const isActivePhase = p.priceCycleCurrentPhase === "DISCOUNT" && !isPending
                  const isRegularLive = p.priceCycleCurrentPhase === "REGULAR" && !isPending
                  const isDiscountLive = p.priceCycleCurrentPhase === "DISCOUNT" && !isPending
                  return (
                    <React.Fragment key={p.id}>
                      <tr className={`hover:bg-slate-50 transition-colors group/row relative hover:z-50 ${p.priceCycleStatus === "Failed" ? "bg-red-50/40" : ""}`}>
                        <td className="px-4 py-3 max-w-[250px] relative">
                        <div className="flex items-center gap-2">
                          <a href={`https://amazon.com/dp/${p.asin}`} target="_blank" rel="noopener noreferrer" className="truncate font-medium text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer block">
                            {p.productName}
                          </a>
                          {p.priceCycleStatus === "Failed" && (
                            <span className="shrink-0 bg-red-100 text-red-700 border border-red-200 text-[10px] font-bold px-1.5 py-0.5 rounded cursor-help" title={p.priceCycleError || "Failed to push price"}>
                              ERROR
                            </span>
                          )}
                        </div>
                        <div className="text-slate-400 font-normal text-xs mt-0.5 flex flex-col">
                          <span>SKU: {p.sku}</span>
                          <span>ASIN: {p.asin}</span>
                        </div>
                        
                        {p.priceCycleManualOverride && (
                          <div className="mt-1.5 flex items-start gap-1.5 p-1.5 bg-amber-50 border border-amber-200 rounded text-amber-800 text-[10px] w-max max-w-full">
                            <svg className="w-3.5 h-3.5 shrink-0 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                            <span>Changed manually on Amazon (Live: ${p.priceCycleManualPrice})<br/>Cycle will overwrite this on {p.priceCycleNextChangeAt ? new Date(p.priceCycleNextChangeAt).toLocaleDateString() : 'next change'}.</span>
                          </div>
                        )}
                        
                        {p.priceCycleStatus === "Failed" && p.priceCycleError && (
                          <div className="mt-1 text-xs text-red-600 font-medium bg-red-50 p-1.5 rounded border border-red-100 w-full whitespace-pre-wrap">
                            {p.priceCycleError}
                          </div>
                        )}
                        
                        <div className="absolute left-4 top-[80%] hidden group-hover/row:block bg-slate-900 text-white text-xs rounded shadow-xl p-2 z-[100] w-[300px] whitespace-normal border border-slate-700">
                          {p.productName}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className={`inline-flex items-center px-2 py-1 rounded-md transition-colors ${isRegularLive ? 'bg-amber-100 text-amber-900 font-bold border border-amber-200 shadow-sm' : 'font-medium text-slate-700'}`}>
                          ${Number(p.priceCycleBasePrice).toFixed(2)}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className={`inline-flex items-center px-2 py-1 rounded-md transition-colors ${isDiscountLive ? 'bg-emerald-100 text-emerald-900 font-bold border border-emerald-200 shadow-sm' : 'font-medium text-slate-700'}`}>
                          ${salePrice} 
                          <span className={`text-[10px] ml-1.5 px-1 rounded border ${isDiscountLive ? 'text-emerald-700 bg-emerald-50/50 border-emerald-200' : 'text-emerald-600 bg-emerald-50 border-emerald-100'}`}>
                            {p.priceCycleDiscountType === "FIXED_PRICE" ? "FIXED" : `-${p.priceCycleDiscountValue || p.priceCycleDiscountPct}%`}
                          </span>
                        </div>
                      </td>
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
                          <Button size="icon" variant="ghost" className={`h-7 w-7 ${expandedCharts.has(p.id) ? 'bg-indigo-100 text-indigo-700' : 'text-slate-400 hover:text-indigo-600'}`} onClick={() => setExpandedCharts(prev => { const next = new Set(prev); if (next.has(p.id)) next.delete(p.id); else next.add(p.id); return next; })} title="View Keepa Analysis"><LineChart className="h-3 w-3" /></Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-indigo-600" onClick={() => handleEdit(p)} title="Edit"><Pencil className="h-3 w-3" /></Button>
                          <Button size="icon" variant="ghost" className={`h-7 w-7 ${p.priceCycleStatus === 'Paused' ? 'text-emerald-500' : 'text-amber-500'}`} onClick={async () => {
                             await fetch("/api/admin/autopricer/price-cycle", { method: "PATCH", body: JSON.stringify({ productId: p.id, priceCycleStatus: p.priceCycleStatus === 'Paused' ? 'Active' : 'Paused' })})
                             onRefresh()
                          }} title={p.priceCycleStatus === 'Paused' ? "Resume Cycle" : "Pause Cycle"}>
                            {p.priceCycleStatus === 'Paused' ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-rose-500" onClick={async () => {
                             await fetch("/api/admin/autopricer/price-cycle", { method: "POST", body: JSON.stringify({ productId: p.id, priceCycleEnabled: false })})
                             onRefresh()
                          }} title="Cancel"><XCircle className="h-3 w-3" /></Button>
                        </div>
                      </td>
                    </tr>
                    {expandedCharts.has(p.id) && (
                      <tr className="bg-slate-50/50 border-b border-slate-100 shadow-inner">
                        <td colSpan={6} className="px-4 pb-4">
                          <PriceCycleHistoryChart productId={p.id} />
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
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
