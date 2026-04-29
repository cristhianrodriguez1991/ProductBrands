"use client" // Deploy trigger: 10:49 AM

import { useState, useEffect, useRef, memo, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { AlertTriangle, Plus, Download, ArrowDown, ArrowUp, Save, Trash2, CheckCircle2, Camera, X, ImageIcon, AlertCircle, Printer, MoveVertical, GripVertical, LayoutGrid, Maximize2, MousePointer2, Copy, ClipboardPaste, FileText, MoreVertical, Clock, Send, QrCode, Scan, RefreshCw } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import Image from "next/image"
import { compressImage } from "@/lib/image-compression"
import { Reorder, useDragControls } from "framer-motion"

// ── Scanner Effect Component ──
const ScannerEffect = ({ open, onScan }: { open: boolean, onScan: (code: string) => void }) => {
  useEffect(() => {
    let html5QrCode: any = null;
    let isMounted = true;

    if (open) {
      const checkReady = setInterval(() => {
        if ((window as any).Html5Qrcode) {
          clearInterval(checkReady);
          if (!isMounted) return;

          html5QrCode = new (window as any).Html5Qrcode("reader");
          html5QrCode.start(
            { facingMode: "environment" },
            { fps: 10, qrbox: { width: 250, height: 250 } },
            (decodedText: string) => {
              onScan(decodedText);
              html5QrCode.stop().catch(console.error);
            },
            (error: any) => { }
          ).catch((err: any) => {
            console.error("Scanner start error:", err);
          });
        }
      }, 500);
    }

    return () => {
      isMounted = false;
      if (html5QrCode && html5QrCode.isScanning) {
        html5QrCode.stop().catch(console.error);
      }
    };
  }, [open, onScan]);

  return null;
};

// ── Confirmation Modal Component ──
const ConfirmDeleteModal = ({ isOpen, onClose, onConfirm, title, message, confirmLabel, confirmColor }: any) => {
  const label = confirmLabel || "Confirmar"
  const colorClass = confirmColor || "bg-blue-600 hover:bg-blue-700 shadow-blue-200"
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[420px] p-0 overflow-hidden border-0 shadow-2xl">
        <div className="bg-white p-6 pt-8 text-center">
          <div className="mx-auto w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle className="h-8 w-8 text-amber-600" />
          </div>
          <DialogHeader className="p-0">
            <DialogTitle className="text-xl font-black text-slate-900 text-center uppercase tracking-tight">
              {title}
            </DialogTitle>
            <div className="mt-4 text-slate-500 font-medium text-sm leading-relaxed">
              {message}
            </div>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 mt-8">
            <Button
              variant="ghost"
              onClick={onClose}
              className="h-11 font-black uppercase tracking-widest text-[10px] text-slate-400 hover:bg-slate-50"
            >
              Cancelar
            </Button>
            <Button
              onClick={() => { onConfirm(); onClose(); }}
              className={`h-11 text-white font-black uppercase tracking-widest text-[10px] shadow-lg ${colorClass}`}
            >
              {label}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

type FbaItem = {
  id: string
  shipmentId: string
  location: string
  boxOrder: string
  name: string
  fnsku: string
  sku: string
  upc?: string
  asin?: string
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

const RACKS_CONFIG = {
  A: { cells: 8, positions: 16 },
  B: { cells: 5, positions: 10 },
  C: { cells: 5, positions: 10 },
}

const LEVELS_CONFIG = [
  { key: "T", label: "ARRIBA (T)" },
  { key: "M", label: "MEDIO (M)" },
  { key: "L", label: "ABAJO (L)" },
  { key: "P", label: "PISO (P)" },
]

const parseLocationCode = (code: string) => {
  if (!code || code.length < 2) return { rack: "", num: "", level: "" }
  const rack = code[0].toUpperCase()
  const level = code[code.length - 1].toUpperCase()
  const num = code.slice(1, -1)
  return { rack, num, level }
}

const parseSyncDate = (val: string) => {
  if (!val) return null
  if (val.includes('/')) {
    const parts = val.split('/')
    if (parts.length === 3) {
      let [m, d, y] = parts
      if (y.length === 2) y = "20" + y
      return new Date(`${y}-${m}-${d}`)
    }
  }
  if (val.length === 6) {
    return new Date(val.replace(/(\d{2})(\d{2})(\d{2})/, '20$3-$1-$2'))
  }
  return null
}

const isOccupiedWarehousePosition = (p: any) => {
  if (!p) return false
  return !!p.productName || !!p.sku || p.status !== "AVAILABLE"
}

const colorFromSeed = (seed: string) => {
  const palette = ["#2563eb", "#16a34a", "#d97706", "#9333ea", "#dc2626", "#0891b2", "#db2777", "#4f46e5"]
  let hash = 0
  for (let i = 0; i < seed.length; i++) hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0
  return palette[Math.abs(hash) % palette.length]
}

const LocationPicker = ({ value, onChange, setConfirm, warehousePositions }: { value: string; onChange: (val: string) => void; setConfirm: any; warehousePositions: any[] }) => {
  const [isAdding, setIsAdding] = useState(false)
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [confirmOccupied, setConfirmOccupied] = useState<string | null>(null)
  const locations = value ? value.split(' + ').filter(Boolean) : []
  const [tempLocation, setTempLocation] = useState("A1P")

  const { rack, num, level } = parseLocationCode(tempLocation)

  const handleAddField = async () => {
    // Check if location is occupied by another product (not already one of this item's locations)
    let latestPositions = warehousePositions || []
    try {
      const res = await fetch("/api/admin/warehouse")
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data)) latestPositions = data
      }
    } catch { }

    const isOccupiedByOther = latestPositions.find((p: any) => p.locationCode === tempLocation && isOccupiedWarehousePosition(p))
    const isMine = locations.includes(tempLocation)

    if (isOccupiedByOther && !isMine) {
      setConfirm({
        isOpen: true,
        title: "Pallet Mixto",
        message: `La ubicación ${tempLocation} ya está ocupada por otro producto. ¿Deseas agregarlo a este pallet mixto?`,
        confirmLabel: "Sí, Agregar",
        confirmColor: "bg-amber-600 hover:bg-amber-700 shadow-amber-200",
        onConfirm: () => {
          if (editingIndex !== null) {
            const newLocs = [...locations]
            newLocs[editingIndex] = tempLocation
            onChange(newLocs.join(' + '))
          } else {
            if (!locations.includes(tempLocation)) {
              onChange([...locations, tempLocation].join(' + '))
            }
          }
          setIsAdding(false)
          setEditingIndex(null)
        }
      });
      return
    }

    if (editingIndex !== null) {
      const newLocs = [...locations]
      newLocs[editingIndex] = tempLocation
      onChange(newLocs.join(' + '))
    } else {
      if (!locations.includes(tempLocation)) {
        onChange([...locations, tempLocation].join(' + '))
      }
    }
    setIsAdding(false)
    setEditingIndex(null)
  }

  const handleStartEdit = (loc: string, idx: number) => {
    setTempLocation(loc)
    setEditingIndex(idx)
    setIsAdding(true)
  }

  const handleRemoveClick = (e: React.MouseEvent, loc: string) => {
    e.stopPropagation()
    setConfirm({
      isOpen: true,
      title: "¿Eliminar ubicación?",
      message: `¿Estás seguro de que deseas eliminar la ubicación ${loc}? Esto también la liberará en el mapa del almacén.`,
      confirmLabel: "Confirmar Borrado",
      confirmColor: "bg-red-600 hover:bg-red-700 shadow-red-200",
      onConfirm: () => onChange(locations.filter(l => l !== loc).join(' + '))
    })
  }

  const handleRackChange = (newRack: string) => setTempLocation(`${newRack}${num || "1"}${level || "P"}`)
  const handleNumChange = (newNum: string) => setTempLocation(`${rack || "A"}${newNum}${level || "P"}`)
  const handleLevelChange = (newLevel: string) => setTempLocation(`${rack || "A"}${num || "1"}${newLevel}`)

  return (
    <div className="flex flex-col gap-1.5 p-1 relative min-h-[40px] group/picker">
      <div className="flex flex-wrap gap-1 pr-6">
        {locations.length === 0 && !isAdding && (
          <span className="text-[10px] text-slate-300 font-medium italic py-1">Sin ubicación</span>
        )}
        {locations.map((loc, idx) => {
          const palletsAtLoc = warehousePositions?.filter((p: any) => p.locationCode === loc && isOccupiedWarehousePosition(p)) || []
          const isMixed = loc !== "ENVIADO" && palletsAtLoc.length > 1
          const mixedProducts = isMixed ? palletsAtLoc.map((p: any) => p.productName || p.sku).filter(Boolean) : []
          const mixedColors = isMixed
            ? mixedProducts.slice(0, 2).map((name: string) => colorFromSeed(name))
            : []
          return (
            <div
              key={`${loc}-${idx}`}
              onClick={() => loc !== "ENVIADO" && handleStartEdit(loc, idx)}
              className={`flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] font-black transition-all group/loc relative pr-5 shadow-sm overflow-hidden ${loc === "ENVIADO" ? "bg-blue-600 text-white border-blue-700 cursor-default" : isMixed ? "text-white border-transparent cursor-pointer hover:ring-2 hover:ring-offset-1 hover:ring-slate-400" : editingIndex === idx ? "bg-blue-600 text-white border-blue-700 cursor-pointer" : "bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-700 border-slate-200 hover:border-blue-200 cursor-pointer"}`}
              title={isMixed ? `Pallet mixto: ${mixedProducts.join(", ")}` : loc}
            >
              {isMixed && (
                <div
                  className="absolute inset-0 z-0 opacity-90"
                  style={{
                    background: mixedColors.length > 1
                      ? `linear-gradient(90deg, ${mixedColors[0]} 0%, ${mixedColors[0]} 50%, ${mixedColors[1]} 50%, ${mixedColors[1]} 100%)`
                      : mixedColors[0]
                  }}
                />
              )}
              <span className={`relative z-10 ${isMixed ? "drop-shadow-md" : ""}`}>
                {loc === "ENVIADO" ? "📦 ENVIADO" : loc}
              </span>
              {isMixed && <span className="relative z-10 inline-flex items-center justify-center px-1 py-0 text-[7px] font-black bg-white/20 backdrop-blur-sm shadow-sm text-white rounded ml-0.5 leading-none">MIX</span>}
              {loc !== "ENVIADO" && (
                <button
                  onClick={(e) => handleRemoveClick(e, loc)}
                  className="absolute right-0.5 z-10 hover:bg-red-500/80 hover:text-white text-slate-400 rounded p-0.5 transition-colors opacity-0 group-hover/loc:opacity-100"
                >
                  <X className="h-2 w-2" />
                </button>
              )}
            </div>
          )
        })}
      </div>

      {!isAdding && (
        <button
          onClick={() => setIsAdding(true)}
          className="absolute top-1 right-1 w-6 h-6 flex items-center justify-center rounded-md bg-slate-50 border border-slate-200 text-slate-400 hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all shadow-sm opacity-0 group-hover/picker:opacity-100 group-hover/row:opacity-100"
          title="Añadir ubicación"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      )}

      {isAdding && (
        <div className="flex flex-col gap-1 bg-white p-1.5 rounded-lg border border-blue-200 shadow-lg z-10">
          <div className="flex items-center gap-1">
            <select
              value={rack || "A"}
              onChange={e => handleRackChange(e.target.value)}
              className="bg-slate-50 px-1 py-1 rounded text-[10px] font-black text-blue-700 border border-slate-200 outline-none hover:border-blue-400 transition-colors"
              title="Rack"
            >
              {Object.keys(RACKS_CONFIG).map(r => <option key={r} value={r}>{r}</option>)}
            </select>

            <select
              value={num || "1"}
              onChange={e => handleNumChange(e.target.value)}
              className="bg-slate-50 px-1 py-1 rounded text-[10px] font-black text-slate-700 border border-slate-200 outline-none hover:border-blue-400 transition-colors"
              title="Columna / Pallet #"
            >
              {Array.from({ length: 20 }, (_, i) => i + 1).map(n => <option key={n} value={n.toString()}>{n}</option>)}
            </select>

            <select
              value={level || "P"}
              onChange={e => handleLevelChange(e.target.value)}
              className="bg-slate-50 px-1 py-1 rounded text-[10px] font-black text-emerald-700 border border-slate-200 outline-none hover:border-blue-400 transition-colors"
              title="Nivel"
            >
              {LEVELS_CONFIG.map(l => {
                const locCode = `${rack || "A"}${num || "1"}${l.key}`
                const isOccupied = warehousePositions?.find((p: any) => p.locationCode === locCode && isOccupiedWarehousePosition(p))
                const isMine = locations.includes(locCode)
                return <option key={l.key} value={l.key} className={isOccupied && !isMine ? "text-amber-600" : undefined}>{isOccupied && !isMine ? `${l.key} (Ocupado)` : l.key}</option>
              })}
            </select>
          </div>

          <div className="flex items-center justify-between gap-1 mt-0.5">
            <button
              onClick={() => { setIsAdding(false); setEditingIndex(null) }}
              className="px-2 py-1 text-[9px] font-bold text-slate-500 hover:bg-slate-100 rounded transition-colors uppercase"
            >
              Cancelar
            </button>
            <button onClick={handleAddField} className="px-3 py-1 bg-blue-600 text-white text-[9px] font-bold rounded shadow-sm hover:bg-blue-700 transition-all uppercase">
              {editingIndex !== null ? "Guardar" : "Aceptar"}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// Extracted to module scope to prevent React from unmounting inputs on every keystroke, keeping keyboard focus perfectly stable
const StandaloneRow = memo(({ item, index, isPending, updateItem, deleteItem, setConfirmDialog, switchItemStatus, removeImage, setSelectedIdForUpload, fileInputRef, uploadingId, setFocusedItemId, setExpandedImage, copyItem, warehousePositions, onOpenScanner }: any) => {
  const controls = useDragControls()
  const handleFocus = useCallback(() => setFocusedItemId(item.id), [item.id, setFocusedItemId])
  const handleBlur = useCallback(() => setFocusedItemId(null), [setFocusedItemId])
  const expiring = item.expDate && new Date(item.expDate.replace(/(\d{2})(\d{2})(\d{2})/, '20$3-$1-$2')) < new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)

  const [localItem, setLocalItem] = useState(item)
  useEffect(() => { setLocalItem(item) }, [item])

  const handleLocalChange = (field: string, value: any) => setLocalItem((prev: any) => ({ ...prev, [field]: value }))

  const commitChange = (field: string) => {
    if (localItem[field] !== item[field]) {
      updateItem(item.id, field, localItem[field])
    }
  }

  const handleLookup = async (code: string) => {
    if (!code || code.length < 5) return
    try {
      const res = await fetch(`/api/admin/inventory/lookup?code=${encodeURIComponent(code)}`)
      const data = await res.json()
      if (data.found && data.item) {
        const found = data.item
        updateItem(item.id, "name", found.amazonTitle || found.name)
        if (found.fnsku) updateItem(item.id, "fnsku", found.fnsku)
        if (found.upc) updateItem(item.id, "upc", found.upc)
        if (found.sku) updateItem(item.id, "sku", found.sku)
        if (found.asin) updateItem(item.id, "asin", found.asin)
        if (!item.description) updateItem(item.id, "description", found.amazonTitle || found.name)

        const imgUrl = found.amazonImageUrl || found.imageUrl
        if (imgUrl && (!item.imageUrls || !item.imageUrls.includes(imgUrl))) {
          updateItem(item.id, "imageUrl", imgUrl)
          updateItem(item.id, "imageUrls", [imgUrl, ...(item.imageUrls || [])])
        }
      }
    } catch (e) {
      console.error("Lookup error:", e)
    }
  }

  return (
    <Reorder.Item
      value={item}
      as="tr"
      dragListener={false}
      dragControls={controls}
      transition={{ duration: 0 }}
      style={{ position: "relative", height: "48px", maxHeight: "48px" }}
      className="border-b bg-white group/row overflow-hidden"
    >
      <td className="p-0 border-r w-[35px] min-w-[35px] max-w-[35px] bg-slate-50 select-none">
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
      <td className="p-1 px-2 border-r w-[110px] min-w-[110px] max-w-[110px]">
        <LocationPicker
          value={item.location || ""}
          onChange={val => updateItem(item.id, "location", val)}
          setConfirm={setConfirmDialog}
          warehousePositions={warehousePositions}
        />
      </td>
      <td className="p-0 border-l w-[130px] min-w-[130px] max-w-[130px]">
        <Input onFocus={handleFocus} onBlur={() => { handleBlur(); commitChange("boxOrder") }} className="h-8 text-[11px] border-0 bg-transparent rounded-none px-2" value={localItem.boxOrder || ""} onChange={e => handleLocalChange("boxOrder", e.target.value)} />
      </td>

      <td className="p-1 border-l text-center w-[130px] min-w-[130px] max-w-[130px]">
        <div className="flex flex-wrap items-center justify-center gap-1 min-w-0 max-w-[120px] mx-auto">
          {item.imageUrls && item.imageUrls.length > 0 ? (
            <>
              {item.imageUrls.map((url: string, idx: number) => (
                <div
                  key={idx}
                  className="w-[28px] h-[28px] bg-slate-100/50 rounded-md border border-slate-300/80 cursor-pointer overflow-hidden relative group shrink-0"
                >
                  <img
                    src={url}
                    alt={`Product ${idx + 1}`}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    onClick={() => setExpandedImage(url)}
                  />
                  <button
                    onClick={() => removeImage(item.id, url)}
                    className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                  >
                    <X className="h-2 w-2" />
                  </button>
                </div>
              ))}
              <Button
                variant="ghost" size="icon"
                className="w-[28px] h-[28px] rounded-md border border-dashed border-slate-300 text-slate-400 hover:text-blue-500 hover:border-blue-300 shrink-0"
                onClick={() => { setSelectedIdForUpload(item.id); fileInputRef.current?.click(); }}
              >
                {uploadingId === item.id ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
              </Button>
            </>
          ) : (
            <Button
              variant="ghost"
              className="w-[100px] h-8 text-[10px] gap-1 font-bold border border-dashed border-slate-200 text-slate-400 hover:bg-slate-50 rounded-none shrink-0"
              onClick={() => { setSelectedIdForUpload(item.id); fileInputRef.current?.click(); }}
            >
              <Camera className="h-3 w-3" /> {uploadingId === item.id ? "..." : "FOTO"}
            </Button>
          )}
        </div>
      </td>

      <td className="p-0 border-l align-middle w-[300px] min-w-[300px] max-w-[300px] overflow-hidden bg-white/50" style={{ width: "300px", maxWidth: "300px" }}>
        <textarea
          onFocus={handleFocus}
          onBlur={() => { handleBlur(); commitChange("name") }}
          spellCheck={false}
          data-gramm="false"
          className="w-full text-[11px] border-0 bg-transparent rounded-none px-2 font-bold text-slate-800 resize-none focus:ring-0 h-[48px] min-h-[48px] leading-tight block break-words whitespace-pre-wrap py-2"
          value={localItem.name || ""}
          onChange={e => handleLocalChange("name", e.target.value)}
          rows={2}
        />
      </td>
      <td className="p-0 border-l w-[180px] min-w-[180px] max-w-[180px]">
        <div className="relative group/input flex items-center w-full">
          <Input
            onFocus={handleFocus} onBlur={() => { handleBlur(); commitChange("fnsku") }}
            spellCheck={false}
            data-gramm="false"
            className="h-8 text-[10px] border-0 bg-transparent rounded-none px-2 pr-7 w-full focus:bg-white shadow-none"
            value={localItem.fnsku || ""}
            onChange={e => { handleLocalChange("fnsku", e.target.value); if (e.target.value.length >= 5) handleLookup(e.target.value); }}
          />
          <button
            onClick={() => onOpenScanner((code: string) => { handleLocalChange("fnsku", code); handleLookup(code); commitChange("fnsku"); })}
            className="absolute right-1 text-slate-300 hover:text-blue-600 transition-colors bg-white/50 rounded p-0.5"
          >
            <QrCode className="h-3.5 w-3.5" />
          </button>
        </div>
      </td>
      <td className="p-0 border-l w-[180px] min-w-[180px] max-w-[180px]">
        <div className="relative group/input flex items-center w-full">
          <Input
            onFocus={handleFocus} onBlur={() => { handleBlur(); commitChange("upc") }}
            spellCheck={false}
            data-gramm="false"
            className="h-8 text-[10px] border-0 bg-transparent rounded-none px-2 pr-7 w-full focus:bg-white shadow-none"
            value={localItem.upc || ""}
            onChange={e => { handleLocalChange("upc", e.target.value); if (e.target.value.length >= 5) handleLookup(e.target.value); }}
            placeholder="UPC" title="UPC"
          />
          <button
            onClick={() => onOpenScanner((code: string) => { handleLocalChange("upc", code); handleLookup(code); commitChange("upc"); })}
            className="absolute right-1 text-slate-300 hover:text-blue-600 transition-colors bg-white/50 rounded p-0.5"
          >
            <QrCode className="h-3.5 w-3.5" />
          </button>
        </div>
      </td>
      <td className="p-0 border-l w-[160px] min-w-[160px] max-w-[160px]"><Input spellCheck={false} data-gramm="false" onFocus={handleFocus} onBlur={() => { handleBlur(); commitChange("sku") }} className="h-8 text-[10px] border-0 bg-transparent rounded-none px-2" value={localItem.sku || ""} onChange={e => handleLocalChange("sku", e.target.value)} /></td>
      <td className="p-0 border-l w-[160px] min-w-[160px] max-w-[160px]"><Input spellCheck={false} data-gramm="false" onFocus={handleFocus} onBlur={() => { handleBlur(); commitChange("asin") }} className="h-8 text-[10px] border-0 bg-transparent rounded-none px-2" value={localItem.asin || ""} onChange={e => handleLocalChange("asin", e.target.value)} placeholder="ASIN" title="ASIN" /></td>
      <td className="p-0 border-l w-[85px] min-w-[85px] max-w-[85px]"><Input onFocus={handleFocus} onBlur={() => { handleBlur(); commitChange("qtyPerBox") }} type="number" className="h-8 text-xs border-0 bg-transparent rounded-none px-1 w-full text-center" value={localItem.qtyPerBox || ""} onChange={e => handleLocalChange("qtyPerBox", e.target.value)} /></td>
      <td className="p-0 border-l w-[105px] min-w-[105px] max-w-[105px]"><Input onFocus={handleFocus} onBlur={() => { handleBlur(); commitChange("totalBoxes") }} type="number" className="h-8 text-xs border-0 bg-transparent rounded-none px-1 w-full text-center" value={localItem.totalBoxes || ""} onChange={e => handleLocalChange("totalBoxes", e.target.value)} /></td>
      <td className="p-0 border-l w-[115px] min-w-[115px] max-w-[115px] text-center font-black text-xs px-2 bg-green-50/50 text-green-700">{item.totalUnits || 0}</td>
      <td className="p-0 border-l w-[115px] min-w-[115px] max-w-[115px] relative">
        <Input
          onFocus={handleFocus} onBlur={() => { handleBlur(); commitChange("expDate") }}
          spellCheck={false}
          data-gramm="false"
          className={`h-8 text-[11px] border-0 bg-transparent rounded-none px-2 ${expiring ? "text-red-600 font-bold bg-red-50" : ""}`}
          value={localItem.expDate || ""}
          placeholder="MMDDYY"
          onChange={e => handleLocalChange("expDate", e.target.value)}
        />
        {expiring && <AlertCircle className="h-3 w-3 absolute right-1 top-2.5 text-red-500 animate-pulse pointer-events-none" />}
      </td>
      <td className="p-0 border-l w-[55px] min-w-[55px] max-w-[55px]"><Input onFocus={handleFocus} onBlur={() => { handleBlur(); commitChange("length") }} type="number" className="h-8 text-[10px] border-0 bg-transparent rounded-none px-1 w-full text-center" value={localItem.length || ""} onChange={e => handleLocalChange("length", e.target.value)} /></td>
      <td className="p-0 border-l w-[55px] min-w-[55px] max-w-[55px]"><Input onFocus={handleFocus} onBlur={() => { handleBlur(); commitChange("width") }} type="number" className="h-8 text-[10px] border-0 bg-transparent rounded-none px-1 w-full text-center" value={localItem.width || ""} onChange={e => handleLocalChange("width", e.target.value)} /></td>
      <td className="p-0 border-l w-[55px] min-w-[55px] max-w-[55px]"><Input onFocus={handleFocus} onBlur={() => { handleBlur(); commitChange("height") }} type="number" className="h-8 text-[10px] border-0 bg-transparent rounded-none px-1 w-full text-center" value={localItem.height || ""} onChange={e => handleLocalChange("height", e.target.value)} /></td>
      <td className="p-0 border-l w-[90px] min-w-[90px] max-w-[90px]"><Input onFocus={handleFocus} onBlur={() => { handleBlur(); commitChange("boxWeight") }} type="number" className="h-8 text-xs border-0 bg-transparent rounded-none px-1 w-full text-center font-semibold" value={localItem.boxWeight || ""} onChange={e => handleLocalChange("boxWeight", e.target.value)} /></td>
      <td className="p-0 border-l align-middle w-[300px] min-w-[300px] max-w-[300px] overflow-hidden bg-white/50" style={{ width: "300px", maxWidth: "300px" }}>
        <textarea
          onFocus={handleFocus}
          onBlur={() => { handleBlur(); commitChange("description") }}
          spellCheck={false}
          data-gramm="false"
          className="w-full text-[11px] border-0 bg-transparent rounded-none px-2 resize-none focus:ring-0 h-[48px] min-h-[48px] leading-tight block break-words whitespace-pre-wrap py-2"
          value={localItem.description || ""}
          onChange={e => handleLocalChange("description", e.target.value)}
          rows={2}
        />
      </td>
      <td className="p-1 border-l bg-slate-50/50 w-[70px] min-w-[70px] max-w-[70px]">
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

  // Scanner State
  const [scannerOpen, setScannerOpen] = useState(false)
  const [scannerCallback, setScannerCallback] = useState<(code: string) => void>(() => { })

  useEffect(() => {
    // Load html5-qrcode from CDN
    const script = document.createElement("script")
    script.src = "https://unpkg.com/html5-qrcode"
    script.async = true
    document.body.appendChild(script)
    return () => { document.body.removeChild(script) }
  }, [])

  const openScanner = (cb: (code: string) => void) => {
    setScannerCallback(() => cb)
    setScannerOpen(true)
  }

  const handleScanResult = (code: string) => {
    scannerCallback(code)
    setScannerOpen(false)
  }
  const [allShipments, setAllShipments] = useState<any[]>([])
  const [newShipmentName, setNewShipmentName] = useState("")
  const [searchQuery, setSearchQuery] = useState("")

  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => { }
  })

  const [expandedImage, setExpandedImage] = useState<string | null>(null)
  const [uploadingId, setUploadingId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedIdForUpload, setSelectedIdForUpload] = useState<string | null>(null)
  const [focusedItemId, setFocusedItemId] = useState<string | null>(null)
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle")
  const [globalPendingItems, setGlobalPendingItems] = useState<any[]>([])
  const [copiedItem, setCopiedItem] = useState<any | null>(null)
  const [warehousePositions, setWarehousePositions] = useState<any[]>([])
  const [isSyncing, setIsSyncing] = useState(false)

  const refreshWarehousePositions = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/warehouse")
      if (res.ok) {
        const data = await res.json()
        setWarehousePositions(Array.isArray(data) ? data : [])
      }
    } catch { }
  }, [])

  const handleMarkAsShipped = async (shId: string) => {
    const tab = tabs.find(t => t.id === shId)
    if (!tab) return

    // ── Step 1: Validate against warehouse before shipping ──
    const inShipmentItems = tab.items.filter((i: any) => i.status === "IN_SHIPMENT" && i.location && i.location !== "ENVIADO")

    if (inShipmentItems.length === 0) {
      alert("⚠️ No hay artículos con ubicación para enviar.")
      return
    }

    setIsSyncing(true)
    try {
      const validateRes = await fetch("/api/admin/fba-shipments/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: inShipmentItems })
      })
      const validation = await validateRes.json()

      let confirmMsg = `¿Marcar ${inShipmentItems.length} artículos como ENVIADO?\n\n`
      confirmMsg += `✅ ${validation.validCount || 0} de ${validation.totalItems || 0} ubicaciones verificadas.\n`

      if (validation.warnings?.length > 0) {
        confirmMsg += `\n⚠️ ADVERTENCIAS (${validation.warnings.length}):\n`
        validation.warnings.slice(0, 5).forEach((w: string) => {
          confirmMsg += `  • ${w}\n`
        })
        if (validation.warnings.length > 5) {
          confirmMsg += `  ... y ${validation.warnings.length - 5} más\n`
        }
      }

      if (validation.errors?.length > 0) {
        confirmMsg += `\n❌ ERRORES (${validation.errors.length}):\n`
        validation.errors.slice(0, 5).forEach((e: string) => {
          confirmMsg += `  • ${e}\n`
        })
        confirmMsg += `\n¿Continuar de todos modos?`
      }

      setIsSyncing(false)

      // Show confirmation with validation results
      setConfirmDialog({
        isOpen: true,
        title: "¿Marcar como ENVIADO?",
        message: confirmMsg,
        onConfirm: async () => {
          setIsSyncing(true)
          try {
            const levelMap: any = { T: "TOP", M: "MID", L: "BOT", P: "FLOOR" }

            // ── Step 2: Clear warehouse positions ──
            for (const item of inShipmentItems) {
              const locs = item.location.split(' + ').filter(Boolean)
              for (const loc of locs) {
                const { rack, num, level } = parseLocationCode(loc)
                if (rack && num && level) {
                  await fetch("/api/admin/warehouse", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      locationCode: loc,
                      rack,
                      level: levelMap[level] || "TOP",
                      cellNumber: Math.ceil(parseInt(num) / 2),
                      palletPosition: parseInt(num) % 2 === 0 ? 2 : 1,
                      status: "AVAILABLE",
                      productName: null,
                      sku: null,
                      quantity: null
                    })
                  })
                }
              }
              await fetch(`/api/admin/fba-shipments/items/${item.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ location: "ENVIADO" })
              })
            }

            // ── Step 3: Create shipment history log ──
            const logEntries = inShipmentItems.map((item: any) => ({
              shipmentId: shId,
              shipmentName: tab.name || "Unknown Shipment",
              productName: item.name || "Unknown",
              sku: item.sku || null,
              asin: item.asin || null,
              fnsku: item.fnsku || null,
              upc: item.upc || null,
              totalUnits: item.totalUnits || 0,
              totalBoxes: item.totalBoxes || null,
              qtyPerBox: item.qtyPerBox || null,
              locationCode: item.location || null,
              action: "SHIPPED",
            }))

            await fetch("/api/admin/shipment-logs", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ entries: logEntries })
            })

            // ── Step 4: Refresh UI ──
            const updatedRes = await fetch(`/api/admin/fba-shipments?id=${shId}`)
            if (updatedRes.ok) {
              const updatedData = await updatedRes.json()
              setTabs(prev => prev.map(t => t.id === shId ? { ...t, items: updatedData.items } : t))
            }
            await refreshWarehousePositions()
            alert("✅ Envío marcado como ENVIADO. Posiciones liberadas y historial registrado.")
          } catch (e) {
            alert("❌ Error al procesar el envío.")
          } finally {
            setIsSyncing(false)
          }
        }
      })
    } catch (e) {
      setIsSyncing(false)
      alert("❌ Error al validar el envío.")
    }
  }

  const syncAllToWarehouse = async (shId: string) => {
    const tab = tabs.find(t => t.id === shId)
    if (!tab) return

    setIsSyncing(true)
    setSaveStatus("saving")

    try {
      const itemsToSync = tab.items.filter((i: any) => i.location && i.status === "IN_SHIPMENT")
      const levelMap: any = { T: "TOP", M: "MID", L: "BOT", P: "FLOOR" }

      // Perform batch-like sequential updates
      for (const item of itemsToSync) {
        const locations = item.location.split(' + ').filter(Boolean)
        for (const loc of locations) {
          const { rack, num, level } = parseLocationCode(loc)
          if (rack && num && level) {
            const numInt = parseInt(num)
            const warehousePayload = {
              locationCode: loc,
              rack,
              level: levelMap[level] || "TOP",
              cellNumber: Math.ceil(numInt / 2),
              palletPosition: numInt % 2 === 0 ? 2 : 1,
              sku: item.sku,
              productName: item.name,
              quantity: Math.floor((parseInt(item.totalUnits as any) || 0) / locations.length), // Distribute qty
              expirationDate: parseSyncDate(item.expDate || ""),
              status: item.status === "PENDING" ? "HOLD" : "OUTBOUND"
            }

            await fetch("/api/admin/warehouse", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(warehousePayload)
            })
          }
        }
      }
      setSaveStatus("saved")
      setTimeout(() => setSaveStatus("idle"), 2000)
      await refreshWarehousePositions()
      alert("✅ Sincronización con el almacén completada!")
    } catch (err) {
      alert("❌ Error al sincronizar")
    } finally {
      setIsSyncing(false)
    }
  }
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
    } catch (e) { }
  }

  const fetchPendingItems = async () => {
    try {
      const res = await fetch("/api/admin/fba-shipments?type=pending")
      const data = await res.json()
      if (Array.isArray(data)) setGlobalPendingItems(data)
    } catch (e) { }
  }

  useEffect(() => {
    const init = async () => {
      await Promise.all([fetchShipments(), fetchPendingItems()])
      // Fetch warehouse positions for location dropdown + mixed pallet highlights
      await refreshWarehousePositions()
      setLoading(false)
    }
    init()
  }, [refreshWarehousePositions])

  useEffect(() => {
    const interval = setInterval(async () => {
      // Skip sync if user is currently typing/focusing an item to prevent displacement or layout jumps
      if (focusedItemId) return;
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
      } catch (error) { }
    }, 15000)
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
    } catch (e) {
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
    } catch (e) { }
  }

  const deleteShipment = async (shId: string) => {
    setConfirmDialog({
      isOpen: true,
      title: "¿Eliminar Envío?",
      message: "Estás a punto de borrar este envío permanentemente. Todos los datos asociados se perderán y no se podrá deshacer esta acción.",
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/admin/fba-shipments/${shId}`, { method: "DELETE" })
          if (res.ok) {
            closeTab(shId)
            await fetchShipments()
          }
        } catch (e) { }
      }
    })
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

      // ── Synchronization with Warehouse Map ──
      const updatedItem = { ...itemBefore, ...payload, [field]: finalValue }
      if (updatedItem.location || itemBefore.location) {
        const levelMap: any = { T: "TOP", M: "MID", L: "BOT", P: "FLOOR" }
        const oldLocs = (itemBefore.location || "").split(' + ').filter(Boolean)
        const newLocs = (updatedItem.location || "").split(' + ').filter(Boolean)

        // Clear locations removed
        for (const loc of oldLocs) {
          if (!newLocs.includes(loc)) {
            const { rack, num, level } = parseLocationCode(loc)
            await fetch("/api/admin/warehouse", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                locationCode: loc,
                rack,
                level: levelMap[level] || "TOP",
                cellNumber: Math.ceil(parseInt(num) / 2),
                palletPosition: parseInt(num) % 2 === 0 ? 2 : 1,
                status: "AVAILABLE",
                productName: null,
                sku: null,
                quantity: null
              })
            })
          }
        }

        // Update/Upsert current locations
        for (const loc of newLocs) {
          const { rack, num, level } = parseLocationCode(loc)
          if (rack && num && level) {
            const numInt = parseInt(num)
            const warehousePayload = {
              locationCode: loc,
              rack,
              level: levelMap[level] || "TOP",
              cellNumber: Math.ceil(numInt / 2),
              palletPosition: numInt % 2 === 0 ? 2 : 1,
              sku: updatedItem.sku,
              productName: updatedItem.name,
              quantity: Math.floor((parseInt(updatedItem.totalUnits as any) || 0) / newLocs.length),
              expirationDate: parseSyncDate(updatedItem.expDate || ""),
              status: updatedItem.status === "PENDING" ? "HOLD" : "OUTBOUND"
            }
            await fetch("/api/admin/warehouse", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(warehousePayload)
            })
          }
        }
        await refreshWarehousePositions()
      }

      setSaveStatus("saved")
      setTimeout(() => setSaveStatus("idle"), 2000)
    } catch (e) {
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
      setCopiedItem(null)
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

  const deleteItem = async (itemId: string) => {
    setConfirmDialog({
      isOpen: true,
      title: "¿Eliminar Artículo?",
      message: "¿Seguro que deseas eliminar este producto del envío? También se liberarán las posiciones en el almacén.",
      onConfirm: async () => {
        try {
          await fetch(`/api/admin/fba-shipments/items/${itemId}`, { method: "DELETE" })
          setTabs(prev => prev.map((t: any) => ({
            ...t,
            items: t.items.filter((i: any) => i.id !== itemId)
          })))
        } catch (e) { }
      }
    })
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
    } catch (e) { } finally {
      setUploadingId(null)
      setSelectedIdForUpload(null)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  const removeImage = async (itemId: string, imageUrlToRemove: string) => {
    setTabs(prev => prev.map((t: any) => {
      if (t.id !== activeTabId) return t
      return {
        ...t, items: t.items.map((i: any) => {
          if (i.id !== itemId) return i
          let updates: any = { ...i }
          if (i.imageUrl === imageUrlToRemove) updates.imageUrl = null
          if (i.imageUrls?.includes(imageUrlToRemove)) updates.imageUrls = i.imageUrls.filter((u: string) => u !== imageUrlToRemove)
          return updates
        })
      }
    }))
    try {
      await fetch(`/api/admin/fba-shipments/items/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: null, imageUrls: [] })
      })
    } catch (e) { }
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

  const filteredShipments = (allShipments || []).filter(sh =>
    (sh.name || "").toLowerCase().includes(searchQuery.toLowerCase())
  )

  const renderShipmentColGroup = () => (
    <colgroup>
      <col style={{ width: "35px" }} />
      <col style={{ width: "110px" }} />
      <col style={{ width: "130px" }} />
      <col style={{ width: "130px" }} />
      <col style={{ width: "300px" }} />
      <col style={{ width: "180px" }} />
      <col style={{ width: "180px" }} />
      <col style={{ width: "160px" }} />
      <col style={{ width: "160px" }} />
      <col style={{ width: "85px" }} />
      <col style={{ width: "105px" }} />
      <col style={{ width: "115px" }} />
      <col style={{ width: "115px" }} />
      <col style={{ width: "55px" }} />
      <col style={{ width: "55px" }} />
      <col style={{ width: "55px" }} />
      <col style={{ width: "90px" }} />
      <col style={{ width: "300px" }} />
      <col style={{ width: "70px" }} />
    </colgroup>
  )

  if (loading) return <div className="p-12 text-center animate-pulse text-slate-400 font-bold">Cargando Portal FBA...</div>

  const activeTab = tabs.find(t => t.id === activeTabId)

  const calculatePallets = () => {
    if (!activeTab || !activeTab.items) return 0
    const inShipmentItems = activeTab.items.filter((i: any) => i.status === "IN_SHIPMENT")
    let totalPallets = 0
    
    inShipmentItems.forEach((item: any) => {
      const l = parseFloat(item.length) || 0
      const w = parseFloat(item.width) || 0
      const h = parseFloat(item.height) || 0
      const boxes = parseInt(item.totalBoxes) || 0

      if (l > 0 && w > 0 && h > 0 && boxes > 0) {
        // Orientación 1: Largo a lo largo de 40", Ancho a lo largo de 48"
        const ti1 = Math.floor(40 / l) * Math.floor(48 / w)
        // Orientación 2: Largo a lo largo de 48", Ancho a lo largo de 40"
        const ti2 = Math.floor(48 / l) * Math.floor(40 / w)
        const ti = Math.max(ti1, ti2)

        const hi = Math.floor(72 / h)
        const boxesPerPallet = ti * hi

        if (boxesPerPallet > 0) {
          totalPallets += boxes / boxesPerPallet
        } else {
          // Fallback volumétrico si la caja es muy grande para el cálculo estándar
          const boxVol = l * w * h
          const palletVol = 40 * 48 * 72
          totalPallets += (boxVol * boxes) / palletVol
        }
      }
    })
    return totalPallets
  }

  return (
    <>
      <div className="w-full flex flex-col h-full bg-[#f8fafc] min-h-screen font-sans">
        <style jsx global>{`
        @media print {
          @page { size: landscape; margin: 0.5cm; }
          body * { visibility: hidden; }
          .print-area, .print-area * { visibility: visible; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          .tab-bar, .no-print { display: none !important; }
        }
        #reader video {
          object-fit: cover !important;
        }
        #reader__dashboard_section_csr button {
          background: #3b82f6 !important;
          color: white !important;
          padding: 8px 16px !important;
          border-radius: 8px !important;
          font-weight: bold !important;
          border: none !important;
        }
        #reader__status_span {
          display: none !important;
        }
      `}</style>
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
              className={`flex items-center gap-2 px-6 py-3 rounded-t-none cursor-pointer transition-all font-bold min-w-[220px] border-x border-t relative group ${activeTabId === tab.id ? "bg-[#f8fafc] text-slate-900 border-slate-200 -mb-[1px]" : "bg-white text-slate-400 border-transparent hover:bg-slate-50"}`}
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
            <div>
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
          ) : activeTab ? (
            /* SHIPMENT TAB VIEW */
            <div className="">
              <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-8 no-print">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-200">
                    <ImageIcon className="h-7 w-7" />
                  </div>
                  <div>
                    <div className="flex items-center gap-3">
                      <h1 className="text-3xl font-black text-slate-900 leading-none">{activeTab.name}</h1>
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Button
                    variant="outline"
                    onClick={() => syncAllToWarehouse(activeTab.id)}
                    disabled={isSyncing}
                    className="h-12 bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 rounded-xl px-6 font-black gap-2"
                  >
                    <LayoutGrid className="h-5 w-5" /> {isSyncing ? "Sincronizando..." : "Sincronizar Mapa 🗺️"}
                  </Button>
                  <Button
                    onClick={() => handleMarkAsShipped(activeTab.id)}
                    disabled={isSyncing}
                    className="h-12 bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200 rounded-xl px-8 font-black gap-2 uppercase tracking-widest text-[11px]"
                  >
                    <Send className="h-5 w-5" /> {isSyncing ? "Procesando..." : "MARCAR COMO ENVIADO"}
                  </Button>
                  <Button variant="outline" onClick={() => window.print()} className="h-12 bg-white rounded-xl shadow-sm px-6 font-bold border-slate-200"><Printer className="h-5 w-5" /> Imprimir</Button>
                  <Button variant="outline" onClick={() => exportToExcelObject(activeTab, activeTab.items)} className="h-12 bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 rounded-xl px-6 font-bold gap-2"><Download className="h-5 w-5" /> Exportar Excel</Button>
                  <Button variant="ghost" onClick={() => closeTab(activeTab.id)} className="h-12 rounded-xl px-6 font-bold text-slate-500 hover:bg-slate-200">Cerrar Pestaña</Button>
                </div>
              </div>

              {/* PALLET ESTIMATION */}
              <div className="mb-4 flex items-center gap-2 no-print animate-in fade-in duration-300">
                <div className="text-xs font-black bg-emerald-50 text-emerald-700 border border-emerald-200/60 px-3 py-1.5 rounded-lg shadow-sm flex items-center gap-2">
                  <LayoutGrid className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Pallets: <span className="font-black text-emerald-900 text-sm">{calculatePallets().toFixed(2)}</span></span>
                </div>
              </div>

              {/* MAIN TABLE */}
              <Card className="w-full border-0 shadow-2xl rounded-none overflow-hidden bg-white mb-10 border border-slate-100 p-0">
                <div className="overflow-x-auto custom-scrollbar">
                  <table className="text-left border-collapse w-[2240px] min-w-[2240px] table-fixed" style={{ tableLayout: "fixed", width: "2240px" }}>
                    {renderShipmentColGroup()}
                    <thead>
                      <tr className="bg-[#1f4e3d] text-white text-[11px] uppercase font-black tracking-widest">
                        <th className="py-6 px-1 w-[35px] text-center bg-[#163a2d]"></th>
                        <th className="py-6 px-3 w-[110px] border-r border-white/5 text-center">Location</th>
                        <th className="py-6 px-3 w-[130px] border-r border-white/5 text-center">Cajas</th>
                        <th className="py-6 px-3 w-[130px] border-r border-white/5 text-center">Fotos</th>
                        <th className="py-6 px-5 w-[300px] border-r border-white/5">Producto</th>
                        <th className="py-6 px-3 w-[180px] border-r border-white/5 text-center whitespace-nowrap">FnSKU</th>
                        <th className="py-6 px-3 w-[180px] border-r border-white/5 text-center whitespace-nowrap">UPC</th>
                        <th className="py-6 px-3 w-[160px] border-r border-white/5 text-center whitespace-nowrap">SKU</th>
                        <th className="py-6 px-3 w-[160px] border-r border-white/5 text-center whitespace-nowrap">ASIN</th>
                        <th className="py-6 px-3 w-[85px] border-r border-white/5 text-center">U/C</th>
                        <th className="py-6 px-3 w-[105px] border-r border-white/5 text-center bg-[#245d48]">Cajas ({activeTab.items.filter((i: any) => i.status === "IN_SHIPMENT").reduce((acc: number, i: any) => acc + (parseInt(i.totalBoxes) || 0), 0)})</th>
                        <th className="py-6 px-3 w-[115px] border-r border-white/5 text-center bg-[#245d48]">Und ({activeTab.items.filter((i: any) => i.status === "IN_SHIPMENT").reduce((acc: number, i: any) => acc + (parseInt(i.totalUnits) || 0), 0)})</th>
                        <th className="py-6 px-3 w-[115px] border-r border-white/5 text-center">Exp. Date</th>
                        <th className="py-6 px-2 w-[55px] border-r border-white/5 text-center">L</th>
                        <th className="py-6 px-2 w-[55px] border-r border-white/5 text-center">A</th>
                        <th className="py-6 px-2 w-[55px] border-r border-white/5 text-center">H</th>
                        <th className="py-6 px-4 w-[90px] border-r border-white/5 text-center">Peso</th>
                        <th className="py-6 px-6 w-[300px] border-r border-white/5">Descripción</th>
                        <th className="py-6 px-3 w-[70px] text-center bg-[#163a2d]">Acc</th>
                      </tr>
                    </thead>

                    <Reorder.Group axis="y" as="tbody" layoutScroll={false} values={activeTab.items.filter((i: any) => i.status === "IN_SHIPMENT")} onReorder={(v) => handleDragReorder(v, "IN_SHIPMENT")}>
                      {activeTab.items.filter((i: any) => i.status === "IN_SHIPMENT").map((item: any, index: number) => (
                        <StandaloneRow
                          key={item.id} item={item} index={index} isPending={false}
                          updateItem={updateItem}
                          deleteItem={() => deleteItem(item.id)}
                          setConfirmDialog={setConfirmDialog} // Pass the global setter
                          switchItemStatus={switchItemStatus}
                          removeImage={removeImage} setSelectedIdForUpload={setSelectedIdForUpload}
                          fileInputRef={fileInputRef} uploadingId={uploadingId} setFocusedItemId={setFocusedItemId}
                          setExpandedImage={setExpandedImage}
                          copyItem={copyItem}
                          warehousePositions={warehousePositions}
                          onOpenScanner={openScanner}
                        />
                      ))}
                    </Reorder.Group>
                  </table>
                </div>
                <div className="bg-[#f8fafc]/50 p-8 border-t no-print flex gap-4">
                  <Button variant="ghost" onClick={() => handleAddRow(activeTab.id)} className="flex-1 h-20 text-slate-400 font-bold gap-4 border-4 border-dashed border-slate-100 hover:border-blue-400 hover:bg-blue-50 hover:text-blue-600 transition-all rounded-none group">
                    <Plus className="h-6 w-6 group-hover:scale-125 transition-transform" /> AGREGAR ARTÍCULO AL DOCUMENTO
                  </Button>
                  {copiedItem && (
                    <Button variant="ghost" onClick={() => pasteItem(activeTab.id)} className="flex-1 h-20 text-blue-400 font-bold gap-4 border-4 border-dashed border-blue-100 hover:border-green-400 hover:bg-green-50 hover:text-green-600 transition-all rounded-none group">
                      <ClipboardPaste className="h-6 w-6 group-hover:scale-125 transition-transform" /> PEGAR "{copiedItem.name || "Fila"}"
                    </Button>
                  )}
                </div>
              </Card>

              {/* GLOBAL PENDING SECTION */}
              {globalPendingItems.length > 0 && (
                <div className="no-print bg-amber-50/40 rounded-3xl p-10 border border-amber-100/50 shadow-inner mt-10 mb-20">
                  <h2 className="text-2xl font-black text-amber-900 mb-8 flex items-center gap-3">
                    <MousePointer2 className="h-6 w-6" /> Palets en Espera (Global)
                    <span className="text-[10px] font-black bg-amber-600 text-white px-3 py-1 rounded-full uppercase tracking-tighter">Disponible para este envío</span>
                  </h2>
                  <div className="overflow-x-auto rounded-none border border-amber-200 bg-white shadow-xl p-0">
                    <table className="text-left w-[2240px] min-w-[2240px] table-fixed border-collapse" style={{ tableLayout: "fixed", width: "2240px" }}>
                      {renderShipmentColGroup()}
                      <thead>
                        <tr className="bg-amber-800 text-white text-[11px] uppercase font-black tracking-widest leading-none">
                          <th className="py-6 px-1 w-[35px] text-center bg-amber-900"></th>
                          <th className="py-6 px-3 w-[110px] text-center">Location</th>
                          <th className="py-6 px-3 w-[130px] text-center">Cajas</th>
                          <th className="py-6 px-3 w-[130px] text-center">Fotos</th>
                          <th className="py-6 px-5 w-[300px]">PRODUCTO PENDIENTE</th>
                          <th className="py-6 px-3 w-[180px] text-center whitespace-nowrap">FnSKU</th>
                          <th className="py-6 px-3 w-[180px] text-center whitespace-nowrap">UPC</th>
                          <th className="py-6 px-3 w-[160px] text-center whitespace-nowrap">SKU</th>
                          <th className="py-6 px-3 w-[160px] text-center whitespace-nowrap">ASIN</th>
                          <th className="py-6 px-3 w-[85px] text-center">U/C</th>
                          <th className="py-6 px-3 w-[105px] text-center leading-tight bg-amber-900/40">Cajas<br /><span className="text-[9px] text-amber-200">({globalPendingItems.reduce((acc: number, i: any) => acc + (parseInt(i.totalBoxes) || 0), 0)})</span></th>
                          <th className="py-6 px-3 w-[115px] text-center leading-tight bg-amber-900/40">Unds<br /><span className="text-[9px] text-amber-200">({globalPendingItems.reduce((acc: number, i: any) => acc + (parseInt(i.totalUnits) || 0), 0)})</span></th>
                          <th className="py-6 px-3 w-[115px] text-center">Exp. Date</th>
                          <th className="py-6 px-2 w-[55px] text-center">L</th>
                          <th className="py-6 px-2 w-[55px] text-center">A</th>
                          <th className="py-6 px-2 w-[55px] text-center">H</th>
                          <th className="py-6 px-4 w-[90px] text-center">Peso</th>
                          <th className="py-6 px-6 w-[300px]">Descripción</th>
                          <th className="py-6 px-3 w-[70px] text-center">Acc</th>
                        </tr>
                      </thead>
                      <Reorder.Group axis="y" as="tbody" layoutScroll={false} values={globalPendingItems} onReorder={(v) => handleDragReorder(v, "PENDING")}>
                        {globalPendingItems.map((item: any, index: number) => (
                          <StandaloneRow
                            key={item.id} item={item} index={index} isPending={true}
                            updateItem={updateItem}
                            deleteItem={() => deleteItem(item.id)}
                            setConfirmDialog={setConfirmDialog}
                            switchItemStatus={switchItemStatus}
                            removeImage={removeImage} setSelectedIdForUpload={setSelectedIdForUpload}
                            fileInputRef={fileInputRef} uploadingId={uploadingId} setFocusedItemId={setFocusedItemId}
                            setExpandedImage={setExpandedImage}
                            activeTabId={activeTabId}
                            copyItem={copyItem}
                            warehousePositions={warehousePositions}
                            onOpenScanner={openScanner}
                          />
                        ))}
                      </Reorder.Group>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ) : null}
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

      {/* HIDDEN INPUT FOR PHOTOS */}
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/*"
        capture="environment"
        multiple
        onChange={handleImageUpload}
      />
      {/* Modal de Confirmación Global */}
      <ConfirmDeleteModal
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog(p => ({ ...p, isOpen: false }))}
        title={confirmDialog.title}
        message={confirmDialog.message}
        onConfirm={confirmDialog.onConfirm}
        confirmLabel={(confirmDialog as any).confirmLabel}
        confirmColor={(confirmDialog as any).confirmColor}
      />

      {/* SCANNER MODAL */}
      <Dialog open={scannerOpen} onOpenChange={setScannerOpen}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-black text-white border-0">
          <div className="relative aspect-video sm:aspect-square bg-slate-900 flex items-center justify-center">
            <div id="reader" className="w-full h-full"></div>
            <div className="absolute inset-0 border-2 border-dashed border-white/20 pointer-events-none flex items-center justify-center">
              <div className="w-64 h-64 border-2 border-blue-500 rounded-lg shadow-[0_0_50px_rgba(59,130,246,0.5)]"></div>
            </div>
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2">
              <Scan className="h-4 w-4 animate-pulse text-blue-400" /> ESCANEANDO...
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4 text-white hover:bg-white/20 z-50"
              onClick={() => setScannerOpen(false)}
            >
              <X className="h-6 w-6" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ScannerEffect open={scannerOpen} onScan={handleScanResult} />


    </>
  )
}
