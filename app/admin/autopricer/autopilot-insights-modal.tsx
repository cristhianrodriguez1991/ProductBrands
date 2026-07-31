"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { 
  Bot, TrendingUp, TrendingDown, Clock, Activity, Target, 
  ArrowRight, ShieldCheck, Search
} from "lucide-react"
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  ComposedChart, Area
} from "recharts"
import { MonitoredProduct } from "@prisma/client"

interface AutopilotInsightsModalProps {
  isOpen: boolean
  onClose: () => void
  productId: string | null
}

export function AutopilotInsightsModal({ isOpen, onClose, productId }: AutopilotInsightsModalProps) {
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<any>(null)

  useEffect(() => {
    if (isOpen && productId) {
      fetchInsights()
    } else {
      setData(null)
    }
  }, [isOpen, productId])

  const fetchInsights = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/autopricer/products/${productId}/autopilot/insights`)
      if (res.ok) {
        const json = await res.json()
        setData(json)
      }
    } catch (e) {
      console.error("Failed to fetch autopilot insights", e)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-slate-950 text-slate-200 border-slate-800 p-0 overflow-hidden rounded-2xl shadow-2xl">
        <div className="bg-gradient-to-r from-indigo-950 via-slate-900 to-slate-950 p-6 border-b border-indigo-500/20">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-2xl text-white">
              <span className="p-2 bg-indigo-500/20 rounded-xl border border-indigo-500/30 text-indigo-400">
                <Bot className="h-6 w-6" />
              </span>
              Autopilot Insights Engine
            </DialogTitle>
            <p className="text-slate-400 mt-1">
              Transparent tracking of every AI decision and its impact on the A9 Algorithm.
            </p>
          </DialogHeader>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400 flex flex-col items-center">
            <Activity className="h-8 w-8 animate-spin text-indigo-500 mb-4" />
            <p>Compiling AI telemetry data...</p>
          </div>
        ) : !data ? (
          <div className="p-12 text-center text-rose-400">Failed to load insights.</div>
        ) : (
          <div className="p-6 space-y-8">
            
            {/* ── Before & After ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500 mb-1">Sales Rank Impact</p>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl font-bold text-slate-300">
                      {data.product.autopilotStartRank ? `#${data.product.autopilotStartRank.toLocaleString()}` : "N/A"}
                    </span>
                    <ArrowRight className="h-4 w-4 text-slate-600" />
                    <span className="text-2xl font-bold text-white">
                      #{data.product.currentRank.toLocaleString()}
                    </span>
                  </div>
                </div>
                {data.product.autopilotStartRank && (
                  <div className={`p-3 rounded-full ${data.product.currentRank < data.product.autopilotStartRank ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"}`}>
                    {data.product.currentRank < data.product.autopilotStartRank ? <TrendingDown className="h-6 w-6" /> : <TrendingUp className="h-6 w-6" />}
                  </div>
                )}
              </div>
              
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500 mb-1">Price Strategy</p>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl font-bold text-slate-300">
                      ${data.product.autopilotStartPrice?.toFixed(2) || "N/A"}
                    </span>
                    <ArrowRight className="h-4 w-4 text-slate-600" />
                    <span className="text-2xl font-bold text-white">
                      ${data.product.currentPrice?.toFixed(2)}
                    </span>
                  </div>
                </div>
                <div className="p-3 rounded-full bg-blue-500/10 text-blue-400">
                  <Target className="h-6 w-6" />
                </div>
              </div>
            </div>

            {/* ── Charts ── */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
                <Activity className="h-4 w-4 text-indigo-400" />
                Algorithm Response Trajectory
              </h3>
              {data.chartData && data.chartData.length > 1 ? (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={data.chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                      <XAxis 
                        dataKey="date" 
                        stroke="#64748b" 
                        tick={{ fill: '#64748b', fontSize: 12 }} 
                        tickFormatter={(val) => new Date(val).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      />
                      <YAxis 
                        yAxisId="rank" 
                        orientation="left" 
                        stroke="#8b5cf6" 
                        reversed 
                        tickFormatter={(val) => `#${(val / 1000).toFixed(0)}k`}
                        tick={{ fill: '#8b5cf6', fontSize: 12 }} 
                      />
                      <YAxis 
                        yAxisId="price" 
                        orientation="right" 
                        stroke="#3b82f6"
                        domain={['auto', 'auto']}
                        tickFormatter={(val) => `$${val.toFixed(2)}`}
                        tick={{ fill: '#3b82f6', fontSize: 12 }} 
                      />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#f1f5f9' }}
                        labelFormatter={(lbl: any) => new Date(lbl).toLocaleDateString()}
                      />
                      <Area 
                        yAxisId="rank" 
                        type="monotone" 
                        dataKey="rank" 
                        fill="#8b5cf6" 
                        fillOpacity={0.1} 
                        stroke="#8b5cf6" 
                        strokeWidth={2} 
                        name="Sales Rank"
                      />
                      <Line 
                        yAxisId="price" 
                        type="stepAfter" 
                        dataKey="price" 
                        stroke="#3b82f6" 
                        strokeWidth={2} 
                        dot={false}
                        name="BuyBox Price"
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-64 flex flex-col items-center justify-center text-slate-500 bg-slate-950/50 rounded-lg border border-dashed border-slate-800">
                  <Clock className="h-8 w-8 mb-3 opacity-50" />
                  <p>Gathering telemetry...</p>
                  <p className="text-sm mt-1">Charts require at least 2 days of autopilot data to plot.</p>
                </div>
              )}
            </div>

            {/* ── Activity Timeline ── */}
            <div>
              <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
                <Search className="h-4 w-4 text-indigo-400" />
                AI Decision Log
              </h3>
              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {data.activityLogs && data.activityLogs.length > 0 ? (
                  data.activityLogs.map((log: any, idx: number) => (
                    <div key={log.id} className="relative pl-6 pb-6 border-l border-slate-800 last:border-0 last:pb-0">
                      <div className={`absolute -left-[5px] top-1 h-2 w-2 rounded-full ${log.recommendedAction === 'MAINTAIN' ? 'bg-slate-500' : log.recommendedAction === 'LOWER' ? 'bg-emerald-500' : 'bg-rose-500'} ring-4 ring-slate-950`} />
                      <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-sm ${
                              log.recommendedAction === 'MAINTAIN' ? 'bg-slate-800 text-slate-300' : 
                              log.recommendedAction === 'LOWER' ? 'bg-emerald-500/20 text-emerald-400' : 
                              'bg-rose-500/20 text-rose-400'
                            }`}>
                              {log.recommendedAction}
                            </span>
                            {log.oldPrice !== log.newPrice && (
                              <span className="text-sm font-medium text-slate-300">
                                ${log.oldPrice.toFixed(2)} → ${log.newPrice.toFixed(2)}
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-slate-500">
                            {new Date(log.requestedAt).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm text-slate-400 leading-relaxed whitespace-pre-wrap">
                          {log.reason || log.notes || "Executed autopilot assessment."}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center p-8 bg-slate-900 border border-slate-800 rounded-xl text-slate-500">
                    <ShieldCheck className="h-8 w-8 mx-auto mb-3 opacity-50" />
                    <p>No actions taken yet.</p>
                    <p className="text-sm mt-1">The AI is currently analyzing data and will log its first decision soon.</p>
                  </div>
                )}
              </div>
            </div>

          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
