"use client"

import { useState, useEffect, useMemo, lazy, Suspense } from "react"
import dynamic from "next/dynamic"

const Warehouse3D = dynamic(() => import("./warehouse-3d"), { ssr: false, loading: () => <div className="w-full h-[700px] rounded-2xl bg-slate-100 animate-pulse flex items-center justify-center text-slate-400 font-black text-lg uppercase tracking-widest">Cargando vista 3D...</div> })
import {
  Package,
  Search,
  Filter,
  X,
  Save,
  Trash2,
  MapPin,
  ArrowUpDown,
  Warehouse,
  AlertTriangle,
  ChevronDown,
  Box,
  LayoutGrid,
  ChevronUp,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/use-toast"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

// ── Constants ──────────────────────────────────────────────
const RACKS = {
  A: { cells: 8, label: "Rack A", color: "emerald" },
  B: { cells: 5, label: "Rack B", color: "blue" },
  C: { cells: 5, label: "Rack C", color: "violet" },
} as const

const LEVELS = [
  { key: "T", label: "ARRIBA", maxHeight: 80, order: 0 },
  { key: "M", label: "MEDIO", maxHeight: 56, order: 1 },
  { key: "L", label: "ABAJO", maxHeight: 40, order: 2 },
] as const

const STATUSES = ["AVAILABLE", "RESERVED", "DAMAGED", "HOLD", "INBOUND", "OUTBOUND"] as const
type PalletStatus = (typeof STATUSES)[number]

const STATUS_COLORS: Record<string, string> = {
  AVAILABLE: "bg-emerald-500",
  RESERVED: "bg-amber-500",
  DAMAGED: "bg-red-600",
  HOLD: "bg-red-500",
  INBOUND: "bg-purple-500",
  OUTBOUND: "bg-purple-600",
}

const STATUS_BG: Record<string, string> = {
  AVAILABLE: "bg-emerald-50 border-emerald-200",
  RESERVED: "bg-amber-50 border-amber-200",
  DAMAGED: "bg-red-50 border-red-200",
  HOLD: "bg-red-50 border-red-200",
  INBOUND: "bg-purple-50 border-purple-200",
  OUTBOUND: "bg-purple-50 border-purple-200",
}

const STATUS_LABELS: Record<string, string> = {
  AVAILABLE: "Disponible",
  RESERVED: "Reservado",
  DAMAGED: "Dañado",
  HOLD: "En Espera",
  INBOUND: "Entrante",
  OUTBOUND: "Saliente",
}

// ── Types ──────────────────────────────────────────────────
interface Pallet {
  id: string
  locationCode: string
  rack: string
  level: string
  cellNumber: number
  palletPosition: number
  sku: string | null
  productName: string | null
  quantity: number | null
  lotNumber: string | null
  expirationDate: string | null
  palletHeightIn: number | null
  status: string
  notes: string | null
  createdAt: string
  updatedAt: string
}

// ── Helpers ────────────────────────────────────────────────
function isOccupied(p: Pallet) {
  return p.status !== "AVAILABLE"
}

// ── Main Component ─────────────────────────────────────────
export default function WarehouseClient({ initialPallets }: { initialPallets: Pallet[] }) {
  const [pallets, setPallets] = useState<Pallet[]>(initialPallets)
  const [selectedPallet, setSelectedPallet] = useState<Pallet | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [seeding, setSeeding] = useState(false)

  // Filters
  const [rackFilter, setRackFilter] = useState<string>("ALL")
  const [statusFilter, setStatusFilter] = useState<string>("ALL")
  const [skuFilter, setSkuFilter] = useState("")

  // View mode
  const [viewMode, setViewMode] = useState<"2d" | "3d">("2d")

  // Collapsed rack sections
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({})

  // Form state
  const [form, setForm] = useState({
    sku: "",
    productName: "",
    quantity: "",
    lotNumber: "",
    expirationDate: "",
    palletHeightIn: "",
    status: "AVAILABLE" as string,
    notes: "",
  })

  // Auto-seed if not fully populated (144 pallets total) or if using old formatting
  useEffect(() => {
    const hasOldFormat = pallets.some(p => p.locationCode.includes('-'))
    if ((pallets.length < 144 || hasOldFormat) && !seeding) {
      seedWarehouse()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pallets, seeding])

  const seedWarehouse = async () => {
    setSeeding(true)
    try {
      const res = await fetch("/api/admin/warehouse/seed", { method: "POST" })
      if (res.ok) {
        const freshRes = await fetch("/api/admin/warehouse")
        if (freshRes.ok) {
          const data = await freshRes.json()
          setPallets(data)
        }
        toast({ title: "Warehouse inicializado", description: "Se crearon todas las posiciones." })
      }
    } catch {
      toast({ title: "Error", description: "No se pudo inicializar el warehouse.", variant: "destructive" })
    } finally {
      setSeeding(false)
    }
  }

  // ── Stats ──
  const stats = useMemo(() => {
    const total = pallets.length
    const occupied = pallets.filter(isOccupied).length
    const available = total - occupied
    const pct = total > 0 ? Math.round((occupied / total) * 100) : 0
    return { total, occupied, available, pct }
  }, [pallets])

  // ── Filtered pallets ──
  const filtered = useMemo(() => {
    return pallets.filter((p) => {
      if (rackFilter !== "ALL") {
        if (rackFilter.startsWith("FLOOR-")) {
          if (p.rack !== rackFilter) return false
        } else {
          if (p.rack !== rackFilter) return false
        }
      }
      if (statusFilter !== "ALL" && p.status !== statusFilter) return false
      if (skuFilter && !(p.sku || "").toLowerCase().includes(skuFilter.toLowerCase()) && !(p.productName || "").toLowerCase().includes(skuFilter.toLowerCase())) return false
      return true
    })
  }, [pallets, rackFilter, statusFilter, skuFilter])

  // ── Build rack groups ──
  const palletsByLocation = useMemo(() => {
    const map: Record<string, Pallet> = {}
    pallets.forEach((p) => (map[p.locationCode] = p))
    return map
  }, [pallets])

  // ── Open form ──
  const openPalletForm = (pallet: Pallet) => {
    setSelectedPallet(pallet)
    setForm({
      sku: pallet.sku || "",
      productName: pallet.productName || "",
      quantity: pallet.quantity?.toString() || "",
      lotNumber: pallet.lotNumber || "",
      expirationDate: pallet.expirationDate ? pallet.expirationDate.split("T")[0] : "",
      palletHeightIn: pallet.palletHeightIn?.toString() || "",
      status: pallet.status === "AVAILABLE" ? "INBOUND" : pallet.status,
      notes: pallet.notes || "",
    })
    setFormOpen(true)
  }

  // ── Save form ──
  const savePallet = async () => {
    if (!selectedPallet) return
    setSaving(true)

    const payload: any = {
      sku: form.sku || null,
      productName: form.productName || null,
      quantity: form.quantity ? parseInt(form.quantity) : null,
      lotNumber: form.lotNumber || null,
      expirationDate: form.expirationDate || null,
      palletHeightIn: form.palletHeightIn ? parseFloat(form.palletHeightIn) : null,
      status: form.status,
      notes: form.notes || null,
      level: selectedPallet.level,
    }

    try {
      const res = await fetch(`/api/admin/warehouse/${selectedPallet.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        const updated = await res.json()
        setPallets((prev) => prev.map((p) => (p.id === updated.id ? { ...p, ...updated, expirationDate: updated.expirationDate || null, createdAt: updated.createdAt, updatedAt: updated.updatedAt } : p)))
        setFormOpen(false)
        toast({ title: "Guardado", description: `Posición ${selectedPallet.locationCode} actualizada.` })
      } else {
        const err = await res.json()
        toast({ title: "Error de validación", description: err.error || "No se pudo guardar.", variant: "destructive" })
      }
    } catch {
      toast({ title: "Error", description: "No se pudo guardar.", variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  // ── Clear pallet ──
  const clearPallet = async () => {
    if (!selectedPallet || !confirm(`¿Vaciar posición ${selectedPallet.locationCode}?`)) return
    try {
      const res = await fetch(`/api/admin/warehouse/${selectedPallet.id}`, { method: "DELETE" })
      if (res.ok) {
        const updated = await res.json()
        setPallets((prev) => prev.map((p) => (p.id === updated.id ? { ...p, ...updated, expirationDate: null, createdAt: updated.createdAt, updatedAt: updated.updatedAt } : p)))
        setFormOpen(false)
        toast({ title: "Vaciado", description: `Posición ${selectedPallet.locationCode} limpiada.` })
      }
    } catch {
      toast({ title: "Error", variant: "destructive" })
    }
  }

  const toggleSection = (key: string) => {
    setCollapsedSections((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  // ── Render Pallet Slot ──
  const PalletSlot = ({ locationCode }: { locationCode: string }) => {
    const pallet = palletsByLocation[locationCode]
    if (!pallet) return <div className="w-[58px] h-[48px] bg-slate-100 rounded-lg border border-dashed border-slate-200" />

    const occupied = isOccupied(pallet)
    const statusColor = STATUS_COLORS[pallet.status] || "bg-slate-400"
    const borderBg = STATUS_BG[pallet.status] || "bg-slate-50 border-slate-200"

    return (
      <button
        onClick={() => openPalletForm(pallet)}
        className={`w-[58px] h-[48px] rounded-lg border-2 flex flex-col items-center justify-center gap-0 transition-all cursor-pointer hover:scale-110 hover:shadow-lg hover:z-10 relative ${borderBg}`}
        title={`${locationCode}${occupied ? `\n${pallet.productName || pallet.sku || ""}` : "\nVacío"}`}
      >
        <div className={`absolute top-1 right-1 w-2 h-2 rounded-full ${statusColor}`} />
        {occupied ? (
          <>
            <span className="text-[7px] font-black text-slate-700 truncate w-full px-1 text-center leading-tight">{pallet.sku || "—"}</span>
            <span className="text-[6px] text-slate-500 font-bold">{pallet.quantity ? `×${pallet.quantity}` : ""}</span>
          </>
        ) : (
          <span className="text-[8px] text-slate-400 font-bold">{locationCode}</span>
        )}
      </button>
    )
  }

  // ── Render Cell (2 pallets) ──
  // ── Render Cell (2 pallets) - Reversed for Right-to-Left physical look ──
  const Cell = ({ loc1, loc2, p1Num, p2Num }: { loc1: string; loc2: string; p1Num: number; p2Num: number }) => (
    <div className="flex gap-1 border-b-2 border-slate-200 pb-1 px-1">
      {/* Left Pallet (p2) */}
      <div className="flex flex-col items-center gap-1">
        <PalletSlot locationCode={loc2} />
        <span className="text-[9px] font-black text-slate-400">{p2Num}</span>
      </div>
      {/* Right Pallet (p1) */}
      <div className="flex flex-col items-center gap-1">
        <PalletSlot locationCode={loc1} />
        <span className="text-[9px] font-black text-slate-400">{p1Num}</span>
      </div>
    </div>
  )

  // ── Render Level Row ──
  const LevelRow = ({ rack, levelKey, levelLabel, maxHeight, cellCount }: { rack: string; levelKey: string; levelLabel: string; maxHeight: number; cellCount: number }) => (
    <div className="flex items-center gap-4">
      <div className="w-[80px] shrink-0 text-right">
        <div className="text-[10px] font-black text-slate-600 uppercase tracking-widest">{levelLabel}</div>
        <div className="text-[8px] text-slate-400 font-bold">máx {maxHeight}"</div>
      </div>
      <div className="flex gap-2 flex-wrap">
        {Array.from({ length: cellCount }, (_, i) => {
          const cellNum = cellCount - i
          const globalP1 = (cellNum - 1) * 2 + 1
          const globalP2 = (cellNum - 1) * 2 + 2
          const loc1 = `${rack}${globalP1}${levelKey}`
          const loc2 = `${rack}${globalP2}${levelKey}`
          return <Cell key={i} loc1={loc1} loc2={loc2} p1Num={globalP1} p2Num={globalP2} />
        })}
      </div>
    </div>
  )

  // ── Render Floor Row ──
  const FloorRow = ({ rackName, cellCount }: { rackName: string; cellCount: number }) => (
    <div className="flex items-center gap-4">
      <div className="w-[80px] shrink-0 text-right">
        <div className="text-[10px] font-black text-slate-600 uppercase tracking-widest">PISO</div>
        <div className="text-[8px] text-slate-400 font-bold">sin límite</div>
      </div>
      <div className="flex gap-2 flex-wrap">
        {Array.from({ length: cellCount }, (_, i) => {
          const cellNum = cellCount - i
          const globalP1 = (cellNum - 1) * 2 + 1
          const globalP2 = (cellNum - 1) * 2 + 2
          const loc1 = `${rackName}${globalP1}P`
          const loc2 = `${rackName}${globalP2}P`
          return <Cell key={i} loc1={loc1} loc2={loc2} p1Num={globalP1} p2Num={globalP2} />
        })}
      </div>
    </div>
  )

  // ── Render Rack Section ──
  const RackSection = ({ rackName, config }: { rackName: string; config: { cells: number; label: string; color: string } }) => {
    const isCollapsed = collapsedSections[rackName]
    const rackPallets = pallets.filter((p) => p.rack === rackName)
    const rackOccupied = rackPallets.filter(isOccupied).length
    const rackTotal = rackPallets.length
    const floorPallets = pallets.filter((p) => p.rack === `FLOOR-${rackName}`)
    const floorOccupied = floorPallets.filter(isOccupied).length
    const floorTotal = floorPallets.length

    const colorMap: Record<string, string> = {
      emerald: "from-emerald-600 to-emerald-800",
      blue: "from-blue-600 to-blue-800",
      violet: "from-violet-600 to-violet-800",
    }

    return (
      <div className="rounded-2xl border border-slate-200 overflow-hidden shadow-sm bg-white">
        <button
          onClick={() => toggleSection(rackName)}
          className={`w-full px-6 py-4 flex items-center justify-between bg-gradient-to-r ${colorMap[config.color]} text-white`}
        >
          <div className="flex items-center gap-3">
            <Warehouse className="h-5 w-5" />
            <span className="font-black text-lg tracking-widest uppercase">{config.label}</span>
            <span className="text-white/70 text-xs font-bold">({config.cells} cells × 3 niveles × 2 pallets = {config.cells * 6} posiciones)</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex gap-2 items-center">
              <span className="text-xs font-bold text-white/90">{rackOccupied}/{rackTotal} Rack</span>
              <span className="text-white/40">|</span>
              <span className="text-xs font-bold text-white/90">{floorOccupied}/{floorTotal} Piso</span>
            </div>
            {isCollapsed ? <ChevronDown className="h-5 w-5" /> : <ChevronUp className="h-5 w-5" />}
          </div>
        </button>

        {!isCollapsed && (
          <div className="p-6 space-y-4">
            {LEVELS.map((lvl) => (
              <LevelRow key={lvl.key} rack={rackName} levelKey={lvl.key} levelLabel={lvl.label} maxHeight={lvl.maxHeight} cellCount={config.cells} />
            ))}
            <hr className="border-dashed border-slate-200" />
            <FloorRow rackName={rackName} cellCount={config.cells} />
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6 w-full px-4">
      {/* Header */}
      <div className="py-4 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3 uppercase">
            <MapPin className="h-8 w-8 text-emerald-600" />
            Warehouse Rack Map
          </h1>
          <p className="text-sm text-slate-500 font-medium italic mt-1 uppercase tracking-widest">
            Mapa visual de inventario por racks, cells y pallets
          </p>
        </div>
        <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
          <button
            onClick={() => setViewMode("2d")}
            className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${viewMode === "2d" ? "bg-white shadow-md text-slate-900" : "text-slate-400 hover:text-slate-600"}`}
          >
            <LayoutGrid className="h-4 w-4" /> 2D Grid
          </button>
          <button
            onClick={() => setViewMode("3d")}
            className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${viewMode === "3d" ? "bg-white shadow-md text-slate-900" : "text-slate-400 hover:text-slate-600"}`}
          >
            <Box className="h-4 w-4" /> 3D Map
          </button>
        </div>
      </div>

      {/* Capacity Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-md bg-gradient-to-br from-slate-800 to-slate-900 text-white">
          <CardContent className="py-5 px-6">
            <div className="text-[10px] font-bold uppercase tracking-widest text-white/50">Total Posiciones</div>
            <div className="text-3xl font-black mt-1">{stats.total}</div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md bg-gradient-to-br from-blue-600 to-blue-700 text-white">
          <CardContent className="py-5 px-6">
            <div className="text-[10px] font-bold uppercase tracking-widest text-white/50">Ocupadas</div>
            <div className="text-3xl font-black mt-1">{stats.occupied}</div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md bg-gradient-to-br from-emerald-600 to-emerald-700 text-white">
          <CardContent className="py-5 px-6">
            <div className="text-[10px] font-bold uppercase tracking-widest text-white/50">Disponibles</div>
            <div className="text-3xl font-black mt-1">{stats.available}</div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md bg-white">
          <CardContent className="py-5 px-6">
            <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">% Ocupación</div>
            <div className="text-3xl font-black text-slate-900 mt-1">{stats.pct}%</div>
            <div className="w-full bg-slate-100 rounded-full h-2 mt-2">
              <div
                className={`h-2 rounded-full transition-all ${stats.pct > 85 ? "bg-red-500" : stats.pct > 60 ? "bg-amber-500" : "bg-emerald-500"}`}
                style={{ width: `${stats.pct}%` }}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="border-0 shadow-sm">
        <CardContent className="py-4 px-6">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-slate-400" />
              <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Filtros:</span>
            </div>

            <select
              value={rackFilter}
              onChange={(e) => setRackFilter(e.target.value)}
              className="px-3 py-2 border rounded-lg text-sm font-bold text-slate-700 bg-white focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400 outline-none"
            >
              <option value="ALL">Todos los Racks</option>
              <option value="A">Rack A</option>
              <option value="B">Rack B</option>
              <option value="C">Rack C</option>
              <option value="FLOOR-A">Piso A</option>
              <option value="FLOOR-B">Piso B</option>
              <option value="FLOOR-C">Piso C</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border rounded-lg text-sm font-bold text-slate-700 bg-white focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400 outline-none"
            >
              <option value="ALL">Todos los Estados</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>{STATUS_LABELS[s]}</option>
              ))}
            </select>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                value={skuFilter}
                onChange={(e) => setSkuFilter(e.target.value)}
                placeholder="Buscar SKU o producto..."
                className="pl-9 w-[250px] h-10 text-sm font-bold"
              />
            </div>

            {(rackFilter !== "ALL" || statusFilter !== "ALL" || skuFilter) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setRackFilter("ALL"); setStatusFilter("ALL"); setSkuFilter("") }}
                className="text-red-500 hover:text-red-700"
              >
                <X className="h-4 w-4 mr-1" /> Limpiar
              </Button>
            )}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-4 mt-4 pt-3 border-t border-slate-100">
            {STATUSES.map((s) => (
              <div key={s} className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${STATUS_COLORS[s]}`} />
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{STATUS_LABELS[s]}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Rack Sections */}
      {seeding ? (
        <div className="py-20 text-center animate-pulse text-slate-400 font-black tracking-widest text-lg uppercase">
          Inicializando warehouse...
        </div>
      ) : viewMode === "3d" ? (
        <Warehouse3D pallets={pallets} onSelectPallet={openPalletForm} />
      ) : (
        <div className="space-y-6">
          {Object.entries(RACKS).map(([rackName, config]) => (
            <RackSection key={rackName} rackName={rackName} config={config} />
          ))}
        </div>
      )}

      {/* Pallet Edit Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-xl font-black uppercase tracking-widest">
              <Package className="h-6 w-6 text-emerald-600" />
              {selectedPallet?.locationCode}
            </DialogTitle>
            {selectedPallet && selectedPallet.level !== "FLOOR" && (
              <div className="flex items-center gap-2 mt-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <span className="text-xs font-bold text-amber-600">
                  Altura máxima: {selectedPallet.level === "TOP" ? 80 : selectedPallet.level === "MID" ? 56 : 40}" pulgadas
                </span>
              </div>
            )}
            {selectedPallet && selectedPallet.level === "FLOOR" && (
              <span className="text-xs font-bold text-emerald-600">Piso — sin límite de altura</span>
            )}
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">SKU</label>
                <Input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} placeholder="SKU" className="mt-1" />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Cantidad</label>
                <Input value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} placeholder="0" type="number" className="mt-1" />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Producto</label>
              <Input value={form.productName} onChange={(e) => setForm({ ...form, productName: e.target.value })} placeholder="Nombre del producto" className="mt-1" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Lote</label>
                <Input value={form.lotNumber} onChange={(e) => setForm({ ...form, lotNumber: e.target.value })} placeholder="Número de lote" className="mt-1" />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Expiración</label>
                <Input value={form.expirationDate} onChange={(e) => setForm({ ...form, expirationDate: e.target.value })} type="date" className="mt-1" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Altura (pulgadas)</label>
                <Input value={form.palletHeightIn} onChange={(e) => setForm({ ...form, palletHeightIn: e.target.value })} placeholder='48"' type="number" className="mt-1" />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Estado</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border rounded-lg text-sm font-bold text-slate-700 bg-white focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400 outline-none"
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Notas</label>
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Notas adicionales..." className="mt-1 min-h-[80px]" />
            </div>

            <div className="flex justify-between pt-4 border-t">
              <Button variant="destructive" onClick={clearPallet} className="gap-2">
                <Trash2 className="h-4 w-4" /> Vaciar Posición
              </Button>
              <Button onClick={savePallet} disabled={saving} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
                <Save className="h-4 w-4" /> {saving ? "Guardando..." : "Guardar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
