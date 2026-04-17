"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Plus, Download, ArrowDown, ArrowUp, Save, Trash2, CheckCircle2, Camera, X, ImageIcon, AlertCircle, Printer, MoveVertical, GripVertical, LayoutGrid, Maximize2, MousePointer2, Copy, ClipboardPaste, FileText, MoreVertical, Clock } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
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
const StandaloneRow = memo(({ item, index, isPending, updateItem, deleteItem, switchItemStatus, removeImage, setSelectedIdForUpload, fileInputRef, uploadingId, setFocusedItemId, setExpandedImage, copyItem }: any) => {
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
          onChange={e => updateItem(item.id, "expDate", e.target.value)} 
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
          <Button variant="ghost" size="icon" className="h-7 w-7 text-blue-600 hover:bg-blue-100" title="Copiar Fila" onClick={() => copyItem(item)}>
            <Copy className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-red-600 hover:bg-red-100" onClick={() => deleteItem(item.id)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </td>
    </Reorder.Item>
  )
})

export default function FbaShipmentsPage() {
  const [tabs, setTabs] = useState<any[]>([]) 
  const [activeTabId, setActiveTabId] = useState<string>("dashboard")
  const [loading, setLoading] = useState(true)
  const [allShipments, setAllShipments] = useState<any[]>([])
  const [newShipmentName, setNewShipmentName] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  
  const [expandedImage, setExpandedImage] = useState<string | null>(null)
  const [uploadingId, setUploadingId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedIdForUpload, setSelectedIdForUpload] = useState<string | null>(null)
  const [focusedItemId, setFocusedItemId] = useState<string | null>(null)
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle")
  const [globalPendingItems, setGlobalPendingItems] = useState<any[]>([])
  const [copiedItem, setCopiedItem] = useState<any | null>(null)

  const fetchShipments = async () => {
    try {
      // Fetch everything to unify into one single list
      const [activeRes, historyRes] = await Promise.all([
        fetch("/api/admin/fba-shipments/active"),
        fetch("/api/admin/fba-shipments/history")
      ])
      const activeData = await activeRes.json()
      const historyData = await historyRes.json()
      
      const unified = [
        ...(Array.isArray(activeData) ? activeData : []),
        ...(Array.isArray(historyData) ? historyData : [])
      ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      
      setAllShipments(unified)
    } catch(e) {}
  }

  const fetchPendingItems = async () => {
    try {
      const res = await fetch("/api/admin/fba-shipments?type=pending")
      const data = await res.json()
      if (Array.isArray(data)) setGlobalPendingItems(data)
    } catch(e) {}
  }

  useEffect(() => {
    const init = async () => {
      await Promise.all([fetchShipments(), fetchPendingItems()])
      setLoading(false)
    }
    init()
  }, [])

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        await fetchPendingItems()
        if (activeTabId === "dashboard") return
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
            return { ...t, items: updatedItems, name: data.name, status: data.status }
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
    if (!newShipmentName) return alert("Por favor ingresa un nombre")
    try {
      const res = await fetch("/api/admin/fba-shipments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newShipmentName })
      })
      const data = await res.json()
      if (res.ok) {
        setNewShipmentName("")
        await fetchShipments()
        openTab(data.id)
      } else {
        alert(data.error)
      }
    } catch(e) {}
  }

  const deleteShipment = async (shId: string) => {
    if (!confirm("¿Seguro que quieres eliminar este envío permanentemente? No se puede deshacer.")) return
    try {
      const res = await fetch(`/api/admin/fba-shipments/${shId}`, { method: "DELETE" })
      if (res.ok) {
        closeTab(shId)
        await fetchShipments()
      }
    } catch(e) {}
  }

  const updateItem = async (itemId: string, field: string, value: any) => {
    const currentTabId = activeTabId
    if (currentTabId === "dashboard") return

    let finalValue = value
    if (field === "expDate" && value.length >= 6 && !value.includes("/")) {
      finalValue = formatDateString(value)
    }

    setSaveStatus("saving")
    setTabs(prev => prev.map((t: any) => {
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

    try {
      await fetch(`/api/admin/fba-shipments/items/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })
      setSaveStatus("saved")
      setTimeout(() => setSaveStatus("idle"), 2000)
    } catch(e) {
      setSaveStatus("idle")
    }
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

  const copyItem = (item: any) => {
    setCopiedItem(item)
  }

  const pasteItem = async (shId: string) => {
    if (!copiedItem) return
    const tab = tabs.find(t => t.id === shId)
    if (!tab) return
    
    const maxSortOrder = tab.items.length > 0 ? Math.max(...tab.items.map((i: any) => i.sortOrder || 0)) : 0
    
    const res = await fetch(`/api/admin/fba-shipments/${shId}/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...copiedItem,
        id: undefined, // Let DB generate new ID
        shipmentId: shId,
        sortOrder: maxSortOrder + 1,
        status: "IN_SHIPMENT",
        imageUrls: copiedItem.imageUrls || [],
        imageUrl: copiedItem.imageUrl || null
      })
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
    
    setTabs(prev => prev.map((t: any) => t.id === activeTabId ? { ...t, items: completeList } : t))

    await fetch(`/api/admin/fba-shipments/${activeTabId}/reorder`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: sorted.map(i => ({ id: i.id, sortOrder: i.sortOrder })) })
    })
  }

  const switchItemStatus = async (itemId: string, newStatus: string) => {
    // If moving to IN_SHIPMENT, it takes the current tab's ID
    const currentTabId = activeTabId
    if (currentTabId === "dashboard") return

    setTabs(prev => prev.map((t: any) => {
      if (t.id !== currentTabId) return t
      if (newStatus === "IN_SHIPMENT") {
        // Find in global pending if not in local items
        const inLocal = t.items.find((i: any) => i.id === itemId)
        if (inLocal) {
          return { ...t, items: t.items.map((i: any) => i.id === itemId ? { ...i, status: newStatus } : i) }
        } else {
          const fromPending = globalPendingItems.find(i => i.id === itemId)
          if (fromPending) {
             return { ...t, items: [...t.items, { ...fromPending, status: newStatus, shipmentId: currentTabId }] }
          }
        }
      } else {
         return { ...t, items: t.items.map((i: any) => i.id === itemId ? { ...i, status: newStatus } : i) }
      }
      return t
    }))

    if (newStatus === "PENDING") {
      setGlobalPendingItems(prev => {
        const item = tabs.find(t => t.id === currentTabId)?.items.find((i: any) => i.id === itemId)
        if (item) return [{ ...item, status: "PENDING" }, ...prev]
        return prev
      })
    } else {
      setGlobalPendingItems(prev => prev.filter(i => i.id !== itemId))
    }

    await fetch(`/api/admin/fba-shipments/items/${itemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus, shipmentId: newStatus === "IN_SHIPMENT" ? currentTabId : undefined })
    })
  }

  const deleteItem = async (shId: string, itemId: string) => {
    if (!confirm("¿Borrar este artículo?")) return
    setTabs(prev => prev.map((t: any) => {
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
          setTabs(prev => prev.map((t: any) => {
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
    setTabs(prev => prev.map((t: any) => {
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
            <tr style="height: 60px;"><th style="width: 100px;">Location</th><th style="width: 120px;">Orden de Cajas</th><th style="width: 300px;">PRODUCTO</th><th style="width: 150px;">FnSKU</th><th style="width: 110px;">SKU</th><th style="width: 90px;">U/C</th><th style="width: 100px;">Cajas</th><th style="width: 110px;">Unidades</th><th style="width: 120px;">Exp.</th><th style="width: 60px;">L</th><th style="width: 60px;">A</th><th style="width: 60px;">H</th><th style="width: 90px;">Peso</th><th style="width: 250px;">Descripción</th></tr>
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

  if (loading) return <div className="p-12 text-center animate-pulse text-slate-400 font-bold">Cargando Portal FBA...</div>

  const filteredShipments = allShipments.filter(sh => {
    return sh.name.toLowerCase().includes(searchQuery.toLowerCase())
  })

  return (
    <>
      <style jsx global>{`
        @media print {
          @page { size: landscape; margin: 0.5cm; }
          body * { visibility: hidden; }
          .print-area, .print-area * { visibility: visible; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          .tab-bar, .no-print { display: none !important; }
        }
      `}</style>

      <div className="w-full flex flex-col h-full bg-[#f8fafc] min-h-screen font-sans">
        {/* TOP TAB NAV */}
        <div className="tab-bar no-print flex items-end gap-1 px-6 bg-white border-b border-slate-200 pt-4 shadow-sm z-30">
          <div 
            onClick={() => setActiveTabId("dashboard")}
            className={`flex items-center gap-2 px-6 py-3 rounded-t-2xl cursor-pointer transition-all font-bold min-w-[160px] justify-center ${activeTabId === "dashboard" ? "bg-[#f8fafc] text-blue-600 border-x border-t border-slate-200 -mb-[1px]" : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"}`}
          >
            <LayoutGrid className="h-4 w-4" /> Mis Archivos
          </div>
          
          {tabs.map((tab: any) => (
            <div 
              key={tab.id}
              onClick={() => setActiveTabId(tab.id)}
              className={`flex items-center gap-2 px-6 py-3 rounded-t-2xl cursor-pointer transition-all font-bold min-w-[220px] border-x border-t relative group ${activeTabId === tab.id ? "bg-[#f8fafc] text-slate-900 border-slate-200 -mb-[1px]" : "bg-white text-slate-400 border-transparent hover:bg-slate-50"}`}
            >
              <ImageIcon className="h-3.5 w-3.5 text-blue-400" />
              <span className="truncate max-w-[150px]">{tab.name}</span>
              <button onClick={(e) => closeTab(tab.id, e)} className="ml-auto opacity-0 group-hover:opacity-100 hover:bg-slate-200 rounded-full p-1 transition-all"><X className="h-3 w-3" /></button>
            </div>
          ))}
          <Button variant="ghost" size="sm" onClick={() => setActiveTabId("dashboard")} className="mb-2 ml-2 rounded-full w-8 h-8 p-0 text-slate-300 hover:text-blue-500 hover:bg-blue-50"><Plus className="h-4 w-4" /></Button>
        </div>

        <div className="flex-1 w-full max-w-[1900px] mx-auto p-6 md:p-10">
          {activeTabId === "dashboard" ? (
            /* GOOGLE DRIVE STYLE DASHBOARD VIEW */
            <div className="animate-in fade-in slide-in-from-top-4 duration-500">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                <div>
                  <h1 className="text-3xl font-black text-slate-900 tracking-tight">Mis Envíos FBA</h1>
                  <p className="text-slate-500 mt-0.5 text-sm font-medium">Gestiona tus documentos de embarque. Ordenados cronológicamente.</p>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-3 bg-white px-4 py-2.5 rounded-2xl shadow-sm border border-slate-100">
                    <Input 
                      placeholder="Buscar por nombre..." 
                      className="border-0 shadow-none bg-transparent w-[240px] h-8 text-sm focus-visible:ring-0"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                    />
                    <span className="text-[10px] font-black text-slate-300 bg-slate-50 px-2 py-1 rounded-md">{filteredShipments.length}</span>
                  </div>

                  <Dialog>
                    <DialogTrigger asChild>
                      <Button className="bg-[#1a73e8] hover:bg-blue-700 text-white rounded-full px-6 font-bold shadow-md gap-2 h-11">
                        <Plus className="h-5 w-5" /> Nuevo Envío
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px] rounded-[2rem] border-0 shadow-2xl">
                      <DialogHeader>
                        <DialogTitle className="text-2xl font-black text-slate-900">Crear Nuevo Documento</DialogTitle>
                      </DialogHeader>
                      <div className="py-6">
                        <Input 
                          placeholder="Nombre del Envío (ej. April 17)" 
                          value={newShipmentName} 
                          onChange={e => setNewShipmentName(e.target.value)} 
                          className="h-14 rounded-2xl border-slate-200 text-lg font-medium focus:ring-4 ring-blue-50"
                          onKeyDown={e => e.key === "Enter" && handleCreateShipment()}
                        />
                      </div>
                      <div className="flex justify-end gap-3">
                        <Button onClick={handleCreateShipment} className="bg-blue-600 rounded-xl px-8 font-black text-white h-12">CREAR AHORA</Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>

              {/* LIST VIEW TABLE */}
              <div className="bg-white rounded-3xl border border-slate-100 shadow-xl overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-50 text-[11px] font-black text-slate-400 uppercase tracking-widest bg-slate-50/50">
                      <th className="py-4 px-8 w-[40%]">Nombre</th>
                      <th className="py-4 px-4 w-[20%]">Detalles</th>
                      <th className="py-4 px-4 w-[20%]">Status</th>
                      <th className="py-4 px-8 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filteredShipments.map(sh => (
                      <tr 
                         key={sh.id} 
                         onClick={() => openTab(sh.id)}
                         className="group hover:bg-blue-50/30 cursor-pointer transition-colors"
                      >
                        <td className="py-4 px-8">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                              <FileText className="h-5 w-5" />
                            </div>
                            <span className="font-bold text-slate-700 text-base">{sh.name || "Sin nombre"}</span>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2 text-slate-400 text-sm font-medium">
                            <Clock className="h-4 w-4" />
                            <span>{new Date(sh.createdAt).toLocaleDateString()} {new Date(sh.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <span className="text-[10px] font-black bg-slate-100 text-slate-500 px-3 py-1 rounded-full uppercase">Siempre Abierto</span>
                        </td>
                        <td className="py-4 px-8 text-right">
                          <div className="flex items-center justify-end gap-2" onClick={e => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-slate-400 hover:text-blue-600 hover:bg-blue-50" onClick={() => openTab(sh.id)} title="Abrir">
                              <Maximize2 className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-slate-400 hover:text-green-600 hover:bg-green-50" onClick={() => exportToExcelObject(sh, sh.items)} title="Excel">
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-slate-300 hover:text-red-500 hover:bg-red-50" onClick={() => deleteShipment(sh.id)} title="Eliminar">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredShipments.length === 0 && (
                  <div className="py-32 text-center">
                    <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-200">
                      <FileText className="h-10 w-10" />
                    </div>
                    <p className="text-slate-400 font-bold">No se encontraron documentos</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* SHIPMENT TAB VIEW */
              (() => {
                const tab = tabs.find(t => t.id === activeTabId)
                if (!tab) return null
                const inItems = tab.items.filter((i: any) => i.status === "IN_SHIPMENT")

                return (
                  <div className="animate-in slide-in-from-bottom-5 duration-500">
                    <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-8 no-print">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-200">
                          <ImageIcon className="h-7 w-7" />
                        </div>
                        <div>
                          <div className="flex items-center gap-3">
                             <h1 className="text-3xl font-black text-slate-900 leading-none">{tab.name}</h1>
                             {saveStatus === "saving" && <span className="text-[10px] bg-blue-50 text-blue-500 px-2 py-0.5 rounded-full font-bold animate-pulse">Guardando...</span>}
                             {saveStatus === "saved" && <span className="text-[10px] bg-green-50 text-green-500 px-2 py-0.5 rounded-full font-bold">Guardado</span>}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-3">
                        <Button variant="outline" onClick={() => window.print()} className="h-12 bg-white rounded-xl shadow-sm px-6 font-bold border-slate-200"><Printer className="h-5 w-5" /> Imprimir</Button>
                        <Button variant="outline" onClick={() => exportToExcelObject(tab, tab.items)} className="h-12 bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 rounded-xl px-6 font-bold gap-2"><Download className="h-5 w-5" /> Exportar Excel</Button>
                        <Button variant="ghost" onClick={() => closeTab(tab.id)} className="h-12 rounded-xl px-6 font-bold text-slate-500 hover:bg-slate-200">Cerrar Pestaña</Button>
                      </div>
                    </div>

                  {/* MAIN TABLE */}
                  <Card className="w-full border-0 shadow-2xl rounded-3xl overflow-hidden bg-white mb-10 border border-slate-100">
                    <div className="overflow-x-auto custom-scrollbar">
                      <table className="w-full text-left border-collapse min-w-[1500px]">
                        <thead>
                          <tr className="bg-[#1f4e3d] text-white text-[11px] uppercase font-black tracking-widest">
                            <th className="py-6 px-1 w-[35px] text-center bg-[#163a2d]"></th>
                            <th className="py-6 px-3 w-[110px] border-r border-white/5">Location</th>
                            <th className="py-6 px-3 w-[130px] border-r border-white/5">Orden Cajas</th>
                            <th className="py-6 px-5 min-w-[300px] border-r border-white/5">Producto</th>
                            <th className="py-6 px-3 w-[160px] border-r border-white/5 text-center">FnSKU</th>
                            <th className="py-6 px-3 w-[130px] border-r border-white/5 text-center">SKU</th>
                            <th className="py-6 px-3 w-[85px] border-r border-white/5 text-center">U/C</th>
                            <th className="py-6 px-3 w-[105px] border-r border-white/5 text-center bg-[#245d48]">Cajas ({inItems.reduce((acc: number, i: any) => acc + (parseInt(i.totalBoxes) || 0), 0)})</th>
                            <th className="py-6 px-3 w-[115px] border-r border-white/5 text-center bg-[#245d48]">Und ({inItems.reduce((acc: number, i: any) => acc + (parseInt(i.totalUnits) || 0), 0)})</th>
                            <th className="py-6 px-3 w-[115px] border-r border-white/5 text-center">Exp. Date</th>
                            <th className="py-6 px-2 w-[55px] border-r border-white/5 text-center">L</th>
                            <th className="py-6 px-2 w-[55px] border-r border-white/5 text-center">A</th>
                            <th className="py-6 px-2 w-[55px] border-r border-white/5 text-center">H</th>
                            <th className="py-6 px-4 w-[90px] border-r border-white/5 text-center">Peso</th>
                            <th className="py-6 px-6 w-[300px] border-r border-white/5">Descripción</th>
                            <th className="py-6 px-3 w-[130px] border-r border-white/5 text-center">Fotos</th>
                            <th className="py-6 px-3 w-[70px] text-center bg-[#163a2d] no-print">Acc</th>
                          </tr>
                        </thead>

                        <Reorder.Group axis="y" as="tbody" values={inItems} onReorder={(v) => handleDragReorder(v, "IN_SHIPMENT")}>
                          {inItems.map((item: any, index: number) => (
                            <StandaloneRow 
                              key={item.id} item={item} index={index} isPending={false}
                              updateItem={updateItem} deleteItem={() => deleteItem(tab.id, item.id)} switchItemStatus={switchItemStatus}
                              removeImage={removeImage} setSelectedIdForUpload={setSelectedIdForUpload}
                              fileInputRef={fileInputRef} uploadingId={uploadingId} setFocusedItemId={setFocusedItemId}
                              setExpandedImage={setExpandedImage}
                              copyItem={copyItem}
                            />
                          ))}
                        </Reorder.Group>
                      </table>
                    </div>
                    <div className="bg-[#f8fafc]/50 p-8 border-t no-print flex gap-4">
                      <Button variant="ghost" onClick={() => handleAddRow(tab.id)} className="flex-1 h-20 text-slate-400 font-bold gap-4 border-4 border-dashed border-slate-100 hover:border-blue-400 hover:bg-blue-50 hover:text-blue-600 transition-all rounded-[1.5rem] group">
                        <Plus className="h-6 w-6 group-hover:scale-125 transition-transform" /> AGREGAR ARTÍCULO AL DOCUMENTO
                      </Button>
                      {copiedItem && (
                        <Button variant="ghost" onClick={() => pasteItem(tab.id)} className="flex-1 h-20 text-blue-400 font-bold gap-4 border-4 border-dashed border-blue-100 hover:border-green-400 hover:bg-green-50 hover:text-green-600 transition-all rounded-[1.5rem] group">
                          <ClipboardPaste className="h-6 w-6 group-hover:scale-125 transition-transform" /> PEGAR "{copiedItem.name || "Fila"}"
                        </Button>
                      )}
                    </div>
                  </Card>

                  {/* GLOBAL PENDING SECTION */}
                  {globalPendingItems.length > 0 && (
                    <div className="no-print bg-amber-50/40 rounded-3xl p-10 border border-amber-100/50 shadow-inner mt-10 mb-20 animate-in fade-in zoom-in duration-500">
                      <h2 className="text-2xl font-black text-amber-900 mb-8 flex items-center gap-3">
                        <MousePointer2 className="h-6 w-6" /> Palets en Espera (Global)
                        <span className="text-[10px] font-black bg-amber-600 text-white px-3 py-1 rounded-full uppercase tracking-tighter">Disponible para este envío</span>
                      </h2>
                      <div className="overflow-x-auto rounded-[2rem] border border-amber-200 bg-white shadow-xl">
                        <table className="w-full text-left min-w-[1300px]">
                          <thead>
                            <tr className="bg-amber-800 text-white text-[10px] uppercase font-black tracking-widest">
                              <th className="py-4 px-1 w-[30px] text-center"></th>
                              <th className="py-4 px-3 w-[110px]">Location</th>
                              <th className="py-4 px-3 w-[130px]">Orden</th>
                              <th className="py-4 min-w-[200px]">PRODUCTO PENDIENTE</th>
                              <th className="py-4 px-3 w-[150px]">FnSKU</th>
                              <th className="py-4 px-3 w-[120px]">SKU</th>
                              <th className="py-4 px-3 w-[90px] text-center">U/C</th>
                              <th className="py-4 px-3 w-[90px] text-center leading-tight">Cajas<br/><span className="text-[9px] text-amber-200">({globalPendingItems.reduce((acc: number, i: any) => acc + (parseInt(i.totalBoxes) || 0), 0)})</span></th>
                              <th className="py-4 px-3 w-[90px] text-center leading-tight">Unds<br/><span className="text-[9px] text-amber-200">({globalPendingItems.reduce((acc: number, i: any) => acc + (parseInt(i.totalUnits) || 0), 0)})</span></th>
                              <th className="py-4 px-3 w-[110px]">Exp</th>
                              <th className="py-4 px-3 w-[60px] text-center">L</th>
                              <th className="py-4 px-3 w-[60px] text-center">A</th>
                              <th className="py-4 px-3 w-[60px] text-center">H</th>
                              <th className="py-4 px-3 w-[100px] text-center">Peso</th>
                              <th className="py-4 px-5 w-[250px]">Desc</th>
                              <th className="py-4 px-3 w-[150px] text-center">Foto</th>
                              <th className="py-4 px-3 text-center no-print">Acc</th>
                            </tr>
                          </thead>
                          <Reorder.Group axis="y" as="tbody" values={globalPendingItems} onReorder={(v) => handleDragReorder(v, "PENDING")}>
                            {globalPendingItems.map((item: any, index: number) => (
                              <StandaloneRow 
                                key={item.id} item={item} index={index} isPending={true}
                                updateItem={updateItem} deleteItem={() => deleteItem(tab.id, item.id)} switchItemStatus={switchItemStatus}
                                removeImage={removeImage} setSelectedIdForUpload={setSelectedIdForUpload}
                                fileInputRef={fileInputRef} uploadingId={uploadingId} setFocusedItemId={setFocusedItemId}
                                setExpandedImage={setExpandedImage}
                                activeTabId={activeTabId}
                                copyItem={copyItem}
                              />
                            ))}
                          </Reorder.Group>
                        </table>
                      </div>
                    </div>
                </div>
              )
            })()
          )}
        </div>
      </div>

      {/* FULLSCREEN IMAGE */}
      <Dialog open={!!expandedImage} onOpenChange={() => setExpandedImage(null)}>
        <DialogContent className="max-w-5xl p-0 border-0 bg-transparent shadow-none">
          {expandedImage && (
            <div className="relative w-full aspect-video bg-black/95 rounded-3xl flex items-center justify-center p-4">
              <img src={expandedImage} alt="Fullscreen" className="max-w-full max-h-full object-contain rounded-xl shadow-2xl" />
              <button 
                onClick={() => setExpandedImage(null)} 
                className="absolute top-8 right-8 bg-white/10 hover:bg-white/30 text-white rounded-full p-3 backdrop-blur-md transition-all"
              >
                <X className="h-8 w-8" />
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
