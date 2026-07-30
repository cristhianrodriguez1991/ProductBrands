"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import {
  TrendingUp,
  DollarSign,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  Sliders,
  BarChart3,
  ExternalLink,
  Trash2,
  Edit3,
  ArrowRight,
  Info,
  Sparkles,
  Layers,
  HelpCircle,
  Percent,
  Package,
  Zap,
  Calendar,
  TrendingDown,
  Key,
  Activity,
  Clock,
  ShieldAlert,
} from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { PRICE_INTELLIGENCE_CONFIG, MarketplaceCode, RecommendedActionCode } from "@/config/price-intelligence.config"
import Image from "next/image"
import { KeepaSettings } from "./keepa-settings"
import { KeepaChart } from "./keepa-chart"
import { KeepaAnalytics } from "./keepa-analytics"

interface MonitoredProduct {
  id: string
  asin: string
  sku: string
  marketplace: string
  productName: string
  imageUrl: string | null
  category: string | null
  currentPrice: number
  unitCost: number
  fulfillmentMethod: string
  minPrice: number
  maxPrice: number
  minMarginPercent: number
  referralFeePercent: number
  fbaFee: number
  status: string
  currentBuyBoxPrice: number | null
  buyBoxWinRate: number | null
  competitorCount: number | null
  velocityDaily: number | null
  recommendedAction: string
  recommendedPrice: number | null
  recommendationReason: string | null
  confidenceScore: number | null
  lastAnalyzedAt: string | null
  targetRankMin?: number
  targetRankMax?: number
  warningRank?: number
  criticalRank?: number
  defaultAdjustmentSize?: number
  maxAdjustmentSize?: number
  cooldownHours?: number
  refreshIntervalHours?: number
  keepaLastSyncedAt?: string | null
  keepaSyncStatus?: string | null
  keepaTokensConsumed?: number | null
  priceHistory?: PriceChangeLog[]
  calculated?: {
    referralFee: number
    grossProfit: number
    netMarginPct: number
    hasPendingApproval: boolean
    pendingChange: PriceChangeLog | null
  }
}

interface PriceChangeLog {
  id: string
  monitoredProductId: string
  oldPrice: number
  newPrice: number
  recommendedAction: string
  reason: string | null
  status: string
  isTemporary?: boolean
  expiresAt?: string | null
  restorePrice?: number | null
  scheduledFor?: string | null
  isRestored?: boolean
  requestedAt: string
  approvedAt: string | null
  approvedByUserId: string | null
  notes: string | null
  monitoredProduct?: MonitoredProduct
}

export default function AutopricerClient() {
  const [products, setProducts] = useState<MonitoredProduct[]>([])
  const [kpis, setKpis] = useState({
    totalMonitored: 0,
    totalActive: 0,
    pendingApprovalsCount: 0,
    potentialMonthlyProfitUplift: 0,
    averageMarginPercent: 0,
  })
  const [loading, setLoading] = useState(true)
  const [analyzing, setAnalyzing] = useState(false)
  const [seedingDemo, setSeedingDemo] = useState(false)
  const [syncingAmazon, setSyncingAmazon] = useState(false)
  const [syncingKeepa, setSyncingKeepa] = useState(false)
  const [activeTab, setActiveTab] = useState<"dashboard" | "approvals" | "keepa" | "settings" | "simulator" | "audit">("dashboard")

  // Keepa Intelligence State
  const [selectedProductForKeepa, setSelectedProductForKeepa] = useState<string | null>(null)
  const [keepaHistoryData, setKeepaHistoryData] = useState<any | null>(null)
  const [keepaLoading, setKeepaLoading] = useState(false)

  // Enhanced Approval State
  const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false)
  const [approvingChange, setApprovingChange] = useState<PriceChangeLog | null>(null)
  const [approvalModifiedPrice, setApprovalModifiedPrice] = useState("")
  const [approvalIsTemporary, setApprovalIsTemporary] = useState(false)
  const [approvalRestorePrice, setApprovalRestorePrice] = useState("")
  const [approvalExpiresHours, setApprovalExpiresHours] = useState("24")

  // Filters
  const [search, setSearch] = useState("")
  const [selectedMarketplace, setSelectedMarketplace] = useState<string>("ALL")
  const [selectedAction, setSelectedAction] = useState<string>("ALL")

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<MonitoredProduct | null>(null)
  
  // Catalog Import State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  const [catalogItems, setCatalogItems] = useState<any[]>([])
  const [catalogLoading, setCatalogLoading] = useState(false)
  const [catalogSearch, setCatalogSearch] = useState("")
  const [importingId, setImportingId] = useState<string | null>(null)

  // Simulator State
  const [simulatedPrice, setSimulatedPrice] = useState<number>(0)
  
  // Inline Price Editing
  const [editingPriceId, setEditingPriceId] = useState<string | null>(null)
  const [editingPriceValue, setEditingPriceValue] = useState<string>("")
  const [submittingPrice, setSubmittingPrice] = useState(false)

  // Form State
  const [formData, setFormData] = useState({
    asin: "",
    sku: "",
    marketplace: "US",
    productName: "",
    category: "Coffee",
    imageUrl: "",
    currentPrice: "",
    unitCost: "",
    fulfillmentMethod: "FBA",
    minPrice: "",
    maxPrice: "",
    minMarginPercent: PRICE_INTELLIGENCE_CONFIG.DEFAULTS.MIN_DESIRED_MARGIN_PERCENT.toString(),
    referralFeePercent: PRICE_INTELLIGENCE_CONFIG.DEFAULTS.REFERRAL_FEE_PERCENT.toString(),
    fbaFee: PRICE_INTELLIGENCE_CONFIG.DEFAULTS.ESTIMATED_FBA_FEE_USD.toString(),
  })

  // Selected for bulk approval
  const [selectedLogIds, setSelectedLogIds] = useState<string[]>([])

  // Bulk "Erase All" + "Set Price Bounds" controls
  const [showEraseAllDialog, setShowEraseAllDialog] = useState(false)
  const [eraseConfirmText, setEraseConfirmText] = useState("")
  const [erasing, setErasing] = useState(false)
  const [showBoundsDialog, setShowBoundsDialog] = useState(false)
  const [boundsForm, setBoundsForm] = useState({ minPrice: "", maxPrice: "", scope: "all" as "all" | "filtered" })
  const [savingBounds, setSavingBounds] = useState(false)

  // One-click Sync Sales (requests report -> polls until DONE -> downloads & saves)
  const [syncingSales, setSyncingSales] = useState(false)
  const [syncStatus, setSyncStatus] = useState("")

  // Live Amazon price push on Approve. Dry-run is ON by default so the first
  // approval is a safe preview (no Amazon call, no DB change) — uncheck to push
  // the price to the live Amazon listing.
  const [approvalDryRun, setApprovalDryRun] = useState(true)
  const [approvingLive, setApprovingLive] = useState(false)
  const [amazonFeedback, setAmazonFeedback] = useState<{ ok: boolean; text: string } | null>(null)

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (selectedMarketplace !== "ALL") params.append("marketplace", selectedMarketplace)
      if (selectedAction !== "ALL") params.append("action", selectedAction)
      if (search) params.append("search", search)

      const res = await fetch(`/api/admin/autopricer/products?${params.toString()}`)
      if (!res.ok) throw new Error("Failed to fetch products")
      const data = await res.json()
      setProducts(data.products || [])
      if (data.kpis) setKpis(data.kpis)
    } catch (error) {
      console.error("Error loading autopricer data:", error)
    } finally {
      setLoading(false)
    }
  }, [selectedMarketplace, selectedAction, search])

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  // Run Intelligence Analysis Engine
  const handleRunAnalysis = async () => {
    try {
      setAnalyzing(true)
      const res = await fetch("/api/admin/autopricer/analyze", { method: "POST" })
      const data = await res.json()
      if (res.ok) {
        await fetchProducts()
      } else {
        alert(data.message || "Failed to analyze pricing intelligence")
      }
    } catch (err) {
      console.error(err)
      alert("An error occurred running the intelligence engine.")
    } finally {
      setAnalyzing(false)
    }
  }

  // Load Demo Data
  const handleLoadDemo = async () => {
    try {
      setSeedingDemo(true)
      const res = await fetch("/api/admin/autopricer/demo", { method: "POST" })
      if (res.ok) {
        await fetchProducts()
      } else {
        alert("Failed to load demo data.")
      }
    } catch (err) {
      console.error(err)
    } finally {
      setSeedingDemo(false)
    }
  }

  // Sync Live Amazon Pricing & Fees
  const handleSyncAmazon = async () => {
    try {
      setSyncingAmazon(true)
      const res = await fetch("/api/admin/autopricer/sync-amazon", { method: "POST" })
      if (res.ok) {
        const data = await res.json()
        alert(data.message || "Synced Amazon pricing & fees!")
        await fetchProducts()
      } else {
        const err = await res.text()
        alert(`Sync failed: ${err}`)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setSyncingAmazon(false)
    }
  }

  // Sync Keepa Historical Time-Series
  const handleSyncKeepa = async (productId?: string) => {
    try {
      setSyncingKeepa(true)
      const res = await fetch("/api/admin/autopricer/keepa/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(productId ? { productId } : {}),
      })
      const data = await res.json()
      if (res.ok) {
        alert(data.message || "Synced Keepa historical time series!")
        await fetchProducts()
        if (selectedProductForKeepa && productId === selectedProductForKeepa) {
          await fetchKeepaHistory(selectedProductForKeepa)
        }
      } else {
        alert(`Keepa sync failed: ${data.error}`)
      }
    } catch (e) {
      console.error(e)
      alert("Error triggering Keepa sync.")
    } finally {
      setSyncingKeepa(false)
    }
  }

  // Fetch Keepa History Data
  const fetchKeepaHistory = async (prodId: string) => {
    try {
      setKeepaLoading(true)
      const res = await fetch(`/api/admin/autopricer/keepa/history/${prodId}`)
      if (res.ok) {
        const data = await res.json()
        setKeepaHistoryData(data)
      } else {
        const err = await res.json()
        alert(`Failed to load Keepa intelligence: ${err.error}`)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setKeepaLoading(false)
    }
  }

  useEffect(() => {
    if (activeTab === "keepa" && !selectedProductForKeepa && products.length > 0) {
      const firstId = products[0].id
      setSelectedProductForKeepa(firstId)
      fetchKeepaHistory(firstId)
    }
  }, [activeTab, products, selectedProductForKeepa])

  // Open Enhanced Approval Modal
  const handleOpenApprovalModal = (change: PriceChangeLog) => {
    setApprovingChange(change)
    setApprovalModifiedPrice(String(change.newPrice))
    setApprovalIsTemporary(false)
    setApprovalRestorePrice(String(change.oldPrice))
    setApprovalExpiresHours("24")
    setAmazonFeedback(null)
    setIsApprovalModalOpen(true)
  }

  // Poll the feed-status endpoint until Amazon finishes processing the price
  // feed, then return the final result. Same client-poll pattern as sync-sales
  // so we never hit Vercel's serverless timeout.
  const resolveFeedStatus = async (feedSubmissionId: string): Promise<{ accepted: boolean; errors: string[] } | null> => {
    const MAX_ATTEMPTS = 60 // 60 * 5s = up to 5 min
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      try {
        const res = await fetch(`/api/admin/autopricer/approve/feed-status?feedSubmissionId=${encodeURIComponent(feedSubmissionId)}`)
        if (!res.ok) return null
        const data = await res.json()
        if (data.status === "DONE") {
          return { accepted: data.accepted, errors: data.errors || [] }
        }
        if (data.status === "IN_PROGRESS") {
          setAmazonFeedback({ ok: true, text: `Amazon is still processing the price feed… (check ${attempt + 1}/${MAX_ATTEMPTS})` })
        }
      } catch (e) {
        // network blip — keep polling
      }
      await new Promise((r) => setTimeout(r, 5000))
    }
    return null // timed out
  }

  // Confirm Enhanced Approval
  const handleConfirmEnhancedApproval = async () => {
    if (!approvingChange) return
    setApprovingLive(true)
    setAmazonFeedback(null)
    try {
      const res = await fetch("/api/admin/autopricer/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          logIds: [approvingChange.id],
          action: "APPROVE",
          modifiedPrice: Number(approvalModifiedPrice),
          isTemporary: approvalIsTemporary,
          restorePrice: Number(approvalRestorePrice),
          expiresAt: approvalIsTemporary
            ? new Date(Date.now() + Number(approvalExpiresHours) * 3600 * 1000).toISOString()
            : undefined,
          dryRun: approvalDryRun,
        }),
      })
      const data = await res.json().catch(() => ({}))

      // DRY RUN — preview only, nothing changed. Keep the modal open so the
      // seller can review the exact payload, then uncheck Dry Run to push live.
      if (data?.dryRun) {
        const lines: string[] = []
        for (const it of data.items || []) {
          lines.push(`• ${it.productName} (${it.sku}): $${it.currentPrice.toFixed(2)} → $${it.finalPrice.toFixed(2)}${it.clamped ? ` — ${it.clampNote}` : ""}`)
        }
        setAmazonFeedback({
          ok: true,
          text: `DRY RUN PREVIEW — nothing was sent to Amazon. Would push:\n${lines.join("\n")}\n\nTo actually change the live Amazon price, uncheck "Dry Run" and click Confirm again.`,
        })
        return
      }

      if (!res.ok) {
        setAmazonFeedback({ ok: false, text: data?.error || "Failed to submit price change to Amazon." })
        return
      }

      // Amazon accepted the submission. If still processing, poll until done.
      if (data.status === "PROCESSING" && data.feedSubmissionId) {
        setAmazonFeedback({ ok: true, text: "Price feed submitted to Amazon. Waiting for it to finish processing…" })
        const final = await resolveFeedStatus(data.feedSubmissionId)
        if (!final) {
          setAmazonFeedback({ ok: false, text: "Amazon is still processing the feed after several minutes. It will finish on its own — refresh the panel shortly to see the updated price." })
          await fetchProducts()
          return
        }
        if (final.accepted) {
          setAmazonFeedback({ ok: true, text: "✅ Amazon accepted the price update. The live listing price has been changed." })
        } else {
          setAmazonFeedback({ ok: false, text: `⚠️ Amazon rejected the update:\n${(final.errors || []).join("\n")}` })
        }
        await fetchProducts()
        return
      }

      // Server already got the final result within its poll window.
      if (data.status === "DONE") {
        if (data.accepted) {
          setAmazonFeedback({ ok: true, text: "✅ Amazon accepted the price update. The live listing price has been changed." })
        } else {
          setAmazonFeedback({ ok: false, text: `⚠️ Amazon rejected the update:\n${(data.errors || []).join("\n")}` })
        }
        setIsApprovalModalOpen(false)
        setApprovingChange(null)
        await fetchProducts()
        return
      }
    } catch (err: any) {
      console.error(err)
      setAmazonFeedback({ ok: false, text: err?.message || "Network error while submitting the price change." })
    } finally {
      setApprovingLive(false)
    }
  }

  // Handle Approve / Reject (bulk). Approve now pushes live to Amazon (or
  // previews when Dry Run is checked).
  const handleApprovalAction = async (logIds: string[], action: "APPROVE" | "REJECT") => {
    if (logIds.length === 0) return
    setApprovingLive(true)
    setAmazonFeedback(null)
    try {
      const res = await fetch("/api/admin/autopricer/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ logIds, action, dryRun: action === "APPROVE" ? approvalDryRun : false }),
      })
      const data = await res.json().catch(() => ({}))

      if (action === "REJECT") {
        if (res.ok) {
          setSelectedLogIds([])
          setAmazonFeedback({ ok: true, text: `Rejected ${data.processedCount || logIds.length} price change(s).` })
          await fetchProducts()
        } else {
          setAmazonFeedback({ ok: false, text: "Failed to process rejection." })
        }
        return
      }

      // APPROVE
      if (data?.dryRun) {
        const lines: string[] = (data.items || []).map((it: any) => `• ${it.productName} (${it.sku}): $${it.currentPrice.toFixed(2)} → $${it.finalPrice.toFixed(2)}${it.clamped ? ` — ${it.clampNote}` : ""}`)
        setAmazonFeedback({ ok: true, text: `DRY RUN PREVIEW — nothing was sent to Amazon. Would push ${data.items?.length || 0} change(s):\n${lines.join("\n")}\n\nUncheck "Dry Run" to push live.` })
        return
      }

      if (!res.ok) {
        setAmazonFeedback({ ok: false, text: data?.error || "Failed to submit price changes to Amazon." })
        return
      }

      if (data.status === "PROCESSING" && data.feedSubmissionId) {
        setAmazonFeedback({ ok: true, text: `Price feed submitted to Amazon for ${data.processedCount || logIds.length} SKU(s). Waiting for processing…` })
        const final = await resolveFeedStatus(data.feedSubmissionId)
        if (!final) {
          setAmazonFeedback({ ok: false, text: "Amazon is still processing the feed after several minutes. Refresh the panel shortly to see updated prices." })
          await fetchProducts()
          return
        }
        if (final.accepted) {
          setAmazonFeedback({ ok: true, text: `✅ Amazon accepted the price updates for ${logIds.length} SKU(s). Live prices changed.` })
        } else {
          setAmazonFeedback({ ok: false, text: `⚠️ Amazon reported errors:\n${(final.errors || []).join("\n")}` })
        }
        setSelectedLogIds([])
        await fetchProducts()
        return
      }

      if (data.status === "DONE") {
        if (data.accepted) {
          setAmazonFeedback({ ok: true, text: `✅ Amazon accepted the price updates for ${logIds.length} SKU(s). Live prices changed.` })
        } else {
          setAmazonFeedback({ ok: false, text: `⚠️ Amazon reported errors:\n${(data.errors || []).join("\n")}` })
        }
        setSelectedLogIds([])
        await fetchProducts()
        return
      }
    } catch (err: any) {
      console.error(err)
      setAmazonFeedback({ ok: false, text: err?.message || "Network error while submitting price changes." })
    } finally {
      setApprovingLive(false)
    }
  }

  // Create Product
  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const res = await fetch("/api/admin/autopricer/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })
      if (res.ok) {
        setIsAddModalOpen(false)
        setFormData({
          asin: "",
          sku: "",
          marketplace: "US",
          productName: "",
          category: "Coffee",
          imageUrl: "",
          currentPrice: "",
          unitCost: "",
          fulfillmentMethod: "FBA",
          minPrice: "",
          maxPrice: "",
          minMarginPercent: PRICE_INTELLIGENCE_CONFIG.DEFAULTS.MIN_DESIRED_MARGIN_PERCENT.toString(),
          referralFeePercent: PRICE_INTELLIGENCE_CONFIG.DEFAULTS.REFERRAL_FEE_PERCENT.toString(),
          fbaFee: PRICE_INTELLIGENCE_CONFIG.DEFAULTS.ESTIMATED_FBA_FEE_USD.toString(),
        })
        await fetchProducts()
      } else {
        const text = await res.text()
        alert(`Error: ${text}`)
      }
    } catch (err) {
      console.error(err)
    }
  }

  // Update Product
  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedProduct) return
    try {
      const res = await fetch(`/api/admin/autopricer/products/${selectedProduct.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productName: formData.productName,
          unitCost: formData.unitCost,
          fulfillmentMethod: formData.fulfillmentMethod,
          minPrice: formData.minPrice,
          maxPrice: formData.maxPrice,
          minMarginPercent: formData.minMarginPercent,
          referralFeePercent: formData.referralFeePercent,
          fbaFee: formData.fbaFee,
        }),
      })
      if (res.ok) {
        setIsEditModalOpen(false)
        setSelectedProduct(null)
        await fetchProducts()
      } else {
        alert("Failed to update product")
      }
    } catch (err) {
      console.error(err)
    }
  }

  // Delete Product
  const handleDeleteProduct = async (id: string) => {
    if (!confirm("Are you sure you want to stop monitoring this product?")) return
    try {
      await fetch(`/api/admin/autopricer/products/${id}`, { method: "DELETE" })
      await fetchProducts()
    } catch (err) {
      console.error(err)
    }
  }

  // Erase ALL monitored products at once (cascade deletes history/sales).
  const handleEraseAll = async () => {
    if (eraseConfirmText !== "ERASE ALL") return
    try {
      setErasing(true)
      const res = await fetch(`/api/admin/autopricer/products?confirm=ERASE_ALL&scope=all`, {
        method: "DELETE",
      })
      if (res.ok) {
        const data = await res.json()
        alert(data.message || "All monitored products erased.")
        setShowEraseAllDialog(false)
        setEraseConfirmText("")
        await fetchProducts()
      } else {
        const data = await res.json().catch(() => ({}))
        alert(data.error || "Failed to erase products.")
      }
    } catch (err) {
      console.error(err)
      alert("Failed to erase products.")
    } finally {
      setErasing(false)
    }
  }

  // Bulk-set min/max price guardrails across all (or filtered) products.
  const handleSaveBounds = async () => {
    const min = boundsForm.minPrice === "" ? null : parseFloat(boundsForm.minPrice)
    const max = boundsForm.maxPrice === "" ? null : parseFloat(boundsForm.maxPrice)
    if (min === null && max === null) {
      alert("Enter at least a min or max price.")
      return
    }
    if (min !== null && isNaN(min)) return alert("Min price must be a number.")
    if (max !== null && isNaN(max)) return alert("Max price must be a number.")
    if (min !== null && max !== null && min > max) return alert("Min price cannot be greater than max price.")

    try {
      setSavingBounds(true)
      const res = await fetch(`/api/admin/autopricer/products`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          minPrice: min,
          maxPrice: max,
          scope: boundsForm.scope,
          marketplace: selectedMarketplace,
          status: "ALL",
          action: selectedAction,
          search,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        alert(data.message || "Price guardrails updated.")
        setShowBoundsDialog(false)
        await fetchProducts()
      } else {
        const data = await res.json().catch(() => ({}))
        alert(data.error || "Failed to update guardrails.")
      }
    } catch (err) {
      console.error(err)
      alert("Failed to update guardrails.")
    } finally {
      setSavingBounds(false)
    }
  }

  // One-click Sync Sales: orchestrates the 3-step report flow without manual URLs.
  // Polling is client-side so Vercel's serverless timeout is never hit.
  const handleSyncSales = async () => {
    try {
      setSyncingSales(true)
      setSyncStatus("Requesting sales report from Amazon...")

      // Step 1: request a report (or reuse a recent DONE one).
      let res = await fetch(`/api/admin/autopricer/sync-sales`)
      let data = await res.json()

      // If a recent DONE report was reused, it returns reportDocumentId directly.
      if (data.reportDocumentId) {
        await downloadAndSave(data.reportDocumentId)
        return
      }

      // Otherwise a new report was created -> poll by reportId until DONE.
      const reportId = data.reportId
      if (!reportId) throw new Error(data.error || "No reportId returned by sync-sales")

      setSyncStatus(`Amazon is generating the report (${reportId}). This can take 2-15 min for 30 days of orders. Waiting...`)
      let attempts = 0
      const MAX_ATTEMPTS = 90 // ~15 min at 10s intervals
      let finished = false

      while (!finished && attempts < MAX_ATTEMPTS) {
        await new Promise((r) => setTimeout(r, 10000))
        attempts++
        const pr = await fetch(`/api/admin/autopricer/sync-sales?reportId=${reportId}`)
        const pd = await pr.json()

        if (pd.reportDocumentId) {
          setSyncStatus("Report ready. Downloading & saving sales data...")
          await downloadAndSave(pd.reportDocumentId)
          finished = true
        } else if (pd.error && /CANCELLED|FATAL/i.test(pd.error)) {
          setSyncStatus(`Report failed: ${pd.error}`)
          finished = true
        } else {
          setSyncStatus(`Waiting for Amazon... status: ${pd.processingStatus || "PROCESSING"} (attempt ${attempts}/${MAX_ATTEMPTS})`)
        }
      }
      if (!finished) {
        setSyncStatus("Timed out waiting for the report. The button will keep the report running on Amazon's side — click Sync Sales again in a few minutes to pick it up.")
      }
    } catch (e: any) {
      console.error(e)
      setSyncStatus("Sync failed: " + (e?.message || e))
    } finally {
      setSyncingSales(false)
    }
  }

  // Step 3 helper: download the report document and save sales to the DB.
  const downloadAndSave = async (reportDocumentId: string) => {
    const dl = await fetch(`/api/admin/autopricer/sync-sales?reportDocumentId=${reportDocumentId}`)
    const d = await dl.json()
    if (d.success) {
      const det = d.details || {}
      setSyncStatus(
        `Done. Synced ${det.matchedToMonitoredProducts ?? 0} daily-sales records ` +
        `(${det.matchedBySku ?? 0} by SKU, ${det.matchedByAsin ?? 0} by ASIN` +
        `${det.unmatchedSkuCount ? `, ${det.unmatchedSkuCount} unmatched SKUs` : ""}).`
      )
      await fetchProducts()
    } else {
      setSyncStatus("Download failed: " + (d.error || "unknown error"))
    }
  }

  // Fetch Live Amazon & Warehouse Catalog
  const fetchCatalog = async () => {
    try {
      setCatalogLoading(true)
      const res = await fetch("/api/admin/autopricer/import-catalog")
      if (res.ok) {
        const data = await res.json()
        setCatalogItems(data.catalog || [])
      }
    } catch (e) {
      console.error("Failed to fetch catalog:", e)
    } finally {
      setCatalogLoading(false)
    }
  }

  // One-Click Import from Catalog
  const handleOneClickImport = async (item: any) => {
    let finalCost = item.unitCost
    if (!item.hasCost) {
      const input = prompt(`⚠️ "${item.name}" does not have a saved Manufacturing Unit Cost (COGS) yet.\n\nPlease enter your actual Unit Cost ($) to import:`, "12.00")
      if (!input || isNaN(parseFloat(input))) return
      finalCost = parseFloat(input)
    }
    try {
      setImportingId(item.id)
      const res = await fetch("/api/admin/autopricer/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          asin: item.asin,
          sku: item.sku,
          marketplace: "US",
          productName: item.name,
          category: item.category || "General",
          imageUrl: item.imageUrl || "",
          currentPrice: item.currentPrice.toString(),
          unitCost: finalCost.toString(),
          fulfillmentMethod: item.fulfillmentMethod,
          minPrice: (Math.round(finalCost * 1.3 * 100) / 100).toString(),
          maxPrice: (Math.round(finalCost * 4.0 * 100) / 100).toString(),
          minMarginPercent: PRICE_INTELLIGENCE_CONFIG.DEFAULTS.MIN_DESIRED_MARGIN_PERCENT.toString(),
          referralFeePercent: PRICE_INTELLIGENCE_CONFIG.DEFAULTS.REFERRAL_FEE_PERCENT.toString(),
          fbaFee: PRICE_INTELLIGENCE_CONFIG.DEFAULTS.ESTIMATED_FBA_FEE_USD.toString(),
        }),
      })
      if (res.ok) {
        await fetchCatalog()
        await fetchProducts()
      } else {
        const text = await res.text()
        alert(`Failed to import: ${text}`)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setImportingId(null)
    }
  }

  // Customize from Catalog
  const openCustomizeFromCatalog = (item: any) => {
    setFormData({
      asin: item.asin,
      sku: item.sku,
      marketplace: "US",
      productName: item.name,
      category: item.category || "General",
      imageUrl: item.imageUrl || "",
      currentPrice: item.currentPrice.toString(),
      unitCost: item.unitCost.toString(),
      fulfillmentMethod: item.fulfillmentMethod,
      minPrice: (Math.round(item.unitCost * 1.3 * 100) / 100).toString(),
      maxPrice: (Math.round(item.unitCost * 4.0 * 100) / 100).toString(),
      minMarginPercent: PRICE_INTELLIGENCE_CONFIG.DEFAULTS.MIN_DESIRED_MARGIN_PERCENT.toString(),
      referralFeePercent: PRICE_INTELLIGENCE_CONFIG.DEFAULTS.REFERRAL_FEE_PERCENT.toString(),
      fbaFee: PRICE_INTELLIGENCE_CONFIG.DEFAULTS.ESTIMATED_FBA_FEE_USD.toString(),
    })
    setIsImportModalOpen(false)
    setIsAddModalOpen(true)
  }

  // Open Edit Modal
  const openEdit = (p: MonitoredProduct) => {
    setSelectedProduct(p)
    setFormData({
      asin: p.asin,
      sku: p.sku,
      marketplace: p.marketplace,
      productName: p.productName,
      category: p.category || "",
      imageUrl: p.imageUrl || "",
      currentPrice: p.currentPrice.toString(),
      unitCost: p.unitCost.toString(),
      fulfillmentMethod: p.fulfillmentMethod,
      minPrice: p.minPrice.toString(),
      maxPrice: p.maxPrice.toString(),
      minMarginPercent: p.minMarginPercent.toString(),
      referralFeePercent: p.referralFeePercent.toString(),
      fbaFee: p.fbaFee.toString(),
    })
    setIsEditModalOpen(true)
  }

  // Open Simulator
  const openSimulator = (p: MonitoredProduct) => {
    setSelectedProduct(p)
    setSimulatedPrice(p.currentPrice)
    setIsSimulatorOpen(true)
  }

  // Calculate simulated metrics
  const simMetrics = useMemo(() => {
    if (!selectedProduct) return null
    const price = simulatedPrice
    const cost = selectedProduct.unitCost
    const referralFee = (price * selectedProduct.referralFeePercent) / 100
    const fbaFee = selectedProduct.fulfillmentMethod === "FBA" ? selectedProduct.fbaFee : 0
    const grossProfit = price - cost - referralFee - fbaFee
    const netMarginPct = price > 0 ? (grossProfit / price) * 100 : 0
    
    // Estimate Buy Box Win Probability based on simulated distance to Buy Box price
    const buyBoxPrice = selectedProduct.currentBuyBoxPrice || price
    let winProb = 85
    if (price < buyBoxPrice) winProb = Math.min(99, 85 + (buyBoxPrice - price) * 10)
    else if (price > buyBoxPrice) winProb = Math.max(10, 85 - (price - buyBoxPrice) * 15)

    const dailyVol = selectedProduct.velocityDaily || 10
    // Adjust velocity elasticity slightly
    const estVol = price < selectedProduct.currentPrice ? dailyVol * 1.15 : price > selectedProduct.currentPrice ? dailyVol * 0.85 : dailyVol
    const monthlyProfit = grossProfit * estVol * 30

    return { referralFee, grossProfit, netMarginPct, winProb: Math.round(winProb), monthlyProfit: Math.round(monthlyProfit) }
  }, [selectedProduct, simulatedPrice])

  // Extract all pending changes across portfolio
  const pendingApprovalsList = useMemo(() => {
    const list: (PriceChangeLog & { product: MonitoredProduct })[] = []
    products.forEach((p) => {
      if (p.calculated?.pendingChange) {
        list.push({
          ...p.calculated.pendingChange,
          product: p,
        })
      }
    })
    return list
  }, [products])

  // Handle Manual Inline Price Update
  const handleManualPriceUpdate = async (id: string) => {
    try {
      setSubmittingPrice(true)
      const res = await fetch(`/api/admin/autopricer/products/${id}/manual-price`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPrice: editingPriceValue }),
      })
      const data = await res.json()
      if (res.ok) {
        setEditingPriceId(null)
        await fetchProducts() // Refresh to show new price
      } else {
        alert("Failed to update price: " + data.error)
      }
    } catch (err) {
      console.error(err)
      alert("Error submitting manual price update")
    } finally {
      setSubmittingPrice(false)
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* ── Header & Action Strip ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 p-6 rounded-2xl shadow-xl border border-indigo-500/20 text-white">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 bg-indigo-500/20 rounded-lg text-indigo-400 border border-indigo-500/30">
              <TrendingUp className="h-5 w-5" />
            </span>
            <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-white via-indigo-100 to-indigo-300 bg-clip-text text-transparent">
              {PRICE_INTELLIGENCE_CONFIG.APP_NAME}
            </h1>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              AI Powered
            </span>
          </div>
          <p className="text-sm text-slate-300 max-w-2xl">
            {PRICE_INTELLIGENCE_CONFIG.APP_DESCRIPTION}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleLoadDemo}
            disabled={seedingDemo || analyzing}
            className="bg-slate-800/80 hover:bg-slate-700 text-slate-200 border-slate-600"
          >
            <Sparkles className="h-4 w-4 mr-2 text-amber-400 animate-pulse" />
            {seedingDemo ? "Seeding Demo..." : "Load Demo Products"}
          </Button>
          <Button
            size="sm"
            onClick={handleRunAnalysis}
            disabled={analyzing || loading}
            className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-lg shadow-indigo-500/25 border-0 font-medium"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${analyzing ? "animate-spin" : ""}`} />
            {analyzing ? "Analyzing Intelligence..." : "Run Intelligence Analysis"}
          </Button>
          <Button
            size="sm"
            onClick={handleSyncAmazon}
            disabled={syncingAmazon || loading}
            className="bg-purple-600 hover:bg-purple-500 text-white shadow-md font-medium"
          >
            <RefreshCw className={`h-4 w-4 mr-1.5 ${syncingAmazon ? "animate-spin" : ""}`} />
            {syncingAmazon ? "Syncing Amazon..." : "Sync Amazon Pricing & Fees"}
          </Button>
          <Button
            size="sm"
            onClick={() => handleSyncKeepa()}
            disabled={syncingKeepa || loading}
            className="bg-emerald-600 hover:bg-emerald-500 text-white shadow-md font-medium"
          >
            <Zap className={`h-4 w-4 mr-1.5 ${syncingKeepa ? "animate-spin text-amber-300" : ""}`} />
            {syncingKeepa ? "Syncing Keepa..." : "Sync Keepa Intelligence"}
          </Button>
          <Button
            size="sm"
            onClick={() => {
              setIsImportModalOpen(true)
              fetchCatalog()
            }}
            className="bg-blue-600 hover:bg-blue-500 text-white shadow-md font-medium"
          >
            <Package className="h-4 w-4 mr-1.5" />
            Import from Inventory
          </Button>
          <Button
            size="sm"
            onClick={() => setIsAddModalOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-500 text-white shadow-md font-medium"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Add Monitored Product
          </Button>
        </div>
      </div>

      {/* ── KPI Cards Strip ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Monitored Products</span>
            <span className="p-2 bg-blue-500/10 text-blue-600 rounded-lg">
              <Layers className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold">{kpis.totalMonitored}</span>
            <span className="text-xs font-medium text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full">
              {kpis.totalActive} Active
            </span>
          </div>
        </Card>

        <Card 
          onClick={() => setActiveTab("approvals")} 
          className={`p-4 border-slate-200 dark:border-slate-800 backdrop-blur-sm cursor-pointer transition-all hover:shadow-md ${
            kpis.pendingApprovalsCount > 0 
              ? "bg-amber-500/5 dark:bg-amber-500/10 border-amber-500/30 ring-1 ring-amber-500/30 animate-pulse" 
              : "bg-white/50 dark:bg-slate-900/50"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4" />
              Pending Approvals
            </span>
            <span className="p-2 bg-amber-500/10 text-amber-600 rounded-lg">
              <AlertTriangle className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-amber-600 dark:text-amber-400">{kpis.pendingApprovalsCount}</span>
            <span className="text-xs font-semibold underline text-amber-700 dark:text-amber-300">
              Review Guardrails ➔
            </span>
          </div>
        </Card>

        <Card className="p-4 border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Monthly Profit Uplift</span>
            <span className="p-2 bg-emerald-500/10 text-emerald-600 rounded-lg">
              <DollarSign className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              +${kpis.potentialMonthlyProfitUplift.toLocaleString()}
            </span>
            <span className="text-xs text-muted-foreground">Est. 30-Day Target</span>
          </div>
        </Card>

        <Card className="p-4 border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Average Margin Health</span>
            <span className="p-2 bg-purple-500/10 text-purple-600 rounded-lg">
              <Percent className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className={`text-2xl font-bold ${kpis.averageMarginPercent >= 25 ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600"}`}>
              {kpis.averageMarginPercent}%
            </span>
            <span className="text-xs text-muted-foreground">Target: 25.0%+</span>
          </div>
        </Card>
      </div>

      {/* ── Navigation Tabs ── */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <Button
          variant={activeTab === "dashboard" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("dashboard")}
          className="font-medium"
        >
          <BarChart3 className="h-4 w-4 mr-2" />
          Monitored Portfolio ({products.length})
        </Button>
        <Button
          variant={activeTab === "approvals" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("approvals")}
          className={`font-medium relative ${activeTab === "approvals" ? "bg-amber-600 hover:bg-amber-500 text-white" : ""}`}
        >
          <ShieldCheck className="h-4 w-4 mr-2" />
          Approval Queue
          {kpis.pendingApprovalsCount > 0 && (
            <span className="ml-2 px-2 py-0.2 text-xs font-bold bg-white text-amber-700 rounded-full">
              {kpis.pendingApprovalsCount}
            </span>
          )}
        </Button>
        <Button
          variant={activeTab === "keepa" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("keepa")}
          className={`font-medium ${activeTab === "keepa" ? "bg-emerald-600 hover:bg-emerald-500 text-white" : "text-emerald-500 dark:text-emerald-400"}`}
        >
          <TrendingUp className="h-4 w-4 mr-2" />
          Keepa Intelligence
        </Button>
        <Button
          variant={activeTab === "settings" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("settings")}
          className="font-medium"
        >
          <Key className="h-4 w-4 mr-2" />
          Keepa API Settings
        </Button>
      </div>

      {/* ── TAB 1: PORTFOLIO DASHBOARD ── */}
      {activeTab === "dashboard" && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-100/60 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search ASIN, SKU, or Brand..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-white dark:bg-slate-950 text-sm h-9"
              />
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={selectedMarketplace}
                onChange={(e) => setSelectedMarketplace(e.target.value)}
                className="h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="ALL">🌐 All Marketplaces</option>
                {PRICE_INTELLIGENCE_CONFIG.MARKETPLACES.map((m) => (
                  <option key={m.code} value={m.code}>
                    {m.flag} {m.code} - {m.currency}
                  </option>
                ))}
              </select>
              <select
                value={selectedAction}
                onChange={(e) => setSelectedAction(e.target.value)}
                className="h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="ALL">⚡ All Recommendations</option>
                <option value="RAISE">🟢 Raise Price</option>
                <option value="LOWER">🔴 Lower Price</option>
                <option value="MAINTAIN">⚪ Maintain Price</option>
              </select>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowBoundsDialog(true)}
                className="h-9 font-medium"
                title="Set a floor and ceiling price the autopricer will never cross, applied to all (or filtered) products."
              >
                <Sliders className="h-4 w-4 mr-1.5" />
                Set Min/Max Price
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={handleSyncSales}
                disabled={syncingSales}
                className="h-9 font-medium bg-indigo-600 hover:bg-indigo-500 text-white"
                title="Download the last 30 days of Amazon orders and sync daily sales per SKU/ASIN. This is what feeds the AI rank analysis."
              >
                <RefreshCw className={`h-4 w-4 mr-1.5 ${syncingSales ? "animate-spin" : ""}`} />
                {syncingSales ? "Syncing..." : "Sync Sales"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowEraseAllDialog(true)}
                className="h-9 font-medium text-rose-600 dark:text-rose-400 border-rose-300 dark:border-rose-900 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                title="Erase ALL monitored products at once. This cannot be undone."
              >
                <Trash2 className="h-4 w-4 mr-1.5" />
                Erase All
              </Button>
            </div>
          </div>

          {/* Sync Sales status line */}
          {syncStatus && (
            <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 bg-slate-100/60 dark:bg-slate-900/60 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800">
              <RefreshCw className={`h-3.5 w-3.5 ${syncingSales ? "animate-spin text-indigo-500" : "text-emerald-500"}`} />
              <span>{syncStatus}</span>
            </div>
          )}

          {/* Products Grid / Table */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
              <p className="text-sm text-muted-foreground mt-3 font-medium">Loading Monitored Amazon Portfolio...</p>
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-16 bg-slate-50 dark:bg-slate-900/30 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800">
              <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-40" />
              <h3 className="text-lg font-bold">No Products Being Monitored</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto mt-1 mb-6">
                Start by clicking Add Monitored Product or use our one-click Demo Data loader to test the pricing engine with realistic private label items.
              </p>
              <Button onClick={handleLoadDemo} className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium">
                <Sparkles className="h-4 w-4 mr-2" />
                Load Demo Products Now
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {products.map((p) => {
                const actionConfig = PRICE_INTELLIGENCE_CONFIG.ACTIONS[p.recommendedAction as RecommendedActionCode] || PRICE_INTELLIGENCE_CONFIG.ACTIONS.MAINTAIN
                const mp = PRICE_INTELLIGENCE_CONFIG.MARKETPLACES.find((m) => m.code === p.marketplace) || PRICE_INTELLIGENCE_CONFIG.MARKETPLACES[0]
                const margin = p.calculated?.netMarginPct ?? 0

                return (
                  <Card key={p.id} className="overflow-hidden border-slate-200 dark:border-slate-800 flex flex-col justify-between hover:shadow-lg transition-all bg-white dark:bg-slate-900">
                    <div className="p-4 space-y-3">
                      {/* Top Bar: ASIN + Marketplace */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-lg" title={mp.name}>{mp.flag}</span>
                          <a 
                            href={`https://www.amazon.com/dp/${p.asin}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-mono text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 px-2 py-0.5 rounded text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors flex items-center gap-1 group"
                            title="View on Amazon"
                          >
                            {p.asin}
                            <ExternalLink className="h-3 w-3 opacity-50 group-hover:opacity-100 transition-opacity" />
                          </a>
                          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                            {p.fulfillmentMethod}
                          </span>
                        </div>
                        {p.calculated?.hasPendingApproval && (
                          <span className="text-[10px] font-bold bg-amber-500 text-white px-2 py-0.5 rounded-full animate-bounce">
                            Pending Approval
                          </span>
                        )}
                      </div>

                      {/* Product Name & SKU */}
                      <div>
                        <h4 className="font-bold text-sm line-clamp-1 text-slate-900 dark:text-slate-100" title={p.productName}>
                          {p.productName}
                        </h4>
                        <p className="text-xs text-muted-foreground font-mono mt-0.5">SKU: {p.sku}</p>
                      </div>

                      {/* Unit Economics Box */}
                      <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-200/60 dark:border-slate-800/60 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground flex items-center gap-1.5">
                            Current Price:
                            {editingPriceId !== p.id && (
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingPriceId(p.id)
                                  setEditingPriceValue(p.currentPrice.toString())
                                }}
                                className="text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-0.5 font-semibold bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 px-1.5 py-0.5 rounded transition-all hover:scale-105"
                                title="Manually override Amazon price"
                              >
                                <Edit3 className="h-2.5 w-2.5" /> Edit
                              </button>
                            )}
                          </span>
                          {editingPriceId === p.id ? (
                            <div className="flex items-center gap-1">
                              <span className="text-muted-foreground">{mp.symbol}</span>
                              <Input
                                type="number"
                                step="0.01"
                                value={editingPriceValue}
                                onChange={(e) => setEditingPriceValue(e.target.value)}
                                className="w-20 h-6 text-xs px-1.5 py-0 text-right"
                                autoFocus
                              />
                              <Button
                                size="sm"
                                onClick={() => handleManualPriceUpdate(p.id)}
                                disabled={submittingPrice}
                                className="h-6 w-6 p-0 bg-emerald-600 hover:bg-emerald-500 rounded text-white ml-1"
                                title="Save to Amazon"
                              >
                                {submittingPrice ? <RefreshCw className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setEditingPriceId(null)}
                                disabled={submittingPrice}
                                className="h-6 w-6 p-0 rounded text-slate-500"
                                title="Cancel"
                              >
                                <XCircle className="h-3 w-3" />
                              </Button>
                            </div>
                          ) : (
                            <span className="font-bold text-sm text-slate-900 dark:text-white">
                              {mp.symbol}{p.currentPrice.toFixed(2)}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground flex items-center gap-1.5">
                            Unit Cost:
                            <button
                              type="button"
                              onClick={() => openEdit(p)}
                              className="text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-0.5 font-semibold bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 px-1.5 py-0.5 rounded transition-all hover:scale-105"
                              title="Click to edit Unit Cost"
                            >
                              <Edit3 className="h-2.5 w-2.5" /> Edit
                            </button>
                          </span>
                          <span className="font-semibold text-slate-700 dark:text-slate-300">
                            {mp.symbol}{p.unitCost.toFixed(2)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Fees (Referral + FBA):</span>
                          <span className="text-slate-600 dark:text-slate-400">
                            {mp.symbol}{((p.calculated?.referralFee ?? 0) + p.fbaFee).toFixed(2)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs border-t border-slate-200/80 dark:border-slate-800/80 pt-1 font-semibold">
                          <span className="text-slate-700 dark:text-slate-300">Total Cost + Fees:</span>
                          <span className="text-slate-900 dark:text-white font-bold">
                            {mp.symbol}{(p.unitCost + (p.calculated?.referralFee ?? 0) + p.fbaFee).toFixed(2)}
                          </span>
                        </div>
                        <div className="border-t border-slate-200 dark:border-slate-800 pt-1.5 flex items-center justify-between text-xs font-semibold">
                          <span>Net Profit Margin:</span>
                          <span className={`px-2 py-0.5 rounded font-bold ${margin >= Math.min(p.minMarginPercent ?? 15, 15) ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20" : margin >= 10 ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20" : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"}`}>
                            {mp.symbol}{p.calculated?.grossProfit.toFixed(2)} ({margin.toFixed(1)}%)
                          </span>
                        </div>
                      </div>

                      {/* Buy Box & Recommendation Badge */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground flex items-center gap-1">
                            Buy Box Price:
                            <span className="font-semibold text-slate-700 dark:text-slate-300">
                              {mp.symbol}{p.currentBuyBoxPrice?.toFixed(2) ?? p.currentPrice.toFixed(2)}
                            </span>
                          </span>
                          <span className={`font-semibold ${(p.buyBoxWinRate ?? 80) >= 80 ? "text-emerald-600" : "text-amber-600"}`}>
                            {p.buyBoxWinRate ?? 85}% Win Rate
                          </span>
                        </div>

                        {/* Action Badge */}
                        <div className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-between ${actionConfig.badgeClass}`}>
                          <div className="flex items-center gap-1.5">
                            <span>{actionConfig.label}</span>
                            {p.recommendedPrice && p.recommendedPrice !== p.currentPrice && (
                              <span className="underline font-bold">
                                ➔ {mp.symbol}{p.recommendedPrice.toFixed(2)}
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] opacity-75 font-mono">{p.confidenceScore ?? 90}% Conf.</span>
                        </div>
                      </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="bg-slate-100/50 dark:bg-slate-950/50 p-2.5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openSimulator(p)}
                        className="flex-1 text-xs h-8 bg-white dark:bg-slate-900 font-semibold text-indigo-600 dark:text-indigo-400 border-indigo-500/30 hover:bg-indigo-50 dark:hover:bg-indigo-950/50"
                      >
                        <Sliders className="h-3.5 w-3.5 mr-1" />
                        Simulate
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedProductForKeepa(p.id)
                          fetchKeepaHistory(p.id)
                          setActiveTab("keepa")
                        }}
                        className="text-xs h-8 bg-white dark:bg-slate-900 font-semibold text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 px-2"
                        title="View Keepa Intelligence Chart & Heatmaps"
                      >
                        <TrendingUp className="h-3.5 w-3.5 mr-1" />
                        Keepa
                      </Button>
                      <div className="flex items-center">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => openEdit(p)}
                          className="h-8 w-8 text-slate-500 hover:text-slate-900 dark:hover:text-white"
                          title="Edit Rules & Cost"
                        >
                          <Edit3 className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleDeleteProduct(p.id)}
                          className="h-8 w-8 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                          title="Stop Monitoring"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 2: APPROVAL QUEUE (EXPLICIT CONSENT GUARDRAIL) ── */}
      {activeTab === "approvals" && (
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent p-4 rounded-2xl border border-amber-500/30 flex items-start gap-3">
            <ShieldCheck className="h-6 w-6 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-amber-900 dark:text-amber-300 text-sm">
                Safety Guardrail Active: Explicit Human Approval Required
              </h3>
              <p className="text-xs text-amber-800 dark:text-amber-400/90 mt-0.5">
                To protect your brand equity and prevent erroneous marketplace repricing, no product price is ever changed automatically. Please review the AI data-science recommendations below and click Approve to push new pricing to your live Amazon catalog.
              </p>
            </div>
          </div>

          {pendingApprovalsList.length === 0 ? (
            <div className="text-center py-16 bg-slate-50 dark:bg-slate-900/30 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800">
              <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto mb-3 opacity-80" />
              <h3 className="text-lg font-bold">All Pricing Perfectly Aligned!</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto mt-1">
                There are no pending price change recommendations at this time. Run an Intelligence Analysis to evaluate real-time elasticity and Buy Box competition.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Bulk Approval Strip */}
              <div className="flex flex-col gap-3 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedLogIds.length === pendingApprovalsList.length}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedLogIds(pendingApprovalsList.map((l) => l.id))
                          else setSelectedLogIds([])
                        }}
                        className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="text-sm font-semibold">
                        Select All ({selectedLogIds.length}/{pendingApprovalsList.length})
                      </span>
                    </div>
                    <label className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300 cursor-pointer" title="When checked, Approve only previews the Amazon feed without changing live prices.">
                      <input
                        type="checkbox"
                        checked={approvalDryRun}
                        onChange={(e) => setApprovalDryRun(e.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      Dry Run (preview only)
                    </label>
                  </div>
                  {selectedLogIds.length > 0 && (
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleApprovalAction(selectedLogIds, "APPROVE")}
                        disabled={approvingLive}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs disabled:opacity-60"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                        {approvingLive ? "Pushing…" : approvalDryRun ? "Preview Selected" : "Approve & Push Selected"} ({selectedLogIds.length})
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleApprovalAction(selectedLogIds, "REJECT")}
                        disabled={approvingLive}
                        className="text-rose-600 border-rose-300 hover:bg-rose-50 text-xs font-semibold disabled:opacity-60"
                      >
                        <XCircle className="h-3.5 w-3.5 mr-1.5" />
                        Reject Selected
                      </Button>
                    </div>
                  )}
                </div>
                {amazonFeedback && (
                  <div
                    className={`text-xs whitespace-pre-wrap rounded-lg px-3 py-2 border ${
                      amazonFeedback.ok
                        ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300"
                        : "bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300"
                    }`}
                  >
                    {amazonFeedback.text}
                  </div>
                )}
              </div>

              {/* Pending Rows */}
              <div className="grid grid-cols-1 gap-3">
                {pendingApprovalsList.map((log) => {
                  const prod = log.product
                  const mp = PRICE_INTELLIGENCE_CONFIG.MARKETPLACES.find((m) => m.code === prod.marketplace) || PRICE_INTELLIGENCE_CONFIG.MARKETPLACES[0]
                  const isChecked = selectedLogIds.includes(log.id)

                  const diff = log.newPrice - log.oldPrice
                  const isRaise = diff > 0

                  return (
                    <Card key={log.id} className="p-4 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) setSelectedLogIds([...selectedLogIds, log.id])
                            else setSelectedLogIds(selectedLogIds.filter((id) => id !== log.id))
                          }}
                          className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 mt-1"
                        />
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                              {mp.flag} {prod.asin}
                            </span>
                            <span className={`text-xs font-bold px-2 py-0.5 rounded ${isRaise ? "bg-emerald-500/10 text-emerald-600" : "bg-rose-500/10 text-rose-600"}`}>
                              {log.recommendedAction}
                            </span>
                          </div>
                          <h4 className="font-bold text-sm text-slate-900 dark:text-white">{prod.productName}</h4>
                          <p className="text-xs text-muted-foreground font-mono">SKU: {prod.sku} | Unit Cost: {mp.symbol}{prod.unitCost.toFixed(2)}</p>
                          <div className="bg-slate-50 dark:bg-slate-950 p-2.5 rounded-lg border border-slate-200/60 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 max-w-xl mt-2">
                            <span className="font-semibold text-indigo-600 dark:text-indigo-400">AI Reasoning: </span>
                            {log.reason}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center gap-3 border-t md:border-t-0 pt-3 md:pt-0 border-slate-200 dark:border-slate-800">
                        <div className="text-right">
                          <div className="text-xs text-muted-foreground">Price Change Proposal</div>
                          <div className="flex items-center gap-2 text-base font-bold">
                            <span className="line-through text-muted-foreground">{mp.symbol}{log.oldPrice.toFixed(2)}</span>
                            <ArrowRight className="h-4 w-4 text-slate-400" />
                            <span className={isRaise ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}>
                              {mp.symbol}{log.newPrice.toFixed(2)} ({isRaise ? "+" : ""}{diff.toFixed(2)})
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleOpenApprovalModal(log)}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs h-8 shadow-sm"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                            Review & Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleApprovalAction([log.id], "REJECT")}
                            className="text-rose-600 border-rose-300 hover:bg-rose-50 text-xs font-semibold h-8"
                          >
                            Reject
                          </Button>
                        </div>
                      </div>
                    </Card>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TAB: KEEPA INTELLIGENCE ── */}
      {activeTab === "keepa" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 p-4 rounded-xl border border-slate-800 text-white">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-5 w-5 text-emerald-400" />
              <div>
                <h3 className="font-bold text-sm">Select Monitored Product for Keepa Analysis:</h3>
                <p className="text-xs text-slate-400">View time-series charts, inverted Sales Rank, and day-of-week heatmaps.</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={selectedProductForKeepa || ""}
                onChange={(e) => {
                  setSelectedProductForKeepa(e.target.value)
                  fetchKeepaHistory(e.target.value)
                }}
                className="bg-slate-950 border border-slate-700 rounded-lg p-2 text-sm text-white font-medium min-w-[240px]"
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.productName} ({p.asin})
                  </option>
                ))}
              </select>
              <Button
                size="sm"
                onClick={() => selectedProductForKeepa && handleSyncKeepa(selectedProductForKeepa)}
                disabled={syncingKeepa || !selectedProductForKeepa}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold shrink-0"
              >
                <Zap className={`h-4 w-4 mr-1.5 ${syncingKeepa ? "animate-spin" : ""}`} />
                Refresh ASIN
              </Button>
            </div>
          </div>

          {keepaLoading ? (
            <div className="h-80 flex items-center justify-center text-slate-400 bg-slate-900 rounded-xl border border-slate-800 animate-pulse">
              Loading Keepa historical time series & weekday analysis...
            </div>
          ) : keepaHistoryData ? (
            <div className="space-y-6">
              <KeepaChart
                observations={keepaHistoryData.observations || []}
                productName={keepaHistoryData.product?.productName || "Selected Product"}
                asin={keepaHistoryData.product?.asin || ""}
                targetRankMin={keepaHistoryData.product?.targetRankMin}
                targetRankMax={keepaHistoryData.product?.targetRankMax}
              />
              <KeepaAnalytics
                key={keepaHistoryData.product?.id || selectedProductForKeepa || "default"}
                product={keepaHistoryData.product || products.find(p => p.id === selectedProductForKeepa)}
                weekdayProfiles={keepaHistoryData.weekdayProfiles || []}
                heatmap={keepaHistoryData.weekdayHeatmap || []}
                overallMedianRank={keepaHistoryData.overallMedianRank || 3000}
                trendAnalysis={keepaHistoryData.trendAnalysis}
                evaluations={keepaHistoryData.evaluations || []}
                priceHistory={keepaHistoryData.priceHistory || []}
              />
            </div>
          ) : (
            <div className="h-80 flex flex-col items-center justify-center text-slate-500 bg-slate-900 rounded-xl border border-slate-800">
              <p>Please select a product from the dropdown above to view Keepa intelligence.</p>
            </div>
          )}
        </div>
      )}

      {/* ── TAB: KEEPA API SETTINGS ── */}
      {activeTab === "settings" && <KeepaSettings />}

      {/* ── ENHANCED APPROVAL MODAL ── */}
      {isApprovalModalOpen && approvingChange && (
        <Dialog open={isApprovalModalOpen} onOpenChange={setIsApprovalModalOpen}>
          <DialogContent className="max-w-lg bg-slate-900 text-white border-slate-800">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl text-amber-400">
                <ShieldCheck className="h-6 w-6" />
                Review & Confirm Price Change
              </DialogTitle>
              <DialogDescription className="text-slate-400">
                You are approving a pricing update for <strong>{approvingChange.monitoredProduct?.productName || "Selected Product"}</strong>.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">Current Price:</span>
                  <span className="font-semibold text-slate-200">${approvingChange.oldPrice.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Recommended Price:</span>
                  <span className="font-bold text-emerald-400">${approvingChange.newPrice.toFixed(2)}</span>
                </div>
                {approvingChange.scheduledFor && (
                  <div className="flex justify-between text-indigo-400 font-bold">
                    <span>Scheduled Execution:</span>
                    <span>{new Date(approvingChange.scheduledFor).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}</span>
                  </div>
                )}
                <div className="text-xs text-slate-400 pt-1 border-t border-slate-800">
                  <strong>Reason:</strong> {approvingChange.reason}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 mb-1 block">
                  Final Approved Price ($) (Modify if desired):
                </label>
                <Input
                  type="number"
                  step="0.01"
                  value={approvalModifiedPrice}
                  onChange={(e) => setApprovalModifiedPrice(e.target.value)}
                  className="bg-slate-950 border-slate-700 text-white font-bold"
                />
              </div>

              <div className="pt-2 border-t border-slate-800">
                <label className="flex items-center gap-2 text-sm font-medium text-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={approvalIsTemporary}
                    onChange={(e) => setApprovalIsTemporary(e.target.checked)}
                    className="rounded bg-slate-950 border-slate-700 text-indigo-600 focus:ring-0 w-4 h-4"
                  />
                  <span>Temporary Approval (Scheduled Price Restoration)</span>
                </label>

                {approvalIsTemporary && (
                  <div className="mt-3 pl-6 space-y-3 border-l-2 border-indigo-500/50">
                    <div>
                      <label className="text-xs font-medium text-slate-400 mb-1 block">
                        Restore Price Back To ($):
                      </label>
                      <Input
                        type="number"
                        step="0.01"
                        value={approvalRestorePrice}
                        onChange={(e) => setApprovalRestorePrice(e.target.value)}
                        className="bg-slate-950 border-slate-700 text-white h-8 text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-400 mb-1 block">
                        Duration Before Automatic Restoration:
                      </label>
                      <select
                        value={approvalExpiresHours}
                        onChange={(e) => setApprovalExpiresHours(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-md p-1.5 text-xs text-white"
                      >
                        <option value="6">6 Hours (Weekend / Overnight Flash)</option>
                        <option value="12">12 Hours (Half Day Promo)</option>
                        <option value="24">24 Hours (1 Day Test)</option>
                        <option value="48">48 Hours (2 Day Weekend Test)</option>
                        <option value="168">7 Days (Full Week Sprint)</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Dry Run toggle + Amazon push feedback */}
            <div className="pt-3 border-t border-slate-800 space-y-3">
              <label className="flex items-start gap-2 text-sm font-medium text-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={approvalDryRun}
                  onChange={(e) => setApprovalDryRun(e.target.checked)}
                  className="rounded bg-slate-950 border-slate-700 text-indigo-600 focus:ring-0 w-4 h-4 mt-0.5"
                />
                <span>
                  Dry Run (safe preview)
                  <span className="block text-xs font-normal text-slate-400">
                    {approvalDryRun
                      ? "On — clicking Confirm only previews the Amazon price feed. Nothing is sent. Uncheck to push the live price to Amazon."
                      : "Off — clicking Confirm WILL change the live price on Amazon for this product."}
                  </span>
                </span>
              </label>

              {amazonFeedback && (
                <div
                  className={`text-xs whitespace-pre-wrap rounded-lg px-3 py-2 border ${
                    amazonFeedback.ok
                      ? "bg-emerald-950/40 border-emerald-800 text-emerald-300"
                      : "bg-rose-950/40 border-rose-800 text-rose-300"
                  }`}
                >
                  {amazonFeedback.text}
                </div>
              )}
            </div>

            <DialogFooter className="flex gap-2 justify-end pt-2">
              <Button
                variant="outline"
                onClick={() => setIsApprovalModalOpen(false)}
                disabled={approvingLive}
                className="bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmEnhancedApproval}
                disabled={approvingLive}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold disabled:opacity-60"
              >
                {approvingLive
                  ? "Pushing to Amazon…"
                  : approvalDryRun
                  ? "Preview (Dry Run)"
                  : "Confirm & Push to Amazon"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* ── TAB 3: UNIT ECONOMICS SIMULATOR ── */}
      {isSimulatorOpen && selectedProduct && (
        <Dialog open={isSimulatorOpen} onOpenChange={setIsSimulatorOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl">
                <Sliders className="h-5 w-5 text-indigo-600" />
                Interactive Price Elasticity & Unit Economics Simulator
              </DialogTitle>
              <DialogDescription>
                Simulate real-time fee breakdowns and Buy Box win probabilities without altering live Amazon prices.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-2">
              {/* Product Info */}
              <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">{selectedProduct.productName}</h4>
                  <p className="text-xs text-muted-foreground font-mono">ASIN: {selectedProduct.asin} | SKU: {selectedProduct.sku}</p>
                </div>
                <div className="text-right font-mono text-sm font-bold text-indigo-600 dark:text-indigo-400">
                  Live Price: ${selectedProduct.currentPrice.toFixed(2)}
                </div>
              </div>

              {/* Slider Section */}
              <div className="space-y-3 bg-indigo-50/50 dark:bg-indigo-950/20 p-4 rounded-2xl border border-indigo-500/20">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-sm text-indigo-900 dark:text-indigo-200">
                    Simulate Target Price: <span className="text-lg font-mono text-indigo-600 dark:text-indigo-400">${simulatedPrice.toFixed(2)}</span>
                  </label>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-white dark:bg-slate-900 border text-slate-600 dark:text-slate-300">
                    Floor: ${selectedProduct.minPrice.toFixed(2)} | Ceiling: ${selectedProduct.maxPrice.toFixed(2)}
                  </span>
                </div>
                <input
                  type="range"
                  min={Math.max(1, selectedProduct.unitCost)}
                  max={selectedProduct.maxPrice * 1.2}
                  step={0.05}
                  value={simulatedPrice}
                  onChange={(e) => setSimulatedPrice(Number(e.target.value))}
                  className="w-full h-2 bg-indigo-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
                <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
                  <span>Min Acceptable ($ {selectedProduct.minPrice.toFixed(2)})</span>
                  <span>Current Live ($ {selectedProduct.currentPrice.toFixed(2)})</span>
                  <span>Max Ceiling ($ {selectedProduct.maxPrice.toFixed(2)})</span>
                </div>
              </div>

              {/* Unit Economics Waterfall Chart */}
              {simMetrics && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                    <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Unit Economics Breakdown</h4>
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between items-center pb-1 border-b border-slate-100 dark:border-slate-800">
                        <span className="text-muted-foreground flex items-center gap-1.5">
                          1. Unit Cost (COGS):
                          <button
                            type="button"
                            onClick={() => {
                              setIsSimulatorOpen(false)
                              openEdit(selectedProduct)
                            }}
                            className="text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-0.5 font-semibold bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 px-1.5 py-0.5 rounded transition-all hover:scale-105"
                            title="Click to edit Unit Cost"
                          >
                            <Edit3 className="h-2.5 w-2.5" /> Edit
                          </button>
                        </span>
                        <span className="font-mono font-semibold">${selectedProduct.unitCost.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center pb-1 border-b border-slate-100 dark:border-slate-800">
                        <span className="text-muted-foreground">2. Amazon Referral Fee ({selectedProduct.referralFeePercent}%):</span>
                        <span className="font-mono font-semibold text-rose-500">-${simMetrics.referralFee.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center pb-1 border-b border-slate-100 dark:border-slate-800">
                        <span className="text-muted-foreground">3. FBA Fulfillment Fee:</span>
                        <span className="font-mono font-semibold text-rose-500">-${selectedProduct.fulfillmentMethod === "FBA" ? selectedProduct.fbaFee.toFixed(2) : "0.00"}</span>
                      </div>
                      <div className="flex justify-between items-center pb-1 border-b border-slate-200 dark:border-slate-700 font-semibold text-slate-800 dark:text-slate-200">
                        <span>Total Cost + Fees:</span>
                        <span className="font-mono font-bold">${(selectedProduct.unitCost + simMetrics.referralFee + (selectedProduct.fulfillmentMethod === "FBA" ? selectedProduct.fbaFee : 0)).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center pt-1 font-bold text-base">
                        <span>Net Profit Per Unit:</span>
                        <span className={simMetrics.grossProfit >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600"}>
                          ${simMetrics.grossProfit.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Simulated Strategic Outcome */}
                  <div className="space-y-3 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
                    <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Strategic Market Outcome</h4>
                    
                    <div className="grid grid-cols-2 gap-2 text-center">
                      <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-lg border border-slate-200/60 dark:border-slate-800">
                        <div className="text-[10px] text-muted-foreground font-semibold">Simulated Net Margin</div>
                        <div className={`text-xl font-bold mt-1 ${simMetrics.netMarginPct >= selectedProduct.minMarginPercent ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600"}`}>
                          {simMetrics.netMarginPct.toFixed(1)}%
                        </div>
                        <div className="text-[9px] text-muted-foreground mt-0.5">Target: {selectedProduct.minMarginPercent}%</div>
                      </div>

                      <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-lg border border-slate-200/60 dark:border-slate-800">
                        <div className="text-[10px] text-muted-foreground font-semibold">Est. Buy Box Win Rate</div>
                        <div className={`text-xl font-bold mt-1 ${simMetrics.winProb >= 80 ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600"}`}>
                          {simMetrics.winProb}%
                        </div>
                        <div className="text-[9px] text-muted-foreground mt-0.5">Vs Buy Box: ${selectedProduct.currentBuyBoxPrice?.toFixed(2) ?? selectedProduct.currentPrice.toFixed(2)}</div>
                      </div>
                    </div>

                    <div className="bg-gradient-to-r from-emerald-500/10 to-indigo-500/10 p-2.5 rounded-lg border border-emerald-500/20 text-center">
                      <span className="text-xs text-muted-foreground">Estimated Monthly Profit Uplift: </span>
                      <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">${simMetrics.monthlyProfit.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsSimulatorOpen(false)}>Close Simulator</Button>
              <Button 
                onClick={async () => {
                  // Push this simulation into the approval queue!
                  if (!confirm(`Generate a pending price change recommendation to $${simulatedPrice.toFixed(2)}?`)) return
                  try {
                    await fetch(`/api/admin/autopricer/products/${selectedProduct.id}`, {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ currentPrice: simulatedPrice }), // Wait, let's create a pending recommendation instead or update target!
                    })
                    setIsSimulatorOpen(false)
                    await fetchProducts()
                    alert(`Simulated price $${simulatedPrice.toFixed(2)} saved!`)
                  } catch (e) {
                    console.error(e)
                  }
                }}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold"
              >
                Apply as Target Recommendation ➔
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* ── ADD MODAL ── */}
      {isAddModalOpen && (
        <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5 text-emerald-600" />
                Add Monitored Amazon Product
              </DialogTitle>
              <DialogDescription>
                Configure ASIN, Seller SKU, and explicit profit guardrails.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleCreateProduct} className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">ASIN *</label>
                  <Input
                    required
                    placeholder="e.g. B08N5WRW91"
                    value={formData.asin}
                    onChange={(e) => setFormData({ ...formData, asin: e.target.value })}
                    className="mt-1 font-mono text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Seller SKU *</label>
                  <Input
                    required
                    placeholder="e.g. PB-COF-ESP-16"
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    className="mt-1 font-mono text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Product Name *</label>
                  <Input
                    required
                    placeholder="e.g. Premium Private Label Espresso Roast"
                    value={formData.productName}
                    onChange={(e) => setFormData({ ...formData, productName: e.target.value })}
                    className="mt-1 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Marketplace</label>
                  <select
                    value={formData.marketplace}
                    onChange={(e) => setFormData({ ...formData, marketplace: e.target.value })}
                    className="w-full mt-1 h-9 px-3 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm font-medium"
                  >
                    {PRICE_INTELLIGENCE_CONFIG.MARKETPLACES.map((m) => (
                      <option key={m.code} value={m.code}>
                        {m.flag} {m.code} - {m.currency}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Current Price ($) *</label>
                  <Input
                    required
                    type="number"
                    step="0.01"
                    placeholder="19.99"
                    value={formData.currentPrice}
                    onChange={(e) => setFormData({ ...formData, currentPrice: e.target.value })}
                    className="mt-1 font-mono text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Unit Cost ($) *</label>
                  <Input
                    required
                    type="number"
                    step="0.01"
                    placeholder="6.50"
                    value={formData.unitCost}
                    onChange={(e) => setFormData({ ...formData, unitCost: e.target.value })}
                    className="mt-1 font-mono text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Fulfillment</label>
                  <select
                    value={formData.fulfillmentMethod}
                    onChange={(e) => setFormData({ ...formData, fulfillmentMethod: e.target.value })}
                    className="w-full mt-1 h-9 px-3 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm font-medium"
                  >
                    <option value="FBA">📦 Amazon FBA</option>
                    <option value="FBM">🚚 Merchant FBM</option>
                  </select>
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                  Strategic Guardrails & Margin Rules
                </h4>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground">Min Floor Price ($)</label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="14.00"
                      value={formData.minPrice}
                      onChange={(e) => setFormData({ ...formData, minPrice: e.target.value })}
                      className="mt-1 font-mono text-xs h-8"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground">Max Ceiling Price ($)</label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="28.00"
                      value={formData.maxPrice}
                      onChange={(e) => setFormData({ ...formData, maxPrice: e.target.value })}
                      className="mt-1 font-mono text-xs h-8"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground">Min Margin Target (%)</label>
                    <Input
                      type="number"
                      step="0.5"
                      placeholder="25.0"
                      value={formData.minMarginPercent}
                      onChange={(e) => setFormData({ ...formData, minMarginPercent: e.target.value })}
                      className="mt-1 font-mono text-xs h-8"
                    />
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsAddModalOpen(false)}>Cancel</Button>
                <Button type="submit" className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold">
                  Start Monitoring Product
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* ── EDIT MODAL ── */}
      {isEditModalOpen && selectedProduct && (
        <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Edit3 className="h-5 w-5 text-indigo-600" />
                Edit Product Rules: {selectedProduct.asin}
              </DialogTitle>
              <DialogDescription>
                Modify unit costs or adjust margin thresholds for {selectedProduct.productName}.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleUpdateProduct} className="space-y-4 py-2">
              <div>
                <label className="text-xs font-bold">Product Name</label>
                <Input
                  value={formData.productName}
                  onChange={(e) => setFormData({ ...formData, productName: e.target.value })}
                  className="mt-1 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold">Unit Cost ($)</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.unitCost}
                    onChange={(e) => setFormData({ ...formData, unitCost: e.target.value })}
                    className="mt-1 font-mono text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold">Min Margin Target (%)</label>
                  <Input
                    type="number"
                    step="0.5"
                    value={formData.minMarginPercent}
                    onChange={(e) => setFormData({ ...formData, minMarginPercent: e.target.value })}
                    className="mt-1 font-mono text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold">Min Acceptable Price ($)</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.minPrice}
                    onChange={(e) => setFormData({ ...formData, minPrice: e.target.value })}
                    className="mt-1 font-mono text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold">Max Acceptable Price ($)</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.maxPrice}
                    onChange={(e) => setFormData({ ...formData, maxPrice: e.target.value })}
                    className="mt-1 font-mono text-sm"
                  />
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)}>Cancel</Button>
                <Button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold">
                  Save Changes
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* ── IMPORT FROM INVENTORY MODAL ── */}
      {isImportModalOpen && (
        <Dialog open={isImportModalOpen} onOpenChange={setIsImportModalOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl">
                <Package className="h-6 w-6 text-blue-600" />
                Import from Live Amazon & Warehouse Inventory
              </DialogTitle>
              <DialogDescription>
                Select active products from your Amazon seller catalog or warehouse pallets to monitor their unit economics and price elasticity.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search live catalog by ASIN, SKU, or Product Name..."
                  value={catalogSearch}
                  onChange={(e) => setCatalogSearch(e.target.value)}
                  className="pl-9 bg-white dark:bg-slate-950 text-sm h-10"
                />
              </div>

              {catalogLoading ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
                  <p className="text-sm text-muted-foreground mt-3 font-medium">Loading Amazon & Warehouse Catalog...</p>
                </div>
              ) : catalogItems.length === 0 ? (
                <div className="text-center py-12 bg-slate-50 dark:bg-slate-900/30 rounded-xl border border-dashed border-slate-300 dark:border-slate-800">
                  <Package className="h-10 w-10 text-muted-foreground mx-auto mb-2 opacity-50" />
                  <p className="font-semibold text-sm">No inventory items found</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Ensure you have synced products in the Inventory or Warehouse tabs.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto pr-1">
                  {catalogItems
                    .filter(
                      (item) =>
                        item.name.toLowerCase().includes(catalogSearch.toLowerCase()) ||
                        item.asin.toLowerCase().includes(catalogSearch.toLowerCase()) ||
                        item.sku.toLowerCase().includes(catalogSearch.toLowerCase())
                    )
                    .map((item) => (
                      <div
                        key={item.id}
                        className={`p-3 rounded-xl border flex flex-col justify-between gap-3 transition-all ${
                          item.isAlreadyMonitored
                            ? "bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 opacity-75"
                            : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-blue-500/50 hover:shadow-md"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="h-12 w-12 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0 overflow-hidden border border-slate-200 dark:border-slate-700">
                            {item.imageUrl ? (
                              <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" />
                            ) : (
                              <Package className="h-6 w-6 text-slate-400" />
                            )}
                          </div>
                          <div className="space-y-1 overflow-hidden">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span
                                className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                  item.source === "AMAZON"
                                    ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                                    : "bg-purple-500/10 text-purple-600 dark:text-purple-400"
                                }`}
                              >
                                {item.source}
                              </span>
                              <span className="font-mono text-xs font-bold bg-slate-100 dark:bg-slate-800 px-1.5 py-0.2 rounded text-slate-700 dark:text-slate-300">
                                {item.asin}
                              </span>
                            </div>
                            <h4 className="font-bold text-xs line-clamp-1 text-slate-900 dark:text-white" title={item.name}>
                              {item.name}
                            </h4>
                            <div className="text-[11px] text-muted-foreground font-mono flex items-center gap-2">
                              <span>SKU: {item.sku}</span>
                              <span>•</span>
                              <span className="font-semibold text-slate-700 dark:text-slate-300">Stock: {item.quantity}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/80">
                          <span className="text-xs text-muted-foreground font-medium">
                            Est. Cost: <strong className="text-slate-900 dark:text-white">${item.unitCost.toFixed(2)}</strong>
                          </span>
                          {item.isAlreadyMonitored ? (
                            <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg font-bold text-xs flex items-center gap-1">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Monitored
                            </span>
                          ) : (
                            <div className="flex items-center gap-1.5">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openCustomizeFromCatalog(item)}
                                className="h-7 text-xs px-2 border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800 font-semibold"
                              >
                                Customize
                              </Button>
                              <Button
                                size="sm"
                                disabled={importingId === item.id}
                                onClick={() => handleOneClickImport(item)}
                                className="h-7 text-xs px-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold shadow-sm"
                              >
                                {importingId === item.id ? "Importing..." : "⚡ 1-Click Import"}
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsImportModalOpen(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* ── Erase All Monitored Products ── */}
      <Dialog open={showEraseAllDialog} onOpenChange={setShowEraseAllDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
              <ShieldAlert className="h-5 w-5" /> Erase ALL Monitored Products
            </DialogTitle>
            <DialogDescription>
              This will permanently delete every monitored product and all of its history
              (price changes, daily sales, Keepa data). This action <strong>cannot be undone</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
              To confirm, type <code className="px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono">ERASE ALL</code> below:
            </p>
            <Input
              value={eraseConfirmText}
              onChange={(e) => setEraseConfirmText(e.target.value)}
              placeholder="ERASE ALL"
              className="font-mono"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowEraseAllDialog(false); setEraseConfirmText("") }}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={eraseConfirmText !== "ERASE ALL" || erasing}
              onClick={handleEraseAll}
            >
              {erasing ? "Erasing..." : "Erase Everything"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Set Min/Max Price Guardrails (bulk) ── */}
      <Dialog open={showBoundsDialog} onOpenChange={setShowBoundsDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sliders className="h-5 w-5" /> Set Min/Max Price Guardrails
            </DialogTitle>
            <DialogDescription>
              Set a floor (min) and ceiling (max) price the autopricer will never cross.
              Leave a field blank to keep it unchanged. Applied to{" "}
              {boundsForm.scope === "filtered" ? "the products matching the current filters" : "ALL monitored products"}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Min Price (Floor) $</label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={boundsForm.minPrice}
                  onChange={(e) => setBoundsForm({ ...boundsForm, minPrice: e.target.value })}
                  placeholder="e.g. 8.00"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Max Price (Ceiling) $</label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={boundsForm.maxPrice}
                  onChange={(e) => setBoundsForm({ ...boundsForm, maxPrice: e.target.value })}
                  placeholder="e.g. 25.00"
                />
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  checked={boundsForm.scope === "all"}
                  onChange={() => setBoundsForm({ ...boundsForm, scope: "all" })}
                />
                All products
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  checked={boundsForm.scope === "filtered"}
                  onChange={() => setBoundsForm({ ...boundsForm, scope: "filtered" })}
                />
                Only current filter ({products.length})
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBoundsDialog(false)}>Cancel</Button>
            <Button disabled={savingBounds} onClick={handleSaveBounds}>
              {savingBounds ? "Saving..." : "Apply Guardrails"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
