import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session.user as any)?.role !== "ADMIN") {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const machine = await prisma.machine.findUnique({
      where: { id: params.id },
    })

    if (!machine) {
      return new NextResponse("Not found", { status: 404 })
    }

    return NextResponse.json(machine)
  } catch (error) {
    console.error("[MACHINE_GET]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}

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

    const machine = await prisma.machine.update({
      where: { id: params.id },
      data: {
        name,
        modelNumber,
        serialNumber,
        manufacturer,
        purchaseDate: purchaseDate ? new Date(purchaseDate) : null,
        lastMaintenance: lastMaintenance ? new Date(lastMaintenance) : null,
        nextMaintenance: nextMaintenance ? new Date(nextMaintenance) : null,
        status,
        location,
        notes,
        imageUrl,
        manualUrl,
      },
    })

    return NextResponse.json(machine)
  } catch (error) {
    console.error("[MACHINE_PATCH]", error)
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

    await prisma.machine.delete({
      where: { id: params.id },
    })

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error("[MACHINE_DELETE]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}
