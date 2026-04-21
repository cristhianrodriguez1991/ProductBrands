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

    const machines = await prisma.machine.findMany({
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json(machines)
  } catch (error) {
    console.error("[MACHINES_GET]", error)
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
    const { 
      name, 
      modelNumber, 
      serialNumber, 
      manufacturer, 
      purchaseDate, 
      lastMaintenance, 
      nextMaintenance, 
      status, 
      location, 
      notes,
      imageUrl,
      manualUrl
    } = body

    if (!name) {
      return new NextResponse("Name is required", { status: 400 })
    }

    const machine = await prisma.machine.create({
      data: {
        name,
        modelNumber,
        serialNumber,
        manufacturer,
        purchaseDate: purchaseDate ? new Date(purchaseDate) : null,
        lastMaintenance: lastMaintenance ? new Date(lastMaintenance) : null,
        nextMaintenance: nextMaintenance ? new Date(nextMaintenance) : null,
        status: status || "OPERATIONAL",
        location,
        notes,
        imageUrl,
        manualUrl,
      },
    })

    return NextResponse.json(machine)
  } catch (error) {
    console.error("[MACHINES_POST]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}
