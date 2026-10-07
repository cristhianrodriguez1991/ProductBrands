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
  Check,
  Eye,
  Receipt,
  Loader2
} from "lucide-react"
import { Input } from "@/components/ui/input"
import Link from "next/link"
import { useToast } from "@/components/ui/use-toast"
import { formatCurrency } from "@/lib/utils"
import { formatInvoiceNumber } from "@/lib/invoice"
import { OrderDetailDialog } from "@/components/admin/OrderDetailDialog"

export default function CustomerOrdersPage() {
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("ALL")
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
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

  const openOrderDetail = (order: any) => {
    setSelectedOrder(order)
    setDetailOpen(true)
  }

  const filteredOrders = orders.filter(o => {
    const matchesSearch = 
      formatInvoiceNumber(o).toLowerCase().includes(search.toLowerCase()) ||
      o.customerName?.toLowerCase().includes(search.toLowerCase()) ||
      o.customerEmail?.toLowerCase().includes(search.toLowerCase()) ||
      (o.companyName && o.companyName.toLowerCase().includes(search.toLowerCase()))

    if (!matchesSearch) return false

    if (statusFilter === "PAID") return o.status === "PAID"
    if (statusFilter === "COMPLETED") return o.status === "COMPLETED"
    if (statusFilter === "UNPAID") return o.status === "SENT" || o.status === "DRAFT"

    return true
  })

  const countPaid = orders.filter(o => o.status === "PAID").length
  const countCompleted = orders.filter(o => o.status === "COMPLETED").length
  const countUnpaid = orders.filter(o => o.status === "SENT" || o.status === "DRAFT").length

  const getStatusBadge = (status: string) => {
    switch(status) {
      case "COMPLETED":
        return (
          <Badge className="bg-indigo-600 hover:bg-indigo-600 text-white flex items-center gap-1 font-semibold">
            <CheckCircle2 className="h-3 w-3" />
            Order Completed
          </Badge>
        )
      case "PAID":
        return (
          <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white flex items-center gap-1 font-semibold">
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
        <CardHeader className="pb-3 border-b space-y-3">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search invoice #, customers, emails..."
                className="pl-9 h-9 text-xs"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {/* Quick Status Filters */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <Button
                variant={statusFilter === "ALL" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("ALL")}
                className={`h-8 px-2.5 text-xs font-semibold ${statusFilter === "ALL" ? "bg-slate-900 text-white" : ""}`}
              >
                All ({orders.length})
              </Button>
              <Button
                variant={statusFilter === "PAID" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("PAID")}
                className={`h-8 px-2.5 text-xs font-semibold ${statusFilter === "PAID" ? "bg-emerald-600 text-white hover:bg-emerald-700" : "text-emerald-700 border-emerald-200 hover:bg-emerald-50"}`}
              >
                Paid ({countPaid})
              </Button>
              <Button
                variant={statusFilter === "COMPLETED" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("COMPLETED")}
                className={`h-8 px-2.5 text-xs font-semibold ${statusFilter === "COMPLETED" ? "bg-indigo-600 text-white hover:bg-indigo-700" : "text-indigo-700 border-indigo-200 hover:bg-indigo-50"}`}
              >
                Completed ({countCompleted})
              </Button>
              <Button
                variant={statusFilter === "UNPAID" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("UNPAID")}
                className={`h-8 px-2.5 text-xs font-semibold ${statusFilter === "UNPAID" ? "bg-blue-600 text-white hover:bg-blue-700" : ""}`}
              >
                Unpaid ({countUnpaid})
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[105px]">Invoice</TableHead>
                  <TableHead className="w-[100px]">Date</TableHead>
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
                    <TableCell colSpan={7} className="text-center py-10">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ) : filteredOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                      No customer orders found. Click &quot;Create Invoice&quot; to generate your first invoice.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredOrders.map((order) => (
                    <TableRow 
                      key={order.id} 
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                      onClick={() => openOrderDetail(order)}
                    >
                      <TableCell className="font-mono font-bold text-xs text-slate-900 group-hover:text-blue-600 underline-offset-2 group-hover:underline">
                        {formatInvoiceNumber(order)}
                      </TableCell>
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
                          {order.completedAt && (
                            <span className="text-[10px] text-indigo-600 font-semibold">
                              Done {new Date(order.completedAt).toLocaleDateString()}
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
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => openOrderDetail(order)}
                          title="Click to view details or change status"
                          className="cursor-pointer transition-opacity hover:opacity-80"
                        >
                          {getStatusBadge(order.status)}
                        </button>
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          {/* View details */}
                          <Button
                            variant="secondary"
                            size="sm"
                            className="h-8 px-2.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800"
                            onClick={() => openOrderDetail(order)}
                            title="Open customer info and order details"
                          >
                            <Eye className="h-3.5 w-3.5 mr-1 text-slate-600" />
                            <span>Details</span>
                          </Button>

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

      {/* Order Detail & Fulfillment Modal */}
      <OrderDetailDialog
        order={selectedOrder}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onOrderUpdated={fetchOrders}
      />
    </div>
  )
}
