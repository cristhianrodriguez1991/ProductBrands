import { KeepaObservation } from "../types"
import { calculateRankTrend, RankTrendAnalysis, isRankImproving, isRankWorsening } from "./rank-trend"
import { analyzeWeekdayBehavior, WeekdayProfile } from "./weekday-engine"

export interface RecommendationInput {
  currentPrice: number
  unitCost: number
  fulfillmentMethod: "FBA" | "FBM"
  minPrice: number
  maxPrice: number
  minMarginPercent: number
  referralFeePercent: number
  fbaFee: number
  targetRankMin?: number
  targetRankMax?: number
  warningRank?: number
  criticalRank?: number
  defaultAdjustmentSize?: number
  maxAdjustmentSize?: number
  cooldownHours?: number
  lastAnalyzedAt?: Date | null
  observations: KeepaObservation[]
}

export interface CandidateEvaluation {
  candidatePrice: number
  priceDifference: number
  grossProfit: number
  netMarginPercent: number
  isSafe: boolean
  rejectionReason?: string
  score: number
  expectedEffect: string
}

export interface KeepaRecommendationResult {
  action: "RAISE" | "LOWER" | "MAINTAIN" | "WAIT" | "INVESTIGATE"
  recommendedPrice: number
  priceDifference: number
  confidence: number // 0 to 100
  reason: string
  expectedObjective: string
  risk: string
  trendAnalysis: RankTrendAnalysis
  weekdayProfile?: WeekdayProfile
  evaluatedCandidates: CandidateEvaluation[]
  isCooldownActive: boolean
}

/**
 * Target Rank Control Feedback System
 * Evaluates raw historical Keepa data, calculates sustained rank trends and weekday effects,
 * tests multiple price candidates against safety guardrails, and outputs an actionable recommendation.
 */
export function evaluateKeepaPricingIntelligence(input: RecommendationInput): KeepaRecommendationResult {
  const targetMin = input.targetRankMin ?? 1500
  const targetMax = input.targetRankMax ?? 3000
  const warningRank = input.warningRank ?? 4000
  const criticalRank = input.criticalRank ?? 6000
  const defaultAdj = input.defaultAdjustmentSize ?? 0.10
  const maxAdj = input.maxAdjustmentSize ?? 0.50
  const cooldownHours = input.cooldownHours ?? 24

  // Check cooldown
  let isCooldownActive = false
  if (input.lastAnalyzedAt) {
    const elapsedHours = (new Date().getTime() - input.lastAnalyzedAt.getTime()) / (3600 * 1000)
    if (elapsedHours < cooldownHours) {
      isCooldownActive = true
    }
  }

  // Run rank trend analysis
  const trendAnalysis = calculateRankTrend(input.observations, targetMin, targetMax, warningRank)

  // Run weekday analysis for the current day of week
  const todayDayNum = new Date().getDay()
  const weekdayData = analyzeWeekdayBehavior(input.observations)
  const weekdayProfile = weekdayData.profiles.find((p) => p.dayNumber === todayDayNum)

  const currentPrice = input.currentPrice
  const cost = input.unitCost
  const fbaFee = input.fbaFee
  const referralPct = input.referralFeePercent

  // Helper to calculate margin
  const calcMargin = (p: number) => {
    const refFee = (p * referralPct) / 100
    const profit = p - cost - refFee - fbaFee
    const margin = p > 0 ? (profit / p) * 100 : 0
    return { grossProfit: Math.round(profit * 100) / 100, netMarginPercent: Math.round(margin * 10) / 10 }
  }

  const currentEcon = calcMargin(currentPrice)

  // Determine base confidence (0 to 100)
  let confidence = 75
  const validObsCount = input.observations.filter((o) => o.salesRank && o.salesRank > 0).length
  if (validObsCount < 10) confidence -= 35
  else if (validObsCount < 30) confidence -= 15
  if (trendAnalysis.volatilityPercent > 40) confidence -= 15
  if (weekdayProfile && !weekdayProfile.hasEnoughData) confidence -= 10
  if (isCooldownActive) confidence -= 20
  confidence = Math.max(15, Math.min(99, confidence))

  // Generate candidate prices
  const candidateDeltas = [
    -Math.min(maxAdj, defaultAdj * 2.5),
    -Math.min(maxAdj, defaultAdj * 2.0),
    -Math.min(maxAdj, defaultAdj * 1.5),
    -defaultAdj,
    0,
    defaultAdj,
    Math.min(maxAdj, defaultAdj * 1.5),
    Math.min(maxAdj, defaultAdj * 2.0),
  ]

  const uniquePrices = Array.from(new Set(candidateDeltas.map((d) => Math.round((currentPrice + d) * 100) / 100))).sort((a, b) => a - b)
  const candidates: CandidateEvaluation[] = []

  for (const candPrice of uniquePrices) {
    const diff = Math.round((candPrice - currentPrice) * 100) / 100
    const econ = calcMargin(candPrice)
    let isSafe = true
    let rejectionReason: string | undefined

    if (candPrice < input.minPrice) {
      isSafe = false
      rejectionReason = `Violates minimum floor price ($${input.minPrice.toFixed(2)})`
    } else if (candPrice > input.maxPrice) {
      isSafe = false
      rejectionReason = `Exceeds maximum ceiling price ($${input.maxPrice.toFixed(2)})`
    } else if (econ.netMarginPercent < input.minMarginPercent) {
      isSafe = false
      rejectionReason = `Net profit margin (${econ.netMarginPercent}%) is below minimum target (${input.minMarginPercent}%)`
    } else if (Math.abs(diff) > maxAdj + 0.001) {
      isSafe = false
      rejectionReason = `Price adjustment ($${Math.abs(diff).toFixed(2)}) exceeds maximum allowed step ($${maxAdj.toFixed(2)})`
    }

    // Score candidate based on feedback system rules
    let score = 50
    let expectedEffect = "Maintain current positioning and sales velocity."

    if (!isSafe) {
      score = 0
    } else if (diff === 0) {
      if (trendAnalysis.ewmaRank >= targetMin && trendAnalysis.ewmaRank <= targetMax) {
        score = 95
        expectedEffect = `Maintain product securely inside target corridor (${targetMin.toLocaleString()}–${targetMax.toLocaleString()}).`
      } else if (trendAnalysis.ewmaRank < targetMin) {
        score = 70
        expectedEffect = "Rank is stronger than target corridor; maintaining captures high velocity."
      } else {
        score = 60
        expectedEffect = "Maintain price while observing rank trend."
      }
    } else if (diff < 0) {
      // Price reduction candidate
      if (trendAnalysis.ewmaRank > warningRank || trendAnalysis.trend === "worsening") {
        // Reduction is beneficial when rank is worsening or above warning
        score = 80 + Math.min(15, Math.round(Math.abs(diff) / defaultAdj) * 5)
        expectedEffect = `Stimulate sales velocity to improve Sales Rank toward target corridor (${targetMin.toLocaleString()}–${targetMax.toLocaleString()}).`
      } else if (trendAnalysis.ewmaRank >= targetMin && trendAnalysis.ewmaRank <= targetMax) {
        // Unnecessary reduction inside corridor! Penalize heavily!
        score = 25
        expectedEffect = "WARNING: Unnecessary price reduction while rank is already inside target corridor; sacrifices profit."
      } else if (trendAnalysis.ewmaRank < targetMin) {
        score = 10
        expectedEffect = "CRITICAL: Do not lower price when Sales Rank is already outperforming target range."
      }
    } else if (diff > 0) {
      // Price increase candidate
      if (trendAnalysis.ewmaRank < targetMin && trendAnalysis.trend !== "worsening") {
        // We have excess ranking strength! Increase price to harvest profit!
        score = 85 + Math.min(10, Math.round(diff / defaultAdj) * 4)
        expectedEffect = `Capture higher unit profit ($${econ.grossProfit.toFixed(2)}/unit) while Sales Rank is outperforming target corridor.`
      } else if (currentEcon.netMarginPercent < input.minMarginPercent) {
        // Forced increase to restore profitability
        score = 90
        expectedEffect = `Restore required minimum net profit margin (${input.minMarginPercent}%).`
      } else if (trendAnalysis.ewmaRank > warningRank) {
        // Increasing price when rank is already failing!
        score = 15
        expectedEffect = "WARNING: Increasing price while Sales Rank is weak may further suppress sales velocity."
      } else {
        score = 45
        expectedEffect = "Test price elasticity and margin enhancement."
      }
    }

    // Apply weekday modifier
    if (isSafe && weekdayProfile && weekdayProfile.hasEnoughData) {
      if (weekdayProfile.recommendedStrategy === "Consider small reduction" && diff < 0) score += 8
      if (weekdayProfile.recommendedStrategy === "Protect margin" && diff > 0) score += 8
    }

    candidates.push({
      candidatePrice: candPrice,
      priceDifference: diff,
      grossProfit: econ.grossProfit,
      netMarginPercent: econ.netMarginPercent,
      isSafe,
      rejectionReason,
      score,
      expectedEffect,
    })
  }

  // Select best candidate
  const safeCandidates = candidates.filter((c) => c.isSafe)
  let bestCandidate = candidates.find((c) => c.priceDifference === 0) || candidates[0]
  if (safeCandidates.length > 0) {
    bestCandidate = [...safeCandidates].sort((a, b) => b.score - a.score)[0]
  }

  // Determine final action & qualitative feedback
  const smoothedRank = trendAnalysis.ewmaRank || trendAnalysis.currentRank || 3000
  let action: KeepaRecommendationResult["action"] = "MAINTAIN"
  let reason = `Sales Rank (${smoothedRank.toLocaleString()}) is healthy and positioned inside target corridor (${targetMin.toLocaleString()}–${targetMax.toLocaleString()}).`
  let objective = "Maintain current pricing and protect profit margins."
  let risk = "Minimal risk to sales velocity or ranking."

  if (isCooldownActive) {
    action = "WAIT"
    bestCandidate = candidates.find((c) => c.priceDifference === 0) || bestCandidate
    reason = `Cooldown period active (${cooldownHours}h required after previous analysis). Waiting for rank stabilization before recommending adjustments.`
    objective = "Observe customer demand and rank response from previous actions."
    risk = "None. Price remains unchanged."
  } else if (currentPrice < input.minPrice) {
    action = "RAISE"
    const targetPrice = input.minPrice
    bestCandidate = candidates.find((c) => c.candidatePrice === targetPrice) || {
      candidatePrice: targetPrice,
      priceDifference: targetPrice - currentPrice,
      grossProfit: calcMargin(targetPrice).grossProfit,
      netMarginPercent: calcMargin(targetPrice).netMarginPercent,
      isSafe: true,
      score: 99,
      expectedEffect: "Enforce floor price guardrail.",
    }
    reason = `CRITICAL: Current price ($${currentPrice.toFixed(2)}) is below your acceptable floor price ($${input.minPrice.toFixed(2)}). Immediate raise required.`
    objective = "Restore price to minimum safe floor level."
    risk = "May cause a minor temporary numerical increase in Sales Rank."
  } else if (currentEcon.netMarginPercent < input.minMarginPercent) {
    action = "RAISE"
    reason = `Current net profit margin (${currentEcon.netMarginPercent}%) is below your desired minimum target (${input.minMarginPercent}%).`
    objective = `Raise price by $${bestCandidate.priceDifference.toFixed(2)} to restore profitability to ${bestCandidate.netMarginPercent}%.`
    risk = "Higher price may slightly slow daily unit sales."
  } else if (smoothedRank > warningRank) {
    // Rank is weak or worsening!
    if (currentPrice <= input.minPrice + 0.01) {
      action = "INVESTIGATE"
      bestCandidate = candidates.find((c) => c.priceDifference === 0) || bestCandidate
      reason = `Sales Rank (${smoothedRank.toLocaleString()}) is worsening above warning threshold (${warningRank.toLocaleString()}), but price ($${currentPrice.toFixed(2)}) is already at your minimum floor ($${input.minPrice.toFixed(2)}). Cannot reduce price further without sacrificing profitability.`
      objective = "Investigate external competition, Buy Box loss, inventory stockouts, listing SEO, or advertising campaigns instead of lowering price."
      risk = "Price reduction is blocked by floor guardrail to prevent unprofitable race to the bottom."
    } else if (bestCandidate.priceDifference < 0) {
      action = "LOWER"
      const dayNote = weekdayProfile && weekdayProfile.hasEnoughData && weekdayProfile.relativePerformancePercent > 10 ? ` Furthermore, ${weekdayProfile.dayName}s historically underperform by ${weekdayProfile.relativePerformancePercent}%.` : ""
      reason = `Sales Rank (${smoothedRank.toLocaleString()}) is above warning corridor (${warningRank.toLocaleString()}) with a ${trendAnalysis.trend} trend.${dayNote}`
      objective = `Gradually reduce price by $${Math.abs(bestCandidate.priceDifference).toFixed(2)} to stimulate sales velocity while maintaining a safe ${bestCandidate.netMarginPercent}% profit margin.`
      risk = `Profit per unit decreases by $${Math.abs(bestCandidate.priceDifference).toFixed(2)}, and rank improvement is not guaranteed.`
    }
  } else if (smoothedRank < targetMin && trendAnalysis.trend !== "worsening") {
    // Rank is outperforming target corridor!
    if (bestCandidate.priceDifference > 0) {
      action = "RAISE"
      reason = `Sales Rank (${smoothedRank.toLocaleString()}) is strongly outperforming your target corridor (${targetMin.toLocaleString()}–${targetMax.toLocaleString()}) with high customer demand.`
      objective = `Capture more profit by raising price by $${bestCandidate.priceDifference.toFixed(2)} ($${bestCandidate.grossProfit.toFixed(2)}/unit profit).`
      risk = "Small risk of rank moving back toward the middle of your target corridor."
    }
  }

  return {
    action,
    recommendedPrice: bestCandidate.candidatePrice,
    priceDifference: bestCandidate.priceDifference,
    confidence,
    reason,
    expectedObjective: objective,
    risk,
    trendAnalysis,
    weekdayProfile,
    evaluatedCandidates: candidates,
    isCooldownActive,
  }
}
