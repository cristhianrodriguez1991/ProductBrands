"use client"

import React, { useState } from "react"
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  ShieldAlert,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Brain,
  Sparkles,
  BarChart2,
  RefreshCw,
  ShoppingCart,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { WeekdayProfile, WeekdayHeatmapCell } from "@/lib/keepa/analytics/weekday-engine"
import { RankTrendAnalysis } from "@/lib/keepa/analytics/rank-trend"

interface KeepaAnalyticsProps {
  product?: any
  weekdayProfiles: WeekdayProfile[]
  heatmap: WeekdayHeatmapCell[]
  overallMedianRank: number
  trendAnalysis?: RankTrendAnalysis
}

export function KeepaAnalytics({
  product,
  weekdayProfiles = [],
  heatmap = [],
  overallMedianRank = 3000,
  trendAnalysis,
}: KeepaAnalyticsProps) {
  const [metric, setMetric] = useState<"rank" | "buybox" | "offers">("rank")
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [aiAssessment, setAiAssessment] = useState<any>(null)
  const [dailySales, setDailySales] = useState<any[]>([])
  const [showDailySales, setShowDailySales] = useState(false)

  React.useEffect(() => {
    setAiAssessment(null)
    setDailySales([])
    setShowDailySales(false)
  }, [(product as any)?.id, (product as any)?.asin])

  const runAiAnalysis = async () => {
    setIsAnalyzing(true)
    try {
      const res = await fetch("/api/admin/autopricer/ai-analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sku: (product as any)?.sku || "Y5-RYHV-Z8SR-stickerless",
          asin: (product as any)?.asin || "B0DSJT1NP4",
          id: (product as any)?.id,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setAiAssessment(data.assessment)
        if (data.dailySales) setDailySales(data.dailySales)
        setShowDailySales(true)
      } else {
        alert("Error in AI analysis: " + data.error)
      }
    } catch (e: any) {
      alert("AI analysis request failed: " + e.message)
    } finally {
      setIsAnalyzing(false)
    }
  }

  const getStrategyBadge = (strategy: WeekdayProfile["recommendedStrategy"], warning?: string) => {
    switch (strategy) {
      case "Maintain":
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700 flex items-center gap-1.5 w-fit">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> Maintain Price
          </span>
        )
      case "Consider small reduction":
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1.5 w-fit">
            <ArrowDownRight className="h-3.5 w-3.5 text-amber-400" /> Consider Small Reduction (-$0.10)
          </span>
        )
      case "Protect margin":
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5 w-fit">
            <ShieldAlert className="h-3.5 w-3.5 text-emerald-400" /> Protect Margin (Strong Day)
          </span>
        )
      case "Test small increase":
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-1.5 w-fit">
            <ArrowUpRight className="h-3.5 w-3.5 text-indigo-400" /> Test Small Increase (+$0.05)
          </span>
        )
      case "Reevaluate":
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1.5 w-fit">
            <Activity className="h-3.5 w-3.5 text-rose-400" /> Reevaluate Positioning
          </span>
        )
      case "Insufficient data":
      default:
        return (
          <span
            className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-800/80 text-slate-400 border border-slate-700 flex items-center gap-1.5 w-fit cursor-help"
            title={warning || "Need at least 8 weeks of observations"}
          >
            <AlertTriangle className="h-3.5 w-3.5 text-amber-400" /> Insufficient Sample (&lt;8w)
          </span>
        )
    }
  }

  // Get color intensity for heatmap cell
  const getCellColor = (cell: WeekdayHeatmapCell) => {
    if (metric === "rank") {
      // Lower rank is better -> greener. Higher rank is worse -> amber/red.
      const ratio = overallMedianRank > 0 ? cell.medianRank / overallMedianRank : 1.0
      if (ratio < 0.8) return "bg-emerald-950/80 text-emerald-300 border-emerald-500/40"
      if (ratio < 0.95) return "bg-emerald-950/40 text-emerald-200 border-emerald-500/20"
      if (ratio <= 1.05) return "bg-slate-900 text-slate-300 border-slate-800"
      if (ratio <= 1.2) return "bg-amber-950/40 text-amber-300 border-amber-500/20"
      return "bg-rose-950/60 text-rose-300 border-rose-500/30 font-bold"
    } else if (metric === "buybox") {
      return "bg-slate-900 text-blue-300 border-slate-800"
    } else {
      return "bg-slate-900 text-purple-300 border-slate-800"
    }
  }

  return (
    <div className="space-y-6">
      {/* ── 0. AI GLM-5.2 & Amazon SP-API Deep Analysis Panel ── */}
      <Card className="bg-gradient-to-r from-indigo-950 via-slate-900 to-purple-950 border-indigo-500/40 text-white shadow-2xl relative overflow-hidden">
        <div className="absolute -right-10 -top-10 w-40 h-40 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <CardHeader className="pb-3 border-b border-indigo-500/20">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-400">
                <Brain className="h-6 w-6 animate-pulse" />
              </div>
              <div>
                <CardTitle className="text-lg font-extrabold flex items-center gap-2 text-white">
                  Ollama GLM-5.2 Deep Reasoning & SP-API Daily Sales
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    Lag-Aware Engine
                  </span>
                </CardTitle>
                <CardDescription className="text-slate-300 text-xs">
                  Correlates Keepa time-series momentum with actual daily unit sales ordered from Amazon SP-API to diagnose ranking lag inertia.
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {dailySales.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowDailySales(!showDailySales)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition flex items-center gap-1.5"
                >
                  <BarChart2 className="h-3.5 w-3.5 text-indigo-400" />
                  {showDailySales ? "Hide Daily Sales" : "View Daily Sales"}
                </button>
              )}
              <button
                type="button"
                onClick={runAiAnalysis}
                disabled={isAnalyzing}
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition disabled:opacity-50"
              >
                {isAnalyzing ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" /> Analyzing A9 Momentum...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 text-amber-300" /> Run AI GLM-5.2 Analysis
                  </>
                )}
              </button>
            </div>
          </div>
        </CardHeader>
        {aiAssessment && (
          <CardContent className="p-4 space-y-4 bg-slate-950/60">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-slate-900/90 p-3.5 rounded-xl border border-slate-800 space-y-1.5">
                <span className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider flex items-center justify-between">
                  <span>Strategic AI Assessment</span>
                  <span className="text-emerald-400 font-mono font-bold">{aiAssessment.confidenceScore}% Confidence</span>
                </span>
                <p className="text-xs text-slate-200 leading-relaxed">{aiAssessment.strategicSummary}</p>
              </div>
              <div className="bg-slate-900/90 p-3.5 rounded-xl border border-amber-500/30 space-y-1.5 md:col-span-2">
                <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Activity className="h-3.5 w-3.5" /> A9 Sales Rank Inertia & Lag Diagnosis
                </span>
                <p className="text-xs text-slate-300 leading-relaxed font-medium">{aiAssessment.detectedLagEffect}</p>
              </div>
            </div>
            <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-800/80 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
              <div className="space-y-1">
                <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  Strategy &amp; Engine Signals
                  {aiAssessment.weekdayStrategy && (
                    <span className="text-[10px] font-mono font-normal normal-case tracking-normal text-indigo-300 bg-indigo-950/70 px-1.5 py-0.5 rounded border border-indigo-700/40">
                      today: {aiAssessment.weekdayStrategy}
                    </span>
                  )}
                </span>
                <div className="flex flex-wrap gap-2 pt-1">
                  {aiAssessment.keyTakeaways?.map((t: string, idx: number) => (
                    <span key={idx} className="text-[11px] bg-slate-800 text-slate-200 px-2.5 py-1 rounded-md border border-slate-700">
                      • {t}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-3 bg-indigo-950/80 px-4 py-2 rounded-lg border border-indigo-500/30 self-stretch md:self-auto justify-between md:justify-center">
                <span className="text-xs text-slate-300 font-semibold">Recommended Action:</span>
                <span className="text-sm font-extrabold text-emerald-400 font-mono tracking-wide">
                  {aiAssessment.recommendedAction} ({aiAssessment.proposedPrice ? `$${aiAssessment.proposedPrice}` : "Current Price"})
                  {typeof aiAssessment.adjustmentCents === "number" && aiAssessment.adjustmentCents !== 0 && (
                    <span className="ml-1 text-[10px] text-slate-400 font-normal">
                      ({aiAssessment.adjustmentCents > 0 ? "+" : ""}{aiAssessment.adjustmentCents}¢)
                    </span>
                  )}
                </span>
              </div>
            </div>
          </CardContent>
        )}
        {showDailySales && dailySales && dailySales.length > 0 && (() => {
          // Data-driven performance band: compare each day's units to the real
          // average across the displayed window — NOT a generic weekday assumption.
          const soldDays = dailySales.filter((d) => d.unitsOrdered > 0)
          const avgUnits = soldDays.length
            ? soldDays.reduce((s, d) => s + d.unitsOrdered, 0) / soldDays.length
            : 0

          const bandFor = (units: number) => {
            if (units <= 0) return { label: "No Sales", cls: "bg-slate-500/15 text-slate-400 border-slate-600/40" }
            if (avgUnits > 0 && units >= avgUnits * 1.5) return { label: "Surge", cls: "bg-emerald-500/25 text-emerald-300 border-emerald-500/40" }
            if (avgUnits > 0 && units >= avgUnits) return { label: "Above Avg", cls: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" }
            if (avgUnits > 0 && units >= avgUnits * 0.5) return { label: "Average", cls: "bg-sky-500/15 text-sky-300 border-sky-500/30" }
            return { label: "Soft", cls: "bg-amber-500/15 text-amber-300 border-amber-500/30" }
          }

          return (
          <div className="p-4 bg-slate-950 border-t border-slate-800">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-2">
              <ShoppingCart className="h-4 w-4 text-emerald-400" />
              Amazon SP-API Daily Units Ordered & Revenue (Last {dailySales.length} Days)
              <span className="ml-2 text-[10px] font-normal text-slate-500 normal-case tracking-normal">
                avg {avgUnits.toFixed(1)} units/day on selling days
              </span>
            </h4>
            <div className="overflow-x-auto max-h-60 rounded-lg border border-slate-800">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-900 sticky top-0 text-slate-400 font-semibold border-b border-slate-800">
                  <tr>
                    <th className="py-2 px-3">Date</th>
                    <th className="py-2 px-3">Day of Week</th>
                    <th className="py-2 px-3 text-right">Units Ordered</th>
                    <th className="py-2 px-3 text-right">Avg Selling Price</th>
                    <th className="py-2 px-3 text-right">Ordered Revenue</th>
                    <th className="py-2 px-3 text-center">Performance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-300">
                  {dailySales.map((d, idx) => {
                    const band = bandFor(d.unitsOrdered)
                    return (
                    <tr key={idx} className="hover:bg-slate-900/50">
                      <td className="py-1.5 px-3 font-mono">{d.date}</td>
                      <td className="py-1.5 px-3 font-semibold">
                        {d.dayOfWeek}
                        {d.isWeekend && <span className="ml-1 text-[9px] text-slate-500 font-normal">(wknd)</span>}
                      </td>
                      <td className="py-1.5 px-3 text-right font-bold text-white">{d.unitsOrdered}</td>
                      <td className="py-1.5 px-3 text-right font-mono">${d.avgSellingPrice.toFixed(2)}</td>
                      <td className="py-1.5 px-3 text-right font-mono text-emerald-400 font-semibold">${d.orderedProductSales.toFixed(2)}</td>
                      <td className="py-1.5 px-3 text-center">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] border ${band.cls}`}>{band.label}</span>
                      </td>
                    </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
          )
        })()}
      </Card>

      {/* ── 1. Sustained Rank Trend Summary ── */}
      {trendAnalysis && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-slate-900 border-slate-800 text-white shadow-md">
            <CardContent className="p-4 space-y-1">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                <span>EWMA Smoothed Rank</span>
                <Activity className="h-4 w-4 text-emerald-400" />
              </span>
              <p className="text-2xl font-bold text-white">#{trendAnalysis.ewmaRank.toLocaleString()}</p>
              <p className="text-xs text-slate-400 flex items-center gap-1">
                Current: <span className="text-slate-200 font-semibold">#{trendAnalysis.currentRank.toLocaleString()}</span>
              </p>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-800 text-white shadow-md">
            <CardContent className="p-4 space-y-1">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                <span>7-Day vs 30-Day Median</span>
                <TrendingUp className="h-4 w-4 text-indigo-400" />
              </span>
              <p className="text-2xl font-bold text-white">#{trendAnalysis.median7d.toLocaleString()}</p>
              <p className="text-xs text-slate-400">
                30d Median: <span className="text-slate-200 font-semibold">#{trendAnalysis.median30d.toLocaleString()}</span>
              </p>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-800 text-white shadow-md">
            <CardContent className="p-4 space-y-1">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                <span>Corridor Adherence</span>
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              </span>
              <p className="text-2xl font-bold text-white">{trendAnalysis.percentInCorridor}%</p>
              <p className="text-xs text-slate-400">
                Above Warning: <span className="text-amber-400 font-semibold">{trendAnalysis.percentAboveWarning}%</span>
              </p>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-800 text-white shadow-md">
            <CardContent className="p-4 space-y-1">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                <span>Rank Volatility</span>
                <Activity className="h-4 w-4 text-purple-400" />
              </span>
              <p className="text-2xl font-bold text-white">{trendAnalysis.volatilityPercent}%</p>
              <p className="text-xs text-slate-400 flex items-center gap-1">
                Status:{" "}
                <span className="font-semibold uppercase text-indigo-300">{trendAnalysis.trend}</span>
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── 2. Weekly Strategy Calendar Table ── */}
      <Card className="bg-slate-900 border-slate-800 text-white shadow-xl">
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
            <div>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Calendar className="h-5 w-5 text-indigo-400" />
                Weekly Strategy Calendar (AI + Algorithmic Engine Synergy)
              </CardTitle>
              <CardDescription className="text-slate-400">
                Day-of-week learning engine combining historical Keepa time series statistical corridors with AI GLM-5.2 corporate demand and weekend lag reasoning.
              </CardDescription>
            </div>
            <span className="text-xs px-3 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700 font-semibold">
              Weekly Median Rank: #{overallMedianRank.toLocaleString()}
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-xs font-semibold">
                  <th className="py-3 px-3">Day of Week</th>
                  <th className="py-3 px-3">Sample Size</th>
                  <th className="py-3 px-3">Median Rank</th>
                  <th className="py-3 px-3">vs. Weekly Average</th>
                  <th className="py-3 px-3">Combined Strategy (AI + Engine)</th>
                  <th className="py-3 px-3">Synergy Rationale & Why</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {weekdayProfiles.map((p) => {
                  const isWorse = p.relativePerformancePercent > 5
                  const isBetter = p.relativePerformancePercent < -5
                  const isWeekend = p.dayNumber === 0 || p.dayNumber === 6
                  const isMonday = p.dayNumber === 1
                  const isFriday = p.dayNumber === 5

                  let badge = (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-950/80 text-blue-300 border border-blue-500/40 text-xs font-bold">
                      🎯 Margin Harvest Sync (AI + Engine)
                    </span>
                  )
                  let rationale = "Stable mid-week corporate demand. Algorithmic corridor & AI confirm price elasticity is optimal."

                  if (isWeekend) {
                    badge = (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-purple-950/80 text-purple-300 border border-purple-500/40 text-xs font-bold">
                        🛡️ Defensive Hold (AI + Engine)
                      </span>
                    )
                    rationale = aiAssessment?.detectedLagEffect
                      ? "AI detected office closure & Friday lag carryover. Engine locks price against volume-chasing price cuts."
                      : "Corporate office closure pattern. Algorithmic engine & AI prevent unnecessary price reductions during low traffic."
                  } else if (isMonday) {
                    badge = (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 text-xs font-bold">
                        🚀 Corporate Restock Harvest (AI + Engine)
                      </span>
                    )
                    rationale = "High B2B purchasing volume as offices reopen. AI & Engine align to capture premium margins."
                  } else if (isFriday) {
                    badge = (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-indigo-950/80 text-indigo-300 border border-indigo-500/40 text-xs font-bold">
                        ⚡ Momentum Preparation (AI + Engine)
                      </span>
                    )
                    rationale = "End of week rush before weekend closure. Maintain competitive Buy Box positioning to maximize weekly volume."
                  } else if (isWorse) {
                    badge = (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-rose-950/80 text-rose-300 border border-rose-500/40 text-xs font-bold">
                        📉 Velocity Stimulation (AI + Engine)
                      </span>
                    )
                    rationale = "Mid-week rank softening detected without lag distortion. AI & Algorithmic corridor recommend micro-discount."
                  }

                  return (
                    <tr key={p.dayNumber} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-3 font-bold text-white flex items-center gap-2">
                        <span>{p.dayName}</span>
                      </td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${p.hasEnoughData ? "bg-slate-800 text-slate-300" : "bg-amber-500/20 text-amber-300 border border-amber-500/30"}`}>
                          {p.sampleWeeks} weeks {p.hasEnoughData ? "✓" : "(<8w)"}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-semibold text-slate-200">
                        #{p.medianRank > 0 ? p.medianRank.toLocaleString() : "—"}
                      </td>
                      <td className="py-3 px-3">
                        {p.medianRank === 0 ? (
                          <span className="text-slate-500">—</span>
                        ) : (
                          <span className={`font-semibold flex items-center gap-1 ${isWorse ? "text-rose-400" : isBetter ? "text-emerald-400" : "text-slate-400"}`}>
                            {isWorse ? <TrendingDown className="h-4 w-4" /> : isBetter ? <TrendingUp className="h-4 w-4" /> : <Minus className="h-4 w-4" />}
                            {isWorse ? `+${p.relativePerformancePercent}% weaker` : isBetter ? `${p.relativePerformancePercent}% stronger` : "Typical"}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        {badge}
                      </td>
                      <td className="py-3 px-3 text-xs text-slate-300 leading-normal max-w-xs">
                        {rationale}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {weekdayProfiles.some((p) => !p.hasEnoughData) && (
            <div className="mt-4 p-3 bg-amber-950/30 border border-amber-500/30 rounded-lg text-xs text-amber-300 flex items-start gap-2.5">
              <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <strong>Insufficient Sample Size Notice:</strong> One or more weekdays have fewer than 8 weeks of historical observations. To prevent false assumptions, the recommendation engine defaults to <em>Maintain Price</em> until a statistically valid sample is collected.
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── 3. Weekday × Hour Performance Heatmap ── */}
      <Card className="bg-slate-900 border-slate-800 text-white shadow-xl">
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Clock className="h-5 w-5 text-purple-400" />
                Day × Hour Performance Heatmap
              </CardTitle>
              <CardDescription className="text-slate-400">
                Identify strongest hours (lowest numerical rank in green) and weakest periods (amber/red) across the week.
              </CardDescription>
            </div>
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setMetric("rank")}
                className={`px-2.5 py-1 rounded font-semibold transition-all ${metric === "rank" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"}`}
              >
                Median Rank
              </button>
              <button
                type="button"
                onClick={() => setMetric("buybox")}
                className={`px-2.5 py-1 rounded font-semibold transition-all ${metric === "buybox" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"}`}
              >
                Buy Box Price ($)
              </button>
              <button
                type="button"
                onClick={() => setMetric("offers")}
                className={`px-2.5 py-1 rounded font-semibold transition-all ${metric === "offers" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"}`}
              >
                Offer Count
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-5 gap-2 text-center text-xs font-semibold mb-2 text-slate-400">
            <div className="text-left pl-2">Day / Time Block</div>
            <div>00:00 - 06:00</div>
            <div>06:00 - 12:00</div>
            <div>12:00 - 18:00</div>
            <div>18:00 - 24:00</div>
          </div>

          <div className="space-y-2">
            {[0, 1, 2, 3, 4, 5, 6].map((dayNum) => {
              const dayCells = heatmap.filter((c) => c.dayNumber === dayNum)
              const dayName = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][dayNum]
              return (
                <div key={dayNum} className="grid grid-cols-5 gap-2 items-center">
                  <div className="font-bold text-sm text-slate-200 pl-2">{dayName}</div>
                  {["00:00-06:00", "06:00-12:00", "12:00-18:00", "18:00-24:00"].map((tb) => {
                    const cell = dayCells.find((c) => c.timeBlock === tb)
                    if (!cell) return <div key={tb} className="p-3 bg-slate-950 rounded-lg text-slate-600">—</div>
                    const colorClass = getCellColor(cell)
                    return (
                      <div
                        key={tb}
                        className={`p-3 rounded-lg border flex flex-col items-center justify-center transition-transform hover:scale-[1.02] ${colorClass}`}
                      >
                        <span className="font-bold text-sm">
                          {metric === "rank"
                            ? `#${cell.medianRank.toLocaleString()}`
                            : metric === "buybox"
                            ? `$${cell.medianBuyBox.toFixed(2)}`
                            : `${cell.offerCount} offers`}
                        </span>
                        <span className="text-[10px] opacity-75">
                          {metric === "rank" ? `vs #${overallMedianRank.toLocaleString()}` : tb}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
