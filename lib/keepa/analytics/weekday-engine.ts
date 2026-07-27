import { KeepaObservation } from "../types"
import { calculateMedian } from "./rank-trend"

export interface WeekdayProfile {
  dayNumber: number // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  dayName: string
  sampleWeeks: number
  hasEnoughData: boolean
  warningMessage?: string
  medianRank: number
  averageRank: number
  medianBuyBoxPrice: number
  rankVolatilityPercent: number
  rankImprovementFreq: number // percentage 0-100
  rankDeteriorationFreq: number // percentage 0-100
  relativePerformancePercent: number // negative = better than weekly average, positive = worse (e.g. +18% worse on Saturday)
  recommendedStrategy: "Maintain" | "Consider small reduction" | "Protect margin" | "Test small increase" | "Reevaluate" | "Insufficient data"
}

export interface WeekdayHeatmapCell {
  dayNumber: number
  dayName: string
  timeBlock: string // "00:00-06:00" | "06:00-12:00" | "12:00-18:00" | "18:00-24:00"
  medianRank: number
  medianBuyBox: number
  offerCount: number
}

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

/**
 * Analyze day-of-week behavior for a specific product from its raw Keepa time-series history.
 */
export function analyzeWeekdayBehavior(observations: KeepaObservation[]): {
  profiles: WeekdayProfile[]
  heatmap: WeekdayHeatmapCell[]
  overallMedianRank: number
} {
  // Filter out distorted data (promotions, stockouts, excluded periods)
  const validObs = observations.filter(
    (o) => o.salesRank && o.salesRank > 0 && o.isAvailable !== false && !(o as any).isExcluded
  )

  const overallRanks = validObs.map((o) => o.salesRank!)
  const overallMedianRank = calculateMedian(overallRanks) || 3000

  // Group by day of week
  const dayGroups = new Map<number, KeepaObservation[]>()
  for (let i = 0; i < 7; i++) dayGroups.set(i, [])

  const weeksPerDay = new Map<number, Set<string>>()
  for (let i = 0; i < 7; i++) weeksPerDay.set(i, new Set())

  for (const obs of validObs) {
    const day = obs.timestamp.getDay()
    dayGroups.get(day)!.push(obs)

    // Calculate ISO week identifier (e.g. "2026-W30") to count distinct weeks
    const year = obs.timestamp.getFullYear()
    const weekNum = Math.ceil((obs.timestamp.getTime() - new Date(year, 0, 1).getTime()) / (7 * 24 * 3600 * 1000))
    weeksPerDay.get(day)!.add(`${year}-W${weekNum}`)
  }

  const profiles: WeekdayProfile[] = []

  for (let day = 0; day < 7; day++) {
    const dayObs = dayGroups.get(day)!
    const sampleWeeks = weeksPerDay.get(day)!.size
    const dayName = DAY_NAMES[day]

    if (dayObs.length === 0) {
      profiles.push({
        dayNumber: day,
        dayName,
        sampleWeeks: 0,
        hasEnoughData: false,
        warningMessage: `There is not enough historical data to conclude that this product performs differently on ${dayName}s.`,
        medianRank: 0,
        averageRank: 0,
        medianBuyBoxPrice: 0,
        rankVolatilityPercent: 0,
        rankImprovementFreq: 0,
        rankDeteriorationFreq: 0,
        relativePerformancePercent: 0,
        recommendedStrategy: "Insufficient data",
      })
      continue
    }

    const ranks = dayObs.map((o) => o.salesRank!)
    const prices = dayObs.map((o) => o.buyBoxPrice || o.amazonPrice || 0).filter((p) => p > 0)
    const medianRank = calculateMedian(ranks)
    const averageRank = Math.round(ranks.reduce((a, b) => a + b, 0) / ranks.length)
    const medianBuyBoxPrice = calculateMedian(prices) || 0

    // Volatility
    const variance = ranks.reduce((a, b) => a + Math.pow(b - averageRank, 2), 0) / ranks.length
    const stdDev = Math.sqrt(variance)
    const rankVolatilityPercent = medianRank > 0 ? Math.round((stdDev / medianRank) * 100) : 0

    // Improvement / Deterioration frequency compared to overall median
    let impCount = 0
    let detCount = 0
    for (const r of ranks) {
      if (r < overallMedianRank) impCount++
      else if (r > overallMedianRank) detCount++
    }
    const rankImprovementFreq = Math.round((impCount / ranks.length) * 100)
    const rankDeteriorationFreq = Math.round((detCount / ranks.length) * 100)

    // Relative performance: positive % means worse (higher rank), negative % means better (lower rank)
    const relativePerformancePercent =
      overallMedianRank > 0 ? Math.round(((medianRank - overallMedianRank) / overallMedianRank) * 1000) / 10 : 0

    const hasEnoughData = sampleWeeks >= 8
    let warningMessage: string | undefined
    let recommendedStrategy: WeekdayProfile["recommendedStrategy"] = "Maintain"

    if (!hasEnoughData) {
      warningMessage = `There is not enough historical data to conclude that this product performs differently on ${dayName}s (only ${sampleWeeks} weeks available; minimum 8 required).`
      recommendedStrategy = "Insufficient data"
    } else {
      if (relativePerformancePercent > 15) {
        // e.g., 18% worse rank on Saturday -> Consider small reduction
        recommendedStrategy = "Consider small reduction"
      } else if (relativePerformancePercent < -15) {
        // e.g., 18% better rank on Friday -> Protect margin
        recommendedStrategy = "Protect margin"
      } else if (rankImprovementFreq > 65) {
        recommendedStrategy = "Test small increase"
      } else if (rankDeteriorationFreq > 65) {
        recommendedStrategy = "Reevaluate"
      }
    }

    profiles.push({
      dayNumber: day,
      dayName,
      sampleWeeks,
      hasEnoughData,
      warningMessage,
      medianRank,
      averageRank,
      medianBuyBoxPrice,
      rankVolatilityPercent,
      rankImprovementFreq,
      rankDeteriorationFreq,
      relativePerformancePercent,
      recommendedStrategy,
    })
  }

  // Generate Weekday Heatmap (7 days x 4 time blocks)
  const timeBlocks = [
    { name: "00:00-06:00", start: 0, end: 6 },
    { name: "06:00-12:00", start: 6, end: 12 },
    { name: "12:00-18:00", start: 12, end: 18 },
    { name: "18:00-24:00", start: 18, end: 24 },
  ]

  const heatmap: WeekdayHeatmapCell[] = []
  for (let day = 0; day < 7; day++) {
    const dayObs = dayGroups.get(day)!
    for (const tb of timeBlocks) {
      const blockObs = dayObs.filter((o) => {
        const h = o.timestamp.getHours()
        return h >= tb.start && h < tb.end
      })
      const bRanks = blockObs.map((o) => o.salesRank!).filter((r) => r > 0)
      const bPrices = blockObs.map((o) => o.buyBoxPrice || 0).filter((p) => p > 0)
      const bCounts = blockObs.map((o) => o.offerCount || 3)

      heatmap.push({
        dayNumber: day,
        dayName: DAY_NAMES[day],
        timeBlock: tb.name,
        medianRank: calculateMedian(bRanks) || profiles[day]?.medianRank || overallMedianRank,
        medianBuyBox: calculateMedian(bPrices) || profiles[day]?.medianBuyBoxPrice || 0,
        offerCount: Math.round(calculateMedian(bCounts)) || 3,
      })
    }
  }

  return { profiles, heatmap, overallMedianRank }
}
