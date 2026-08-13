import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session.user as any)?.role !== "ADMIN") {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const products = await prisma.infoProduct.findMany({
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json(products)
  } catch (error) {
    console.error("[INFOPRODUCT_GET]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session.user as any)?.role !== "ADMIN") {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const body = await req.json()
    const { slug, name, tagline, description, features, mediaUrls, actionUrl, isActive } = body

    if (!slug || !name) {
      return new NextResponse("Missing required fields", { status: 400 })
    }

    const existingProduct = await prisma.infoProduct.findUnique({
      where: { slug }
    })

    if (existingProduct) {
      return new NextResponse("Product with this slug already exists", { status: 400 })
    }

    const product = await prisma.infoProduct.create({
      data: {
        slug,
        name,
        tagline,
        description,
        features: features || [],
        mediaUrls: mediaUrls || [],
        actionUrl,
        isActive: isActive !== undefined ? isActive : true,
      }
    })

    return NextResponse.json(product)
  } catch (error) {
    console.error("[INFOPRODUCT_POST]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}
