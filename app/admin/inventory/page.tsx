"use client"

import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { compressImage } from "@/lib/image-compression"
import {
  ChevronLeft,
  ScanLine,
  Search,
  ChevronRight,
  ImageIcon,
  Plus,
  RefreshCw,
  Camera,
  Trash2,
  Save,
  Zap,
  ArrowUpDown,
  Filter,
  Check,
  X,
  Copy,
  MapPin,
  Package,
  Warehouse,
  ChevronDown,
  ChevronUp,
  Pencil,
  AlertTriangle,
  Move,
} from "lucide-react"

// ── Constants & Utilities ──
const ScannerEffect = ({ open, onScan }: { open: boolean, onScan: (code: string) => void }) => {
  useEffect(() => {
    let html5QrCode: any = null;
    let isMounted = true;

    const startScanner = async () => {
      // 1. Wait for script to be available globally
      let retries = 0;
      while (!(window as any).Html5Qrcode && retries < 10) {
        await new Promise(resolve => setTimeout(resolve, 500));
        retries++;
      }

      if (!isMounted || !open) return;
      
      const Html5Qrcode = (window as any).Html5Qrcode;
      const Html5QrcodeSupportedFormats = (window as any).Html5QrcodeSupportedFormats;

      if (!Html5Qrcode) {
        console.error("Html5Qrcode library failed to load after 5s");
        return;
      }

      // 2. Wait for DOM element to be definitely ready
      let domRetries = 0;
      while (!document.getElementById("inventory-reader") && domRetries < 5) {
        await new Promise(resolve => setTimeout(resolve, 200));
        domRetries++;
      }

      if (!document.getElementById("inventory-reader")) {
        console.error("inventory-reader element not found in DOM");
        return;
      }

      try {
        // Explicitly enable ALL barcode formats — critical for UPC/EAN scanning
        const formatsToSupport = Html5QrcodeSupportedFormats
          ? [
              Html5QrcodeSupportedFormats.UPC_A,
              Html5QrcodeSupportedFormats.UPC_E,
              Html5QrcodeSupportedFormats.EAN_13,
              Html5QrcodeSupportedFormats.EAN_8,
              Html5QrcodeSupportedFormats.CODE_128,
              Html5QrcodeSupportedFormats.CODE_39,
              Html5QrcodeSupportedFormats.ITF,
              Html5QrcodeSupportedFormats.CODABAR,
              Html5QrcodeSupportedFormats.QR_CODE,
              Html5QrcodeSupportedFormats.DATA_MATRIX,
            ].filter(Boolean)
          : undefined;

        html5QrCode = new Html5Qrcode("inventory-reader", {
          formatsToSupport,
          verbose: false,
        });
        
        // Scanning box optimized for 1D barcodes: wide and thin
        const qrboxFunction = (viewfinderWidth: number, viewfinderHeight: number) => {
            const boxWidth = Math.floor(viewfinderWidth * 0.85);
            const boxHeight = Math.floor(viewfinderHeight * 0.25);
            return {
                width: Math.max(boxWidth, 200),
                height: Math.max(boxHeight, 80)
            };
        };

        await html5QrCode.start(
          { facingMode: "environment" },
          { 
            fps: 15, 
            qrbox: qrboxFunction,
            rememberLastUsedCamera: true,
            aspectRatio: 1.7777, // 16:9 widescreen — much better for horizontal barcodes
            disableFlip: false,
          },
          (decodedText: string) => {
            console.log("[SCANNER] Barcode detected:", decodedText);
            // Haptic feedback if available
            if ("vibrate" in navigator) {
              navigator.vibrate(200);
            }
            onScan(decodedText);
            html5QrCode.stop().catch(console.error);
          },
          (error: any) => {
            // Silent — this fires on every frame that doesn't detect a barcode
          }
        );
      } catch (err) {
        console.error("Scanner start error:", err);
      }
    };

    if (open) {
      startScanner();
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

// ── Types ──
type InventoryItem = {
  id: string
  source: "AMAZON" | "MANUAL"
  asin: string | null
  fnsku: string | null
  amazonTitle: string | null
  amazonImageUrl: string | null
  amazonUrl: string | null
  upc: string | null
  ean: string | null
  name: string
  sku: string | null
  description: string | null
  imageUrl: string | null
  category: string | null
  location: string | null
  quantityOnHand: number
  quantityReserved: number
  reorderPoint: number
  unitCost: number | null
  isActive: boolean
  notes: string | null
  lastSyncedAt: string | null
  createdAt: string
  updatedAt: string
}

type PalletLocation = {
  palletId: string
  locationCode: string
  quantity: number | null
  status: string
  level: string
  rack: string
  expirationDate: string | null
  palletHeightIn: number | null
  notes: string | null
  lotNumber: string | null
}

type WarehouseProduct = {
  id: string
  productName: string
  sku: string | null
  totalQuantity: number
  palletCount: number
  locations: PalletLocation[]
  statuses: string[]
  earliestExpiration: string | null
  asin: string | null
  fnsku: string | null
  upc: string | null
  imageUrl: string | null
  amazonTitle: string | null
}

// ── Helpers ──
const getItemImage = (item: InventoryItem) => item.imageUrl || item.amazonImageUrl || null

const STATUS_COLORS: Record<string, string> = {
  AVAILABLE: "bg-emerald-100 text-emerald-700",
  DAMAGED: "bg-red-100 text-red-700",
  HOLD: "bg-orange-100 text-orange-700",
  INBOUND: "bg-purple-100 text-purple-700",
  OUTBOUND: "bg-blue-100 text-blue-700",
}

const STATUS_LABELS: Record<string, string> = {
  AVAILABLE: "Disponible",
  DAMAGED: "Dañado",
  HOLD: "En Espera",
  INBOUND: "Shipping Supply",
  OUTBOUND: "Saliente",
}

const STATUS_OPTIONS = ["AVAILABLE", "DAMAGED", "HOLD", "INBOUND", "OUTBOUND"]

// ── Confirmation Modal ──
function ConfirmModal({ open, onClose, onConfirm, title, message }: {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
}) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm p-0 overflow-hidden border-0 shadow-2xl">
        <div className="bg-white p-6 pt-8 text-center">
          <div className="mx-auto w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle className="h-7 w-7 text-red-600" />
          </div>
          <DialogHeader className="p-0">
            <DialogTitle className="text-lg font-black text-slate-900 text-center uppercase tracking-tight">
              {title}
            </DialogTitle>
            <p className="mt-3 text-slate-500 text-sm leading-relaxed">{message}</p>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 mt-6">
            <Button variant="ghost" onClick={onClose} className="h-10 font-bold uppercase tracking-widest text-[10px] text-slate-400">
              Cancelar
            </Button>
            <Button onClick={() => { onConfirm(); onClose() }} className="h-10 bg-red-600 hover:bg-red-700 text-white font-bold uppercase tracking-widest text-[10px]">
              Confirmar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ══════════════════════════════════════════════════
// ADD PRODUCT MODAL
// ══════════════════════════════════════════════════
function AddProductModal({ open, onClose, onAdded }: { open: boolean; onClose: () => void; onAdded: () => void }) {
  const [form, setForm] = useState({
    productName: "",
    sku: "",
    upc: "",
    fnsku: "",
    asin: "",
    imageUrl: "",
    description: "",
    quantity: "",
    locationCode: "",
    rack: "A",
    level: "FLOOR",
    cellNumber: "1",
    palletPosition: "1",
    lotNumber: "",
    expirationDate: "",
    palletHeightIn: "",
    status: "AVAILABLE",
    notes: "",
  })
  const [saving, setSaving] = useState(false)
  const [isScanning, setIsScanning] = useState(false)
  const [scannerOpen, setScannerOpen] = useState(false)
  const [lookupSource, setLookupSource] = useState<"amazon" | "external" | "none" | null>(null)
  const [lookupMessage, setLookupMessage] = useState<string>("")

  useEffect(() => {
    if (open) {
      if (!document.querySelector('script[src="https://unpkg.com/html5-qrcode"]')) {
        const script = document.createElement("script")
        script.src = "https://unpkg.com/html5-qrcode"
        script.async = true
        document.body.appendChild(script)
      }
    }
  }, [open])

  const handleLookup = async (code: string) => {
    if (!code) return
    setIsScanning(true)
    setLookupSource(null)
    setLookupMessage("Buscando en inventario local...")
    
    // Optimistically fill the barcode fields we have
    const cleanCode = code.trim()
    setForm(f => ({ ...f, upc: cleanCode }))

    // Show progressive feedback: the API searches multiple tiers
    // but we give a visual indication that external DBs are being queried
    const messageTimer = setTimeout(() => {
      setLookupMessage("Buscando en bases de datos universales de UPC...")
    }, 2000)
    const messageTimer2 = setTimeout(() => {
      setLookupMessage("Consultando múltiples fuentes externas...")
    }, 6000)

    try {
      const res = await fetch(`/api/admin/inventory/lookup?code=${encodeURIComponent(cleanCode)}`)
      const data = await res.json()
      
      if (data.found && data.item) {
        setLookupSource(data.source) // "amazon" or "external"
        setForm(f => ({
          ...f,
          productName: data.item.amazonTitle || data.item.name || f.productName,
          sku: data.item.sku || f.sku,
          upc: data.item.upc || cleanCode,
          fnsku: data.item.fnsku || f.fnsku,
          asin: data.item.asin || f.asin,
          imageUrl: data.item.amazonImageUrl || data.item.imageUrl || f.imageUrl,
          description: data.item.description || f.description,
        }))
        setLookupMessage(
          data.source === "amazon" 
            ? "✅ Producto encontrado en inventario Amazon" 
            : "✅ Producto encontrado en base de datos universal"
        )
      } else {
        setLookupSource("none")
        setLookupMessage("❌ No encontrado en ninguna base de datos. Ingresa la información manualmente.")
      }
    } catch (e) {
      console.error("Lookup error:", e)
      setLookupSource("none")
      setLookupMessage("⚠️ Error de conexión. Intenta de nuevo o ingresa manualmente.")
    } finally {
      clearTimeout(messageTimer)
      clearTimeout(messageTimer2)
      setIsScanning(false)
      setScannerOpen(false)
      // Clear the message after 5 seconds
      setTimeout(() => setLookupMessage(""), 5000)
    }
  }

  const handleClose = () => {
    onClose()
    setForm({
      productName: "", sku: "", upc: "", fnsku: "", asin: "", imageUrl: "", description: "", quantity: "", locationCode: "",
      rack: "A", level: "FLOOR", cellNumber: "1", palletPosition: "1",
      lotNumber: "", expirationDate: "", palletHeightIn: "",
      status: "AVAILABLE", notes: "",
    })
    setLookupSource(null)
    setLookupMessage("")
  }

  const levelMap: Record<string, string> = { T: "TOP", M: "MID", L: "BOT", P: "FLOOR" }
  const levelKeys: Record<string, string> = { TOP: "T", MID: "M", BOT: "L", FLOOR: "P" }

  // Auto-generate locationCode
  const locationCode = useMemo(() => {
    const cn = parseInt(form.cellNumber) || 1
    const pp = parseInt(form.palletPosition) || 1
    const globalNum = (cn - 1) * 2 + pp
    return `${form.rack}${globalNum}${levelKeys[form.level] || "P"}`
  }, [form.rack, form.level, form.cellNumber, form.palletPosition])

  const handleSave = async () => {
    if (!form.productName.trim()) return alert("Product name is required")
    setSaving(true)
    try {
      const cn = parseInt(form.cellNumber) || 1
      const pp = parseInt(form.palletPosition) || 1
      const res = await fetch("/api/admin/inventory/warehouse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          locationCode,
          cellNumber: cn,
          palletPosition: pp,
          level: form.level,
        }),
      })
      if (res.ok) {
        onAdded()
        onClose()
        setForm({
          productName: "", sku: "", upc: "", fnsku: "", asin: "", imageUrl: "", description: "", quantity: "", locationCode: "",
          rack: "A", level: "FLOOR", cellNumber: "1", palletPosition: "1",
          lotNumber: "", expirationDate: "", palletHeightIn: "",
          status: "AVAILABLE", notes: "",
        })
        setLookupSource(null)
      } else {
        const err = await res.json()
        alert("❌ " + (err.error || "Failed to add"))
      }
    } catch (e: any) {
      alert("❌ " + e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(val) => { if(!val) handleClose() }}>
      <DialogContent hideClose className="max-w-md p-0 overflow-hidden bg-white sm:rounded-xl max-h-[90vh]">
        <div className="flex items-center justify-between px-4 h-14 border-b bg-emerald-50">
          <button onClick={handleClose} className="text-slate-500 text-sm font-medium">Cancel</button>
          <h2 className="font-black text-slate-800 uppercase tracking-wider text-[12px]">
            <Plus className="inline h-4 w-4 mr-1 -mt-0.5" /> Add Product to Warehouse
          </h2>
          <button onClick={handleSave} disabled={saving} className="text-emerald-600 text-sm font-bold">
            {saving ? "..." : "Save"}
          </button>
        </div>
        <div className="overflow-y-auto max-h-[75vh] p-4 space-y-4">
          
          {/* Universal Scanner Section */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-3">
            <div className="flex justify-between items-center">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <ScanLine className="h-3.5 w-3.5" /> Scan UPC / FNSKU
              </label>
              {lookupSource === "amazon" && (
                <span className="text-[9px] font-black uppercase text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded flex items-center gap-1">
                  <Check className="h-3 w-3" /> In Amazon Inventory
                </span>
              )}
              {lookupSource === "external" && (
                <span className="text-[9px] font-black uppercase text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" /> Not In Amazon Inventory
                </span>
              )}
              {lookupSource === "none" && (
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-black uppercase text-red-800 bg-red-100 px-2.5 py-0.5 rounded flex items-center gap-1">
                    <X className="h-3 w-3" /> No Encontrado
                  </span>
                  <a 
                    href={`https://www.google.com/search?q=UPC+barcode+${form.upc || form.fnsku}`} 
                    target="_blank" 
                    rel="noreferrer"
                    className="text-[9px] font-bold text-blue-600 underline hover:text-blue-800"
                  >
                    Buscar en Google
                  </a>
                </div>
              )}
            </div>
            
            <div className="flex gap-2 relative">
              <Input 
                value={form.upc || form.fnsku || ""} 
                onChange={(e) => {
                  const val = e.target.value
                  setForm(f => ({ ...f, upc: val }))
                }}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleLookup(form.upc || form.fnsku || "")
                  }
                }}
                placeholder="Escanea o ingresa código" 
                className="pl-9 pr-20"
              />
              <ScanLine className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              
              <div className="absolute right-12 top-1/2 -translate-y-1/2 flex items-center gap-1">
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className="h-7 px-2 text-[10px] font-black text-blue-600 hover:bg-blue-50"
                  onClick={() => handleLookup(form.upc || form.fnsku || "")}
                >
                  {isScanning ? <RefreshCw className="h-3 w-3 animate-spin" /> : "BUSCAR"}
                </Button>
              </div>

              <Button size="icon" variant="outline" className="shrink-0" onClick={() => setScannerOpen(true)}>
                <Camera className="h-4 w-4" />
              </Button>
            </div>
            
            {(isScanning || lookupMessage) && (
              <div className={`text-[10px] font-bold text-center transition-all duration-300 ${
                isScanning ? "text-blue-600 animate-pulse" 
                : lookupMessage.startsWith("✅") ? "text-emerald-600" 
                : lookupMessage.startsWith("❌") ? "text-red-600"
                : "text-amber-600"
              }`}>
                {isScanning ? lookupMessage || "Buscando producto..." : lookupMessage}
              </div>
            )}
            
            {scannerOpen && (
              <div className="fixed inset-0 z-[200] bg-black/90 flex flex-col items-center justify-center p-4">
                <div className="bg-white p-4 rounded-xl max-w-md w-full mx-auto space-y-3">
                  <div className="flex justify-between items-center">
                    <h3 className="font-black uppercase tracking-widest text-slate-900 text-sm">Escanear Barcode</h3>
                    <Button size="icon" variant="ghost" onClick={() => setScannerOpen(false)}><X className="h-4 w-4" /></Button>
                  </div>
                  <div id="inventory-reader" className="w-full overflow-hidden rounded-xl bg-slate-100 aspect-video"></div>
                  <p className="text-[10px] text-slate-400 text-center font-medium">
                    Alinea el código de barras dentro del rectángulo. Mantén el teléfono estable.
                  </p>
                  <ScannerEffect open={scannerOpen} onScan={(code) => handleLookup(code)} />
                </div>
              </div>
            )}
          </div>

          {/* Product Name */}
          <div className="flex gap-3 items-end">
            {form.imageUrl && (
              <div className="w-12 h-12 rounded bg-white shadow-sm border overflow-hidden shrink-0">
                <img src={form.imageUrl} alt="preview" className="w-full h-full object-contain" />
              </div>
            )}
            <div className="flex-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Product Name *</label>
              <Input value={form.productName} onChange={(e) => setForm(f => ({ ...f, productName: e.target.value }))} placeholder="e.g. Bubble Wrap, Tape, Product XYZ..." className="mt-1" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">SKU</label>
              <Input value={form.sku} onChange={(e) => setForm(f => ({ ...f, sku: e.target.value }))} placeholder="Optional" className="mt-1" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Quantity</label>
              <Input type="number" value={form.quantity} onChange={(e) => setForm(f => ({ ...f, quantity: e.target.value }))} placeholder="0" className="mt-1" />
            </div>
          </div>

          {/* Location Picker */}
          <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" /> Location
            </label>
            <div className="grid grid-cols-4 gap-2 mt-2">
              <div>
                <label className="text-[9px] text-slate-400 font-bold">Rack</label>
                <select value={form.rack} onChange={(e) => setForm(f => ({ ...f, rack: e.target.value }))} className="w-full border rounded px-2 py-1.5 text-sm font-bold mt-0.5">
                  <option value="A">A</option>
                  <option value="B">B</option>
                  <option value="C">C</option>
                </select>
              </div>
              <div>
                <label className="text-[9px] text-slate-400 font-bold">Level</label>
                <select value={form.level} onChange={(e) => setForm(f => ({ ...f, level: e.target.value }))} className="w-full border rounded px-2 py-1.5 text-sm font-bold mt-0.5">
                  <option value="TOP">Top</option>
                  <option value="MID">Mid</option>
                  <option value="BOT">Bot</option>
                  <option value="FLOOR">Floor</option>
                </select>
              </div>
              <div>
                <label className="text-[9px] text-slate-400 font-bold">Cell #</label>
                <Input type="number" min={1} max={8} value={form.cellNumber} onChange={(e) => setForm(f => ({ ...f, cellNumber: e.target.value }))} className="mt-0.5" />
              </div>
              <div>
                <label className="text-[9px] text-slate-400 font-bold">Position</label>
                <select value={form.palletPosition} onChange={(e) => setForm(f => ({ ...f, palletPosition: e.target.value }))} className="w-full border rounded px-2 py-1.5 text-sm font-bold mt-0.5">
                  <option value="1">1</option>
                  <option value="2">2</option>
                </select>
              </div>
            </div>
            <div className="mt-2 text-center">
              <span className="bg-slate-800 text-white font-black text-xs px-3 py-1 rounded">
                {locationCode}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Status</label>
              <select value={form.status} onChange={(e) => setForm(f => ({ ...f, status: e.target.value }))} className="w-full border rounded px-2 py-2 text-sm mt-1">
                {STATUS_OPTIONS.map(s => <option key={s} value={s}>{STATUS_LABELS[s] || s}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Height (in)</label>
              <Input type="number" value={form.palletHeightIn} onChange={(e) => setForm(f => ({ ...f, palletHeightIn: e.target.value }))} placeholder="Optional" className="mt-1" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Lot Number</label>
              <Input value={form.lotNumber} onChange={(e) => setForm(f => ({ ...f, lotNumber: e.target.value }))} placeholder="Optional" className="mt-1" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Expiration</label>
              <Input type="date" value={form.expirationDate} onChange={(e) => setForm(f => ({ ...f, expirationDate: e.target.value }))} className="mt-1" />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Notes</label>
            <textarea value={form.notes} onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional notes..." className="w-full border rounded px-3 py-2 text-sm mt-1 min-h-[60px] resize-none" />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ══════════════════════════════════════════════════
// EDIT PALLET MODAL
// ══════════════════════════════════════════════════
function EditPalletModal({ open, onClose, pallet, occupiedLocationCodes, onSaved }: {
  open: boolean
  onClose: () => void
  pallet: PalletLocation | null
  occupiedLocationCodes: Set<string>
  onSaved: () => void
}) {
  const [form, setForm] = useState({
    productName: "",
    sku: "",
    quantity: "",
    lotNumber: "",
    expirationDate: "",
    palletHeightIn: "",
    status: "AVAILABLE",
    notes: "",
    rack: "A",
    level: "FLOOR",
    cellNumber: "1",
    palletPosition: "1",
  })
  const [saving, setSaving] = useState(false)

  const RACKS = {
    A: { cells: 8 },
    B: { cells: 5 },
    C: { cells: 5 },
  }
  const LEVELS = [
    { key: "T", label: "ARRIBA (T)" },
    { key: "M", label: "MEDIO (M)" },
    { key: "L", label: "ABAJO (L)" },
  ]

  const [moveRack, setMoveRack] = useState<string>("")
  const [moveLevel, setMoveLevel] = useState<string>("")
  const [movePosition, setMovePosition] = useState<string>("")

  const locationCode = moveRack && movePosition && moveLevel ? `${moveRack}${movePosition}${moveLevel}` : (pallet?.locationCode || "")

  useEffect(() => {
    if (!open) {
      setMoveRack("")
      setMoveLevel("")
      setMovePosition("")
    }
  }, [open])

  useEffect(() => {
    if (pallet) {
      let initialRack = "A"
      let initialLevel = "FLOOR"
      let initialCell = "1"
      let initialPos = "1"
      
      if (pallet.locationCode) {
        const match = pallet.locationCode.match(/^([A-C])(\d+)([TMLP])$/)
        if (match) {
          initialRack = match[1]
          const globalNum = parseInt(match[2])
          const levelMap: Record<string, string> = { T: "TOP", M: "MID", L: "BOT", P: "FLOOR" }
          initialLevel = levelMap[match[3]] || "FLOOR"
          initialCell = Math.ceil(globalNum / 2).toString()
          initialPos = (globalNum % 2 === 0 ? 2 : 1).toString()
        }
      }

      setForm({
        productName: (pallet as any).productName || "",
        sku: (pallet as any).sku || "",
        quantity: pallet.quantity?.toString() || "",
        lotNumber: pallet.lotNumber || "",
        expirationDate: pallet.expirationDate ? pallet.expirationDate.split("T")[0] : "",
        palletHeightIn: pallet.palletHeightIn?.toString() || "",
        status: pallet.status || "AVAILABLE",
        notes: pallet.notes || "",
        rack: initialRack,
        level: initialLevel,
        cellNumber: initialCell,
        palletPosition: initialPos,
      })
    }
  }, [pallet])

  const handleSave = async () => {
    if (!pallet?.palletId) return
    setSaving(true)
    try {
      // First, update via PATCH
      const patchRes = await fetch("/api/admin/inventory/warehouse/pallet", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          palletId: pallet.palletId,
          productName: form.productName,
          sku: form.sku,
          quantity: form.quantity,
          status: form.status,
          palletHeightIn: form.palletHeightIn,
          lotNumber: form.lotNumber,
          expirationDate: form.expirationDate || null,
          notes: form.notes,
        }),
      })

      if (!patchRes.ok) {
        const err = await patchRes.json()
        throw new Error(err.error || "Failed to update pallet properties")
      }

      // If location changed, do POST to move
      if (locationCode !== pallet.locationCode && locationCode.length > 2) {
        let newLevel = "FLOOR"
        if (moveLevel === "T") newLevel = "TOP"
        else if (moveLevel === "M") newLevel = "MID"
        else if (moveLevel === "L") newLevel = "BOT"
        
        const posInt = parseInt(movePosition) || 1
        const cn = Math.ceil(posInt / 2)
        const pp = posInt % 2 === 0 ? 2 : 1

        const moveRes = await fetch("/api/admin/inventory/warehouse/pallet", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            palletId: pallet.palletId,
            newLocationCode: locationCode,
            newRack: moveRack,
            newLevel: newLevel,
            newCellNumber: cn,
            newPalletPosition: pp,
          }),
        })
        if (!moveRes.ok) {
          const err = await moveRes.json()
          throw new Error("Failed to move location: " + (err.error || "Unknown error"))
        }
      }

      onSaved()
      onClose()
    } catch (e: any) {
      alert("❌ " + e.message)
    } finally {
      setSaving(false)
    }
  }

  if (!pallet) return null

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md p-0 overflow-hidden bg-white sm:rounded-xl max-h-[90vh]">
        <div className="flex items-center justify-between px-4 h-14 border-b bg-blue-50">
          <button onClick={onClose} className="text-slate-500 text-sm font-medium">Cancel</button>
          <h2 className="font-black text-slate-800 uppercase tracking-wider text-[12px]">
            <Pencil className="inline h-4 w-4 mr-1 -mt-0.5" /> Edit Pallet
          </h2>
          <button onClick={handleSave} disabled={saving} className="text-blue-600 text-sm font-bold">
            {saving ? "..." : "Save"}
          </button>
        </div>
        <div className="overflow-y-auto max-h-[75vh] p-4 space-y-4">
          {/* Move Pallet Section Exact Match */}
          <div className="pt-4 border-t border-dashed border-slate-200 space-y-3">
            <div className="flex items-center gap-2">
              <Move className="h-4 w-4 text-blue-600" />
              <span className="text-[10px] font-black text-blue-700 uppercase tracking-widest">Mover a otra posición</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {/* Step 1: Rack */}
              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">1. Rack</label>
                <select
                  value={moveRack}
                  onChange={(e) => { setMoveRack(e.target.value); setMoveLevel(""); setMovePosition("") }}
                  className="w-full mt-1 px-2 py-2 border rounded-lg text-sm font-bold text-slate-700 bg-white focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none"
                >
                  <option value="">Rack...</option>
                  <option value="A">Rack A</option>
                  <option value="B">Rack B</option>
                  <option value="C">Rack C</option>
                </select>
              </div>

              {/* Step 2: Position */}
              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">2. Posición</label>
                <select
                  value={movePosition}
                  onChange={(e) => { setMovePosition(e.target.value); setMoveLevel("") }}
                  disabled={!moveRack}
                  className="w-full mt-1 px-2 py-2 border rounded-lg text-sm font-bold text-slate-700 bg-white focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none disabled:opacity-40"
                >
                  <option value="">Pos...</option>
                  {moveRack && (() => {
                    const maxPos = (RACKS as any)[moveRack]?.cells * 2 || 16
                    return Array.from({ length: maxPos }, (_, i) => {
                      const num = i + 1
                      const levels = ["T", "M", "L", "P"]
                      const hasFreeLevel = levels.some(lvl => {
                         const loc = `${moveRack}${num}${lvl}`
                         return !occupiedLocationCodes.has(loc)
                      })
                      if (!hasFreeLevel) return null
                      return <option key={num} value={String(num)}>{num}</option>
                    })
                  })()}
                </select>
              </div>

              {/* Step 3: Level */}
              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">3. Nivel</label>
                <select
                  value={moveLevel}
                  onChange={(e) => setMoveLevel(e.target.value)}
                  disabled={!moveRack || !movePosition}
                  className="w-full mt-1 px-2 py-2 border rounded-lg text-sm font-bold text-slate-700 bg-white focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none disabled:opacity-40"
                >
                  <option value="">Nivel...</option>
                  {LEVELS.map((lvl) => {
                    const locCode = `${moveRack}${movePosition}${lvl.key}`
                    if (occupiedLocationCodes.has(locCode)) return null
                    return <option key={lvl.key} value={lvl.key}>{lvl.label}</option>
                  })}
                  {(() => {
                     const locCode = `${moveRack}${movePosition}P`
                     if (occupiedLocationCodes.has(locCode)) return null
                     return <option value="P">PISO (P)</option>
                  })()}
                </select>
              </div>
            </div>

            {moveRack && moveLevel && movePosition && (
              <div className="flex items-center justify-between bg-blue-50 rounded-lg px-3 py-2">
                <span className="text-sm font-black text-blue-800">
                  Destino Seleccionado: {moveRack}{movePosition}{moveLevel}
                </span>
              </div>
            )}
            
            <p className="text-[10px] text-slate-400 italic">Esta posición será movida al guardar. La posición de destino no puede estar ocupada.</p>
          </div>

          <hr className="border-slate-100 my-2" />

          <div className="grid grid-cols-2 gap-3 mt-4">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Product Name</label>
            <Input value={form.productName} onChange={(e) => setForm(f => ({ ...f, productName: e.target.value }))} className="mt-1" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">SKU</label>
              <Input value={form.sku} onChange={(e) => setForm(f => ({ ...f, sku: e.target.value }))} className="mt-1" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Quantity</label>
              <Input type="number" value={form.quantity} onChange={(e) => setForm(f => ({ ...f, quantity: e.target.value }))} className="mt-1" />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Status</label>
            <select value={form.status} onChange={(e) => setForm(f => ({ ...f, status: e.target.value }))} className="w-full border rounded px-2 py-2 text-sm mt-1">
              {STATUS_OPTIONS.map(s => <option key={s} value={s}>{STATUS_LABELS[s] || s}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Height (in)</label>
              <Input type="number" value={form.palletHeightIn} onChange={(e) => setForm(f => ({ ...f, palletHeightIn: e.target.value }))} className="mt-1" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Lot Number</label>
              <Input value={form.lotNumber} onChange={(e) => setForm(f => ({ ...f, lotNumber: e.target.value }))} className="mt-1" />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Expiration Date</label>
            <Input type="date" value={form.expirationDate} onChange={(e) => setForm(f => ({ ...f, expirationDate: e.target.value }))} className="mt-1" />
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Notes</label>
            <textarea value={form.notes} onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))} className="w-full border rounded px-3 py-2 text-sm mt-1 min-h-[60px] resize-none" />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ══════════════════════════════════════════════════
// WAREHOUSE INVENTORY TAB
// ══════════════════════════════════════════════════
function WarehouseInventoryTab() {
  const [products, setProducts] = useState<WarehouseProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [expandedItem, setExpandedItem] = useState<string | null>(null)
  const [showHistory, setShowHistory] = useState(false)
  const [shipmentLogs, setShipmentLogs] = useState<any[]>([])
  const [logsLoading, setLogsLoading] = useState(false)

  // Add product modal
  const [showAddModal, setShowAddModal] = useState(false)
  
  // Edit pallet modal
  const [editPallet, setEditPallet] = useState<(PalletLocation & { productName?: string; sku?: string }) | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)

  // Delete confirmation
  const [confirmDelete, setConfirmDelete] = useState<{ open: boolean; title: string; message: string; onConfirm: () => void }>({
    open: false, title: "", message: "", onConfirm: () => {},
  })

  // Selection for bulk operations
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set())
  const [selectionMode, setSelectionMode] = useState(false)

  const occupiedLocationCodes = useMemo(() => {
    const set = new Set<string>()
    products.forEach(p => p.locations.forEach(loc => {
      set.add(loc.locationCode)
    }))
    return set
  }, [products])

  const fetchWarehouseInventory = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/inventory/warehouse")
      if (res.ok) {
        const data = await res.json()
        setProducts(data)
      }
    } catch (e) {
      console.error("Failed to fetch warehouse inventory:", e)
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchShipmentLogs = useCallback(async () => {
    setLogsLoading(true)
    try {
      const res = await fetch("/api/admin/shipment-logs")
      if (res.ok) {
        const data = await res.json()
        setShipmentLogs(data)
      }
    } catch (e) {
      console.error("Failed to fetch shipment logs:", e)
    } finally {
      setLogsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchWarehouseInventory()
  }, [fetchWarehouseInventory])

  useEffect(() => {
    if (showHistory && shipmentLogs.length === 0) {
      fetchShipmentLogs()
    }
  }, [showHistory, shipmentLogs.length, fetchShipmentLogs])

  const filteredProducts = useMemo(() => {
    if (!searchQuery) return products
    const q = searchQuery.toLowerCase()
    return products.filter(
      (p) =>
        p.productName?.toLowerCase().includes(q) ||
        p.sku?.toLowerCase().includes(q) ||
        p.asin?.toLowerCase().includes(q) ||
        p.upc?.toLowerCase().includes(q) ||
        p.locations.some((loc) => loc.locationCode.toLowerCase().includes(q))
    )
  }, [products, searchQuery])

  const filteredLogs = useMemo(() => {
    if (!searchQuery) return shipmentLogs
    const q = searchQuery.toLowerCase()
    return shipmentLogs.filter(
      (log: any) =>
        log.productName?.toLowerCase().includes(q) ||
        log.sku?.toLowerCase().includes(q) ||
        log.shipmentName?.toLowerCase().includes(q) ||
        log.locationCode?.toLowerCase().includes(q)
    )
  }, [shipmentLogs, searchQuery])

  // Stats
  const totalPallets = products.reduce((a, p) => a + p.palletCount, 0)
  const totalUnits = products.reduce((a, p) => a + p.totalQuantity, 0)

  const formatDate = (iso: string | null) => {
    if (!iso) return "—"
    const d = new Date(iso)
    return `${(d.getMonth() + 1).toString().padStart(2, "0")}/${d.getDate().toString().padStart(2, "0")}/${d.getFullYear()}`
  }

  const formatDateTime = (iso: string | null) => {
    if (!iso) return "—"
    const d = new Date(iso)
    return `${(d.getMonth() + 1).toString().padStart(2, "0")}/${d.getDate().toString().padStart(2, "0")}/${d.getFullYear()} ${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`
  }

  // Delete single pallet
  const deletePallet = async (palletId: string, locationCode: string) => {
    setConfirmDelete({
      open: true,
      title: "¿Eliminar Pallet?",
      message: `¿Estás seguro de que deseas vaciar la posición ${locationCode}? El producto será removido de esta ubicación.`,
      onConfirm: async () => {
        try {
          await fetch("/api/admin/inventory/warehouse", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ palletIds: [palletId] }),
          })
          fetchWarehouseInventory()
        } catch (e) {
          console.error(e)
        }
      },
    })
  }

  // Delete entire product (all pallets)
  const deleteProduct = async (product: WarehouseProduct) => {
    setConfirmDelete({
      open: true,
      title: "¿Eliminar Producto Completo?",
      message: `¿Estás seguro de que deseas eliminar "${product.productName}" de TODAS las ubicaciones (${product.palletCount} pallets)?`,
      onConfirm: async () => {
        try {
          const palletIds = product.locations.map(l => l.palletId)
          await fetch("/api/admin/inventory/warehouse", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ palletIds }),
          })
          fetchWarehouseInventory()
        } catch (e) {
          console.error(e)
        }
      },
    })
  }

  // Delete all warehouse inventory
  const deleteAllWarehouse = () => {
    setConfirmDelete({
      open: true,
      title: "⚠️ Eliminar TODO el Inventario",
      message: `¿Estás seguro de que deseas eliminar TODOS los ${totalPallets} pallets del inventario del almacén? Esta acción NO se puede deshacer.`,
      onConfirm: async () => {
        try {
          await fetch("/api/admin/inventory/warehouse", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({}),
          })
          fetchWarehouseInventory()
        } catch (e) {
          console.error(e)
        }
      },
    })
  }

  // Bulk delete selected
  const deleteSelected = () => {
    if (selectedProducts.size === 0) return
    const selectedNames = products.filter(p => selectedProducts.has(p.id)).map(p => p.productName)
    setConfirmDelete({
      open: true,
      title: `¿Eliminar ${selectedProducts.size} Productos?`,
      message: `¿Eliminar ${selectedNames.join(", ")}? Todos sus pallets serán vaciados.`,
      onConfirm: async () => {
        try {
          const selectedProds = products.filter(p => selectedProducts.has(p.id))
          const allPalletIds = selectedProds.flatMap(p => p.locations.map(l => l.palletId))
          await fetch("/api/admin/inventory/warehouse", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ palletIds: allPalletIds }),
          })
          setSelectedProducts(new Set())
          setSelectionMode(false)
          fetchWarehouseInventory()
        } catch (e) {
          console.error(e)
        }
      },
    })
  }

  // Delete shipment history log
  const deleteShipmentLog = async (log: any) => {
    setConfirmDelete({
      open: true,
      title: "Delete Shipment Log",
      message: `Are you sure you want to delete this log for "${log.productName}"?`,
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/admin/shipment-logs/${log.id}`, {
            method: "DELETE",
          })
          if (res.ok) {
            setShipmentLogs(prev => prev.filter(l => l.id !== log.id))
          }
        } catch (e) {
          console.error(e)
        }
      },
    })
  }

  // Open edit modal for a specific pallet
  const openEditPallet = (loc: PalletLocation, product: WarehouseProduct) => {
    setEditPallet({
      ...loc,
      productName: product.productName,
      sku: product.sku || "",
    })
    setShowEditModal(true)
  }

  const toggleSelection = (id: string) => {
    setSelectedProducts(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <>
      {/* Search + Stats + Actions */}
      <div className="relative z-10 px-3 pb-3 pt-1 border-t border-slate-100 bg-white">
        <div className="flex items-center justify-between mb-2 px-1">
          <div className="flex items-center space-x-4 text-sm text-slate-600">
            <div className="font-semibold text-slate-800">
              <span className="text-slate-500 font-normal mr-1">Products:</span> {products.length}
            </div>
            <div className="font-semibold text-emerald-600">
              <span className="text-slate-500 font-normal mr-1">Total Pallets:</span> {totalPallets}
            </div>
            <div className="font-semibold text-blue-600">
              <span className="text-slate-500 font-normal mr-1">Total Units:</span> {totalUnits.toLocaleString()}
            </div>
          </div>
          <div className="flex items-center gap-1">
            {selectionMode && selectedProducts.size > 0 && (
              <Button variant="ghost" size="sm" onClick={deleteSelected} className="text-red-500 hover:bg-red-50 text-[10px] h-7 px-2 font-bold">
                <Trash2 className="h-3 w-3 mr-1" /> Delete ({selectedProducts.size})
              </Button>
            )}
            <Button 
              variant="ghost" size="sm" 
              onClick={() => { setSelectionMode(!selectionMode); setSelectedProducts(new Set()) }} 
              className={`text-[10px] h-7 px-2 font-bold ${selectionMode ? "text-blue-600 bg-blue-50" : "text-slate-400"}`}
            >
              <Check className="h-3 w-3 mr-1" /> Select
            </Button>
          </div>
        </div>

        <div className="flex gap-2">
          <div className="relative flex-1 flex items-center bg-white border border-slate-300 rounded-lg focus-within:ring-2 focus-within:ring-emerald-500 shadow-sm">
            <div className="pl-3 py-2 text-slate-400"><Search className="h-5 w-5" /></div>
            <input
              type="text"
              placeholder="Search product, SKU, or location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent border-none focus:outline-none px-3 py-2.5 text-sm"
            />
          </div>
          <Button variant="outline" className="px-3 shrink-0 text-emerald-600 border-emerald-200 hover:bg-emerald-50" onClick={() => setShowAddModal(true)}>
            <Plus className="h-4 w-4" />
          </Button>
          <Button variant="outline" className="px-3 shrink-0" onClick={fetchWarehouseInventory}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          {products.length > 0 && (
            <Button variant="outline" className="px-3 shrink-0 text-red-500 border-red-200 hover:bg-red-50" onClick={deleteAllWarehouse}>
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Sub-tabs: Current / History */}
        <div className="flex mt-3 bg-slate-100 rounded-lg p-0.5 gap-0.5">
          <button
            onClick={() => setShowHistory(false)}
            className={`flex-1 py-2 rounded-md text-[11px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
              !showHistory ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600"
            }`}
          >
            <Package className="h-3.5 w-3.5" />
            Current Stock
          </button>
          <button
            onClick={() => setShowHistory(true)}
            className={`flex-1 py-2 rounded-md text-[11px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
              showHistory ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600"
            }`}
          >
            <ChevronRight className="h-3.5 w-3.5" />
            Shipment History
          </button>
        </div>
      </div>

      {/* ── CURRENT STOCK VIEW ── */}
      {!showHistory && (
        <div className="bg-white">
          {loading ? (
            <div className="py-12 flex justify-center items-center flex-col text-slate-500">
              <RefreshCw className="h-8 w-8 animate-spin mb-4" /> Loading warehouse inventory...
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="py-12 text-center text-slate-500">
              {products.length === 0 ? (
                <div className="space-y-3">
                  <Package className="h-12 w-12 mx-auto text-slate-200" />
                  <p>No products in warehouse.</p>
                  <Button variant="outline" onClick={() => setShowAddModal(true)} className="text-emerald-600 border-emerald-200">
                    <Plus className="h-4 w-4 mr-2" /> Add Your First Product
                  </Button>
                </div>
              ) : "No items match your search."}
            </div>
          ) : (
            <div className="flex flex-col">
              {filteredProducts.map((product) => {
                const isExpanded = expandedItem === product.id
                const isSelected = selectedProducts.has(product.id)
                return (
                  <div key={product.id} className={`border-b border-slate-200 bg-white ${isSelected ? "ring-2 ring-blue-300 ring-inset" : ""}`}>
                    {/* Collapsed Row */}
                    <div
                      className="p-4 cursor-pointer hover:bg-slate-50 flex flex-col"
                      onClick={() => {
                        if (selectionMode) {
                          toggleSelection(product.id)
                        } else {
                          setExpandedItem(isExpanded ? null : product.id)
                        }
                      }}
                    >
                      <div className="flex items-start gap-3">
                        {selectionMode && (
                          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 mt-1 transition-all ${isSelected ? "bg-blue-600 border-blue-600" : "border-slate-300"}`}>
                            {isSelected && <Check className="h-3 w-3 text-white" />}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-[14px] text-slate-900 leading-snug line-clamp-2 mb-3 pr-4">
                            {product.amazonTitle || product.productName}
                          </h3>
                          <div className="flex items-start justify-between">
                            <div className="flex gap-4 flex-1">
                              <div className="w-[72px] h-[72px] bg-white border border-slate-200 rounded shrink-0 flex items-center justify-center overflow-hidden">
                                {product.imageUrl ? (
                                  <img src={product.imageUrl} alt="" className="max-w-full max-h-full object-contain p-1" />
                                ) : (
                                  <Package className="h-6 w-6 text-slate-200" />
                                )}
                              </div>
                              <div className="flex flex-col text-[13px] text-slate-600 gap-[2px] leading-tight">
                                <div>
                                  Quantity: <span className="font-bold text-slate-900">{product.totalQuantity.toLocaleString()}</span>
                                </div>
                                <div>
                                  Pallets: <span className="font-bold text-blue-600">{product.palletCount}</span>
                                </div>
                                {product.sku && (
                                  <div className="group flex items-center gap-1.5 w-max">
                                    <span>SKU: {product.sku}</span>
                                    <button
                                      onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(product.sku || "") }}
                                      className="opacity-0 group-hover:opacity-100 p-0.5 text-blue-500 bg-blue-50 hover:bg-blue-100 rounded transition-all active:scale-95"
                                      title="Copy"
                                    >
                                      <Copy className="h-3 w-3" />
                                    </button>
                                  </div>
                                )}
                                {product.asin && (
                                  <div className="group flex items-center gap-1.5 w-max">
                                    <span>ASIN: {product.asin}</span>
                                    <button
                                      onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(product.asin || "") }}
                                      className="opacity-0 group-hover:opacity-100 p-0.5 text-blue-500 bg-blue-50 hover:bg-blue-100 rounded transition-all active:scale-95"
                                      title="Copy"
                                    >
                                      <Copy className="h-3 w-3" />
                                    </button>
                                  </div>
                                )}
                                {/* Location summary */}
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {product.locations.slice(0, 4).map((loc) => (
                                    <span
                                      key={loc.locationCode}
                                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${STATUS_COLORS[loc.status] || "bg-slate-100 text-slate-600"}`}
                                    >
                                      <MapPin className="inline h-2.5 w-2.5 mr-0.5 -mt-[1px]" />
                                      {loc.locationCode}
                                    </span>
                                  ))}
                                  {product.locations.length > 4 && (
                                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">
                                      +{product.locations.length - 4} more
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 self-center">
                              {!selectionMode && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); deleteProduct(product) }}
                                  className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                  title="Delete product"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              )}
                              <ChevronRight className={`h-5 w-5 text-slate-400 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Expanded Details */}
                    {isExpanded && (
                      <div className="bg-slate-50 border-t p-4 space-y-3 animate-in slide-in-from-top-2">
                        {/* Identifiers */}
                        <div className="grid grid-cols-2 gap-2 text-[12px]">
                          {product.upc && (
                            <div className="group flex items-center gap-1.5">
                              <span className="font-bold text-slate-500">UPC:</span> {product.upc}
                              <button
                                onClick={() => navigator.clipboard.writeText(product.upc || "")}
                                className="opacity-0 group-hover:opacity-100 p-0.5 text-blue-500 bg-blue-50 hover:bg-blue-100 rounded transition-all"
                              >
                                <Copy className="h-3 w-3" />
                              </button>
                            </div>
                          )}
                          {product.fnsku && (
                            <div className="group flex items-center gap-1.5">
                              <span className="font-bold text-slate-500">FNSKU:</span> {product.fnsku}
                              <button
                                onClick={() => navigator.clipboard.writeText(product.fnsku || "")}
                                className="opacity-0 group-hover:opacity-100 p-0.5 text-blue-500 bg-blue-50 hover:bg-blue-100 rounded transition-all"
                              >
                                <Copy className="h-3 w-3" />
                              </button>
                            </div>
                          )}
                        </div>

                        {product.earliestExpiration && (
                          <div className="text-[12px]">
                            <span className="font-bold text-slate-500">Earliest Exp:</span>{" "}
                            <span className="font-bold text-orange-600">{formatDate(product.earliestExpiration)}</span>
                          </div>
                        )}

                        {/* Pallet Details Table */}
                        <div className="rounded-lg border border-slate-200 overflow-hidden bg-white">
                          <div className="bg-slate-100 px-3 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <MapPin className="h-3.5 w-3.5" /> Pallet Locations ({product.palletCount})
                            </div>
                            <span className="text-[9px] text-slate-400">Tap to edit</span>
                          </div>
                          <div className="divide-y divide-slate-100">
                            {product.locations.map((loc) => (
                              <div
                                key={loc.locationCode}
                                className="px-3 py-2.5 flex items-center justify-between text-[12px] hover:bg-blue-50 cursor-pointer transition-colors group"
                                onClick={() => openEditPallet(loc, product)}
                              >
                                <div className="flex items-center gap-3">
                                  <span
                                    className={`text-[11px] font-black px-2 py-1 rounded ${STATUS_COLORS[loc.status] || "bg-slate-100 text-slate-600"}`}
                                  >
                                    {loc.locationCode}
                                  </span>
                                  <div className="flex flex-col gap-0.5">
                                    <span className="text-slate-700 font-medium">
                                      QTY: <span className="font-bold text-slate-900">{loc.quantity || 0}</span>
                                    </span>
                                    <span className="text-[10px] text-slate-400">
                                      {STATUS_LABELS[loc.status] || loc.status}
                                      {loc.expirationDate && ` • Exp: ${formatDate(loc.expirationDate)}`}
                                      {loc.lotNumber && ` • Lot: ${loc.lotNumber}`}
                                    </span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={(e) => { e.stopPropagation(); openEditPallet(loc, product) }}
                                    className="p-1 text-slate-300 group-hover:text-blue-500 transition-colors"
                                    title="Edit pallet"
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); deletePallet(loc.palletId, loc.locationCode) }}
                                    className="p-1 text-slate-300 group-hover:text-red-500 transition-colors"
                                    title="Remove from location"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(loc.locationCode) }}
                                    className="p-1 text-slate-300 hover:text-blue-500 transition-colors"
                                    title="Copy location"
                                  >
                                    <Copy className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── SHIPMENT HISTORY VIEW ── */}
      {showHistory && (
        <div className="bg-white">
          {logsLoading ? (
            <div className="py-12 flex justify-center items-center flex-col text-slate-500">
              <RefreshCw className="h-8 w-8 animate-spin mb-4" /> Loading shipment history...
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="py-12 text-center text-slate-500">
              {shipmentLogs.length === 0
                ? "No shipment history yet. History is created when you mark an FBA shipment as shipped."
                : "No logs match your search."}
            </div>
          ) : (
            <div className="flex flex-col">
              {filteredLogs.map((log: any) => (
                <div key={log.id} className="border-b border-slate-200 bg-white p-4">
                  <div className="flex items-start gap-3">
                    {/* Icon */}
                    <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center shrink-0 mt-0.5">
                      <Package className="h-5 w-5 text-blue-600" />
                    </div>
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <h4 className="text-[13px] font-bold text-slate-900 line-clamp-2 leading-snug">
                        {log.productName}
                      </h4>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-[11px] text-slate-500">
                        <span className="font-bold text-blue-600">
                          {log.totalUnits.toLocaleString()} units
                        </span>
                        {log.totalBoxes && (
                          <span>{log.totalBoxes} boxes</span>
                        )}
                        {log.sku && (
                          <span className="group flex items-center gap-1">
                            SKU: {log.sku}
                            <button
                              onClick={() => navigator.clipboard.writeText(log.sku)}
                              className="opacity-0 group-hover:opacity-100 p-0.5 text-blue-500 bg-blue-50 hover:bg-blue-100 rounded transition-all"
                            >
                              <Copy className="h-2.5 w-2.5" />
                            </button>
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-[11px] text-slate-400">
                        {log.locationCode && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            From: <span className="font-bold text-slate-600">{log.locationCode}</span>
                          </span>
                        )}
                        <span>→</span>
                        <span className="font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded text-[10px]">
                          {log.shipmentName}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1.5">
                        {formatDateTime(log.shippedAt)}
                      </div>
                    </div>
                    {/* Action badge & Delete */}
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded ${
                        log.action === "SHIPPED" ? "bg-blue-100 text-blue-700" : "bg-orange-100 text-orange-700"
                      }`}>
                        {log.action === "SHIPPED" ? "Enviado" : log.action}
                      </span>
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteShipmentLog(log) }}
                        className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                        title="Delete log"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      <AddProductModal open={showAddModal} onClose={() => setShowAddModal(false)} onAdded={fetchWarehouseInventory} />
      <EditPalletModal 
        open={showEditModal} 
        onClose={() => { setShowEditModal(false); setEditPallet(null) }} 
        pallet={editPallet} 
        occupiedLocationCodes={occupiedLocationCodes}
        onSaved={fetchWarehouseInventory} 
      />
      <ConfirmModal 
        open={confirmDelete.open} 
        onClose={() => setConfirmDelete(d => ({ ...d, open: false }))} 
        onConfirm={confirmDelete.onConfirm} 
        title={confirmDelete.title} 
        message={confirmDelete.message} 
      />
    </>
  )
}

// ══════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════
export default function InventoryPage() {
  const [activeTab, setActiveTab] = useState<"amazon" | "warehouse">("amazon")
  const [items, setItems] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")

  // Scan & Expand State
  const [expandedItem, setExpandedItem] = useState<string | null>(null)
  const [scannerInput, setScannerInput] = useState("")
  const [isScanning, setIsScanning] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  
  // File upload state for manual image
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploadingId, setUploadingId] = useState<string | null>(null)
  
  const scannerRef = useRef<HTMLInputElement>(null)

  // Delete/confirm state
  const [confirmDelete, setConfirmDelete] = useState<{ open: boolean; title: string; message: string; onConfirm: () => void }>({
    open: false, title: "", message: "", onConfirm: () => {},
  })

  const fetchItems = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/inventory")
      if (res.ok) {
        const data = await res.json()
        setItems(data)
        return data
      }
    } catch (e) {
      console.error("Fetch failed:", e)
    } finally {
      setLoading(false)
    }
    return []
  }, [])

  // ── Fetch ──
  const syncInventory = useCallback(async (showAlert = true) => {
    setIsSyncing(true)
    try {
      const res = await fetch("/api/admin/inventory/sync", { method: "POST" })
      const data = await res.json()
      
      if (res.ok && data.success !== false) {
        await fetchItems()
        if (showAlert) alert(`✅ Sync response:\nCreated: ${data.created || 0}\nUpdated: ${data.updated || 0}\nMessage: ${data.message || "Done"}`)
      } else {
        if (showAlert) alert("❌ Amazon API Error:\n" + (data.error || "Unknown") + "\nDetails: " + (data.details || ""))
      }
    } catch (e) {
      console.error("Auto-sync failed:", e)
      if (showAlert) alert("❌ Sync request failed to connect to API.")
    } finally {
      setIsSyncing(false)
    }
  }, [fetchItems])

  const wipeInventory = useCallback(async () => {
    setConfirmDelete({
      open: true,
      title: "⚠️ Delete ALL Amazon Inventory",
      message: "Are you sure you want to DELETE ALL inventory items? This cannot be undone.",
      onConfirm: async () => {
        setIsSyncing(true)
        try {
          const res = await fetch("/api/admin/inventory/wipe", { method: "DELETE" })
          const data = await res.json().catch(() => ({}))
          
          if (res.ok) {
            await fetchItems()
            alert("🗑️ All inventory has been deleted.")
          } else {
            alert("❌ Failed to wipe inventory: " + (data.error || "Unknown server error"))
          }
        } catch (e: any) {
          console.error(e)
          alert("❌ Wipe request failed: " + e.message)
        } finally {
          setIsSyncing(false)
        }
      },
    })
  }, [fetchItems])

  // Delete single Amazon inventory item
  const deleteItem = useCallback(async (item: InventoryItem) => {
    setConfirmDelete({
      open: true,
      title: "Delete Item",
      message: `Are you sure you want to delete "${item.name}"?`,
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/admin/inventory/${item.id}`, { method: "DELETE" })
          if (res.ok) {
            setItems(prev => prev.filter(i => i.id !== item.id))
          } else {
            alert("❌ Failed to delete item")
          }
        } catch (e) {
          console.error(e)
          alert("❌ Error deleting item")
        }
      },
    })
  }, [])

  useEffect(() => {
    fetchItems().then((fetchedItems: InventoryItem[]) => {
      // Auto-sync protection logic (every 24 hours max) to prevent Amazon API blocks
      if (fetchedItems && fetchedItems.length > 0) {
        const latestSync = fetchedItems.reduce((latest, item) => {
          if (!item.lastSyncedAt) return latest
          const current = new Date(item.lastSyncedAt).getTime()
          return current > latest ? current : latest
        }, 0)

        // 24 hours in milliseconds
        const twentyFourHoursAgo = Date.now() - 86400000
        
        if (latestSync === 0 || latestSync < twentyFourHoursAgo) {
          syncInventory(false) // Auto-sync in background
        }
      } else {
        // If DB is empty, sync immediately
        syncInventory(false)
      }
    })
  }, [fetchItems, syncInventory])

  // ── Scanner Lookup ──
  const handleScanSubmit = async (codeOverride?: string) => {
    const code = (codeOverride || searchQuery || scannerInput).trim()
    if (!code) return

    setIsScanning(true)
    try {
      const res = await fetch(`/api/admin/inventory/lookup?code=${encodeURIComponent(code)}`)
      const data = await res.json()

      if (data.found && data.item) {
        // Scroll to and expand the requested item
        setSearchQuery("") // Clear search to ensure visible
        setExpandedItem(data.item.id)
        setTimeout(() => {
          document.getElementById(`item-${data.item.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }, 100)
      } else {
        alert(`No item found for barcode: ${code}`)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setIsScanning(false)
      setScannerInput("")
    }
  }

  // ── Item Actions ──
  const updateItem = async (id: string, field: string, value: any) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, [field]: value } : i)))
    try {
      await fetch(`/api/admin/inventory/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      })
    } catch (e) {
      console.error(e)
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !expandedItem) return
    setUploadingId(expandedItem)
    const renderUpload = async (imgData: string) => {
      await updateItem(expandedItem, "imageUrl", imgData)
      setUploadingId(null)
    }
    
    try {
      const compressed = await compressImage(file, 800, 0.8)
      const reader = new FileReader()
      reader.onloadend = () => renderUpload(reader.result as string)
      reader.readAsDataURL(compressed)
    } catch {
      const reader = new FileReader()
      reader.onloadend = () => renderUpload(reader.result as string)
      reader.readAsDataURL(file)
    }
    e.target.value = ""
  }

  // ── Rendering States ──
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false)
  const [sortBy, setSortBy] = useState<"NAME_ASC" | "NAME_DESC" | "CREATED_DESC" | "CREATED_ASC" | "STOCK_DESC" | "STOCK_ASC" | "DEFAULT">("DEFAULT")
  const [statusFilter, setStatusFilter] = useState("ALL")
  const [fulfillmentFilter, setFulfillmentFilter] = useState("ALL")
  const [pushOutofStockToBottom, setPushOutofStockToBottom] = useState(true)

  // ── Processing (Search, Filter, Sort) ──
  const processedItems = useMemo(() => {
    return [...items]
      .filter((item) => {
        // 1. Text Search
        if (searchQuery) {
          const q = searchQuery.toLowerCase()
          const matches = 
            item.name?.toLowerCase().includes(q) ||
            item.sku?.toLowerCase().includes(q) ||
            item.asin?.toLowerCase().includes(q) ||
            item.upc?.toLowerCase().includes(q)
          if (!matches) return false
        }

        // 2. Status Filter
        if (statusFilter !== "ALL") {
          if (statusFilter === "ACTIVE" && !item.isActive) return false
          if (statusFilter === "INACTIVE" && item.isActive) return false
          if (statusFilter === "OUT_OF_STOCK") {
            const s = (item.quantityOnHand || 0) + (item.quantityReserved || 0)
            if (s > 0) return false
          }
          if (statusFilter === "INCOMPLETE") {
            const amzStatus = (item as any).amazonStatus?.toLowerCase() || ""
            if (!amzStatus.includes("incomplete")) return false
          }
        }

        // 3. Fulfillment Filter
        if (fulfillmentFilter !== "ALL") {
          const channel = (item as any).fulfillmentChannel?.toUpperCase() || ""
          if (fulfillmentFilter === "AMAZON" && !channel.includes("AMAZON")) return false
          if (fulfillmentFilter === "MERCHANT" && !channel.includes("MERCHANT")) return false
        }

        return true
      })
      .sort((a, b) => {
        if (pushOutofStockToBottom) {
          const aTotal = (a.quantityOnHand || 0) + (a.quantityReserved || 0)
          const bTotal = (b.quantityOnHand || 0) + (b.quantityReserved || 0)
          if (aTotal > 0 && bTotal === 0) return -1
          if (aTotal === 0 && bTotal > 0) return 1
        }

        switch (sortBy) {
          case "NAME_ASC": return a.name.localeCompare(b.name)
          case "NAME_DESC": return b.name.localeCompare(a.name)
          case "STOCK_DESC": return (b.quantityOnHand + (b.quantityReserved||0)) - (a.quantityOnHand + (a.quantityReserved||0))
          case "STOCK_ASC": return (a.quantityOnHand + (a.quantityReserved||0)) - (b.quantityOnHand + (b.quantityReserved||0))
          case "CREATED_DESC": return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
          case "CREATED_ASC": return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime()
          default: return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
        }
      })
  }, [items, searchQuery, statusFilter, fulfillmentFilter, pushOutofStockToBottom, sortBy])

  // ── Counts for Filters ──
  const filterCounts = useMemo(() => {
    return {
      all: items.length,
      active: items.filter(i => i.isActive).length,
      inactive: items.filter(i => (i.source === 'AMAZON' && !i.isActive)).length,
      outOfStock: items.filter(i => (i.quantityOnHand + (i.quantityReserved || 0)) === 0).length,
      amazon: items.filter(i => ((i as any).fulfillmentChannel || '').toUpperCase().includes('AMAZON')).length,
      merchant: items.filter(i => ((i as any).fulfillmentChannel || '').toUpperCase().includes('MERCHANT')).length,
    }
  }, [items])

  return (
    <div className="min-h-screen bg-slate-50 font-sans sm:pb-20 -mt-4 md:-mt-8 -mx-4 md:-mx-8">
      
      {/* HEADER - Sticky and Opaque */}
      <div className="sticky -top-4 md:-top-8 pt-4 md:pt-8 z-40 bg-white border-b border-slate-200 shadow-md relative isolate">
        <div className="flex items-center justify-between px-2 h-14 bg-white">
          <Button variant="ghost" size="icon" className="text-slate-600 hover:bg-slate-100">
            <ChevronLeft className="h-6 w-6" />
          </Button>
          <h1 className="text-lg font-bold text-slate-800 absolute left-1/2 -translate-x-1/2">
            Manage Inventory
          </h1>
          <div className="flex items-center space-x-1">
            {activeTab === "amazon" && (
              <>
                <Button variant="ghost" size="icon" onClick={() => wipeInventory()} disabled={isSyncing} className="text-red-500 hover:bg-red-50" title="Wipe All">
                   <Trash2 className="h-5 w-5" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => syncInventory(true)} disabled={isSyncing} className="text-slate-500 hover:bg-slate-100">
                  <RefreshCw className={`h-5 w-5 ${isSyncing ? "animate-spin text-blue-600" : ""}`} />
                </Button>
              </>
            )}
          </div>
        </div>

        {/* ── TAB TOGGLE ── */}
        <div className="px-3 pt-1 pb-2 bg-white">
          <div className="flex bg-slate-100 rounded-xl p-1 gap-1">
            <button
              onClick={() => setActiveTab("amazon")}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-[12px] font-bold uppercase tracking-wider transition-all ${
                activeTab === "amazon"
                  ? "bg-white text-slate-900 shadow-md"
                  : "text-slate-400 hover:text-slate-600"
              }`}
            >
              <Package className="h-4 w-4" />
              Amazon Inventory
            </button>
            <button
              onClick={() => setActiveTab("warehouse")}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-[12px] font-bold uppercase tracking-wider transition-all ${
                activeTab === "warehouse"
                  ? "bg-white text-slate-900 shadow-md"
                  : "text-slate-400 hover:text-slate-600"
              }`}
            >
              <Warehouse className="h-4 w-4" />
              Warehouse Inventory
            </button>
          </div>
        </div>

        {/* Amazon Search Bar — only for Amazon tab */}
        {activeTab === "amazon" && (
          <div className="relative z-10 px-3 pb-3 pt-1 border-t border-slate-100 bg-white">
            <div className="flex items-center space-x-4 mb-2 px-1 text-sm text-slate-600">
              <div className="font-semibold text-slate-800">
                <span className="text-slate-500 font-normal mr-1">Total Listings:</span> {items.length}
              </div>
              <div className="font-semibold text-blue-600">
                <span className="text-slate-500 font-normal mr-1">Total Items:</span>
                {items.reduce((acc, curr) => acc + (curr.quantityOnHand || 0) + (curr.quantityReserved || 0), 0).toLocaleString()}
              </div>
            </div>

            <div className="flex gap-2">
              <div className="relative flex-1 flex items-center bg-white border border-slate-300 rounded-lg focus-within:ring-2 focus-within:ring-blue-500 shadow-sm">
                <div className="pl-3 py-2 text-slate-400"><Search className="h-5 w-5" /></div>
                <input
                  type="text"
                  placeholder="Search or scan..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-transparent border-none focus:outline-none px-3 py-2.5 text-sm"
                />
                <Button variant="ghost" size="icon" onClick={() => setIsScanning(true)} className="h-full rounded-none px-3 text-slate-400">
                  <ScanLine className="h-5 w-5" />
                </Button>
              </div>
              <Button variant="outline" className="px-3 shrink-0" onClick={() => setIsFilterModalOpen(true)}>
                <ArrowUpDown className="h-4 w-4 mr-2" /> Sort
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* ── WAREHOUSE TAB CONTENT ── */}
      {activeTab === "warehouse" && <WarehouseInventoryTab />}

      {/* ── AMAZON TAB CONTENT ── */}
      {activeTab === "amazon" && (
        <>
          {/* FILTER DIALOG */}
          <Dialog open={isFilterModalOpen} onOpenChange={setIsFilterModalOpen}>
            <DialogContent className="max-w-md p-0 overflow-hidden bg-white sm:rounded-xl">
              <div className="flex items-center justify-between px-4 h-14 border-b">
                 <button onClick={() => setIsFilterModalOpen(false)} className="text-blue-600 text-sm font-medium">Cancel</button>
                 <h2 className="font-bold text-slate-800">Filter</h2>
                 <button onClick={() => setIsFilterModalOpen(false)} className="text-blue-600 text-sm font-bold">Apply</button>
              </div>
              <div className="max-h-[80vh] overflow-y-auto">
                <div className="px-4 py-2 bg-slate-50 text-[11px] font-bold text-slate-500 uppercase border-b">Status</div>
                {[
                  { id: "ALL", label: "All", count: filterCounts.all },
                  { id: "ACTIVE", label: "Active", count: filterCounts.active },
                  { id: "INACTIVE", label: "Inactive", count: filterCounts.inactive },
                  { id: "OUT_OF_STOCK", label: "Out of stock", count: filterCounts.outOfStock },
                  { id: "INCOMPLETE", label: "Incomplete", count: 0 },
                ].map((opt) => (
                  <button key={opt.id} onClick={() => setStatusFilter(opt.id)} className="w-full flex items-center justify-between px-4 py-3.5 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <span className={`text-[15px] ${statusFilter === opt.id ? "font-bold text-slate-900" : "text-slate-700"}`}>{opt.label}</span>
                      <span className="text-[12px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full">{opt.count}</span>
                    </div>
                    {statusFilter === opt.id && <Check className="h-4 w-4 text-orange-500" />}
                  </button>
                ))}
                <div className="px-4 py-2 bg-slate-50 text-[11px] font-bold text-slate-500 uppercase border-b mt-2">Fulfilled By</div>
                {[
                  { id: "ALL", label: "All", count: filterCounts.all },
                  { id: "AMAZON", label: "Amazon", count: filterCounts.amazon },
                  { id: "MERCHANT", label: "Merchant", count: filterCounts.merchant },
                ].map((opt) => (
                  <button key={opt.id} onClick={() => setFulfillmentFilter(opt.id)} className="w-full flex items-center justify-between px-4 py-3.5 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <span className={`text-[15px] ${fulfillmentFilter === opt.id ? "font-bold text-slate-900" : "text-slate-700"}`}>{opt.label}</span>
                      <span className="text-[12px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full">{opt.count}</span>
                    </div>
                    {fulfillmentFilter === opt.id && <Check className="h-4 w-4 text-orange-500" />}
                  </button>
                ))}
                <div className="px-4 py-2 bg-slate-50 text-[11px] font-bold text-slate-500 uppercase border-b mt-2">Sort Options</div>
                <div className="p-4">
                  <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)} className="w-full border-slate-300 rounded-lg text-sm p-3 bg-white border outline-none shadow-sm h-12">
                    <option value="DEFAULT">Default (Newest First)</option>
                    <option value="NAME_ASC">Name (A-Z)</option>
                    <option value="NAME_DESC">Name (Z-A)</option>
                    <option value="STOCK_DESC">Stock (High to Low)</option>
                    <option value="STOCK_ASC">Stock (Low to High)</option>
                    <option value="CREATED_DESC">Creation (Newest First)</option>
                    <option value="CREATED_ASC">Creation (Oldest First)</option>
                  </select>
                  <div className="mt-4">
                    <label className="flex items-center justify-between group cursor-pointer">
                      <span className="text-sm text-slate-700">Push "Out of Stock" to Bottom</span>
                      <input type="checkbox" checked={pushOutofStockToBottom} onChange={(e) => setPushOutofStockToBottom(e.target.checked)} className="h-5 w-5 rounded border-slate-300 text-blue-600" />
                    </label>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* LIST CONTAINER */}
          <div className="bg-white">
            {loading ? (
              <div className="py-12 flex justify-center items-center flex-col text-slate-500">
                <RefreshCw className="h-8 w-8 animate-spin mb-4" /> Loading inventory...
              </div>
            ) : processedItems.length === 0 ? (
              <div className="py-12 text-center text-slate-500">No items found.</div>
            ) : (
              <div className="flex flex-col">
                {processedItems.map((item) => {
                  const isExpanded = expandedItem === item.id
                  const img = getItemImage(item)
                  const showInactiveBadge = !item.isActive || item.quantityOnHand <= 0
                  return (
                    <div key={item.id} id={`item-` + item.id} className="border-b border-slate-200 bg-white">
                      <div className="p-4 cursor-pointer hover:bg-slate-50 flex flex-col" onClick={() => setExpandedItem(isExpanded ? null : item.id)}>
                        {showInactiveBadge && (
                          <div className="mb-2">
                            <span className="bg-orange-500 text-white text-[11px] font-bold px-2 py-0.5 rounded uppercase tracking-wide">
                              {!item.isActive ? "Inactive" : "Out of Stock"}
                            </span>
                          </div>
                        )}
                        <h3 
                          className="font-bold text-[14px] text-slate-900 leading-snug line-clamp-2 mb-3 pr-4 hover:text-blue-600 transition-colors cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation()
                            if (item.asin) {
                              window.open(`https://www.amazon.com/dp/${item.asin}`, '_blank')
                            } else {
                              window.open(`https://www.amazon.com/s?k=${encodeURIComponent(item.name || "")}`, '_blank')
                            }
                          }}
                          title="View on Amazon"
                        >
                          {item.name}
                        </h3>
                        <div className="flex items-start justify-between">
                          <div className="flex gap-4 flex-1">
                            <div className="w-[72px] h-[72px] bg-white border border-slate-200 rounded shrink-0 flex items-center justify-center overflow-hidden">
                              {img ? <img src={img} alt="" className="max-w-full max-h-full object-contain p-1" /> : <ImageIcon className="h-6 w-6 text-slate-200" />}
                            </div>
                            <div className="flex flex-col text-[13px] text-slate-600 gap-[2px] leading-tight">
                              <div>Available: <span className="font-bold text-slate-900">{item.quantityOnHand}</span></div>
                              {item.sku && <div className="group flex items-center gap-1.5 w-max"><span>SKU: {item.sku}</span><button onClick={(e)=>{e.stopPropagation();navigator.clipboard.writeText(item.sku||"");}} className="opacity-0 group-hover:opacity-100 p-0.5 text-blue-500 bg-blue-50 hover:bg-blue-100 rounded transition-all active:scale-95" title="Copy"><Copy className="h-3 w-3" /></button></div>}
                              {item.asin && <div className="group flex items-center gap-1.5 w-max"><span>ASIN: {item.asin}</span><button onClick={(e)=>{e.stopPropagation();navigator.clipboard.writeText(item.asin||"");}} className="opacity-0 group-hover:opacity-100 p-0.5 text-blue-500 bg-blue-50 hover:bg-blue-100 rounded transition-all active:scale-95" title="Copy"><Copy className="h-3 w-3" /></button></div>}
                              {item.upc && <div className="group flex items-center gap-1.5 w-max"><span>UPC: {item.upc}</span><button onClick={(e)=>{e.stopPropagation();navigator.clipboard.writeText(item.upc||"");}} className="opacity-0 group-hover:opacity-100 p-0.5 text-blue-500 bg-blue-50 hover:bg-blue-100 rounded transition-all active:scale-95" title="Copy"><Copy className="h-3 w-3" /></button></div>}
                              {item.fnsku && <div className="group flex items-center gap-1.5 w-max"><span>FNSKU: {item.fnsku}</span><button onClick={(e)=>{e.stopPropagation();navigator.clipboard.writeText(item.fnsku||"");}} className="opacity-0 group-hover:opacity-100 p-0.5 text-blue-500 bg-blue-50 hover:bg-blue-100 rounded transition-all active:scale-95" title="Copy"><Copy className="h-3 w-3" /></button></div>}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 self-center">
                            <button
                              onClick={(e) => { e.stopPropagation(); deleteItem(item) }}
                              className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                              title="Delete item"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                            <ChevronRight className={`h-5 w-5 text-slate-400 self-center transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                          </div>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="bg-slate-50 border-t p-4 space-y-4 animate-in slide-in-from-top-2">
                          <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
                            <Button variant="outline" size="sm" className="text-xs h-8" onClick={() => updateItem(item.id, "isActive", !item.isActive)}>
                              {item.isActive ? "Deactivate" : "Activate"}
                            </Button>
                            <Button variant="outline" size="sm" className="text-xs h-8" onClick={() => {
                              const val = prompt("New quantity:", String(item.quantityOnHand))
                              if (val !== null) updateItem(item.id, "quantityOnHand", parseInt(val) || 0)
                            }}> <Zap className="h-3 w-3 mr-1" /> Qty </Button>
                            <Button variant="outline" size="sm" className="text-xs h-8 ml-auto" onClick={() => fileInputRef.current?.click()}>
                              {uploadingId === item.id ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Camera className="h-3 w-3" />}
                            </Button>
                          </div>
                          <div className="grid grid-cols-2 gap-3 text-[12px]">
                            <div><label className="font-bold text-slate-500 uppercase text-[10px]">UPC</label><Input className="h-8 text-[13px]" value={item.upc||""} onChange={(e)=>updateItem(item.id, "upc", e.target.value)} /></div>
                            <div><label className="font-bold text-slate-500 uppercase text-[10px]">FNSKU</label><Input className="h-8 text-[13px]" value={item.fnsku||""} onChange={(e)=>updateItem(item.id, "fnsku", e.target.value)} /></div>
                            <div><label className="font-bold text-slate-500 uppercase text-[10px]">SKU</label><Input className="h-8 text-[13px]" value={item.sku||""} onChange={(e)=>updateItem(item.id, "sku", e.target.value)} /></div>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </>
      )}

      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />

      {/* MOBILE ACTIONS */}
      <div className="fixed bottom-0 left-0 right-0 h-14 bg-[#1b2633] text-slate-300 md:hidden flex divide-x divide-slate-700 z-40">
        <button className="flex-1 flex items-center justify-center flex-col gap-1 hover:text-white" onClick={()=>setIsFilterModalOpen(true)}>
          <ArrowUpDown className="h-4 w-4" />
          <span className="text-[10px]">Sort</span>
        </button>
        <button className="flex-1 flex items-center justify-center flex-col gap-1 text-blue-400" onClick={()=>setIsFilterModalOpen(true)}>
          <Filter className="h-4 w-4" />
          <span className="text-[10px]">Filter</span>
        </button>
      </div>

      {/* Confirm Modal */}
      <ConfirmModal 
        open={confirmDelete.open} 
        onClose={() => setConfirmDelete(d => ({ ...d, open: false }))} 
        onConfirm={confirmDelete.onConfirm} 
        title={confirmDelete.title} 
        message={confirmDelete.message} 
      />

    </div>
  )
}
