import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requirePermissionApi } from "@/lib/rbac"
import { PERMISSIONS } from "@/lib/permissions"
import bcrypt from "bcryptjs"

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET single user
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const auth = await requirePermissionApi(req, PERMISSIONS.USERS)
    if (auth instanceof NextResponse) return auth

    const { id } = await params

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        customPermissions: true,
        companyId: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      )
    }

    return NextResponse.json(user)
  } catch (error) {
    console.error("Error fetching user:", error)
    return NextResponse.json(
      { error: "Failed to fetch user" },
      { status: 500 }
    )
  }
}

// PUT/PATCH update user
export async function PUT(req: NextRequest, { params }: RouteParams) {
  try {
    const auth = await requirePermissionApi(req, PERMISSIONS.USERS)
    if (auth instanceof NextResponse) return auth

    const { id } = await params
    const body = await req.json()

    const updateData: any = {}

    if (body.email !== undefined) {
      // Check if email is already taken by another user
      const existingUser = await prisma.user.findFirst({
        where: {
          email: body.email.toLowerCase(),
          NOT: { id },
        },
      })

      if (existingUser) {
        return NextResponse.json(
          { error: "Email already in use by another user" },
          { status: 400 }
        )
      }

      updateData.email = body.email.toLowerCase()
    }

    if (body.name !== undefined) updateData.name = body.name
    if (body.role !== undefined) updateData.role = body.role
    if (body.isActive !== undefined) updateData.isActive = body.isActive
    if (body.customPermissions !== undefined) {
      updateData.customPermissions = body.customPermissions
    }

    if (body.password) {
      updateData.password = await bcrypt.hash(body.password, 12)
    }

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        customPermissions: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return NextResponse.json(user)
  } catch (error) {
    console.error("Error updating user:", error)
    return NextResponse.json(
      { error: "Failed to update user" },
      { status: 500 }
    )
  }
}

// DELETE user
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const auth = await requirePermissionApi(req, PERMISSIONS.USERS)
    if (auth instanceof NextResponse) return auth

    const { id } = await params

    // Prevent self-deletion
    const authUser = await auth
    const userId = (authUser.user as any).id
    if (userId === id) {
      return NextResponse.json(
        { error: "Cannot delete your own account" },
        { status: 400 }
      )
    }

    await prisma.user.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting user:", error)
    return NextResponse.json(
      { error: "Failed to delete user" },
      { status: 500 }
    )
  }
}
