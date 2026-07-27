export interface KeepaProductRequest {
  asin: string
  domainId?: number // Default 1 for Amazon US
  days?: number     // Number of historical days to fetch (default 30 or 90)
  stats?: number    // Whether to include statistics summary (default 180 days)
  history?: boolean // Whether to include full csv history (default true)
  offers?: number   // Number of live offers to include (default 20)
}

export interface KeepaObservation {
  timestamp: Date      // Converted UTC Date
  keepaTimestamp: number // Original minutes since Jan 1, 2011
  salesRank?: number | null
  buyBoxPrice?: number | null
  amazonPrice?: number | null
  newPrice?: number | null
  newFbaPrice?: number | null
  newFbmPrice?: number | null
  offerCount?: number | null
  isAvailable?: boolean
}

export interface KeepaProductHistoryResponse {
  success: boolean
  asin: string
  title?: string
  imageUrl?: string
  category?: string
  tokensConsumed?: number
  tokensLeft?: number
  observations: KeepaObservation[]
  currentStats?: {
    currentRank?: number | null
    currentBuyBoxPrice?: number | null
    currentAmazonPrice?: number | null
    currentNewPrice?: number | null
    competitorCount?: number | null
    isAvailable?: boolean
  }
  error?: string
}

export interface KeepaCurrentData {
  asin: string
  title?: string
  currentRank?: number | null
  currentBuyBoxPrice?: number | null
  offerCount?: number | null
  isAvailable: boolean
}

export interface KeepaTokenStatus {
  success: boolean
  tokensLeft: number
  refillRate: number // tokens per minute
  lastCheckedAt: Date
  connectionStatus: "CONNECTED" | "ERROR" | "TEST_MODE" | "UNCONFIGURED"
  error?: string
}

export interface KeepaDataProvider {
  getProductHistory(input: KeepaProductRequest): Promise<KeepaProductHistoryResponse>
  getCurrentProductData(input: KeepaProductRequest): Promise<KeepaCurrentData>
  getTokenStatus(): Promise<KeepaTokenStatus>
}

// Keepa CSV Array Index Constants
export const KEEPA_CSV_INDICES = {
  AMAZON: 0,
  NEW: 1,
  SALES_RANK: 3,
  NEW_FBM_SHIPPING: 7,
  NEW_FBA: 10,
  COUNT_NEW: 11,
  BUY_BOX_SHIPPING: 18,
} as const
