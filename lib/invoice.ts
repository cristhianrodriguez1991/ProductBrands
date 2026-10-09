/**
 * Shared helpers for customer invoices (pay page, emails, admin).
 */

/** Offset so invoice numbers look established, e.g. invoiceNumber 41 -> "PB3041". */
const INVOICE_NUMBER_OFFSET = 3000

export function formatInvoiceNumber(order: { invoiceNumber?: number | null; id: string }): string {
  if (typeof order.invoiceNumber === "number" && order.invoiceNumber > 0) {
    return `PB${INVOICE_NUMBER_OFFSET + order.invoiceNumber}`
  }
  // Deterministic 4-digit number from order ID so even orders without a sequence show as PB####
  let hash = 0
  const idStr = String(order.id || "")
  for (let i = 0; i < idStr.length; i++) {
    hash = (hash * 31 + idStr.charCodeAt(i)) >>> 0
  }
  const num = 3000 + (hash % 900) + 1
  return `PB${num}`
}

/**
 * Credit card surcharge percentage. US card network rules cap surcharges at 3%
 * and prohibit surcharging debit/prepaid cards. ACH is never surcharged.
 */
export function getCardSurchargePercent(): number {
  const raw = parseFloat(process.env.CARD_SURCHARGE_PERCENT || process.env.NEXT_PUBLIC_CARD_SURCHARGE_PERCENT || "3")
  if (!Number.isFinite(raw) || raw < 0) return 0
  return Math.min(raw, 3)
}

/** Returns the surcharge in cents for a given base amount (cents) and funding type. */
export function computeSurchargeCents(baseCents: number, methodType: string, funding: string | null | undefined, percent: number): number {
  if (methodType !== "card") return 0
  if (funding !== "credit") return 0
  return Math.round(baseCents * (percent / 100))
}

/**
 * Calculates the exact card processing fee (Stripe rate: 2.9% + $0.30)
 * so that when Stripe deducts its fee from the total, the net payout to
 * the business equals 100% of the invoice amount.
 * 
 * Formula: total = ceil((base + 30) / (1 - 0.029))
 * fee = total - base
 */
export function computeCardProcessingFeeCents(baseCents: number): number {
  if (baseCents <= 0) return 0
  const totalCents = Math.ceil((baseCents + 30) / (1 - 0.029))
  return totalCents - baseCents
}

export const toCents = (amount: number) => Math.round((amount || 0) * 100)

/** Builds standard professional SMS message text for customer invoices. */
export function buildInvoiceSmsMessage({
  invoiceNumber,
  customerName,
  totalAmount,
  payUrl,
}: {
  invoiceNumber: string
  customerName: string
  totalAmount: number
  payUrl: string
}): string {
  const firstName = (customerName || "").trim().split(" ")[0] || "there"
  const formattedTotal = `$${(totalAmount || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  return `Product Brands: Hi ${firstName}, your invoice #${invoiceNumber} for ${formattedTotal} is ready. View invoice & pay securely online (ACH or Card): ${payUrl}\n\nThank you for your business!`
}

/** Builds an sms: link compatible with iOS, Android, and macOS Messages. */
export function buildSmsHref(phone: string, body: string): string {
  const cleanPhone = (phone || "").replace(/[^\d+]/g, "")
  return `sms:${cleanPhone}?&body=${encodeURIComponent(body)}`
}
