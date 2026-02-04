import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json()
    
    const results: any = {
      step1_prisma_connect: false,
      step2_user_found: false,
      step3_user_has_password: false,
      step4_password_valid: false,
      user_role: null,
      error: null,
    }

    // Step 1: Test Prisma connection
    try {
      await prisma.$queryRaw`SELECT 1`
      results.step1_prisma_connect = true
    } catch (e: any) {
      results.error = `Prisma connection failed: ${e.message}`
      return NextResponse.json(results)
    }

    // Step 2: Find user
    const normalizedEmail = email?.trim().toLowerCase()
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true, email: true, password: true, role: true, name: true }
    })

    if (!user) {
      results.error = `No user found with email: ${normalizedEmail}`
      return NextResponse.json(results)
    }
    results.step2_user_found = true
    results.user_role = user.role

    // Step 3: Check password exists
    if (!user.password) {
      results.error = "User exists but has no password set"
      return NextResponse.json(results)
    }
    results.step3_user_has_password = true

    // Step 4: Verify password
    const isValid = await bcrypt.compare(password, user.password)
    results.step4_password_valid = isValid

    if (!isValid) {
      results.error = "Password does not match"
    }

    return NextResponse.json(results)
  } catch (e: any) {
    return NextResponse.json({ 
      error: e.message,
      stack: e.stack?.split('\n').slice(0, 5)
    })
  }
}

export async function GET() {
  return new Response(`
    <!DOCTYPE html>
    <html>
    <head><title>Auth Debug</title></head>
    <body style="font-family: system-ui; padding: 40px; max-width: 500px; margin: 0 auto;">
      <h1>Auth Debug</h1>
      <form id="form">
        <div style="margin-bottom: 15px;">
          <label>Email:</label><br>
          <input type="email" name="email" value="admin@productbrands.com" style="width: 100%; padding: 8px;">
        </div>
        <div style="margin-bottom: 15px;">
          <label>Password:</label><br>
          <input type="password" name="password" value="Admin123!" style="width: 100%; padding: 8px;">
        </div>
        <button type="submit" style="padding: 10px 20px; background: #0070f3; color: white; border: none; cursor: pointer;">Test Login</button>
      </form>
      <pre id="result" style="margin-top: 20px; background: #f5f5f5; padding: 15px; border-radius: 5px;"></pre>
      <script>
        document.getElementById('form').onsubmit = async (e) => {
          e.preventDefault();
          const form = e.target;
          const res = await fetch('/api/debug/auth', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: form.email.value,
              password: form.password.value
            })
          });
          const data = await res.json();
          document.getElementById('result').textContent = JSON.stringify(data, null, 2);
        };
      </script>
    </body>
    </html>
  `, { headers: { 'Content-Type': 'text/html' } })
}
