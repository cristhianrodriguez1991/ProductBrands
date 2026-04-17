"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Plus, Download, ArrowDown, ArrowUp, Save, Trash2, CheckCircle2, Camera, X, ImageIcon, AlertCircle, Printer, MoveVertical, GripVertical, LayoutGrid, Maximize2, MousePointer2 } from "lucide-react"
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
  const [tabs, setTabs] = useState<any[]>([]) // Array of { id, name, items, status }
  const [activeTabId, setActiveTabId] = useState<string>("dashboard")
  const [loading, setLoading] = useState(true)
  const [activeShipments, setActiveShipments] = useState<any[]>([])
  const [pastShipments, setPastShipments] = useState<any[]>([])
  const [newShipmentName, setNewShipmentName] = useState("")
  
  const [expandedImage, setExpandedImage] = useState<string | null>(null)
  const [uploadingId, setUploadingId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedIdForUpload, setSelectedIdForUpload] = useState<string | null>(null)
  const [focusedItemId, setFocusedItemId] = useState<string | null>(null)

  const fetchActiveShipmentsList = async () => {
    try {
      const res = await fetch("/api/admin/fba-shipments/active")
      const data = await res.json()
      if (Array.isArray(data)) setActiveShipments(data)
    } catch(e) {}
  }

  const fetchHistory = async () => {
    try {
      const res = await fetch("/api/admin/fba-shipments/history")
      const data = await res.json()
      if (Array.isArray(data)) setPastShipments(data)
    } catch(e) {}
  }

  useEffect(() => {
    const init = async () => {
      await Promise.all([fetchActiveShipmentsList(), fetchHistory()])
      setLoading(false)
    }
    init()
  }, [])

  useEffect(() => {
    if (activeTabId === "dashboard") return
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/admin/fba-shipments?id=${activeTabId}`)
        const data = await res.json()
        if (data && data.items) {
          setTabs(currentTabs => currentTabs.map(t => {
            if (t.id !== activeTabId) return t
            const updatedItems = data.items.map((serverItem: any) => {
              const localItem = t.items.find((li: any) => li.id === serverItem.id)
              if (localItem && focusedItemId === localItem.id) return localItem
              return serverItem
            })
            return { ...t, items: updatedItems }
          }))
        }
      } catch (error) {}
    }, 10000)
    return () => clearInterval(interval)
  }, [activeTabId, focusedItemId])

  const openTab = async (shId: string) => {
    if (tabs.find(t => t.id === shId)) {
      setActiveTabId(shId)
      return
    }
    try {
      const res = await fetch(`/api/admin/fba-shipments?id=${shId}`)
      const data = await res.json()
      if (data && data.id) {
        setTabs(prev => [...prev, { 
          id: data.id, 
          name: data.name, 
          status: data.status, 
          items: data.items || [] 
        }])
        setActiveTabId(data.id)
      }
    } catch(e) {
      alert("Error al abrir el envío.")
    }
  }

  const closeTab = (shId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    const newTabs = tabs.filter(t => t.id !== shId)
    setTabs(newTabs)
    if (activeTabId === shId) {
      setActiveTabId(newTabs.length > 0 ? newTabs[newTabs.length - 1].id : "dashboard")
    }
  }

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
        fetchActiveShipmentsList()
        openTab(data.id)
      } else {
        alert(data.error)
      }
    } catch(e) {}
  }

  const handleReopenShipment = async (sh: any) => {
    if (!confirm(`¿Deseas reabrir "${sh.name}" para editarlo?`)) return
    try {
      await fetch(`/api/admin/fba-shipments/${sh.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "ACTIVE" })
      })
      await Promise.all([fetchActiveShipmentsList(), fetchHistory()])
      openTab(sh.id)
    } catch(e) {}
  }

  const handleFinalizeShipment = async (shId: string) => {
    const tab = tabs.find(t => t.id === shId)
    if (!tab) return
    if (!confirm("¿Seguro que quieres finalizar este envío? Se archivará y se descargará el Excel.")) return
    try {
      exportToExcelObject(tab, tab.items)
      await fetch(`/api/admin/fba-shipments/${shId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "CLOSED" })
      })
      closeTab(shId)
      await Promise.all([fetchActiveShipmentsList(), fetchHistory()])
    } catch(e) {}
  }

  const updateItem = async (itemId: string, field: string, value: any) => {
    const currentTabId = activeTabId
    if (currentTabId === "dashboard") return

    let finalValue = value
    if (field === "expDate" && value.length >= 6 && !value.includes("/")) {
      finalValue = formatDateString(value)
    }

    setTabs(prev => prev.map(t => {
      if (t.id !== currentTabId) return t
      const newItems = t.items.map((i: any) => {
        if (i.id !== itemId) return i
        let updated = { ...i, [field]: finalValue }
        if (field === "qtyPerBox" || field === "totalBoxes") {
           const qty = field === "qtyPerBox" ? value : (i.qtyPerBox || 0)
           const boxes = field === "totalBoxes" ? value : (i.totalBoxes || 0)
           updated.totalUnits = (parseInt(qty) || 0) * (parseInt(boxes) || 0)
        }
        return updated
      })
      return { ...t, items: newItems }
    }))

    const activeTab = tabs.find(t => t.id === currentTabId)
    const itemBefore = activeTab?.items.find((i: any) => i.id === itemId)
    const payload: any = { 
      [field]: finalValue === "" ? null : finalValue,
      totalUnits: (field === "qtyPerBox" || field === "totalBoxes") ? 
        ((parseInt(field === "qtyPerBox" ? value : itemBefore.qtyPerBox) || 0) * (parseInt(field === "totalBoxes" ? value : itemBefore.totalBoxes) || 0)) 
        : undefined
    }

    await fetch(`/api/admin/fba-shipments/items/${itemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    })
  }

  const handleAddRow = async (shId: string) => {
    const tab = tabs.find(t => t.id === shId)
    if (!tab) return
    const maxSortOrder = tab.items.length > 0 ? Math.max(...tab.items.map((i: any) => i.sortOrder || 0)) : 0
    const res = await fetch(`/api/admin/fba-shipments/${shId}/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "", sortOrder: maxSortOrder + 1 })
    })
    if (res.ok) {
      const updated = await (await fetch(`/api/admin/fba-shipments?id=${shId}`)).json()
      setTabs(prev => prev.map(t => t.id === shId ? { ...t, items: updated.items } : t))
    }
  }

  const handleDragReorder = async (newOrderedList: any[], targetStatus: string) => {
    if (activeTabId === "dashboard") return
    const currentTab = tabs.find(t => t.id === activeTabId)
    if (!currentTab) return

    const otherList = currentTab.items.filter((i: any) => i.status !== targetStatus)
    const sorted = newOrderedList.map((item, idx) => ({ ...item, sortOrder: idx }))
    const completeList = targetStatus === "IN_SHIPMENT" ? [...sorted, ...otherList] : [...otherList, ...sorted]
    
    setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, items: completeList } : t))

    await fetch(`/api/admin/fba-shipments/${activeTabId}/reorder`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: sorted.map(i => ({ id: i.id, sortOrder: i.sortOrder })) })
    })
  }

  const switchItemStatus = async (itemId: string, newStatus: string) => {
    setTabs(prev => prev.map(t => {
      if (t.id !== activeTabId) return t
      return { ...t, items: t.items.map((i: any) => i.id === itemId ? { ...i, status: newStatus } : i) }
    }))
    await fetch(`/api/admin/fba-shipments/items/${itemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus })
    })
  }

  const deleteItem = async (shId: string, itemId: string) => {
    if (!confirm("Remove this item?")) return
    setTabs(prev => prev.map(t => {
      if (t.id !== shId) return t
      return { ...t, items: t.items.filter((i: any) => i.id !== itemId) }
    }))
    await fetch(`/api/admin/fba-shipments/items/${itemId}`, { method: "DELETE" })
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0 || !selectedIdForUpload || activeTabId === "dashboard") return
    setUploadingId(selectedIdForUpload)
    try {
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
          setTabs(prev => prev.map(t => {
            if (t.id !== activeTabId) return t
            return { ...t, items: t.items.map((i: any) => i.id === selectedIdForUpload ? { ...i, imageUrls: updated.imageUrls, imageUrl: updated.imageUrl } : i) }
          }))
        }
      }
    } catch(e) {} finally {
      setUploadingId(null)
      setSelectedIdForUpload(null)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  const removeImage = async (itemId: string, imageUrlToRemove: string) => {
    setTabs(prev => prev.map(t => {
      if (t.id !== activeTabId) return t
      return { ...t, items: t.items.map((i: any) => {
        if (i.id !== itemId) return i
        let updates: any = { ...i }
        if (i.imageUrl === imageUrlToRemove) updates.imageUrl = null
        if (i.imageUrls?.includes(imageUrlToRemove)) updates.imageUrls = i.imageUrls.filter((u: string) => u !== imageUrlToRemove)
        return updates
      }) }
    }))
    try {
      await fetch(`/api/admin/fba-shipments/items/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: null, imageUrls: [] })
      })
    } catch (e) {}
  }

  const exportToExcelObject = (targetShipment: any, targetItems: any[]) => {
    if (!targetShipment) return
    const activeItems = targetItems.filter((i: any) => i.status === "IN_SHIPMENT")
    
    let tableHtml = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8" />
        <style>
          table { border-collapse: collapse; font-family: "Calibri", "Arial", sans-serif; }
          th { background-color: #06402B !important; color: #ffffff !important; font-weight: bold !important; font-size: 14px !important; border: 2pt solid #000000 !important; height: 60px !important; text-align: center; vertical-align: middle; padding: 10px; }
          td { border: 1px solid #b0b0b0; padding: 4px 8px; font-size: 11px; text-align: center; vertical-align: middle; }
        </style>
      </head>
      <body>
        <h2 style="color: #1f4e3d; font-family: Calibri;">INVENTARIO FBA - ${targetShipment.name}</h2>
        <table>
          <thead>
            <tr style="height: 60px;"><th style="width: 100px;">Location</th><th style="width: 120px;">Orden de Cajas</th><th style="width: 300px;">NOMBRE COMPLETO DEL PRODUCTO</th><th style="width: 150px;">FnSKU</th><th style="width: 110px;">SKU</th><th style="width: 90px;">Uds/Caja</th><th style="width: 100px;">Total Cajas</th><th style="width: 110px;">Total Unidades</th><th style="width: 120px;">Exp.</th><th style="width: 60px;">L</th><th style="width: 60px;">A</th><th style="width: 60px;">H</th><th style="width: 90px;">Peso</th><th style="width: 250px;">Descripción</th></tr>
          </thead>
          <tbody>
    `
    activeItems.forEach(i => {
      tableHtml += `
            <tr><td>${i.location || ""}</td><td>${i.boxOrder || ""}</td><td style="font-weight:bold;">${i.name || ""}</td><td style="mso-number-format:'\\@';">${i.fnsku ? `&#8203;${i.fnsku}` : ""}</td><td style="mso-number-format:'\\@';">${i.sku ? `&#8203;${i.sku}` : ""}</td><td>${i.qtyPerBox || ""}</td><td>${i.totalBoxes || ""}</td><td style="font-weight:bold; background-color:#f0fdf4;">${i.totalUnits || 0}</td><td>${i.expDate || ""}</td><td>${i.length || ""}</td><td>${i.width || ""}</td><td>${i.height || ""}</td><td>${i.boxWeight || ""}</td><td>${i.description || ""}</td></tr>
      `
    })
    tableHtml += `</tbody></table></body></html>`
    const blob = new Blob([tableHtml], { type: "application/vnd.ms-excel" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `FBA_Shipment_${targetShipment.name}.xls`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const formatDateString = (raw: string) => {
    const digits = raw.replace(/\D/g, "")
    if (digits.length === 6) return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/20${digits.slice(4, 6)}`
    if (digits.length === 8) return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4, 8)}`
    return raw
  }

  if (loading) return <div className="p-12 text-center animate-pulse text-slate-400 font-bold">Cargando Sistema FBA...</div>

  return (
    <>
      <style jsx global>{`
        @media print {
          @page { size: landscape; margin: 0.5cm; }
          body * { visibility: hidden; }
          .print-area, .print-area * { visibility: visible; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          .print-area { position: absolute; left: 0; top: 0; width: 100% !important; padding: 0 !important; margin: 0 !important; }
          .no-print, .tab-bar, button { display: none !important; }
          .card-print { box-shadow: none !important; border: 1px solid #eee !important; border-radius: 12px !important; }
          table { width: 100% !important; border-collapse: collapse !important; }
          th { background-color: #1f4e3d !important; color: white !important; -webkit-print-color-adjust: exact; }
        }
      `}</style>

      <div className="w-full flex flex-col h-full bg-slate-50 min-h-screen">
        <div className="tab-bar no-print flex items-end gap-1 px-4 bg-white border-b border-slate-200 overflow-x-auto overflow-y-hidden custom-scrollbar pt-4">
          <div 
            onClick={() => setActiveTabId("dashboard")}
            className={`flex items-center gap-2 px-6 py-3 rounded-t-xl cursor-pointer transition-all font-bold min-w-[150px] justify-center ${activeTabId === "dashboard" ? "bg-slate-50 text-blue-600 border-x border-t border-slate-200 -mb-[1px]" : "text-slate-400 hover:text-slate-600 hover:bg-slate-50/50"}`}
          >
            <LayoutGrid className="h-4 w-4" /> Tablero Global
          </div>
          
          {tabs.map(tab => (
            <div 
              key={tab.id}
              onClick={() => setActiveTabId(tab.id)}
              className={`flex items-center gap-2 px-6 py-3 rounded-t-xl cursor-pointer transition-all font-bold min-w-[200px] border-x border-t relative group ${activeTabId === tab.id ? "bg-slate-50 text-slate-900 border-slate-200 -mb-[1px]" : "bg-white text-slate-400 border-transparent hover:bg-slate-50/50"}`}
            >
              <span className="truncate max-w-[150px]">{tab.name}</span>
              <button 
                onClick={(e) => closeTab(tab.id, e)}
                className="ml-auto opacity-0 group-hover:opacity-100 hover:bg-slate-200 rounded-full p-0.5 transition-all text-slate-500"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}

          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setActiveTabId("dashboard")}
            className="mb-1 rounded-full w-8 h-8 p-0 text-slate-400 hover:text-blue-600 hover:bg-blue-50"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 w-full max-w-[1800px] mx-auto p-6 md:p-8 print-area">
          <input type="file" multiple className="hidden" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" />

          {activeTabId === "dashboard" ? (
            <div className="no-print">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-8 space-y-8">
                  <div className="bg-white rounded-[2rem] shadow-xl shadow-slate-200/50 p-10 border border-slate-100">
                    <h2 className="text-3xl font-black mb-2 text-slate-900">Portal de Envíos FBA</h2>
                    <p className="text-slate-500 mb-8 max-w-lg">Crea un nuevo shipment o continúa trabajando en los envíos abiertos.</p>
                    <div className="flex max-w-md items-center gap-3">
                      <Input 
                        className="h-14 text-lg rounded-2xl shadow-inner bg-slate-50 border-slate-200" 
                        placeholder="Nombre del Envío" 
                        value={newShipmentName} 
                        onChange={e => setNewShipmentName(e.target.value)} 
                      />
                      <Button onClick={handleCreateShipment} className="h-14 px-8 rounded-2xl bg-blue-600 hover:bg-blue-700 shadow-lg font-bold">Crear</Button>
                    </div>
                  </div>

                  {activeShipments.length > 0 && (
                    <div className="space-y-4">
                      <h3 className="text-xl font-black text-slate-800 flex items-center gap-2 px-4">
                        <MousePointer2 className="h-5 w-5 text-blue-500" /> EnProgreso
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {activeShipments.map(sh => (
                          <Card key={sh.id} className="p-6 rounded-3xl shadow-sm border-slate-200 bg-white hover:border-blue-400 transition-all hover:shadow-lg group">
                            <div className="flex justify-between items-start mb-4">
                              <div>
                                <h4 className="font-bold text-xl text-slate-900 truncate max-w-[200px]">{sh.name}</h4>
                                <p className="text-xs text-slate-400">{new Date(sh.createdAt).toLocaleDateString()}</p>
                              </div>
                              <span className="text-[10px] font-bold px-3 py-1 bg-blue-50 text-blue-600 rounded-full">ACTIVO</span>
                            </div>
                            <Button onClick={() => openTab(sh.id)} className="w-full h-11 rounded-2xl bg-slate-900 hover:bg-black font-bold gap-2">Abrir Tab <Maximize2 className="h-4 w-4" /></Button>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="lg:col-span-4 space-y-6">
                  <h3 className="text-xl font-black text-slate-800 flex items-center gap-2 px-2">
                    <CheckCircle2 className="h-5 w-5 text-green-500" /> Historial
                  </h3>
                  <div className="flex flex-col gap-3 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
                    {pastShipments.map(sh => (
                      <Card key={sh.id} className="p-5 rounded-2xl border-slate-100 bg-white">
                        <h4 className="font-bold text-slate-800 truncate mb-1">{sh.name}</h4>
                        <p className="text-[10px] text-slate-400 mb-3">{new Date(sh.updatedAt).toLocaleDateString()}</p>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" className="flex-1 rounded-xl text-blue-600" onClick={() => exportToExcelObject(sh, sh.items)}>Excel</Button>
                          <Button variant="ghost" size="sm" className="flex-1 rounded-xl border border-slate-100" onClick={() => handleReopenShipment(sh)}>Reabrir</Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            (() => {
              const tab = tabs.find(t => t.id === activeTabId)
              if (!tab) return null
              const inItems = tab.items.filter((i: any) => i.status === "IN_SHIPMENT")
              const pItems = tab.items.filter((i: any) => i.status === "PENDING")

              return (
                <div className="flex flex-col gap-6">
                  <div className="flex items-end justify-between">
                    <div>
                      <h1 className="text-4xl font-black text-slate-900">{tab.name}</h1>
                      <p className="text-slate-400">Panel de Control de Envío</p>
                    </div>
                    <div className="flex gap-3 no-print pb-1">
                      <Button variant="outline" onClick={() => window.print()} className="h-12 bg-white rounded-xl px-6 font-bold"><Printer className="h-5 w-5" /></Button>
                      <Button variant="outline" onClick={() => exportToExcelObject(tab, tab.items)} className="h-12 bg-blue-50 text-blue-700 rounded-xl px-6 font-bold">Excel</Button>
                      <Button variant="secondary" onClick={() => closeTab(tab.id)} className="h-12 rounded-xl px-6 font-bold">Pausar</Button>
                      <Button onClick={() => handleFinalizeShipment(tab.id)} variant="destructive" className="h-12 rounded-xl px-6 font-bold">Finalizar</Button>
                    </div>
                  </div>

                  <Card className="w-full border-0 shadow-2xl rounded-[2.5rem] overflow-hidden bg-white card-print">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left min-w-[1400px]">
                        <thead>
                          <tr className="bg-[#1f4e3d] text-white text-[11px] uppercase font-bold">
                            <th className="py-5 px-1 w-[30px] text-center bg-[#163a2d]"></th>
                            <th className="py-5 px-3 w-[100px]">Location</th>
                            <th className="py-5 px-3 w-[120px]">Orden</th>
                            <th className="py-5 px-4 min-w-[250px]">Nombre</th>
                            <th className="py-5 px-3 w-[150px] text-center">FnSKU</th>
                            <th className="py-5 px-3 w-[120px] text-center">SKU</th>
                            <th className="py-5 px-3 w-[80px] text-center">U/C</th>
                            <th className="py-5 px-3 w-[100px] text-center bg-[#245d48]">Cajas ({inItems.reduce((acc: number, i: any) => acc + (parseInt(i.totalBoxes) || 0), 0)})</th>
                            <th className="py-5 px-3 w-[110px] text-center bg-[#245d48]">Und ({inItems.reduce((acc: number, i: any) => acc + (parseInt(i.totalUnits) || 0), 0)})</th>
                            <th className="py-5 px-3 w-[110px] text-center">Exp.</th>
                            <th className="py-5 px-2 w-[50px] text-center">L</th>
                            <th className="py-5 px-2 w-[50px] text-center">A</th>
                            <th className="py-5 px-2 w-[50px] text-center">H</th>
                            <th className="py-5 px-3 w-[80px] text-center">Peso</th>
                            <th className="py-5 px-4 w-[250px]">Desc</th>
                            <th className="py-5 px-3 w-[120px] text-center">Fotos</th>
                            <th className="py-5 px-3 w-[70px] text-center bg-[#163a2d] no-print">Acc</th>
                          </tr>
                        </thead>
                        <Reorder.Group axis="y" as="tbody" values={inItems} onReorder={(v) => handleDragReorder(v, "IN_SHIPMENT")}>
                          {inItems.map((item, index) => (
                            <StandaloneRow 
                              key={item.id} item={item} index={index} isPending={false}
                              updateItem={updateItem} deleteItem={() => deleteItem(tab.id, item.id)} switchItemStatus={switchItemStatus}
                              removeImage={removeImage} setSelectedIdForUpload={setSelectedIdForUpload}
                              fileInputRef={fileInputRef} uploadingId={uploadingId} setFocusedItemId={setFocusedItemId}
                              setExpandedImage={setExpandedImage}
                            />
                          ))}
                        </Reorder.Group>
                      </table>
                    </div>
                    <div className="bg-slate-50/50 p-6 border-t no-print">
                      <Button variant="ghost" onClick={() => handleAddRow(tab.id)} className="w-full h-16 text-slate-500 font-bold gap-3 border-2 border-dashed border-slate-200 hover:border-blue-400 hover:bg-blue-50 transition-all rounded-2xl">
                        <Plus className="h-5 w-5" /> AGREGAR ARTÍCULO
                      </Button>
                    </div>
                  </Card>

                  {pItems.length > 0 && (
                    <div className="mt-12 no-print bg-orange-50/30 rounded-[2.5rem] p-8 border border-orange-100">
                      <h2 className="text-xl font-black text-orange-900 mb-6">En Espera</h2>
                      <div className="overflow-x-auto rounded-3xl border border-orange-200 bg-white">
                        <table className="w-full text-left min-w-[1300px]">
                          <thead>
                            <tr className="bg-orange-800 text-white text-[10px] uppercase font-bold">
                              <th className="py-4 px-1 w-[30px] text-center"></th>
                              <th className="py-4 px-3 w-[100px]">Location</th>
                              <th className="py-4 px-3 w-[120px]">Orden</th>
                              <th className="py-4 min-w-[200px]">Producto</th>
                              <th className="py-4 px-3 w-[140px]">FnSKU</th>
                              <th className="py-4 px-3 w-[110px]">SKU</th>
                              <th className="py-4 px-3 w-[90px] text-center">U/C</th>
                              <th className="py-4 px-3 w-[90px] text-center">Cajas</th>
                              <th className="py-4 px-3 w-[90px] text-center">Und</th>
                              <th className="py-4 px-3 w-[110px] text-center">Exp</th>
                              <th className="py-4 px-3 w-[60px] text-center">L</th>
                              <th className="py-4 px-3 w-[60px] text-center">A</th>
                              <th className="py-4 px-3 w-[60px] text-center">H</th>
                              <th className="py-4 px-3 w-[100px] text-center">Peso</th>
                              <th className="py-4 px-3 w-[220px]">Desc</th>
                              <th className="py-4 px-3 w-[140px] text-center">Foto</th>
                              <th className="py-4 px-3 text-center">Acc</th>
                            </tr>
                          </thead>
                          <Reorder.Group axis="y" as="tbody" values={pItems} onReorder={(v) => handleDragReorder(v, "PENDING")}>
                            {pItems.map((item, index) => (
                              <StandaloneRow 
                                key={item.id} item={item} index={index} isPending={true}
                                updateItem={updateItem} deleteItem={() => deleteItem(tab.id, item.id)} switchItemStatus={switchItemStatus}
                                removeImage={removeImage} setSelectedIdForUpload={setSelectedIdForUpload}
                                fileInputRef={fileInputRef} uploadingId={uploadingId} setFocusedItemId={setFocusedItemId}
                                setExpandedImage={setExpandedImage}
                              />
                            ))}
                          </Reorder.Group>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )
            })()
          )}
        </div>
      </div>

      <Dialog open={!!expandedImage} onOpenChange={() => setExpandedImage(null)}>
        <DialogContent className="max-w-4xl p-0 border-0 bg-transparent shadow-none">
          {expandedImage && (
            <div className="relative w-full aspect-video bg-black/90 rounded-3xl flex items-center justify-center">
              <img src={expandedImage} alt="Fullscreen" className="max-w-full max-h-full object-contain" />
              <button onClick={() => setExpandedImage(null)} className="absolute top-4 right-4 bg-white/20 text-white rounded-full p-2"><X className="h-6 w-6" /></button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
