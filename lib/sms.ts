/**
 * Twilio SMS sending utility using standard native fetch (no heavy external dependencies).
 */

export interface SendSmsResult {
  success: boolean
  messageId?: string
  error?: string
  configured?: boolean
}

/** Check whether Twilio environment variables are configured. */
export function isTwilioConfigured(): boolean {
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    process.env.TWILIO_PHONE_NUMBER
  )
}

/** Formats a US or international phone number to E.164 format (+1XXXXXXXXXX). */
export function formatToE164(phone: string): string {
  const digits = phone.replace(/[^\d+]/g, "")
  if (digits.startsWith("+")) return digits
  // If 10 digits (US number without country code), prepend +1
  if (digits.length === 10) return `+1${digits}`
  // If 11 digits starting with 1, prepend +
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`
  return `+${digits}`
}

/**
 * Sends an SMS message via the official Twilio REST API.
 */
export async function sendTwilioSms({
  to,
  body,
}: {
  to: string
  body: string
}): Promise<SendSmsResult> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim()
  const authToken = process.env.TWILIO_AUTH_TOKEN?.trim()
  const fromPhone = process.env.TWILIO_PHONE_NUMBER?.trim()

  if (!accountSid || !authToken || !fromPhone) {
    return {
      success: false,
      configured: false,
      error: "Twilio credentials are not configured in environment variables (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER).",
    }
  }

  const formattedTo = formatToE164(to)

  try {
    const auth = Buffer.from(`${accountSid}:${authToken}`).toString("base64")
    const endpoint = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`

    const params = new URLSearchParams()
    params.append("To", formattedTo)
    params.append("From", fromPhone)
    params.append("Body", body)

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    })

    const data = await response.json()

    if (!response.ok) {
      const errorMsg = data?.message || data?.error_message || `Twilio error status ${response.status}`
      console.error("[TWILIO_SMS_SEND_ERROR]", data)
      return {
        success: false,
        configured: true,
        error: errorMsg,
      }
    }

    return {
      success: true,
      configured: true,
      messageId: data.sid,
    }
  } catch (err: any) {
    console.error("[TWILIO_SMS_NETWORK_ERROR]", err)
    return {
      success: false,
      configured: true,
      error: err?.message || "Failed to reach Twilio API",
    }
  }
}
