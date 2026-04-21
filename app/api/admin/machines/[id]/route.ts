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

    const setup = await prisma.machineSetup.findUnique({
      where: { id: params.id },
    })

    if (!setup) {
      return new NextResponse("Not found", { status: 404 })
    }

    return NextResponse.json(setup)
  } catch (error) {
    console.error("[MACHINE_SETUP_GET]", error)
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
      productName, 
      weightGrams, 
      description, 
      bagSize, 
      presetSpeed, 
      actualSpeed, 
      additionalChanges, 
      productImageUrl, 
      weightingImageUrl, 
      packagingImageUrl, 
      parametersImageUrl 
    } = body

    const setup = await prisma.machineSetup.update({
      where: { id: params.id },
      data: {
        productName,
        weightGrams,
        description,
        bagSize,
        presetSpeed,
        actualSpeed,
        additionalChanges,
        productImageUrl,
        weightingImageUrl,
        packagingImageUrl,
        parametersImageUrl
      },
    })

    return NextResponse.json(setup)
  } catch (error) {
    console.error("[MACHINE_SETUP_PATCH]", error)
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

    await prisma.machineSetup.delete({
      where: { id: params.id },
    })

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error("[MACHINE_SETUP_DELETE]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}
