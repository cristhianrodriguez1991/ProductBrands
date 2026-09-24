"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { GripVertical, Plus, Save, TrendingUp, DollarSign, Package } from "lucide-react"
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
  inventory: number
  sales7Days: number
  sales30Days: number
  sales90Days: number
}

export default function ProductRankingsPage() {
  const [rankings, setRankings] = useState<ProductRanking[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [newSku, setNewSku] = useState("")
  const [salesPeriod, setSalesPeriod] = useState<"7" | "30" | "90">("30")
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

  const handleUpdateCost = async (id: string, newCost: string) => {
    const numCost = parseFloat(newCost) || 0
    setRankings(prev => prev.map(r => r.id === id ? { ...r, cost: numCost } : r))
    
    try {
      await fetch("/api/admin/product-rankings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates: [{ id, cost: numCost }] })
      })
    } catch (error) {
      toast({ title: "Error", description: "Failed to save cost", variant: "destructive" })
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

    // Update ranks sequentially
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
      toast({ title: "Rankings Updated" })
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
            Track and prioritize your best selling products. Manage profit and loss manually.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Label className="whitespace-nowrap">Sales Period:</Label>
            <Select value={salesPeriod} onValueChange={(val: any) => setSalesPeriod(val)}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 Days</SelectItem>
                <SelectItem value="30">Last 30 Days</SelectItem>
                <SelectItem value="90">Last 90 Days</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
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
          <div className="col-span-2 text-center">Sales ({salesPeriod}d)</div>
          <div className="col-span-3 text-right pr-4">Profit</div>
        </div>

        <div className="divide-y">
          {rankings.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              No products added yet. Add an ASIN/SKU above to start ranking.
            </div>
          ) : (
            rankings.map((item) => {
              let sales = item.sales30Days
              if (salesPeriod === "7") sales = item.sales7Days
              if (salesPeriod === "90") sales = item.sales90Days

              const profitPerUnit = item.price - item.cost
              const totalProfit = profitPerUnit * sales

              return (
                <div
                  key={item.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, item)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, item)}
                  className="grid grid-cols-12 gap-4 p-4 items-center hover:bg-muted/30 transition-colors group cursor-move"
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

                  <div className="col-span-2 flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground w-8">Cost:</span>
                      <div className="relative">
                        <DollarSign className="absolute left-2 top-1.5 h-4 w-4 text-muted-foreground" />
                        <Input 
                          type="number"
                          step="0.01"
                          className="h-8 pl-7 text-sm w-24"
                          defaultValue={item.cost}
                          onBlur={(e) => handleUpdateCost(item.id, e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground w-8">Price:</span>
                      <span className="text-sm font-medium">${item.price.toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="col-span-2 text-center">
                    <span className="inline-flex items-center justify-center bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 rounded-full px-3 py-1 text-sm font-medium">
                      {sales} units
                    </span>
                  </div>

                  <div className="col-span-3 flex flex-col items-end justify-center pr-4">
                    <span className={`text-lg font-bold ${totalProfit >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                      ${totalProfit.toFixed(2)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      ${profitPerUnit.toFixed(2)} / unit
                    </span>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
