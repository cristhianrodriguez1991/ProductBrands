"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MessageSquare, X, Send, Minimize2 } from "lucide-react"
import { useSession } from "next-auth/react"

interface ChatMessage {
  id: string
  content: string
  senderId: string
  senderName: string
  senderRole: string
  createdAt: string
  isRead: boolean
}

export function ChatWidget() {
  const { data: session } = useSession()
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    if (isOpen && !isMinimized) {
      scrollToBottom()
    }
  }, [messages, isOpen, isMinimized])

  useEffect(() => {
    if (!isOpen || !session) return

    // Fetch messages
    const fetchMessages = async () => {
      try {
        const res = await fetch("/api/chat/messages")
        if (res.ok) {
          const data = await res.json()
          setMessages(data.messages || [])
        }
      } catch (error) {
        console.error("Failed to fetch messages:", error)
      }
    }

    fetchMessages()

    // Poll for new messages every 3 seconds
    const interval = setInterval(fetchMessages, 3000)
    return () => clearInterval(interval)
  }, [isOpen, session])

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || !session) return

    const messageContent = input.trim()
    setInput("")
    setLoading(true)

    try {
      const res = await fetch("/api/chat/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: messageContent }),
      })

      if (res.ok) {
        const data = await res.json()
        setMessages((prev) => [...prev, data.message])
        // Refresh messages to get any admin response
        setTimeout(() => {
          fetch("/api/chat/messages")
            .then((res) => res.json())
            .then((data) => setMessages(data.messages || []))
        }, 500)
      }
    } catch (error) {
      console.error("Failed to send message:", error)
    } finally {
      setLoading(false)
    }
  }

  if (!session) {
    return null // Don't show chat for non-authenticated users
  }

  return (
    <>
      {/* Chat Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 h-14 w-14 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-colors flex items-center justify-center z-50"
          aria-label="Open chat"
        >
          <MessageSquare className="h-6 w-6" />
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <Card className="fixed bottom-6 right-6 w-96 h-[500px] flex flex-col shadow-2xl z-50 border-2">
          <CardHeader className="bg-blue-600 text-white p-4 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Live Chat Support</CardTitle>
              <p className="text-xs opacity-90">We'll respond as soon as possible</p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-white hover:bg-blue-700"
                onClick={() => setIsMinimized(!isMinimized)}
              >
                <Minimize2 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-white hover:bg-blue-700"
                onClick={() => setIsOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          {!isMinimized && (
            <>
              <CardContent className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                {messages.length === 0 ? (
                  <div className="text-center text-gray-500 py-8">
                    <p>No messages yet. Start a conversation!</p>
                  </div>
                ) : (
                  messages.map((message) => {
                    const isOwn = message.senderId === (session.user as any)?.id
                    return (
                      <div
                        key={message.id}
                        className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[80%] rounded-lg p-3 ${
                            isOwn
                              ? "bg-blue-600 text-white"
                              : "bg-white text-gray-900 border"
                          }`}
                        >
                          {!isOwn && (
                            <p className="text-xs font-semibold mb-1 opacity-75">
                              {message.senderName}
                            </p>
                          )}
                          <p className="text-sm">{message.content}</p>
                          <p className={`text-xs mt-1 ${isOwn ? "text-blue-100" : "text-gray-500"}`}>
                            {new Date(message.createdAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                      </div>
                    )
                  })
                )}
                <div ref={messagesEndRef} />
              </CardContent>
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
            </>
          )}
        </Card>
      )}
    </>
  )
}

