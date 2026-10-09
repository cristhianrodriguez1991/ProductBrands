import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(req.url)
    const type = searchParams.get("type") || "signature"
    const index = parseInt(searchParams.get("index") || "0", 10)

    const idOrNum = params.id
    let order = await prisma.customerOrder.findUnique({
      where: { id: idOrNum },
      select: {
        signatureDataUrl: true,
        deliveryPhotos: true,
      },
    })

    if (!order && /^PB\d+$/i.test(idOrNum)) {
      const invNum = parseInt(idOrNum.replace(/^PB/i, ""), 10) - 3000
      if (invNum > 0) {
        order = await prisma.customerOrder.findUnique({
          where: { invoiceNumber: invNum },
          select: {
            signatureDataUrl: true,
            deliveryPhotos: true,
          },
        })
      }
    }

    if (!order) {
      return new NextResponse("Order not found", { status: 404 })
    }

    let targetUrl: string | null = null

    if (type === "signature") {
      targetUrl = order.signatureDataUrl || null
    } else if (type === "photo") {
      if (order.deliveryPhotos && order.deliveryPhotos[index]) {
        targetUrl = order.deliveryPhotos[index]
      }
    }

    if (!targetUrl) {
      // 1x1 transparent GIF placeholder
      const transparentGif = Buffer.from(
        "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
        "base64"
      )
      return new Response(transparentGif, {
        headers: {
          "Content-Type": "image/gif",
          "Cache-Control": "public, max-age=3600",
        },
      })
    }

    // If it's a data URL, decode and serve raw image bytes
    if (targetUrl.startsWith("data:")) {
      const matches = targetUrl.match(/^data:([^;]+);base64,(.+)$/)
      if (matches) {
        const mimeType = matches[1] || "image/png"
        const buffer = Buffer.from(matches[2], "base64")

        return new Response(buffer, {
          headers: {
            "Content-Type": mimeType,
            "Cache-Control": "public, max-age=31536000, immutable",
          },
        })
      }
    }

    // If it's a relative URL, redirect to full public URL
    if (targetUrl.startsWith("/")) {
      const origin = process.env.NEXTAUTH_URL || "https://www.productbrands.com"
      return NextResponse.redirect(`${origin}${targetUrl}`)
    }

    // If it's an external HTTP/HTTPS URL, redirect directly
    return NextResponse.redirect(targetUrl)
  } catch (error: any) {
    console.error("[ORDER_IMAGE_ROUTE_ERROR]", error)
    return new NextResponse("Internal server error", { status: 500 })
  }
}
