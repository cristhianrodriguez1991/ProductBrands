"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Plus, Download, ArrowDown, ArrowUp, Save, Trash2, CheckCircle2 } from "lucide-react"

type FbaItem = {
  id: string
  shipmentId: string
  location: string
  boxOrder: string
  name: string
  fnsku: string
  sku: string
  qtyPerBox: number | ""
  totalBoxes: number | ""
  totalUnits: number | ""
  expDate: string
  length: number | ""
  width: number | ""
  height: number | ""
  boxWeight: number | ""
  description: string
  status: "IN_SHIPMENT" | "PENDING"
}

export default function FbaShipmentsPage() {
  const [shipment, setShipment] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState<FbaItem[]>([])
  
  const [newShipmentName, setNewShipmentName] = useState("")

  const fetchActiveShipment = async () => {
    try {
      const res = await fetch("/api/admin/fba-shipments")
      const data = await res.json()
      if (data && data.id) {
        setShipment(data)
        setItems(data.items || [])
      } else {
        setShipment(null)
        setItems([])
      }
    } catch(e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchActiveShipment()
  }, [])

  const handleCreateShipment = async () => {
    if (!newShipmentName) return alert("Please enter a name for the new shipment")
    
    try {
      const res = await fetch("/api/admin/fba-shipments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newShipmentName })
      })
      const data = await res.json()
      if (res.ok) {
        setNewShipmentName("")
        fetchActiveShipment()
      } else {
        alert(data.error)
      }
    } catch(e) {}
  }

  const handleCloseShipment = async () => {
    if (!confirm("Are you sure you want to finish this shipment? Pending items will roll over to the next one you create.")) return
    
    try {
      await fetch(`/api/admin/fba-shipments/${shipment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "CLOSED" })
      })
      setShipment(null)
      setItems([])
    } catch(e) {}
  }

  const handleAddRow = async () => {
    if (!shipment) return
    const res = await fetch(`/api/admin/fba-shipments/${shipment.id}/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "" }) // Blank row
    })
    if (res.ok) {
      fetchActiveShipment()
    }
  }

  const updateItem = async (itemId: string, field: string, value: any) => {
    // Optimistic update locally
    setItems(items.map(i => i.id === itemId ? { ...i, [field]: value } : i))
    
    // Auto-calculate total units if qtyPerBox or totalBoxes changes
    if (field === "qtyPerBox" || field === "totalBoxes") {
      const current = items.find(i => i.id === itemId);
      let qty = field === "qtyPerBox" ? value : (current?.qtyPerBox || 0);
      let boxes = field === "totalBoxes" ? value : (current?.totalBoxes || 0);
      const total = (parseInt(qty) || 0) * (parseInt(boxes) || 0);
      
      setItems(prev => prev.map(i => i.id === itemId ? { ...i, [field]: value, totalUnits: total } : i));
      
      await fetch(`/api/admin/fba-shipments/items/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value === "" ? null : value, totalUnits: total })
      })
      return;
    }

    // Debounced or direct patch
    await fetch(`/api/admin/fba-shipments/items/${itemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value === "" ? null : value })
    })
  }

  const switchItemStatus = async (itemId: string, newStatus: "IN_SHIPMENT" | "PENDING") => {
    setItems(items.map(i => i.id === itemId ? { ...i, status: newStatus } : i))
    await fetch(`/api/admin/fba-shipments/items/${itemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus })
    })
  }

  const deleteItem = async (itemId: string) => {
    setItems(items.filter(i => i.id !== itemId))
    await fetch(`/api/admin/fba-shipments/items/${itemId}`, {
      method: "DELETE"
    })
  }

  const exportToExcelObject = () => {
    if (!shipment) return
    const activeItems = items.filter(i => i.status === "IN_SHIPMENT")
    
    // We will generate a CSV file out of the data
    const headers = ["Location", "Orden de Cajas", "NOMBRE", "FnSKU or UPC", "SKU", "Cantidad por Caja", "Cajas Totales", "Total de unidades", "Fecha de Exp", "Largo", "Ancho", "Altura", "Peso de Caja", "Descripcion"]
    
    const rows = activeItems.map(i => [
      `"${i.location || ""}"`,
      `"${i.boxOrder || ""}"`,
      `"${i.name || ""}"`,
      `"${i.fnsku || ""}"`,
      `"${i.sku || ""}"`,
      i.qtyPerBox || "",
      i.totalBoxes || "",
      i.totalUnits || "",
      `"${i.expDate || ""}"`,
      i.length || "",
      i.width || "",
      i.height || "",
      i.boxWeight || "",
      `"${i.description || ""}"`
    ])

    const csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(",") + "\n"
      + rows.map(e => e.join(",")).join("\n")
      
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `FBA_Shipment_${shipment.name}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (loading) return <div className="p-8">Loading...</div>

  // Create a reusable row renderer for the Excel-like layout
  const renderRow = (item: FbaItem) => (
    <tr key={item.id} className="border-b hover:bg-slate-50 transition-colors">
      <td className="p-1"><Input className="h-8 text-xs border-0 bg-transparent rounded-none focus-visible:ring-1 focus-visible:ring-offset-0 px-2" value={item.location || ""} onChange={e => updateItem(item.id, "location", e.target.value)} /></td>
      <td className="p-1 border-l"><Input className="h-8 text-xs border-0 bg-transparent rounded-none focus-visible:ring-1 focus-visible:ring-offset-0 px-2" value={item.boxOrder || ""} onChange={e => updateItem(item.id, "boxOrder", e.target.value)} /></td>
      <td className="p-1 border-l"><Input className="h-8 text-xs border-0 bg-transparent rounded-none focus-visible:ring-1 focus-visible:ring-offset-0 px-2 font-medium" value={item.name || ""} onChange={e => updateItem(item.id, "name", e.target.value)} /></td>
      <td className="p-1 border-l"><Input className="h-8 text-xs border-0 bg-transparent rounded-none focus-visible:ring-1 focus-visible:ring-offset-0 px-2" value={item.fnsku || ""} onChange={e => updateItem(item.id, "fnsku", e.target.value)} /></td>
      <td className="p-1 border-l"><Input className="h-8 text-xs border-0 bg-transparent rounded-none focus-visible:ring-1 focus-visible:ring-offset-0 px-2" value={item.sku || ""} onChange={e => updateItem(item.id, "sku", e.target.value)} /></td>
      <td className="p-1 border-l"><Input type="number" className="h-8 text-xs border-0 bg-transparent rounded-none focus-visible:ring-1 focus-visible:ring-offset-0 px-2 w-16 mx-auto text-center" value={item.qtyPerBox || ""} onChange={e => updateItem(item.id, "qtyPerBox", e.target.value)} /></td>
      <td className="p-1 border-l"><Input type="number" className="h-8 text-xs border-0 bg-transparent rounded-none focus-visible:ring-1 focus-visible:ring-offset-0 px-2 w-16 mx-auto text-center" value={item.totalBoxes || ""} onChange={e => updateItem(item.id, "totalBoxes", e.target.value)} /></td>
      <td className="p-1 border-l text-center font-bold text-xs px-2 w-20 bg-green-50">{item.totalUnits || 0}</td>
      <td className="p-1 border-l"><Input className="h-8 text-xs border-0 bg-transparent rounded-none focus-visible:ring-1 focus-visible:ring-offset-0 px-2" value={item.expDate || ""} onChange={e => updateItem(item.id, "expDate", e.target.value)} /></td>
      <td className="p-1 border-l"><Input type="number" className="h-8 text-xs border-0 bg-transparent rounded-none focus-visible:ring-1 focus-visible:ring-offset-0 px-1 w-12 mx-auto text-center text-[10px]" value={item.length || ""} onChange={e => updateItem(item.id, "length", e.target.value)} /></td>
      <td className="p-1 border-l"><Input type="number" className="h-8 text-xs border-0 bg-transparent rounded-none focus-visible:ring-1 focus-visible:ring-offset-0 px-1 w-12 mx-auto text-center text-[10px]" value={item.width || ""} onChange={e => updateItem(item.id, "width", e.target.value)} /></td>
      <td className="p-1 border-l"><Input type="number" className="h-8 text-xs border-0 bg-transparent rounded-none focus-visible:ring-1 focus-visible:ring-offset-0 px-1 w-12 mx-auto text-center text-[10px]" value={item.height || ""} onChange={e => updateItem(item.id, "height", e.target.value)} /></td>
      <td className="p-1 border-l"><Input type="number" className="h-8 text-xs border-0 bg-transparent rounded-none focus-visible:ring-1 focus-visible:ring-offset-0 px-2 w-16 mx-auto text-center" value={item.boxWeight || ""} onChange={e => updateItem(item.id, "boxWeight", e.target.value)} /></td>
      <td className="p-1 border-l"><Input className="h-8 text-xs border-0 bg-transparent rounded-none focus-visible:ring-1 focus-visible:ring-offset-0 px-2" value={item.description || ""} onChange={e => updateItem(item.id, "description", e.target.value)} /></td>
      <td className="p-1 border-l">
        <div className="flex items-center justify-center gap-1 opacity-20 hover:opacity-100 transition-opacity">
          {item.status === "IN_SHIPMENT" ? (
            <Button variant="ghost" size="icon" className="h-6 w-6 text-orange-600 hover:bg-orange-100" onClick={() => switchItemStatus(item.id, "PENDING")} title="Leave Pending (Don't Ship)">
              <ArrowDown className="h-4 w-4" />
            </Button>
          ) : (
            <Button variant="ghost" size="icon" className="h-6 w-6 text-green-600 hover:bg-green-100" onClick={() => switchItemStatus(item.id, "IN_SHIPMENT")} title="Add to Shipment">
              <ArrowUp className="h-4 w-4" />
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-6 w-6 text-red-600 hover:bg-red-100" onClick={() => deleteItem(item.id)} title="Delete row">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </td>
    </tr>
  )

  if (!shipment) {
    return (
      <div className="max-w-2xl mx-auto p-6 mt-12 bg-white rounded-xl shadow-sm border border-border text-center">
        <h2 className="text-2xl font-bold mb-2">No Active FBA Shipment</h2>
        <p className="text-muted-foreground mb-8">Start a new shipment below. Any pending items from past closed shipments will automatically rollover.</p>
        <div className="flex max-w-sm mx-auto items-center gap-2">
          <Input placeholder="e.g. Early April 2026" value={newShipmentName} onChange={e => setNewShipmentName(e.target.value)} />
          <Button onClick={handleCreateShipment}>Create</Button>
        </div>
      </div>
    )
  }

  const inShipmentItems = items.filter(i => i.status === "IN_SHIPMENT")
  const pendingItems = items.filter(i => i.status === "PENDING")

  return (
    <div className="w-full h-full flex flex-col gap-8 pb-32">
      {/* HEADER SECTION */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">INVENTARIO - FBA Shipment ({shipment.name})</h1>
          <p className="text-muted-foreground mt-1 text-sm flex items-center gap-2">
            Status: <span className="text-green-600 font-bold flex items-center gap-1"><CheckCircle2 className="h-4 w-4"/> ACTIVE</span>
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={exportToExcelObject} className="gap-2 text-blue-700 border-blue-200 bg-blue-50 hover:bg-blue-100">
            <Download className="h-4 w-4" /> Export to CSV/Excel
          </Button>
          <Button onClick={handleCloseShipment} variant="destructive" className="gap-2">
            Finish & Close Shipment
          </Button>
        </div>
      </div>

      {/* ACTIVE SHIPMENT TABLE */}
      <Card className="w-full overflow-hidden border-0 shadow-lg rounded-xl flex flex-col">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[1200px]">
            <thead>
              <tr className="bg-[#2e6e4f] text-white text-[10px] uppercase font-bold tracking-wide">
                <th className="p-3 w-[100px] border-r border-[#3f8463]">Location</th>
                <th className="p-3 w-[100px] border-r border-[#3f8463]">Orden de Cajas</th>
                <th className="p-3 min-w-[200px] border-r border-[#3f8463]">NOMBRE</th>
                <th className="p-3 w-[150px] border-r border-[#3f8463]">FnSKU or UPC</th>
                <th className="p-3 w-[120px] border-r border-[#3f8463]">SKU</th>
                <th className="p-3 w-[80px] border-r border-[#3f8463] text-center leading-tight">Cantidad<br/>por Caja</th>
                <th className="p-3 w-[80px] border-r border-[#3f8463] text-center leading-tight">Cajas<br/>Totales</th>
                <th className="p-3 w-[80px] border-r border-[#3f8463] text-center leading-tight">Total de<br/>unidades</th>
                <th className="p-3 w-[100px] border-r border-[#3f8463]">Fecha de Exp</th>
                <th className="p-3 w-[50px] border-r border-[#3f8463] text-center">Largo</th>
                <th className="p-3 w-[50px] border-r border-[#3f8463] text-center">Ancho</th>
                <th className="p-3 w-[50px] border-r border-[#3f8463] text-center">Altura</th>
                <th className="p-3 w-[80px] border-r border-[#3f8463] text-center leading-tight">Peso de<br/>Caja</th>
                <th className="p-3 w-[200px] border-r border-[#3f8463]">Descripcion</th>
                <th className="p-3 w-[60px] text-center">Acción</th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {inShipmentItems.map(renderRow)}
              {inShipmentItems.length === 0 && (
                <tr>
                  <td colSpan={15} className="py-12 text-center text-muted-foreground italic">
                    No items in this shipment yet. Add a row below, or move up one from pending.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="bg-slate-50 border-t p-2">
          <Button variant="ghost" onClick={handleAddRow} className="w-full text-muted-foreground gap-2 border border-dashed border-slate-300 hover:border-slate-400 hover:bg-slate-100 hover:text-slate-900 justify-start">
            <Plus className="h-4 w-4" /> Agregar Fila
          </Button>
        </div>
      </Card>

      {/* PENDING / HOLD SECTION */}
      <div className="mt-8 pt-8 border-t-2 border-dashed border-orange-200">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2 text-orange-800">
              <ArrowDown className="h-5 w-5" /> Palets Pendientes (No Enviados)
            </h2>
            <p className="text-sm text-orange-600 opacity-80 mt-1">
              Estos items no se enviarán ahora y se quedarán guardados para el próximo "Piggyback" o nuevo shipment.
            </p>
          </div>
        </div>

        <Card className="w-full overflow-hidden border-orange-100 bg-orange-50/30">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-[1200px] opacity-75 grayscale-[0.3]">
              <thead>
                <tr className="bg-orange-800 text-white text-[10px] uppercase font-bold tracking-wide">
                <th className="p-2 w-[100px] border-r border-orange-700">Location</th>
                <th className="p-2 w-[100px] border-r border-orange-700">Orden</th>
                <th className="p-2 min-w-[200px] border-r border-orange-700">NOMBRE</th>
                <th className="p-2 w-[150px] border-r border-orange-700">FnSKU/UPC</th>
                <th className="p-2 w-[120px] border-r border-orange-700">SKU</th>
                <th className="p-2 w-[80px] border-r border-orange-700 text-center">Cant.</th>
                <th className="p-2 w-[80px] border-r border-orange-700 text-center">Cajas</th>
                <th className="p-2 w-[80px] border-r border-orange-700 text-center">Unidades</th>
                <th className="p-2 w-[100px] border-r border-orange-700">Expira</th>
                <th className="p-2 w-[50px] border-r border-orange-700 text-center">L</th>
                <th className="p-2 w-[50px] border-r border-orange-700 text-center">A</th>
                <th className="p-2 w-[50px] border-r border-orange-700 text-center">H</th>
                <th className="p-2 w-[80px] border-r border-orange-700 text-center">Peso</th>
                <th className="p-2 w-[200px] border-r border-orange-700">Descripcion</th>
                <th className="p-2 w-[60px] text-center">Restaurar</th>
                </tr>
              </thead>
              <tbody>
                {pendingItems.map(renderRow)}
                {pendingItems.length === 0 && (
                  <tr>
                    <td colSpan={15} className="py-8 text-center text-orange-900/50 italic text-sm">
                      No hay palets pendientes. Todos están listos para enviarse.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

    </div>
  )
}
