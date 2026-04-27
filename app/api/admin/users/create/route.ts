import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requirePermissionApi } from "@/lib/rbac"
import { PERMISSIONS } from "@/lib/permissions"
import bcrypt from "bcryptjs"

export async function POST(req: NextRequest) {
  try {
    // Require USERS permission to create users
    const auth = await requirePermissionApi(req, PERMISSIONS.USERS)
    if (auth instanceof NextResponse) return auth

    const body = await req.json()
    const { email, name, password, role, isActive, customPermissions } = body

    // Validate required fields
    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      )
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 400 }
      )
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12)

    // Create user
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        name,
        password: hashedPassword,
        role: role || "SUPPORT",
        isActive: isActive ?? true,
        customPermissions: customPermissions || [],
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        customPermissions: true,
        createdAt: true,
      },
    })

    return NextResponse.json(user, { status: 201 })
  } catch (error) {
    console.error("Error creating user:", error)
    return NextResponse.json(
      { error: "Failed to create user" },
      { status: 500 }
    )
  }
}
