/**
 * Bot Protection Utilities
 * Multi-layer defense: rate limiting + honeypot validation + timing checks
 */

// --- In-memory rate limiter ---
// Stores: ip -> { count, firstRequestAt, blockedUntil }
const ipStore = new Map<string, { count: number; firstRequestAt: number; blockedUntil: number }>()

const WINDOW_MS = 60 * 1000        // 1 minute window
const MAX_REQUESTS = 3             // max 3 submissions per IP per window
const BLOCK_DURATION_MS = 60 * 60 * 1000  // block for 1 hour after limit exceeded

// Clean up old entries every 10 minutes to prevent memory leaks
setInterval(() => {
  const now = Date.now()
  for (const [ip, data] of ipStore.entries()) {
    if (now - data.firstRequestAt > BLOCK_DURATION_MS + WINDOW_MS) {
      ipStore.delete(ip)
    }
  }
}, 10 * 60 * 1000)

export function checkRateLimit(ip: string): { allowed: boolean; retryAfterSeconds?: number } {
  const now = Date.now()
  const entry = ipStore.get(ip)

  if (entry) {
    // Currently blocked?
    if (entry.blockedUntil > now) {
      const retryAfterSeconds = Math.ceil((entry.blockedUntil - now) / 1000)
      return { allowed: false, retryAfterSeconds }
    }

    // Window expired — reset
    if (now - entry.firstRequestAt > WINDOW_MS) {
      ipStore.set(ip, { count: 1, firstRequestAt: now, blockedUntil: 0 })
      return { allowed: true }
    }

    // Within window — increment
    entry.count++
    if (entry.count > MAX_REQUESTS) {
      entry.blockedUntil = now + BLOCK_DURATION_MS
      ipStore.set(ip, entry)
      const retryAfterSeconds = Math.ceil(BLOCK_DURATION_MS / 1000)
      return { allowed: false, retryAfterSeconds }
    }

    ipStore.set(ip, entry)
    return { allowed: true }
  }

  // First request from this IP
  ipStore.set(ip, { count: 1, firstRequestAt: now, blockedUntil: 0 })
  return { allowed: true }
}

// --- Honeypot field name (keep consistent with forms) ---
export const HONEYPOT_FIELD = "website_url"

// --- Timing check: reject if form submitted in under N seconds ---
const MIN_SUBMISSION_SECONDS = 4

export type BotCheckPayload = {
  honeypot?: string            // must be empty
  formLoadedAt?: string        // ISO timestamp from client
}

export type BotCheckResult =
  | { blocked: false }
  | { blocked: true; reason: string }

export function checkBotSignals(payload: BotCheckPayload): BotCheckResult {
  // 1. Honeypot: bots fill this in, humans leave it empty
  if (payload.honeypot && payload.honeypot.trim().length > 0) {
    console.warn("[BotProtection] Honeypot triggered")
    return { blocked: true, reason: "honeypot" }
  }

  // 2. Timing: reject if the form was submitted too fast
  if (payload.formLoadedAt) {
    const loadedAt = new Date(payload.formLoadedAt).getTime()
    if (!isNaN(loadedAt)) {
      const elapsedSeconds = (Date.now() - loadedAt) / 1000
      if (elapsedSeconds < MIN_SUBMISSION_SECONDS) {
        console.warn(`[BotProtection] Form submitted in ${elapsedSeconds.toFixed(1)}s — too fast`)
        return { blocked: true, reason: "too_fast" }
      }
    }
  }

  return { blocked: false }
}

// --- Extract real IP from request headers ---
export function getClientIp(req: Request): string {
  const headers = req.headers
  return (
    headers.get("x-real-ip") ||
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  )
}

// --- Detect obviously fake/bot-pattern names ---
const BOT_PATTERNS = [
  /^[a-zA-Z]{10,}[A-Z][a-z]+[A-Z][a-z]+$/, // "RandomCamelCaseString"
  /^[a-z]+[A-Z][a-z]+[A-Z][a-z]+[A-Z]/,     // mixed camel without spaces
]

const SUSPICIOUS_EMAIL_DOMAINS = [
  // These are commonly abused in bot campaigns but NOT blocked: gmail, yahoo, hotmail
  // We check for dotted random-looking local parts instead
]

export function detectBotName(name: string): boolean {
  // Name should contain a space for first + last, or be short
  const hasNoSpace = !name.includes(" ")
  const isLong = name.length > 20
  const hasRandomCase = /[a-z][A-Z][a-z][A-Z]/.test(name)
  const looksRandom = BOT_PATTERNS.some((p) => p.test(name))

  if (looksRandom && isLong) return true
  if (hasNoSpace && isLong && hasRandomCase) return true

  return false
}

export function detectBotEmail(email: string): boolean {
  const local = email.split("@")[0] || ""
  // Pattern: many dots with single chars between them, like "a.b.c.d.e.f@gmail.com"
  const dottedParts = local.split(".")
  if (dottedParts.length >= 4) {
    const shortParts = dottedParts.filter((p) => p.length <= 2)
    if (shortParts.length >= 3) return true
  }
  // Contains digits interspersed with letters in a suspicious way e.g. "a.b.c.8.4@gmail.com"
  const hasNumbersInDots = /\.[0-9]+\./.test(local)
  if (hasNumbersInDots) return true

  return false
}
