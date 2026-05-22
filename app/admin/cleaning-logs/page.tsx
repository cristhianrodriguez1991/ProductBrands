"use client"

import { useState, useEffect, useRef } from "react"
import { 
  Plus, 
  Search, 
  Trash2, 
  ClipboardCheck,
  Image as ImageIcon,
  Camera,
  Trash,
  Calendar as CalendarIcon,
  Clock
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
import { format } from "date-fns"

export default function CleaningLogsPage() {
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [expandedImage, setExpandedImage] = useState<string | null>(null)
  const [zoom, setZoom] = useState(1.0)
  
  useEffect(() => {
    fetchLogs()
  }, [])

  const fetchLogs = async () => {
    try {
      const res = await fetch("/api/admin/cleaning-logs")
      if (res.ok) {
        const data = await res.json()
        setLogs(data)
      }
    } catch (error) {
      console.error("Failed to fetch cleaning logs", error)
    } finally {
      setLoading(false)
    }
  }

  const addNewLog = async () => {
    try {
      const now = new Date()
      const res = await fetch("/api/admin/cleaning-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          date: now.toISOString(),
          time: format(now, "hh:mm a"),
          areaCleaned: "NUEVA ÁREA",
          tasksCompleted: "",
          cleanedBy: "",
          supervisorInitials: "",
          notes: ""
        }),
      })

      if (res.ok) {
        fetchLogs()
        toast({ title: "Fila Añadida", description: "Nuevo registro de limpieza creado." })
      }
    } catch (error) {
      toast({ title: "Error", description: "No se pudo añadir la fila.", variant: "destructive" })
    }
  }

  const deleteLog = async (id: string, area: string) => {
    if (!confirm(`¿Borrar registro de limpieza de "${area}"?`)) return
    try {
      const res = await fetch(`/api/admin/cleaning-logs/${id}`, { method: "DELETE" })
      if (res.ok) {
        setLogs(prev => prev.filter(l => l.id !== id))
        toast({ title: "Borrado", description: "Registro eliminado." })
      }
    } catch (error) {
      toast({ title: "Error", description: "No se pudo borrar.", variant: "destructive" })
    }
  }

  const updateLogField = async (id: string, field: string, value: any) => {
    try {
      const res = await fetch(`/api/admin/cleaning-logs/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      })
      if (!res.ok) throw new Error("Update failed")
      
      setLogs(prev => prev.map(l => l.id === id ? { ...l, [field]: value } : l))
    } catch (error) {
      console.error("Update failed", error)
    }
  }

  const filteredLogs = logs.filter(l => 
    (l.areaCleaned || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (l.cleanedBy || "").toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="space-y-6 w-full px-4">
      <div className="py-4 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3 uppercase">
            <ClipboardCheck className="h-8 w-8 text-green-600" />
            Job Site Clean Logs
          </h1>
          <p className="text-slate-600 mt-1 font-bold italic text-md uppercase tracking-wider">Registro industrial de limpieza y mantenimiento</p>
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
        <Card className="border-2 border-slate-300 shadow-2xl rounded-[2.5rem] overflow-hidden bg-white mt-4">
          <CardHeader className="bg-slate-100/50 border-b-2 border-slate-300 p-6 flex flex-row items-center justify-between">
            <div className="flex items-center gap-4 bg-white px-6 py-2.5 rounded-2xl border-2 border-slate-200 shadow-sm w-full max-w-md focus-within:ring-4 ring-green-50 transition-all">
              <Search className="h-5 w-5 text-slate-400" />
              <Input 
                placeholder="BUSCAR ÁREA O PERSONAL..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="border-0 bg-transparent focus-visible:ring-0 h-6 p-0 text-md font-black text-slate-900 placeholder:text-slate-200"
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="py-20 text-center animate-pulse text-slate-400 font-black tracking-widest text-lg uppercase">Cargando Registros...</div>
            ) : (
              <div className="overflow-x-auto overflow-y-visible custom-scrollbar">
                <Table className="min-w-[1800px] border-collapse">
                  <TableHeader>
                    <TableRow className="bg-[#1a2b3c] hover:bg-[#1a2b3c] border-b-2 border-slate-900">
                      <TableHead className="w-[60px] border-r border-white/10"></TableHead>
                      <TableHead className="font-black text-[11px] uppercase tracking-widest text-white/90 py-10 px-4 w-[200px] border-r border-white/10 text-center">FECHA Y HORA</TableHead>
                      <TableHead className="font-black text-[11px] uppercase tracking-widest text-white/90 py-10 px-6 w-[250px] border-r border-white/10 text-center">ÁREA LIMPIADA</TableHead>
                      <TableHead className="font-black text-[11px] uppercase tracking-widest text-white/90 py-10 px-6 w-[400px] border-r border-white/10 text-center">FOTOS DE EVIDENCIA</TableHead>
                      <TableHead className="font-black text-[11px] uppercase tracking-widest text-white/90 py-10 px-6 w-[450px] border-r border-white/10 text-center">TAREAS COMPLETADAS</TableHead>
                      <TableHead className="font-black text-[11px] uppercase tracking-widest text-white/90 py-10 px-6 w-[220px] border-r border-white/10 text-center">LIMPIADO POR</TableHead>
                      <TableHead className="font-black text-[11px] uppercase tracking-widest text-white/90 py-10 px-4 w-[110px] border-r border-white/10 text-center">SUP. (INT)</TableHead>
                      <TableHead className="font-black text-[11px] uppercase tracking-widest text-white/90 py-10 px-8 text-center">NOTAS / COMENTARIOS</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLogs.map((l) => (
                      <EditableCleaningRow 
                        key={l.id} 
                        log={l} 
                        onUpdate={updateLogField}
                        onDelete={deleteLog}
                        onExpandImage={setExpandedImage}
                      />
                    ))}
                    {!loading && filteredLogs.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={8} className="py-20 text-center text-slate-300 font-black text-xl uppercase tracking-widest italic">
                          No hay registros encontrados
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}

            <div className="p-8 bg-slate-50 border-t-2 border-slate-200">
              <button 
                onClick={addNewLog}
                className="w-full py-8 border-4 border-dashed border-slate-300 rounded-[2rem] flex items-center justify-center gap-6 text-slate-400 hover:text-green-600 hover:border-green-400 hover:bg-white hover:shadow-xl transition-all duration-300 group"
              >
                <div className="w-12 h-12 rounded-2xl bg-white border-2 border-slate-200 flex items-center justify-center shadow-md group-hover:scale-110 group-hover:rotate-90 transition-all duration-300">
                  <Plus className="h-6 w-6 text-slate-500 group-hover:text-green-600" />
                </div>
                <span className="font-black tracking-widest text-xs uppercase text-slate-500 group-hover:text-green-600">NUEVO REGISTRO DE LIMPIEZA</span>
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
              <img src={expandedImage} alt="Cleaning Reference" className="max-w-full max-h-[90vh] object-contain rounded-[2rem] shadow-2xl ring-[12px] ring-white/10" />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

const compressImage = (file: File): Promise<Blob | File> => {
  return new Promise((resolve) => {
    // Only compress images
    if (!file.type.startsWith("image/")) {
      return resolve(file)
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      const img = new Image()
      img.onload = () => {
        // Max dimensions
        const MAX_WIDTH = 1200
        const MAX_HEIGHT = 1200
        let width = img.width
        let height = img.height

        // Calculate aspect ratio and clamp size
        if (width > MAX_WIDTH || height > MAX_HEIGHT) {
          if (width > height) {
            height = Math.round((height * MAX_WIDTH) / width)
            width = MAX_WIDTH
          } else {
            width = Math.round((width * MAX_HEIGHT) / height)
            height = MAX_HEIGHT
          }
        }

        const canvas = document.createElement("canvas")
        canvas.width = width
        canvas.height = height

        const ctx = canvas.getContext("2d")
        if (!ctx) {
          return resolve(file)
        }

        ctx.drawImage(img, 0, 0, width, height)

        // Compress as jpeg with 0.8 quality
        canvas.toBlob(
          (blob) => {
            if (blob) {
              // Convert blob back to a File
              const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", {
                type: "image/jpeg",
                lastModified: Date.now()
              })
              resolve(compressedFile)
            } else {
              resolve(file)
            }
          },
          "image/jpeg",
          0.8
        )
      }
      img.onerror = () => resolve(file)
      img.src = event.target?.result as string
    }
    reader.onerror = () => resolve(file)
    reader.readAsDataURL(file)
  })
}

function EditableCleaningRow({ log, onUpdate, onDelete, onExpandImage }: any) {
  const [localLog, setLocalLog] = useState(log)

  useEffect(() => {
    setLocalLog(log)
  }, [log])

  const handleBlur = (field: string, value: any) => {
    if (log[field] !== value) {
      onUpdate(log.id, field, value)
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || !files[0]) return

    const originalFile = files[0]
    toast({ title: "Subiendo...", description: "Comprimiendo y subiendo imagen..." })

    try {
      const compressedFile = await compressImage(originalFile)
      const fd = new FormData()
      fd.append("file", compressedFile)

      const res = await fetch(`/api/admin/cleaning-logs/${log.id}/image`, { 
        method: "POST", 
        body: fd 
      })
      if (res.ok) {
        const updated = await res.json()
        onUpdate(log.id, "imageUrls", updated.imageUrls)
        toast({ title: "Éxito", description: "Imagen subida correctamente." })
      } else {
        const errText = await res.text().catch(() => "")
        throw new Error(errText || "Error del servidor")
      }
    } catch (error: any) {
      console.error("Upload error:", error)
      toast({ title: "Error", description: `No se pudo subir la imagen: ${error.message || ""}`, variant: "destructive" })
    } finally {
      if (e.target) {
        e.target.value = ""
      }
    }
  }

  const removeImage = (index: number) => {
    const newImages = [...localLog.imageUrls]
    newImages.splice(index, 1)
    onUpdate(log.id, "imageUrls", newImages)
  }

  return (
    <TableRow className="group hover:bg-slate-50 transition-all border-b border-slate-200 min-h-[140px]">
      <TableCell className="py-8 px-4 text-center border-r border-slate-200 align-middle">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => onDelete(localLog.id, localLog.areaCleaned)}
          className="h-8 w-8 text-slate-200 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all shadow-sm"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </TableCell>

      <TableCell className="py-8 px-4 border-r border-slate-200 text-center align-middle">
        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 w-full">
            <CalendarIcon className="h-4 w-4 text-slate-400 shrink-0" />
            <Input 
              type="date"
              value={localLog.date ? format(new Date(localLog.date), "yyyy-MM-dd") : ""}
              onChange={(e) => setLocalLog({ ...localLog, date: e.target.value })}
              onBlur={(e) => handleBlur("date", e.target.value)}
              className="border-0 bg-transparent focus-visible:ring-0 font-black text-slate-900 p-0 h-auto text-xs"
            />
          </div>
          <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 w-full">
            <Clock className="h-4 w-4 text-slate-400 shrink-0" />
            <Input 
              value={localLog.time}
              placeholder="00:00 AM"
              onChange={(e) => setLocalLog({ ...localLog, time: e.target.value })}
              onBlur={(e) => handleBlur("time", e.target.value)}
              className="border-0 bg-transparent focus-visible:ring-0 font-black text-slate-900 p-0 h-auto text-xs uppercase"
            />
          </div>
        </div>
      </TableCell>

      <TableCell className="py-8 px-6 border-r border-slate-200 align-middle">
        <Textarea 
          value={localLog.areaCleaned}
          placeholder="ESPECIFICAR ÁREA..."
          onChange={(e) => setLocalLog({ ...localLog, areaCleaned: e.target.value })}
          onBlur={(e) => handleBlur("areaCleaned", e.target.value)}
          className="border-0 bg-transparent focus-visible:ring-0 font-black text-slate-900 placeholder:text-slate-100 min-h-[60px] p-0 text-md uppercase tracking-tight resize-none text-center leading-tight"
        />
      </TableCell>

      <TableCell className="py-8 px-6 border-r border-slate-200 align-middle">
        <div className="flex flex-wrap gap-2 justify-center max-w-[340px] mx-auto min-h-[100px] items-center">
          {localLog.imageUrls?.map((url: string, idx: number) => (
            <div key={idx} className="relative group/img w-[80px] h-[60px]">
              <div 
                className="w-full h-full bg-slate-50 border-2 border-slate-300 rounded-xl overflow-hidden flex items-center justify-center cursor-pointer transition-all hover:border-green-600 hover:ring-4 ring-green-50 shadow-sm"
                onClick={() => onExpandImage(url)}
              >
                <img src={url} alt={`Clean ${idx}`} className="w-full h-full object-cover" />
              </div>
              <button 
                onClick={(e) => { e.stopPropagation(); removeImage(idx); }}
                className="absolute -top-1 -right-1 bg-red-600 text-white p-1 rounded-full shadow-lg opacity-0 group-hover/img:opacity-100 transition-all z-10 border border-white"
              >
                <Trash className="h-2 w-2" />
              </button>
            </div>
          ))}
          
          <label 
            htmlFor={`file-upload-${log.id}`}
            className="w-[80px] h-[60px] border-2 border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center gap-1 text-slate-300 hover:text-green-600 hover:border-green-400 hover:bg-green-50/30 transition-all group/plus cursor-pointer"
          >
            <Camera className="h-4 w-4" />
            <span className="text-[6px] font-black uppercase tracking-widest">AÑADIR</span>
          </label>
          <input 
            type="file" 
            id={`file-upload-${log.id}`}
            className="hidden" 
            accept="image/*" 
            onChange={handleImageUpload} 
          />
        </div>
      </TableCell>

      <TableCell className="py-8 px-6 border-r border-slate-200 bg-slate-50/30 align-middle">
        <Textarea 
          value={localLog.tasksCompleted}
          placeholder="DETALLE DE TAREAS..."
          onChange={(e) => setLocalLog({ ...localLog, tasksCompleted: e.target.value })}
          onBlur={(e) => handleBlur("tasksCompleted", e.target.value)}
          className="border-0 bg-transparent focus-visible:ring-0 min-h-[120px] p-0 text-xs font-bold text-slate-700 resize-none overflow-hidden leading-relaxed uppercase placeholder:text-slate-100 text-center"
        />
      </TableCell>

      <TableCell className="py-8 px-6 border-r border-slate-200 align-middle font-black">
        <Textarea 
          value={localLog.cleanedBy}
          placeholder="NOMBRE..."
          onChange={(e) => setLocalLog({ ...localLog, cleanedBy: e.target.value })}
          onBlur={(e) => handleBlur("cleanedBy", e.target.value)}
          className="border-0 bg-transparent focus-visible:ring-0 font-black text-slate-900 text-center placeholder:text-slate-200 min-h-[60px] p-0 text-sm uppercase resize-none overflow-hidden leading-tight"
        />
      </TableCell>

      <TableCell className="py-8 px-6 border-r border-slate-200 text-center bg-blue-50/20 align-middle">
        <Input 
          value={localLog.supervisorInitials}
          placeholder="INT"
          maxLength={5}
          onChange={(e) => setLocalLog({ ...localLog, supervisorInitials: e.target.value })}
          onBlur={(e) => handleBlur("supervisorInitials", e.target.value)}
          className="border-0 bg-transparent focus-visible:ring-0 font-black text-blue-700 text-center placeholder:text-blue-200 h-auto p-0 text-xl uppercase"
        />
      </TableCell>

      <TableCell className="py-8 px-8 bg-slate-50/30 align-middle">
        <Textarea 
          value={localLog.notes}
          placeholder="COMENTARIOS..."
          onChange={(e) => setLocalLog({ ...localLog, notes: e.target.value })}
          onBlur={(e) => handleBlur("notes", e.target.value)}
          className="border-0 bg-transparent focus-visible:ring-0 min-h-[120px] p-0 text-xs font-black text-slate-500 uppercase tracking-tight resize-none leading-tight placeholder:text-slate-100 text-center"
        />
      </TableCell>
    </TableRow>
  )
}
