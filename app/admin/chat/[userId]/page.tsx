import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import ChatAdminInterface from "../chat-admin-interface"

export default async function AdminChatDetailPage({
  params,
}: {
  params: { userId: string }
}) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any)?.role !== "ADMIN") {
    redirect("/login")
  }

  // This page will redirect to the main chat page with user param
  redirect(`/admin/chat?user=${params.userId}`)
}

