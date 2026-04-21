"use client"

import { useState, useEffect, useRef } from "react"
import { 
  Plus, 
  Search, 
  Trash2, 
  Table as TableIcon,
  Image as ImageIcon,
  Camera,
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
  const [zoom, setZoom] = useState(1.0)
  
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
    <div className="space-y-6 w-full px-4">
      <div className="py-4 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight flex items-center gap-4 uppercase">
            <TableIcon className="h-10 w-10 text-blue-600" />
            Machine Setup by Product
          </h1>
          <p className="text-slate-500 mt-2 font-bold italic text-lg uppercase tracking-wider opacity-60">Manual técnico de configuración por SKU</p>
        </div>

        <div className="flex items-center gap-3 bg-white p-2 rounded-3xl border-2 border-slate-100 shadow-xl">
           <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setZoom(prev => Math.max(0.5, prev - 0.1))}
            className="h-12 w-12 rounded-2xl hover:bg-slate-50 text-slate-400"
          >
            <span className="text-2xl font-black">-</span>
          </Button>
          <div 
            className="px-4 py-2 bg-slate-50 rounded-xl font-black text-slate-600 text-sm cursor-pointer hover:bg-slate-100 transition-colors"
            onClick={() => setZoom(1.0)}
          >
            {Math.round(zoom * 100)}%
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setZoom(prev => Math.min(2.0, prev + 0.1))}
            className="h-12 w-12 rounded-2xl hover:bg-slate-50 text-slate-400"
          >
             <span className="text-2xl font-black">+</span>
          </Button>
        </div>
      </div>

      <div style={{ zoom: zoom }}>
        <Card className="border-0 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.14)] rounded-[4rem] overflow-hidden bg-white mt-4">
          <CardHeader className="bg-slate-50/50 border-b p-10 flex flex-row items-center justify-between">
            <div className="flex items-center gap-6 bg-white px-8 py-5 rounded-[2.5rem] border-2 border-slate-100 shadow-sm w-full max-w-xl focus-within:ring-8 ring-blue-50 transition-all">
              <Search className="h-6 w-6 text-slate-400" />
              <Input 
                placeholder="BUSCAR PRODUCTO..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="border-0 bg-transparent focus-visible:ring-0 h-8 p-0 text-xl font-black text-slate-700 placeholder:text-slate-200"
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="py-40 text-center animate-pulse text-slate-300 font-black tracking-[0.5em] text-2xl uppercase">Cargando Manual...</div>
            ) : (
              <div className="overflow-x-auto overflow-y-visible custom-scrollbar">
                <Table className="min-w-[2200px]">
                  <TableHeader>
                    <TableRow className="bg-[#1e3a2f] hover:bg-[#1e3a2f] border-0">
                      <TableHead className="w-[60px]"></TableHead>
                      <TableHead className="font-black text-[14px] uppercase tracking-[0.3em] text-white/90 py-16 px-10 w-[300px]">PRODUCTO</TableHead>
                      <TableHead className="font-black text-[14px] uppercase tracking-[0.3em] text-white/90 py-16 px-8 w-[150px]">PESO</TableHead>
                      <TableHead className="font-black text-[14px] uppercase tracking-[0.3em] text-white/90 py-16 px-8 w-[650px] text-center border-x border-white/5">FOTOS DE REFERENCIA</TableHead>
                      <TableHead className="font-black text-[14px] uppercase tracking-[0.3em] text-white/90 py-16 px-8 w-[700px]">DESCRIPCIÓN</TableHead>
                      <TableHead className="font-black text-[14px] uppercase tracking-[0.3em] text-white/90 py-16 px-8 w-[150px] text-center">BAG SIZE</TableHead>
                      <TableHead className="font-black text-[14px] uppercase tracking-[0.3em] text-white/90 py-16 px-8 w-[250px] text-center border-x border-white/5">VELOCIDADES</TableHead>
                      <TableHead className="font-black text-[14px] uppercase tracking-[0.3em] text-white/90 py-16 px-10">AJUSTES</TableHead>
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
                        <TableCell colSpan={8} className="py-40 text-center text-slate-200 font-black text-3xl uppercase tracking-[0.2em] italic">
                          No hay registros
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}

            <div className="p-12 bg-slate-50/50">
              <button 
                onClick={addNewSetup}
                className="w-full py-16 border-8 border-dashed border-slate-200 rounded-[4rem] flex items-center justify-center gap-8 text-slate-300 hover:text-blue-600 hover:border-blue-200 hover:bg-white hover:shadow-[0_40px_80px_-20px_rgba(59,130,246,0.2)] transition-all duration-500 group"
              >
                <div className="w-20 h-20 rounded-[2rem] bg-white border-4 border-slate-100 flex items-center justify-center shadow-xl group-hover:scale-110 group-hover:rotate-90 transition-all duration-500">
                  <Plus className="h-10 w-10 text-slate-400 group-hover:text-blue-600" />
                </div>
                <span className="font-black tracking-[0.4em] text-xl uppercase">AGREGAR PRODUCTO AL MANUAL</span>
              </button>
            </div>
          </CardContent>
        </Card>
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { height: 12px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #f8fafc; border-radius: 20px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 20px; border: 3px solid #f8fafc; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
      `}</style>

      <Dialog open={!!expandedImage} onOpenChange={() => setExpandedImage(null)}>
        <DialogContent className="max-w-[90vw] max-h-[90vh] p-0 border-0 bg-transparent shadow-none outline-none">
          {expandedImage && (
            <div className="relative w-full h-full flex items-center justify-center p-4">
              <img src={expandedImage} alt="Setup Reference" className="max-w-full max-h-[90vh] object-contain rounded-[3rem] shadow-[0_0_100px_rgba(0,0,0,0.5)] ring-[16px] ring-white/10" />
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
    <div className="relative group w-[120px] h-[90px] shrink-0">
      <div 
        className="w-full h-full bg-slate-50 border-2 border-slate-100 rounded-2xl overflow-hidden flex items-center justify-center cursor-pointer transition-all hover:border-blue-400 hover:ring-8 ring-blue-50/50"
        onClick={() => url ? onExpandImage(url) : null}
      >
        {url ? (
          <img src={url} alt={label} className="w-full h-full object-cover" />
        ) : (
          <div className="flex flex-col items-center gap-2 opacity-10">
             <ImageIcon className="h-6 w-6" />
             <span className="text-[8px] font-black uppercase tracking-[0.1em]">{label}</span>
          </div>
        )}
      </div>
      
      <button 
        onClick={() => { setUploadType(field); fileInputRef.current?.click(); }}
        className="absolute -top-2 -right-2 bg-blue-600 text-white p-2 rounded-xl shadow-2xl opacity-0 group-hover:opacity-100 transition-all duration-300 z-10"
      >
        <Camera className="h-4 w-4" />
      </button>
      
      {url && (
        <button 
          onClick={(e) => { e.stopPropagation(); onUpdate(setup.id, field, null); }}
          className="absolute -bottom-2 -right-2 bg-red-500 text-white p-1.5 rounded-xl shadow-2xl opacity-0 group-hover:opacity-100 transition-all duration-300 z-10"
        >
          <Trash className="h-4 w-4" />
        </button>
      )}
    </div>
  )

  return (
    <TableRow className="group hover:bg-slate-50/50 transition-all border-slate-50">
      <TableCell className="py-20 px-4 text-center border-r border-slate-50">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => onDelete(localSetup.id, localSetup.productName)}
          className="h-10 w-10 text-slate-200 hover:text-red-500 hover:bg-red-50 rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-300"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </TableCell>

      <TableCell className="py-20 px-10 border-r border-slate-50">
        <Textarea 
          value={localSetup.productName}
          onChange={(e) => setLocalSetup({ ...localSetup, productName: e.target.value })}
          onBlur={(e) => handleBlur("productName", e.target.value)}
          className="border-0 bg-transparent focus-visible:ring-0 font-black text-slate-800 placeholder:text-slate-100 min-h-[120px] p-0 text-xl uppercase tracking-tighter resize-none overflow-hidden leading-tight"
        />
        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" capture="environment" onChange={handleImageUpload} />
      </TableCell>
      
      <TableCell className="py-20 px-8 border-r border-slate-50 text-center">
        <Input 
          value={localSetup.weightGrams}
          placeholder="000G"
          onChange={(e) => setLocalSetup({ ...localSetup, weightGrams: e.target.value })}
          onBlur={(e) => handleBlur("weightGrams", e.target.value)}
          className="border-0 bg-transparent focus-visible:ring-0 font-black text-slate-500 placeholder:text-slate-100 h-auto p-0 text-xl tracking-tight text-center"
        />
      </TableCell>

      <TableCell className="py-20 px-8 border-r border-slate-100 bg-slate-50/10">
        <div className="grid grid-cols-2 gap-4 items-center justify-center mx-auto w-fit">
          <ImageInput field="productImageUrl" url={localSetup.productImageUrl} label="PROD" />
          <ImageInput field="weightingImageUrl" url={localSetup.weightingImageUrl} label="PESA" />
          <ImageInput field="packagingImageUrl" url={localSetup.packagingImageUrl} label="PACK" />
          <ImageInput field="parametersImageUrl" url={localSetup.parametersImageUrl} label="PARAM" />
        </div>
      </TableCell>

      <TableCell className="py-20 px-8 border-r border-slate-50">
        <Textarea 
          value={localSetup.description}
          placeholder="NOTAS TÉCNICAS..."
          onChange={(e) => setLocalSetup({ ...localSetup, description: e.target.value })}
          onBlur={(e) => handleBlur("description", e.target.value)}
          className="border-0 bg-transparent focus-visible:ring-0 min-h-[220px] p-0 text-md font-bold text-slate-500 resize-none overflow-hidden leading-relaxed uppercase placeholder:text-slate-100"
        />
      </TableCell>

      <TableCell className="py-20 px-8 border-r border-slate-50 bg-blue-50/5 text-center">
        <Input 
          value={localSetup.bagSize}
          placeholder="000MM"
          onChange={(e) => setLocalSetup({ ...localSetup, bagSize: e.target.value })}
          onBlur={(e) => handleBlur("bagSize", e.target.value)}
          className="border-0 bg-transparent focus-visible:ring-0 font-black text-blue-600 text-center placeholder:text-blue-100 h-auto p-0 text-xl"
        />
      </TableCell>

      <TableCell className="py-20 px-8 border-r border-slate-100 bg-slate-50/10 text-center">
        <div className="flex flex-col gap-6 items-center">
          <div className="flex flex-col items-center gap-2 bg-white px-6 py-4 rounded-[1.5rem] border-2 border-slate-50 shadow-sm w-full">
            <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest shrink-0">Preset Speed</span>
            <Input 
              value={localSetup.presetSpeed}
              placeholder="00/MIN"
              onChange={(e) => setLocalSetup({ ...localSetup, presetSpeed: e.target.value })}
              onBlur={(e) => handleBlur("presetSpeed", e.target.value)}
              className="border-0 bg-transparent focus-visible:ring-0 font-black text-slate-800 w-full h-auto p-0 text-lg text-center uppercase"
            />
          </div>
          <div className="flex flex-col items-center gap-2 bg-white px-6 py-4 rounded-[1.5rem] border-2 border-slate-50 shadow-sm w-full">
            <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest shrink-0">Actual Speed</span>
            <Input 
              value={localSetup.actualSpeed}
              placeholder="00MIN"
              onChange={(e) => setLocalSetup({ ...localSetup, actualSpeed: e.target.value })}
              onBlur={(e) => handleBlur("actualSpeed", e.target.value)}
              className="border-0 bg-transparent focus-visible:ring-0 font-black text-slate-800 w-full h-auto p-0 text-lg text-center uppercase"
            />
          </div>
        </div>
      </TableCell>

      <TableCell className="py-20 px-10">
        <Textarea 
          value={localSetup.additionalChanges}
          placeholder="AJUSTES..."
          onChange={(e) => setLocalSetup({ ...localSetup, additionalChanges: e.target.value })}
          onBlur={(e) => handleBlur("additionalChanges", e.target.value)}
          className="border-0 bg-transparent focus-visible:ring-0 min-h-[220px] p-0 text-sm font-black text-orange-600 uppercase tracking-tighter resize-none leading-tight placeholder:text-orange-100"
        />
      </TableCell>
    </TableRow>
  )
}
