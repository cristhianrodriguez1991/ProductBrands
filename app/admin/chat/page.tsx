import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatDate, formatDateTime } from "@/lib/utils"
import { ArrowLeft } from "lucide-react"
import ChatAdminInterface from "./chat-admin-interface"

export default async function AdminChatPage() {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any)?.role !== "ADMIN") {
    redirect("/login")
  }

  // Get all chat messages (messages without quote/order association)
  const chatMessages = await prisma.message.findMany({
    where: {
      quoteId: null,
      orderId: null,
      isInternal: false,
    },
    include: {
      user: {
        include: {
          company: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  // Group messages by user
  const messagesByUser = new Map()
  chatMessages.forEach((msg) => {
    const userId = msg.userId
    if (!messagesByUser.has(userId)) {
      messagesByUser.set(userId, {
        user: msg.user,
        messages: [],
        lastMessage: msg.createdAt,
      })
    }
    messagesByUser.get(userId).messages.push(msg)
  })

  const conversations = Array.from(messagesByUser.values()).sort(
    (a, b) => b.lastMessage.getTime() - a.lastMessage.getTime()
  )

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Live Chat Support</h1>
        <p className="text-muted-foreground">Manage customer chat conversations</p>
      </div>

      {conversations.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No chat conversations yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>Conversations</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="space-y-1">
                  {conversations.map((conv) => {
                    const unreadCount = conv.messages.filter(
                      (m: any) => m.userId !== (session.user as any).id
                    ).length
                    return (
                      <Link
                        key={conv.user.id}
                        href={`/admin/chat/${conv.user.id}`}
                        className="block p-4 hover:bg-muted border-b last:border-0"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{conv.user.name || conv.user.email}</p>
                            <p className="text-sm text-muted-foreground">
                              {conv.user.company?.name || "No company"}
                            </p>
                          </div>
                          {unreadCount > 0 && (
                            <Badge className="bg-blue-600">{unreadCount}</Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDateTime(conv.lastMessage)}
                        </p>
                      </Link>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
          <div className="lg:col-span-2">
            <ChatAdminInterface conversations={conversations} />
          </div>
        </div>
      )}
    </div>
  )
}

