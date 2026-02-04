import { PrismaClient } from "@prisma/client"

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL
  
  // Use Neon serverless adapter only when DATABASE_URL is available (runtime)
  if (connectionString && process.env.VERCEL) {
    // Dynamic import to avoid build-time issues
    const { neonConfig } = require("@neondatabase/serverless")
    const { PrismaNeon } = require("@prisma/adapter-neon")
    const ws = require("ws")
    
    neonConfig.webSocketConstructor = ws
    const adapter = new PrismaNeon({ connectionString })
    return new PrismaClient({ adapter } as any)
  }
  
  // Standard Prisma client for local development or build time
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  })
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma
}

