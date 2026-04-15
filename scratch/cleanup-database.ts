import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🧹 Starting database cleanup...')

  // ORDER MATTERS due to foreign key constraints
  
  // 1. Delete dependent items
  console.log('Deleting Quote dependencies...')
  await prisma.quoteAttachment.deleteMany({})
  await prisma.quoteLineItem.deleteMany({})
  await prisma.quoteMessage.deleteMany({})
  
  console.log('Deleting Order dependencies...')
  await prisma.orderItem.deleteMany({})
  
  console.log('Deleting Message dependencies...')
  await prisma.attachment.deleteMany({})
  await prisma.message.deleteMany({})
  
  console.log('Deleting Invoice and AuditLog...')
  await prisma.invoice.deleteMany({})
  await prisma.auditLog.deleteMany({})
  
  console.log('Deleting Quotes and Orders...')
  await prisma.order.deleteMany({})
  await prisma.quote.deleteMany({})
  
  console.log('Deleting Client Contacts and Documents...')
  await prisma.clientContact.deleteMany({})
  await prisma.clientDocument.deleteMany({})
  
  console.log('Deleting Companies (Clients)...')
  await prisma.company.deleteMany({})
  
  console.log('Deleting Auth sessions and accounts...')
  await prisma.session.deleteMany({})
  await prisma.account.deleteMany({})
  await prisma.verificationToken.deleteMany({})
  
  console.log('Deleting non-admin Users...')
  // Keep admins to prevent lockout
  const deletedUsers = await prisma.user.deleteMany({
    where: {
      role: {
        not: 'ADMIN'
      }
    }
  })
  
  console.log(`✅ Deleted ${deletedUsers.count} non-admin users.`)
  console.log('✨ Cleanup complete!')
}

main()
  .catch((e) => {
    console.error('❌ Cleanup failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
