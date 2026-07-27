import { MonitoredProduct } from "@prisma/client"
import { DailySalesObservation } from "../amazon-sp-api-service"
import { WeekdayProfile } from "../keepa/analytics/weekday-engine"

export interface AIStrategicAssessment {
  modelUsed: string
  timestamp: string
  strategicSummary: string
  detectedLagEffect: string
  recommendedAction: "RAISE" | "LOWER" | "MAINTAIN"
  proposedPrice?: number
  confidenceScore: number // 0 - 100
  keyTakeaways: string[]
  // Enriched, engine-driven context (optional, ignored by older UI)
  weekdayStrategy?: string
  adjustmentCents?: number
  velocitySnapshot?: {
    totalUnits30d: number
    totalUnits7d: number
    avgUnitsPerDay: number
    weekdayUnits: number
    weekendUnits: number
    netMarginPct: number
  }
}

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

/**
 * Connect to GLM (Zhipu BigModel API) to analyze daily sales velocity, rank inertia
 * (momentum carryover across days), and competitive pricing strategy.
 *
 * STRATEGIC PRINCIPLE: this engine is RANK-FIRST, not profit-first. On Amazon a
 * NUMERICALLY LOWER Sales Rank = better visibility = more organic sales. The single
 * most effective lever for driving rank down is sales velocity, so price moves must
 * protect/increase velocity. Therefore:
 *   - Default bias is MAINTAIN or micro-LOWER (cents), never a large RAISE.
 *   - Every adjustment is small (cents), capped at ~$0.15 per cycle. No big jumps.
 *   - The weekday engine's per-day signal is merged into the final recommendation.
 */
export async function analyzePricingWithGLM(
  product: MonitoredProduct & { calculated?: any },
  dailySales: DailySalesObservation[],
  weekdayProfiles: WeekdayProfile[],
  customApiKey?: string
): Promise<AIStrategicAssessment> {
  const apiKey = customApiKey || process.env.GLM_API_KEY || "f0cad4d1346f4de6ac26fe762fe8b7e7.EbtHqdi8pkA-uXOBfw1i0t3U"
  const cloudModel = process.env.GLM_MODEL || "glm-4" // BigModel cloud model
  // Local Ollama (only works when the app runs on the same machine as Ollama,
  // e.g. `npm run dev` on your Mac — NOT on the Vercel deployment).
  const ollamaBaseUrl = process.env.OLLAMA_BASE_URL // e.g. http://localhost:11434
  const ollamaModel = process.env.OLLAMA_MODEL || "glm4" // Ollama has no "glm 5.2"; glm4 is the closest available

  // ── Aggregate sales velocity ──────────────────────────────────────────────
  const last7 = dailySales.slice(0, 7)
  const totalUnits7d = last7.reduce((s, d) => s + d.unitsOrdered, 0)
  const totalUnits30d = dailySales.reduce((s, d) => s + d.unitsOrdered, 0)
  const avgUnitsPerDay = Math.round((totalUnits7d / Math.max(1, last7.length)) * 10) / 10
  const weekdayUnits = dailySales.filter((d) => !d.isWeekend).reduce((s, d) => s + d.unitsOrdered, 0)
  const weekendUnits = dailySales.filter((d) => d.isWeekend).reduce((s, d) => s + d.unitsOrdered, 0)

  // ── Margin (ranking decisions still respect not bleeding cash) ────────────
  const fbaFee = (product as any).fbaFee || 5.45
  const referralFee = product.currentPrice * ((product as any).referralFeePercent || 15) / 100
  const netMarginPct =
    ((product.currentPrice - product.unitCost - fbaFee - referralFee) / product.currentPrice) * 100

  // ── Today's weekday-engine signal ─────────────────────────────────────────
  const todayIdx = new Date().getDay()
  const todayProfile = weekdayProfiles[todayIdx]
  const todayName = DAY_NAMES[todayIdx]
  const lagDays = weekdayProfiles.filter((p) => p.isLagAffected).map((p) => p.dayName)

  // ── Try the real GLM API ──────────────────────────────────────────────────
  const systemPrompt = `You are an elite Amazon Marketplace Pricing Strategist and A9 Sales Rank data scientist.
STRATEGIC NORTH STAR: The seller's #1 goal is AGGRESSIVE SALES RANK REDUCTION. On Amazon a NUMERICALLY LOWER Sales Rank (e.g. 10,000 -> 5,000) means IMPROVEMENT and drives more organic sales. Maximizing profit per unit is secondary.
VELOCITY RULE: Sales velocity is the dominant lever for rank. Raising price slows velocity and hurts rank; lowering price (or holding) protects velocity and drives rank down.
CHANGE SIZE RULE: Every price change must be SMALL — a few CENTS, never dollars. Cap any single adjustment at $0.15. Never propose jumping to a price floor/ceiling in one step.
ENGINE RULE: You are given a per-weekday engine analysis with its own recommended strategy for each day. You MUST incorporate that engine signal into your final recommendation and explain how it shaped your decision.
Margin is still a guardrail: do not bleed cash, but when margin is healthy (>= 15%) prefer holding or micro-lowering to protect velocity over squeezing extra profit.`

  const userPrompt = `Analyze this Amazon product and respond with ONLY a valid JSON object.
Product: "${product.productName || product.sku}" (SKU: ${product.sku}, ASIN: ${product.asin})
Current Price: $${product.currentPrice.toFixed(2)} | Unit Cost: $${product.unitCost.toFixed(2)} | Min Price: $${product.minPrice.toFixed(2)} | Max Price: $${product.maxPrice.toFixed(2)}
Net Margin: ${netMarginPct.toFixed(1)}% | Fulfillment: ${product.fulfillmentMethod} | Buy Box Win Rate: ${(product as any).buyBoxWinRate ?? (product as any).buyBoxWinRatePercent ?? 85}%

Sales velocity (last 7 days): ${totalUnits7d} units (avg ${avgUnitsPerDay}/day). Last 30 days: ${totalUnits30d} units.
Weekday vs Weekend split: weekdays ${weekdayUnits} units vs weekends ${weekendUnits} units.
Today is ${todayName}. The weekday engine's signal for today: ${todayProfile?.recommendedStrategy || "Insufficient data"} (relative rank performance ${todayProfile?.relativePerformancePercent ?? 0}% vs the week; lag-affected: ${todayProfile?.isLagAffected ? "YES" : "no"}).
Lag-affected days detected by the engine: ${lagDays.length > 0 ? lagDays.join(", ") : "none"}.

Weekday engine profiles (median Sales Rank; relative % = positive means WORSE/higher rank, negative means BETTER/lower rank; engine strategy):
${weekdayProfiles.map((p) => `- ${p.dayName}: median rank #${(p.medianRank || 0).toLocaleString()}, relative ${p.relativePerformancePercent > 0 ? "+" : ""}${p.relativePerformancePercent}%, engine says "${p.recommendedStrategy}"${p.isLagAffected ? " (lag-affected)" : ""}`).join("\n")}

Decide the action (RAISE / LOWER / MAINTAIN) and a proposedPrice that is at most $0.15 away from the current price, respecting minPrice/maxPrice. Favor rank reduction. Then explain explicitly how the weekday engine signal and the velocity data drove the call.

JSON schema:
{
  "strategicSummary": "2-3 sentences. Explicit rank-first overview: state current velocity, whether rank is improving or deteriorating, and the single most important next move.",
  "detectedLagEffect": "Detailed explanation of day-to-day rank carryover / momentum inertia observed, naming specific days and rank numbers.",
  "recommendedAction": "MAINTAIN" | "RAISE" | "LOWER",
  "proposedPrice": number,
  "confidenceScore": number 0-100,
  "keyTakeaways": ["point 1", "point 2", "point 3"]
}`

  try {
    const llm = await callLLM(systemPrompt, userPrompt, {
      ollamaBaseUrl, ollamaModel, cloudApiKey: apiKey, cloudModel,
    })

    if (llm?.content) {
      const jsonMatch = llm.content.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        const action = (parsed.recommendedAction || "MAINTAIN").toUpperCase()
        // Clamp the LLM proposal to a small cents move within bounds — never trust
        // an LLM to respect the "cents only" rule on its own.
        const clamped = clampToCentsBand(
          product.currentPrice,
          Number(parsed.proposedPrice) || product.currentPrice,
          product.minPrice,
          product.maxPrice
        )
        return {
          modelUsed: llm.modelUsed,
          timestamp: new Date().toISOString(),
          strategicSummary: parsed.strategicSummary || "Rank-first analysis complete.",
          detectedLagEffect: parsed.detectedLagEffect || "No severe rank carryover distortion detected.",
          recommendedAction: (["RAISE", "LOWER", "MAINTAIN"].includes(action) ? action : "MAINTAIN") as AIStrategicAssessment["recommendedAction"],
          proposedPrice: clamped.price,
          confidenceScore: Math.min(100, Math.max(0, Number(parsed.confidenceScore) || 90)),
          keyTakeaways: Array.isArray(parsed.keyTakeaways) ? parsed.keyTakeaways : [],
          weekdayStrategy: todayProfile?.recommendedStrategy,
          adjustmentCents: clamped.cents,
          velocitySnapshot: {
            totalUnits30d, totalUnits7d, avgUnitsPerDay, weekdayUnits, weekendUnits,
            netMarginPct: Math.round(netMarginPct * 10) / 10,
          },
        }
      }
    }
  } catch (error: any) {
    console.warn(`[AI] LLM call failed, using rank-first local engine:`, error?.message)
  }

  // ── Rank-first local engine fallback (cents only, engine-driven) ──────────
  return rankFirstLocalStrategy(product, {
    totalUnits30d, totalUnits7d, avgUnitsPerDay, weekdayUnits, weekendUnits, netMarginPct,
  }, weekdayProfiles, todayProfile, todayName, lagDays)
}

/**
 * Call an LLM with the given prompts. Prefers a local Ollama instance when
 * OLLAMA_BASE_URL is configured (dev on your Mac); otherwise falls back to the
 * BigModel cloud API. Returns { content, modelUsed } or null if both fail.
 */
async function callLLM(
  systemPrompt: string,
  userPrompt: string,
  cfg: { ollamaBaseUrl?: string; ollamaModel: string; cloudApiKey: string; cloudModel: string }
): Promise<{ content: string; modelUsed: string } | null> {
  // 1) Local Ollama (only reachable when the app runs on the same host as Ollama)
  if (cfg.ollamaBaseUrl) {
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 60000) // local models can be slow on first call
      const res = await fetch(`${cfg.ollamaBaseUrl.replace(/\/$/, "")}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: cfg.ollamaModel,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          stream: false,
          options: { temperature: 0.2 },
        }),
        signal: controller.signal,
      })
      clearTimeout(timeout)
      if (res.ok) {
        const data = await res.json()
        const content = data?.message?.content
        if (content) {
          console.log(`[AI] Using local Ollama model: ${cfg.ollamaModel}`)
          return { content, modelUsed: `Ollama ${cfg.ollamaModel} (local)` }
        }
      } else {
        console.warn(`[AI] Ollama responded HTTP ${res.status}`)
      }
    } catch (e: any) {
      console.warn(`[AI] Ollama call failed:`, e?.message)
    }
  }

  // 2) BigModel cloud API (works on Vercel — needs a valid GLM_API_KEY)
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15000)
    const res = await fetch("https://open.bigmodel.cn/api/paas/v4/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${cfg.cloudApiKey}`,
      },
      body: JSON.stringify({
        model: cfg.cloudModel,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.2,
      }),
      signal: controller.signal,
    })
    clearTimeout(timeout)
    if (res.ok) {
      const data = await res.json()
      const content = data?.choices?.[0]?.message?.content
      if (content) {
        console.log(`[AI] Using BigModel cloud model: ${cfg.cloudModel}`)
        return { content, modelUsed: `GLM cloud (${cfg.cloudModel})` }
      }
    } else {
      console.warn(`[AI] BigModel cloud responded HTTP ${res.status}`)
    }
  } catch (e: any) {
    console.warn(`[AI] BigModel cloud call failed:`, e?.message)
  }

  return null
}

/**
 * Clamp a proposed price to a small cents-only band around the current price and
 * within [minPrice, maxPrice]. Returns the safe price and the signed cents delta.
 */
function clampToCentsBand(current: number, proposed: number, minPrice: number, maxPrice: number): { price: number; cents: number } {
  const MAX_STEP = 0.15
  let delta = proposed - current
  // Force cents-only: cap the magnitude of any change.
  if (delta > MAX_STEP) delta = MAX_STEP
  if (delta < -MAX_STEP) delta = -MAX_STEP
  let price = Math.round((current + delta) * 100) / 100
  if (price < minPrice) price = minPrice
  if (price > maxPrice) price = maxPrice
  const cents = Math.round((price - current) * 100)
  return { price, cents }
}

/**
 * Deterministic rank-first local strategy. Merges the weekday engine's per-day
 * signal with sales velocity and buy-box win rate to pick a SMALL (cents) move.
 *
 * Priority ladder (rank first):
 *   1. Buy Box being lost (<70% win rate) and room to lower above floor -> LOWER a few cents
 *      to reclaim the Buy Box (velocity rescue -> rank drop).
 *   2. Engine says today is a weak-rank day ("Consider small reduction") and room to lower
 *      above floor -> LOWER a few cents to stimulate velocity on the weak day.
 *   3. Engine says today is strong ("Protect margin" / "Test small increase") -> micro-RAISE
 *      a few cents; demand absorbs it without materially hurting rank.
 *   4. Otherwise -> MAINTAIN (protect velocity).
 *
 * IMPORTANT: a current price below the configured minPrice is treated as a CONFIG WARNING,
 * NOT an automatic large raise. Rank-first means we keep the price low to protect velocity;
 * we surface the floor violation to the user instead of jumping to the floor in dollars.
 */
function rankFirstLocalStrategy(
  product: MonitoredProduct & { calculated?: any },
  v: { totalUnits30d: number; totalUnits7d: number; avgUnitsPerDay: number; weekdayUnits: number; weekendUnits: number; netMarginPct: number },
  weekdayProfiles: WeekdayProfile[],
  todayProfile: WeekdayProfile | undefined,
  todayName: string,
  lagDays: string[]
): AIStrategicAssessment {
  const current = product.currentPrice
  const minPrice = product.minPrice
  const maxPrice = product.maxPrice

  const step = Math.min(0.15, Number((product as any).defaultAdjustmentSize) || 0.05)
  const belowFloor = current < minPrice
  const canLower = current - step >= minPrice // room to lower without breaching floor
  const canRaise = current + step <= maxPrice

  const winRate = (product as any).buyBoxWinRate ?? (product as any).buyBoxWinRatePercent
  const losingBuyBox = winRate !== undefined && winRate < 70

  const todayStrategy = todayProfile?.recommendedStrategy
  const todayWeak = todayStrategy === "Consider small reduction" || todayStrategy === "Reevaluate"
  const todayStrong = todayStrategy === "Protect margin" || todayStrategy === "Test small increase"

  let action: "RAISE" | "LOWER" | "MAINTAIN" = "MAINTAIN"
  let reason = ""

  if (losingBuyBox && canLower) {
    action = "LOWER"
    reason = `Buy Box win rate is ${winRate}% (<70%). Reclaiming it with a ${formatCents(-step)} cut protects velocity and drives rank down.`
  } else if (todayWeak && canLower) {
    action = "LOWER"
    reason = `The weekday engine flags ${todayName} as a weak-rank day (relative ${todayProfile?.relativePerformancePercent > 0 ? "+" : ""}${todayProfile?.relativePerformancePercent}% vs the week). A ${formatCents(-step)} micro-cut stimulates velocity exactly when rank is softest.`
  } else if (todayStrong && canRaise) {
    action = "RAISE"
    reason = `The weekday engine flags ${todayName} as a strong-rank day (relative ${todayProfile?.relativePerformancePercent > 0 ? "+" : ""}${todayProfile?.relativePerformancePercent}% vs the week). Demand absorbs a ${formatCents(step)} micro-increase without materially hurting rank.`
  } else {
    action = "MAINTAIN"
    reason = `No velocity-rescue signal this cycle. Holding at $${current.toFixed(2)} protects sales velocity, which is the dominant lever for driving Sales Rank down.`
  }

  // Compute proposed price (cents only, bounded)
  let proposedPrice = current
  if (action === "LOWER") proposedPrice = Math.max(minPrice, Math.round((current - step) * 100) / 100)
  if (action === "RAISE") proposedPrice = Math.min(maxPrice, Math.round((current + step) * 100) / 100)
  const cents = Math.round((proposedPrice - current) * 100)

  // ── Explicit English narrative ────────────────────────────────────────────
  const rankTrend = todayProfile
    ? todayProfile.relativePerformancePercent < -5
      ? "improving (rank is better than the weekly baseline)"
      : todayProfile.relativePerformancePercent > 5
      ? "deteriorating (rank is worse than the weekly baseline)"
      : "stable around the weekly baseline"
    : "unknown (insufficient weekday data)"

  const summary =
    `RANK-FIRST STRATEGY for "${product.productName || product.sku}": ` +
    `last 30 days delivered ${v.totalUnits30d} units (${v.avgUnitsPerDay}/day avg over the last 7 days); ` +
    `weekday/weekend split is ${v.weekdayUnits}/${v.weekendUnits} units. ` +
    `Net margin is ${v.netMarginPct.toFixed(1)}% (healthy enough to prioritize rank over per-unit profit). ` +
    `Today (${todayName}) the rank trend is ${rankTrend}. ` +
    `Recommended move: ${action} to $${proposedPrice.toFixed(2)} (${formatCents(cents)}). ` +
    `${reason}`

  const lagText =
    lagDays.length > 0
      ? `A9 RANK INERTIA DETECTED: ${lagDays.join(", ")} show momentum carryover — the rank starts the day deceptively strong ` +
        `from the previous day's sales, then deteriorates by night (intra-day delta up to ` +
        `${Math.max(...weekdayProfiles.filter((p) => p.isLagAffected).map((p) => p.intraDayRankDelta), 0).toLocaleString()} positions). ` +
        `Do NOT read the strong morning rank on these days as real demand; hold price and let actual orders re-anchor the rank. ` +
        `Today (${todayName}) is ${todayProfile?.isLagAffected ? "lag-affected — keep the price steady and avoid reactive cuts" : "not lag-affected"}.`
      : `No severe A9 rank-inertia / lag-carryover distortion was detected across the week. ` +
        `Today (${todayName}) engine signal: "${todayProfile?.recommendedStrategy || "Insufficient data"}" ` +
        `(relative rank ${todayProfile?.relativePerformancePercent > 0 ? "+" : ""}${todayProfile?.relativePerformancePercent ?? 0}% vs the weekly baseline).`

  const takeaways: string[] = [
    `Rank-first objective: drive Sales Rank DOWN (numerically lower = better visibility = more organic sales). Velocity is the lever — protect it.`,
    `Change size: ${action === "MAINTAIN" ? "no change" : `only ${formatCents(Math.abs(cents))}`} this cycle. Never large dollar jumps — small cents moves let us read the rank response cleanly.`,
    `Engine signal for today (${todayName}): "${todayProfile?.recommendedStrategy || "Insufficient data"}" — ${reason}`,
  ]

  if (losingBuyBox) {
    takeaways.push(`Buy Box alert: win rate is ${winRate}% (below 70%). Reclaiming the Buy Box is the fastest path to recovered velocity and a lower rank.`)
  }
  if (belowFloor) {
    takeaways.push(
      `CONFIG WARNING: current price $${current.toFixed(2)} is below the configured min price $${minPrice.toFixed(2)}. ` +
      `Rank-first mode does NOT auto-raise to the floor (that would hurt velocity). Review the min-price setting manually if this is unintended.`
    )
  }
  if (!todayProfile?.hasEnoughData) {
    takeaways.push(`Data caveat: only ${todayProfile?.sampleWeeks ?? 0} weeks of weekday history are available (engine needs 8). Treat the day-of-week signal as provisional.`)
  }

  return {
    modelUsed: "Rank-First Local Engine (GLM API unavailable — merges weekday engine + velocity + Buy Box)",
    timestamp: new Date().toISOString(),
    strategicSummary: summary,
    detectedLagEffect: lagText,
    recommendedAction: action,
    proposedPrice: Math.round(proposedPrice * 100) / 100,
    confidenceScore: 90,
    keyTakeaways: takeaways,
    weekdayStrategy: todayProfile?.recommendedStrategy,
    adjustmentCents: cents,
    velocitySnapshot: {
      totalUnits30d: v.totalUnits30d,
      totalUnits7d: v.totalUnits7d,
      avgUnitsPerDay: v.avgUnitsPerDay,
      weekdayUnits: v.weekdayUnits,
      weekendUnits: v.weekendUnits,
      netMarginPct: Math.round(v.netMarginPct * 10) / 10,
    },
  }
}

function formatCents(cents: number): string {
  if (cents === 0) return "no change"
  const abs = Math.abs(cents)
  const sign = cents > 0 ? "+" : "-"
  if (abs < 100) return `${sign}${abs}¢`
  return `${sign}$${(abs / 100).toFixed(2)}`
}