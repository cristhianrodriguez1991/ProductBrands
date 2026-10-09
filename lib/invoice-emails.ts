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
  deliveryPhotos?: string[]
  signatureDataUrl?: string | null
  signedByName?: string | null
  signedAt?: Date | string | null
  noSignatureRequired?: boolean
  deliveredAt?: Date | string | null
  deliveryNotes?: string | null
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
  if (type === "card" || type.startsWith("card:")) {
    return "Credit / Debit Card"
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
      ${opts.showFee && (order.processingFee || 0) > 0 ? line("Card processing fee", money(order.processingFee || 0)) : ""}
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
          <strong style="color:#0f172a;">ACH Bank Transfer</strong> &mdash; $0.00 fee (Free)<br/>
          <strong style="color:#0f172a;">Credit &amp; Debit Card</strong> &mdash; 2.9% + $0.30 processing fee
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
      <div style="display:inline-block;padding:6px 16px;border-radius:999px;background-color:#dcfce7;color:#166534;font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;">
        Order Confirmed &amp; Paid
      </div>
      <div style="margin-top:14px;font-size:32px;font-weight:800;color:#0f172a;letter-spacing:-0.5px;">${money(paidTotal)}</div>
      <div style="margin-top:6px;font-size:14px;color:#475569;font-weight:600;">
        Confirmation #${num} &middot; ${methodLabel(order.paymentMethodType)}
      </div>
    </td></tr>

    <tr><td style="padding:20px 32px 0 32px;font-size:15px;line-height:1.6;color:#334155;">
      Hello ${firstName},<br/><br/>
      Your order has been confirmed! We have received your payment in full, and your order is now queued for ${order.deliveryType === "PICKUP" ? "warehouse pickup" : "freight delivery"}. Please keep this confirmation and order details for your records.
    </td></tr>

    <tr><td style="padding:24px 32px;">
      ${detailsGrid([
        ["Confirmation #", num],
        ["Paid Date", fmtDate(new Date()) || ""],
        ["Fulfillment", order.deliveryType === "PICKUP" ? "Warehouse Pickup" : "Freight Delivery"],
      ])}
    </td></tr>

    <tr><td style="padding:0 32px 24px 32px;">${partiesBlock(order)}</td></tr>

    <tr><td style="padding:0 32px 28px 32px;">
      ${itemsTable(order, { showFee: true, totalLabel: "Total Confirmed &amp; Paid", total: paidTotal })}
      <div style="margin-top:16px;font-size:12px;color:#64748b;display:flex;justify-content:space-between;">
        <span>Payment Authorization: ${esc(order.stripePaymentIntent || "Verified Online")}</span>
        <span>Status: Confirmed</span>
      </div>
    </td></tr>`

  return {
    subject: `Order Confirmed: Invoice ${num} from Product Brands`,
    html: shell(`Your order #${num} has been confirmed. Total paid: ${money(paidTotal)}.`, inner),
  }
}

function deliveredItemsTable(order: EmailOrder) {
  const rows = order.items
    .map(
      (it) => `
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;font-size:13px;color:#0f172a;">
          <div style="font-weight:600;">${esc(it.productName)}</div>
          <div style="font-size:11px;color:#64748b;margin-top:2px;">${[it.sku ? `SKU: ${esc(it.sku)}` : "", it.weight ? esc(it.weight) : ""].filter(Boolean).join(" &middot; ")}</div>
        </td>
        <td align="center" style="padding:10px 8px;border-bottom:1px solid #f1f5f9;font-size:13px;font-weight:700;color:#0f172a;white-space:nowrap;">${it.quantity}</td>
        <td align="right" style="padding:10px 0;border-bottom:1px solid #f1f5f9;font-size:12px;font-weight:600;color:#16a34a;white-space:nowrap;">&#10003; Received / Complete</td>
      </tr>`
    )
    .join("")

  const totalUnits = order.items.reduce((sum, it) => sum + (it.quantity || 0), 0)

  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <th align="left" style="padding:0 0 8px 0;border-bottom:2px solid #0f172a;font-size:11px;letter-spacing:1px;text-transform:uppercase;color:#475569;">Item Description</th>
        <th align="center" style="padding:0 8px 8px 8px;border-bottom:2px solid #0f172a;font-size:11px;letter-spacing:1px;text-transform:uppercase;color:#475569;">Qty Delivered</th>
        <th align="right" style="padding:0 0 8px 0;border-bottom:2px solid #0f172a;font-size:11px;letter-spacing:1px;text-transform:uppercase;color:#475569;">Condition</th>
      </tr>
      ${rows}
      <tr>
        <td colspan="3" align="right" style="padding:10px 0 0 0;font-size:12px;color:#64748b;font-weight:600;">
          Total Units Delivered: <strong style="color:#0f172a;">${totalUnits} units</strong>
        </td>
      </tr>
    </table>`
}

/** Delivery Confirmation & Proof of Delivery (POD) email with everything embedded directly in the email body. */
export function buildDeliveryConfirmationEmail(order: EmailOrder) {
  const num = formatInvoiceNumber(order)
  const podPrintUrl = `${SITE_URL}/orders/${order.id}/pod/print`
  const signatureSrc = `${SITE_URL}/api/orders/${order.id}/image?type=signature`

  const deliveryTimestamp = order.deliveredAt
    ? new Date(order.deliveredAt).toLocaleString("en-US", { dateStyle: "long", timeStyle: "short" })
    : order.signedAt
      ? new Date(order.signedAt).toLocaleString("en-US", { dateStyle: "long", timeStyle: "short" })
      : new Date().toLocaleString("en-US", { dateStyle: "long", timeStyle: "short" })

  const signedTimestamp = order.signedAt
    ? new Date(order.signedAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })
    : deliveryTimestamp

  const totalUnits = order.items.reduce((acc, it) => acc + (it.quantity || 0), 0)

  const photosHtml = order.deliveryPhotos && order.deliveryPhotos.length > 0
    ? `
      <tr>
        <td style="padding:16px 28px;border-top:1px solid #e2e8f0;">
          <div style="font-size:10px;letter-spacing:1.5px;text-transform:uppercase;color:#475569;font-weight:800;margin-bottom:10px;">
            Delivery Confirmation Photos (${order.deliveryPhotos.length})
          </div>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td align="center">
                ${order.deliveryPhotos.map((url, idx) => {
                  const photoSrc = (url.startsWith("data:") || url.startsWith("/"))
                    ? `${SITE_URL}/api/orders/${order.id}/image?type=photo&index=${idx}`
                    : url
                  return `
                    <div style="display:inline-block;margin:6px;text-align:center;">
                      <img src="${photoSrc}" alt="Delivery Proof ${idx + 1}" width="300" style="width:300px;max-width:100%;height:auto;border-radius:8px;border:1px solid #cbd5e1;display:block;" />
                    </div>
                  `
                }).join("")}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    `
    : ""

  const signatureHtml = order.noSignatureRequired
    ? `
      <div style="padding:14px;font-size:12px;font-weight:800;color:#854d0e;background-color:#fefce8;border-radius:6px;text-align:center;">
        DELIVERED WITHOUT SIGNATURE (PHOTO VERIFIED)
      </div>
    `
    : order.signatureDataUrl
      ? `
        <div style="background-color:#ffffff;border:1px solid #e2e8f0;border-radius:6px;padding:6px;display:inline-block;">
          <img src="${signatureSrc}" alt="Customer Signature" style="max-height:75px;max-width:240px;display:block;margin:0 auto;" />
        </div>
      `
      : `
        <div style="padding:14px;font-size:11px;color:#94a3b8;text-align:center;">Signature on file</div>
      `

  const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Proof of Delivery — ${num}</title>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:${FONT};color:#0f172a;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">Official Proof of Delivery (POD) for Order #${num}. Complete fulfillment confirmation with verified photos and authorized signature.</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9;">
    <tr>
      <td align="center" style="padding:24px 10px;">
        <table role="presentation" width="660" cellpadding="0" cellspacing="0" style="width:100%;max-width:660px;background-color:#ffffff;border:1px solid #cbd5e1;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.04);">
          
          <tr>
            <td style="padding:24px 28px 18px 28px;border-bottom:2px solid #0f172a;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td valign="top" width="55%">
                    <a href="${SITE_URL}" target="_blank" rel="noopener" style="text-decoration:none;">
                      <img src="${LOGO_URL}" width="220" alt="Product Brands" style="display:block;width:220px;max-width:100%;height:auto;border:0;" />
                    </a>
                    <div style="margin-top:6px;font-size:9px;letter-spacing:1.8px;text-transform:uppercase;color:#64748b;font-weight:700;">Wholesale Distribution &amp; Commercial Supply</div>
                  </td>
                  <td valign="top" width="45%" align="right">
                    <div style="font-size:9px;letter-spacing:1.5px;text-transform:uppercase;color:#94a3b8;font-weight:800;">Official Document</div>
                    <div style="font-size:16px;font-weight:900;color:#0f172a;text-transform:uppercase;letter-spacing:-0.3px;margin-top:2px;">Proof of Delivery (POD)</div>
                    <div style="font-size:16px;font-weight:900;font-family:monospace;color:#0f172a;margin-top:2px;">${num}</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:16px 28px;border-bottom:1px solid #e2e8f0;background-color:#f8fafc;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td valign="top" width="50%" style="font-size:12px;line-height:1.5;color:#475569;padding-right:12px;">
                    <div style="font-size:9px;letter-spacing:1.5px;text-transform:uppercase;color:#94a3b8;font-weight:800;margin-bottom:4px;">Delivered To / Recipient</div>
                    <div style="font-size:14px;font-weight:800;color:#0f172a;">${esc(order.customerName)}</div>
                    ${order.companyName ? `<div style="font-weight:600;color:#334155;margin-top:2px;">${esc(order.companyName)}</div>` : ""}
                    ${order.customerPhone ? `<div style="margin-top:2px;">${esc(order.customerPhone)}</div>` : ""}
                    <div style="margin-top:2px;">${esc(order.customerEmail)}</div>
                  </td>
                  <td valign="top" width="50%" align="right" style="font-size:12px;line-height:1.5;color:#475569;padding-left:12px;">
                    <div style="font-size:9px;letter-spacing:1.5px;text-transform:uppercase;color:#94a3b8;font-weight:800;margin-bottom:4px;">Fulfillment Verification</div>
                    <div style="font-size:14px;font-weight:800;color:#0f172a;">${order.deliveryType === "PICKUP" ? "Warehouse Pickup" : "Freight Delivery"}</div>
                    <div style="font-weight:600;color:#334155;margin-top:2px;">${deliveryTimestamp}</div>
                    ${order.deliveryNotes ? `<div style="font-size:11px;color:#64748b;font-style:italic;margin-top:4px;">Note: ${esc(order.deliveryNotes)}</div>` : ""}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:18px 28px 12px 28px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:8px;">
                <tr>
                  <td style="font-size:10px;letter-spacing:1.5px;text-transform:uppercase;color:#475569;font-weight:800;">
                    Delivered Inventory &amp; Specifications
                  </td>
                  <td align="right" style="font-size:11px;color:#64748b;font-weight:600;">
                    Total Units Delivered: <strong style="color:#0f172a;">${totalUnits} units</strong>
                  </td>
                </tr>
              </table>
              ${deliveredItemsTable(order)}
            </td>
          </tr>

          ${photosHtml}

          <tr>
            <td style="padding:18px 28px 22px 28px;border-top:2px solid #0f172a;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td valign="bottom" width="48%" style="padding-right:12px;font-size:11px;line-height:1.5;color:#64748b;">
                    <strong style="color:#0f172a;font-size:10px;letter-spacing:1px;text-transform:uppercase;display:block;margin-bottom:4px;">
                      Receipt &amp; Acceptance Agreement
                    </strong>
                    By signing, receiver certifies that the goods listed above have been delivered, inspected, and received in full and satisfactory condition without damage or missing items.<br/>
                    <span style="font-size:10px;color:#94a3b8;display:block;margin-top:4px;">
                      Southern Basics LLC &bull; Wholesale Terms of Sale apply &bull; 48-Hour Inspection window
                    </span>
                  </td>
                  <td valign="top" width="52%" style="padding-left:12px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc;border:1px solid #cbd5e1;border-radius:10px;overflow:hidden;">
                      <tr>
                        <td style="padding:8px 14px;background-color:#f1f5f9;border-bottom:1px solid #cbd5e1;">
                          <table role="presentation" width="100%">
                            <tr>
                              <td style="font-size:10px;font-weight:800;letter-spacing:1px;text-transform:uppercase;color:#475569;">Authorized Signature</td>
                              <td align="right" style="font-size:10px;font-weight:800;color:#16a34a;">&#10003; Verified</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td align="center" style="padding:12px 14px 10px 14px;">
                          ${signatureHtml}
                          <table role="presentation" width="100%" style="margin-top:8px;padding-top:6px;border-top:1px solid #e2e8f0;font-size:11px;">
                            <tr>
                              <td align="left">
                                <span style="font-size:9px;text-transform:uppercase;font-weight:700;color:#94a3b8;display:block;">Signer Name</span>
                                <strong style="color:#0f172a;">${esc(order.signedByName || order.customerName || "Recipient")}</strong>
                              </td>
                              <td align="right">
                                <span style="font-size:9px;text-transform:uppercase;font-weight:700;color:#94a3b8;display:block;">Timestamp</span>
                                <span style="font-family:monospace;color:#475569;font-size:10px;">${signedTimestamp}</span>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:14px 28px;background-color:#f8fafc;border-top:1px solid #e2e8f0;font-size:10px;line-height:1.6;color:#64748b;text-align:center;">
              <strong style="color:#334155;">${ISSUER.legalName}</strong> &bull; ${ISSUER.address} &bull; <a href="mailto:${ISSUER.email}" style="color:#334155;">${ISSUER.email}</a> &bull; <a href="${ISSUER.phoneHref}" style="color:#334155;">${ISSUER.phone}</a><br/>
              Official Proof of Delivery (POD) &mdash; Retain for wholesale records and chargeback protection.
            </td>
          </tr>

        </table>

        <div style="margin-top:14px;text-align:center;font-size:11px;color:#94a3b8;">
          Need a printable PDF version? <a href="${podPrintUrl}" target="_blank" rel="noopener" style="color:#475569;font-weight:600;text-decoration:underline;">Print or Save as PDF</a>
        </div>

      </td>
    </tr>
  </table>
</body>
</html>`

  return {
    subject: `Official Proof of Delivery: #${num} | Product Brands`,
    html: fullHtml,
  }
}
