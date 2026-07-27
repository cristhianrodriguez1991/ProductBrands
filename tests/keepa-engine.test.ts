import { describe, it, expect } from "vitest"
import { calculateRankTrend } from "../lib/keepa/analytics/rank-trend"
import { evaluateKeepaPricingIntelligence } from "../lib/keepa/analytics/engine"

describe("Keepa Sales Rank Direction Logic (CRITICAL RULE)", () => {
  const now = Date.now()
  it("enforces that decreasing numerical Sales Rank represents improvement", () => {
    // 10,000 -> 5,000 is an IMPROVEMENT in Sales Rank (better visibility, higher sales velocity)
    const seriesImproving: any[] = [
      { timestamp: new Date(now - 4 * 24 * 3600 * 1000), salesRank: 10000, buyBox: 19.99, newOffers: 3 },
      { timestamp: new Date(now - 3 * 24 * 3600 * 1000), salesRank: 8500, buyBox: 19.99, newOffers: 3 },
      { timestamp: new Date(now - 2 * 24 * 3600 * 1000), salesRank: 6500, buyBox: 19.99, newOffers: 3 },
      { timestamp: new Date(now - 1 * 24 * 3600 * 1000), salesRank: 5000, buyBox: 19.99, newOffers: 3 },
    ]

    const result = calculateRankTrend(seriesImproving, 2000, 7000, 10000)
    expect(result.trend).toBe("improving")
    expect(result.currentRank).toBe(5000)
  })

  it("enforces that increasing numerical Sales Rank represents deterioration", () => {
    // 5,000 -> 10,000 is WORSENING in Sales Rank (lost rank, dropping demand)
    const seriesWorsening: any[] = [
      { timestamp: new Date(now - 4 * 24 * 3600 * 1000), salesRank: 5000, buyBox: 19.99, newOffers: 3 },
      { timestamp: new Date(now - 3 * 24 * 3600 * 1000), salesRank: 7000, buyBox: 19.99, newOffers: 3 },
      { timestamp: new Date(now - 2 * 24 * 3600 * 1000), salesRank: 9000, buyBox: 19.99, newOffers: 3 },
      { timestamp: new Date(now - 1 * 24 * 3600 * 1000), salesRank: 11000, buyBox: 19.99, newOffers: 3 },
    ]

    const result = calculateRankTrend(seriesWorsening, 2000, 7000, 10000)
    expect(result.trend).toBe("worsening")
    expect(result.currentRank).toBe(11000)
  })
})

describe("Pricing Engine & Candidate Evaluation", () => {
  const now = Date.now()
  it("never changes price without explicit seller approval (recommendedAction returned, no auto-apply)", () => {
    const productInput: any = {
      currentPrice: 20.00,
      unitCost: 10.00,
      fulfillmentMethod: "FBA",
      minPrice: 15.00,
      maxPrice: 25.00,
      minMarginPercent: 15,
      referralFeePercent: 15,
      fbaFee: 3.50,
      targetRankMin: 1500,
      targetRankMax: 3000,
      warningRank: 5000,
      criticalRank: 8000,
      defaultAdjustmentSize: 0.10,
      maxAdjustmentSize: 0.50,
      cooldownHours: 24,
      lastAnalyzedAt: null,
      observations: [
        { timestamp: new Date(now - 4 * 24 * 3600 * 1000), salesRank: 5000, buyBox: 20.00 },
        { timestamp: new Date(now - 3 * 24 * 3600 * 1000), salesRank: 6000, buyBox: 20.00 },
        { timestamp: new Date(now - 2 * 24 * 3600 * 1000), salesRank: 7500, buyBox: 20.00 },
        { timestamp: new Date(now - 1 * 24 * 3600 * 1000), salesRank: 8000, buyBox: 20.00 },
      ],
    }

    const evaluation = evaluateKeepaPricingIntelligence(productInput)

    expect(evaluation.action).toBe("LOWER")
    expect(evaluation.recommendedPrice).toBeLessThan(20.00)
    expect(evaluation.recommendedPrice).toBeGreaterThanOrEqual(15.00)
    expect(evaluation.confidence).toBeGreaterThan(0)
  })
})

describe("Lag-Aware Weekday Engine & AI Momentum Analysis (Ollama GLM-5.2)", () => {
  it("detects when Saturday starts with good rank from Friday momentum but deteriorates by night (Delta-Rank lag effect)", async () => {
    const { analyzeWeekdayBehavior } = await import("../lib/keepa/analytics/weekday-engine")
    const now = new Date("2026-07-25T12:00:00Z") // Saturday
    const obs: any[] = []

    // Create 10 weeks of Saturday observations where morning rank is #18,000 (Friday momentum) and night rank is #23,000
    for (let w = 0; w < 10; w++) {
      const satMorning = new Date(2026, 5, 6 + w * 7, 3, 0, 0) // Saturday 3 AM
      const satNight = new Date(2026, 5, 6 + w * 7, 21, 0, 0) // Saturday 9 PM
      obs.push({ timestamp: satMorning, salesRank: 18000, buyBoxPrice: 28.68, isAvailable: true })
      obs.push({ timestamp: satNight, salesRank: 23000, buyBoxPrice: 28.68, isAvailable: true })
    }

    const result = analyzeWeekdayBehavior(obs)
    const satProfile = result.profiles.find((p) => p.dayName === "Saturday")
    expect(satProfile).toBeDefined()
    expect(satProfile?.intraDayRankDelta).toBeGreaterThan(0) // Worsened across the day
    expect(satProfile?.isLagAffected).toBe(true)
  })

  it("analyzes pricing with GLM-5.2 / deep reasoning engine and outputs weekend lag diagnosis", async () => {
    const { analyzePricingWithGLM } = await import("../lib/ai/pricing-analyzer")
    const mockProduct: any = {
      id: "test-1",
      sku: "Y5-RYHV-Z8SR",
      asin: "B0DSJT1NP4",
      productName: "Office Roast Variety Pack",
      currentPrice: 28.68,
      unitCost: 14.00,
      minPrice: 20.00,
      maxPrice: 35.00,
      fulfillmentMethod: "FBA",
      buyBoxWinRate: 88,
    }
    const mockDailySales: any[] = [
      { date: "2026-07-27", unitsOrdered: 30, orderedProductSales: 860, avgSellingPrice: 28.68, dayOfWeek: "Monday", isWeekend: false },
      { date: "2026-07-26", unitsOrdered: 1, orderedProductSales: 28.68, avgSellingPrice: 28.68, dayOfWeek: "Sunday", isWeekend: true },
      { date: "2026-07-25", unitsOrdered: 2, orderedProductSales: 57.36, avgSellingPrice: 28.68, dayOfWeek: "Saturday", isWeekend: true },
    ]
    const mockProfiles: any[] = [
      { dayName: "Saturday", medianRank: 18500, relativePerformancePercent: -10, intraDayRankDelta: 4500, isLagAffected: true },
      { dayName: "Monday", medianRank: 23500, relativePerformancePercent: 12, intraDayRankDelta: -3000, isLagAffected: false },
    ]

    const assessment = await analyzePricingWithGLM(mockProduct, mockDailySales, mockProfiles)
    expect(assessment.modelUsed).toContain("Ollama GLM-5.2")
    expect(assessment.confidenceScore).toBeGreaterThanOrEqual(80)
    expect(assessment.detectedLagEffect).toContain("Arrastre")
    expect(assessment.keyTakeaways.length).toBeGreaterThan(0)
  })
})
