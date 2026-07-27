"use client"

import React, { useState, useEffect } from "react"
import { Key, CheckCircle2, XCircle, AlertTriangle, RefreshCw, Zap, ShieldCheck, HelpCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export function KeepaSettings() {
  const [loading, setLoading] = useState(true)
  const [testing, setTesting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [apiKeyInput, setApiKeyInput] = useState("")
  const [config, setConfig] = useState<{
    hasKey: boolean
    isDemoKey: boolean
    maskedKey: string | null
    tokensLeft: number
    refillRate: number
    lastCheckedAt?: string
    connectionStatus: "CONNECTED" | "ERROR" | "TEST_MODE" | "UNCONFIGURED"
  } | null>(null)

  const fetchConfig = async () => {
    try {
      setLoading(true)
      const res = await fetch("/api/admin/autopricer/keepa/config")
      if (res.ok) {
        const data = await res.json()
        setConfig(data.config)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchConfig()
  }, [])

  const handleSaveKey = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setSaving(true)
      const res = await fetch("/api/admin/autopricer/keepa/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: apiKeyInput }),
      })
      if (res.ok) {
        setApiKeyInput("")
        await fetchConfig()
        alert("Keepa API Key saved securely!")
      } else {
        const text = await res.text()
        alert(`Error saving key: ${text}`)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  const handleTestConnection = async () => {
    try {
      setTesting(true)
      const res = await fetch("/api/admin/autopricer/keepa/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "TEST_CONNECTION" }),
      })
      const data = await res.json()
      alert(data.message)
      await fetchConfig()
    } catch (e) {
      console.error(e)
      alert("Failed to test connection.")
    } finally {
      setTesting(false)
    }
  }

  const handleRemoveKey = async () => {
    if (!confirm("Are you sure you want to remove the Keepa API Key? The system will revert to Demo/Mock mode.")) return
    try {
      setSaving(true)
      await fetch("/api/admin/autopricer/keepa/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: null }),
      })
      await fetchConfig()
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="p-8 text-center text-slate-400 animate-pulse">Loading Keepa connection settings...</div>
  }

  const tokensLeft = config?.tokensLeft ?? 300
  const tokenPercent = Math.round((tokensLeft / 300) * 100)

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Status Card */}
      <Card className="bg-slate-900 border-slate-800 text-white shadow-xl">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <div>
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              <Zap className="h-5 w-5 text-amber-400" />
              Keepa API Connection Status
            </CardTitle>
            <CardDescription className="text-slate-400">
              Primary data source for Amazon Sales Rank history, Buy Box prices, and competitor offer time series.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {config?.connectionStatus === "CONNECTED" && (
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4" /> Live API Connected
              </span>
            )}
            {config?.connectionStatus === "TEST_MODE" && (
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4" /> Demo / Mock Mode
              </span>
            )}
            {config?.connectionStatus === "ERROR" && (
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center gap-1.5">
                <XCircle className="h-4 w-4" /> Connection Error
              </span>
            )}
            {config?.connectionStatus === "UNCONFIGURED" && (
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-400 border border-slate-700 flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4 text-amber-400" /> Unconfigured
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6 pt-2 border-t border-slate-800/80">
          {/* Token Consumption & Balance */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-300 font-medium flex items-center gap-1.5">
                Available Keepa Token Balance:
                <span className="text-white font-bold">{tokensLeft} / 300</span>
              </span>
              <span className="text-xs text-slate-400">
                Refill rate: <span className="text-indigo-400 font-semibold">+{config?.refillRate ?? 12} tokens/min</span>
              </span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-indigo-500 h-2.5 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, Math.max(0, tokenPercent))}%` }}
              ></div>
            </div>
            <p className="text-xs text-slate-400 flex items-center gap-1">
              <HelpCircle className="h-3.5 w-3.5 text-slate-500 shrink-0" />
              Each full ASIN history query consumes ~5 tokens. The system caches data and syncs automatically every 6 hours to conserve token limits.
            </p>
          </div>

          {/* API Key Management Form */}
          <form onSubmit={handleSaveKey} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-slate-300 mb-1.5 block flex items-center justify-between">
                <span>Keepa API Key (Encrypted at rest)</span>
                {config?.hasKey && <span className="text-emerald-400">Current key: {config.maskedKey}</span>}
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Key className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                  <Input
                    type="password"
                    placeholder={config?.hasKey ? "Enter a new Keepa API key to overwrite..." : "Paste your 64-character Keepa API key..."}
                    value={apiKeyInput}
                    onChange={(e) => setApiKeyInput(e.target.value)}
                    className="pl-9 bg-slate-950 border-slate-700 text-white placeholder:text-slate-600 focus:border-indigo-500"
                  />
                </div>
                <Button type="submit" disabled={saving || !apiKeyInput.trim()} className="bg-indigo-600 hover:bg-indigo-500 text-white shrink-0 font-medium">
                  {saving ? "Saving..." : config?.hasKey ? "Update Key" : "Save Key"}
                </Button>
                {config?.hasKey && (
                  <Button type="button" variant="outline" onClick={handleRemoveKey} disabled={saving} className="bg-slate-800 border-slate-700 hover:bg-rose-950 hover:text-rose-400 text-slate-300 shrink-0">
                    Remove
                  </Button>
                )}
              </div>
            </div>
          </form>

          {/* Actions Bar */}
          <div className="flex justify-between items-center pt-2 border-t border-slate-800/80">
            <span className="text-xs text-slate-500">
              Last checked: {config?.lastCheckedAt ? new Date(config.lastCheckedAt).toLocaleString() : "Never"}
            </span>
            <Button
              type="button"
              variant="secondary"
              onClick={handleTestConnection}
              disabled={testing}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-medium"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${testing ? "animate-spin text-indigo-400" : ""}`} />
              {testing ? "Testing Connection..." : "Test Keepa Connection"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
