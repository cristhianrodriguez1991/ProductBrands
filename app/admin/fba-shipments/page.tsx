"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Plus, Download, ArrowDown, ArrowUp, Save, Trash2, CheckCircle2, Camera, X, ImageIcon, AlertCircle } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import Image from "next/image"

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
  imageUrl?: string
  status: "IN_SHIPMENT" | "PENDING"
}

export default function FbaShipmentsPage() {
  const [shipment, setShipment] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState<FbaItem[]>([])
  const [newShipmentName, setNewShipmentName] = useState("")
  
  // Photo modal state
  const [expandedImage, setExpandedImage] = useState<string | null>(null)
  const [uploadingId, setUploadingId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedIdForUpload, setSelectedIdForUpload] = useState<string | null>(null)

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
      if (res.ok) {
        setNewShipmentName("")
        fetchActiveShipment()
      } else {
        const data = await res.json()
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
      body: JSON.stringify({ name: "" })
    })
    if (res.ok) fetchActiveShipment()
  }

  // Smart Date Formatter: 022027 -> 02/20/2027
  const formatDateString = (raw: string) => {
    const digits = raw.replace(/\D/g, "")
    if (digits.length === 6) {
      // Logic for MMDDYY
      return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/20${digits.slice(4, 6)}`
    } else if (digits.length === 8) {
      // Logic for MMDDYYYY
      return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4, 8)}`
    }
    return raw
  }

  const updateItem = async (itemId: string, field: string, value: any) => {
    let finalValue = value
    
    // Auto-format date if it looks like a sequence of digits
    if (field === "expDate" && value.length >= 6 && !value.includes("/")) {
      finalValue = formatDateString(value)
    }

    setItems(items.map(i => i.id === itemId ? { ...i, [field]: finalValue } : i))
    
    const payload: any = { [field]: finalValue === "" ? null : finalValue }

    // Auto-calculate units
    if (field === "qtyPerBox" || field === "totalBoxes") {
      const current = items.find(i => i.id === itemId)
      const qty = field === "qtyPerBox" ? value : (current?.qtyPerBox || 0)
      const boxes = field === "totalBoxes" ? value : (current?.totalBoxes || 0)
      const total = (parseInt(qty) || 0) * (parseInt(boxes) || 0)
      payload.totalUnits = total
      setItems(prev => prev.map(i => i.id === itemId ? { ...i, [field]: finalValue, totalUnits: total } : i))
    }

    await fetch(`/api/admin/fba-shipments/items/${itemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    })
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !selectedIdForUpload) return

    setUploadingId(selectedIdForUpload)
    try {
      const fd = new FormData()
      fd.append("file", file)
      const res = await fetch(`/api/admin/fba-shipments/items/${selectedIdForUpload}/image`, {
        method: "POST",
        body: fd
      })
      if (res.ok) {
        const updated = await res.json()
        setItems(items.map(i => i.id === selectedIdForUpload ? { ...i, imageUrl: updated.imageUrl } : i))
      }
    } catch(e) {
      console.error(e)
    } finally {
      setUploadingId(null)
      setSelectedIdForUpload(null)
    }
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
    if (!confirm("Remove this item?")) return
    setItems(items.filter(i => i.id !== itemId))
    await fetch(`/api/admin/fba-shipments/items/${itemId}`, { method: "DELETE" })
  }

  const isExpiringSoon = (dateStr: string) => {
    if (!dateStr || !dateStr.includes("/")) return false
    try {
      const exp = new Date(dateStr)
      if (isNaN(exp.getTime())) return false
      const now = new Date()
      const diffDays = (exp.getTime() - now.getTime()) / (1000 * 3600 * 24)
      return diffDays < 60 // Warning if less than 60 days
    } catch { return false }
  }

  const exportToExcelObject = () => {
    if (!shipment) return
    const activeItems = items.filter(i => i.status === "IN_SHIPMENT")
    const headers = ["Location", "Orden de Cajas", "NOMBRE", "FnSKU or UPC", "SKU", "Cantidad por Caja", "Cajas Totales", "Total de unidades", "Fecha de Exp", "Largo", "Ancho", "Altura", "Peso de Caja", "Descripcion"]
    const rows = activeItems.map(i => [
      `"${i.location || ""}"`, `"${i.boxOrder || ""}"`, `"${i.name || ""}"`, `"${i.fnsku || ""}"`, `"${i.sku || ""}"`,
      i.qtyPerBox || "", i.totalBoxes || "", i.totalUnits || "", `"${i.expDate || ""}"`, 
      i.length || "", i.width || "", i.height || "", i.boxWeight || "", `"${i.description || ""}"`
    ])
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + headers.join(",") + "\n" + rows.map(e => e.join(",")).join("\n")
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `FBA_Shipment_${shipment.name}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const renderRow = (item: FbaItem) => {
    const expiring = isExpiringSoon(item.expDate)
    
    return (
      <tr key={item.id} className="border-b hover:bg-slate-50 transition-colors">
        <td className="p-0"><Input className="h-8 text-[11px] border-0 bg-transparent rounded-none px-2" value={item.location || ""} onChange={e => updateItem(item.id, "location", e.target.value)} /></td>
        <td className="p-0 border-l"><Input className="h-8 text-[11px] border-0 bg-transparent rounded-none px-2" value={item.boxOrder || ""} onChange={e => updateItem(item.id, "boxOrder", e.target.value)} /></td>
        <td className="p-0 border-l"><Input className="h-8 text-[11px] border-0 bg-transparent rounded-none px-2 font-bold text-slate-800" value={item.name || ""} onChange={e => updateItem(item.id, "name", e.target.value)} /></td>
        <td className="p-0 border-l"><Input className="h-8 text-[10px] border-0 bg-transparent rounded-none px-2" value={item.fnsku || ""} onChange={e => updateItem(item.id, "fnsku", e.target.value)} /></td>
        <td className="p-0 border-l"><Input className="h-8 text-[10px] border-0 bg-transparent rounded-none px-2" value={item.sku || ""} onChange={e => updateItem(item.id, "sku", e.target.value)} /></td>
        <td className="p-0 border-l"><Input type="number" className="h-8 text-xs border-0 bg-transparent rounded-none px-1 w-full text-center" value={item.qtyPerBox || ""} onChange={e => updateItem(item.id, "qtyPerBox", e.target.value)} /></td>
        <td className="p-0 border-l"><Input type="number" className="h-8 text-xs border-0 bg-transparent rounded-none px-1 w-full text-center" value={item.totalBoxes || ""} onChange={e => updateItem(item.id, "totalBoxes", e.target.value)} /></td>
        <td className="p-0 border-l text-center font-black text-xs px-2 bg-green-50/50 text-green-700">{item.totalUnits || 0}</td>
        <td className="p-0 border-l relative">
          <Input 
            className={`h-8 text-[11px] border-0 bg-transparent rounded-none px-2 ${expiring ? "text-red-600 font-bold bg-red-50" : ""}`} 
            value={item.expDate || ""} 
            placeholder="MMDDYY"
            onChange={e => updateItem(item.id, "expDate", e.target.value)} 
          />
          {expiring && <AlertCircle className="h-3 w-3 absolute right-1 top-2.5 text-red-500 animate-pulse pointer-events-none" />}
        </td>
        <td className="p-0 border-l"><Input type="number" className="h-8 text-[10px] border-0 bg-transparent rounded-none px-1 w-full text-center" value={item.length || ""} onChange={e => updateItem(item.id, "length", e.target.value)} /></td>
        <td className="p-0 border-l"><Input type="number" className="h-8 text-[10px] border-0 bg-transparent rounded-none px-1 w-full text-center" value={item.width || ""} onChange={e => updateItem(item.id, "width", e.target.value)} /></td>
        <td className="p-0 border-l"><Input type="number" className="h-8 text-[10px] border-0 bg-transparent rounded-none px-1 w-full text-center" value={item.height || ""} onChange={e => updateItem(item.id, "height", e.target.value)} /></td>
        <td className="p-0 border-l"><Input type="number" className="h-8 text-xs border-0 bg-transparent rounded-none px-1 w-full text-center font-semibold" value={item.boxWeight || ""} onChange={e => updateItem(item.id, "boxWeight", e.target.value)} /></td>
        <td className="p-0 border-l"><Input className="h-8 text-[11px] border-0 bg-transparent rounded-none px-2 min-w-[150px]" value={item.description || ""} onChange={e => updateItem(item.id, "description", e.target.value)} /></td>
        
        {/* PHOTO COLUMN */}
        <td className="p-1 border-l text-center">
          <div className="flex justify-center items-center">
            {item.imageUrl ? (
              <div 
                className="w-10 h-6 bg-slate-100 rounded border border-slate-200 cursor-pointer overflow-hidden relative group"
                onClick={() => setExpandedImage(item.imageUrl!)}
              >
                <img src={item.imageUrl} alt="Product" className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                  <Plus className="h-3 w-3 text-white" />
                </div>
              </div>
            ) : (
              <Button 
                variant="ghost" 
                size="icon" 
                className={`h-7 w-7 ${uploadingId === item.id ? "animate-pulse" : "text-slate-400 hover:text-blue-600"}`}
                onClick={() => { setSelectedIdForUpload(item.id); fileInputRef.current?.click(); }}
              >
                <Camera className="h-4 w-4" />
              </Button>
            )}
          </div>
        </td>

        <td className="p-0 border-l">
          <div className="flex items-center justify-center gap-1 opacity-20 hover:opacity-100 transition-opacity">
            {item.status === "IN_SHIPMENT" ? (
              <Button variant="ghost" size="icon" className="h-6 w-6 text-orange-600 hover:bg-orange-100" onClick={() => switchItemStatus(item.id, "PENDING")}>
                <ArrowDown className="h-3.5 w-3.5" />
              </Button>
            ) : (
              <Button variant="ghost" size="icon" className="h-6 w-6 text-green-600 hover:bg-green-100" onClick={() => switchItemStatus(item.id, "IN_SHIPMENT")}>
                <ArrowUp className="h-3.5 w-3.5" />
              </Button>
            )}
            <Button variant="ghost" size="icon" className="h-6 w-6 text-red-600 hover:bg-red-100" onClick={() => deleteItem(item.id)}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </td>
      </tr>
    )
  }

  if (loading) return <div className="p-8 text-center animate-pulse text-muted-foreground">Inicializando FBA portal...</div>

  if (!shipment) {
    return (
      <div className="max-w-2xl mx-auto p-12 mt-20 bg-white rounded-3xl shadow-xl border border-blue-50 text-center">
        <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6 text-blue-600">
           <ImageIcon className="h-10 w-10" />
        </div>
        <h2 className="text-3xl font-black mb-3 text-slate-900">No hay Shipment Activo</h2>
        <p className="text-slate-500 mb-10 max-w-sm mx-auto">Comienza un nuevo envío FBA. Los items pendientes de envíos pasados se cargarán automáticamente.</p>
        <div className="flex max-w-md mx-auto items-center gap-3">
          <Input className="h-12 text-lg rounded-xl shadow-inner bg-slate-50 border-slate-200" placeholder="Nombre (Ej: Abril Mediano 2026)" value={newShipmentName} onChange={e => setNewShipmentName(e.target.value)} />
          <Button onClick={handleCreateShipment} className="h-12 px-8 rounded-xl bg-blue-600 hover:bg-blue-700 shadow-lg font-bold">Crear FBA</Button>
        </div>
      </div>
    )
  }

  const inShipmentItems = items.filter(i => i.status === "IN_SHIPMENT")
  const pendingItems = items.filter(i => i.status === "PENDING")

  return (
    <div className="w-full h-full flex flex-col gap-6 pb-40">
      <input type="file" className="hidden" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" />
      
      {/* EXPANDED IMAGE MODAL */}
      <Dialog open={!!expandedImage} onOpenChange={() => setExpandedImage(null)}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden border-0 bg-black/95">
          <div className="relative w-full aspect-video flex items-center justify-center">
             <button className="absolute top-4 right-4 z-50 text-white/50 hover:text-white" onClick={() => setExpandedImage(null)}><X className="h-8 w-8"/></button>
             {expandedImage && (
               <img src={expandedImage} alt="Large View" className="max-w-full max-h-[90vh] object-contain" />
             )}
          </div>
        </DialogContent>
      </Dialog>

      <div className="flex items-end justify-between">
        <div>
          <span className="text-blue-600 font-black text-sm uppercase tracking-widest mb-1 block">Logística de Almacén</span>
          <h1 className="text-4xl font-black tracking-tight text-slate-900 leading-none">FBA Shipment - {shipment.name}</h1>
          <div className="flex items-center gap-3 mt-3">
             <div className="flex items-center gap-1.5 px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold ring-1 ring-green-200 shadow-sm">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" /> ACTIVO
             </div>
             <p className="text-slate-400 text-xs font-medium uppercase tracking-tighter">Última actualización: {new Date(shipment.updatedAt).toLocaleTimeString()}</p>
          </div>
        </div>
        <div className="flex gap-4">
          <Button variant="outline" onClick={exportToExcelObject} className="h-12 gap-2 text-slate-700 border-slate-200 bg-white hover:bg-slate-50 rounded-xl shadow-sm px-6 font-bold">
            <Download className="h-5 w-5" /> Exportar a CSV
          </Button>
          <Button onClick={handleCloseShipment} variant="destructive" className="h-12 gap-2 rounded-xl shadow-lg shadow-red-100 px-6 font-bold">
            Cerrar & Finalizar Envío
          </Button>
        </div>
      </div>

      <Card className="w-full border-0 shadow-2xl rounded-3xl overflow-hidden bg-white">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[1300px]">
            <thead>
              <tr className="bg-[#1e1e2e] text-white/90 text-[10px] uppercase font-black tracking-[0.1em]">
                <th className="py-4 px-3 w-[80px] border-r border-white/5">Location</th>
                <th className="py-4 px-3 w-[85px] border-r border-white/5">Cajas</th>
                <th className="py-4 px-3 min-w-[200px] border-r border-white/5">NOMBRE DEL PRODUCTO</th>
                <th className="py-4 px-3 w-[140px] border-r border-white/5">FnSKU / UPC</th>
                <th className="py-4 px-3 w-[110px] border-r border-white/5">SKU</th>
                <th className="py-4 px-3 w-[70px] border-r border-white/5 text-center leading-none">Uds/Cj</th>
                <th className="py-4 px-3 w-[70px] border-r border-white/5 text-center leading-none">Tot.Cajas</th>
                <th className="py-4 px-3 w-[80px] border-r border-white/5 text-center leading-none text-green-400">Total Uds</th>
                <th className="py-4 px-3 w-[110px] border-r border-white/5">Fecha Exp.</th>
                <th className="py-4 px-3 w-[45px] border-r border-white/5 text-center text-[9px]">L</th>
                <th className="py-4 px-3 w-[45px] border-r border-white/5 text-center text-[9px]">A</th>
                <th className="py-4 px-3 w-[45px] border-r border-white/5 text-center text-[9px]">H</th>
                <th className="py-4 px-3 w-[75px] border-r border-white/5 text-center leading-none">Peso Cj</th>
                <th className="py-4 px-3 w-[220px] border-r border-white/5">Descripción / Notas</th>
                <th className="py-4 px-3 w-[60px] border-r border-white/5 text-center">Foto</th>
                <th className="py-4 px-3 w-[65px] text-center">Shift</th>
              </tr>
            </thead>
            <tbody>
              {inShipmentItems.map(renderRow)}
              {inShipmentItems.length === 0 && (
                <tr>
                  <td colSpan={16} className="py-24 text-center">
                     <p className="text-slate-300 italic text-lg font-medium">No hay items cargados en este lote de envío.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="bg-slate-50/50 p-4 border-t">
          <Button variant="ghost" onClick={handleAddRow} className="w-full h-14 text-slate-500 font-bold gap-3 border-2 border-dashed border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 hover:text-blue-600 transition-all rounded-2xl">
            <Plus className="h-5 w-5" /> AGREGAR NUEVO RENGLÓN DE INVENTARIO
          </Button>
        </div>
      </Card>

      <div className="mt-12 bg-orange-50/20 rounded-3xl p-8 border border-orange-100/50 shadow-inner">
        <div className="flex items-center justify-between mb-6">
           <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center text-orange-600">
                 <ArrowDown className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-xl font-black text-orange-900 leading-none">Palets en Espera / No Enviados</h2>
                <p className="text-sm text-orange-700/60 mt-1 font-medium italic">Estos productos harán "rollover" automáticamente al siguiente envío.</p>
              </div>
           </div>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-orange-200/50 bg-white/70 shadow-sm backdrop-blur">
          <table className="w-full text-left border-collapse min-w-[1300px]">
            <thead>
              <tr className="bg-orange-800 text-white/90 text-[9px] uppercase font-black tracking-widest">
                <th className="py-3 px-3 w-[80px] border-r border-orange-700/50">Location</th>
                <th className="py-3 px-3 w-[85px] border-r border-orange-700/50">Cajas</th>
                <th className="py-3 min-w-[200px] border-r border-orange-700/50 text-orange-100">PRODUCTO PENDIENTE</th>
                <th className="py-3 px-3 w-[140px] border-r border-orange-700/50">FnSKU</th>
                <th className="py-3 px-3 w-[110px] border-r border-orange-700/50">SKU</th>
                <th className="py-3 px-3 w-[70px] border-r border-orange-700/50 text-center">U/C</th>
                <th className="py-3 px-3 w-[70px] border-r border-orange-700/50 text-center">Tot</th>
                <th className="py-3 px-3 w-[80px] border-r border-orange-700/50 text-center">Units</th>
                <th className="py-3 px-3 w-[110px] border-r border-orange-700/50">Exp</th>
                <th className="py-3 px-3 w-[45px] border-r border-orange-700/50 text-center">L</th>
                <th className="py-3 px-3 w-[45px] border-r border-orange-700/50 text-center">A</th>
                <th className="py-3 px-3 w-[45px] border-r border-orange-700/50 text-center">H</th>
                <th className="py-3 px-3 w-[75px] border-r border-orange-700/50 text-center">Weight</th>
                <th className="py-3 px-3 w-[220px] border-r border-orange-700/50">Descripción</th>
                <th className="py-3 px-3 w-[60px] border-r border-orange-700/50 text-center">Foto</th>
                <th className="py-3 px-3 w-[65px] text-center">Reset</th>
              </tr>
            </thead>
            <tbody>
              {pendingItems.map(renderRow)}
              {pendingItems.length === 0 && (
                <tr>
                  <td colSpan={16} className="py-12 text-center text-orange-300 font-medium italic">No hay palets en espera. Todo el stock está asignado al envío activo.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
