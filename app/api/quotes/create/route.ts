import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { uploadFile } from "@/lib/storage"
import { sendEmail, getQuoteSubmittedEmail } from "@/lib/email"
import { generateQuoteNumber } from "@/lib/admin-utils"
import { z } from "zod"
import bcrypt from "bcryptjs"
import { randomBytes } from "crypto"

const simpleQuoteSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email"),
  phone: z.string().optional(),
  description: z.string().min(1, "Brief description is required"),
})

export async function POST(req: Request) {
  try {
    const formData = await req.formData()
    const name = (formData.get("name") as string)?.trim()
    const email = (formData.get("email") as string)?.trim()?.toLowerCase()
    const phone = (formData.get("phone") as string)?.trim() ?? ""
    const description = (formData.get("description") as string)?.trim()

    const validated = simpleQuoteSchema.parse({ name, email, phone, description })

    const session = await getServerSession(authOptions)
    const fileInput = formData.get("file") as File | null
    const files = fileInput && fileInput.size > 0 ? [fileInput] : []

    let companyId: string
    let userId: string
    let contactId: string | null = null

    if (session?.user && (session.user as any).id && (session.user as any).companyId) {
      // Logged-in user with company: use their account, ensure contact exists
      companyId = (session.user as any).companyId
      userId = (session.user as any).id

      const existingContact = await prisma.clientContact.findFirst({
        where: {
          companyId,
          email: validated.email,
        },
      })

      if (existingContact) {
        contactId = existingContact.id
        await prisma.clientContact.update({
          where: { id: existingContact.id },
          data: {
            name: validated.name,
            phone: validated.phone || existingContact.phone,
          },
        })
      } else {
        const contact = await prisma.clientContact.create({
          data: {
            companyId,
            name: validated.name,
            email: validated.email,
            phone: validated.phone || null,
            isPrimary: true,
          },
        })
        contactId = contact.id
      }
    } else {
      // Guest: find or create contact by email, then company and user
      let contact = await prisma.clientContact.findFirst({
        where: { email: validated.email },
        include: { company: true },
      })

      if (contact) {
        companyId = contact.companyId
        await prisma.clientContact.update({
          where: { id: contact.id },
          data: {
            name: validated.name,
            phone: validated.phone || contact.phone,
          },
        })
        contactId = contact.id
      } else {
        const companyName = validated.name || `Quote from ${validated.email}`
        const company = await prisma.company.create({
          data: { name: companyName },
        })
        companyId = company.id
        const newContact = await prisma.clientContact.create({
          data: {
            companyId,
            name: validated.name,
            email: validated.email,
            phone: validated.phone || null,
            isPrimary: true,
          },
        })
        contactId = newContact.id
      }

      let user = await prisma.user.findUnique({
        where: { email: validated.email },
      })

      if (!user) {
        const hashedPassword = await bcrypt.hash(
          randomBytes(32).toString("hex"),
          10
        )
        user = await prisma.user.create({
          data: {
            email: validated.email,
            name: validated.name,
            password: hashedPassword,
            companyId,
            role: "CUSTOMER",
          },
        })
      } else if (!user.companyId) {
        await prisma.user.update({
          where: { id: user.id },
          data: { companyId },
        })
      }

      userId = user.id
    }

    const quoteNumber = await generateQuoteNumber()

    const quote = await prisma.quote.create({
      data: {
        quoteNumber,
        companyId,
        createdById: userId,
        contactId,
        status: "NEW",
        productDescription: validated.description,
        notesFromClient: validated.description,
      },
    })

    for (const file of files) {
      if (file.size > 0) {
        const { url } = await uploadFile(file, "quotes")
        await prisma.quoteAttachment.create({
          data: {
            quoteId: quote.id,
            fileName: file.name,
            fileUrl: url,
            fileSize: file.size,
            mimeType: file.type,
          },
        })
      }
    }

    const company = await prisma.company.findUnique({
      where: { id: companyId },
    })
    const emailTo = session?.user?.email || validated.email
    if (company && emailTo) {
      const emailData = getQuoteSubmittedEmail(quote.id, company.name)
      await sendEmail({
        to: emailTo,
        ...emailData,
      })
    }

    return NextResponse.json({ success: true, quoteId: quote.id })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0]?.message || "Invalid input", details: error.errors },
        { status: 400 }
      )
    }
    console.error("Quote creation error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
