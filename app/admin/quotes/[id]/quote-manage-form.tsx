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
import { formatDateTime } from "@/lib/utils"
import { Send, Mail, Clock } from "lucide-react"

export default function QuoteManageForm({ quote }: { quote: any }) {
  const router = useRouter()
  const { toast } = useToast()
  const [status, setStatus] = useState(quote.status)
  const [adminNotes, setAdminNotes] = useState(quote.adminNotes || "")
  const [totalEstimate, setTotalEstimate] = useState(quote.totalEstimate?.toString() || "")
  const [messageText, setMessageText] = useState("")
  const [messages, setMessages] = useState(quote.quoteMessages || [])
  const [loading, setLoading] = useState(false)
  const [sendingMessage, setSendingMessage] = useState(false)
  const [emailSubject, setEmailSubject] = useState("Re: Your quote request – Product Brands")
  const [emailBody, setEmailBody] = useState("")
  const [sendingEmail, setSendingEmail] = useState(false)

  const insertAdminNotesTimestamp = () => {
    const stamp = `\n\n--- ${formatDateTime(new Date())} ---\n`
    setAdminNotes((prev: string) => prev + stamp)
  }

  const handleStatusUpdate = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/quotes/${quote.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          internalNotes: adminNotes,
        }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || "Failed to update quote status")
      }

      toast({
        title: "Success",
        description: "Quote status updated successfully",
      })
      router.refresh()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update quote status",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleConvertToOrder = async () => {
    if (!confirm("Convert this quote to an order? This action cannot be undone.")) {
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`/api/admin/quotes/${quote.id}/convert-to-order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || "Failed to convert quote to order")
      }

      const order = await res.json()
      toast({
        title: "Success",
        description: `Quote converted to order ${order.orderNumber}`,
      })
      router.push(`/admin/orders/${order.id}`)
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to convert quote to order",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSendMessage = async () => {
    if (!messageText.trim()) return
    setSendingMessage(true)
    try {
      const res = await fetch(`/api/admin/quotes/${quote.id}/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: messageText }),
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || "Failed to send message")
      }
      const newMessage = await res.json()
      setMessages([...messages, newMessage])
      setMessageText("")
      toast({
        title: "Success",
        description: "Message sent",
      })
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send message",
        variant: "destructive",
      })
    } finally {
      setSendingMessage(false)
    }
  }

  const handleSendEmail = async () => {
    if (!emailSubject.trim() || !emailBody.trim()) {
      toast({
        title: "Missing fields",
        description: "Enter both subject and message.",
        variant: "destructive",
      })
      return
    }
    setSendingEmail(true)
    try {
      const res = await fetch(`/api/admin/quotes/${quote.id}/send-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject: emailSubject.trim(), body: emailBody.trim() }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || "Failed to send email")
      }
      setEmailBody("")
      toast({
        title: "Email sent",
        description: "The customer will receive your message.",
      })
      router.refresh()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Could not send email",
        variant: "destructive",
      })
    } finally {
      setSendingEmail(false)
    }
  }

  const canSendEmail = quote.contact?.email || quote.createdBy?.email

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Send email to customer
          </CardTitle>
          <p className="text-sm text-muted-foreground font-normal">
            Custom message to {quote.contact?.email || quote.createdBy?.email || "customer"}
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {canSendEmail ? (
            <>
              <div>
                <Label htmlFor="email-subject">Subject</Label>
                <Input
                  id="email-subject"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  placeholder="Re: Your quote request"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="email-body">Message</Label>
                <Textarea
                  id="email-body"
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  placeholder="Type your message to the customer..."
                  rows={5}
                  className="mt-1 resize-none"
                />
              </div>
              <Button
                onClick={handleSendEmail}
                disabled={sendingEmail || !emailBody.trim()}
              >
                {sendingEmail ? "Sending…" : "Send email"}
              </Button>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">No email address on file for this quote.</p>
          )}
        </CardContent>
      </Card>

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
            <div className="flex items-center justify-between gap-2">
              <Label>Admin Notes</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={insertAdminNotesTimestamp}
                className="shrink-0"
              >
                <Clock className="h-4 w-4 mr-1" />
                Timestamp
              </Button>
            </div>
            <Textarea
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              rows={4}
              className="mt-1"
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
        {status === "APPROVED" && !quote.orders?.length && (
          <Button onClick={handleConvertToOrder} disabled={loading} variant="default">
            Convert to Order
          </Button>
        )}
      </div>
    </div>
  )
}

