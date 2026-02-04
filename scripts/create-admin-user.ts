/**
 * Script to create the first admin user
 * 
 * Usage: tsx scripts/create-admin-user.ts <email> <password> [role]
 * 
 * Roles: OWNER, ADMIN, SALES, OPS, SUPPORT, READONLY
 * Default: ADMIN
 */

import { PrismaClient, UserRole } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  const email = process.argv[2]
  const password = process.argv[3]
  const role = (process.argv[4] || "ADMIN") as UserRole

  if (!email || !password) {
    console.error("Usage: tsx scripts/create-admin-user.ts <email> <password> [role]")
    process.exit(1)
  }

  // Check if user exists
  const existing = await prisma.user.findUnique({
    where: { email },
  })

  if (existing) {
    console.error(`User with email ${email} already exists`)
    process.exit(1)
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10)

  // Create user
  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      name: email.split("@")[0], // Use email prefix as default name
      role,
      isActive: true,
    },
  })

  console.log(`✅ Admin user created successfully!`)
  console.log(`   Email: ${user.email}`)
  console.log(`   Role: ${user.role}`)
  console.log(`   ID: ${user.id}`)
  console.log(`\n   You can now log in at /login`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
