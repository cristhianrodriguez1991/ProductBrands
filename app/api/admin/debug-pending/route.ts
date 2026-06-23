import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export const dynamic = 'force-dynamic';

export async function GET() {
  const activeShipment = await prisma.fbaShipment.findFirst({ where: { status: "ACTIVE" } })
  
  const holdPallets = await prisma.warehousePallet.findMany({
    where: { status: "HOLD" }
  })
  
  const allStatuses = await prisma.warehousePallet.groupBy({
    by: ['status'],
    _count: true,
    where: {
      OR: [
        { productName: { not: null } },
        { sku: { not: null } },
      ]
    }
  })
  
  const occupiedPallets = await prisma.warehousePallet.findMany({
    where: {
      OR: [
        { productName: { not: null } },
        { sku: { not: null } },
      ]
    },
    select: {
      locationCode: true,
      status: true,
      productName: true,
      sku: true,
      quantity: true,
    }
  })
  
  const existingFbaItems = await prisma.fbaShipmentItem.findMany({
    where: { 
      status: { in: ["PENDING", "IN_SHIPMENT"] },
      location: { not: null }
    },
    select: {
      id: true,
      location: true,
      status: true,
      name: true,
    }
  })

  const pendingFbaItems = await prisma.fbaShipmentItem.findMany({
    where: { status: "PENDING" },
    select: { id: true, location: true, name: true }
  })
  
  return NextResponse.json({
    activeShipment: activeShipment ? { id: activeShipment.id, name: activeShipment.name } : null,
    holdPalletCount: holdPallets.length,
    holdPalletLocs: holdPallets.map(p => p.locationCode),
    allOccupiedStatuses: allStatuses,
    occupiedPallets: occupiedPallets.map(p => ({ loc: p.locationCode, status: p.status, name: p.productName, sku: p.sku })),
    existingFbaItemLocs: existingFbaItems.map(i => ({ loc: i.location, status: i.status })),
    pendingFbaItems: pendingFbaItems,
  })
}
