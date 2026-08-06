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
  scheduledDay?: string // e.g. "Saturday"
  testRationale?: string // Why this day and this price
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
  customApiKey?: string,
  salesDiagnostic?: { sku: string; asin?: string | null; totalRecordsForSku: number; totalRecordsForAsin: number; latestSaleDate?: string | null },
  recentChangeContext?: { hasRecentChange: boolean; daysSinceChange: number; oldPrice: number; newPrice: number; rankBefore?: number | null; rankNow?: number | null; evaluationStatus?: string; aiActivityLog?: string }
): Promise<AIStrategicAssessment> {
  // OpenAI cloud API key. Set via OPENAI_API_KEY env var (.env.local for local
  // dev, Vercel project env vars for production). Never hardcode keys in source.
  // Strip ALL whitespace (newlines/spaces) — Vercel often stores a line-wrapped
  // pasted key, which breaks the Authorization header. OpenAI keys never contain
  // whitespace, so this is always safe.
  const rawApiKey = customApiKey || process.env.OPENAI_API_KEY || ""
  const apiKey = rawApiKey.replace(/\s+/g, "")
  const cloudModel = process.env.OPENAI_MODEL || "gpt-4o-mini" // OpenAI cloud model
  // Local Ollama (only works when the app runs on the same machine as Ollama,
  // e.g. `npm run dev` on your Mac — NOT on the Vercel deployment).
  const ollamaBaseUrl = process.env.OLLAMA_BASE_URL // e.g. http://localhost:11434
  const ollamaModel = process.env.OLLAMA_MODEL || "glm4" // Ollama has no "glm 5.2"; glm4 is the closest available

  // ── No-data guard: don't fabricate a rank analysis on empty sales data ────
  // If the DB has zero sales records for this SKU (and ASIN), we cannot infer
  // velocity/rank dynamics. Surface the cause + remedy instead of hallucinating.
  if (salesDiagnostic && salesDiagnostic.totalRecordsForSku === 0 && salesDiagnostic.totalRecordsForAsin === 0) {
    return noSalesDataAssessment(product, salesDiagnostic)
  }

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
BRAND OWNER RULE: The seller is the brand owner and sole seller of this ASIN. They own the Buy Box 100% of the time. Do NOT worry about winning the Buy Box from other sellers on this listing. Your ONLY competition is other products on Amazon. Optimize for Sales Rank and conversion rate.
VELOCITY RULE: Sales velocity is the dominant lever for rank. Raising price slows velocity and hurts rank; lowering price (or holding) protects velocity and drives rank down.
CHANGE SIZE RULE: Every price change must be SMALL and INCREMENTAL. Never jump more than $1.00 at a time.
PSYCHOLOGICAL PRICING RULE: Prices MUST end in psychological numbers like .99, .50, .00, or .49. Do not propose random numbers like 12.37.
HOLD & TEST RULE: You MUST observe a 5-day cooldown. If a price change was made within the last 5 days, you MUST output MAINTAIN (HOLD) to let the A9 algorithm react, UNLESS the rank is catastrophically crashing. Do not change prices every day as it confuses the algorithm.
PROFIT-SEEKING TEST RULE: If the product is performing very well (stable or improving rank for 5+ days), you should actively test small price INCREASES to see if higher profit can be achieved without losing rank.
Margin is still a guardrail: do not bleed cash, but when margin is healthy (>= 15%) prefer holding or micro-lowering to protect velocity over squeezing extra profit.`

  let testContextText = "No recent price changes detected. The product is ready for a new strategic move."
  if (recentChangeContext?.hasRecentChange) {
    const r = recentChangeContext
    const rankDelta = (r.rankBefore && r.rankNow) ? (r.rankNow - r.rankBefore) : 0
    const rankMsg = rankDelta < 0 ? `improved by ${Math.abs(rankDelta)} positions` : rankDelta > 0 ? `worsened by ${rankDelta} positions` : "remained stable"
    testContextText = `ACTIVE TEST RUNNING: Price was changed from $${r.oldPrice.toFixed(2)} to $${r.newPrice.toFixed(2)} exactly ${Math.round(r.daysSinceChange)} days ago. Since then, the Sales Rank has ${rankMsg} (Before: ${r.rankBefore || 'N/A'}, Now: ${r.rankNow || 'N/A'}). Status: ${r.evaluationStatus}. Unless rank is severely crashing, you should MAINTAIN to let the test complete.`
  }

  const userPrompt = `Analyze this Amazon product and respond with ONLY a valid JSON object.
Product: "${product.productName || product.sku}" (SKU: ${product.sku}, ASIN: ${product.asin})
Current Price: $${product.currentPrice.toFixed(2)} | Unit Cost: $${product.unitCost.toFixed(2)} | Min Price: $${product.minPrice.toFixed(2)} | Max Price: $${product.maxPrice.toFixed(2)}
Net Margin: ${netMarginPct.toFixed(1)}% | Fulfillment: ${product.fulfillmentMethod} | Buy Box Win Rate: ${(product as any).buyBoxWinRate ?? (product as any).buyBoxWinRatePercent ?? 85}%

Sales velocity (last 7 days): ${totalUnits7d} units (avg ${avgUnitsPerDay}/day). Last 30 days: ${totalUnits30d} units.
Weekday vs Weekend split: weekdays ${weekdayUnits} units vs weekends ${weekendUnits} units.
Today is ${todayName}. The weekday engine's signal for today: ${todayProfile?.recommendedStrategy || "Insufficient data"} (relative rank performance ${todayProfile?.relativePerformancePercent ?? 0}% vs the week; lag-affected: ${todayProfile?.isLagAffected ? "YES" : "no"}).
Lag-affected days detected by the engine: ${lagDays.length > 0 ? lagDays.join(", ") : "none"}.

${testContextText}

RECENT AI LOG HISTORY:
If provided, read your own recent logs below to reflect on your previous decisions and their effects on rank.
${recentChangeContext?.aiActivityLog ? recentChangeContext.aiActivityLog : "No recent AI logs provided."}

Weekday engine profiles (median Sales Rank; relative % = positive means WORSE/higher rank, negative means BETTER/lower rank; engine strategy):
${weekdayProfiles.map((p) => `- ${p.dayName}: median rank #${(p.medianRank || 0).toLocaleString()}, relative ${p.relativePerformancePercent > 0 ? "+" : ""}${p.relativePerformancePercent}%, engine says "${p.recommendedStrategy}"${p.isLagAffected ? " (lag-affected)" : ""}`).join("\n")}

Decide the action (RAISE / LOWER / MAINTAIN) and a proposedPrice that is at most $0.15 away from the current price, respecting minPrice/maxPrice. Favor rank reduction. Then explain explicitly how the weekday engine signal and the velocity data drove the call. 
IMPORTANT COMMUNICATION RULES:
1. Use simple, everyday conversational language.
2. Avoid confusing exact percentages (like "+57.3% signal"). Use simple trends instead.
3. When referring to rank, use "improving" when the rank goes DOWN (gets better), and "worsening" or "losing ground" when the rank goes UP. Never use words like "deteriorating".

JSON schema:
{
  "strategicSummary": "2-3 sentences. Simple day-to-day overview: state current velocity, whether rank is 'improving' or 'worsening', and the next move.",
  "detectedLagEffect": "Simple conversational explanation of day-to-day momentum observed, naming specific days without weird percentages.",
  "recommendedAction": "MAINTAIN" | "RAISE" | "LOWER",
  "proposedPrice": number,
  "confidenceScore": number 0-100,
  "keyTakeaways": ["Simple bullet point 1 without complex jargon", "Simple bullet point 2", "Simple bullet point 3"],
  "scheduledDay": "The exact day of the week to execute this change, e.g. 'Thursday'. Pick the optimal day based on weekday signals.",
  "testRationale": "Simple, conversational explanation of why this specific day and price were chosen for the weekly test."
}`

  let llmFailureReason = ""
  try {
    const llm = await callLLM(systemPrompt, userPrompt, {
      ollamaBaseUrl, ollamaModel, cloudApiKey: apiKey, cloudModel,
    })

    if (llm && llm.content) {
      const jsonMatch = llm.content.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        const rawAction = (parsed.recommendedAction || "MAINTAIN").toUpperCase()
        const action = (["RAISE", "LOWER", "MAINTAIN"].includes(rawAction) ? rawAction : "MAINTAIN") as AIStrategicAssessment["recommendedAction"]
        
        let roundedPrice = product.currentPrice
        let centsDelta = 0

        if (action !== "MAINTAIN") {
          const clamped = clampToCentsBand(
            product.currentPrice,
            Number(parsed.proposedPrice) || product.currentPrice,
            product.minPrice,
            product.maxPrice
          )
          roundedPrice = applyPsychologicalRounding(clamped.price, product.minPrice, product.maxPrice)
          centsDelta = clamped.cents
        }

        return {
          modelUsed: llm.modelUsed,
          timestamp: new Date().toISOString(),
          strategicSummary: parsed.strategicSummary || "Rank-first analysis complete.",
          detectedLagEffect: parsed.detectedLagEffect || "No severe rank carryover distortion detected.",
          recommendedAction: action,
          proposedPrice: roundedPrice,
          confidenceScore: Math.min(100, Math.max(0, Number(parsed.confidenceScore) || 90)),
          keyTakeaways: Array.isArray(parsed.keyTakeaways) ? parsed.keyTakeaways : [],
          scheduledDay: parsed.scheduledDay,
          testRationale: parsed.testRationale,
          weekdayStrategy: todayProfile?.recommendedStrategy,
          adjustmentCents: centsDelta,
          velocitySnapshot: {
            totalUnits30d, totalUnits7d, avgUnitsPerDay, weekdayUnits, weekendUnits,
            netMarginPct: Math.round(netMarginPct * 10) / 10,
          },
        }
      }
      llmFailureReason = "LLM responded but its output was not valid JSON."
    } else if (llm && !llm.content) {
      llmFailureReason = llm.failureReason || "LLM call failed."
    }
  } catch (error: any) {
    llmFailureReason = `LLM call threw: ${error?.message || error}`
    console.warn(`[AI] LLM call failed, using rank-first local engine:`, error?.message)
  }

  // ── Rank-first local engine fallback (cents only, engine-driven) ──────────
  return rankFirstLocalStrategy(product, {
    totalUnits30d, totalUnits7d, avgUnitsPerDay, weekdayUnits, weekendUnits, netMarginPct,
  }, weekdayProfiles, todayProfile, todayName, lagDays, llmFailureReason, recentChangeContext)
}

/**
 * Call an LLM with the given prompts. Tries OpenAI cloud first, then a local
 * Ollama instance. Returns { content, modelUsed } on success, otherwise
 * { content: null, failureReason } describing why both failed.
 */
async function callLLM(
  systemPrompt: string,
  userPrompt: string,
  cfg: { ollamaBaseUrl?: string; ollamaModel: string; cloudApiKey: string; cloudModel: string }
): Promise<{ content: string; modelUsed: string; failureReason?: string } | { content: null; failureReason: string }> {
  // 1) OpenAI cloud API — primary. Works on Vercel and locally. Needs a valid
  //    OPENAI_API_KEY with quota/billing enabled.
  if (!cfg.cloudApiKey) {
    // Skip the network call entirely when no key is configured, and say so.
  } else {
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 20000)
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
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
          response_format: { type: "json_object" },
        }),
        signal: controller.signal,
      })
      clearTimeout(timeout)
      if (res.ok) {
        const data = await res.json()
        const content = data?.choices?.[0]?.message?.content
        if (content) {
          console.log(`[AI] Using OpenAI cloud model: ${cfg.cloudModel}`)
          return { content, modelUsed: `OpenAI ${cfg.cloudModel} (cloud)` }
        }
        return { content: null, failureReason: "OpenAI returned an empty response." }
      } else {
        const errBody = await res.text().catch(() => "")
        console.warn(`[AI] OpenAI cloud responded HTTP ${res.status}: ${errBody.slice(0, 200)}`)
        let hint = ""
        if (res.status === 401) hint = " — OPENAI_API_KEY is missing/invalid. Check the Vercel env var name and value."
        else if (res.status === 429) hint = " — insufficient quota. Add credits at platform.openai.com/billing."
        else if (res.status === 404) hint = ` — model '${cfg.cloudModel}' not found. Check OPENAI_MODEL.`
        return { content: null, failureReason: `OpenAI responded HTTP ${res.status}${hint}` }
      }
    } catch (e: any) {
      console.warn(`[AI] OpenAI cloud call failed:`, e?.message)
      if (e?.name === "AbortError") {
        return { content: null, failureReason: "OpenAI call timed out (20s)." }
      }
      return { content: null, failureReason: `OpenAI call failed: ${e?.message || e}` }
    }
  }

  // 2) Local Ollama — fallback when the cloud API is unavailable/unconfigured.
  //    Only reachable when the app runs on the same host as Ollama (local dev).
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

  return {
    content: null,
    failureReason: cfg.cloudApiKey
      ? "OpenAI cloud call did not succeed and Ollama is not reachable from this environment (expected on Vercel)."
      : "OPENAI_API_KEY env var is not set, and Ollama is not reachable from this environment (expected on Vercel).",
  }
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
 * Snap price to nearest psychological threshold (.99, .50, .00, .49)
 * without exceeding min/max bounds.
 */
function applyPsychologicalRounding(price: number, minPrice: number, maxPrice: number): number {
  if (price === minPrice || price === maxPrice) return price // Don't round if it hit a hard wall
  const integerPart = Math.floor(price)
  const decimalPart = price - integerPart

  let roundedDecimal = 0.99
  if (decimalPart <= 0.25) roundedDecimal = 0.00
  else if (decimalPart <= 0.49) roundedDecimal = 0.49
  else if (decimalPart <= 0.75) roundedDecimal = 0.50
  else roundedDecimal = 0.99

  let finalPrice = integerPart + roundedDecimal
  // If we rounded up past .99, it becomes .00 of next dollar (handled by integer bump if needed, but here we just use .00)
  
  if (finalPrice < minPrice) finalPrice = minPrice
  if (finalPrice > maxPrice) finalPrice = maxPrice
  
  return Math.round(finalPrice * 100) / 100
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
  lagDays: string[],
  llmFailureReason: string,
  recentChangeContext?: { hasRecentChange: boolean; daysSinceChange: number; oldPrice: number; newPrice: number; rankBefore?: number | null; rankNow?: number | null; evaluationStatus?: string; aiActivityLog?: string }
): AIStrategicAssessment {
  const current = product.currentPrice
  const minPrice = product.minPrice
  const maxPrice = product.maxPrice

  // Local engine now also supports up to $1.00 jumps for profit seeking, but defaults to small steps.
  const step = Math.min(1.00, Number((product as any).defaultAdjustmentSize) || 0.50)
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
    reason = `Buy Box win rate is ${winRate}% (<70%). Reclaiming it with a price cut protects velocity and drives rank down.`
  } else if (recentChangeContext?.hasRecentChange && recentChangeContext.daysSinceChange < 5 && (!recentChangeContext.rankNow || !recentChangeContext.rankBefore || recentChangeContext.rankNow < recentChangeContext.rankBefore + 5000)) {
    // HOLD & TEST Logic: Enforce 5-day cooldown.
    action = "MAINTAIN"
    reason = `5-Day Cooldown Active: price was changed to $${recentChangeContext.newPrice.toFixed(2)} exactly ${Math.round(recentChangeContext.daysSinceChange)} days ago. Holding steady to allow A9 Sales Rank to fully digest the change.`
  } else if (recentChangeContext?.hasRecentChange && recentChangeContext.daysSinceChange >= 5 && recentChangeContext.rankNow && recentChangeContext.rankBefore && recentChangeContext.rankNow <= recentChangeContext.rankBefore + 1000 && canRaise) {
    // PROFIT-SEEKING TEST: If it's been 5 days and rank is stable or improving, test a raise.
    action = "RAISE"
    reason = `Profit-Seeking Test: Rank has been stable or improving for ${Math.round(recentChangeContext.daysSinceChange)} days since the last price change. Slowly raising price to test if we can extract more profit without losing rank.`
  } else if (todayWeak && canLower) {
    action = "LOWER"
    reason = `The weekday engine flags ${todayName} as a weak-rank day (relative ${((todayProfile?.relativePerformancePercent ?? 0) > 0 ? "+" : "")}${todayProfile?.relativePerformancePercent ?? 0}% vs the week). A micro-cut stimulates velocity exactly when rank is softest.`
  } else if (todayStrong && canRaise) {
    action = "RAISE"
    reason = `The weekday engine flags ${todayName} as a strong-rank day (relative ${((todayProfile?.relativePerformancePercent ?? 0) > 0 ? "+" : "")}${todayProfile?.relativePerformancePercent ?? 0}% vs the week). Demand absorbs a micro-increase without materially hurting rank.`
  } else {
    action = "MAINTAIN"
    reason = `No velocity-rescue signal this cycle. Holding at $${current.toFixed(2)} protects sales velocity, which is the dominant lever for driving Sales Rank down.`
  }

  // Compute proposed price (cents only, bounded)
  let proposedPrice = current
  if (action === "LOWER") proposedPrice = Math.max(minPrice, Math.round((current - step) * 100) / 100)
  if (action === "RAISE") proposedPrice = Math.min(maxPrice, Math.round((current + step) * 100) / 100)
  
  if (action !== "MAINTAIN") {
    proposedPrice = applyPsychologicalRounding(proposedPrice, minPrice, maxPrice)
  } else {
    proposedPrice = current
  }
  const cents = Math.round((proposedPrice - current) * 100)

  // Identify the optimal day for the test
  let bestDay = todayName
  let testRationale = ""

  if (action === "LOWER") {
    // Pick the day with the weakest rank (highest relative performance percentage)
    const weakestDay = weekdayProfiles.reduce((prev, curr) => (curr.relativePerformancePercent > prev.relativePerformancePercent ? curr : prev), weekdayProfiles[0])
    if (weakestDay) {
      bestDay = weakestDay.dayName
      testRationale = `Selected ${bestDay} for a price test because it exhibits the weakest momentum (relative ${weakestDay.relativePerformancePercent > 0 ? "+" : ""}${weakestDay.relativePerformancePercent}% rank compared to the weekly median). Stimulating velocity on this soft day provides the highest ROI for rank reduction.`
    }
  } else if (action === "RAISE") {
    // Pick the day with the strongest rank (lowest relative performance percentage)
    const strongestDay = weekdayProfiles.reduce((prev, curr) => (curr.relativePerformancePercent < prev.relativePerformancePercent ? curr : prev), weekdayProfiles[0])
    if (strongestDay) {
      bestDay = strongestDay.dayName
      testRationale = `Selected ${bestDay} for a margin test because it exhibits the strongest momentum (relative ${strongestDay.relativePerformancePercent > 0 ? "+" : ""}${strongestDay.relativePerformancePercent}% rank compared to the weekly median). Demand is highest here and can absorb a micro-increase.`
    }
  } else {
    testRationale = `Holding steady. No specific day test required right now.`
  }

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
        `(relative rank ${((todayProfile?.relativePerformancePercent ?? 0) > 0 ? "+" : "")}${todayProfile?.relativePerformancePercent ?? 0}% vs the weekly baseline).`

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
  if (llmFailureReason) {
    takeaways.push(`⚠ LLM not used: ${llmFailureReason}`)
  }

  return {
    modelUsed: llmFailureReason
      ? `Rank-First Local Engine fallback — ${llmFailureReason}`
      : "Rank-First Local Engine (merges weekday engine + velocity + Buy Box)",
    timestamp: new Date().toISOString(),
    strategicSummary: summary,
    detectedLagEffect: lagText,
    recommendedAction: action,
    proposedPrice: Math.round(proposedPrice * 100) / 100,
    confidenceScore: 90,
    keyTakeaways: takeaways,
    scheduledDay: bestDay,
    testRationale: testRationale,
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

/**
 * Honest "no data" assessment. Returned when there are zero synced sales records
 * for the product's SKU and ASIN, so we never fabricate a rank analysis on empty
 * data. Tells the user the two real causes (never sold vs SKU/ASIN mismatch) and
 * the remedy, and recommends a small cent-level cut to stimulate first sales.
 */
function noSalesDataAssessment(
  product: MonitoredProduct & { calculated?: any },
  diag: { sku: string; asin?: string | null; totalRecordsForSku: number; totalRecordsForAsin: number; latestSaleDate?: string | null }
): AIStrategicAssessment {
  const asinTxt = diag.asin ? ` / ASIN ${diag.asin}` : ""
  return {
    modelUsed: "No sales data — sync required (rank analysis skipped)",
    timestamp: new Date().toISOString(),
    strategicSummary:
      `NO SALES DATA for "${product.productName || product.sku}" (SKU ${diag.sku}${asinTxt}). ` +
      `The database has 0 synced sales records for this product, so every day shows 0 units. ` +
      `A rank-first analysis cannot run on empty data — the table is not "0 sales", it is "no data".`,
    detectedLagEffect:
      `Rank inertia cannot be assessed without sales data. Once sales are synced, the engine will ` +
      `detect day-to-day rank carryover and lag-affected days.`,
    recommendedAction: "MAINTAIN",
    proposedPrice: product.currentPrice,
    confidenceScore: 0,
    keyTakeaways: [
      `No synced sales data exists in the DB for SKU ${diag.sku}${asinTxt}.`,
      `If this product HAS sold on Amazon in the last 30 days: run Sync Sales. The stored SKU/ASIN likely does not match Amazon's order report (e.g. a different fulfillment SKU, or the product is missing its ASIN). Check the sync result's unmatchedSkusSample / unmatchedAsinsSample.`,
      `If this product has NOT sold in the last 30 days: the 0 units are real. To drive first sales and lower rank, consider a small cent-level price cut and verify the listing is Buy Box-eligible.`,
    ],
    weekdayStrategy: undefined,
    adjustmentCents: 0,
    velocitySnapshot: {
      totalUnits30d: 0, totalUnits7d: 0, avgUnitsPerDay: 0, weekdayUnits: 0, weekendUnits: 0, netMarginPct: 0,
    },
  }
}

export interface AIPriceImpactPrediction {
  projectedRank: number
  projectedSales30d: number
  reasoning: string
}

/**
 * Connect to GLM (or OpenAI fallback) to predict the Sales Rank and Sales Volume
 * impact of a simulated price change, based on the last 30 days of performance.
 */
export async function predictPriceImpactWithGLM(
  product: MonitoredProduct,
  simulatedPrice: number,
  dailySales: DailySalesObservation[],
  recentKeepaHistory: any[]
): Promise<AIPriceImpactPrediction> {
  const rawApiKey = process.env.OPENAI_API_KEY || ""
  const apiKey = rawApiKey.replace(/\s+/g, "")
  const cloudModel = process.env.OPENAI_MODEL || "gpt-4o-mini"
  const ollamaBaseUrl = process.env.OLLAMA_BASE_URL
  const ollamaModel = process.env.OLLAMA_MODEL || "glm4"

  const totalUnits30d = dailySales.reduce((sum, d) => sum + d.unitsOrdered, 0)
  
  // Get median rank from recent history
  let medianRank = 0
  if (recentKeepaHistory.length > 0) {
    const ranks = recentKeepaHistory.map(h => h.salesRank).filter(r => r > 0).sort((a, b) => a - b)
    medianRank = ranks[Math.floor(ranks.length / 2)] || 0
  }

  const systemPrompt = `You are an elite Amazon Marketplace Pricing Strategist and A9 Sales Rank data scientist.
Your task is to predict the resulting Amazon Sales Rank and 30-day Sales Volume if the seller changes their price to a specific simulated price.
You will be provided with the current performance (30-day sales volume, current price, and current median sales rank).

RULES:
1. If the simulated price is LOWER than the current price, Sales Volume should generally INCREASE and Sales Rank should numerically DECREASE (improve).
2. If the simulated price is HIGHER than the current price, Sales Volume should generally DECREASE and Sales Rank should numerically INCREASE (worsen).
3. The magnitude of the change depends on the percentage change in price. E.g., a $0.50 drop on a $10 item (5%) is significant, but on a $100 item (0.5%) it is negligible.
4. Output MUST be valid JSON.`

  const userPrompt = `Predict the impact of a price change for this Amazon product.
Product: "${product.productName || product.sku}"
Current Price: $${product.currentPrice.toFixed(2)}
Simulated Target Price: $${simulatedPrice.toFixed(2)}

Past 30 Days Performance:
- Total Units Sold: ${totalUnits30d}
- Median Sales Rank: #${medianRank.toLocaleString()}

Calculate the projected 30-day sales volume and the projected sales rank if the price is changed to the Simulated Target Price.

Respond with ONLY a valid JSON object matching this schema:
{
  "projectedRank": number (the projected sales rank, e.g. 15000),
  "projectedSales30d": number (the projected total units sold in a 30-day period, e.g. 120),
  "reasoning": string (1-2 sentences explaining the logic based on price elasticity and the psychological threshold of the new price vs the old price)
}`

  try {
    const llm = await callLLM(systemPrompt, userPrompt, {
      ollamaBaseUrl, ollamaModel, cloudApiKey: apiKey, cloudModel,
    })

    if (llm && llm.content) {
      const jsonMatch = llm.content.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        return {
          projectedRank: Math.round(Number(parsed.projectedRank)) || medianRank,
          projectedSales30d: Math.round(Number(parsed.projectedSales30d)) || totalUnits30d,
          reasoning: parsed.reasoning || "Prediction based on linear price elasticity."
        }
      }
    }
  } catch (error) {
    console.warn("[AI] Prediction failed:", error)
  }

  // Fallback if LLM fails
  const priceRatio = product.currentPrice / simulatedPrice
  return {
    projectedRank: Math.round(medianRank / priceRatio),
    projectedSales30d: Math.round(totalUnits30d * priceRatio),
    reasoning: "Fallback linear prediction model used due to AI service unavailability."
  }
}

export interface AIDayStrategyPrediction {
  proposedPrice: number
  projectedRank: number
  projectedSales30d: number
  reasoning: string
}

/**
 * Predict the optimal price and its impact for a specific day of the week,
 * based on the algorithmic strategy engine's recommendation for that day.
 */
export async function predictDayStrategyWithGLM(
  product: any,
  dayName: string,
  strategy: string,
  dailySales: any[],
  recentKeepaHistory: any[]
): Promise<AIDayStrategyPrediction> {
  const rawApiKey = process.env.OPENAI_API_KEY || ""
  const apiKey = rawApiKey.replace(/\s+/g, "")
  const cloudModel = process.env.OPENAI_MODEL || "gpt-4o-mini"
  const ollamaBaseUrl = process.env.OLLAMA_BASE_URL
  const ollamaModel = process.env.OLLAMA_MODEL || "glm4"

  const totalUnits30d = dailySales.reduce((sum, d) => sum + d.unitsOrdered, 0)
  
  let medianRank = 0
  if (recentKeepaHistory.length > 0) {
    const ranks = recentKeepaHistory.map(h => h.salesRank).filter(r => r > 0).sort((a, b) => a - b)
    medianRank = ranks[Math.floor(ranks.length / 2)] || 0
  }

  const systemPrompt = `You are an elite Amazon Marketplace Pricing Strategist and A9 Sales Rank data scientist.
Your task is to calculate the optimal exact price (in cents) for a specific day of the week based on an algorithmic strategy goal.
You will be provided with the current performance (30-day sales volume, current price, median sales rank) and the strategy for the day.

RULES:
1. "Defensive Hold" or "Margin Harvest Sync": Price should generally stay the same or rise slightly (max $0.15).
2. "Start-of-Week Harvest": Price should rise slightly to capture premium margins (max $0.15).
3. "Momentum Preparation" or "Micro Discount": Price should drop slightly (max $0.15) to boost velocity.
4. Output MUST be valid JSON.`

  const userPrompt = `Predict the optimal price and impact for this Amazon product on a specific day.
Product: "${product.productName || product.sku}"
Current Price: $${product.currentPrice.toFixed(2)}
Floor Price: $${product.minPrice?.toFixed(2) || "N/A"}
Ceiling Price: $${product.maxPrice?.toFixed(2) || "N/A"}
Target Day: ${dayName}
Recommended Strategy: "${strategy}"

Past 30 Days Performance:
- Total Units Sold: ${totalUnits30d}
- Median Sales Rank: #${medianRank.toLocaleString()}

Calculate the EXACT proposed price, projected 30-day sales volume, and projected sales rank if this day strategy is executed.

Respond with ONLY a valid JSON object matching this schema:
{
  "proposedPrice": number (the exact recommended price, e.g. 19.99),
  "projectedRank": number (the projected sales rank, e.g. 15000),
  "projectedSales30d": number (the projected total units sold in a 30-day period, e.g. 120),
  "reasoning": string (1-2 sentences explaining why this price fits the ${strategy} strategy for ${dayName})
}`

  try {
    const llm = await callLLM(systemPrompt, userPrompt, {
      ollamaBaseUrl, ollamaModel, cloudApiKey: apiKey, cloudModel,
    })

    if (llm && llm.content) {
      const jsonMatch = llm.content.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        const rawProposed = Number(parsed.proposedPrice) || product.currentPrice
        const clamped = clampToCentsBand(product.currentPrice, rawProposed, product.minPrice || 0, product.maxPrice || 9999)
        return {
          proposedPrice: clamped.price,
          projectedRank: Math.round(Number(parsed.projectedRank)) || medianRank,
          projectedSales30d: Math.round(Number(parsed.projectedSales30d)) || totalUnits30d,
          reasoning: parsed.reasoning || `Aligned with ${strategy} for ${dayName}.`
        }
      }
    }
  } catch (error) {
    console.warn("[AI] Day prediction failed:", error)
  }

  // Fallback
  return {
    proposedPrice: product.currentPrice,
    projectedRank: medianRank,
    projectedSales30d: totalUnits30d,
    reasoning: "Fallback used. Maintain current price."
  }
}
