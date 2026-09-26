"use client"

import { useState, useEffect } from "react"
import { useToast } from "@/components/ui/use-toast"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { RefreshCw, DollarSign, Wallet, ChevronDown, ChevronUp, Calculator, ArrowUpDown } from "lucide-react"
import PinProtection from "@/components/PinProtection"
import { ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts"

export default function AccountingPage() {
  const [disbursements, setDisbursements] = useState<any[]>([])
  const [accountSales, setAccountSales] = useState<{ amount: number, units: number }>({ amount: 0, units: 0 })
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [days, setDays] = useState("30")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [exactCustomSalesMap, setExactCustomSalesMap] = useState<Record<string, number> | null>(null)
  const [isDisbursementsOpen, setIsDisbursementsOpen] = useState(false)
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: "asc" | "desc" } | null>({ key: "endDate", direction: "desc" })
  const [snapshots, setSnapshots] = useState<any[]>([])
  const [hiddenMetrics, setHiddenMetrics] = useState<Record<string, boolean>>({
    profit: false,
    growth: false,
    roi: false,
  })
  
  // Try to load operating expenses from local storage, default to 0
  const [operatingExpenses, setOperatingExpenses] = useState<number>(0)
  
  useEffect(() => {
    const savedExp = localStorage.getItem("operatingExpenses")
    if (savedExp) setOperatingExpenses(parseFloat(savedExp))
  }, [])

  const handleOpExChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value) || 0
    setOperatingExpenses(val)
    localStorage.setItem("operatingExpenses", val.toString())
  }

  const { toast } = useToast()

  const fetchData = async () => {
    setLoading(true)
    try {
      let url = `/api/admin/accounting/disbursements?days=${days}`
      let fetchedCustomSales = null
      
      const ts = Date.now()
      if (days === "custom" && startDate && endDate) {
        url += `&startDate=${startDate}&endDate=${endDate}`
        
        // Fetch exact ASIN sales directly from Amazon for this specific custom date range
        const customRes = await fetch(`/api/admin/accounting/ranked-sales-custom?startDate=${startDate}&endDate=${endDate}&_t=${ts}`, { cache: 'no-store' })
        if (customRes.ok) fetchedCustomSales = await customRes.json()
      }
      
      const [disRes, prodRes, snapRes] = await Promise.all([
        fetch(`${url}&_t=${ts}`, { cache: 'no-store' }),
        fetch(`/api/admin/product-rankings?_t=${ts}`, { cache: 'no-store' }),
        fetch(`/api/admin/accounting/snapshots?_t=${ts}`, { cache: 'no-store' })
      ])
      
      if (!disRes.ok || !prodRes.ok) throw new Error("Failed to fetch")
      
      const disData = await disRes.json()
      const prodData = await prodRes.json()
      const snapData = await snapRes.json()
      
      setDisbursements(disData.disbursements || [])
      setAccountSales(disData.accountSales || { amount: 0, units: 0 })
      setExactCustomSalesMap(fetchedCustomSales)
      setProducts(prodData || [])
      setSnapshots(snapData || [])
    } catch (e: any) {
      toast({ title: "Error", description: "Could not load data.", variant: "destructive" })
    } finally {
      setLoading(false)
      setSyncing(false)
    }
  }

  useEffect(() => {
    fetchData()

    // Automatically re-fetch when the user returns to the tab (e.g. the next morning)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchData()
      }
    }
    document.addEventListener("visibilitychange", handleVisibilityChange)
    
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange)
    }
  }, [days])

  const handleSync = () => {
    setSyncing(true)
    fetchData()
  }

  const handleSort = (key: string) => {
    let direction: "asc" | "desc" = "desc"
    if (sortConfig && sortConfig.key === key && sortConfig.direction === "desc") {
      direction = "asc"
    }
    setSortConfig({ key, direction })
  }

  const toggleMetric = (e: any) => {
    if (!e || !e.dataKey) return
    setHiddenMetrics(prev => ({
      ...prev,
      [e.dataKey]: !prev[e.dataKey]
    }))
  }

  // Math Calculations
  const totalDisbursed = disbursements.reduce((sum, d) => sum + (d.OriginalTotal?.CurrencyAmount || 0), 0)
  
  const cogsBreakdown = products.map((p) => {
    const cost = p.cost || 0
    const price = p.price || 0
    const fbaFee = p.fbaFee || 0

    let estimatedSales = 0
    let d = parseInt(days)
    if (days === "custom" && startDate && endDate) {
      if (exactCustomSalesMap && p.asin && exactCustomSalesMap[p.asin] !== undefined) {
        estimatedSales = exactCustomSalesMap[p.asin]
      } else {
        const diffMs = new Date(endDate).getTime() - new Date(startDate).getTime()
        d = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)))
        estimatedSales = (p.sales30Days || 0) * (d / 30)
      }
    } else {
      if (d <= 30) estimatedSales = (p.sales30Days || 0) * (d / 30)
      else estimatedSales = (p.sales90Days || 0) * (d / 90)
    }
    
    return {
      title: p.productName || p.title || "Unknown Product",
      image: p.imageUrl || p.image || "",
      cost,
      unitsSold: estimatedSales,
      totalCogs: cost * estimatedSales,
      totalGross: price * estimatedSales,
      totalFees: fbaFee * estimatedSales
    }
  })

  const totalCogs = cogsBreakdown.reduce((sum, item) => sum + item.totalCogs, 0)
  const totalGrossSales = cogsBreakdown.reduce((sum, item) => sum + item.totalGross, 0)
  const totalAmazonFees = cogsBreakdown.reduce((sum, item) => sum + item.totalFees, 0)

  const netProfit = totalDisbursed - operatingExpenses - totalCogs
  const profitMargin = totalDisbursed > 0 ? (netProfit / totalDisbursed) * 100 : 0

  const chartData = snapshots.map((s, i) => {
    const prevProfit = i > 0 ? snapshots[i-1].netProfit : s.netProfit
    const growth = prevProfit > 0 ? ((s.netProfit - prevProfit) / prevProfit) * 100 : 0
    return {
      week: new Date(s.weekEndDate).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      profit: s.netProfit,
      growth: i === 0 ? 0 : growth,
      roi: s.roiCash
    }
  })

  return (
    <PinProtection>
      <div className="space-y-6 pb-20 print:pb-0">
        <style dangerouslySetInnerHTML={{__html: `
        @media print {
          @page { margin: 0.5in; size: letter portrait; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .print\\:hidden { display: none !important; }
        }
      `}} />
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Accounting, Profit & Loss</h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            Track Amazon disbursements, subtract COGS and expenses to find your True Net Profit.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 print:hidden items-center">
          {days === "custom" && (
            <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 mr-0 sm:mr-2">
              <Input 
                type="date" 
                value={startDate} 
                onChange={e => setStartDate(e.target.value)}
                className="w-36 bg-white dark:bg-gray-950 h-9 sm:h-10 text-xs sm:text-sm"
              />
              <span className="text-muted-foreground text-xs sm:text-sm">to</span>
              <Input 
                type="date" 
                value={endDate} 
                onChange={e => setEndDate(e.target.value)}
                className="w-36 bg-white dark:bg-gray-950 h-9 sm:h-10 text-xs sm:text-sm"
              />
            </div>
          )}
          <Select value={days} onValueChange={setDays}>
            <SelectTrigger className="w-36 bg-white dark:bg-gray-950 h-9 sm:h-10 text-xs sm:text-sm">
              <SelectValue placeholder="Period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30">Last 30 Days</SelectItem>
              <SelectItem value="60">Last 60 Days</SelectItem>
              <SelectItem value="90">Last 90 Days</SelectItem>
              <SelectItem value="180">Last 6 Months</SelectItem>
              <SelectItem value="custom">Custom Range</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => window.print()} variant="outline" className="gap-2 bg-white dark:bg-gray-950 h-9 sm:h-10 text-xs sm:text-sm">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-file-text"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/></svg>
            <span className="hidden sm:inline">Download</span> PDF
          </Button>
          <Button onClick={handleSync} disabled={syncing} variant="outline" className="gap-2 bg-white dark:bg-gray-950 h-9 sm:h-10 text-xs sm:text-sm">
            <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing...' : 'Sync'}
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
            <div className="text-2xl sm:text-3xl font-bold text-green-700 dark:text-green-400">
              ${totalDisbursed.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-green-600/80 dark:text-green-400/80 mt-1">
              Received from Amazon
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Collapsible Disbursements List */}
      <Card>
        <CardHeader 
          className="cursor-pointer hover:bg-muted/30 transition-colors p-4 sm:p-6"
          onClick={() => setIsDisbursementsOpen(!isDisbursementsOpen)}
        >
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base sm:text-lg">Amazon Disbursements (Payouts)</CardTitle>
              <CardDescription className="mt-1 text-xs sm:text-sm">
                Click to {isDisbursementsOpen ? "collapse" : "expand"} individual bank transfers.
              </CardDescription>
            </div>
            {isDisbursementsOpen ? <ChevronUp className="h-5 w-5 text-muted-foreground shrink-0" /> : <ChevronDown className="h-5 w-5 text-muted-foreground shrink-0" />}
          </div>
        </CardHeader>
        
        {isDisbursementsOpen && (
          <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
            {loading && disbursements.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">Loading payouts...</div>
            ) : disbursements.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">No disbursements found in the selected period.</div>
            ) : (
              <div className="rounded-md border overflow-x-auto">
                <div className="min-w-[550px]">
                  <div className="grid grid-cols-5 p-4 font-medium border-b bg-muted/50 text-sm">
                    <div>Processing Status</div>
                    <div className="cursor-pointer flex items-center gap-1 hover:text-primary transition-colors select-none" onClick={() => handleSort("startDate")}>
                      Start Date <ArrowUpDown className={`w-3 h-3 ${sortConfig?.key === "startDate" ? "text-primary" : "text-muted-foreground"}`} />
                    </div>
                    <div className="cursor-pointer flex items-center gap-1 hover:text-primary transition-colors select-none" onClick={() => handleSort("endDate")}>
                      End Date <ArrowUpDown className={`w-3 h-3 ${sortConfig?.key === "endDate" ? "text-primary" : "text-muted-foreground"}`} />
                    </div>
                    <div>Currency</div>
                    <div className="text-right cursor-pointer flex items-center justify-end gap-1 hover:text-primary transition-colors select-none" onClick={() => handleSort("amount")}>
                      <ArrowUpDown className={`w-3 h-3 ${sortConfig?.key === "amount" ? "text-primary" : "text-muted-foreground"}`} /> Amount
                    </div>
                  </div>
                  <div className="divide-y max-h-[400px] overflow-y-auto">
                    {[...disbursements].sort((a, b) => {
                      if (!sortConfig) return 0;
                      let aVal: any = 0; let bVal: any = 0;
                      if (sortConfig.key === "amount") {
                        aVal = a.OriginalTotal?.CurrencyAmount || 0;
                        bVal = b.OriginalTotal?.CurrencyAmount || 0;
                      } else if (sortConfig.key === "startDate") {
                        aVal = new Date(a.FinancialEventGroupStart).getTime();
                        bVal = new Date(b.FinancialEventGroupStart).getTime();
                      } else if (sortConfig.key === "endDate") {
                        aVal = new Date(a.FinancialEventGroupEnd).getTime();
                        bVal = new Date(b.FinancialEventGroupEnd).getTime();
                      }
                      if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
                      if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
                      return 0;
                    }).map((d: any, idx: number) => {
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
              </div>
            )}
          </CardContent>
        )}
      </Card>
      
      {/* Profit and Loss Calculator */}
      <Card className="border-2 border-primary/20">
        <CardHeader className="bg-muted/30 border-b p-4 sm:p-6">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Calculator className="h-5 w-5 shrink-0" /> Profit & Loss Statement ({days} Days)
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Calculates True Net Profit by subtracting Cost of Goods Sold (Unit Cost × Units Sold) and custom Operating Expenses from Total Disbursements.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 print:p-0">
          <div className="grid md:grid-cols-2 print:grid-cols-1 print:gap-8 gap-8 sm:gap-12">
            
            {/* Left side: Inputs and Subtractions */}
            <div className="space-y-4 sm:space-y-6 print:space-y-4">

              {/* Total Amazon Account Sales */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-2 pb-2">
                <div className="min-w-0">
                  <h3 className="font-semibold text-base sm:text-lg text-blue-600 dark:text-blue-400">Total Amazon Account Sales</h3>
                  <p className="text-xs text-muted-foreground">Top-level gross revenue for the entire Amazon Account</p>
                </div>
                <div className="text-lg sm:text-xl font-bold text-blue-600 dark:text-blue-400 sm:text-right shrink-0">
                  ${accountSales.amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>

              {/* Ranked Products Gross Sales */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-2 pt-2 border-t">
                <div className="min-w-0">
                  <h3 className="font-semibold text-sm sm:text-base">Ranked Products Sales</h3>
                  <p className="text-xs text-muted-foreground">Revenue generated only by products in your Product Rankings</p>
                </div>
                <div className="text-base sm:text-lg font-bold text-muted-foreground sm:text-right shrink-0">
                  ${totalGrossSales.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>

              {/* Amazon Fees */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-2">
                <div className="min-w-0">
                  <h3 className="font-semibold text-sm">Estimated Amazon Fees</h3>
                  <p className="text-xs text-muted-foreground mt-0.5 sm:mt-1">FBA fulfillment & referral fees</p>
                </div>
                <div className="text-base font-medium text-red-500 sm:text-right shrink-0">
                  - ${totalAmazonFees.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
              
              <div className="border-t pt-2 sm:pt-4" />

              {/* Total Disbursement */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-2 pb-3 sm:pb-4 border-b">
                <div className="min-w-0">
                  <h3 className="font-semibold text-base sm:text-lg text-green-600 dark:text-green-400">Total Disbursement (Cash In)</h3>
                  <p className="text-xs text-muted-foreground">Actual money deposited from Amazon</p>
                </div>
                <div className="text-lg sm:text-xl font-bold text-green-600 dark:text-green-400 sm:text-right shrink-0">
                  ${totalDisbursed.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>

              {/* COGS */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-2">
                <div className="min-w-0">
                  <h3 className="font-semibold text-sm sm:text-base">Cost of Goods Sold (COGS)</h3>
                  <p className="text-xs text-muted-foreground mt-0.5 sm:mt-1">
                    Calculated automatically from {products.length} products.<br/>
                    (Unit Cost × {days} Day Sales)
                  </p>
                </div>
                <Dialog>
                  <DialogTrigger asChild>
                    <button className="text-base sm:text-lg font-semibold text-red-500 hover:text-red-700 transition-colors underline decoration-dotted underline-offset-4 cursor-pointer sm:text-right shrink-0 self-start sm:self-auto">
                      - ${totalCogs.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </button>
                  </DialogTrigger>
                  <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto w-[95vw] sm:w-full p-4 sm:p-6">
                    <DialogHeader>
                      <DialogTitle>COGS Breakdown ({days === "custom" ? "Custom Range" : `${days} Days`})</DialogTitle>
                    </DialogHeader>
                    <div className="overflow-x-auto">
                      <Table className="min-w-[480px]">
                        <TableHeader>
                          <TableRow>
                            <TableHead>Product</TableHead>
                            <TableHead className="text-right">Unit Cost</TableHead>
                            <TableHead className="text-right">Units Sold</TableHead>
                            <TableHead className="text-right font-bold">Total COGS</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {cogsBreakdown.map((item, i) => (
                            <TableRow key={i}>
                              <TableCell className="flex items-start gap-3">
                                {item.image && (
                                  <img src={item.image} alt="product" className="w-10 h-10 rounded object-cover flex-shrink-0" />
                                )}
                                <span className="text-sm leading-snug">{item.title}</span>
                              </TableCell>
                              <TableCell className="text-right align-top">${item.cost.toFixed(2)}</TableCell>
                              <TableCell className="text-right align-top">{Math.round(item.unitsSold).toLocaleString()}</TableCell>
                              <TableCell className="text-right font-semibold text-red-500 align-top">
                                ${item.totalCogs.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              {/* Operating Expenses */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2">
                <div className="min-w-0">
                  <h3 className="font-semibold text-sm sm:text-base">Operating Expenses</h3>
                  <p className="text-xs text-muted-foreground mt-0.5 sm:mt-1">Warehouse, shipping, supplies, etc.</p>
                </div>
                <div className="flex flex-col items-start sm:items-end gap-1 shrink-0">
                  <div className="flex items-center gap-2">
                    <span className="text-red-500 font-semibold">-</span>
                    <div className="relative">
                      <DollarSign className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input 
                        type="number"
                        value={operatingExpenses === 0 ? "" : operatingExpenses}
                        onChange={handleOpExChange}
                        placeholder="0.00"
                        className="pl-7 w-32 text-right border-red-200 focus-visible:ring-red-500 font-semibold text-sm"
                      />
                    </div>
                  </div>
                  <button 
                    onClick={() => {
                      setOperatingExpenses(44170)
                      localStorage.setItem("operatingExpenses", "44170")
                    }}
                    className="text-[10px] text-muted-foreground hover:text-primary transition-colors underline decoration-dotted underline-offset-2"
                  >
                    Use Default: $44,170
                  </button>
                </div>
              </div>
            </div>

            {/* Right side: Grand Total */}
            <div className="flex flex-col justify-center items-center p-6 sm:p-8 bg-muted/20 rounded-xl border">
              <h2 className="text-lg sm:text-xl font-medium text-muted-foreground mb-2 text-center">True Net Profit</h2>
              
              <div className={`text-4xl sm:text-5xl lg:text-6xl font-black mb-4 text-center break-words ${netProfit >= 0 ? "text-green-600 dark:text-green-500" : "text-red-600 dark:text-red-500"}`}>
                ${netProfit.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              
              <div className="flex flex-wrap items-center justify-center gap-2">
                <span className="text-xs sm:text-sm text-muted-foreground">ROI (on Cash):</span>
                <span className={`px-3 py-1 rounded-full font-bold text-xs sm:text-sm ${netProfit >= 0 ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"}`}>
                  {profitMargin.toFixed(1)}%
                </span>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
                <span className="text-xs sm:text-sm text-muted-foreground">True Margin (on Sales):</span>
                <span className={`px-3 py-1 rounded-full font-bold text-xs sm:text-sm ${netProfit >= 0 ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"}`}>
                  {totalGrossSales > 0 ? ((netProfit / totalGrossSales) * 100).toFixed(1) : "0.0"}%
                </span>
              </div>
            </div>

          </div>
        </CardContent>
      </Card>

      {/* Weekly Growth Chart */}
      <Card className="border-2 border-primary/20 print:hidden">
        <CardHeader className="bg-muted/30 border-b p-4 sm:p-6">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            Weekly Profit Growth
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Historical snapshot of weekly net profit and growth prediction. Updated every Monday.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="week" />
                <YAxis yAxisId="left" tickFormatter={(val) => `$${val}`} />
                <YAxis yAxisId="right" orientation="right" tickFormatter={(val) => `${val}%`} />
                <Tooltip 
                  formatter={(value: any, name: any) => {
                    if (value === undefined || value === null) return ["", name]
                    if (name === "Net Profit") return [`$${Number(value).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, name]
                    return [`${Number(value).toFixed(2)}%`, name]
                  }}
                />
                <Legend onClick={toggleMetric} wrapperStyle={{ cursor: 'pointer', userSelect: 'none' }} />
                <Bar hide={hiddenMetrics.profit} yAxisId="left" dataKey="profit" name="Net Profit" fill="#22c55e" radius={[4, 4, 0, 0]} opacity={hiddenMetrics.profit ? 0.3 : 1} />
                <Line hide={hiddenMetrics.growth} yAxisId="right" type="monotone" dataKey="growth" name="WoW Growth %" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} opacity={hiddenMetrics.growth ? 0.3 : 1} />
                <Line hide={hiddenMetrics.roi} yAxisId="right" type="monotone" dataKey="roi" name="ROI %" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} opacity={hiddenMetrics.roi ? 0.3 : 1} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
    </PinProtection>
  )
}
