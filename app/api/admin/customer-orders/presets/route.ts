import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { PERMISSIONS, hasEffectivePermission } from "@/lib/permissions"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    const userRole = (session?.user as any)?.role
    const customPermissions = (session?.user as any)?.customPermissions || []

    if (!session || !hasEffectivePermission(userRole, customPermissions, PERMISSIONS.ORDERS)) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const query = searchParams.get("query") || ""

    // Fetch from presets
    const presets = await prisma.invoiceProductPreset.findMany({
      where: query ? {
        OR: [
          { name: { contains: query, mode: "insensitive" as const } },
          { sku: { contains: query, mode: "insensitive" as const } },
          { description: { contains: query, mode: "insensitive" as const } },
        ]
      } : undefined,
      orderBy: { updatedAt: "desc" },
      take: 50,
    })

    // Also search existing catalog products to suggest if available
    let catalogProducts: any[] = []
    if (query) {
      catalogProducts = await prisma.product.findMany({
        where: {
          isActive: true,
          OR: [
            { name: { contains: query, mode: "insensitive" } },
            { sku: { contains: query, mode: "insensitive" } },
            { asin: { contains: query, mode: "insensitive" } },
          ]
        },
        select: {
          id: true,
          name: true,
          sku: true,
          priceAmount: true,
          imageUrl: true,
          description: true,
        },
        take: 10,
      })
    }

    return NextResponse.json({
      presets,
      catalogProducts: catalogProducts.map(p => ({
        id: `cat-${p.id}`,
        name: p.name,
        sku: p.sku || "",
        unitPrice: p.priceAmount || 0,
        imageUrl: p.imageUrl || "",
        description: p.description || "",
        weight: "",
        isFromCatalog: true,
      }))
    })
  } catch (error) {
    console.error("[PRESETS_GET]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    const userRole = (session?.user as any)?.role
    const customPermissions = (session?.user as any)?.customPermissions || []

    if (!session || !hasEffectivePermission(userRole, customPermissions, PERMISSIONS.ORDERS)) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const body = await req.json()
    const { name, sku, weight, description, unitPrice, imageUrl, category } = body

    if (!name) {
      return NextResponse.json({ error: "Product name is required" }, { status: 400 })
    }

    // Check if preset already exists with same name or sku, update or create
    const existing = await prisma.invoiceProductPreset.findFirst({
      where: {
        OR: [
          { name: { equals: name, mode: "insensitive" as const } },
          ...(sku ? [{ sku: { equals: sku, mode: "insensitive" as const } }] : [])
        ]
      }
    })

    let preset
    if (existing) {
      preset = await prisma.invoiceProductPreset.update({
        where: { id: existing.id },
        data: {
          name,
          sku: sku || existing.sku,
          weight: weight || existing.weight,
          description: description || existing.description,
          unitPrice: typeof unitPrice === "number" ? unitPrice : (parseFloat(unitPrice) || existing.unitPrice),
          imageUrl: imageUrl || existing.imageUrl,
          category: category || existing.category,
        }
      })
    } else {
      preset = await prisma.invoiceProductPreset.create({
        data: {
          name,
          sku: sku || null,
          weight: weight || null,
          description: description || null,
          unitPrice: typeof unitPrice === "number" ? unitPrice : (parseFloat(unitPrice) || 0),
          imageUrl: imageUrl || null,
          category: category || null,
        }
      })
    }

    return NextResponse.json(preset)
  } catch (error) {
    console.error("[PRESETS_POST]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}
