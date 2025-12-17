import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { formatDate } from "@/lib/utils"

export default async function MessagesPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")

  const userId = (session.user as any).id

  const messages = await prisma.message.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: {
      quote: true,
      order: true,
      user: true,
    },
  })

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Messages</h1>
        <p className="text-muted-foreground">Your message history</p>
      </div>

      {messages.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No messages yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {messages.map((message) => (
            <Card key={message.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-medium">{message.user.name || message.user.email}</p>
                    {message.quote && (
                      <p className="text-sm text-muted-foreground">
                        Quote #{message.quote.id.slice(-8)}
                      </p>
                    )}
                    {message.order && (
                      <p className="text-sm text-muted-foreground">
                        Order #{message.order.id.slice(-8)}
                      </p>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{formatDate(message.createdAt)}</p>
                </div>
                <p className="text-sm">{message.content}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

