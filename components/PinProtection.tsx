"use client"

import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Lock } from "lucide-react"

export default function PinProtection({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)
  const [pin, setPin] = useState("")
  const [error, setError] = useState(false)

  // Default PIN is 0033. You can change this here if you prefer a different one!
  const CORRECT_PIN = "0033"
  
  useEffect(() => {
    const unlockedUntil = localStorage.getItem("financials_unlocked_until")
    if (unlockedUntil && new Date().getTime() < parseInt(unlockedUntil)) {
      setIsAuthenticated(true)
    }
    setLoading(false)
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (pin === CORRECT_PIN) {
      // Unlock for 8 hours (8 * 60 * 60 * 1000 = 28,800,000 ms)
      const expiry = new Date().getTime() + 28800000
      localStorage.setItem("financials_unlocked_until", expiry.toString())
      setIsAuthenticated(true)
      setError(false)
    } else {
      setError(true)
      setPin("")
    }
  }

  // Prevent flash of content before checking local storage
  if (loading) return null

  if (isAuthenticated) {
    return <>{children}</>
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <div className="bg-white dark:bg-gray-950 border p-8 rounded-xl shadow-lg max-w-sm w-full text-center">
        <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <Lock className="w-6 h-6 text-primary" />
        </div>
        <h2 className="text-xl font-bold mb-2">Secure Area</h2>
        <p className="text-muted-foreground text-sm mb-6">Please enter your PIN to access financial data.</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input 
            type="password" 
            value={pin} 
            onChange={e => setPin(e.target.value)} 
            placeholder="Enter PIN" 
            className={`text-center text-xl tracking-widest ${error ? 'border-red-500' : ''}`}
            maxLength={10}
            autoFocus
          />
          {error && <p className="text-red-500 text-xs text-left">Incorrect PIN</p>}
          <Button type="submit" className="w-full font-bold">Unlock</Button>
        </form>
      </div>
    </div>
  )
}
