import { ImageResponse } from "next/og"
import { prisma } from "@/lib/prisma"
import { formatInvoiceNumber } from "@/lib/invoice"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const idOrNum = searchParams.get("id") || ""

    let order = await prisma.customerOrder.findUnique({
      where: { id: idOrNum },
      select: {
        id: true,
        invoiceNumber: true,
        customerName: true,
        companyName: true,
        totalAmount: true,
      },
    })

    if (!order && /^PB\d+$/i.test(idOrNum)) {
      const invNum = parseInt(idOrNum.replace(/^PB/i, ""), 10) - 3000
      if (invNum > 0) {
        order = await prisma.customerOrder.findUnique({
          where: { invoiceNumber: invNum },
          select: {
            id: true,
            invoiceNumber: true,
            customerName: true,
            companyName: true,
            totalAmount: true,
          },
        })
      }
    }

    const invoiceNo = order ? formatInvoiceNumber(order) : idOrNum.toUpperCase() || "INVOICE"
    const customer = order?.companyName || order?.customerName || "Valued Wholesale Customer"
    const amountStr = order
      ? `$${order.totalAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      : ""

    return new ImageResponse(
      (
        <div
          style={{
            height: "100%",
            width: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            backgroundColor: "#0b1329",
            backgroundImage: "radial-gradient(circle at 25px 25px, #1e293b 2%, transparent 0%), radial-gradient(circle at 75px 75px, #1e293b 2%, transparent 0%)",
            backgroundSize: "100px 100px",
            padding: "60px 70px",
            fontFamily: "sans-serif",
            border: "12px solid #0f172a",
          }}
        >
          {/* Top Bar */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              borderBottom: "2px solid #334155",
              paddingBottom: "30px",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                <div
                  style={{
                    backgroundColor: "#10b981",
                    color: "#022c22",
                    fontSize: "26px",
                    fontWeight: 900,
                    padding: "6px 14px",
                    borderRadius: "8px",
                  }}
                >
                  PB
                </div>
                <div style={{ fontSize: "38px", fontWeight: 900, color: "#ffffff", letterSpacing: "-1px" }}>
                  Product<span style={{ color: "#38bdf8" }}>Brands</span>
                </div>
              </div>
              <div
                style={{
                  fontSize: "13px",
                  color: "#94a3b8",
                  letterSpacing: "3px",
                  textTransform: "uppercase",
                  marginTop: "8px",
                  fontWeight: 700,
                }}
              >
                Wholesale Distribution &amp; Supply
              </div>
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-end",
              }}
            >
              <div
                style={{
                  backgroundColor: "rgba(16, 185, 129, 0.15)",
                  color: "#34d399",
                  border: "1px solid rgba(52, 211, 153, 0.3)",
                  padding: "8px 18px",
                  borderRadius: "999px",
                  fontSize: "14px",
                  fontWeight: 800,
                  letterSpacing: "1px",
                  textTransform: "uppercase",
                }}
              >
                Official Wholesale Invoice
              </div>
              <div
                style={{
                  fontSize: "44px",
                  fontWeight: 900,
                  color: "#ffffff",
                  fontFamily: "monospace",
                  marginTop: "10px",
                }}
              >
                #{invoiceNo}
              </div>
            </div>
          </div>

          {/* Middle Body */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              backgroundColor: "#111c38",
              borderRadius: "16px",
              padding: "40px 48px",
              border: "1px solid #1e293b",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", maxWidth: "60%" }}>
              <div
                style={{
                  fontSize: "14px",
                  color: "#94a3b8",
                  letterSpacing: "2px",
                  textTransform: "uppercase",
                  fontWeight: 800,
                }}
              >
                Billed To
              </div>
              <div
                style={{
                  fontSize: "36px",
                  fontWeight: 900,
                  color: "#ffffff",
                  marginTop: "8px",
                  lineHeight: 1.2,
                }}
              >
                {customer}
              </div>
              <div
                style={{
                  fontSize: "16px",
                  color: "#cbd5e1",
                  marginTop: "12px",
                }}
              >
                Payment due upon receipt • Secure online checkout
              </div>
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-end",
                backgroundColor: "#0a0f1d",
                padding: "24px 32px",
                borderRadius: "12px",
                border: "1px solid #1e293b",
              }}
            >
              <div
                style={{
                  fontSize: "14px",
                  color: "#94a3b8",
                  letterSpacing: "1.5px",
                  textTransform: "uppercase",
                  fontWeight: 800,
                }}
              >
                Amount Due
              </div>
              <div
                style={{
                  fontSize: "56px",
                  fontWeight: 900,
                  color: "#34d399",
                  letterSpacing: "-1.5px",
                  marginTop: "4px",
                }}
              >
                {amountStr || "$0.00"}
              </div>
            </div>
          </div>

          {/* Bottom Trust Footer */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              color: "#94a3b8",
              fontSize: "15px",
              fontWeight: 600,
            }}
          >
            <div style={{ display: "flex", gap: "24px" }}>
              <span>✓ Direct Bank Transfer (ACH $0.00 Fee)</span>
              <span>✓ Credit &amp; Debit Card Accepted</span>
            </div>
            <div style={{ color: "#38bdf8", fontWeight: 700, fontSize: "16px" }}>
              productbrands.com/pay
            </div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    )
  } catch (error: any) {
    console.error("[OG_INVOICE_ERROR]", error)
    return new Response("Failed to generate image", { status: 500 })
  }
}
