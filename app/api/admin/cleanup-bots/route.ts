import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

/**
 * POST /api/admin/cleanup-bots
 * Deletes all spam/bot entries from contacts, companies, quotes, and chat messages.
 */
export async function POST() {
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session.user as any)?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const results: Record<string, number> = {}

    // ── Contact Submissions (has name, email, company, message) ──
    const allContacts = await prisma.contactSubmission.findMany({
      select: { id: true, name: true, email: true, company: true, message: true },
    })
    const botContactIds = allContacts
      .filter((c) => isBotEntry(c.name, c.email, c.company, c.message))
      .map((c) => c.id)
    if (botContactIds.length > 0) {
      const del = await prisma.contactSubmission.deleteMany({ where: { id: { in: botContactIds } } })
      results.contactSubmissions = del.count
    }

    // ── Companies (name-based detection) ──
    const allCompanies = await prisma.company.findMany({
      select: { id: true, name: true, phone: true, website: true, notes: true },
    })
    const botCompanyIds = allCompanies
      .filter((c) => isBotEntry(c.name, null, null, c.notes))
      .map((c) => c.id)
    if (botCompanyIds.length > 0) {
      // Cascade deletes quotes, orders, invoices, contacts via Prisma
      const del = await prisma.company.deleteMany({ where: { id: { in: botCompanyIds } } })
      results.companies = del.count
    }

    // ── Client Contacts (name + email based) ──
    const allClientContacts = await prisma.clientContact.findMany({
      select: { id: true, name: true, email: true, roleTitle: true },
    })
    const botClientContactIds = allClientContacts
      .filter((c) => isBotEntry(c.name, c.email, c.roleTitle, null))
      .map((c) => c.id)
    if (botClientContactIds.length > 0) {
      const del = await prisma.clientContact.deleteMany({ where: { id: { in: botClientContactIds } } })
      results.clientContacts = del.count
    }

    // ── Users with CLIENT role that look fake ──
    const allClients = await prisma.user.findMany({
      where: { role: "CLIENT" },
      select: { id: true, name: true, email: true, company: true },
    })
    const botClientIds = allClients
      .filter((c) => isBotEntry(c.name, c.email, c.company, null))
      .map((c) => c.id)
    if (botClientIds.length > 0) {
      const del = await prisma.user.deleteMany({ where: { id: { in: botClientIds } } })
      results.users = del.count
    }

    // ── Chat messages from bots ──
    const allMessages = await prisma.message.findMany({
      where: { senderType: "USER" },
      select: { id: true, senderName: true, content: true },
    })
    const botMsgIds = allMessages
      .filter((m) => isBotEntry(m.senderName, null, null, m.content))
      .map((m) => m.id)
    if (botMsgIds.length > 0) {
      const del = await prisma.message.deleteMany({ where: { id: { in: botMsgIds } } })
      results.chatMessages = del.count
    }

    return NextResponse.json({
      success: true,
      deleted: results,
      message: `Cleaned up: ${Object.entries(results).map(([k, v]) => `${v} ${k}`).join(", ") || "nothing to clean"}`,
    })
  } catch (error) {
    console.error("[Cleanup Bots]", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
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
  if (e && spamTlds.some((tld) => e.endsWith(tld))) return true

  // Disposable email providers
  const disposable = ["tempmail", "mailinator", "guerrillamail", "yopmail", "10minutemail", "throwaway", "trashmail"]
  if (e && disposable.some((d) => e.includes(d))) return true

  // URL/HTML in name or message (classic bot indicator)
  if (/<\/?[a-z][\s\S]*>/i.test(n) || /http[s]?:\/\//i.test(n)) return true
  if (/<\/?[a-z][\s\S]*>/i.test(m) || /\[url=/i.test(m)) return true

  // Gibberish names (excessive consonant clusters)
  if (n && /[bcdfghjklmnpqrstvwxyz]{5,}/i.test(n)) return true

  // Name is a single character or just numbers
  if (n.length === 1 || /^\d+$/.test(n)) return true

  // Extremely long names
  if (n.length > 80) return true

  // Spam keywords
  const spamKeywords = [
    "viagra", "cialis", "casino", "poker", "seo", "backlink",
    "cryptocurrency", "bitcoin", "forex", "buy cheap", "free money",
    "weight loss", "diet pills", "click here", "subscribe",
  ]
  const allText = `${n} ${m} ${c}`
  if (spamKeywords.some((kw) => allText.includes(kw))) return true

  return false
}
