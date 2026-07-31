import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { PERMISSIONS, hasEffectivePermission } from "@/lib/permissions"

export const dynamic = "force-dynamic"

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    const userRole = (session?.user as any)?.role
    const customPermissions = (session?.user as any)?.customPermissions || []

    if (!session || !hasEffectivePermission(userRole, customPermissions, PERMISSIONS.AUTOPRICER)) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const { messages, productContext } = await req.json()

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ success: false, error: "Messages array is required" }, { status: 400 })
    }

    const rawApiKey = process.env.OPENAI_API_KEY || ""
    const apiKey = rawApiKey.replace(/\s+/g, "")
    const cloudModel = process.env.OPENAI_MODEL || "gpt-4o-mini"

    if (!apiKey) {
      return NextResponse.json({ success: false, error: "OpenAI API Key is missing." }, { status: 500 })
    }

    // Prepare context message
    const systemPrompt = `You are an expert Amazon FBA Pricing Strategist AI. You are chatting with the brand owner who is reviewing your recent pricing recommendation.
You must answer their questions directly, concisely, and analytically, using the following product data context.

PRODUCT CONTEXT:
Name: ${productContext?.productName || "Unknown"}
ASIN: ${productContext?.asin || "Unknown"}
Current Price: $${productContext?.currentPrice || 0}
Unit Cost: $${productContext?.unitCost || 0}
Net Margin: ${productContext?.marginPercent || 0}%
Recent 7-Day Velocity: ${productContext?.sevenDaySalesTotal || 0} units
Keepa Rank: ${productContext?.currentRank || "Unknown"}

AI'S RECENT RECOMMENDATION:
Action: ${productContext?.aiAssessment?.recommendedAction || "Unknown"}
Recommended Price: $${productContext?.aiAssessment?.proposedPrice || "N/A"}
Rationale: ${productContext?.aiAssessment?.testRationale || "None provided"}

Be helpful, data-driven, and brief. Never hallucinate metrics that aren't provided.`

    const openaiMessages = [
      { role: "system", content: systemPrompt },
      ...messages
    ]

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: cloudModel,
        messages: openaiMessages,
        temperature: 0.5,
        max_tokens: 500,
        stream: false, // Keeping it simple (non-streaming) to ensure reliability without third-party libraries
      }),
    })

    if (!response.ok) {
      const errText = await response.text()
      throw new Error(`OpenAI API Error: ${response.status} ${errText}`)
    }

    const data = await response.json()
    const reply = data.choices[0]?.message?.content || "I am unable to process that right now."

    return NextResponse.json({ success: true, reply })
  } catch (error: any) {
    console.error("[AI_CHAT_POST]", error)
    return NextResponse.json({ success: false, error: error?.message || "Failed to execute AI chat" }, { status: 500 })
  }
}
