"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { 
  Plus, 
  Search, 
  Trash2, 
  Send, 
  Copy, 
  ExternalLink, 
  CheckCircle2, 
  Clock, 
  Loader2,
  Check
} from "lucide-react"
import { Input } from "@/components/ui/input"
import Link from "next/link"
import { useToast } from "@/components/ui/use-toast"
import { formatCurrency } from "@/lib/utils"

export default function CustomerOrdersPage() {
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [sendingId, setSendingId] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    fetchOrders()
  }, [])

  const fetchOrders = async () => {
    try {
      const res = await fetch("/api/admin/customer-orders")
      if (!res.ok) throw new Error("Failed to fetch orders")
      const data = await res.json()
      setOrders(data)
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this order?")) return
    try {
      const res = await fetch(`/api/admin/customer-orders/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to delete")
      toast({ title: "Deleted", description: "Order has been deleted." })
      fetchOrders()
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" })
    }
  }

  const handleCopyLink = (id: string) => {
    const url = `${window.location.origin}/pay/${id}`
    navigator.clipboard.writeText(url)
    setCopiedId(id)
    toast({ title: "Link Copied", description: "Customer payment link copied to clipboard!" })
    setTimeout(() => setCopiedId(null), 2500)
  }

  const handleSendEmail = async (id: string) => {
    try {
      setSendingId(id)
      const res = await fetch(`/api/admin/customer-orders/${id}/send-email`, {
        method: "POST",
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to send email")

      toast({ 
        title: "Email Sent", 
        description: "Invoice link has been emailed to the customer." 
      })
      fetchOrders()
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" })
    } finally {
      setSendingId(null)
    }
  }

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    const nextStatus = currentStatus === "PAID" ? "SENT" : "PAID"
    try {
      const res = await fetch(`/api/admin/customer-orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      })
      if (!res.ok) throw new Error("Failed to update status")
      toast({ title: "Status Updated", description: `Order marked as ${nextStatus}` })
      fetchOrders()
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" })
    }
  }

  const filteredOrders = orders.filter(o => 
    o.customerName?.toLowerCase().includes(search.toLowerCase()) ||
    o.customerEmail?.toLowerCase().includes(search.toLowerCase()) ||
    (o.companyName && o.companyName.toLowerCase().includes(search.toLowerCase()))
  )

  const getStatusBadge = (status: string) => {
    switch(status) {
      case "PAID":
        return (
          <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" />
            Paid
          </Badge>
        )
      case "SENT":
        return (
          <Badge className="bg-blue-600 hover:bg-blue-600 text-white flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Sent
          </Badge>
        )
      case "CANCELLED":
        return <Badge variant="destructive">Cancelled</Badge>
      default:
        return <Badge variant="secondary">Draft</Badge>
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto pb-24">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Customer Orders</h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            Create customer invoices, accept ACH and Card payments, and track order status
          </p>
        </div>
        <Link href="/admin/customer-orders/new">
          <Button className="bg-slate-900 text-white hover:bg-slate-800">
            <Plus className="h-4 w-4 mr-2" />
            Create Invoice
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader className="pb-3 border-b">
          <div className="flex items-center">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search customers, emails, companies..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[110px]">Date</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Delivery</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ) : filteredOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                      No customer orders found. Click &quot;Create Invoice&quot; to generate your first invoice.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredOrders.map((order) => (
                    <TableRow key={order.id} className="hover:bg-slate-50/60">
                      <TableCell className="font-medium text-xs text-muted-foreground">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="font-semibold text-slate-900">{order.customerName}</div>
                        <div className="text-xs text-muted-foreground">{order.customerEmail}</div>
                        {order.companyName && (
                          <div className="text-xs font-medium text-slate-600 mt-0.5">
                            {order.companyName}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1 items-start">
                          <Badge variant="outline" className="text-[11px] font-normal">
                            {order.deliveryType === "PICKUP" ? "Pickup" : "Shipping"}
                          </Badge>
                          {order.deliveryDate && (
                            <span className="text-[11px] text-muted-foreground">
                              {new Date(order.deliveryDate).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-bold text-slate-900">{formatCurrency(order.totalAmount)}</div>
                        <div className="text-[11px] text-muted-foreground">
                          {order.items?.length || 0} item(s)
                        </div>
                      </TableCell>
                      <TableCell>
                        <button
                          onClick={() => handleToggleStatus(order.id, order.status)}
                          title="Click to toggle status"
                          className="cursor-pointer transition-opacity hover:opacity-80"
                        >
                          {getStatusBadge(order.status)}
                        </button>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Copy Payment Link */}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2 text-xs"
                            onClick={() => handleCopyLink(order.id)}
                            title="Copy Payment Link"
                          >
                            {copiedId === order.id ? (
                              <Check className="h-3.5 w-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                            <span className="ml-1 hidden md:inline">
                              {copiedId === order.id ? "Copied" : "Copy Link"}
                            </span>
                          </Button>

                          {/* Open Public Invoice View */}
                          <Link href={`/pay/${order.id}`} target="_blank">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 px-2 text-xs"
                              title="View Invoice Page"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                              <span className="ml-1 hidden md:inline">View</span>
                            </Button>
                          </Link>

                          {/* Send Email */}
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 px-2 text-xs"
                            disabled={sendingId === order.id}
                            onClick={() => handleSendEmail(order.id)}
                            title="Send invoice link to customer email"
                          >
                            {sendingId === order.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Send className="h-3.5 w-3.5" />
                            )}
                            <span className="ml-1 hidden md:inline">
                              {order.status === "DRAFT" ? "Send" : "Resend"}
                            </span>
                          </Button>

                          {/* Delete */}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                            onClick={() => handleDelete(order.id)}
                            title="Delete Order"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
