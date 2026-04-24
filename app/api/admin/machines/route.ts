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

    const setups = await prisma.machineSetup.findMany({
      orderBy: { createdAt: "asc" },
    })

    return NextResponse.json(setups)
  } catch (error) {
    console.error("[MACHINE_SETUPS_GET]", error)
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

    if (!productName) {
      return new NextResponse("Product Name is required", { status: 400 })
    }

    const setup = await prisma.machineSetup.create({
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
    console.error("[MACHINE_SETUPS_POST]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}
