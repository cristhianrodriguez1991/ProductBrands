import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

/**
 * POST /api/admin/cleanup-bots
 * Deletes spam/bot entries from contact submissions.
 * Also allows wiping ALL non-admin data if ?wipe=all is passed.
 */
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session.user as any)?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const url = new URL(req.url)
    const wipeAll = url.searchParams.get("wipe") === "all"
    const results: Record<string, number> = {}

    if (wipeAll) {
      // Nuclear option: wipe ALL contact submissions, chat messages, etc.
      const delContacts = await prisma.contactSubmission.deleteMany()
      results.contactSubmissions = delContacts.count

      // Delete all non-admin users (CUSTOMER role)
      const delUsers = await prisma.user.deleteMany({
        where: { role: "CUSTOMER" },
      })
      results.customerUsers = delUsers.count

      return NextResponse.json({
        success: true,
        deleted: results,
        message: `Wiped all: ${Object.entries(results).map(([k, v]) => `${v} ${k}`).join(", ")}`,
      })
    }

    // ── Smart bot detection on ContactSubmission ──
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

    return NextResponse.json({
      success: true,
      deleted: results,
      message: `Cleaned: ${Object.entries(results).map(([k, v]) => `${v} ${k}`).join(", ") || "nothing to clean"}`,
    })
  } catch (error) {
    console.error("[Cleanup Bots]", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

/** Heuristic bot detector */
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

  // URL/HTML in name or message
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
    "weight loss", "diet pills", "click here",
  ]
  const allText = `${n} ${m} ${c}`
  if (spamKeywords.some((kw) => allText.includes(kw))) return true

  return false
}
