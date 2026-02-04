"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import { formatDate, formatCurrency, formatDateTime } from "@/lib/utils"
import { Send } from "lucide-react"

export default function QuoteManageForm({ quote }: { quote: any }) {
  const router = useRouter()
  const { toast } = useToast()
  const [status, setStatus] = useState(quote.status)
  const [adminNotes, setAdminNotes] = useState(quote.adminNotes || "")
  const [totalEstimate, setTotalEstimate] = useState(quote.totalEstimate?.toString() || "")
  const [lineItems, setLineItems] = useState(quote.lineItems || [])
  const [newLineItem, setNewLineItem] = useState({
    description: "",
    quantity: "",
    unitPrice: "",
    notes: "",
  })
  const [messageText, setMessageText] = useState("")
  const [messages, setMessages] = useState(quote.quoteMessages || [])
  const [loading, setLoading] = useState(false)
  const [sendingMessage, setSendingMessage] = useState(false)

  const handleAddLineItem = () => {
    if (!newLineItem.description) return

    const quantity = parseInt(newLineItem.quantity) || 0
    const unitPrice = parseFloat(newLineItem.unitPrice) || 0
    const totalPrice = quantity * unitPrice

    setLineItems([
      ...lineItems,
      {
        id: `temp-${Date.now()}`,
        description: newLineItem.description,
        quantity,
        unitPrice,
        totalPrice,
        notes: newLineItem.notes,
      },
    ])

    setNewLineItem({ description: "", quantity: "", unitPrice: "", notes: "" })
  }

  const handleSave = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/quotes/${quote.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          adminNotes,
          totalEstimate: totalEstimate ? parseFloat(totalEstimate) : null,
          lineItems,
        }),
      })

      if (!res.ok) throw new Error("Failed to update quote")

      toast({
        title: "Success",
        description: "Quote updated successfully",
      })
      router.refresh()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update quote",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Quote Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NEW">New</SelectItem>
                <SelectItem value="NEEDS_INFO">Needs Info</SelectItem>
                <SelectItem value="PRICING">Pricing</SelectItem>
                <SelectItem value="SENT">Sent</SelectItem>
                <SelectItem value="APPROVED">Approved</SelectItem>
                <SelectItem value="REJECTED">Rejected</SelectItem>
                <SelectItem value="EXPIRED">Expired</SelectItem>
                <SelectItem value="ORDERED">Ordered</SelectItem>
                {/* Legacy */}
                <SelectItem value="DRAFT">Draft</SelectItem>
                <SelectItem value="SUBMITTED">Submitted</SelectItem>
                <SelectItem value="IN_REVIEW">In Review</SelectItem>
                <SelectItem value="ACCEPTED">Accepted</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Admin Notes</Label>
            <Textarea
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              rows={4}
            />
          </div>
          <div>
            <Label>Total Estimate</Label>
            <Input
              type="number"
              step="0.01"
              value={totalEstimate}
              onChange={(e) => setTotalEstimate(e.target.value)}
              placeholder="0.00"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Line Items</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {lineItems.map((item: any) => (
            <div key={item.id} className="border-b pb-4">
              <p className="font-medium">{item.description}</p>
              {item.quantity && (
                <p className="text-sm text-muted-foreground">
                  Qty: {item.quantity} × {formatCurrency(item.unitPrice)} ={" "}
                  {formatCurrency(item.totalPrice)}
                </p>
              )}
              {item.notes && <p className="text-sm text-muted-foreground mt-2">{item.notes}</p>}
            </div>
          ))}

          <div className="space-y-2 pt-4 border-t">
            <Label>Add Line Item</Label>
            <Input
              placeholder="Description"
              value={newLineItem.description}
              onChange={(e) =>
                setNewLineItem({ ...newLineItem, description: e.target.value })
              }
            />
            <div className="grid grid-cols-2 gap-2">
              <Input
                type="number"
                placeholder="Quantity"
                value={newLineItem.quantity}
                onChange={(e) =>
                  setNewLineItem({ ...newLineItem, quantity: e.target.value })
                }
              />
              <Input
                type="number"
                step="0.01"
                placeholder="Unit Price"
                value={newLineItem.unitPrice}
                onChange={(e) =>
                  setNewLineItem({ ...newLineItem, unitPrice: e.target.value })
                }
              />
            </div>
            <Textarea
              placeholder="Notes (optional)"
              value={newLineItem.notes}
              onChange={(e) =>
                setNewLineItem({ ...newLineItem, notes: e.target.value })
              }
              rows={2}
            />
            <Button type="button" onClick={handleAddLineItem} variant="outline">
              Add Line Item
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Message Thread</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {messages.map((msg: any) => (
              <div
                key={msg.id}
                className={`p-3 rounded-lg ${
                  msg.senderType === "ADMIN"
                    ? "bg-blue-50 border border-blue-200"
                    : "bg-gray-50 border border-gray-200"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">
                    {msg.senderUser?.name || msg.senderUser?.email || "Client"}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatDateTime(msg.createdAt)}
                  </span>
                </div>
                <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
              </div>
            ))}
            {messages.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No messages yet
              </p>
            )}
          </div>
          <div className="flex gap-2 pt-2 border-t">
            <Textarea
              placeholder="Type a message to the client..."
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              rows={3}
              className="flex-1"
            />
            <Button
              onClick={handleSendMessage}
              disabled={sendingMessage || !messageText.trim()}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button onClick={handleStatusUpdate} disabled={loading} className="flex-1">
          {loading ? "Saving..." : "Update Status"}
        </Button>
        <Button onClick={handleSaveLineItems} disabled={loading} variant="outline" className="flex-1">
          Save Line Items
        </Button>
        {status === "APPROVED" && !quote.orders?.length && (
          <Button onClick={handleConvertToOrder} disabled={loading} variant="default">
            Convert to Order
          </Button>
        )}
      </div>
    </div>
  )
}

