"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Trash2, Loader2, AlertTriangle } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface DeleteAllButtonProps {
  entityName: string
  endpoint: string
  confirmationText?: string
}

export function DeleteAllButton({ 
  entityName, 
  endpoint, 
  confirmationText = "DELETE ALL" 
}: DeleteAllButtonProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [confirmValue, setConfirmValue] = useState("")
  const { toast } = useToast()
  const router = useRouter()

  const handleDeleteAll = async () => {
    if (confirmValue !== confirmationText) return

    setLoading(true)
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmText: confirmValue }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || `Failed to delete all ${entityName}`)
      }

      toast({
        title: "Success",
        description: `All ${entityName} have been deleted.`,
      })
      setOpen(false)
      setConfirmValue("")
      router.refresh()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="sm" className="gap-2">
          <Trash2 className="h-4 w-4" />
          Delete All {entityName}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Extreme Danger!
          </AlertDialogTitle>
          <AlertDialogDescription>
            You are about to permanently delete **EVERY SINGLE {entityName.toUpperCase()}** in the system. 
            This action cannot be undone. Are you absolutely sure?
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <div className="py-4 space-y-2">
          <Label htmlFor="confirm-delete-all" className="text-sm">
            Type <span className="font-mono bg-red-100 px-1 py-0.5 rounded text-red-700">{confirmationText}</span> to confirm:
          </Label>
          <Input
            id="confirm-delete-all"
            value={confirmValue}
            onChange={(e) => setConfirmValue(e.target.value)}
            placeholder="Case sensitive"
            className="border-red-200 focus-visible:ring-red-600"
            autoFocus
          />
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault()
              handleDeleteAll()
            }}
            disabled={confirmValue !== confirmationText || loading}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {loading ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Deleting...</>
            ) : (
              "Yes, Delete Everything"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
