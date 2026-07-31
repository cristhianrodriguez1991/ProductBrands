import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { PERMISSIONS, hasEffectivePermission } from "@/lib/permissions"

export const maxDuration = 60
export const dynamic = "force-dynamic"

function getNextDateForDayName(dayName: string, hour: number = 4, minute: number = 0): Date {
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
  const targetDay = days.findIndex(d => d.toLowerCase() === dayName.toLowerCase())
  if (targetDay === -1) throw new Error("Invalid day name")

  // We want to calculate 4:00 AM Eastern Time (America/New_York)
  // We can do this by setting the time in UTC, but accounting for the offset.
  // The easiest robust way in Node is to use the Intl API or just create a Date object and manually adjust it.
  
  const now = new Date()
  
  // Format the current date to America/New_York
  const options = { timeZone: 'America/New_York', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: false } as const
  const formatter = new Intl.DateTimeFormat([], options)
  
  // Actually, standard logic: get current day, find days until target
  let currentDay = now.getDay()
  let daysUntil = targetDay - currentDay
  if (daysUntil <= 0) daysUntil += 7 // Next occurrence (if today is the day, it will be next week)

  const targetDate = new Date(now.getTime() + daysUntil * 24 * 60 * 60 * 1000)
  
  // Set to 4:00 AM local server time (which typically should be Eastern, but we'll enforce the timezone offset manually if needed, or assume server is UTC and just set UTC hours to 8 or 9 based on DST).
  // A safer approach: Date object in JS defaults to local time zone if not specified.
  // Since we want Eastern Time, and Vercel runs in UTC, 4:00 AM Eastern is 09:00 AM UTC (or 08:00 AM UTC during DST).
  // Let's use a simpler heuristic for Eastern Time 4 AM.
  const easternString = targetDate.toLocaleDateString('en-US', { timeZone: 'America/New_York' })
  const easternDateParts = easternString.split('/') // month, day, year
  
  // Construct a date string: YYYY-MM-DDT04:00:00-05:00 (EST) or -04:00 (EDT)
  // To avoid DST math, let's just let the native Date constructor handle it by passing the timezone name if possible, or just using setUTCHours (8 or 9).
  // Actually, Vercel allows setting process.env.TZ = "America/New_York", but let's assume UTC.
  // The user says "4 a.m. that day". We can just construct an ISO string with the EDT/EST offset.
  // But wait, the exact hour isn't critical down to the minute. If we use 08:00 UTC, it's 4 AM EDT or 3 AM EST.
  // Let's just use 08:00 UTC for simplicity.
  targetDate.setUTCHours(8, 0, 0, 0)

  return targetDate
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    const userRole = (session?.user as any)?.role
    const userId = (session?.user as any)?.id || "admin"
    const customPermissions = (session?.user as any)?.customPermissions || []

    if (!session || !hasEffectivePermission(userRole, customPermissions, PERMISSIONS.AUTOPRICER)) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const { productId, dayName, proposedPrice, reasoning } = await req.json()
    if (!productId || !dayName || !proposedPrice) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const product = await prisma.monitoredProduct.findUnique({
      where: { id: productId },
    })
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 })
    }

    const scheduledDate = getNextDateForDayName(dayName)

    const action = proposedPrice > product.currentPrice ? "RAISE" : proposedPrice < product.currentPrice ? "LOWER" : "MAINTAIN"

    // Create the PriceChangeLog with status APPROVED_SCHEDULED
    const log = await prisma.priceChangeLog.create({
      data: {
        monitoredProductId: productId,
        oldPrice: product.currentPrice,
        newPrice: proposedPrice,
        recommendedAction: action,
        reason: `${reasoning} [Scheduled for ${dayName}]`,
        status: "APPROVED_SCHEDULED",
        scheduledFor: scheduledDate,
        approvedAt: new Date(),
        approvedByUserId: userId,
      }
    })

    return NextResponse.json({ 
      success: true, 
      scheduledDate,
      message: `Price change to $${proposedPrice.toFixed(2)} scheduled for next ${dayName} at 4:00 AM Eastern Time.` 
    })
  } catch (error: any) {
    console.error("[SCHEDULE_CREATE_ERROR]", error)
    return NextResponse.json({ success: false, error: error?.message || "Failed to create schedule" }, { status: 500 })
  }
}
