"use client"

import { useState, useEffect } from "react"
import { useToast } from "@/components/ui/use-toast"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Plus, Trash2, Edit2, Calendar, FileText, CheckCircle, Circle } from "lucide-react"

type AccountPayable = {
  id: string
  supplierName: string
  amount: number
  dueDate: string
  lastDayToPay: string | null
  notes: string | null
  isPaid: boolean
  proofOfPaymentUrl: string | null
}

export default function AccountsPayablePage() {
  const [payables, setPayables] = useState<AccountPayable[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  
  // Payment Proof State
  const [payModalOpen, setPayModalOpen] = useState(false)
  const [payingItem, setPayingItem] = useState<AccountPayable | null>(null)
  const [proofFile, setProofFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  
  // Form State
  const [supplierName, setSupplierName] = useState("")
  const [amount, setAmount] = useState("")
  const [dueDate, setDueDate] = useState("")
  const [lastDayToPay, setLastDayToPay] = useState("")
  const [notes, setNotes] = useState("")
  
  const { toast } = useToast()

  const fetchPayables = async () => {
    try {
      const res = await fetch("/api/admin/accounts-payable")
      if (!res.ok) throw new Error("Failed to fetch")
      const data = await res.json()
      setPayables(data)
    } catch (e: any) {
      toast({ title: "Error", description: "Could not load accounts payable.", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPayables()
  }, [])

  const resetForm = () => {
    setSupplierName("")
    setAmount("")
    setDueDate("")
    setLastDayToPay("")
    setNotes("")
    setEditingId(null)
  }

  const openEditModal = (item: AccountPayable) => {
    setEditingId(item.id)
    setSupplierName(item.supplierName)
    setAmount(item.amount.toString())
    setDueDate(item.dueDate.split("T")[0])
    setLastDayToPay(item.lastDayToPay ? item.lastDayToPay.split("T")[0] : "")
    setNotes(item.notes || "")
    setIsModalOpen(true)
  }

  const handleSave = async () => {
    if (!supplierName || !amount || !dueDate) {
      toast({ title: "Validation Error", description: "Supplier Name, Amount, and Due Date are required.", variant: "destructive" })
      return
    }

    const payload = {
      supplierName,
      amount: parseFloat(amount),
      dueDate,
      lastDayToPay: lastDayToPay || null,
      notes
    }

    try {
      if (editingId) {
        const res = await fetch(`/api/admin/accounts-payable/${editingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        })
        if (!res.ok) throw new Error("Failed to update")
        toast({ title: "Updated", description: "Account payable updated successfully." })
      } else {
        const res = await fetch("/api/admin/accounts-payable", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        })
        if (!res.ok) throw new Error("Failed to create")
        toast({ title: "Created", description: "Account payable created successfully." })
      }
      setIsModalOpen(false)
      resetForm()
      fetchPayables()
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" })
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this record?")) return
    try {
      const res = await fetch(`/api/admin/accounts-payable/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to delete")
      toast({ title: "Deleted", description: "Record deleted successfully." })
      fetchPayables()
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" })
    }
  }

  const openPayModal = (item: AccountPayable) => {
    setPayingItem(item)
    setProofFile(null)
    setPayModalOpen(true)
  }

  const handleMarkAsPaid = async () => {
    if (!payingItem) return
    setUploading(true)
    try {
      let proofUrl = null
      if (proofFile) {
        const formData = new FormData()
        formData.append("file", proofFile)
        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          body: formData
        })
        if (!uploadRes.ok) throw new Error("Failed to upload proof of payment")
        const uploadData = await uploadRes.json()
        proofUrl = uploadData.url
      }

      const res = await fetch(`/api/admin/accounts-payable/${payingItem.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPaid: true, proofOfPaymentUrl: proofUrl })
      })
      if (!res.ok) throw new Error("Failed to mark as paid")
      toast({ title: "Success", description: "Marked as paid successfully." })
      setPayModalOpen(false)
      fetchPayables()
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" })
    } finally {
      setUploading(false)
    }
  }

  const totalUnpaid = payables.filter(p => !p.isPaid).reduce((sum, p) => sum + p.amount, 0)
  const totalPaid = payables.filter(p => p.isPaid).reduce((sum, p) => sum + p.amount, 0)

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Accounts Payable</h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            Keep track of your pending payments, due dates, and supplier invoices.
          </p>
        </div>
        <Dialog open={isModalOpen} onOpenChange={(val) => {
          setIsModalOpen(val)
          if (!val) resetForm()
        }}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" /> Add Record
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>{editingId ? "Edit Record" : "Add Account Payable"}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <label className="text-sm font-medium">Supplier Name *</label>
                <Input value={supplierName} onChange={e => setSupplierName(e.target.value)} placeholder="e.g. FedEx, Packaging Co." />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium">Amount to Pay *</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-muted-foreground text-sm">$</span>
                  <Input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} className="pl-7" placeholder="0.00" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <label className="text-sm font-medium">Due Date *</label>
                  <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
                </div>
                <div className="grid gap-2">
                  <label className="text-sm font-medium">Last Day To Pay</label>
                  <Input type="date" value={lastDayToPay} onChange={e => setLastDayToPay(e.target.value)} />
                </div>
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium">Notes</label>
                <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Invoice #12345, terms net 30..." />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleSave}>Save Record</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Unpaid</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600 dark:text-red-500">
              ${totalUnpaid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Paid</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600 dark:text-green-500">
              ${totalPaid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">Loading...</TableCell>
                </TableRow>
              ) : payables.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No accounts payable records found.</TableCell>
                </TableRow>
              ) : (
                payables.map((item) => (
                  <TableRow key={item.id} className={item.isPaid ? "opacity-60" : ""}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {item.isPaid ? (
                          <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200">
                            <CheckCircle className="h-3 w-3 mr-1" /> Paid
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200">
                            <Circle className="h-3 w-3 mr-1" /> Unpaid
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{item.supplierName}</TableCell>
                    <TableCell className="font-bold">
                      ${item.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="flex items-center gap-1 text-sm"><Calendar className="h-3 w-3" /> {new Date(item.dueDate).toLocaleDateString()}</span>
                        {item.lastDayToPay && (
                          <span className="text-xs text-red-500 mt-1">Last Day: {new Date(item.lastDayToPay).toLocaleDateString()}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate" title={item.notes || ""}>
                      {item.notes ? (
                        <span className="text-xs text-muted-foreground flex items-center gap-1"><FileText className="h-3 w-3"/> {item.notes}</span>
                      ) : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {!item.isPaid ? (
                          <Button variant="outline" size="sm" onClick={() => openPayModal(item)} className="text-green-600 border-green-200 hover:bg-green-50">
                            Mark as Paid
                          </Button>
                        ) : item.proofOfPaymentUrl ? (
                          <Button variant="outline" size="sm" onClick={() => window.open(item.proofOfPaymentUrl as string, "_blank")} className="text-blue-600 border-blue-200 hover:bg-blue-50">
                            View Proof
                          </Button>
                        ) : null}
                        <Button variant="ghost" size="icon" onClick={() => openEditModal(item)} className="h-8 w-8 text-blue-500 hover:text-blue-600 hover:bg-blue-50">
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)} className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <Dialog open={payModalOpen} onOpenChange={setPayModalOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Mark Invoice as Paid</DialogTitle>
          </DialogHeader>
          <div className="py-4 grid gap-4">
            <p className="text-sm text-muted-foreground">
              You are marking the invoice for <strong>{payingItem?.supplierName}</strong> (${payingItem?.amount.toFixed(2)}) as paid.
            </p>
            <div className="grid gap-2">
              <label className="text-sm font-medium">Upload Proof of Payment (Optional)</label>
              <Input type="file" onChange={(e) => setProofFile(e.target.files?.[0] || null)} accept="image/*,application/pdf" />
              <p className="text-xs text-muted-foreground">Attach a PDF or Image receipt for your records.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayModalOpen(false)}>Cancel</Button>
            <Button onClick={handleMarkAsPaid} disabled={uploading}>
              {uploading ? "Uploading & Saving..." : "Confirm Payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
