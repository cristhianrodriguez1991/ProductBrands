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
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { WeekdayProfile, WeekdayHeatmapCell } from "@/lib/keepa/analytics/weekday-engine"
import { RankTrendAnalysis } from "@/lib/keepa/analytics/rank-trend"

interface KeepaAnalyticsProps {
  weekdayProfiles: WeekdayProfile[]
  heatmap: WeekdayHeatmapCell[]
  overallMedianRank: number
  trendAnalysis?: RankTrendAnalysis
}

export function KeepaAnalytics({
  weekdayProfiles = [],
  heatmap = [],
  overallMedianRank = 3000,
  trendAnalysis,
}: KeepaAnalyticsProps) {
  const [metric, setMetric] = useState<"rank" | "buybox" | "offers">("rank")

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
                Weekly Strategy Calendar
              </CardTitle>
              <CardDescription className="text-slate-400">
                Day-of-week learning engine derived from historical Keepa time series (minimum 8 complete weeks required for pattern confidence).
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
                  <th className="py-3 px-4">Day of Week</th>
                  <th className="py-3 px-4">Sample Size</th>
                  <th className="py-3 px-4">Median Rank</th>
                  <th className="py-3 px-4">vs. Weekly Average</th>
                  <th className="py-3 px-4">Volatility</th>
                  <th className="py-3 px-4">Recommended Strategy</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {weekdayProfiles.map((p) => {
                  const isWorse = p.relativePerformancePercent > 5
                  const isBetter = p.relativePerformancePercent < -5
                  return (
                    <tr key={p.dayNumber} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 font-bold text-white flex items-center gap-2">
                        <span>{p.dayName}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${p.hasEnoughData ? "bg-slate-800 text-slate-300" : "bg-amber-500/20 text-amber-300 border border-amber-500/30"}`}>
                          {p.sampleWeeks} weeks {p.hasEnoughData ? "✓" : "(<8w)"}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-200">
                        #{p.medianRank > 0 ? p.medianRank.toLocaleString() : "—"}
                      </td>
                      <td className="py-3 px-4">
                        {p.medianRank === 0 ? (
                          <span className="text-slate-500">—</span>
                        ) : (
                          <span className={`font-semibold flex items-center gap-1 ${isWorse ? "text-rose-400" : isBetter ? "text-emerald-400" : "text-slate-400"}`}>
                            {isWorse ? <TrendingDown className="h-4 w-4" /> : isBetter ? <TrendingUp className="h-4 w-4" /> : <Minus className="h-4 w-4" />}
                            {isWorse ? `+${p.relativePerformancePercent}% weaker` : isBetter ? `${p.relativePerformancePercent}% stronger` : "Typical"}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-400 text-xs">{p.rankVolatilityPercent}%</td>
                      <td className="py-3 px-4">
                        {getStrategyBadge(p.recommendedStrategy, p.warningMessage)}
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
