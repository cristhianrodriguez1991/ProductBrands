import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import WarehouseClient from "./client-page"

export const dynamic = "force-dynamic"

export default async function WarehousePage() {
  const session = await getServerSession(authOptions)

  if (!session || (session.user as any)?.role !== "ADMIN") {
    redirect("/auth/signin")
  }

  let pallets: any[] = []
  try {
    const data = await prisma.warehousePallet.findMany({
      orderBy: { locationCode: "asc" },
    })
    pallets = data.map((p) => ({
      ...p,
      expirationDate: p.expirationDate?.toISOString() || null,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    }))
  } catch {
    // Table may not exist yet — will seed on first load
  }

  return <WarehouseClient initialPallets={pallets} />
}
