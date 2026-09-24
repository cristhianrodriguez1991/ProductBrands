import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { PERMISSIONS, hasEffectivePermission } from "@/lib/permissions"
import { getListingDetailsBySkus } from "@/lib/amazon-sp-api-service"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    const userRole = (session?.user as any)?.role
    const customPermissions = (session?.user as any)?.customPermissions || []

    if (!session || !hasEffectivePermission(userRole, customPermissions, PERMISSIONS.PRODUCT_RANKINGS)) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const rankings = await prisma.productRanking.findMany({
      orderBy: { rank: "asc" }
    })

    const ninetyDaysAgo = new Date()
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

    const enrichedRankings = await Promise.all(rankings.map(async (r) => {
      const sales = await prisma.amazonDailySales.findMany({
        where: {
          OR: [
            { sku: r.sku || "" },
            { asin: r.asin || "" }
          ],
          date: { gte: ninetyDaysAgo.toISOString().split("T")[0] }
        }
      })
      
      const now = new Date()
      let sales7 = 0
      let sales30 = 0
      let sales90 = 0

      sales.forEach(sale => {
        const saleDate = new Date(sale.date)
        const diffDays = Math.ceil((now.getTime() - saleDate.getTime()) / (1000 * 3600 * 24))
        if (diffDays <= 7) sales7 += sale.unitsOrdered
        if (diffDays <= 30) sales30 += sale.unitsOrdered
        if (diffDays <= 90) sales90 += sale.unitsOrdered
      })

      return {
        ...r,
        sales7Days: sales7,
        sales30Days: sales30,
        sales90Days: sales90
      }
    }))

    return NextResponse.json(enrichedRankings)
  } catch (error) {
    console.error("[PRODUCT_RANKINGS_GET]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    const userRole = (session?.user as any)?.role
    const customPermissions = (session?.user as any)?.customPermissions || []

    if (!session || !hasEffectivePermission(userRole, customPermissions, PERMISSIONS.PRODUCT_RANKINGS)) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const body = await req.json()
    const { asin, sku, cost } = body

    if (!asin && !sku) {
      return new NextResponse("Missing ASIN or SKU", { status: 400 })
    }

    let price = 0
    let productName = "Unknown Product"
    let imageUrl = null
    let inventory = 0
    
    // Attempt to fetch from MonitoredProduct or InventoryItem first
    const monitored = await prisma.monitoredProduct.findFirst({
      where: {
        OR: [
          { sku: sku || undefined },
          { asin: asin || undefined }
        ]
      }
    })

    if (monitored) {
      price = monitored.currentPrice
      productName = monitored.productName
      imageUrl = monitored.imageUrl || null
    }

    const invItem = await prisma.inventoryItem.findFirst({
      where: {
        OR: [
          { sku: sku || undefined },
          { asin: asin || undefined }
        ]
      }
    })

    if (invItem) {
      inventory = invItem.quantityOnHand
      if (invItem.sellingPrice && price === 0) price = invItem.sellingPrice
      if (invItem.name && productName === "Unknown Product") productName = invItem.name
      if (invItem.imageUrl && !imageUrl) imageUrl = invItem.imageUrl
    }

    // Determine highest rank to append at the end
    const lastRank = await prisma.productRanking.findFirst({
      orderBy: { rank: 'desc' }
    })
    const nextRank = lastRank ? lastRank.rank + 1 : 1

    const created = await prisma.productRanking.create({
      data: {
        asin: asin || sku,
        sku: sku || asin,
        cost: Number(cost) || 0,
        price,
        productName,
        imageUrl,
        rank: nextRank,
        inventory
      }
    })

    return NextResponse.json(created, { status: 201 })
  } catch (error) {
    console.error("[PRODUCT_RANKINGS_POST]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    const userRole = (session?.user as any)?.role
    const customPermissions = (session?.user as any)?.customPermissions || []

    if (!session || !hasEffectivePermission(userRole, customPermissions, PERMISSIONS.PRODUCT_RANKINGS)) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const body = await req.json()
    const { updates } = body // Array of { id, rank, cost }

    if (!Array.isArray(updates)) {
      return new NextResponse("Invalid payload", { status: 400 })
    }

    const transaction = updates.map((u: any) => {
      const data: any = {}
      if (u.rank !== undefined) data.rank = Number(u.rank)
      if (u.cost !== undefined) data.cost = Number(u.cost)
      
      return prisma.productRanking.update({
        where: { id: u.id },
        data
      })
    })

    await prisma.$transaction(transaction)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[PRODUCT_RANKINGS_PATCH]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}
