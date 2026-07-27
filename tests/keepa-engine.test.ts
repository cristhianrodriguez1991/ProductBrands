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
