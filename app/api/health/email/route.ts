import { NextResponse } from "next/server"
import { isResendConfigured } from "@/lib/email"

/**
 * GET /api/health/email
 * Returns whether Resend is configured in this environment (RESEND_API_KEY set).
 * Use this to verify production env: if false, no emails are sent and Resend log stays empty.
 */
export async function GET() {
  return NextResponse.json({
    resendConfigured: isResendConfigured(),
    emailFrom: process.env.EMAIL_FROM || "(using default)",
  })
}
