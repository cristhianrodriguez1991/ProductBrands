"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { 
  Plus, 
  Search, 
  Settings, 
  Trash2, 
  ExternalLink,
  Cpu,
  Maximize2,
  Table as TableIcon
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/use-toast"

export default function MachineSetupPage() {
  const [setups, setSetups] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingSetup, setEditingSetup] = useState<any>(null)
  const [expandedImage, setExpandedImage] = useState<string | null>(null)
  
  // Form State
  const [formData, setFormData] = useState({
    productName: "",
    weightGrams: "",
    description: "",
    bagSize: "",
    presetSpeed: "",
    actualSpeed: "",
    additionalChanges: "",
    productImageUrl: "",
    weightingImageUrl: "",
    packagingImageUrl: "",
    parametersImageUrl: "",
  })

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

  const handleCreateOrUpdate = async () => {
    if (!formData.productName) {
      toast({
        title: "Error",
        description: "Product Name is required",
        variant: "destructive",
      })
      return
    }

    try {
      const method = editingSetup ? "PATCH" : "POST"
      const url = editingSetup 
        ? `/api/admin/machines/${editingSetup.id}` 
        : "/api/admin/machines"
      
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (res.ok) {
        toast({
          title: editingSetup ? "Setup Updated" : "Setup Created",
          description: `Machine configuration for ${formData.productName} has been saved.`,
        })
        setIsDialogOpen(false)
        setEditingSetup(null)
        resetForm()
        fetchSetups()
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Something went wrong while saving.",
        variant: "destructive",
      })
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete configuration for "${name}"?`)) return

    try {
      const res = await fetch(`/api/admin/machines/${id}`, { method: "DELETE" })
      if (res.ok) {
        toast({ title: "Deleted", description: "Configuration removed." })
        fetchSetups()
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete", variant: "destructive" })
    }
  }

  const resetForm = () => {
    setFormData({
      productName: "",
      weightGrams: "",
      description: "",
      bagSize: "",
      presetSpeed: "",
      actualSpeed: "",
      additionalChanges: "",
      productImageUrl: "",
      weightingImageUrl: "",
      packagingImageUrl: "",
      parametersImageUrl: "",
    })
  }

  const openEditDialog = (setup: any) => {
    setEditingSetup(setup)
    setFormData({
      productName: setup.productName || "",
      weightGrams: setup.weightGrams || "",
      description: setup.description || "",
      bagSize: setup.bagSize || "",
      presetSpeed: setup.presetSpeed || "",
      actualSpeed: setup.actualSpeed || "",
      additionalChanges: setup.additionalChanges || "",
      productImageUrl: setup.productImageUrl || "",
      weightingImageUrl: setup.weightingImageUrl || "",
      packagingImageUrl: setup.packagingImageUrl || "",
      parametersImageUrl: setup.parametersImageUrl || "",
    })
    setIsDialogOpen(true)
  }

  const filteredSetups = setups.filter(s => 
    s.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.description?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const ImageCell = ({ url, label }: { url: string, label: string }) => (
    <div className="relative group w-[100px] h-[70px] bg-slate-100 rounded-lg border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center cursor-pointer" onClick={() => setExpandedImage(url)}>
      {url ? (
        <>
          <img src={url} alt={label} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <Maximize2 className="h-4 w-4 text-white" />
          </div>
        </>
      ) : (
        <span className="text-[10px] text-slate-300 font-bold uppercase">{label}</span>
      )}
    </div>
  )

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <TableIcon className="h-8 w-8 text-blue-600" />
            Machine Setup by Product
          </h1>
          <p className="text-slate-500 mt-1 font-medium">Technical manual for machine configuration per product.</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open)
          if (!open) {
            setEditingSetup(null)
            resetForm()
          }
        }}>
          <DialogTrigger asChild>
            <Button className="bg-[#1e293b] hover:bg-black text-white rounded-xl px-6 font-bold shadow-lg transition-all gap-2 h-12">
              <Plus className="h-5 w-5" /> New Product Setup
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl rounded-3xl p-0 overflow-hidden border-0 shadow-2xl">
            <DialogHeader className="p-8 bg-slate-50 border-b">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center shadow-sm">
                  <Settings className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <DialogTitle className="text-2xl font-black text-slate-900">
                    {editingSetup ? "Edit Configuration" : "New Configuration"}
                  </DialogTitle>
                  <DialogDescription className="text-slate-500 font-medium">
                    Technical parameters for specialized machine setup.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
              <div className="md:col-span-2 space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-slate-400">Product Name *</Label>
                  <Input 
                    placeholder="e.g. Starbucks French Roast 12oz" 
                    value={formData.productName}
                    onChange={(e) => setFormData({...formData, productName: e.target.value})}
                    className="rounded-xl border-slate-200 h-11"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-400">Weight in Grams</Label>
                    <Input 
                      placeholder="e.g. 340 grams" 
                      value={formData.weightGrams}
                      onChange={(e) => setFormData({...formData, weightGrams: e.target.value})}
                      className="rounded-xl border-slate-200 h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-400">Bag Size</Label>
                    <Input 
                      placeholder="e.g. 210mm x 240mm" 
                      value={formData.bagSize}
                      onChange={(e) => setFormData({...formData, bagSize: e.target.value})}
                      className="rounded-xl border-slate-200 h-11"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-400">Preset Speed</Label>
                    <Input 
                      placeholder="e.g. 45/min" 
                      value={formData.presetSpeed}
                      onChange={(e) => setFormData({...formData, presetSpeed: e.target.value})}
                      className="rounded-xl border-slate-200 h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-400">Actual Speed</Label>
                    <Input 
                      placeholder="e.g. 22min" 
                      value={formData.actualSpeed}
                      onChange={(e) => setFormData({...formData, actualSpeed: e.target.value})}
                      className="rounded-xl border-slate-200 h-11"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-slate-400">Technical Description</Label>
                  <Textarea 
                    placeholder="Details about the mixture, density, etc." 
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    className="rounded-xl border-slate-200 min-h-[80px]"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-slate-400">Additional Changes / Notes</Label>
                  <Textarea 
                    placeholder="Physical adjustments (sponges, vibration, etc.)" 
                    value={formData.additionalChanges}
                    onChange={(e) => setFormData({...formData, additionalChanges: e.target.value})}
                    className="rounded-xl border-slate-200 min-h-[80px]"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-slate-400">Product Image URL</Label>
                  <Input 
                    value={formData.productImageUrl}
                    onChange={(e) => setFormData({...formData, productImageUrl: e.target.value})}
                    className="rounded-xl border-slate-200 h-10 text-xs"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-slate-400">Weighting Machine Image URL</Label>
                  <Input 
                    value={formData.weightingImageUrl}
                    onChange={(e) => setFormData({...formData, weightingImageUrl: e.target.value})}
                    className="rounded-xl border-slate-200 h-10 text-xs"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-slate-400">Packaging Machine Image URL</Label>
                  <Input 
                    value={formData.packagingImageUrl}
                    onChange={(e) => setFormData({...formData, packagingImageUrl: e.target.value})}
                    className="rounded-xl border-slate-200 h-10 text-xs"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-slate-400">Parameters Screen Image URL</Label>
                  <Input 
                    value={formData.parametersImageUrl}
                    onChange={(e) => setFormData({...formData, parametersImageUrl: e.target.value})}
                    className="rounded-xl border-slate-200 h-10 text-xs"
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="p-8 bg-slate-50 border-t">
              <Button variant="ghost" onClick={() => setIsDialogOpen(false)} className="rounded-xl px-6">Cancel</Button>
              <Button onClick={handleCreateOrUpdate} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-8 font-black">Save Configuration</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-0 shadow-2xl rounded-[2.5rem] overflow-hidden bg-white">
        <CardHeader className="bg-slate-50/50 border-b p-6 flex flex-row items-center justify-between">
          <div className="flex items-center gap-4 bg-white px-4 py-2 rounded-2xl border border-slate-200 shadow-sm w-full max-w-sm">
            <Search className="h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Search products..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="border-0 bg-transparent focus-visible:ring-0 h-8 p-0 text-sm"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-20 text-center animate-pulse text-slate-400 font-bold">Loading configurations...</div>
          ) : filteredSetups.length === 0 ? (
            <div className="py-20 text-center text-slate-400 font-bold">No setups found.</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-[#2c4c3b] hover:bg-[#2c4c3b] border-0">
                    <TableHead className="font-black text-[10px] uppercase tracking-widest text-white/80 py-6 px-6">Product</TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-widest text-white/80 py-6 px-4">Weight (g)</TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-widest text-white/80 py-6 px-4">Reference Pictures</TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-widest text-white/80 py-6 px-4 min-w-[250px]">Description</TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-widest text-white/80 py-6 px-4">Bag Size</TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-widest text-white/80 py-6 px-4 text-center">Speeds (Pr/Ac)</TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-widest text-white/80 py-6 px-4">Additional Changes</TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-widest text-white/80 py-6 px-6 text-right">Edit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSetups.map((s) => (
                    <TableRow key={s.id} className="group hover:bg-slate-50 transition-colors border-slate-50">
                      <TableCell className="py-6 px-6 font-black text-slate-900 border-r">{s.productName}</TableCell>
                      <TableCell className="py-6 px-4 font-bold text-slate-600 border-r">{s.weightGrams || "—"}</TableCell>
                      <TableCell className="py-6 px-4 border-r">
                        <div className="flex gap-2">
                          <ImageCell url={s.productImageUrl} label="Prod" />
                          <ImageCell url={s.weightingImageUrl} label="Wght" />
                          <ImageCell url={s.packagingImageUrl} label="Pack" />
                          <ImageCell url={s.parametersImageUrl} label="Param" />
                        </div>
                      </TableCell>
                      <TableCell className="py-6 px-4 text-xs font-medium text-slate-500 border-r leading-relaxed">{s.description || "—"}</TableCell>
                      <TableCell className="py-6 px-4 font-bold text-slate-700 bg-blue-50/30 border-r text-center">{s.bagSize || "—"}</TableCell>
                      <TableCell className="py-6 px-4 border-r">
                        <div className="flex flex-col items-center">
                          <span className="text-xs font-black text-blue-600">{s.presetSpeed || "—"}</span>
                          <span className="text-[10px] font-bold text-slate-400 mt-1">{s.actualSpeed || "—"}</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-6 px-4 text-[10px] font-bold text-orange-600 border-r leading-tight uppercase tracking-tight">{s.additionalChanges || "—"}</TableCell>
                      <TableCell className="py-6 px-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => openEditDialog(s)}
                            className="h-10 w-10 border border-slate-200 rounded-xl hover:bg-slate-100"
                          >
                            <Settings className="h-4 w-4 text-slate-600" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleDelete(s.id, s.productName)}
                            className="h-10 w-10 border border-slate-100 rounded-xl hover:bg-red-50 text-red-300 hover:text-red-500"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* FULLSCREEN IMAGE DIALOG */}
      <Dialog open={!!expandedImage} onOpenChange={() => setExpandedImage(null)}>
        <DialogContent className="max-w-5xl p-0 border-0 bg-black/90 shadow-none">
          {expandedImage && (
            <div className="relative w-full aspect-video flex items-center justify-center p-4">
              <img src={expandedImage} alt="Setup Reference" className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl" />
            </div>
          )}
        </DialogContent>
      </Dialog>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #f8fafc; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
      `}</style>
    </div>
  )
}
