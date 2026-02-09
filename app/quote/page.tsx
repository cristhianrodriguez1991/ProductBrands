"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/components/ui/use-toast"
import { useSession } from "next-auth/react"
import { Navbar } from "@/components/navbar"
import { FileText, Upload } from "lucide-react"

const ACCEPTED_FILE_TYPES = "image/*,.pdf,.doc,.docx"
const MAX_FILE_SIZE_MB = 10

export default function QuotePage() {
  const router = useRouter()
  const { toast } = useToast()
  const { data: session } = useSession()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    description: "",
  })
  const [file, setFile] = useState<File | null>(null)
  const searchParams = useSearchParams()
  const submitted = searchParams.get("submitted") === "1"

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) {
      setFile(null)
      return
    }
    if (f.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      toast({
        title: "File too large",
        description: `Please choose a file under ${MAX_FILE_SIZE_MB} MB.`,
        variant: "destructive",
      })
      e.target.value = ""
      return
    }
    setFile(f)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const formDataToSend = new FormData()
      formDataToSend.append("name", formData.name.trim())
      formDataToSend.append("email", formData.email.trim().toLowerCase())
      formDataToSend.append("phone", formData.phone.trim())
      formDataToSend.append("description", formData.description.trim())

      if (file) {
        formDataToSend.append("file", file)
      }

      const res = await fetch("/api/quotes/create", {
        method: "POST",
        body: formDataToSend,
      })

      const body = await res.json().catch(() => ({}))

      if (!res.ok) {
        throw new Error(body.error || "Failed to submit quote")
      }

      toast({
        title: "Request sent",
        description: "We'll review your request and get back to you soon.",
      })

      if (session) {
        router.push("/portal/quotes")
      } else {
        router.push("/quote?submitted=1")
      }
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Something went wrong. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <section className="bg-gradient-to-b from-slate-50 to-white py-12 md:py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-xl mx-auto text-center">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Get a Quote
            </h1>
            <p className="text-gray-600">
              Share a few details and we’ll get back to you with next steps.
            </p>
          </div>
        </div>
      </section>

      <section className="py-12 md:py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-xl mx-auto">
            {submitted ? (
              <Card className="border shadow-sm">
                <CardContent className="pt-8 pb-8 text-center">
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">
                    Thank you
                  </h2>
                  <p className="text-muted-foreground mb-6">
                    We&apos;ve received your request and will get back to you soon.
                  </p>
                  <Button asChild variant="outline">
                    <Link href="/">Back to home</Link>
                  </Button>
                </CardContent>
              </Card>
            ) : (
            <Card className="border shadow-sm">
              <CardHeader>
                <CardTitle className="text-xl">Quote request</CardTitle>
                <CardDescription>
                  Name, email, phone, and a brief description. Attachment is optional.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      required
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      placeholder="Your name"
                      className="mt-1.5"
                    />
                  </div>

                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      placeholder="you@example.com"
                      className="mt-1.5"
                    />
                  </div>

                  <div>
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) =>
                        setFormData({ ...formData, phone: e.target.value })
                      }
                      placeholder="(555) 000-0000"
                      className="mt-1.5"
                    />
                  </div>

                  <div>
                    <Label htmlFor="description">Brief description</Label>
                    <Textarea
                      id="description"
                      required
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({ ...formData, description: e.target.value })
                      }
                      placeholder="What are you looking for? Product type, quantity, timeline, etc."
                      rows={4}
                      className="mt-1.5 resize-none"
                    />
                  </div>

                  <div>
                    <Label className="flex items-center gap-2">
                      <Upload className="h-4 w-4" />
                      Optional attachment
                    </Label>
                    <Input
                      type="file"
                      accept={ACCEPTED_FILE_TYPES}
                      onChange={handleFileChange}
                      className="mt-1.5 h-10 file:mr-3 file:rounded file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm"
                    />
                    {file && (
                      <p className="text-sm text-muted-foreground mt-1.5 flex items-center gap-1.5">
                        <FileText className="h-4 w-4" />
                        {file.name}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      Images, PDF, or Word. Max {MAX_FILE_SIZE_MB} MB.
                    </p>
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={loading}
                  >
                    {loading ? "Sending…" : "Submit request"}
                  </Button>
                </form>
              </CardContent>
            </Card>
            )}

            <p className="text-center text-sm text-muted-foreground mt-6">
              Already have an account?{" "}
              <Link href="/login" className="underline hover:text-foreground">
                Log in
              </Link>
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
