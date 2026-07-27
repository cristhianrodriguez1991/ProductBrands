import { prisma } from "@/lib/prisma"
import {
  KeepaDataProvider,
  KeepaProductRequest,
  KeepaProductHistoryResponse,
  KeepaCurrentData,
  KeepaTokenStatus,
  KeepaObservation,
  KEEPA_CSV_INDICES,
} from "./types"

// Keepa epoch: minutes since Jan 1, 2011 00:00 UTC
const KEEPA_EPOCH_MINUTES = 21564000

export function keepaTimeToUtcDate(keepaMinutes: number): Date {
  return new Date((KEEPA_EPOCH_MINUTES + keepaMinutes) * 60000)
}

export function utcDateToKeepaTime(date: Date): number {
  return Math.floor(date.getTime() / 60000) - KEEPA_EPOCH_MINUTES
}

/**
 * Unpack a Keepa CSV paired array [time1, val1, time2, val2, ...] into a map of keepaTime -> value.
 * Prices in Keepa are stored in cents (divide by 100). Rank and counts are integers.
 */
function unpackCsvArray(rawArray?: number[] | null, isPrice = false): Map<number, number | null> {
  const map = new Map<number, number | null>()
  if (!rawArray || !Array.isArray(rawArray) || rawArray.length < 2) return map

  for (let i = 0; i < rawArray.length; i += 2) {
    const time = rawArray[i]
    const rawVal = rawArray[i + 1]
    if (rawVal === undefined || rawVal === -1) {
      map.set(time, null)
    } else {
      map.set(time, isPrice ? Math.round((rawVal / 100) * 100) / 100 : rawVal)
    }
  }
  return map
}

/**
 * Merge multiple Keepa CSV index streams into unified chronological observations with forward fill (ffill).
 */
export function mergeKeepaCsvStreams(csvObject: any): KeepaObservation[] {
  if (!csvObject || typeof csvObject !== "object") return []

  const amazonMap = unpackCsvArray(csvObject[KEEPA_CSV_INDICES.AMAZON], true)
  const newMap = unpackCsvArray(csvObject[KEEPA_CSV_INDICES.NEW], true)
  const rankMap = unpackCsvArray(csvObject[KEEPA_CSV_INDICES.SALES_RANK], false)
  const fbmMap = unpackCsvArray(csvObject[KEEPA_CSV_INDICES.NEW_FBM_SHIPPING], true)
  const fbaMap = unpackCsvArray(csvObject[KEEPA_CSV_INDICES.NEW_FBA], true)
  const countMap = unpackCsvArray(csvObject[KEEPA_CSV_INDICES.COUNT_NEW], false)
  const buyBoxMap = unpackCsvArray(csvObject[KEEPA_CSV_INDICES.BUY_BOX_SHIPPING], true)

  // Collect all unique Keepa timestamps across all streams
  const allTimes = new Set<number>([
    ...amazonMap.keys(),
    ...newMap.keys(),
    ...rankMap.keys(),
    ...fbmMap.keys(),
    ...fbaMap.keys(),
    ...countMap.keys(),
    ...buyBoxMap.keys(),
  ])

  const sortedTimes = Array.from(allTimes).sort((a, b) => a - b)
  const observations: KeepaObservation[] = []

  // Track running latest values for forward fill
  let lastRank: number | null = null
  let lastBuyBox: number | null = null
  let lastAmazon: number | null = null
  let lastNew: number | null = null
  let lastFba: number | null = null
  let lastFbm: number | null = null
  let lastCount: number | null = null

  for (const time of sortedTimes) {
    if (rankMap.has(time)) lastRank = rankMap.get(time)!
    if (buyBoxMap.has(time)) lastBuyBox = buyBoxMap.get(time)!
    if (amazonMap.has(time)) lastAmazon = amazonMap.get(time)!
    if (newMap.has(time)) lastNew = newMap.get(time)!
    if (fbaMap.has(time)) lastFba = fbaMap.get(time)!
    if (fbmMap.has(time)) lastFbm = fbmMap.get(time)!
    if (countMap.has(time)) lastCount = countMap.get(time)!

    // Determine availability: if Sales Rank or Buy Box or New price exists, item is available
    const isAvailable = Boolean((lastRank && lastRank > 0) || (lastBuyBox && lastBuyBox > 0) || (lastNew && lastNew > 0))

    observations.push({
      timestamp: keepaTimeToUtcDate(time),
      keepaTimestamp: time,
      salesRank: lastRank,
      buyBoxPrice: lastBuyBox || lastNew || lastAmazon,
      amazonPrice: lastAmazon,
      newPrice: lastNew,
      newFbaPrice: lastFba || lastNew,
      newFbmPrice: lastFbm,
      offerCount: lastCount || 3,
      isAvailable,
    })
  }

  return observations
}

/**
 * Generate realistic mock historical observations for demo/testing mode when no live API key is configured.
 */
export function generateMockKeepaHistory(asin: string, days = 30): KeepaObservation[] {
  const observations: KeepaObservation[] = []
  const now = new Date()
  const nowKeepa = utcDateToKeepaTime(now)
  const points = days * 4 // 4 observations per day (every 6 hours)

  let baseRank = 3500
  let basePrice = 16.90
  let baseOffers = 5

  for (let i = points; i >= 0; i--) {
    const keepaTime = nowKeepa - i * 360 // 6 hours in minutes
    const timestamp = keepaTimeToUtcDate(keepaTime)
    
    // Simulate natural weekday rank fluctuations (e.g. Saturdays slightly weaker/higher rank)
    const dayOfWeek = timestamp.getDay()
    const weekdayMultiplier = dayOfWeek === 6 ? 1.18 : dayOfWeek === 5 ? 0.88 : 1.0

    // Random walk with mean reversion toward 3000
    const rankNoise = (Math.random() - 0.48) * 400
    baseRank = Math.max(500, Math.min(15000, Math.round((baseRank + rankNoise) * weekdayMultiplier)))

    // Occasional price experiments
    if (Math.random() < 0.1) {
      basePrice = Math.round((basePrice + (Math.random() - 0.5) * 1.0) * 100) / 100
      basePrice = Math.max(12.00, Math.min(22.00, basePrice))
    }

    // Simulate occasional out-of-stock dip (1% chance)
    const isAvailable = Math.random() > 0.01

    observations.push({
      timestamp,
      keepaTimestamp: keepaTime,
      salesRank: isAvailable ? baseRank : null,
      buyBoxPrice: isAvailable ? basePrice : null,
      amazonPrice: isAvailable ? Math.round((basePrice * 0.98) * 100) / 100 : null,
      newPrice: isAvailable ? basePrice : null,
      newFbaPrice: isAvailable ? basePrice : null,
      newFbmPrice: isAvailable ? Math.round((basePrice - 0.50) * 100) / 100 : null,
      offerCount: isAvailable ? baseOffers : 0,
      isAvailable,
    })
  }

  return observations
}

export class KeepaService implements KeepaDataProvider {
  private async getConfig() {
    let config = await prisma.keepaConfig.findUnique({
      where: { id: "default_keepa_config" },
    })
    if (!config) {
      config = await prisma.keepaConfig.create({
        data: {
          id: "default_keepa_config",
          apiKey: null,
          tokensLeft: 300,
          refillRate: 12,
          connectionStatus: "UNCONFIGURED",
        },
      })
    }
    return config
  }

  async getTokenStatus(): Promise<KeepaTokenStatus> {
    const config = await this.getConfig()
    const apiKey = config.apiKey

    if (!apiKey || apiKey.startsWith("demo_") || apiKey.startsWith("test_")) {
      return {
        success: true,
        tokensLeft: config.tokensLeft ?? 300,
        refillRate: config.refillRate ?? 12,
        lastCheckedAt: new Date(),
        connectionStatus: apiKey ? "TEST_MODE" : "UNCONFIGURED",
      }
    }

    try {
      const res = await fetch(`https://api.keepa.com/token?key=${apiKey}`)
      if (!res.ok) {
        throw new Error(`Keepa API error: ${res.statusText}`)
      }
      const data = await res.json()
      const tokensLeft = data.tokensLeft ?? 300
      const refillRate = data.refillRate ?? 12

      await prisma.keepaConfig.update({
        where: { id: "default_keepa_config" },
        data: {
          tokensLeft,
          refillRate,
          lastCheckedAt: new Date(),
          connectionStatus: "CONNECTED",
        },
      })

      return {
        success: true,
        tokensLeft,
        refillRate,
        lastCheckedAt: new Date(),
        connectionStatus: "CONNECTED",
      }
    } catch (error: any) {
      await prisma.keepaConfig.update({
        where: { id: "default_keepa_config" },
        data: { connectionStatus: "ERROR" },
      })
      return {
        success: false,
        tokensLeft: 0,
        refillRate: 12,
        lastCheckedAt: new Date(),
        connectionStatus: "ERROR",
        error: error?.message || "Failed to connect to Keepa API",
      }
    }
  }

  async getProductHistory(input: KeepaProductRequest): Promise<KeepaProductHistoryResponse> {
    const config = await this.getConfig()
    const apiKey = config.apiKey
    const domain = input.domainId ?? 1
    const days = input.days ?? 30

    // Check if we should use Mock/Fallback mode
    if (!apiKey || apiKey.startsWith("demo_") || apiKey.startsWith("test_")) {
      const mockObs = generateMockKeepaHistory(input.asin, days)
      const lastObs = mockObs[mockObs.length - 1] || {}
      return {
        success: true,
        asin: input.asin,
        title: `Amazon Product (${input.asin}) [Keepa Demo]`,
        tokensConsumed: 0,
        tokensLeft: config.tokensLeft ?? 300,
        observations: mockObs,
        currentStats: {
          currentRank: lastObs.salesRank,
          currentBuyBoxPrice: lastObs.buyBoxPrice,
          currentAmazonPrice: lastObs.amazonPrice,
          currentNewPrice: lastObs.newPrice,
          competitorCount: lastObs.offerCount,
          isAvailable: lastObs.isAvailable ?? true,
        },
      }
    }

    // Live Keepa API call with retry on 429 throttling
    const url = `https://api.keepa.com/product?key=${apiKey}&domain=${domain}&asin=${input.asin}&history=1&buybox=1&stats=180`
    let retries = 0
    let delay = 1000

    while (retries < 3) {
      try {
        const res = await fetch(url)
        if (res.status === 429) {
          retries++
          await new Promise((r) => setTimeout(r, delay))
          delay *= 2
          continue
        }
        if (!res.ok) {
          throw new Error(`Keepa API HTTP error: ${res.status}`)
        }

        const data = await res.json()
        if (data.error) {
          throw new Error(`Keepa returned error: ${data.error.message || JSON.stringify(data.error)}`)
        }

        const tokensLeft = data.tokensLeft ?? config.tokensLeft ?? 300
        const refillRate = data.refillRate ?? config.refillRate ?? 12
        const tokensConsumed = data.tokensConsumed ?? 5

        await prisma.keepaConfig.update({
          where: { id: "default_keepa_config" },
          data: {
            tokensLeft,
            refillRate,
            lastCheckedAt: new Date(),
            connectionStatus: "CONNECTED",
          },
        })

        const prod = data.products?.[0]
        if (!prod) {
          throw new Error(`No product returned for ASIN ${input.asin}`)
        }

        const observations = mergeKeepaCsvStreams(prod.csv)
        const stats = prod.stats?.current ?? {}
        const lastObs = observations[observations.length - 1] || {}

        return {
          success: true,
          asin: input.asin,
          title: prod.title || `ASIN ${input.asin}`,
          imageUrl: prod.imagesCsv ? `https://images-na.ssl-images-amazon.com/images/I/${prod.imagesCsv.split(",")[0]}` : undefined,
          category: prod.rootCategory ? `${prod.rootCategory}` : undefined,
          tokensConsumed,
          tokensLeft,
          observations,
          currentStats: {
            currentRank: stats[KEEPA_CSV_INDICES.SALES_RANK] > 0 ? stats[KEEPA_CSV_INDICES.SALES_RANK] : lastObs.salesRank,
            currentBuyBoxPrice: stats[KEEPA_CSV_INDICES.BUY_BOX_SHIPPING] > 0 ? (stats[KEEPA_CSV_INDICES.BUY_BOX_SHIPPING] / 100) : lastObs.buyBoxPrice,
            currentAmazonPrice: stats[KEEPA_CSV_INDICES.AMAZON] > 0 ? (stats[KEEPA_CSV_INDICES.AMAZON] / 100) : lastObs.amazonPrice,
            currentNewPrice: stats[KEEPA_CSV_INDICES.NEW] > 0 ? (stats[KEEPA_CSV_INDICES.NEW] / 100) : lastObs.newPrice,
            competitorCount: stats[KEEPA_CSV_INDICES.COUNT_NEW] >= 0 ? stats[KEEPA_CSV_INDICES.COUNT_NEW] : lastObs.offerCount,
            isAvailable: lastObs.isAvailable ?? true,
          },
        }
      } catch (err: any) {
        if (retries >= 2) {
          return {
            success: false,
            asin: input.asin,
            observations: [],
            error: err.message || "Failed to fetch from Keepa API after retries",
          }
        }
        retries++
        await new Promise((r) => setTimeout(r, delay))
        delay *= 2
      }
    }

    return {
      success: false,
      asin: input.asin,
      observations: [],
      error: "Max retries exceeded when calling Keepa API",
    }
  }

  async getCurrentProductData(input: KeepaProductRequest): Promise<KeepaCurrentData> {
    const res = await this.getProductHistory({ ...input, days: 7 })
    if (!res.success || !res.currentStats) {
      return {
        asin: input.asin,
        title: res.title,
        isAvailable: false,
      }
    }
    return {
      asin: input.asin,
      title: res.title,
      currentRank: res.currentStats.currentRank,
      currentBuyBoxPrice: res.currentStats.currentBuyBoxPrice,
      offerCount: res.currentStats.competitorCount,
      isAvailable: res.currentStats.isAvailable ?? true,
    }
  }
}

export const keepaProvider = new KeepaService()
