import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { PERMISSIONS, hasEffectivePermission } from "@/lib/permissions"

export const dynamic = "force-dynamic"
export const maxDuration = 30

/**
 * AI provider diagnostic. Reports what the SERVER actually sees for the AI env
 * vars (without leaking secret values) and attempts a tiny live OpenAI call so
 * you can tell exactly why the LLM is falling back. Hit:
 *   /api/admin/autopricer/ai-diagnostic
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    const userRole = (session?.user as any)?.role
    const customPermissions = (session?.user as any)?.customPermissions || []
    if (!session || !hasEffectivePermission(userRole, customPermissions, PERMISSIONS.AUTOPRICER)) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const openAiKey = process.env.OPENAI_API_KEY || ""
    const openAiModel = process.env.OPENAI_MODEL || "gpt-4o-mini"
    const ollamaBaseUrl = process.env.OLLAMA_BASE_URL || ""
    const ollamaModel = process.env.OLLAMA_MODEL || "glm4"
    const glmKey = process.env.GLM_API_KEY || "" // legacy, should be empty

    // Attempt a minimal live OpenAI call (only if a key is present)
    let liveCall: any = null
    if (openAiKey) {
      try {
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 15000)
        const res = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${openAiKey}`,
          },
          body: JSON.stringify({
            model: openAiModel,
            messages: [{ role: "user", content: "Reply with the single word OK" }],
            max_tokens: 5,
          }),
          signal: controller.signal,
        })
        clearTimeout(timeout)
        const body = await res.text().catch(() => "")
        liveCall = {
          ok: res.ok,
          status: res.status,
          bodyPreview: body.slice(0, 300),
        }
      } catch (e: any) {
        liveCall = { ok: false, error: e?.name === "AbortError" ? "timeout (15s)" : (e?.message || String(e)) }
      }
    }

    return NextResponse.json({
      success: true,
      env: {
        OPENAI_API_KEY_set: !!openAiKey,
        OPENAI_API_KEY_length: openAiKey.length,
        OPENAI_API_KEY_prefix: openAiKey ? openAiKey.slice(0, 7) : "(empty)", // "sk-proj" expected
        OPENAI_MODEL: openAiModel,
        OLLAMA_BASE_URL_set: !!ollamaBaseUrl,
        OLLAMA_BASE_URL: ollamaBaseUrl || "(empty — expected on Vercel)",
        OLLAMA_MODEL: ollamaModel,
        GLM_API_KEY_set: !!glmKey, // legacy; should be false
      },
      liveOpenAiCall: liveCall,
      note:
        "If OPENAI_API_KEY_set is false, Vercel did not receive the var (check the exact name/spelling and that it is applied to the Production environment, then redeploy). If liveOpenAiCall.status is 401 the key value is wrong; 429 means no quota; 200 means it works.",
    })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || "Unknown error" }, { status: 500 })
  }
}