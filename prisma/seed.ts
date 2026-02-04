import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  console.log("Seeding database...")

  // Create admin user
  const adminPassword = await bcrypt.hash("admin123", 10)
  const admin = await prisma.user.upsert({
    where: { email: "admin@productbrands.com" },
    update: {},
    create: {
      email: "admin@productbrands.com",
      name: "Admin User",
      password: adminPassword,
      role: "ADMIN",
    },
  })
  console.log("Created admin user:", admin.email)

  // Create demo company
  const company = await prisma.company.upsert({
    where: { id: "demo-company-1" },
    update: {},
    create: {
      id: "demo-company-1",
      name: "Demo Company",
      address: "123 Main St",
      city: "San Francisco",
      state: "CA",
      country: "USA",
      postalCode: "94102",
      phone: "+1-555-0123",
    },
  })
  console.log("Created company:", company.name)

  // Create demo customer user
  const customerPassword = await bcrypt.hash("customer123", 10)
  const customer = await prisma.user.upsert({
    where: { email: "customer@demo.com" },
    update: {},
    create: {
      email: "customer@demo.com",
      name: "Demo Customer",
      password: customerPassword,
      role: "CUSTOMER",
      companyId: company.id,
    },
  })
  console.log("Created customer user:", customer.email)

  // Create sample quote
  const quote = await prisma.quote.create({
    data: {
      quoteNumber: `QUOTE-${new Date().getFullYear()}-0001`,
      companyId: company.id,
      createdById: customer.id,
      status: "NEW",
      productCategory: "food",
      productDescription: "Premium coffee beans for private label",
      targetCustomer: "B2C, E-commerce",
      packagingType: "bags",
      labelingNeeds: ["Custom Labels", "Logo Design"],
      estimatedQuantity: "5000-10000",
      timeline: "8-12 weeks",
      shippingDestination: "San Francisco, CA, USA",
    },
  })
  console.log("Created sample quote:", quote.quoteNumber)

  // Create sample order
  const order = await prisma.order.create({
    data: {
      orderNumber: `ORD-${new Date().getFullYear()}-0001`,
      companyId: company.id,
      createdById: customer.id,
      status: "IN_PRODUCTION",
      subtotal: 5000,
      tax: 500,
      shipping: 200,
      total: 5700,
      depositPaid: 2000,
      balanceDue: 3700,
      shippingAddress: "123 Main St",
      shippingCity: "San Francisco",
      shippingState: "CA",
      shippingCountry: "USA",
      shippingPostalCode: "94102",
      items: {
        create: [
          {
            name: "Premium Coffee - 12oz",
            sku: "COFFEE-12OZ-001",
            quantity: 1000,
            unitPrice: 5,
            totalPrice: 5000,
            description: "Premium roasted coffee beans",
          },
        ],
      },
    },
  })
  console.log("Created sample order:", order.id)

  // Create sample invoice
  const invoice = await prisma.invoice.create({
    data: {
      orderId: order.id,
      companyId: company.id,
      createdById: admin.id,
      invoiceNumber: `INV-${Date.now()}`,
      status: "SENT",
      amount: 2000,
      tax: 0,
      total: 2000,
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    },
  })
  console.log("Created sample invoice:", invoice.invoiceNumber)

  console.log("Seeding completed!")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

