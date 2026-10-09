"use client"

import { useState, useMemo, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { useToast } from "@/components/ui/use-toast"
import { 
  Phone, 
  Mail, 
  Send, 
  Copy, 
  Check, 
  ExternalLink, 
  MessageSquare, 
  Sparkles, 
  Loader2,
  Smartphone,
  CheckCircle2,
  ArrowRight
} from "lucide-react"
import { formatInvoiceNumber, buildInvoiceSmsMessage, buildSmsHref } from "@/lib/invoice"

interface SendInvoiceDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  order: {
    id: string
    invoiceNumber?: number | null
    customerName: string
    customerEmail?: string | null
    customerPhone?: string | null
    totalAmount: number
    status?: string
  } | null
  initialTab?: "phone" | "email" | "both"
  onSent?: () => void
}

export function SendInvoiceDialog({
  open,
  onOpenChange,
  order,
  initialTab = "phone",
  onSent,
}: SendInvoiceDialogProps) {
  const { toast } = useToast()
  const [tab, setTab] = useState<"phone" | "email" | "both">(initialTab)
  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")
  const [copiedMessage, setCopiedMessage] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)
  const [sendingEmail, setSendingEmail] = useState(false)
  const [emailSentSuccess, setEmailSentSuccess] = useState(false)
  const [smsSentSuccess, setSmsSentSuccess] = useState(false)
  const [sendingTwilioSms, setSendingTwilioSms] = useState(false)
  const [twilioSuccess, setTwilioSuccess] = useState(false)

  useEffect(() => {
    if (order) {
      setPhone(order.customerPhone || "")
      setEmail(order.customerEmail || "")
      setTab(initialTab)
      setEmailSentSuccess(false)
      setSmsSentSuccess(false)
      setTwilioSuccess(false)
    }
  }, [order, initialTab, open])

  const invoiceNo = useMemo(() => {
    return order ? formatInvoiceNumber(order) : "PB3000"
  }, [order])

  const payUrl = useMemo(() => {
    if (!order) return ""
    return `https://www.productbrands.com/pay/${invoiceNo}`
  }, [order, invoiceNo])

  const smsText = useMemo(() => {
    if (!order) return ""
    return buildInvoiceSmsMessage({
      invoiceNumber: invoiceNo,
      customerName: order.customerName,
      totalAmount: order.totalAmount,
      payUrl,
    })
  }, [order, invoiceNo, payUrl])

  if (!order) return null

  // Mark status as SENT if currently DRAFT
  const markOrderSent = async () => {
    if (order.status === "DRAFT") {
      try {
        await fetch(`/api/admin/customer-orders/${order.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "SENT" }),
        })
        onSent?.()
      } catch (err) {
        console.error("Failed to mark order sent:", err)
      }
    }
  }

  // Action: Open in Google Voice
  const handleOpenGoogleVoice = async () => {
    try {
      await navigator.clipboard.writeText(smsText)
      setCopiedMessage(true)
      setTimeout(() => setCopiedMessage(false), 2500)

      // Open Google Voice messages in new tab
      window.open("https://voice.google.com/u/0/messages", "_blank", "noopener,noreferrer")

      toast({
        title: "Message Copied to Clipboard!",
        description: `Text message is ready. Paste directly into Google Voice to send to ${phone || order.customerName}.`,
      })

      setSmsSentSuccess(true)
      await markOrderSent()
    } catch (err: any) {
      toast({
        title: "Clipboard notice",
        description: "Please copy the text message manually below.",
        variant: "destructive",
      })
    }
  }

  // Action: Send Automated SMS via Twilio API
  const handleSendTwilioSms = async () => {
    const targetPhone = phone || order.customerPhone || ""
    if (!targetPhone) {
      toast({
        title: "Missing Phone Number",
        description: "Please provide a valid phone number.",
        variant: "destructive",
      })
      return
    }

    setSendingTwilioSms(true)
    try {
      const res = await fetch(`/api/admin/customer-orders/${order.id}/send-sms`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: targetPhone }),
      })
      const data = await res.json()

      if (!res.ok || !data.success) {
        if (data.configured === false) {
          toast({
            title: "Twilio Credentials Needed",
            description: "Once your Twilio credentials are added to .env, this button sends 100% automatically in the background. In the meantime, use Open in Google Voice below!",
          })
          return
        }
        throw new Error(data.error || "Failed to send SMS via Twilio")
      }

      setTwilioSuccess(true)
      toast({
        title: "SMS Dispatched via Twilio!",
        description: `Text message with payment link sent to ${targetPhone} in the background.`,
      })
      onSent?.()
    } catch (err: any) {
      toast({
        title: "Twilio SMS Notice",
        description: err.message,
        variant: "destructive",
      })
    } finally {
      setSendingTwilioSms(false)
    }
  }

  // Action: Open in native Messages (SMS app)
  const handleOpenNativeSms = async () => {
    const targetPhone = phone || order.customerPhone || ""
    if (!targetPhone) {
      toast({
        title: "Missing Phone Number",
        description: "Please provide a phone number to open the SMS app.",
        variant: "destructive",
      })
      return
    }

    const href = buildSmsHref(targetPhone, smsText)
    window.location.href = href

    toast({
      title: "Opening Messages App",
      description: `Invoice link prepared for ${targetPhone}.`,
    })

    setSmsSentSuccess(true)
    await markOrderSent()
  }

  // Action: Copy SMS message
  const handleCopyMessage = async () => {
    try {
      await navigator.clipboard.writeText(smsText)
      setCopiedMessage(true)
      toast({
        title: "Text Message Copied!",
        description: "The complete message with invoice link is in your clipboard.",
      })
      setTimeout(() => setCopiedMessage(false), 2500)
    } catch {
      toast({ title: "Failed to copy", variant: "destructive" })
    }
  }

  // Action: Copy pay link only
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(payUrl)
      setCopiedLink(true)
      toast({
        title: "Payment Link Copied!",
        description: "Direct customer payment URL copied to clipboard.",
      })
      setTimeout(() => setCopiedLink(false), 2500)
    } catch {
      toast({ title: "Failed to copy", variant: "destructive" })
    }
  }

  // Action: Send email
  const handleSendEmail = async () => {
    if (!email) {
      toast({
        title: "Missing Email",
        description: "Please enter a valid customer email address.",
        variant: "destructive",
      })
      return
    }

    setSendingEmail(true)
    try {
      const res = await fetch(`/api/admin/customer-orders/${order.id}/send-email`, {
        method: "POST",
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to send invoice email")

      setEmailSentSuccess(true)
      toast({
        title: "Invoice Email Sent!",
        description: `Official invoice dispatched to ${email}.`,
      })
      onSent?.()
    } catch (err: any) {
      toast({
        title: "Email Error",
        description: err.message,
        variant: "destructive",
      })
    } finally {
      setSendingEmail(false)
    }
  }

  // Action: Send Both
  const handleSendBoth = async () => {
    await handleSendEmail()
    await handleSendTwilioSms()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl p-0 overflow-hidden sm:rounded-xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white p-6 pb-5">
          <div className="flex items-center justify-between mb-2">
            <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-xs font-mono font-bold px-2.5 py-0.5">
              Invoice #{invoiceNo}
            </Badge>
            <span className="text-xs text-slate-300 font-medium">
              Total Due: <strong className="text-white text-sm font-bold">${order.totalAmount.toFixed(2)}</strong>
            </span>
          </div>
          <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
            Send Invoice to Customer
          </DialogTitle>
          <DialogDescription className="text-slate-300 text-xs mt-1">
            Choose where to deliver this invoice and payment link to{" "}
            <span className="font-semibold text-white">{order.customerName}</span>.
          </DialogDescription>
        </div>

        {/* Tab selection */}
        <div className="p-6 pt-4 space-y-5">
          <Tabs value={tab} onValueChange={(val) => setTab(val as any)} className="w-full">
            <TabsList className="grid grid-cols-3 w-full h-11 bg-slate-100 p-1">
              <TabsTrigger value="phone" className="text-xs font-semibold gap-1.5 data-[state=active]:bg-white data-[state=active]:text-emerald-700 data-[state=active]:shadow-sm">
                <Smartphone className="h-3.5 w-3.5" />
                <span>Phone / SMS</span>
              </TabsTrigger>
              <TabsTrigger value="email" className="text-xs font-semibold gap-1.5 data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-sm">
                <Mail className="h-3.5 w-3.5" />
                <span>Customer Email</span>
              </TabsTrigger>
              <TabsTrigger value="both" className="text-xs font-semibold gap-1.5 data-[state=active]:bg-white data-[state=active]:text-purple-700 data-[state=active]:shadow-sm">
                <Sparkles className="h-3.5 w-3.5" />
                <span>Both (Phone & Email)</span>
              </TabsTrigger>
            </TabsList>

            {/* TAB: Phone / SMS */}
            <TabsContent value="phone" className="space-y-4 pt-3 mt-0">
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <Label className="text-xs font-semibold text-slate-700">Customer Phone Number</Label>
                  {phone ? (
                    <span className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" /> Ready to text
                    </span>
                  ) : (
                    <span className="text-[11px] text-amber-600 font-medium">Please enter phone</span>
                  )}
                </div>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 (786) 000-0000"
                  className="h-10 text-sm font-medium"
                />
              </div>

              {/* Message & Rich Card Preview */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <Label className="text-xs font-semibold text-slate-700">Message &amp; Rich Link Preview</Label>
                  <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Rich Card on iPhone &amp; Android
                  </span>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-900 text-white p-3.5 space-y-2.5 text-xs shadow-inner">
                  <div className="text-slate-200 leading-relaxed whitespace-pre-line font-sans">
                    {`Product Brands Wholesale:\nHi ${(order.customerName || "").split(" ")[0] || "there"}, your invoice #${invoiceNo} for $${order.totalAmount.toFixed(2)} is ready. Review items and pay securely online (ACH / Card):`}
                  </div>

                  {/* Rich Link Card Preview (what iPhone & Android messages render) */}
                  <div className="rounded-lg border border-slate-700 bg-slate-800 overflow-hidden shadow-sm">
                    <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 p-2.5 border-b border-slate-700 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="bg-emerald-500 text-slate-950 font-black text-[10px] px-1.5 py-0.5 rounded">PB</span>
                        <span className="font-bold text-xs text-white">Product Brands</span>
                      </div>
                      <Badge className="bg-emerald-500/20 text-emerald-300 border-none text-[10px]">
                        #{invoiceNo}
                      </Badge>
                    </div>
                    <div className="p-2.5 flex justify-between items-center">
                      <div>
                        <div className="font-bold text-xs text-white">Wholesale Invoice #{invoiceNo}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {order.customerName} &bull; ${order.totalAmount.toFixed(2)} USD
                        </div>
                      </div>
                      <span className="text-[10px] text-emerald-400 font-mono font-bold">productbrands.com</span>
                    </div>
                  </div>

                  <div className="text-[11px] text-sky-400 font-mono break-all pt-0.5">
                    {payUrl}
                  </div>
                </div>
              </div>

              {/* Action Buttons for Phone */}
              <div className="space-y-2.5 pt-1">
                {/* 1-Click Automated Twilio SMS */}
                <Button
                  onClick={handleSendTwilioSms}
                  disabled={sendingTwilioSms || !phone}
                  className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-2 shadow-sm"
                >
                  {sendingTwilioSms ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : twilioSuccess ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-200" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  <span>{twilioSuccess ? "SMS Sent Automatically! (Send Again)" : "Send Automated Text (Twilio)"}</span>
                </Button>

                <div className="relative flex py-1 items-center">
                  <div className="flex-grow border-t border-slate-200"></div>
                  <span className="flex-shrink mx-3 text-[10px] uppercase font-bold text-slate-400">or send via Google Voice / SMS App</span>
                  <div className="flex-grow border-t border-slate-200"></div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <Button
                    onClick={handleOpenGoogleVoice}
                    variant="outline"
                    className="h-10 border-slate-300 hover:bg-slate-100 font-semibold text-xs gap-2 text-slate-800"
                  >
                    <Smartphone className="h-3.5 w-3.5 text-blue-600" />
                    <span>Open in Google Voice</span>
                    <ExternalLink className="h-3 w-3 opacity-70" />
                  </Button>

                  <Button
                    onClick={handleOpenNativeSms}
                    variant="outline"
                    className="h-10 border-slate-300 hover:bg-slate-100 font-semibold text-xs gap-2 text-slate-800"
                  >
                    <MessageSquare className="h-3.5 w-3.5 text-emerald-600" />
                    <span>Open in Messages (SMS)</span>
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-0.5">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCopyMessage}
                    className="h-8 text-xs text-slate-600 hover:text-slate-900 border border-dashed border-slate-200"
                  >
                    {copiedMessage ? <Check className="h-3.5 w-3.5 text-emerald-600 mr-1.5" /> : <Copy className="h-3.5 w-3.5 mr-1.5" />}
                    {copiedMessage ? "Message Copied!" : "Copy Text Message"}
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCopyLink}
                    className="h-8 text-xs text-slate-600 hover:text-slate-900 border border-dashed border-slate-200"
                  >
                    {copiedLink ? <Check className="h-3.5 w-3.5 text-emerald-600 mr-1.5" /> : <ExternalLink className="h-3.5 w-3.5 mr-1.5" />}
                    {copiedLink ? "Link Copied!" : "Copy Pay Link"}
                  </Button>
                </div>
              </div>

              <div className="rounded-md bg-blue-50 border border-blue-100 p-2.5 text-[11px] text-blue-700 flex items-start gap-2">
                <span className="font-bold">Google Voice tip:</span>
                <span>Clicking <strong>Open in Google Voice</strong> automatically copies the message and opens your Google Voice tab so you can paste and send immediately.</span>
              </div>
            </TabsContent>

            {/* TAB: Customer Email */}
            <TabsContent value="email" className="space-y-4 pt-3 mt-0">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Customer Email Address</Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="billing@customer.com"
                  className="h-10 text-sm"
                />
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-800">
                  <Mail className="h-4 w-4 text-blue-600" />
                  <span>Official Wholesale Invoice Email</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  The customer will receive an official branded email with the complete itemized order breakdown, subtotal, shipping, terms, and the direct payment link (ACH $0.00 fee or Card).
                </p>
                {emailSentSuccess && (
                  <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-semibold pt-1">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    Email dispatched successfully to {email}!
                  </div>
                )}
              </div>

              <Button
                onClick={handleSendEmail}
                disabled={sendingEmail || !email}
                className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs gap-2 shadow-sm"
              >
                {sendingEmail ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                <span>{emailSentSuccess ? "Resend Invoice Email" : "Send Official Invoice Email"}</span>
              </Button>
            </TabsContent>

            {/* TAB: Both (Phone & Email) */}
            <TabsContent value="both" className="space-y-4 pt-3 mt-0">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Customer Phone</Label>
                  <Input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+1 (786) 000-0000"
                    className="h-9 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Customer Email</Label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="billing@customer.com"
                    className="h-9 text-xs"
                  />
                </div>
              </div>

              <div className="rounded-lg border border-purple-100 bg-purple-50/60 p-3.5 space-y-1.5 text-xs text-purple-900">
                <div className="font-bold flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-purple-600" />
                  Dual Delivery (Maximum Reliability)
                </div>
                <p className="text-[11px] text-purple-700 leading-relaxed">
                  Sends the official detailed email right away, then copies the SMS text and opens Google Voice / Messages so the customer also gets an instant text on their phone.
                </p>
              </div>

              <div className="space-y-2">
                <Button
                  onClick={handleSendBoth}
                  disabled={sendingEmail || (!email && !phone)}
                  className="w-full h-11 bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs gap-2 shadow-sm"
                >
                  {sendingEmail ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  <span>Send Email & Open Google Voice SMS</span>
                </Button>

                <div className="grid grid-cols-2 gap-2">
                  <Button
                    onClick={handleOpenNativeSms}
                    variant="outline"
                    className="h-9 text-xs border-slate-300"
                  >
                    <MessageSquare className="h-3.5 w-3.5 text-emerald-600 mr-1.5" />
                    Open Native SMS
                  </Button>
                  <Button
                    onClick={handleCopyMessage}
                    variant="outline"
                    className="h-9 text-xs border-slate-300"
                  >
                    <Copy className="h-3.5 w-3.5 mr-1.5" />
                    Copy Text Only
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <DialogFooter className="bg-slate-50 border-t border-slate-100 px-6 py-3 flex items-center justify-between sm:justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="text-xs text-slate-500 hover:text-slate-800"
          >
            Close
          </Button>
          <a
            href={payUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-slate-600 hover:text-slate-900 font-medium"
          >
            Preview Pay Page <ExternalLink className="h-3 w-3" />
          </a>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
