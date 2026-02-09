"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { Trash2 } from "lucide-react"

export function DeleteQuoteButton({
  quoteId,
  quoteNumber,
}: {
  quoteId: string
  quoteNumber: string | null
}) {
  const router = useRouter()
  const { toast } = useToast()
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    if (!confirm(`Delete quote ${quoteNumber || quoteId}? This cannot be undone.`)) {
      return
    }
    setDeleting(true)
    try {
      const res = await fetch(`/api/admin/quotes/${quoteId}`, { method: "DELETE" })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || "Failed to delete quote")
      }
      toast({
        title: "Quote deleted",
        description: "The quote has been removed from the list.",
      })
      router.refresh()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Could not delete quote",
        variant: "destructive",
      })
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleDelete}
      disabled={deleting}
      className="text-destructive hover:text-destructive hover:bg-destructive/10"
      title="Delete quote"
    >
      <Trash2 className="h-4 w-4" />
    </Button>
  )
}
