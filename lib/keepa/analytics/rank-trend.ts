import { KeepaObservation } from "../types"

/**
 * Amazon Sales Rank Direction Rule:
 * A lower numerical rank is generally better.
 * Moving from 10,000 to 5,000 represents improvement (returns true).
 */
export function isRankImproving(previousRank: number | null | undefined, currentRank: number | null | undefined): boolean {
  if (!previousRank || !currentRank || previousRank <= 0 || currentRank <= 0) return false
  return currentRank < previousRank
}

/**
 * Amazon Sales Rank Direction Rule:
 * A higher numerical rank is generally worse.
 * Moving from 5,000 to 10,000 represents deterioration (returns true).
 */
export function isRankWorsening(previousRank: number | null | undefined, currentRank: number | null | undefined): boolean {
  if (!previousRank || !currentRank || previousRank <= 0 || currentRank <= 0) return false
  return currentRank > previousRank
}

/**
 * Calculate the percentage change in rank.
 * Example: 10,000 to 5,000 returns -50% (50% numerical drop, which is a 50% ranking improvement).
 */
export function calculateRankChangePercentage(previousRank: number | null | undefined, currentRank: number | null | undefined): number {
  if (!previousRank || !currentRank || previousRank <= 0) return 0
  return Math.round(((currentRank - previousRank) / previousRank) * 1000) / 10
}

/**
 * Calculate the median of an array of numbers. Robust against outliers.
 */
export function calculateMedian(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 !== 0 ? sorted[mid] : Math.round(((sorted[mid - 1] + sorted[mid]) / 2) * 10) / 10
}

/**
 * Calculate Exponentially Weighted Moving Average (EWMA) of ranks.
 */
export function calculateEwma(values: number[], alpha = 0.25): number {
  if (values.length === 0) return 0
  let ewma = values[0]
  for (let i = 1; i < values.length; i++) {
    ewma = alpha * values[i] + (1 - alpha) * ewma
  }
  return Math.round(ewma)
}

export interface RankTrendAnalysis {
  currentRank: number
  median24h: number
  median3d: number
  median7d: number
  median14d: number
  median30d: number
  ewmaRank: number
  rankSlopePerDay: number
  volatilityPercent: number
  percentInCorridor: number
  percentAboveWarning: number
  percentBelowCorridor: number
  trend: "improving" | "worsening" | "stable" | "volatile"
}

/**
 * Analyze sustained sales rank trend over historical observations.
 */
export function calculateRankTrend(
  observations: KeepaObservation[],
  targetMin = 1500,
  targetMax = 3000,
  warningRank = 4000
): RankTrendAnalysis {
  const validObs = observations.filter((o) => o.salesRank && o.salesRank > 0 && o.isAvailable !== false)
  if (validObs.length === 0) {
    return {
      currentRank: 0,
      median24h: 0,
      median3d: 0,
      median7d: 0,
      median14d: 0,
      median30d: 0,
      ewmaRank: 0,
      rankSlopePerDay: 0,
      volatilityPercent: 0,
      percentInCorridor: 0,
      percentAboveWarning: 0,
      percentBelowCorridor: 0,
      trend: "stable",
    }
  }

  const now = new Date()
  const ranks = validObs.map((o) => o.salesRank!)
  const currentRank = ranks[ranks.length - 1]

  const obs24h = validObs.filter((o) => (now.getTime() - o.timestamp.getTime()) <= 24 * 3600 * 1000)
  const obs3d = validObs.filter((o) => (now.getTime() - o.timestamp.getTime()) <= 3 * 24 * 3600 * 1000)
  const obs7d = validObs.filter((o) => (now.getTime() - o.timestamp.getTime()) <= 7 * 24 * 3600 * 1000)
  const obs14d = validObs.filter((o) => (now.getTime() - o.timestamp.getTime()) <= 14 * 24 * 3600 * 1000)
  const obs30d = validObs.filter((o) => (now.getTime() - o.timestamp.getTime()) <= 30 * 24 * 3600 * 1000)

  const median24h = calculateMedian(obs24h.map((o) => o.salesRank!)) || currentRank
  const median3d = calculateMedian(obs3d.map((o) => o.salesRank!)) || median24h
  const median7d = calculateMedian(obs7d.map((o) => o.salesRank!)) || median3d
  const median14d = calculateMedian(obs14d.map((o) => o.salesRank!)) || median7d
  const median30d = calculateMedian(obs30d.map((o) => o.salesRank!)) || median14d
  const ewmaRank = calculateEwma(ranks)

  // Calculate linear slope over 7 days (change in rank per day)
  let rankSlopePerDay = 0
  if (obs7d.length >= 2) {
    const first = obs7d[0]
    const last = obs7d[obs7d.length - 1]
    const daysDiff = (last.timestamp.getTime() - first.timestamp.getTime()) / (24 * 3600 * 1000)
    if (daysDiff > 0.1) {
      rankSlopePerDay = Math.round((last.salesRank! - first.salesRank!) / daysDiff)
    }
  }

  // Calculate volatility (standard deviation / median)
  const mean = ranks.reduce((a, b) => a + b, 0) / ranks.length
  const variance = ranks.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / ranks.length
  const stdDev = Math.sqrt(variance)
  const volatilityPercent = median7d > 0 ? Math.round((stdDev / median7d) * 100) : 0

  // Corridor percentages
  let inCorridorCount = 0
  let aboveWarningCount = 0
  let belowCorridorCount = 0
  for (const r of ranks) {
    if (r >= targetMin && r <= targetMax) inCorridorCount++
    if (r > warningRank) aboveWarningCount++
    if (r < targetMin) belowCorridorCount++
  }

  const percentInCorridor = Math.round((inCorridorCount / ranks.length) * 100)
  const percentAboveWarning = Math.round((aboveWarningCount / ranks.length) * 100)
  const percentBelowCorridor = Math.round((belowCorridorCount / ranks.length) * 100)

  // Determine qualitative trend
  let trend: "improving" | "worsening" | "stable" | "volatile" = "stable"
  if (volatilityPercent > 45) {
    trend = "volatile"
  } else if (isRankImproving(median7d, currentRank) && rankSlopePerDay < -50) {
    trend = "improving"
  } else if (isRankWorsening(median7d, currentRank) && rankSlopePerDay > 50) {
    trend = "worsening"
  }

  return {
    currentRank,
    median24h,
    median3d,
    median7d,
    median14d,
    median30d,
    ewmaRank,
    rankSlopePerDay,
    volatilityPercent,
    percentInCorridor,
    percentAboveWarning,
    percentBelowCorridor,
    trend,
  }
}
