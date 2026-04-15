import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session.user as any)?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { confirmText } = await req.json()
    if (confirmText !== "DELETE EVERYTHING") {
      return NextResponse.json({ error: "Invalid confirmation text" }, { status: 400 })
    }

    console.log(`[DANGER] Wipe data initiated by ${session.user?.email}`)

    // Use a transaction to ensure all or nothing, although with deleteMany it's quite safe
    await prisma.$transaction(async (tx) => {
      // 1. Delete dependent items
      await tx.quoteAttachment.deleteMany({})
      await tx.quoteLineItem.deleteMany({})
      await tx.quoteMessage.deleteMany({})
      
      await tx.orderItem.deleteMany({})
      
      await tx.attachment.deleteMany({})
      await tx.message.deleteMany({})
      
      await tx.invoice.deleteMany({})
      await tx.auditLog.deleteMany({})
      
      await tx.order.deleteMany({})
      await tx.quote.deleteMany({})
      
      await tx.clientContact.deleteMany({})
      await tx.clientDocument.deleteMany({})
      
      await tx.company.deleteMany({})
      
      await tx.session.deleteMany({
        where: {
          userId: {
            not: (session.user as any).id
          }
        }
      })
      await tx.account.deleteMany({
        where: {
          userId: {
            not: (session.user as any).id
          }
        }
      })
      await tx.verificationToken.deleteMany({})
      
      // Keep only admins to prevent lockout
      await tx.user.deleteMany({
        where: {
          role: {
            not: 'ADMIN'
          }
        }
      })
    })

    return NextResponse.json({ success: true, message: "Database wiped successfully (Admins preserved)" })
  } catch (error: any) {
    console.error("[DANGER] Wipe data failed:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}
