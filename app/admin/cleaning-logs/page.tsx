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
                      <TableHead className="font-black text-[11px] uppercase tracking-widest text-white/90 py-8 px-4 w-[160px] border-r border-white/10 text-center">FECHA</TableHead>
                      <TableHead className="font-black text-[11px] uppercase tracking-widest text-white/90 py-8 px-4 w-[130px] border-r border-white/10 text-center">HORA</TableHead>
                      <TableHead className="font-black text-[11px] uppercase tracking-widest text-white/90 py-8 px-6 w-[220px] border-r border-white/10">ÁREA LIMPIADA</TableHead>
                      <TableHead className="font-black text-[11px] uppercase tracking-widest text-white/90 py-8 px-6 w-[130px] border-r border-white/10 text-center">FOTO</TableHead>
                      <TableHead className="font-black text-[11px] uppercase tracking-widest text-white/90 py-8 px-6 w-[450px] border-r border-white/10">TAREAS COMPLETADAS</TableHead>
                      <TableHead className="font-black text-[11px] uppercase tracking-widest text-white/90 py-8 px-6 w-[220px] border-r border-white/10 text-center">LIMPIADO POR</TableHead>
                      <TableHead className="font-black text-[11px] uppercase tracking-widest text-white/90 py-8 px-4 w-[110px] border-r border-white/10 text-center">SUP. (INT)</TableHead>
                      <TableHead className="font-black text-[11px] uppercase tracking-widest text-white/90 py-8 px-8 text-center text-right">NOTAS / COMENTARIOS</TableHead>
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
                        <TableCell colSpan={9} className="py-20 text-center text-slate-300 font-black text-xl uppercase tracking-widest italic">
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
              <img src={expandedImage} alt="Cleaning Reference" className="max-w-full max-h-[90vh] object-contain rounded-[2rem] shadow-2xl ring-[12px] ring-white/20" />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function EditableCleaningRow({ log, onUpdate, onDelete, onExpandImage }: any) {
  const [localLog, setLocalLog] = useState(log)
  const fileInputRef = useRef<HTMLInputElement>(null)

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

    const fd = new FormData()
    fd.append("file", files[0])

    try {
      const res = await fetch(`/api/admin/cleaning-logs/${log.id}/image`, { 
        method: "POST", 
        body: fd 
      })
      if (res.ok) {
        const updated = await res.json()
        onUpdate(log.id, "imageUrl", updated.imageUrl)
      }
    } catch (error) {
      toast({ title: "Error", description: "Error al subir la imagen." })
    }
  }

  return (
    <TableRow className="group hover:bg-slate-50 transition-all border-b border-slate-200">
      <TableCell className="py-8 px-4 text-center border-r border-slate-200 align-top">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => onDelete(localLog.id, localLog.areaCleaned)}
          className="h-8 w-8 text-slate-200 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all shadow-sm"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </TableCell>

      <TableCell className="py-8 px-4 border-r border-slate-200 text-center align-top">
        <div className="flex flex-col items-center gap-1.5 pt-1">
          <CalendarIcon className="h-4 w-4 text-slate-400" />
          <Input 
            type="date"
            value={localLog.date ? format(new Date(localLog.date), "yyyy-MM-dd") : ""}
            onChange={(e) => setLocalLog({ ...localLog, date: e.target.value })}
            onBlur={(e) => handleBlur("date", e.target.value)}
            className="border-0 bg-transparent focus-visible:ring-0 font-black text-slate-900 p-0 h-auto text-xs text-center"
          />
        </div>
      </TableCell>

      <TableCell className="py-8 px-4 border-r border-slate-200 text-center align-top">
        <div className="flex flex-col items-center gap-1.5 pt-1">
          <Clock className="h-4 w-4 text-slate-400" />
          <Input 
            value={localLog.time}
            placeholder="00:00 AM"
            onChange={(e) => setLocalLog({ ...localLog, time: e.target.value })}
            onBlur={(e) => handleBlur("time", e.target.value)}
            className="border-0 bg-transparent focus-visible:ring-0 font-black text-slate-900 p-0 h-auto text-xs text-center uppercase"
          />
        </div>
      </TableCell>

      <TableCell className="py-8 px-6 border-r border-slate-200 align-top">
        <Textarea 
          value={localLog.areaCleaned}
          placeholder="ESPECIFICAR ÁREA..."
          onChange={(e) => setLocalLog({ ...localLog, areaCleaned: e.target.value })}
          onBlur={(e) => handleBlur("areaCleaned", e.target.value)}
          className="border-0 bg-transparent focus-visible:ring-0 font-black text-slate-900 placeholder:text-slate-100 min-h-[100px] p-0 text-sm uppercase tracking-tight resize-none overflow-hidden leading-tight"
        />
      </TableCell>

      <TableCell className="py-8 px-6 border-r border-slate-200 align-top">
        <div className="relative group/img w-[110px] h-[80px] mx-auto">
          <div 
            className="w-full h-full bg-slate-50 border-2 border-slate-300 rounded-2xl overflow-hidden flex items-center justify-center cursor-pointer transition-all hover:border-green-600 hover:ring-8 ring-green-50 shadow-sm"
            onClick={() => localLog.imageUrl ? onExpandImage(localLog.imageUrl) : null}
          >
            {localLog.imageUrl ? (
              <img src={localLog.imageUrl} alt="Clean" className="w-full h-full object-cover" />
            ) : (
              <div className="flex flex-col items-center gap-1 opacity-20 text-slate-900">
                 <ImageIcon className="h-5 w-5" />
                 <span className="text-[8px] font-black uppercase">FOTO</span>
              </div>
            )}
          </div>
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="absolute -top-2 -right-2 bg-green-600 text-white p-2 rounded-xl shadow-lg opacity-0 group-hover/img:opacity-100 transition-all z-10 border-2 border-white"
          >
            <Camera className="h-3 w-3" />
          </button>
          <input type="file" ref={fileInputRef} className="hidden" accept="image/*" capture="environment" onChange={handleImageUpload} />
          {localLog.imageUrl && (
            <button 
              onClick={(e) => { e.stopPropagation(); onUpdate(localLog.id, "imageUrl", null); }}
              className="absolute -bottom-2 -right-2 bg-red-600 text-white p-1.5 rounded-xl shadow-lg opacity-0 group-hover/img:opacity-100 transition-all z-10 border-2 border-white"
            >
              <Trash className="h-3 w-3" />
            </button>
          )}
        </div>
      </TableCell>

      <TableCell className="py-8 px-6 border-r border-slate-200 bg-slate-50/30 align-top">
        <Textarea 
          value={localLog.tasksCompleted}
          placeholder="DETALLE DE TAREAS..."
          onChange={(e) => setLocalLog({ ...localLog, tasksCompleted: e.target.value })}
          onBlur={(e) => handleBlur("tasksCompleted", e.target.value)}
          className="border-0 bg-transparent focus-visible:ring-0 min-h-[150px] p-0 text-xs font-bold text-slate-700 resize-none overflow-hidden leading-relaxed uppercase placeholder:text-slate-100"
        />
      </TableCell>

      <TableCell className="py-8 px-6 border-r border-slate-200 align-top">
        <Textarea 
          value={localLog.cleanedBy}
          placeholder="NOMBRE DEL PERSONAL..."
          onChange={(e) => setLocalLog({ ...localLog, cleanedBy: e.target.value })}
          onBlur={(e) => handleBlur("cleanedBy", e.target.value)}
          className="border-0 bg-transparent focus-visible:ring-0 font-black text-slate-900 text-center placeholder:text-slate-200 min-h-[100px] p-0 text-sm uppercase resize-none overflow-hidden leading-tight"
        />
      </TableCell>

      <TableCell className="py-8 px-6 border-r border-slate-200 text-center bg-blue-50/20 align-top">
        <Input 
          value={localLog.supervisorInitials}
          placeholder="INT"
          maxLength={5}
          onChange={(e) => setLocalLog({ ...localLog, supervisorInitials: e.target.value })}
          onBlur={(e) => handleBlur("supervisorInitials", e.target.value)}
          className="border-0 bg-transparent focus-visible:ring-0 font-black text-blue-700 text-center placeholder:text-blue-200 h-auto p-0 text-xl uppercase pt-1"
        />
      </TableCell>

      <TableCell className="py-8 px-8 bg-slate-50/30 align-top">
        <Textarea 
          value={localLog.notes}
          placeholder="COMENTARIOS ADICIONALES..."
          onChange={(e) => setLocalLog({ ...localLog, notes: e.target.value })}
          onBlur={(e) => handleBlur("notes", e.target.value)}
          className="border-0 bg-transparent focus-visible:ring-0 min-h-[150px] p-0 text-xs font-black text-slate-500 uppercase tracking-tight resize-none leading-tight placeholder:text-slate-100"
        />
      </TableCell>
    </TableRow>
  )
}
