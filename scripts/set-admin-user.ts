/**
 * Create an admin user OR reset password/role for an existing user.
 * Use this when you can't log in or need to set up your first admin.
 *
 * Usage: tsx scripts/set-admin-user.ts <email> <password> [role]
 * Example: tsx scripts/set-admin-user.ts you@example.com MyNewPassword123 ADMIN
 *
 * Uses DATABASE_URL from .env (use your production URL to fix production login).
 */

import { PrismaClient, UserRole } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

const VALID_ROLES: UserRole[] = ["OWNER", "ADMIN", "SALES", "OPS", "SUPPORT", "READONLY"]

async function main() {
  const email = process.argv[2]
  const password = process.argv[3]
  const role = (process.argv[4] || "ADMIN") as UserRole

  if (!email || !password) {
    console.error("Usage: tsx scripts/set-admin-user.ts <email> <password> [role]")
    console.error("Example: tsx scripts/set-admin-user.ts admin@mysite.com MyPass123 ADMIN")
    process.exit(1)
  }

  if (!VALID_ROLES.includes(role)) {
    console.error("Role must be one of:", VALID_ROLES.join(", "))
    process.exit(1)
  }

  const hashedPassword = await bcrypt.hash(password, 10)

  const existing = await prisma.user.findUnique({
    where: { email },
  })

  if (existing) {
    await prisma.user.update({
      where: { email },
      data: {
        password: hashedPassword,
        role,
        isActive: true,
      },
    })
    console.log("✅ Existing user updated to admin!")
    console.log("   Email:", email)
    console.log("   Role:", role)
    console.log("   Password has been reset to what you just entered.")
  } else {
    await prisma.user.create({
      data: {
        email,
        name: email.split("@")[0],
        password: hashedPassword,
        role,
        isActive: true,
      },
    })
    console.log("✅ New admin user created!")
    console.log("   Email:", email)
    console.log("   Role:", role)
  }

  console.log("\n   Log in at /login with the email and password you used above.")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
