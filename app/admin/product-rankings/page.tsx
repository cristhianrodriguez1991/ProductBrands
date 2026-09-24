"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { GripVertical, Plus, DollarSign, Package, RefreshCw, Trash2 } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import Image from "next/image"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface ProductRanking {
  id: string
  asin: string | null
  sku: string | null
  productName: string | null
  imageUrl: string | null
  rank: number
  cost: number
  price: number
  fbaFee: number
  inventory: number
  sales7Days: number
  sales30Days: number
  sales90Days: number
}

function RankingRow({ 
  item, 
  onUpdateCost, 
  onUpdateSales,
  onDragStart, 
  onDragOver, 
  onDrop,
  onDelete
}: { 
  item: ProductRanking, 
  onUpdateCost: (id: string, cost: number) => void,
  onUpdateSales: (id: string, period: string, value: number) => void,
  onDragStart: (e: React.DragEvent, item: ProductRanking) => void,
  onDragOver: (e: React.DragEvent) => void,
  onDrop: (e: React.DragEvent, item: ProductRanking) => void,
  onDelete: (id: string) => void
}) {
  const [salesPeriod, setSalesPeriod] = useState<"7" | "30" | "90">("30")
  const [cost, setCost] = useState(item.cost.toString())
  
  let currentSales = item.sales30Days
  if (salesPeriod === "7") currentSales = item.sales7Days
  if (salesPeriod === "90") currentSales = item.sales90Days

  const [salesValue, setSalesValue] = useState(currentSales.toString())

  // Keep local state in sync if parent updates
  useEffect(() => {
    let s = item.sales30Days
    if (salesPeriod === "7") s = item.sales7Days
    if (salesPeriod === "90") s = item.sales90Days
    setSalesValue(s.toString())
  }, [item, salesPeriod])

  const handleCostBlur = () => {
    const num = parseFloat(cost) || 0
    if (num !== item.cost) {
      onUpdateCost(item.id, num)
    }
  }

  const handleSalesBlur = () => {
    const num = parseInt(salesValue) || 0
    if (num !== currentSales) {
      onUpdateSales(item.id, salesPeriod, num)
    }
  }

  const profitPerUnit = item.price - (parseFloat(cost) || 0) - (item.fbaFee || 0)
  const totalProfit = profitPerUnit * (parseInt(salesValue) || 0)

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, item)}
      onDragOver={onDragOver}
      onDrop={(e) => onDrop(e, item)}
      className="grid grid-cols-12 gap-4 p-4 items-center hover:bg-muted/30 transition-colors group cursor-move relative"
    >
      <div className="col-span-1 flex items-center justify-center gap-2">
        <GripVertical className="h-4 w-4 text-muted-foreground opacity-50 group-hover:opacity-100" />
        <span className="font-bold text-lg w-6 text-center">{item.rank}</span>
      </div>
      
      <div className="col-span-3 flex items-center gap-3">
        <div className="relative h-12 w-12 rounded overflow-hidden bg-muted flex-shrink-0 border">
          {item.imageUrl ? (
            <Image src={item.imageUrl} alt={item.productName || "Product"} fill className="object-cover" />
          ) : (
            <Package className="h-6 w-6 absolute inset-0 m-auto text-muted-foreground" />
          )}
        </div>
        <div className="overflow-hidden">
          <p className="font-medium text-sm truncate" title={item.productName || "Unknown"}>
            {item.productName || "Unknown Product"}
          </p>
          <p className="text-xs text-muted-foreground">
            {item.asin || item.sku}
          </p>
        </div>
      </div>

      <div className="col-span-1 text-center font-medium">
        {item.inventory}
      </div>

      <div className="col-span-2 flex flex-col gap-2 pl-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Price:</span>
          <span className="text-sm font-medium">${item.price.toFixed(2)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">FBA:</span>
          <span className="text-sm text-red-500">-${(item.fbaFee || 0).toFixed(2)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Cost:</span>
          <div className="relative">
            <DollarSign className="absolute left-1 top-1.5 h-3 w-3 text-muted-foreground" />
            <Input 
              type="number"
              step="0.01"
              className="h-6 pl-5 text-xs w-16 text-right"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
              onBlur={handleCostBlur}
            />
          </div>
        </div>
      </div>

      <div className="col-span-3 flex flex-col gap-2 pl-4">
        <div className="flex items-center gap-2">
          <Select value={salesPeriod} onValueChange={(val: any) => setSalesPeriod(val)}>
            <SelectTrigger className="h-8 w-28 text-xs">
              <SelectValue placeholder="Period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">7 Days</SelectItem>
              <SelectItem value="30">30 Days</SelectItem>
              <SelectItem value="90">90 Days</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Input 
            type="number"
            className="h-8 w-28 text-sm"
            value={salesValue}
            onChange={(e) => setSalesValue(e.target.value)}
            onBlur={handleSalesBlur}
          />
          <span className="text-xs text-muted-foreground">units</span>
        </div>
      </div>

      <div className="col-span-2 flex flex-col items-end justify-center pr-4">
        <span className={`text-lg font-bold ${totalProfit >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
          ${totalProfit.toFixed(2)}
        </span>
        <span className="text-xs text-muted-foreground">
          ${profitPerUnit.toFixed(2)} / unit
        </span>
      </div>

      <button 
        onClick={() => onDelete(item.id)}
        className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-muted-foreground hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
        title="Remove"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  )
}

export default function ProductRankingsPage() {
  const [rankings, setRankings] = useState<ProductRanking[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [newSku, setNewSku] = useState("")
  const { toast } = useToast()

  const [draggedItem, setDraggedItem] = useState<ProductRanking | null>(null)

  useEffect(() => {
    fetchRankings()
  }, [])

  const fetchRankings = async () => {
    try {
      const res = await fetch("/api/admin/product-rankings")
      if (!res.ok) throw new Error("Failed to fetch")
      const data = await res.json()
      setRankings(data)
    } catch (error) {
      toast({ title: "Error", description: "Failed to load rankings", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newSku) return

    setAdding(true)
    try {
      const res = await fetch("/api/admin/product-rankings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sku: newSku, asin: newSku, cost: 0 })
      })

      if (!res.ok) throw new Error("Failed to add")
      
      toast({ title: "Success", description: "Product added to rankings" })
      setNewSku("")
      await fetchRankings()
    } catch (error) {
      toast({ title: "Error", description: "Could not add product", variant: "destructive" })
    } finally {
      setAdding(false)
    }
  }

  const handleUpdateCost = async (id: string, cost: number) => {
    setRankings(prev => prev.map(r => r.id === id ? { ...r, cost } : r))
    try {
      await fetch("/api/admin/product-rankings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates: [{ id, cost }] })
      })
    } catch (error) {
      toast({ title: "Error", description: "Failed to save cost", variant: "destructive" })
    }
  }

  const handleUpdateSales = async (id: string, period: string, value: number) => {
    setRankings(prev => prev.map(r => {
      if (r.id !== id) return r
      return {
        ...r,
        sales7Days: period === "7" ? value : r.sales7Days,
        sales30Days: period === "30" ? value : r.sales30Days,
        sales90Days: period === "90" ? value : r.sales90Days,
      }
    }))
    try {
      const payload: any = { id }
      if (period === "7") payload.sales7Days = value
      if (period === "30") payload.sales30Days = value
      if (period === "90") payload.sales90Days = value

      await fetch("/api/admin/product-rankings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates: [payload] })
      })
    } catch (error) {
      toast({ title: "Error", description: "Failed to save sales", variant: "destructive" })
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Remove this product from rankings?")) return
    setRankings(prev => prev.filter(r => r.id !== id))
    try {
      await fetch(`/api/admin/product-rankings?id=${id}`, { method: "DELETE" })
    } catch (error) {
      toast({ title: "Error", description: "Failed to remove", variant: "destructive" })
    }
  }

  const handleSyncAmazon = async () => {
    setSyncing(true)
    try {
      toast({ title: "Syncing with Amazon...", description: "Fetching images, live inventory, and sales. This may take a minute." })
      const res = await fetch("/api/admin/product-rankings/sync", { method: "POST" })
      if (!res.ok) throw new Error("Sync failed")
      await fetchRankings()
      toast({ title: "Sync Complete", description: "Live Amazon data has been pulled successfully." })
    } catch (error) {
      toast({ title: "Sync Failed", description: "Could not fetch data from Amazon SP-API.", variant: "destructive" })
    } finally {
      setSyncing(false)
    }
  }

  const handleDragStart = (e: React.DragEvent, item: ProductRanking) => {
    setDraggedItem(item)
    e.dataTransfer.effectAllowed = "move"
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
  }

  const handleDrop = async (e: React.DragEvent, targetItem: ProductRanking) => {
    e.preventDefault()
    if (!draggedItem || draggedItem.id === targetItem.id) return

    const newRankings = [...rankings]
    const draggedIdx = newRankings.findIndex(r => r.id === draggedItem.id)
    const targetIdx = newRankings.findIndex(r => r.id === targetItem.id)

    newRankings.splice(draggedIdx, 1)
    newRankings.splice(targetIdx, 0, draggedItem)

    const updatedRankings = newRankings.map((r, idx) => ({ ...r, rank: idx + 1 }))
    setRankings(updatedRankings)
    setDraggedItem(null)

    try {
      await fetch("/api/admin/product-rankings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          updates: updatedRankings.map(r => ({ id: r.id, rank: r.rank }))
        })
      })
    } catch (error) {
      toast({ title: "Error", description: "Failed to save order", variant: "destructive" })
    }
  }

  if (loading) {
    return <div className="p-8 text-center">Loading rankings...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Product Rankings (P&L)</h1>
          <p className="text-muted-foreground mt-2">
            Track and prioritize your best selling products. Pull live Amazon data, override manually, and calculate profits.
          </p>
        </div>
        <Button onClick={handleSyncAmazon} disabled={syncing} variant="outline" className="gap-2">
          <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
          {syncing ? 'Syncing...' : 'Sync Amazon Data'}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Add Product to Rankings</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAdd} className="flex gap-4">
            <Input
              placeholder="Enter ASIN or SKU..."
              value={newSku}
              onChange={(e) => setNewSku(e.target.value)}
              className="max-w-md"
            />
            <Button type="submit" disabled={adding || !newSku}>
              <Plus className="h-4 w-4 mr-2" />
              Add Product
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="bg-white dark:bg-gray-900 rounded-md border shadow-sm">
        <div className="grid grid-cols-12 gap-4 p-4 font-medium border-b bg-muted/50 text-sm">
          <div className="col-span-1 text-center">Rank</div>
          <div className="col-span-3">Product</div>
          <div className="col-span-1 text-center">Inventory</div>
          <div className="col-span-2">Cost & Price</div>
          <div className="col-span-3 pl-4">Sales</div>
          <div className="col-span-2 text-right pr-4">Profit</div>
        </div>

        <div className="divide-y">
          {rankings.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              No products added yet. Add an ASIN/SKU above to start ranking.
            </div>
          ) : (
            rankings.map((item) => (
              <RankingRow
                key={item.id}
                item={item}
                onUpdateCost={handleUpdateCost}
                onUpdateSales={handleUpdateSales}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onDelete={handleDelete}
              />
            ))
          )}
        </div>
      </div>
    </div>
  )
}
