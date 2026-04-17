"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Plus, Download, ArrowDown, ArrowUp, Save, Trash2, CheckCircle2, Camera, X, ImageIcon, AlertCircle, Printer, MoveVertical, GripVertical } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import Image from "next/image"
import { compressImage } from "@/lib/image-compression"
import { Reorder, useDragControls } from "framer-motion"
import { memo, useCallback } from "react"

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
  imageUrl?: string | null
  imageUrls?: string[] | null
  sortOrder: number
  status: "IN_SHIPMENT" | "PENDING"
}

// Extracted to module scope to prevent React from unmounting inputs on every keystroke, keeping keyboard focus perfectly stable
const StandaloneRow = memo(({ item, index, isPending, updateItem, deleteItem, switchItemStatus, removeImage, setSelectedIdForUpload, fileInputRef, uploadingId, setFocusedItemId, setExpandedImage }: any) => {
  const controls = useDragControls()
  const handleFocus = useCallback(() => setFocusedItemId(item.id), [item.id, setFocusedItemId])
  const handleBlur = useCallback(() => setFocusedItemId(null), [setFocusedItemId])
  const expiring = item.expDate && new Date(item.expDate.replace(/(\d{2})(\d{2})(\d{2})/, '20$3-$1-$2')) < new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)

  return (
    <Reorder.Item 
      value={item} 
      as="tr" 
      dragListener={false} 
      dragControls={controls} 
      className="border-b hover:bg-slate-50 transition-colors bg-white group/row relative"
    >
      <td className="p-0 border-r w-[30px] bg-slate-50 select-none no-print">
        <div 
           className="w-full h-10 flex items-center justify-center cursor-grab active:cursor-grabbing text-slate-300 hover:bg-slate-200 hover:text-slate-600 transition-colors touch-none"
           style={{ touchAction: "none" }}
           onPointerDown={(e) => {
             e.preventDefault();
             controls.start(e);
           }}
           title="Presiona y arrastra para reordenar"
        >
           <GripVertical className="h-5 w-5" />
        </div>
      </td>
      <td className="p-0"><Input onFocus={handleFocus} onBlur={handleBlur} className="h-8 text-[11px] border-0 bg-transparent rounded-none px-2" value={item.location || ""} onChange={e => updateItem(item.id, "location", e.target.value)} /></td>
      <td className="p-0 border-l"><Input onFocus={handleFocus} onBlur={handleBlur} className="h-8 text-[11px] border-0 bg-transparent rounded-none px-2" value={item.boxOrder || ""} onChange={e => updateItem(item.id, "boxOrder", e.target.value)} /></td>
      <td className="p-0 border-l"><Input onFocus={handleFocus} onBlur={handleBlur} className="h-8 text-[11px] border-0 bg-transparent rounded-none px-2 font-bold text-slate-800" value={item.name || ""} onChange={e => updateItem(item.id, "name", e.target.value)} /></td>
      <td className="p-0 border-l"><Input onFocus={handleFocus} onBlur={handleBlur} className="h-8 text-[10px] border-0 bg-transparent rounded-none px-2" value={item.fnsku || ""} onChange={e => updateItem(item.id, "fnsku", e.target.value)} /></td>
      <td className="p-0 border-l"><Input onFocus={handleFocus} onBlur={handleBlur} className="h-8 text-[10px] border-0 bg-transparent rounded-none px-2" value={item.sku || ""} onChange={e => updateItem(item.id, "sku", e.target.value)} /></td>
      <td className="p-0 border-l"><Input onFocus={handleFocus} onBlur={handleBlur} type="number" className="h-8 text-xs border-0 bg-transparent rounded-none px-1 w-full text-center" value={item.qtyPerBox || ""} onChange={e => updateItem(item.id, "qtyPerBox", e.target.value)} /></td>
      <td className="p-0 border-l"><Input onFocus={handleFocus} onBlur={handleBlur} type="number" className="h-8 text-xs border-0 bg-transparent rounded-none px-1 w-full text-center" value={item.totalBoxes || ""} onChange={e => updateItem(item.id, "totalBoxes", e.target.value)} /></td>
      <td className="p-0 border-l text-center font-black text-xs px-2 bg-green-50/50 text-green-700">{item.totalUnits || 0}</td>
      <td className="p-0 border-l relative">
        <Input 
          onFocus={handleFocus} onBlur={handleBlur}
          className={`h-8 text-[11px] border-0 bg-transparent rounded-none px-2 ${expiring ? "text-red-600 font-bold bg-red-50" : ""}`} 
          value={item.expDate || ""} 
          placeholder="MMDDYY"
          onChange={e => updateItem(item.expDate, "expDate", e.target.value)} 
        />
        {expiring && <AlertCircle className="h-3 w-3 absolute right-1 top-2.5 text-red-500 animate-pulse pointer-events-none" />}
      </td>
      <td className="p-0 border-l"><Input onFocus={handleFocus} onBlur={handleBlur} type="number" className="h-8 text-[10px] border-0 bg-transparent rounded-none px-1 w-full text-center" value={item.length || ""} onChange={e => updateItem(item.id, "length", e.target.value)} /></td>
      <td className="p-0 border-l"><Input onFocus={handleFocus} onBlur={handleBlur} type="number" className="h-8 text-[10px] border-0 bg-transparent rounded-none px-1 w-full text-center" value={item.width || ""} onChange={e => updateItem(item.id, "width", e.target.value)} /></td>
      <td className="p-0 border-l"><Input onFocus={handleFocus} onBlur={handleBlur} type="number" className="h-8 text-[10px] border-0 bg-transparent rounded-none px-1 w-full text-center" value={item.height || ""} onChange={e => updateItem(item.id, "height", e.target.value)} /></td>
      <td className="p-0 border-l"><Input onFocus={handleFocus} onBlur={handleBlur} type="number" className="h-8 text-xs border-0 bg-transparent rounded-none px-1 w-full text-center font-semibold" value={item.boxWeight || ""} onChange={e => updateItem(item.id, "boxWeight", e.target.value)} /></td>
      <td className="p-0 border-l"><Input onFocus={handleFocus} onBlur={handleBlur} className="h-8 text-[11px] border-0 bg-transparent rounded-none px-2 min-w-[150px]" value={item.description || ""} onChange={e => updateItem(item.id, "description", e.target.value)} /></td>
      
      {/* PHOTO COLUMN */}
      <td className="p-1 border-l text-center min-w-[120px] no-print">
        <div className="flex flex-wrap items-center justify-center gap-1 min-w-0 max-w-[150px] mx-auto">
          {item.imageUrls && item.imageUrls.length > 0 ? (
            <>
              {item.imageUrls.map((url: string, idx: number) => (
                <div 
                  key={idx}
                  className="w-[28px] h-[28px] bg-slate-100/50 rounded-md border border-slate-300/80 cursor-pointer overflow-hidden relative group shrink-0"
                >
                  <img 
                    src={url} 
                    alt={`Product ${idx+1}`} 
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" 
                    onClick={() => setExpandedImage(url)}
                  />
                  <button 
                    onClick={(e) => { e.stopPropagation(); if(confirm("¿Borrar esta foto?")) removeImage(item.id, url); }}
                    className="absolute top-0 right-0 bg-red-600/90 text-white rounded-bl shadow-sm p-0.5 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                    title="Eliminar"
                  >
                    <X className="h-2 w-2" />
                  </button>
                </div>
              ))}
              <Button 
                variant="ghost" 
                size="icon" 
                className={`h-7 w-7 shrink-0 rounded-md bg-slate-50 border border-dashed border-slate-300 ${uploadingId === item.id ? "animate-pulse bg-blue-50 border-blue-300 text-blue-500" : "text-slate-400 hover:text-blue-600 hover:bg-blue-50 hover:border-blue-300"}`}
                onClick={() => { setSelectedIdForUpload(item.id); fileInputRef.current?.click(); }}
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </>
          ) : item.imageUrl ? (
            <>
              <div 
                className="w-[30px] h-[30px] bg-slate-100 rounded border border-slate-300 cursor-pointer overflow-hidden relative group shrink-0"
              >
                <img src={item.imageUrl} alt="Product" className="w-full h-full object-cover group-hover:scale-110 transition-transform" onClick={() => setExpandedImage(item.imageUrl!)} />
                <button 
                  onClick={(e) => { e.stopPropagation(); if(confirm("¿Borrar esta foto?")) removeImage(item.id, item.imageUrl!); }}
                  className="absolute top-0 right-0 bg-red-600/90 text-white rounded-bl shadow-sm p-0.5 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                >
                  <X className="h-2 w-2" />
                </button>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                className={`h-7 w-7 shrink-0 rounded-md bg-slate-50 border border-dashed border-slate-300 hover:text-blue-600`}
                onClick={() => { setSelectedIdForUpload(item.id); fileInputRef.current?.click(); }}
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </>
          ) : (
            <Button 
              variant="ghost" 
              size="icon" 
              className={`h-8 w-14 rounded-md border border-slate-200/50 bg-slate-50 shadow-inner ${uploadingId === item.id ? "animate-pulse bg-blue-50 border-blue-200 text-blue-500" : "text-slate-400 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50"}`}
              onClick={() => { setSelectedIdForUpload(item.id); fileInputRef.current?.click(); }}
            >
              <Camera className="h-4 w-4" />
            </Button>
          )}
        </div>
      </td>

      <td className="p-1 border-l no-print bg-slate-50/50 w-[80px]">
        <div className="flex items-center justify-center gap-1 opacity-40 hover:opacity-100 transition-opacity">
          {item.status === "IN_SHIPMENT" ? (
            <Button variant="ghost" size="icon" className="h-7 w-7 text-orange-600 hover:bg-orange-100" onClick={() => switchItemStatus(item.id, "PENDING")}>
              <ArrowDown className="h-4 w-4" />
            </Button>
          ) : (
            <Button variant="ghost" size="icon" className="h-7 w-7 text-green-600 hover:bg-green-100" onClick={() => switchItemStatus(item.id, "IN_SHIPMENT")}>
              <ArrowUp className="h-4 w-4" />
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-7 w-7 text-red-600 hover:bg-red-100" onClick={() => deleteItem(item.id)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </td>
    </Reorder.Item>
  )
})

export default function FbaShipmentsPage() {
  const [shipment, setShipment] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState<FbaItem[]>([])
  const [newShipmentName, setNewShipmentName] = useState("")
  
  const [expandedImage, setExpandedImage] = useState<string | null>(null)
  const [uploadingId, setUploadingId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedIdForUpload, setSelectedIdForUpload] = useState<string | null>(null)
  
  const [focusedItemId, setFocusedItemId] = useState<string | null>(null)
  
  useEffect(() => {
    if (!shipment?.id) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/admin/fba-shipments");
        const data = await res.json();
        if (data && data.items && data.id === shipment.id) {
          setItems(currentItems => {
            const newItems = data.items.map((serverItem: any) => {
              const localItem = currentItems.find(li => li.id === serverItem.id);
              if (localItem && focusedItemId === localItem.id) return localItem;
              return serverItem;
            });
            return newItems;
          });
        }
      } catch (error) {}
    }, 10000);
    return () => clearInterval(interval);
  }, [shipment?.id, focusedItemId]);

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
    const maxSortOrder = items.length > 0 ? Math.max(...items.map(i => i.sortOrder || 0)) : 0
    const res = await fetch(`/api/admin/fba-shipments/${shipment.id}/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "", sortOrder: maxSortOrder + 1 })
    })
    if (res.ok) fetchActiveShipment()
  }

  const formatDateString = (raw: string) => {
    const digits = raw.replace(/\D/g, "")
    if (digits.length === 6) {
      return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/20${digits.slice(4, 6)}`
    } else if (digits.length === 8) {
      return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4, 8)}`
    }
    return raw
  }

  const updateItem = async (itemId: string, field: string, value: any) => {
    let finalValue = value
    if (field === "expDate" && value.length >= 6 && !value.includes("/")) {
      finalValue = formatDateString(value)
    }
    setItems(items.map(i => i.id === itemId ? { ...i, [field]: finalValue } : i))
    const payload: any = { [field]: finalValue === "" ? null : finalValue }
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
    const files = Array.from(e.target.files || [])
    if (files.length === 0 || !selectedIdForUpload) return
    setUploadingId(selectedIdForUpload)
    try {
      let currentItem = items.find(i => i.id === selectedIdForUpload)
      let currentUrls = currentItem?.imageUrls || (currentItem?.imageUrl ? [currentItem.imageUrl] : [])
      for (const file of files) {
        const compressed = await compressImage(file)
        const fd = new FormData()
        fd.append("file", compressed)
        const res = await fetch(`/api/admin/fba-shipments/items/${selectedIdForUpload}/image`, {
          method: "POST",
          body: fd
        })
        if (res.ok) {
          const updated = await res.json()
          currentUrls = updated.imageUrls || [updated.imageUrl]
          setItems(items => items.map(i => i.id === selectedIdForUpload ? { ...i, imageUrls: currentUrls, imageUrl: updated.imageUrl } : i))
        }
      }
    } catch(e) {
      console.error(e)
    } finally {
      setUploadingId(null)
      setSelectedIdForUpload(null)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  const removeImage = async (itemId: string, imageUrlToRemove: string) => {
    const item = items.find(i => i.id === itemId)
    if (!item) return
    let updates: any = {}
    if (item.imageUrl === imageUrlToRemove) {
      updates.imageUrl = null
      setItems(prev => prev.map(i => i.id === itemId ? { ...i, imageUrl: null } : i))
    }
    if (item.imageUrls?.includes(imageUrlToRemove)) {
      const newImageUrls = item.imageUrls.filter(url => url !== imageUrlToRemove)
      updates.imageUrls = newImageUrls
      setItems(prev => prev.map(i => i.id === itemId ? { ...i, imageUrls: newImageUrls } : i))
    }
    if (Object.keys(updates).length > 0) {
      try {
        await fetch(`/api/admin/fba-shipments/${itemId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates)
        })
      } catch (error) {
        console.error("Error removing image:", error)
      }
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

  const handleDragReorder = async (newOrderedList: FbaItem[], targetStatus: "IN_SHIPMENT" | "PENDING") => {
    const listAIDs = newOrderedList.map(i => i.id).join(",");
    const listBIDs = items.filter(i => i.status === targetStatus).map(i => i.id).join(",");
    if (listAIDs === listBIDs) return;
    const otherList = items.filter(i => i.status !== targetStatus);
    const sorted = newOrderedList.map((item, idx) => ({ ...item, sortOrder: idx }));
    const completeList = targetStatus === "IN_SHIPMENT" ? [...sorted, ...otherList] : [...otherList, ...sorted];
    setItems(completeList);
    await fetch(`/api/admin/fba-shipments/${shipment.id}/reorder`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: sorted.map(i => ({ id: i.id, sortOrder: i.sortOrder })) })
    })
  }

  const handlePrint = () => window.print();

  const exportToExcelObject = () => {
    if (!shipment) return
    const activeItems = items.filter(i => i.status === "IN_SHIPMENT")
    
    let tableHtml = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8" />
        <style>
          table { border-collapse: collapse; font-family: "Calibri", "Arial", sans-serif; }
          th { 
            background-color: #06402B !important; 
            color: #ffffff !important; 
            font-weight: bold !important; 
            font-size: 14px !important;
            border: 2pt solid #000000 !important; 
            height: 60px !important; 
            text-align: center; 
            vertical-align: middle;
            padding: 10px;
          }
          td { 
            border: 1px solid #b0b0b0; 
            padding: 4px 8px; 
            font-size: 11px;
            text-align: center; 
            vertical-align: middle; 
          }
          .name-col { font-weight: bold; text-align: left; background-color: #fafafa; }
        </style>
      </head>
      <body>
        <h2 style="color: #1f4e3d; font-family: Calibri;">INVENTARIO FBA - ${shipment.name}</h2>
        <table>
          <thead>
            <tr style="height: 60px;" height="60">
              <th style="width: 100px;">Location</th>
              <th style="width: 120px;">Orden de Cajas</th>
              <th style="width: 300px;">NOMBRE COMPLETO DEL PRODUCTO</th>
              <th style="width: 150px;">FnSKU</th>
              <th style="width: 110px;">SKU</th>
              <th style="width: 90px;">Uds/Caja</th>
              <th style="width: 100px;">Total Cajas</th>
              <th style="width: 110px;">Total Unidades</th>
              <th style="width: 120px;">Exp.</th>
              <th style="width: 60px;">L</th>
              <th style="width: 60px;">A</th>
              <th style="width: 60px;">H</th>
              <th style="width: 90px;">Peso</th>
              <th style="width: 250px;">Descripción</th>
            </tr>
          </thead>
          <tbody>
    `
    activeItems.forEach(i => {
      tableHtml += `
            <tr>
              <td>${i.location || ""}</td>
              <td>${i.boxOrder || ""}</td>
              <td class="name-col">${i.name || ""}</td>
              <td>${i.fnsku || ""}</td>
              <td>${i.sku || ""}</td>
              <td>${i.qtyPerBox || ""}</td>
              <td>${i.totalBoxes || ""}</td>
              <td style="font-weight: bold; background-color: #f0fdf4;">${i.totalUnits || 0}</td>
              <td>${i.expDate || ""}</td>
              <td>${i.length || ""}</td>
              <td>${i.width || ""}</td>
              <td>${i.height || ""}</td>
              <td>${i.boxWeight || ""}</td>
              <td>${i.description || ""}</td>
            </tr>
      `
    })
    tableHtml += `</tbody></table></body></html>`
    
    const blob = new Blob([tableHtml], { type: "application/vnd.ms-excel" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `FBA_Shipment_${shipment.name}.xls`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (loading) return <div className="p-8 text-center animate-pulse text-muted-foreground">Inicializando FBA portal...</div>

  if (!shipment) {
    return (
      <div className="max-w-2xl mx-auto p-12 mt-20 bg-white rounded-3xl shadow-xl border border-blue-50 text-center">
        <h2 className="text-3xl font-black mb-3 text-slate-900">No hay Shipment Activo</h2>
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
    <>
      <style jsx global>{`
        @media print {
          title, meta, .no-print, nav, aside, header, button, .flex-gap-4 { display: none !important; }
          /* Targeted sidebar removal */
          [class*="sidebar"], [class*="AdminSidebar"] { display: none !important; }
          
          body { background: white !important; margin: 0 !important; padding: 0 !important; }
          .print-area { 
            display: block !important; 
            width: 100% !important; 
            margin: 0 !important; 
            padding: 10px !important;
            transform: scale(0.98);
            transform-origin: top left;
          }
          .card-print { 
            box-shadow: none !important; 
            border: 1px solid #eee !important;
            border-radius: 0 !important;
            width: 100% !important;
            margin-bottom: 20px !important;
          }
          .overflow-x-auto { overflow: visible !important; }
          table { width: 100% !important; border-collapse: collapse !important; }
          th, td { border: 1px solid #ddd !important; font-size: 10px !important; }
          .bg-orange-50\/20 { background: transparent !important; border: 1px solid #eee !important; }
        }
      `}</style>
      <div className="w-full min-h-full flex flex-col gap-6 pb-40 print-area">
        <input type="file" multiple className="hidden" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" />
      
      <div className="flex items-end justify-between">
        <div className="mb-4">
          <h1 className="text-4xl font-black tracking-tight text-slate-900 leading-none">FBA Shipment - {shipment.name}</h1>
        </div>
        <div className="flex gap-4 no-print pb-3">
          <Button variant="outline" onClick={handlePrint} className="h-12 gap-2 text-slate-700 border-slate-200 bg-white hover:bg-slate-50 rounded-xl shadow-sm px-6 font-bold">
            <Printer className="h-5 w-5" /> Imprimir
          </Button>
          <Button variant="outline" onClick={exportToExcelObject} className="h-12 gap-2 text-blue-700 border-blue-200 bg-blue-50 hover:bg-blue-100 rounded-xl shadow-sm px-6 font-bold">
            <Download className="h-5 w-5" /> Exportar a Excel
          </Button>
          <Button onClick={handleCloseShipment} variant="destructive" className="h-12 gap-2 rounded-xl shadow-lg shadow-red-100 px-6 font-bold">
            Cerrar & Finalizar Envío
          </Button>
        </div>
      </div>

      <Card className="w-full border-0 shadow-2xl rounded-3xl overflow-hidden bg-white card-print">
        <div className="overflow-x-auto overflow-y-hidden custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[1400px]">
            <thead>
              <tr className="bg-[#1f4e3d] text-white text-[11px] uppercase font-black tracking-wider">
                <th className="py-5 px-1 w-[30px] border-r border-white/10 text-center bg-[#163a2d]"></th>
                <th className="py-5 px-3 w-[100px] border-r border-white/10">Location</th>
                <th className="py-5 px-3 w-[120px] border-r border-white/10">Orden de Cajas</th>
                <th className="py-5 px-4 min-w-[250px] border-r border-white/10">Nombre del Producto</th>
                <th className="py-5 px-3 w-[150px] border-r border-white/10 text-center">FnSKU / UPC</th>
                <th className="py-5 px-3 w-[120px] border-r border-white/10 text-center">SKU</th>
                <th className="py-5 px-3 w-[90px] border-r border-white/10 text-center">Uds/Caja</th>
                <th className="py-5 px-3 w-[110px] border-r border-white/10 text-center leading-tight bg-[#245d48]">Total Cajas<br/><span className="text-orange-400 text-[12px] block mt-1">({inShipmentItems.reduce((acc, i) => acc + (parseInt(i.totalBoxes as string) || 0), 0)})</span></th>
                <th className="py-5 px-3 w-[110px] border-r border-white/10 text-center leading-tight bg-[#245d48]">Total Unidades<br/><span className="text-green-300 text-[12px] block mt-1">({inShipmentItems.reduce((acc, i) => acc + (parseInt(i.totalUnits as string) || 0), 0)})</span></th>
                <th className="py-5 px-3 w-[130px] border-r border-white/10 text-center">Exp.</th>
                <th className="py-5 px-2 w-[60px] border-r border-white/10 text-center">L</th>
                <th className="py-5 px-2 w-[60px] border-r border-white/10 text-center">A</th>
                <th className="py-5 px-2 w-[60px] border-r border-white/10 text-center">H</th>
                <th className="py-5 px-3 w-[100px] border-r border-white/10 text-center">Peso</th>
                <th className="py-5 px-4 w-[250px] border-r border-white/10">Descripción</th>
                <th className="py-5 px-3 w-[140px] border-r border-white/10 text-center">Fotos</th>
                <th className="py-5 px-3 w-[70px] text-center bg-[#163a2d] no-print">Acción</th>
              </tr>
            </thead>
            <Reorder.Group axis="y" as="tbody" values={inShipmentItems} onReorder={(v) => handleDragReorder(v, "IN_SHIPMENT")} className="divide-y divide-slate-100 relative">
              {inShipmentItems.map((item, index) => (
                <StandaloneRow 
                  key={item.id} item={item} index={index} isPending={false}
                  updateItem={updateItem} deleteItem={deleteItem} switchItemStatus={switchItemStatus}
                  removeImage={removeImage} setSelectedIdForUpload={setSelectedIdForUpload}
                  fileInputRef={fileInputRef} uploadingId={uploadingId} setFocusedItemId={setFocusedItemId}
                  setExpandedImage={setExpandedImage}
                />
              ))}
            </Reorder.Group>
          </table>
        </div>
        <div className="bg-slate-50/50 p-4 border-t no-print">
          <Button variant="ghost" onClick={handleAddRow} className="w-full h-14 text-slate-500 font-bold gap-3 border-2 border-dashed border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 hover:text-blue-600 transition-all rounded-2xl">
            <Plus className="h-5 w-5" /> AGREGAR NUEVO RENGLÓN
          </Button>
        </div>
      </Card>

      <div className="mt-12 bg-orange-50/20 rounded-3xl p-8 border border-orange-100/50 shadow-inner">
        <h2 className="text-xl font-black text-orange-900 mb-6">Palets en Espera</h2>
        <div className="overflow-x-auto overflow-y-hidden custom-scrollbar mt-4 rounded-3xl border shadow-inner">
          <table className="w-full text-left border-collapse min-w-[1300px]">
            <thead>
              <tr className="bg-orange-800 text-white/90 text-[9px] uppercase font-black tracking-widest">
                <th className="py-3 px-1 w-[30px] border-r border-orange-700/50 text-center"></th>
                <th className="py-3 px-3 w-[100px] border-r border-orange-700/50">Location</th>
                <th className="py-3 px-3 w-[120px] border-r border-orange-700/50">Orden de Cajas</th>
                <th className="py-3 min-w-[200px] border-r border-orange-700/50 text-orange-100">PRODUCTO PENDIENTE</th>
                <th className="py-3 px-3 w-[140px] border-r border-orange-700/50">FnSKU</th>
                <th className="py-3 px-3 w-[110px] border-r border-orange-700/50">SKU</th>
                <th className="py-3 px-3 w-[90px] border-r border-orange-700/50 text-center">Uds/Caja</th>
                <th className="py-3 px-3 w-[90px] border-r border-orange-700/50 text-center leading-tight">Total Cajas<br/><span className="text-orange-400 text-[10px] block font-bold">({pendingItems.reduce((acc, i) => acc + (parseInt(i.totalBoxes as string) || 0), 0)})</span></th>
                <th className="py-3 px-3 w-[90px] border-r border-orange-700/50 text-center leading-tight">Total Unidades<br/><span className="text-green-300 text-[10px] block font-bold">({pendingItems.reduce((acc, i) => acc + (parseInt(i.totalUnits as string) || 0), 0)})</span></th>
                <th className="py-3 px-3 w-[110px] border-r border-orange-700/50">Exp.</th>
                <th className="py-3 px-3 w-[60px] border-r border-orange-700/50 text-center">L</th>
                <th className="py-3 px-3 w-[60px] border-r border-orange-700/50 text-center">A</th>
                <th className="py-3 px-3 w-[60px] border-r border-orange-700/50 text-center">H</th>
                <th className="py-3 px-3 w-[100px] border-r border-orange-700/50 text-center">Peso</th>
                <th className="py-3 px-3 w-[220px] border-r border-orange-700/50">Descripción</th>
                <th className="py-3 px-3 w-[140px] border-r border-orange-700/50 text-center">Foto</th>
                <th className="py-3 px-3 w-[70px] text-center no-print">Acción</th>
              </tr>
            </thead>
            <Reorder.Group axis="y" as="tbody" values={pendingItems} onReorder={(v) => handleDragReorder(v, "PENDING")} className="divide-y divide-slate-100 relative">
              {pendingItems.map((item, index) => (
                <StandaloneRow 
                  key={item.id} item={item} index={index} isPending={true}
                  updateItem={updateItem} deleteItem={deleteItem} switchItemStatus={switchItemStatus}
                  removeImage={removeImage} setSelectedIdForUpload={setSelectedIdForUpload}
                  fileInputRef={fileInputRef} uploadingId={uploadingId} setFocusedItemId={setFocusedItemId}
                  setExpandedImage={setExpandedImage}
                />
              ))}
            </Reorder.Group>
          </table>
        </div>
      </div>
    </div>
  </>
)
}
