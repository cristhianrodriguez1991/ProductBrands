"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { 
  Plus, 
  Search, 
  MoreVertical, 
  Settings, 
  Trash2, 
  Wrench, 
  AlertTriangle, 
  CheckCircle2, 
  ExternalLink,
  Cpu,
  Clock,
  MapPin,
  Calendar
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/use-toast"
import { formatDate } from "@/lib/utils"

export default function MachinesPage() {
  const router = useRouter()
  const [machines, setMachines] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingMachine, setEditingMachine] = useState<any>(null)
  
  // Form State
  const [formData, setFormData] = useState({
    name: "",
    modelNumber: "",
    serialNumber: "",
    manufacturer: "",
    purchaseDate: "",
    lastMaintenance: "",
    nextMaintenance: "",
    status: "OPERATIONAL",
    location: "",
    notes: "",
    imageUrl: "",
    manualUrl: "",
  })

  useEffect(() => {
    fetchMachines()
  }, [])

  const fetchMachines = async () => {
    try {
      const res = await fetch("/api/admin/machines")
      if (res.ok) {
        const data = await res.json()
        setMachines(data)
      }
    } catch (error) {
      console.error("Failed to fetch machines", error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateOrUpdate = async () => {
    if (!formData.name) {
      toast({
        title: "Error",
        description: "Name is required",
        variant: "destructive",
      })
      return
    }

    try {
      const method = editingMachine ? "PATCH" : "POST"
      const url = editingMachine 
        ? `/api/admin/machines/${editingMachine.id}` 
        : "/api/admin/machines"
      
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (res.ok) {
        toast({
          title: editingMachine ? "Machine Updated" : "Machine Created",
          description: `The machine ${formData.name} has been saved successfully.`,
        })
        setIsDialogOpen(false)
        setEditingMachine(null)
        resetForm()
        fetchMachines()
      } else {
        throw new Error("Failed to save")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Something went wrong while saving the machine.",
        variant: "destructive",
      })
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete the machine "${name}"?`)) return

    try {
      const res = await fetch(`/api/admin/machines/${id}`, {
        method: "DELETE",
      })

      if (res.ok) {
        toast({
          title: "Machine Deleted",
          description: `The machine ${name} has been removed.`,
        })
        fetchMachines()
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete machine",
        variant: "destructive",
      })
    }
  }

  const resetForm = () => {
    setFormData({
      name: "",
      modelNumber: "",
      serialNumber: "",
      manufacturer: "",
      purchaseDate: "",
      lastMaintenance: "",
      nextMaintenance: "",
      status: "OPERATIONAL",
      location: "",
      notes: "",
      imageUrl: "",
      manualUrl: "",
    })
  }

  const openEditDialog = (machine: any) => {
    setEditingMachine(machine)
    setFormData({
      name: machine.name || "",
      modelNumber: machine.modelNumber || "",
      serialNumber: machine.serialNumber || "",
      manufacturer: machine.manufacturer || "",
      purchaseDate: machine.purchaseDate ? new Date(machine.purchaseDate).toISOString().split('T')[0] : "",
      lastMaintenance: machine.lastMaintenance ? new Date(machine.lastMaintenance).toISOString().split('T')[0] : "",
      nextMaintenance: machine.nextMaintenance ? new Date(machine.nextMaintenance).toISOString().split('T')[0] : "",
      status: machine.status || "OPERATIONAL",
      location: machine.location || "",
      notes: machine.notes || "",
      imageUrl: machine.imageUrl || "",
      manualUrl: machine.manualUrl || "",
    })
    setIsDialogOpen(true)
  }

  const filteredMachines = machines.filter(m => 
    m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.manufacturer?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.serialNumber?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "OPERATIONAL":
        return <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-0 flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Operational</Badge>
      case "MAINTENANCE":
        return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-0 flex items-center gap-1"><Wrench className="h-3 w-3" /> Maintenance</Badge>
      case "DOWN":
        return <Badge className="bg-red-100 text-red-700 hover:bg-red-100 border-0 flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Down</Badge>
      case "DECOMMISSIONED":
        return <Badge className="bg-gray-100 text-gray-700 hover:bg-gray-100 border-0">Decommissioned</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <Cpu className="h-8 w-8 text-blue-600" />
            Machine Information
          </h1>
          <p className="text-slate-500 mt-1">Manage and track production machinery and maintenance cycles.</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open)
          if (!open) {
            setEditingMachine(null)
            resetForm()
          }
        }}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-6 font-bold shadow-lg shadow-blue-100 transition-all gap-2 h-12">
              <Plus className="h-5 w-5" /> Add Machine
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl rounded-3xl p-0 overflow-hidden border-0 shadow-2xl">
            <DialogHeader className="p-8 bg-slate-50 border-b">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center shadow-sm">
                  <Cpu className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <DialogTitle className="text-2xl font-black text-slate-900">
                    {editingMachine ? "Edit Machine" : "Add New Machine"}
                  </DialogTitle>
                  <DialogDescription className="text-slate-500 font-medium">
                    {editingMachine ? "Update existing machine details and maintenance status." : "Register a new machine in the production inventory."}
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-400">Machine Name *</Label>
                <Input 
                  placeholder="e.g. Injection Molding A1" 
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="rounded-xl border-slate-200 h-11 focus:ring-4 ring-blue-50"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-400">Status</Label>
                <Select 
                  value={formData.status} 
                  onValueChange={(v) => setFormData({...formData, status: v})}
                >
                  <SelectTrigger className="rounded-xl border-slate-200 h-11">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-slate-200">
                    <SelectItem value="OPERATIONAL">Operational</SelectItem>
                    <SelectItem value="MAINTENANCE">In Maintenance</SelectItem>
                    <SelectItem value="DOWN">System Down</SelectItem>
                    <SelectItem value="DECOMMISSIONED">Decommissioned</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-400">Manufacturer</Label>
                <Input 
                  placeholder="e.g. Arburg" 
                  value={formData.manufacturer}
                  onChange={(e) => setFormData({...formData, manufacturer: e.target.value})}
                  className="rounded-xl border-slate-200 h-11"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-400">Model / Serial</Label>
                <div className="flex gap-2">
                  <Input 
                    placeholder="Model" 
                    value={formData.modelNumber}
                    onChange={(e) => setFormData({...formData, modelNumber: e.target.value})}
                    className="rounded-xl border-slate-200 h-11"
                  />
                  <Input 
                    placeholder="Serial" 
                    value={formData.serialNumber}
                    onChange={(e) => setFormData({...formData, serialNumber: e.target.value})}
                    className="rounded-xl border-slate-200 h-11"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-400">Purchase Date</Label>
                <Input 
                  type="date" 
                  value={formData.purchaseDate}
                  onChange={(e) => setFormData({...formData, purchaseDate: e.target.value})}
                  className="rounded-xl border-slate-200 h-11"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-400">Location</Label>
                <Input 
                  placeholder="e.g. Floor 1, Zone B" 
                  value={formData.location}
                  onChange={(e) => setFormData({...formData, location: e.target.value})}
                  className="rounded-xl border-slate-200 h-11"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-400">Last Maintenance</Label>
                <Input 
                  type="date" 
                  value={formData.lastMaintenance}
                  onChange={(e) => setFormData({...formData, lastMaintenance: e.target.value})}
                  className="rounded-xl border-slate-200 h-11"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-400">Next Scheduled</Label>
                <Input 
                  type="date" 
                  value={formData.nextMaintenance}
                  onChange={(e) => setFormData({...formData, nextMaintenance: e.target.value})}
                  className="rounded-xl border-slate-200 h-11 ring-offset-2 ring-2 ring-blue-100"
                />
              </div>
              <div className="col-span-full space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-400">Internal Notes</Label>
                <Textarea 
                  placeholder="Any specific instructions, common issues, or setup details..." 
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  className="rounded-xl border-slate-200 min-h-[100px]"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-400">Manual / Link URL</Label>
                <Input 
                  placeholder="https://..." 
                  value={formData.manualUrl}
                  onChange={(e) => setFormData({...formData, manualUrl: e.target.value})}
                  className="rounded-xl border-slate-200 h-11"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-400">Image URL</Label>
                <Input 
                  placeholder="https://..." 
                  value={formData.imageUrl}
                  onChange={(e) => setFormData({...formData, imageUrl: e.target.value})}
                  className="rounded-xl border-slate-200 h-11"
                />
              </div>
            </div>

            <DialogFooter className="p-8 bg-slate-50 border-t">
              <Button 
                variant="ghost" 
                onClick={() => setIsDialogOpen(false)}
                className="font-bold text-slate-500 rounded-xl px-6"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleCreateOrUpdate}
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-8 font-black transition-all"
              >
                {editingMachine ? "Update Machine" : "Create Machine"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-0 shadow-2xl rounded-3xl overflow-hidden bg-white">
        <CardHeader className="bg-slate-50 border-b p-6">
          <div className="flex items-center gap-4 bg-white px-4 py-2 rounded-2xl border border-slate-200 shadow-sm max-w-md">
            <Search className="h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Search by name, manufacturer or serial..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="border-0 bg-transparent focus-visible:ring-0 h-8 p-0 text-sm"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-20 text-center animate-pulse text-slate-400 font-bold">Loading machines...</div>
          ) : filteredMachines.length === 0 ? (
            <div className="py-20 text-center">
              <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-slate-200">
                <Cpu className="h-8 w-8" />
              </div>
              <p className="text-slate-400 font-bold">No machines found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-0">
                    <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400 py-6 px-6">Machine</TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400 py-6 px-4">Identification</TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400 py-6 px-4">Status</TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400 py-6 px-4">Location</TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400 py-6 px-4">Next Maint.</TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400 py-6 px-6 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMachines.map((m) => (
                    <TableRow key={m.id} className="group hover:bg-slate-50/50 transition-colors border-slate-50">
                      <TableCell className="py-4 px-6">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                            {m.imageUrl ? (
                              <img src={m.imageUrl} alt={m.name} className="w-full h-full object-cover" />
                            ) : (
                              <Cpu className="h-5 w-5 text-slate-300" />
                            )}
                          </div>
                          <div>
                            <p className="font-black text-slate-900 leading-tight">{m.name}</p>
                            <p className="text-xs text-slate-400 font-medium mt-0.5">{m.manufacturer || "Generic Manufacturer"}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-4 px-4">
                        <div className="flex flex-col gap-1">
                          <p className="text-xs font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md inline-block max-w-fit">{m.modelNumber || "N/A"}</p>
                          <p className="text-[10px] text-slate-400 font-mono tracking-tighter">{m.serialNumber || "NO SERIAL"}</p>
                        </div>
                      </TableCell>
                      <TableCell className="py-4 px-4">
                        {getStatusBadge(m.status)}
                      </TableCell>
                      <TableCell className="py-4 px-4">
                        <div className="flex items-center gap-1.5 text-slate-500 text-xs font-bold">
                          <MapPin className="h-3 w-3 text-slate-300" />
                          {m.location || "Floating / Unknown"}
                        </div>
                      </TableCell>
                      <TableCell className="py-4 px-4">
                        {m.nextMaintenance ? (
                          <div className={cn(
                            "flex items-center gap-1.5 text-xs font-bold whitespace-nowrap",
                            new Date(m.nextMaintenance) < new Date() ? "text-red-500" : "text-blue-600"
                          )}>
                            <Clock className="h-3 w-3" />
                            {new Date(m.nextMaintenance).toLocaleDateString()}
                          </div>
                        ) : (
                          <span className="text-slate-300 italic text-[10px]">No schedule</span>
                        )}
                      </TableCell>
                      <TableCell className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          {m.manualUrl && (
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => window.open(m.manualUrl, '_blank')}
                              className="h-9 w-9 rounded-xl text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                              title="View Manual"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          )}
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => openEditDialog(m)}
                            className="h-9 w-9 rounded-xl text-slate-400 hover:text-slate-900 hover:bg-slate-100"
                            title="Edit"
                          >
                            <Settings className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleDelete(m.id, m.name)}
                            className="h-9 w-9 rounded-xl text-slate-300 hover:text-red-600 hover:bg-red-50"
                            title="Delete"
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

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f8fafc;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #cbd5e1;
        }
      `}</style>
    </div>
  )
}

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(" ")
}
