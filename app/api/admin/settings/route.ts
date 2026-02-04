import { NextRequest, NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { requireAdminApi } from "@/lib/rbac"
import { prisma } from "@/lib/prisma"

// Default settings to seed if none exist
const DEFAULT_SETTINGS = [
  { key: "contact_email", value: "info@productbrands.com", label: "Contact Email", type: "email", group: "contact", sortOrder: 1 },
  { key: "contact_phone", value: "1-800-PRODUCT", label: "Phone Number", type: "phone", group: "contact", sortOrder: 2 },
  { key: "contact_address", value: "", label: "Address", type: "textarea", group: "contact", sortOrder: 3 },
  { key: "calendar_url", value: "", label: "Calendar/Scheduling URL", type: "url", group: "contact", sortOrder: 4 },
  { key: "social_facebook", value: "", label: "Facebook URL", type: "url", group: "social", sortOrder: 1 },
  { key: "social_instagram", value: "", label: "Instagram URL", type: "url", group: "social", sortOrder: 2 },
  { key: "social_twitter", value: "", label: "Twitter/X URL", type: "url", group: "social", sortOrder: 3 },
  { key: "social_linkedin", value: "", label: "LinkedIn URL", type: "url", group: "social", sortOrder: 4 },
]

// GET /api/admin/settings - Get all settings
export async function GET(req: NextRequest) {
  try {
    await requireAdminApi(req)

    let settings = await prisma.siteSetting.findMany({
      orderBy: [{ group: "asc" }, { sortOrder: "asc" }],
    })

    // Seed default settings if none exist
    if (settings.length === 0) {
      await prisma.siteSetting.createMany({
        data: DEFAULT_SETTINGS,
      })
      settings = await prisma.siteSetting.findMany({
        orderBy: [{ group: "asc" }, { sortOrder: "asc" }],
      })
    }

    return NextResponse.json(settings)
  } catch (error: any) {
    console.error("Error fetching settings:", error)
    return NextResponse.json({ error: error.message || "Failed to fetch settings" }, { status: 500 })
  }
}

// PATCH /api/admin/settings - Update multiple settings
export async function PATCH(req: NextRequest) {
  try {
    await requireAdminApi(req)

    const body = await req.json()
    const { settings } = body // Array of { key, value }

    if (!settings || !Array.isArray(settings)) {
      return NextResponse.json({ error: "Settings array is required" }, { status: 400 })
    }

    // Update each setting
    const updates = await Promise.all(
      settings.map(({ key, value }: { key: string; value: string }) =>
        prisma.siteSetting.upsert({
          where: { key },
          update: { value },
          create: {
            key,
            value,
            label: key.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase()),
            type: "text",
            group: "general",
          },
        })
      )
    )

    // Revalidate pages that use settings
    revalidatePath("/")
    revalidatePath("/contact")

    return NextResponse.json({ success: true, updated: updates.length })
  } catch (error: any) {
    console.error("Error updating settings:", error)
    return NextResponse.json({ error: error.message || "Failed to update settings" }, { status: 500 })
  }
}
