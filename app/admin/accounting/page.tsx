"use client"

import { useState, useEffect } from "react"
import { useToast } from "@/components/ui/use-toast"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RefreshCw, DollarSign, Wallet, ArrowRightLeft } from "lucide-react"

export default function AccountingPage() {
  const [disbursements, setDisbursements] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [days, setDays] = useState("30")
  const { toast } = useToast()

  const fetchDisbursements = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/accounting/disbursements?days=${days}`)
      if (!res.ok) throw new Error("Failed to fetch")
      const data = await res.json()
      setDisbursements(data || [])
    } catch (e: any) {
      toast({ title: "Error", description: "Could not load Amazon disbursements.", variant: "destructive" })
    } finally {
      setLoading(false)
      setSyncing(false)
    }
  }

  useEffect(() => {
    fetchDisbursements()
  }, [days])

  const handleSync = () => {
    setSyncing(true)
    fetchDisbursements()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Accounting, Profit & Loss</h1>
          <p className="text-muted-foreground mt-2">
            Track Amazon disbursements, calculate net revenue, and manage operating expenses.
          </p>
        </div>
        <div className="flex gap-4">
          <Select value={days} onValueChange={setDays}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30">Last 30 Days</SelectItem>
              <SelectItem value="60">Last 60 Days</SelectItem>
              <SelectItem value="90">Last 90 Days</SelectItem>
              <SelectItem value="180">Last 6 Months</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handleSync} disabled={syncing} variant="outline" className="gap-2">
            <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing...' : 'Sync Payouts'}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/10 border-green-200 dark:border-green-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-green-800 dark:text-green-300">Total Disbursed</CardTitle>
            <Wallet className="h-4 w-4 text-green-600 dark:text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700 dark:text-green-400">
              ${disbursements.reduce((sum, d) => sum + (d.OriginalTotal?.CurrencyAmount || 0), 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-green-600/80 dark:text-green-400/80 mt-1">
              For selected period
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Amazon Disbursements (Payouts)</CardTitle>
          <CardDescription>
            Actual cash flow sent to your bank account from Amazon.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading && disbursements.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">Loading payouts...</div>
          ) : disbursements.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">No disbursements found in the selected period.</div>
          ) : (
            <div className="rounded-md border">
              <div className="grid grid-cols-5 p-4 font-medium border-b bg-muted/50 text-sm">
                <div>Processing Status</div>
                <div>Start Date</div>
                <div>End Date</div>
                <div>Currency</div>
                <div className="text-right">Amount</div>
              </div>
              <div className="divide-y">
                {disbursements.map((d: any, idx: number) => {
                  const status = d.ProcessingStatus
                  const startDate = new Date(d.FinancialEventGroupStart).toLocaleDateString()
                  const endDate = new Date(d.FinancialEventGroupEnd).toLocaleDateString()
                  const amount = d.OriginalTotal?.CurrencyAmount || 0
                  const currency = d.OriginalTotal?.CurrencyCode || "USD"
                  
                  return (
                    <div key={idx} className="grid grid-cols-5 p-4 items-center text-sm">
                      <div>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${
                          status === "Closed" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
                          "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                        }`}>
                          {status}
                        </span>
                      </div>
                      <div>{startDate}</div>
                      <div>{endDate}</div>
                      <div>{currency}</div>
                      <div className="text-right font-bold text-base">
                        ${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Operating Expenses & COGS will go here later */}
      <Card className="opacity-50 border-dashed">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" /> Cost of Goods Sold & Operating Expenses
          </CardTitle>
          <CardDescription>
            This section will automatically calculate your total COGS (Cost × Units Sold) and let you input warehouse expenses to give you your True Net Revenue.
          </CardDescription>
        </CardHeader>
      </Card>

    </div>
  )
}
