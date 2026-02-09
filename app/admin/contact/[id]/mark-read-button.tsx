"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { Check } from "lucide-react"

export function MarkReadButton({ submissionId }: { submissionId: string }) {
  const router = useRouter()
  const { toast } = useToast()

  const handleMarkRead = async () => {
    try {
      const res = await fetch(`/api/admin/contact/${submissionId}/read`, {
        method: "PATCH",
      })
      if (!res.ok) throw new Error("Failed to mark as read")
      toast({ title: "Marked as read" })
      router.refresh()
    } catch {
      toast({
        title: "Error",
        description: "Could not update",
        variant: "destructive",
      })
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={handleMarkRead}>
      <Check className="h-4 w-4 mr-1" />
      Mark as read
    </Button>
  )
}
