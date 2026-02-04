/**
 * One-time setup: create or reset an admin user in the same DB this app uses (e.g. production).
 * - GET: show a simple form (so opening the URL in the browser doesn't 404).
 * - POST: create/update admin. Auth via Authorization: Bearer <SETUP_SECRET> or body.secret.
 */

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { UserRole } from "@prisma/client"

function getSecretFromRequest(req: NextRequest, body: any): string | null {
  const authHeader = req.headers.get("authorization")
  if (authHeader?.startsWith("Bearer ")) return authHeader.slice(7)
  if (body?.secret) return body.secret
  return null
}

export async function GET() {
  const secret = process.env.SETUP_SECRET
  if (!secret) {
    return new NextResponse(
      "Setup is not configured. Add SETUP_SECRET in Vercel (Environment Variables), then open this page again.",
      { status: 501, headers: { "Content-Type": "text/plain" } }
    )
  }
  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Create admin</title></head>
<body style="font-family:sans-serif;max-width:400px;margin:60px auto;padding:20px;">
  <h1>Create admin account</h1>
  <p>Use this page once to create or reset your admin login. Then remove SETUP_SECRET from Vercel.</p>
  <form method="post" action="/api/setup/create-admin" id="f">
    <p><label>Setup secret (same as SETUP_SECRET in Vercel):<br><input type="password" name="secret" required style="width:100%;padding:8px;"></label></p>
    <p><label>Admin email:<br><input type="email" name="email" value="admin@productbrands.com" required style="width:100%;padding:8px;"></label></p>
    <p><label>Admin password (min 8 characters):<br><input type="password" name="password" required minlength="8" style="width:100%;padding:8px;"></label></p>
    <p><button type="submit">Create admin</button></p>
  </form>
  <p id="msg"></p>
  <script>
    document.getElementById('f').onsubmit = function(e) {
      e.preventDefault();
      var msg = document.getElementById('msg');
      msg.style.color = '';
      msg.textContent = 'Sending...';
      var fd = new FormData(this);
      fetch('/api/setup/create-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret: fd.get('secret'), email: fd.get('email'), password: fd.get('password') })
      }).then(function(r) { return r.json(); }).then(function(d) {
        if (d.message) { msg.style.color = 'green'; msg.textContent = d.message; }
        else { msg.style.color = 'red'; msg.textContent = (d.error || 'Error') + (d.details ? ': ' + d.details : ''); }
      }).catch(function(err) { msg.style.color = 'red'; msg.textContent = 'Error: ' + err; });
    };
  </script>
</body>
</html>
  `
  return new NextResponse(html, {
    headers: { "Content-Type": "text/html" },
  })
}

export async function POST(req: NextRequest) {
  try {
    const secret = process.env.SETUP_SECRET
    if (!secret) {
      return NextResponse.json(
        { error: "SETUP_SECRET not configured. Add it in Vercel env, call this API, then remove it." },
        { status: 501 }
      )
    }

    const body = await req.json().catch(() => ({}))
    const token = getSecretFromRequest(req, body)
    if (token !== secret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

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
  } catch (e: any) {
    console.error("create-admin error:", e)
    const message = e?.message || String(e)
    let hint = ""
    if (message.includes("prisma://")) {
      hint = " In Vercel Environment Variables, set DATABASE_URL to your Neon Postgres URL (it must start with postgresql:// or postgres://, not prisma://)."
    }
    return NextResponse.json(
      { error: "Server error", details: message + hint },
      { status: 500 }
    )
  }
}
