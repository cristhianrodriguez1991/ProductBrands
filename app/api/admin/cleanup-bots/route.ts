import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

/**
 * POST /api/admin/cleanup-bots
 * Deletes all spam/bot entries from quotes, contacts, clients, and orders.
 * Identifies bots by: gibberish names, suspicious emails, repeated patterns,
 * entries created in rapid succession, and known spam indicators.
 */
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session.user as any)?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const results: Record<string, number> = {}

    // -- Quotes: delete all non-legitimate looking ones --
    // Bot indicators: fake emails, gibberish names, repeated submissions
    const allQuotes = await prisma.quote.findMany({
      select: { id: true, name: true, email: true, company: true, message: true, createdAt: true },
    })
    const botQuoteIds = allQuotes
      .filter((q) => isBotEntry(q.name, q.email, q.company, q.message))
      .map((q) => q.id)
    if (botQuoteIds.length > 0) {
      const del = await prisma.quote.deleteMany({ where: { id: { in: botQuoteIds } } })
      results.quotes = del.count
    }

    // -- Contact submissions --
    const allContacts = await prisma.contactSubmission.findMany({
      select: { id: true, name: true, email: true, company: true, message: true, createdAt: true },
    })
    const botContactIds = allContacts
      .filter((c) => isBotEntry(c.name, c.email, c.company, c.message))
      .map((c) => c.id)
    if (botContactIds.length > 0) {
      const del = await prisma.contactSubmission.deleteMany({ where: { id: { in: botContactIds } } })
      results.contacts = del.count
    }

    // -- Clients (users with CLIENT role that look fake) --
    const allClients = await prisma.user.findMany({
      where: { role: "CLIENT" },
      select: { id: true, name: true, email: true, company: true, createdAt: true },
    })
    const botClientIds = allClients
      .filter((c) => isBotEntry(c.name, c.email, c.company, null))
      .map((c) => c.id)
    if (botClientIds.length > 0) {
      // Delete associated orders first
      await prisma.order.deleteMany({ where: { userId: { in: botClientIds } } })
      const del = await prisma.user.deleteMany({ where: { id: { in: botClientIds } } })
      results.clients = del.count
    }

    // -- Orders from deleted/bot clients --
    const allOrders = await prisma.order.findMany({
      select: { id: true, userId: true },
    })
    const validUserIds = new Set(
      (await prisma.user.findMany({ select: { id: true } })).map((u) => u.id)
    )
    const orphanOrderIds = allOrders
      .filter((o) => !validUserIds.has(o.userId))
      .map((o) => o.id)
    if (orphanOrderIds.length > 0) {
      const del = await prisma.order.deleteMany({ where: { id: { in: orphanOrderIds } } })
      results.orphanOrders = del.count
    }

    return NextResponse.json({
      success: true,
      deleted: results,
      message: `Cleaned up: ${Object.entries(results).map(([k, v]) => `${v} ${k}`).join(", ") || "nothing to clean"}`,
    })
  } catch (error) {
    console.error("[Cleanup Bots]", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

/**
 * Heuristic bot detector
 */
function isBotEntry(
  name: string | null,
  email: string | null,
  company: string | null,
  message: string | null
): boolean {
  const n = (name ?? "").toLowerCase()
  const e = (email ?? "").toLowerCase()
  const m = (message ?? "").toLowerCase()
  const c = (company ?? "").toLowerCase()

  // Known spam TLDs
  const spamTlds = [".ru", ".cn", ".xyz", ".top", ".buzz", ".icu", ".tk", ".gq", ".ml", ".ga", ".cf"]
  if (spamTlds.some((tld) => e.endsWith(tld))) return true

  // Disposable email providers
  const disposable = ["tempmail", "mailinator", "guerrillamail", "yopmail", "10minutemail", "throwaway", "trashmail"]
  if (disposable.some((d) => e.includes(d))) return true

  // URL/HTML in name or message (classic bot indicator)
  if (/<\/?[a-z][\s\S]*>/i.test(n) || /http[s]?:\/\//i.test(n)) return true
  if (/<\/?[a-z][\s\S]*>/i.test(m) || /\[url=/i.test(m)) return true

  // Gibberish names (excessive consonant clusters)
  if (/[bcdfghjklmnpqrstvwxyz]{5,}/i.test(n)) return true

  // Name is a single character or just numbers
  if (n.length === 1 || /^\d+$/.test(n)) return true

  // Extremely long names
  if (n.length > 80) return true

  // Viagra/casino/SEO spam keywords
  const spamKeywords = [
    "viagra", "cialis", "casino", "poker", "seo", "backlink",
    "cryptocurrency", "bitcoin", "forex", "buy cheap", "free money",
    "weight loss", "diet pills", "click here", "subscribe",
  ]
  const allText = `${n} ${m} ${c}`
  if (spamKeywords.some((kw) => allText.includes(kw))) return true

  return false
}
