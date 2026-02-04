import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// Public API to get site settings
export async function GET() {
  try {
    const settings = await prisma.siteSetting.findMany({
      select: {
        key: true,
        value: true,
      },
    })

    // Convert to key-value object for easy access
    const settingsObject = settings.reduce((acc, setting) => {
      acc[setting.key] = setting.value
      return acc
    }, {} as Record<string, string>)

    return NextResponse.json(settingsObject)
  } catch (error: any) {
    console.error("Error fetching settings:", error)
    // Return empty object on error so pages don't break
    return NextResponse.json({})
  }
}
