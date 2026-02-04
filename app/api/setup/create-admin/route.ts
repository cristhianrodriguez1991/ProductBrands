/**
 * One-time setup: create or reset an admin user in the same DB this app uses (e.g. production).
 * Call once, then remove SETUP_SECRET from your env for security.
 *
 * POST /api/setup/create-admin
 * Headers: Authorization: Bearer <SETUP_SECRET>
 * Body: { "email": "admin@yoursite.com", "password": "YourSecurePassword" }
 */

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { UserRole } from "@prisma/client"

export async function POST(req: NextRequest) {
  try {
    const secret = process.env.SETUP_SECRET
    if (!secret) {
      return NextResponse.json(
        { error: "SETUP_SECRET not configured. Add it in Vercel env, call this API, then remove it." },
        { status: 501 }
      )
    }

    const authHeader = req.headers.get("authorization")
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null
    if (token !== secret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const email = (body.email as string)?.trim()?.toLowerCase()
    const password = body.password

    if (!email || !password || password.length < 8) {
      return NextResponse.json(
        { error: "Body must include email and password (min 8 characters)." },
        { status: 400 }
      )
    }

    const hashedPassword = await bcrypt.hash(password, 10)
    const existing = await prisma.user.findUnique({ where: { email } })

    if (existing) {
      await prisma.user.update({
        where: { email },
        data: {
          password: hashedPassword,
          role: "ADMIN" as UserRole,
          isActive: true,
        },
      })
      return NextResponse.json({
        success: true,
        message: "Existing user updated to admin. You can log in at /login.",
        email,
      })
    }

    await prisma.user.create({
      data: {
        email,
        name: email.split("@")[0],
        password: hashedPassword,
        role: "ADMIN" as UserRole,
        isActive: true,
      },
    })
    return NextResponse.json({
      success: true,
      message: "Admin user created. You can log in at /login.",
      email,
    })
  } catch (e) {
    console.error("create-admin error:", e)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
