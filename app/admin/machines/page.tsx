"use client"

import { useState, useEffect, useRef } from "react"
import { 
  Plus, 
  Search, 
  Trash2, 
  Maximize2, 
  Table as TableIcon,
  Image as ImageIcon,
  Camera,
  Layers,
  Settings2,
  Trash
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/use-toast"
import { Dialog, DialogContent } from "@/components/ui/dialog"

export default function MachineSetupPage() {
  const [setups, setSetups] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [expandedImage, setExpandedImage] = useState<string | null>(null)
  
  useEffect(() => {
    fetchSetups()
  }, [])

  const fetchSetups = async () => {
    try {
      const res = await fetch("/api/admin/machines")
      if (res.ok) {
        const data = await res.json()
        setSetups(data)
      }
    } catch (error) {
      console.error("Failed to fetch machine setups", error)
    } finally {
      setLoading(false)
    }
  }

  const addNewSetup = async () => {
    try {
      const res = await fetch("/api/admin/machines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productName: "NUEVO PRODUCTO" }),
      })

      if (res.ok) {
        fetchSetups()
        toast({ title: "Fila Añadida", description: "Nueva configuración creada en el manual." })
      }
    } catch (error) {
      toast({ title: "Error", description: "No se pudo añadir la fila.", variant: "destructive" })
    }
  }

  const deleteSetup = async (id: string, name: string) => {
    if (!confirm(`¿Borrar configuración de "${name}"?`)) return
    try {
      const res = await fetch(`/api/admin/machines/${id}`, { method: "DELETE" })
      if (res.ok) {
        setSetups(prev => prev.filter(s => s.id !== id))
        toast({ title: "Borrado", description: "Configuración eliminada." })
      }
    } catch (error) {
      toast({ title: "Error", description: "No se pudo borrar.", variant: "destructive" })
    }
  }

  const updateSetupField = async (id: string, field: string, value: any) => {
    try {
      const res = await fetch(`/api/admin/machines/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      })
      if (!res.ok) throw new Error("Update failed")
      
      setSetups(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s))
    } catch (error) {
      console.error("Update failed", error)
    }
  }

  const filteredSetups = setups.filter(s => 
    (s.productName || "").toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="space-y-6 w-full">
      <div className="px-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3 uppercase">
            <TableIcon className="h-8 w-8 text-blue-600" />
            Machine Setup by Product
          </h1>
          <p className="text-slate-500 mt-1 font-medium italic">Configuración técnica de maquinaria por cada SKU de la marca.</p>
        </div>
      </div>

      <Card className="border-0 shadow-2xl rounded-[3rem] overflow-hidden bg-white">
        <CardHeader className="bg-slate-50/50 border-b p-6 flex flex-row items-center justify-between">
          <div className="flex items-center gap-4 bg-white px-6 py-3 rounded-3xl border border-slate-200 shadow-sm w-full max-w-md focus-within:ring-4 ring-blue-50 transition-all">
            <Search className="h-5 w-5 text-slate-400" />
            <Input 
              placeholder="Buscar por nombre de producto..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="border-0 bg-transparent focus-visible:ring-0 h-8 p-0 text-md font-bold text-slate-700"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-20 text-center animate-pulse text-slate-400 font-black tracking-widest uppercase">Cargando Manual...</div>
          ) : (
            <div className="overflow-x-auto overflow-y-visible">
              <Table className="min-w-[1400px]">
                <TableHeader>
                  <TableRow className="bg-[#2c4c3b] hover:bg-[#2c4c3b] border-0">
                    <TableHead className="font-black text-[11px] uppercase tracking-widest text-white/90 py-8 px-6 w-[250px]">PRODUCTO</TableHead>
                    <TableHead className="font-black text-[11px] uppercase tracking-widest text-white/90 py-8 px-4 w-[120px]">PESO (G)</TableHead>
                    <TableHead className="font-black text-[11px] uppercase tracking-widest text-white/90 py-8 px-4 w-[460px] text-center border-x border-white/10">FOTOS DE REFERENCIA (PRODUCTO / PESA / EMPAQUE / PARÁMETROS)</TableHead>
                    <TableHead className="font-black text-[11px] uppercase tracking-widest text-white/90 py-8 px-4 w-[250px]">DESCRIPCIÓN</TableHead>
                    <TableHead className="font-black text-[11px] uppercase tracking-widest text-white/90 py-8 px-4 w-[140px] text-center">BAG SIZE</TableHead>
                    <TableHead className="font-black text-[11px] uppercase tracking-widest text-white/90 py-8 px-4 w-[160px] text-center border-x border-white/10">VELOCIDADES (PR/AC)</TableHead>
                    <TableHead className="font-black text-[11px] uppercase tracking-widest text-white/90 py-8 px-4 w-[250px]">ADJUSTES ADICIONALES</TableHead>
                    <TableHead className="font-black text-[11px] uppercase tracking-widest text-white/90 py-8 px-6 text-right">ACC</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSetups.map((s) => (
                    <EditableMachineRow 
                      key={s.id} 
                      setup={s} 
                      onUpdate={updateSetupField}
                      onDelete={deleteSetup}
                      onExpandImage={setExpandedImage}
                    />
                  ))}
                  {filteredSetups.length === 0 && !loading && (
                    <TableRow>
                      <TableCell colSpan={8} className="py-20 text-center text-slate-300 font-bold uppercase tracking-widest italic">
                        No hay configuraciones. Añade la primera abajo.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}

          <div className="p-8 bg-slate-50/50">
            <button 
              onClick={addNewSetup}
              className="w-full py-10 border-4 border-dashed border-slate-200 rounded-[2.5rem] flex items-center justify-center gap-4 text-slate-400 hover:text-blue-600 hover:border-blue-300 hover:bg-white hover:shadow-2xl hover:shadow-blue-200/50 transition-all group"
            >
              <div className="w-14 h-14 rounded-3xl bg-white border-2 border-slate-200 flex items-center justify-center shadow-md group-hover:scale-110 group-hover:rotate-90 transition-all duration-300">
                <Plus className="h-8 w-8" />
              </div>
              <span className="font-black tracking-[0.2em] text-sm uppercase">AGREGAR PRODUCTO AL MANUAL</span>
            </button>
          </div>
        </CardContent>
      </Card>

      {/* FULLSCREEN PREVIEW */}
      <Dialog open={!!expandedImage} onOpenChange={() => setExpandedImage(null)}>
        <DialogContent className="max-w-5xl p-0 border-0 bg-transparent shadow-none">
          {expandedImage && (
            <div className="relative w-full aspect-video flex items-center justify-center p-4">
              <img src={expandedImage} alt="Setup Reference" className="max-w-full max-h-full object-contain rounded-3xl shadow-2xl ring-8 ring-white/10" />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function EditableMachineRow({ setup, onUpdate, onDelete, onExpandImage }: any) {
  const [localSetup, setLocalSetup] = useState(setup)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploadType, setUploadType] = useState<string | null>(null)

  useEffect(() => {
    setLocalSetup(setup)
  }, [setup])

  const handleBlur = (field: string, value: any) => {
    if (setup[field] !== value) {
      onUpdate(setup.id, field, value)
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || !files[0] || !uploadType) return

    const fd = new FormData()
    fd.append("file", files[0])

    try {
      const res = await fetch(`/api/admin/machines/${setup.id}/image?type=${uploadType}`, { 
        method: "POST", 
        body: fd 
      })
      if (res.ok) {
        const updated = await res.json()
        onUpdate(setup.id, uploadType, updated[uploadType])
      }
    } catch (error) {
      toast({ title: "Error", description: "Error al subir la imagen." })
    }
  }

  const ImageInput = ({ field, url, label }: { field: string, url: string, label: string }) => (
    <div className="relative group w-[105px] h-[75px] shrink-0">
      <div 
        className="w-full h-full bg-slate-50 border-2 border-slate-100 rounded-xl overflow-hidden flex items-center justify-center cursor-pointer transition-all hover:border-blue-400 hover:ring-4 ring-blue-50"
        onClick={() => url ? onExpandImage(url) : null}
      >
        {url ? (
          <img src={url} alt={label} className="w-full h-full object-cover" />
        ) : (
          <div className="flex flex-col items-center gap-1 opacity-20">
             <ImageIcon className="h-4 w-4" />
             <span className="text-[8px] font-black uppercase tracking-tighter">{label}</span>
          </div>
        )}
      </div>
      
      <button 
        onClick={() => { setUploadType(field); fileInputRef.current?.click(); }}
        className="absolute -top-1 -right-1 bg-blue-600 text-white p-1.5 rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-10 hover:scale-110"
      >
        <Camera className="h-3 w-3" />
      </button>
      
      {url && (
        <button 
          onClick={(e) => { e.stopPropagation(); onUpdate(setup.id, field, null); }}
          className="absolute -bottom-1 -right-1 bg-red-500 text-white p-1 rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-10 hover:scale-110"
        >
          <Trash className="h-3 w-3" />
        </button>
      )}
    </div>
  )

  return (
    <TableRow className="group hover:bg-blue-50/30 transition-all border-slate-50">
      <TableCell className="py-6 px-6 border-r border-slate-50">
        <Input 
          value={localSetup.productName}
          onChange={(e) => setLocalSetup({ ...localSetup, productName: e.target.value })}
          onBlur={(e) => handleBlur("productName", e.target.value)}
          className="border-0 bg-transparent focus-visible:ring-0 font-black text-slate-800 placeholder:text-slate-200 h-auto p-0 text-md uppercase"
        />
        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" capture="environment" onChange={handleImageUpload} />
      </TableCell>
      
      <TableCell className="py-6 px-4 border-r border-slate-50">
        <Input 
          value={localSetup.weightGrams}
          placeholder="000g"
          onChange={(e) => setLocalSetup({ ...localSetup, weightGrams: e.target.value })}
          onBlur={(e) => handleBlur("weightGrams", e.target.value)}
          className="border-0 bg-transparent focus-visible:ring-0 font-bold text-slate-600 placeholder:text-slate-200 h-auto p-0 text-sm"
        />
      </TableCell>

      <TableCell className="py-6 px-4 border-r border-slate-100 bg-slate-50/30">
        <div className="flex gap-2.5 items-center justify-center">
          <ImageInput field="productImageUrl" url={localSetup.productImageUrl} label="PROD" />
          <ImageInput field="weightingImageUrl" url={localSetup.weightingImageUrl} label="WEIGHT" />
          <ImageInput field="packagingImageUrl" url={localSetup.packagingImageUrl} label="PACK" />
          <ImageInput field="parametersImageUrl" url={localSetup.parametersImageUrl} label="PARAM" />
        </div>
      </TableCell>

      <TableCell className="py-6 px-4 border-r border-slate-50">
        <Textarea 
          value={localSetup.description}
          placeholder="Notas técnicas..."
          onChange={(e) => setLocalSetup({ ...localSetup, description: e.target.value })}
          onBlur={(e) => handleBlur("description", e.target.value)}
          className="border-0 bg-transparent focus-visible:ring-0 min-h-[60px] p-0 text-xs font-medium text-slate-500 resize-none overflow-hidden"
        />
      </TableCell>

      <TableCell className="py-6 px-4 border-r border-slate-50 bg-blue-50/20">
        <Input 
          value={localSetup.bagSize}
          placeholder="200mm"
          onChange={(e) => setLocalSetup({ ...localSetup, bagSize: e.target.value })}
          onBlur={(e) => handleBlur("bagSize", e.target.value)}
          className="border-0 bg-transparent focus-visible:ring-0 font-black text-blue-600 text-center placeholder:text-blue-100 h-auto p-0 text-sm"
        />
      </TableCell>

      <TableCell className="py-6 px-4 border-r border-slate-100 bg-slate-50/10">
        <div className="flex flex-col gap-2 items-center">
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-100 shadow-sm w-full">
            <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter shrink-0">Preset Speed</span>
            <Input 
              value={localSetup.presetSpeed}
              placeholder="00/min"
              onChange={(e) => setLocalSetup({ ...localSetup, presetSpeed: e.target.value })}
              onBlur={(e) => handleBlur("presetSpeed", e.target.value)}
              className="border-0 bg-transparent focus-visible:ring-0 font-black text-slate-600 w-full h-auto p-0 text-[11px] text-right"
            />
          </div>
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-100 shadow-sm w-full">
            <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter shrink-0">Actual Speed</span>
            <Input 
              value={localSetup.actualSpeed}
              placeholder="00min"
              onChange={(e) => setLocalSetup({ ...localSetup, actualSpeed: e.target.value })}
              onBlur={(e) => handleBlur("actualSpeed", e.target.value)}
              className="border-0 bg-transparent focus-visible:ring-0 font-black text-slate-600 w-full h-auto p-0 text-[11px] text-right"
            />
          </div>
        </div>
      </TableCell>

      <TableCell className="py-6 px-4 border-r border-slate-50">
        <Textarea 
          value={localSetup.additionalChanges}
          placeholder="Ajustes físicos..."
          onChange={(e) => setLocalSetup({ ...localSetup, additionalChanges: e.target.value })}
          onBlur={(e) => handleBlur("additionalChanges", e.target.value)}
          className="border-0 bg-transparent focus-visible:ring-0 min-h-[60px] p-0 text-[10px] font-black text-orange-600 uppercase tracking-tight resize-none"
        />
      </TableCell>

      <TableCell className="py-6 px-6 text-right">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => onDelete(localSetup.id, localSetup.productName)}
          className="h-10 w-10 text-slate-200 hover:text-red-600 hover:bg-red-50 rounded-2xl opacity-0 group-hover:opacity-100 transition-all"
        >
          <Trash2 className="h-5 w-5" />
        </Button>
      </TableCell>
    </TableRow>
  )
}
