import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session.user as any)?.role !== "ADMIN") {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const body = await req.json()
    const { slug, name, tagline, description, features, mediaUrls, actionUrl, isActive } = body

    if (slug) {
      const existing = await prisma.infoProduct.findFirst({
        where: {
          slug,
          NOT: { id: params.id }
        }
      })
      if (existing) {
        return new NextResponse("Slug is already in use by another product", { status: 400 })
      }
    }

    const product = await prisma.infoProduct.update({
      where: { id: params.id },
      data: {
        ...(slug && { slug }),
        ...(name && { name }),
        ...(tagline !== undefined && { tagline }),
        ...(description !== undefined && { description }),
        ...(features !== undefined && { features }),
        ...(mediaUrls !== undefined && { mediaUrls }),
        ...(actionUrl !== undefined && { actionUrl }),
        ...(isActive !== undefined && { isActive }),
      }
    })

    return NextResponse.json(product)
  } catch (error) {
    console.error("[INFOPRODUCT_PATCH]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session.user as any)?.role !== "ADMIN") {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    await prisma.infoProduct.delete({
      where: { id: params.id }
    })

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error("[INFOPRODUCT_DELETE]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}
