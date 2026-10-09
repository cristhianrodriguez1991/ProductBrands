import type { Metadata } from "next"
import { prisma } from "@/lib/prisma"
import { formatInvoiceNumber } from "@/lib/invoice"

export const dynamic = "force-dynamic"

export async function generateMetadata({
  params,
}: {
  params: { id: string }
}): Promise<Metadata> {
  const idOrNum = params.id

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

  const invoiceNo = order ? formatInvoiceNumber(order) : idOrNum.toUpperCase()
  const recipient = order?.companyName || order?.customerName || "Customer"
  const total = order
    ? `$${order.totalAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : ""

  const title = `Wholesale Invoice #${invoiceNo} — Product Brands`
  const description = order
    ? `Official B2B invoice for ${recipient} (${total}). Pay securely online via ACH ($0 Fee) or Credit/Debit Card.`
    : "Product Brands Wholesale & Commercial Supply Invoice. Pay securely online."

  const ogImageUrl = `https://www.productbrands.com/api/og/invoice?id=${encodeURIComponent(idOrNum)}`
  const canonicalUrl = `https://www.productbrands.com/pay/${invoiceNo}`

  return {
    title,
    description,
    openGraph: {
      title: `Invoice #${invoiceNo} — ${recipient} (${total})`,
      description,
      url: canonicalUrl,
      siteName: "Product Brands Wholesale",
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: `Product Brands Invoice #${invoiceNo}`,
        },
      ],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `Invoice #${invoiceNo} — Product Brands`,
      description,
      images: [ogImageUrl],
    },
  }
}

export default function PayLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
