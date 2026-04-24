import { prisma } from "@/lib/prisma"
import MachineSetupClient from "./client-page"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"

export const dynamic = "force-dynamic"

export default async function MachineSetupPage() {
  const session = await getServerSession(authOptions)
  
  if (!session || (session.user as any)?.role !== "ADMIN") {
    redirect("/auth/signin")
  }

  const setups = await prisma.machineSetup.findMany({
    orderBy: { createdAt: "asc" },
  })

  // Prisma returns Dates which cannot be passed directly to client components without stringification
  const serializedSetups = setups.map(setup => ({
    ...setup,
    createdAt: setup.createdAt.toISOString(),
    updatedAt: setup.updatedAt.toISOString(),
  }))

  return <MachineSetupClient initialSetups={serializedSetups} />
}
