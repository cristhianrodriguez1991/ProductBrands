"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Send } from "lucide-react"
import { formatDateTime } from "@/lib/utils"

interface Message {
  id: string
  content: string
  userId: string
  createdAt: string
  user: {
    name: string | null
    email: string
  }
}

interface Conversation {
  user: {
    id: string
    name: string | null
    email: string
    company: {
      name: string
    } | null
  }
  messages: Message[]
}

export default function ChatAdminInterface({ conversations }: { conversations: Conversation[] }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const selectedUserId = searchParams.get("user")
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const selectedConversation = conversations.find((c) => c.user.id === selectedUserId)

  useEffect(() => {
    if (selectedUserId && selectedConversation) {
      setMessages(selectedConversation.messages)
    }
  }, [selectedUserId, selectedConversation])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  useEffect(() => {
    if (!selectedUserId) return

    // Poll for new messages
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/admin/chat/messages?userId=${selectedUserId}`)
        if (res.ok) {
          const data = await res.json()
          setMessages(data.messages || [])
        }
      } catch (error) {
        console.error("Failed to fetch messages:", error)
      }
    }, 3000)

    return () => clearInterval(interval)
  }, [selectedUserId])

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || !selectedUserId) return

    const content = input.trim()
    setInput("")
    setLoading(true)

    try {
      const res = await fetch("/api/admin/chat/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: selectedUserId, content }),
      })

      if (res.ok) {
        const data = await res.json()
        setMessages((prev) => [...prev, data.message])
      }
    } catch (error) {
      console.error("Failed to send message:", error)
    } finally {
      setLoading(false)
    }
  }

  if (!selectedUserId || !selectedConversation) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">Select a conversation to view messages</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="flex flex-col h-[600px]">
      <CardHeader className="bg-blue-600 text-white">
        <CardTitle className="text-lg">
          Chat with {selectedConversation.user.name || selectedConversation.user.email}
        </CardTitle>
        <p className="text-sm opacity-90">
          {selectedConversation.user.company?.name || "No company"}
        </p>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col p-0">
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
          {messages.map((message) => {
            const isAdmin = message.user.email !== selectedConversation.user.email
            return (
              <div
                key={message.id}
                className={`flex ${isAdmin ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-3 ${
                    isAdmin
                      ? "bg-blue-600 text-white"
                      : "bg-white text-gray-900 border"
                  }`}
                >
                  {!isAdmin && (
                    <p className="text-xs font-semibold mb-1 opacity-75">
                      {message.user.name || message.user.email}
                    </p>
                  )}
                  <p className="text-sm">{message.content}</p>
                  <p className={`text-xs mt-1 ${isAdmin ? "text-blue-100" : "text-gray-500"}`}>
                    {formatDateTime(message.createdAt)}
                  </p>
                </div>
              </div>
            )
          })}
          <div ref={messagesEndRef} />
        </div>
        <div className="border-t p-4 bg-white">
          <form onSubmit={handleSend} className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message..."
              disabled={loading}
              className="flex-1"
            />
            <Button type="submit" disabled={loading || !input.trim()} size="icon">
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </CardContent>
    </Card>
  )
}

