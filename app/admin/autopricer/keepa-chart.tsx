"use client"

import React, { useState, useMemo } from "react"
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts"
import { TrendingUp, Calendar, Filter, CheckSquare, Square, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export interface ChartObservation {
  timestamp: string | Date
  salesRank?: number | null
  buyBoxPrice?: number | null
  amazonPrice?: number | null
  newFbaPrice?: number | null
  newFbmPrice?: number | null
  offerCount?: number | null
}

interface KeepaChartProps {
  observations: ChartObservation[]
  productName: string
  asin: string
  targetRankMin?: number
  targetRankMax?: number
}

export function KeepaChart({
  observations,
  productName,
  asin,
  targetRankMin = 1500,
  targetRankMax = 3000,
}: KeepaChartProps) {
  const [timeRange, setTimeRange] = useState<"24h" | "7d" | "30d" | "90d" | "180d" | "1y" | "all">("30d")
  const [showRank, setShowRank] = useState(true)
  const [showBuyBox, setShowBuyBox] = useState(true)
  const [showAmazon, setShowAmazon] = useState(true)
  const [showFba, setShowFba] = useState(false)
  const [showFbm, setShowFbm] = useState(false)

  // Filter observations by timeRange
  const filteredData = useMemo(() => {
    if (!observations || observations.length === 0) return []

    const now = new Date().getTime()
    let cutoffMs = now
    switch (timeRange) {
      case "24h":
        cutoffMs = now - 24 * 3600 * 1000
        break
      case "7d":
        cutoffMs = now - 7 * 24 * 3600 * 1000
        break
      case "30d":
        cutoffMs = now - 30 * 24 * 3600 * 1000
        break
      case "90d":
        cutoffMs = now - 90 * 24 * 3600 * 1000
        break
      case "180d":
        cutoffMs = now - 180 * 24 * 3600 * 1000
        break
      case "1y":
        cutoffMs = now - 365 * 24 * 3600 * 1000
        break
      case "all":
        return observations.map((o) => ({
          ...o,
          timeLabel: new Date(o.timestamp).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
          fullDate: new Date(o.timestamp).toLocaleString(),
        }))
    }

    return observations
      .filter((o) => new Date(o.timestamp).getTime() >= cutoffMs)
      .map((o) => ({
        ...o,
        timeLabel:
          timeRange === "24h"
            ? new Date(o.timestamp).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
            : new Date(o.timestamp).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
        fullDate: new Date(o.timestamp).toLocaleString(),
      }))
  }, [observations, timeRange])

  // Custom Tooltip component
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const dataPoint = payload[0].payload
      return (
        <div className="bg-slate-950/95 border border-slate-700 p-3 rounded-lg shadow-2xl text-xs space-y-1.5 backdrop-blur-md z-50">
          <p className="font-semibold text-white border-b border-slate-800 pb-1 flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-indigo-400" />
            {dataPoint.fullDate}
          </p>
          {payload.map((entry: any, index: number) => {
            if (entry.value === null || entry.value === undefined) return null
            const isRank = entry.dataKey === "salesRank"
            return (
              <div key={`tooltip-${index}`} className="flex justify-between items-center gap-4">
                <span className="flex items-center gap-1.5 font-medium" style={{ color: entry.color }}>
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
                  {entry.name}:
                </span>
                <span className="font-bold text-white">
                  {isRank ? `#${Number(entry.value).toLocaleString()}` : `$${Number(entry.value).toFixed(2)}`}
                </span>
              </div>
            )
          })}
          {dataPoint.offerCount !== undefined && (
            <div className="flex justify-between items-center gap-4 text-slate-400 pt-1 border-t border-slate-800/80">
              <span>Active New Offers:</span>
              <span className="font-semibold text-slate-200">{dataPoint.offerCount}</span>
            </div>
          )}
        </div>
      )
    }
    return null
  }

  return (
    <Card className="bg-slate-900 border-slate-800 text-white shadow-xl">
      <CardHeader className="pb-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-emerald-400" />
              Keepa Historical Time-Series: {productName} <span className="text-xs text-slate-400 font-normal">({asin})</span>
            </CardTitle>
            <CardDescription className="text-slate-400 flex items-center gap-1.5 mt-1">
              <Info className="h-4 w-4 text-indigo-400 shrink-0" />
              <span>
                <strong>Note:</strong> Sales Rank scale (left axis) is <strong>inverted</strong> (#1 is top/best). An upward slope indicates ranking improvement!
              </span>
            </CardDescription>
          </div>

          {/* Time Range Selector */}
          <div className="flex flex-wrap items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
            {(["24h", "7d", "30d", "90d", "180d", "1y", "all"] as const).map((range) => (
              <button
                key={range}
                type="button"
                onClick={() => setTimeRange(range)}
                className={`px-2.5 py-1 rounded text-xs font-semibold transition-all ${
                  timeRange === range
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                }`}
              >
                {range.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Series Visibility Toggles */}
        <div className="flex flex-wrap items-center gap-4 pt-3 border-t border-slate-800/80 text-xs">
          <span className="text-slate-400 font-medium flex items-center gap-1">
            <Filter className="h-3.5 w-3.5" /> Toggle Streams:
          </span>
          <button
            type="button"
            onClick={() => setShowRank(!showRank)}
            className="flex items-center gap-1.5 text-emerald-400 hover:opacity-80 font-medium transition-opacity"
          >
            {showRank ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4 opacity-50" />}
            Sales Rank (Inverted)
          </button>
          <button
            type="button"
            onClick={() => setShowBuyBox(!showBuyBox)}
            className="flex items-center gap-1.5 text-blue-400 hover:opacity-80 font-medium transition-opacity"
          >
            {showBuyBox ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4 opacity-50" />}
            Buy Box Price
          </button>
          <button
            type="button"
            onClick={() => setShowAmazon(!showAmazon)}
            className="flex items-center gap-1.5 text-amber-400 hover:opacity-80 font-medium transition-opacity"
          >
            {showAmazon ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4 opacity-50" />}
            Amazon Price
          </button>
          <button
            type="button"
            onClick={() => setShowFba(!showFba)}
            className="flex items-center gap-1.5 text-purple-400 hover:opacity-80 font-medium transition-opacity"
          >
            {showFba ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4 opacity-50" />}
            3rd Party FBA
          </button>
          <button
            type="button"
            onClick={() => setShowFbm(!showFbm)}
            className="flex items-center gap-1.5 text-slate-300 hover:opacity-80 font-medium transition-opacity"
          >
            {showFbm ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4 opacity-50" />}
            3rd Party FBM
          </button>
        </div>
      </CardHeader>

      <CardContent className="pt-2">
        {filteredData.length === 0 ? (
          <div className="h-80 flex flex-col items-center justify-center text-slate-500 bg-slate-950/50 rounded-xl border border-slate-800">
            <p className="font-semibold">No historical data available for this time range.</p>
            <p className="text-xs mt-1">Try selecting a wider time range or clicking "Sync Keepa" to fetch recent observations.</p>
          </div>
        ) : (
          <div className="h-[420px] w-full bg-slate-950/40 p-4 rounded-xl border border-slate-800/80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={filteredData} margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="timeLabel" stroke="#64748b" tick={{ fontSize: 11, fill: "#94a3b8" }} tickMargin={8} />

                {/* Left Y-Axis: Sales Rank (Inverted!) */}
                <YAxis
                  yAxisId="rank"
                  orientation="left"
                  reversed={true}
                  stroke="#10b981"
                  tick={{ fontSize: 11, fill: "#10b981" }}
                  tickFormatter={(val) => `#${Number(val).toLocaleString()}`}
                  domain={["auto", "auto"]}
                  label={{
                    value: "Sales Rank (Lower is Better ➔)",
                    angle: -90,
                    position: "insideLeft",
                    fill: "#10b981",
                    fontSize: 11,
                    fontWeight: 600,
                  }}
                />

                {/* Right Y-Axis: Price ($) */}
                <YAxis
                  yAxisId="price"
                  orientation="right"
                  stroke="#3b82f6"
                  tick={{ fontSize: 11, fill: "#60a5fa" }}
                  tickFormatter={(val) => `$${Number(val).toFixed(2)}`}
                  domain={["auto", "auto"]}
                  label={{
                    value: "Price ($)",
                    angle: 90,
                    position: "insideRight",
                    fill: "#60a5fa",
                    fontSize: 11,
                    fontWeight: 600,
                  }}
                />

                <Tooltip content={<CustomTooltip />} />
                <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: 12 }} />

                {/* Data Lines */}
                {showRank && (
                  <Line
                    yAxisId="rank"
                    type="monotone"
                    dataKey="salesRank"
                    name="Sales Rank"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{ r: 6, fill: "#10b981", stroke: "#fff", strokeWidth: 2 }}
                  />
                )}
                {showBuyBox && (
                  <Line
                    yAxisId="price"
                    type="stepAfter"
                    dataKey="buyBoxPrice"
                    name="Buy Box Price"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 5, fill: "#3b82f6" }}
                  />
                )}
                {showAmazon && (
                  <Line
                    yAxisId="price"
                    type="stepAfter"
                    dataKey="amazonPrice"
                    name="Amazon Price"
                    stroke="#f59e0b"
                    strokeWidth={1.5}
                    strokeDasharray="4 4"
                    dot={false}
                  />
                )}
                {showFba && (
                  <Line
                    yAxisId="price"
                    type="stepAfter"
                    dataKey="newFbaPrice"
                    name="3rd Party FBA"
                    stroke="#8b5cf6"
                    strokeWidth={1.5}
                    dot={false}
                  />
                )}
                {showFbm && (
                  <Line
                    yAxisId="price"
                    type="stepAfter"
                    dataKey="newFbmPrice"
                    name="3rd Party FBM"
                    stroke="#64748b"
                    strokeWidth={1.5}
                    dot={false}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
