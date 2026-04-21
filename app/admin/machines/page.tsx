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
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3 uppercase">
            <TableIcon className="h-8 w-8 text-blue-600" />
            Machine Setup by Product
          </h1>
          <p className="text-slate-600 mt-1 font-bold italic text-md uppercase tracking-wider opacity-80">Manual técnico de configuración por SKU</p>
        </div>

        <div className="flex items-center gap-3 bg-white p-1.5 rounded-2xl border-2 border-slate-200 shadow-lg">
           <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setZoom(prev => Math.max(0.5, prev - 0.1))}
            className="h-10 w-10 rounded-xl hover:bg-slate-50 text-slate-900"
          >
            <span className="text-xl font-black">-</span>
          </Button>
          <div 
            className="px-3 py-1.5 bg-slate-100 rounded-lg font-black text-slate-900 text-xs cursor-pointer hover:bg-slate-200 transition-colors"
            onClick={() => setZoom(1.0)}
          >
            {Math.round(zoom * 100)}%
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setZoom(prev => Math.min(2.0, prev + 0.1))}
            className="h-10 w-10 rounded-xl hover:bg-slate-50 text-slate-900"
          >
             <span className="text-xl font-black">+</span>
          </Button>
        </div>
      </div>

      <div style={{ zoom: zoom }}>
        <Card className="border-2 border-slate-200 shadow-2xl rounded-[3rem] overflow-hidden bg-white mt-4">
          <CardHeader className="bg-slate-50 border-b-2 border-slate-200 p-8 flex flex-row items-center justify-between">
            <div className="flex items-center gap-4 bg-white px-6 py-3 rounded-2xl border-2 border-slate-200 shadow-sm w-full max-w-md focus-within:ring-4 ring-blue-50 transition-all">
              <Search className="h-5 w-5 text-slate-400" />
              <Input 
                placeholder="BUSCAR PRODUCTO..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="border-0 bg-transparent focus-visible:ring-0 h-6 p-0 text-md font-black text-slate-900"
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="py-20 text-center animate-pulse text-slate-400 font-black tracking-widest text-lg uppercase">Cargando Manual...</div>
            ) : (
              <div className="overflow-x-auto overflow-y-visible custom-scrollbar">
                <Table className="min-w-[1700px] border-collapse">
                  <TableHeader>
                    <TableRow className="bg-[#1e3a2f] hover:bg-[#1e3a2f] border-b-2 border-slate-900">
                      <TableHead className="w-[50px] border-r border-white/10"></TableHead>
                      <TableHead className="font-black text-[12px] uppercase tracking-widest text-white/90 py-10 px-6 w-[250px] border-r border-white/10">PRODUCTO</TableHead>
                      <TableHead className="font-black text-[12px] uppercase tracking-widest text-white/90 py-10 px-6 w-[120px] border-r border-white/10 text-center">PESO</TableHead>
                      <TableHead className="font-black text-[12px] uppercase tracking-widest text-white/90 py-10 px-6 w-[550px] text-center border-r border-white/10">FOTOS DE REFERENCIA</TableHead>
                      <TableHead className="font-black text-[12px] uppercase tracking-widest text-white/90 py-10 px-6 w-[130px] text-center border-r border-white/10">BAG SIZE</TableHead>
                      <TableHead className="font-black text-[12px] uppercase tracking-widest text-white/90 py-10 px-6 w-[200px] text-center border-r border-white/10">VELOCIDADES</TableHead>
                      <TableHead className="font-black text-[12px] uppercase tracking-widest text-white/90 py-10 px-8">DESCRIPCIÓN</TableHead>
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
                        <TableCell colSpan={7} className="py-20 text-center text-slate-300 font-black text-xl uppercase tracking-widest italic">
                          No hay registros
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}

            <div className="p-8 bg-slate-50">
              <button 
                onClick={addNewSetup}
                className="w-full py-10 border-4 border-dashed border-slate-200 rounded-[2rem] flex items-center justify-center gap-6 text-slate-400 hover:text-blue-600 hover:border-blue-300 hover:bg-white hover:shadow-xl transition-all duration-300 group"
              >
                <div className="w-14 h-14 rounded-2xl bg-white border-2 border-slate-100 flex items-center justify-center shadow-md group-hover:scale-110 group-hover:rotate-90 transition-all duration-300">
                  <Plus className="h-6 w-6 text-slate-400 group-hover:text-blue-600" />
                </div>
                <span className="font-black tracking-widest text-sm uppercase">AGREGAR PRODUCTO AL MANUAL</span>
              </button>
            </div>
          </CardContent>
        </Card>
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { height: 12px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #f8fafc; border-radius: 20px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 20px; border: 3px solid #f8fafc; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
      `}</style>

      <Dialog open={!!expandedImage} onOpenChange={() => setExpandedImage(null)}>
        <DialogContent className="max-w-[90vw] max-h-[90vh] p-0 border-0 bg-transparent shadow-none outline-none">
          {expandedImage && (
            <div className="relative w-full h-full flex items-center justify-center p-4">
              <img src={expandedImage} alt="Setup Reference" className="max-w-full max-h-[90vh] object-contain rounded-[2rem] shadow-2xl ring-[12px] ring-white/10" />
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
    <div className="relative group w-[110px] h-[80px] shrink-0">
      <div 
        className="w-full h-full bg-slate-50 border-2 border-slate-200 rounded-2xl overflow-hidden flex items-center justify-center cursor-pointer transition-all hover:border-blue-400 hover:ring-8 ring-blue-50 shadow-sm"
        onClick={() => url ? onExpandImage(url) : null}
      >
        {url ? (
          <img src={url} alt={label} className="w-full h-full object-cover" />
        ) : (
          <div className="flex flex-col items-center gap-1 opacity-20">
             <ImageIcon className="h-5 w-5 text-slate-900" />
             <span className="text-[8px] font-black uppercase tracking-tight text-slate-900">{label}</span>
          </div>
        )}
      </div>
      
      <button 
        onClick={() => { setUploadType(field); fileInputRef.current?.click(); }}
        className="absolute -top-2 -right-2 bg-blue-600 text-white p-2 rounded-xl shadow-lg opacity-0 group-hover:opacity-100 transition-all z-10"
      >
        <Camera className="h-3 w-3" />
      </button>
      
      {url && (
        <button 
          onClick={(e) => { e.stopPropagation(); onUpdate(setup.id, field, null); }}
          className="absolute -bottom-2 -right-2 bg-red-500 text-white p-1.5 rounded-xl shadow-lg opacity-0 group-hover:opacity-100 transition-all z-10"
        >
          <Trash className="h-3 w-3" />
        </button>
      )}
    </div>
  )

  return (
    <TableRow className="group hover:bg-slate-50 transition-all border-b border-slate-200">
      <TableCell className="py-10 px-4 text-center border-r border-slate-200">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => onDelete(localSetup.id, localSetup.productName)}
          className="h-8 w-8 text-slate-200 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all shadow-sm"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </TableCell>

      <TableCell className="py-10 px-6 border-r border-slate-200">
        <Textarea 
          value={localSetup.productName}
          onChange={(e) => setLocalSetup({ ...localSetup, productName: e.target.value })}
          onBlur={(e) => handleBlur("productName", e.target.value)}
          className="border-0 bg-transparent focus-visible:ring-0 font-black text-slate-900 placeholder:text-slate-100 min-h-[80px] p-0 text-md uppercase tracking-tight resize-none overflow-hidden leading-tight"
        />
        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" capture="environment" onChange={handleImageUpload} />
      </TableCell>
      
      <TableCell className="py-10 px-4 border-r border-slate-200 text-center">
        <Input 
          value={localSetup.weightGrams}
          placeholder="000G"
          onChange={(e) => setLocalSetup({ ...localSetup, weightGrams: e.target.value })}
          onBlur={(e) => handleBlur("weightGrams", e.target.value)}
          className="border-0 bg-transparent focus-visible:ring-0 font-black text-slate-800 placeholder:text-slate-200 h-auto p-0 text-lg tracking-tight text-center"
        />
      </TableCell>

      <TableCell className="py-10 px-6 border-r border-slate-200 bg-slate-50/10">
        <div className="flex gap-3 items-center justify-center">
          <ImageInput field="productImageUrl" url={localSetup.productImageUrl} label="PROD" />
          <ImageInput field="weightingImageUrl" url={localSetup.weightingImageUrl} label="PESA" />
          <ImageInput field="packagingImageUrl" url={localSetup.packagingImageUrl} label="PACK" />
          <ImageInput field="parametersImageUrl" url={localSetup.parametersImageUrl} label="PARAM" />
        </div>
      </TableCell>

      <TableCell className="py-10 px-6 border-r border-slate-200 bg-blue-50/20 text-center">
        <Input 
          value={localSetup.bagSize}
          placeholder="000MM"
          onChange={(e) => setLocalSetup({ ...localSetup, bagSize: e.target.value })}
          onBlur={(e) => handleBlur("bagSize", e.target.value)}
          className="border-0 bg-transparent focus-visible:ring-0 font-black text-blue-600 text-center placeholder:text-blue-100 h-auto p-0 text-md"
        />
      </TableCell>

      <TableCell className="py-10 px-6 border-r border-slate-200 bg-slate-50/10 text-center">
        <div className="flex flex-col gap-4 items-center">
          <div className="flex flex-col items-center gap-1 bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm w-full">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest shrink-0">Preset</span>
            <Input 
              value={localSetup.presetSpeed}
              placeholder="00/MIN"
              onChange={(e) => setLocalSetup({ ...localSetup, presetSpeed: e.target.value })}
              onBlur={(e) => handleBlur("presetSpeed", e.target.value)}
              className="border-0 bg-transparent focus-visible:ring-0 font-black text-slate-800 w-full h-auto p-0 text-md text-center uppercase"
            />
          </div>
          <div className="flex flex-col items-center gap-1 bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm w-full">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest shrink-0">Actual</span>
            <Input 
              value={localSetup.actualSpeed}
              placeholder="00MIN"
              onChange={(e) => setLocalSetup({ ...localSetup, actualSpeed: e.target.value })}
              onBlur={(e) => handleBlur("actualSpeed", e.target.value)}
              className="border-0 bg-transparent focus-visible:ring-0 font-black text-slate-800 w-full h-auto p-0 text-md text-center uppercase"
            />
          </div>
        </div>
      </TableCell>

      <TableCell className="py-10 px-8">
        <Textarea 
          value={localSetup.description}
          placeholder="NOTAS TÉCNICAS..."
          onChange={(e) => setLocalSetup({ ...localSetup, description: e.target.value })}
          onBlur={(e) => handleBlur("description", e.target.value)}
          className="border-0 bg-transparent focus-visible:ring-0 min-h-[140px] p-0 text-sm font-bold text-slate-700 resize-none overflow-hidden leading-relaxed uppercase placeholder:text-slate-100"
        />
      </TableCell>
    </TableRow>
  )
}
