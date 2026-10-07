import { formatInvoiceNumber, getCardSurchargePercent } from "@/lib/invoice"

/** Invoices & receipts are sent from a clearly marked no-reply address */
export const INVOICE_EMAIL_FROM = process.env.INVOICE_EMAIL_FROM || "Product Brands (No Reply) <support@productbrands.com>"

const SITE_URL = "https://www.productbrands.com"
const LOGO_URL = `${SITE_URL}/images/logo.png`

const ISSUER = {
  legalName: "Southern Basics LLC",
  address: "8001 NW 54th St, Doral FL, 33166",
  phone: "+1 305-600-3157",
  phoneHref: "tel:+13056003157",
  email: "info@productbrands.com",
}

type EmailOrderItem = {
  productName: string
  sku?: string | null
  weight?: string | null
  quantity: number
  unitPrice: number
  totalPrice: number
}

type EmailOrder = {
  id: string
  invoiceNumber?: number | null
  customerName: string
  customerEmail: string
  customerPhone?: string | null
  companyName?: string | null
  deliveryType: string
  deliveryDate?: Date | string | null
  shippingCost: number
  subtotal: number
  totalAmount: number
  processingFee?: number | null
  paymentMethodType?: string | null
  stripePaymentIntent?: string | null
  terms?: string | null
  createdAt: Date | string
  items: EmailOrderItem[]
}

const esc = (v: unknown) =>
  String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")

const money = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n || 0)

const fmtDate = (d?: Date | string | null) =>
  d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }) : null

const FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"

function methodLabel(type?: string | null) {
  if (!type) return "Online payment"
  if (type === "us_bank_account") return "ACH Bank Transfer"
  if (type.startsWith("card:")) {
    const funding = type.split(":")[1]
    return funding === "credit" ? "Credit Card" : funding === "debit" ? "Debit Card" : "Card"
  }
  return "Online payment"
}

/** Shared outer shell: logo header, white card, no-reply footer. */
function shell(preheader: string, inner: string) {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Product Brands</title></head>
<body style="margin:0;padding:0;background-color:#f1f5f9;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9;">
<tr><td align="center" style="padding:32px 12px;">
  <table role="presentation" width="640" cellpadding="0" cellspacing="0" style="width:100%;max-width:640px;background-color:#ffffff;border:1px solid #e2e8f0;border-radius:14px;overflow:hidden;font-family:${FONT};color:#0f172a;">
    <tr><td align="center" style="padding:36px 32px 24px 32px;border-bottom:1px solid #e2e8f0;">
      <a href="${SITE_URL}" target="_blank" rel="noopener" style="text-decoration:none;">
        <img src="${LOGO_URL}" width="300" alt="Product Brands" style="display:block;width:300px;max-width:100%;height:auto;border:0;" />
      </a>
      <div style="margin-top:12px;font-size:11px;letter-spacing:2.5px;text-transform:uppercase;color:#64748b;font-weight:600;">Wholesale Distribution &amp; Commercial Supply</div>
    </td></tr>
    ${inner}
    <tr><td style="padding:24px 32px;background-color:#f8fafc;border-top:1px solid #e2e8f0;font-size:12px;line-height:1.6;color:#64748b;text-align:center;">
      <strong style="color:#334155;">${ISSUER.legalName}</strong> &middot; ${ISSUER.address}<br/>
      <a href="mailto:${ISSUER.email}" style="color:#334155;">${ISSUER.email}</a> &middot; <a href="${ISSUER.phoneHref}" style="color:#334155;">${ISSUER.phone}</a>
      <div style="margin-top:14px;padding-top:14px;border-top:1px solid #e2e8f0;color:#94a3b8;font-size:11px;">
        This is an automated message from a <strong>no-reply</strong> address. Replies to this email are not monitored.<br/>
        For questions about this invoice, contact us at ${ISSUER.email} or ${ISSUER.phone}.
      </div>
    </td></tr>
  </table>
</td></tr>
</table>
</body>
</html>`
}

function itemsTable(order: EmailOrder, opts: { showFee: boolean; totalLabel: string; total: number }) {
  const rows = order.items
    .map(
      (it) => `
      <tr>
        <td style="padding:12px 0;border-bottom:1px solid #f1f5f9;font-size:14px;color:#0f172a;">
          <div style="font-weight:600;">${esc(it.productName)}</div>
          <div style="font-size:12px;color:#64748b;margin-top:2px;">${[it.sku ? `SKU ${esc(it.sku)}` : "", it.weight ? esc(it.weight) : ""].filter(Boolean).join(" &middot; ")}</div>
        </td>
        <td align="center" style="padding:12px 8px;border-bottom:1px solid #f1f5f9;font-size:14px;color:#334155;white-space:nowrap;">${it.quantity}</td>
        <td align="right" style="padding:12px 8px;border-bottom:1px solid #f1f5f9;font-size:14px;color:#334155;white-space:nowrap;">${money(it.unitPrice)}</td>
        <td align="right" style="padding:12px 0;border-bottom:1px solid #f1f5f9;font-size:14px;font-weight:600;color:#0f172a;white-space:nowrap;">${money(it.totalPrice)}</td>
      </tr>`
    )
    .join("")

  const line = (label: string, value: string, strong = false) => `
      <tr>
        <td colspan="3" align="right" style="padding:6px 8px 6px 0;font-size:${strong ? "16px" : "13px"};color:${strong ? "#0f172a" : "#64748b"};font-weight:${strong ? "700" : "400"};">${label}</td>
        <td align="right" style="padding:6px 0;font-size:${strong ? "18px" : "13px"};color:#0f172a;font-weight:${strong ? "800" : "600"};white-space:nowrap;">${value}</td>
      </tr>`

  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <th align="left" style="padding:0 0 8px 0;border-bottom:2px solid #0f172a;font-size:11px;letter-spacing:1px;text-transform:uppercase;color:#475569;">Product</th>
        <th align="center" style="padding:0 8px 8px 8px;border-bottom:2px solid #0f172a;font-size:11px;letter-spacing:1px;text-transform:uppercase;color:#475569;">Qty</th>
        <th align="right" style="padding:0 8px 8px 8px;border-bottom:2px solid #0f172a;font-size:11px;letter-spacing:1px;text-transform:uppercase;color:#475569;">Unit</th>
        <th align="right" style="padding:0 0 8px 0;border-bottom:2px solid #0f172a;font-size:11px;letter-spacing:1px;text-transform:uppercase;color:#475569;">Amount</th>
      </tr>
      ${rows}
      <tr><td colspan="4" style="height:8px;"></td></tr>
      ${line("Subtotal", money(order.subtotal))}
      ${line("Freight &amp; Delivery", order.shippingCost > 0 ? money(order.shippingCost) : "Included")}
      ${opts.showFee && (order.processingFee || 0) > 0 ? line("Credit card surcharge", money(order.processingFee || 0)) : ""}
      <tr><td colspan="4" style="padding-top:6px;"><div style="border-top:1px solid #e2e8f0;"></div></td></tr>
      ${line(opts.totalLabel, money(opts.total), true)}
    </table>`
}

function detailsGrid(cells: Array<[string, string]>) {
  const tds = cells
    .map(
      ([label, value]) => `
      <td valign="top" width="${Math.floor(100 / cells.length)}%" style="padding:14px 12px;">
        <div style="font-size:10px;letter-spacing:1.5px;text-transform:uppercase;color:#94a3b8;font-weight:700;">${label}</div>
        <div style="margin-top:4px;font-size:14px;color:#0f172a;font-weight:600;">${value}</div>
      </td>`
    )
    .join("")
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;"><tr>${tds}</tr></table>`
}

function partiesBlock(order: EmailOrder) {
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td valign="top" width="50%" style="padding-right:12px;font-size:13px;line-height:1.6;color:#475569;">
          <div style="font-size:10px;letter-spacing:1.5px;text-transform:uppercase;color:#94a3b8;font-weight:700;margin-bottom:4px;">Billed To</div>
          <div style="font-size:14px;font-weight:700;color:#0f172a;">${esc(order.customerName)}</div>
          ${order.companyName ? `<div>${esc(order.companyName)}</div>` : ""}
          <div>${esc(order.customerEmail)}</div>
          ${order.customerPhone ? `<div>${esc(order.customerPhone)}</div>` : ""}
        </td>
        <td valign="top" width="50%" style="padding-left:12px;font-size:13px;line-height:1.6;color:#475569;">
          <div style="font-size:10px;letter-spacing:1.5px;text-transform:uppercase;color:#94a3b8;font-weight:700;margin-bottom:4px;">Issued By</div>
          <div style="font-size:14px;font-weight:700;color:#0f172a;">${ISSUER.legalName}</div>
          <div>${ISSUER.address}</div>
          <div>${ISSUER.phone}</div>
          <div>${ISSUER.email}</div>
        </td>
      </tr>
    </table>`
}

function ctaButton(href: string, label: string) {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" align="center" style="margin:0 auto;">
      <tr><td align="center" style="border-radius:10px;background-color:#0f172a;">
        <a href="${href}" target="_blank" rel="noopener" style="display:inline-block;padding:15px 40px;font-family:${FONT};font-size:16px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:10px;">${label}</a>
      </td></tr>
    </table>`
}

/** Invoice email sent from the admin "Send Invoice" action. */
export function buildInvoiceEmail(order: EmailOrder, payUrl: string) {
  const num = formatInvoiceNumber(order)
  const total = money(order.totalAmount)
  const surcharge = getCardSurchargePercent()
  const firstName = esc((order.customerName || "").split(" ")[0] || order.customerName)
  const delivery = fmtDate(order.deliveryDate) || "Confirmed upon payment"
  const fulfillment = order.deliveryType === "PICKUP" ? "Warehouse Pickup" : "Freight Delivery"

  const inner = `
    <tr><td style="padding:28px 32px 8px 32px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td valign="bottom">
            <div style="font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:#94a3b8;font-weight:700;">Invoice</div>
            <div style="font-size:26px;font-weight:800;color:#0f172a;letter-spacing:-0.5px;">${num}</div>
          </td>
          <td valign="bottom" align="right">
            <div style="font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:#94a3b8;font-weight:700;">Amount Due</div>
            <div style="font-size:26px;font-weight:800;color:#0f172a;letter-spacing:-0.5px;">${total}</div>
            <div style="font-size:12px;color:#b45309;font-weight:600;">Due upon receipt</div>
          </td>
        </tr>
      </table>
    </td></tr>

    <tr><td style="padding:16px 32px 0 32px;font-size:15px;line-height:1.6;color:#334155;">
      Hello ${firstName},<br/><br/>
      Thank you for your order. Your invoice from <strong>Product Brands</strong> is ready. Review the details below and pay securely online by ACH bank transfer or card.
    </td></tr>

    <tr><td style="padding:28px 32px;">
      ${ctaButton(payUrl, `View &amp; Pay Invoice &mdash; ${total}`)}
    </td></tr>

    <tr><td style="padding:0 32px 24px 32px;">
      ${detailsGrid([
        ["Issue Date", fmtDate(order.createdAt) || ""],
        ["Fulfillment", fulfillment],
        ["Est. Delivery", esc(delivery)],
      ])}
    </td></tr>

    <tr><td style="padding:0 32px 24px 32px;">${partiesBlock(order)}</td></tr>

    <tr><td style="padding:0 32px 8px 32px;">
      ${itemsTable(order, { showFee: false, totalLabel: "Total Due", total: order.totalAmount })}
    </td></tr>

    <tr><td style="padding:20px 32px 28px 32px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;">
        <tr><td style="padding:16px 18px;font-size:13px;line-height:1.7;color:#475569;">
          <div style="font-size:10px;letter-spacing:1.5px;text-transform:uppercase;color:#94a3b8;font-weight:700;margin-bottom:6px;">Payment Options</div>
          <strong style="color:#0f172a;">ACH Bank Transfer</strong> &mdash; no fee<br/>
          <strong style="color:#0f172a;">Debit Card</strong> &mdash; no fee<br/>
          <strong style="color:#0f172a;">Credit Card</strong> &mdash; ${surcharge}% surcharge, shown before you pay
        </td></tr>
      </table>
      <div style="margin-top:16px;font-size:12px;line-height:1.6;color:#94a3b8;text-align:center;">
        Button not working? Copy this link into your browser:<br/>
        <a href="${payUrl}" style="color:#475569;word-break:break-all;">${payUrl}</a>
      </div>
      <div style="margin-top:16px;font-size:12px;line-height:1.6;color:#94a3b8;text-align:center;">
        Payment is subject to our Wholesale Terms of Sale, available on the invoice page.
      </div>
    </td></tr>`

  return {
    subject: `Invoice ${num} from Product Brands — ${total} due`,
    html: shell(`Invoice ${num} for ${total} is ready to pay online.`, inner),
  }
}

/** Receipt email sent once payment is confirmed. */
export function buildReceiptEmail(order: EmailOrder) {
  const num = formatInvoiceNumber(order)
  const paidTotal = order.totalAmount + (order.processingFee || 0)
  const firstName = esc((order.customerName || "").split(" ")[0] || order.customerName)

  const inner = `
    <tr><td style="padding:28px 32px 8px 32px;" align="center">
      <div style="display:inline-block;padding:6px 14px;border-radius:999px;background-color:#dcfce7;color:#166534;font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;">Payment Received</div>
      <div style="margin-top:14px;font-size:30px;font-weight:800;color:#0f172a;letter-spacing:-0.5px;">${money(paidTotal)}</div>
      <div style="margin-top:4px;font-size:13px;color:#64748b;">Invoice ${num} &middot; ${methodLabel(order.paymentMethodType)}</div>
    </td></tr>

    <tr><td style="padding:20px 32px 0 32px;font-size:15px;line-height:1.6;color:#334155;">
      Hello ${firstName},<br/><br/>
      Thank you &mdash; we've received your payment and your order is confirmed for fulfillment. A summary is below for your records.
    </td></tr>

    <tr><td style="padding:24px 32px;">
      ${detailsGrid([
        ["Invoice", num],
        ["Paid On", fmtDate(new Date()) || ""],
        ["Fulfillment", order.deliveryType === "PICKUP" ? "Warehouse Pickup" : "Freight Delivery"],
      ])}
    </td></tr>

    <tr><td style="padding:0 32px 24px 32px;">${partiesBlock(order)}</td></tr>

    <tr><td style="padding:0 32px 28px 32px;">
      ${itemsTable(order, { showFee: true, totalLabel: "Total Paid", total: paidTotal })}
      ${order.stripePaymentIntent ? `<div style="margin-top:16px;font-size:11px;color:#94a3b8;text-align:right;">Payment reference: ${esc(order.stripePaymentIntent)}</div>` : ""}
    </td></tr>`

  return {
    subject: `Payment received — Invoice ${num} (Product Brands)`,
    html: shell(`We received your payment of ${money(paidTotal)} for invoice ${num}.`, inner),
  }
}
