"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/components/ui/use-toast"
import { Navbar } from "@/components/navbar"
import { Mail, Phone, MapPin, Calendar } from "lucide-react"

type SiteSettings = {
  contact_email?: string
  contact_phone?: string
  contact_address?: string
  calendar_url?: string
}

export default function ContactPage() {
  const { toast } = useToast()
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    company: "",
    message: "",
  })
  const [loading, setLoading] = useState(false)
  const [settings, setSettings] = useState<SiteSettings>({})

  useEffect(() => {
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => setSettings(data))
      .catch(console.error)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (!res.ok) throw new Error("Failed to send message")

      toast({
        title: "Success",
        description: "Your message has been sent. We'll get back to you soon!",
      })
      setFormData({ name: "", email: "", company: "", message: "" })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* Hero Section */}
      <section className="bg-gradient-to-b from-blue-50 to-white py-12 md:py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 text-gray-900">
              Contact Us
            </h1>
            <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto">
              Get in touch to discuss your private label needs
            </p>
          </div>
        </div>
      </section>

      {/* Contact Form */}
      <section className="py-16 md:py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card className="border-2 bg-white">
              <CardHeader>
                <CardTitle className="text-2xl">Get in Touch</CardTitle>
                <CardDescription className="text-base">
                  Fill out the form and we'll respond within 24 hours
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="company">Company</Label>
                    <Input
                      id="company"
                      value={formData.company}
                      onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="message">Message</Label>
                    <Textarea
                      id="message"
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      required
                      rows={5}
                      className="mt-1"
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Sending..." : "Send Message"}
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card className="border-2 bg-white">
              <CardHeader>
                <CardTitle className="text-2xl">Other Ways to Reach Us</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {settings.contact_email && (
                  <div className="flex items-start gap-3">
                    <Mail className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div>
                      <h3 className="font-semibold mb-1 text-gray-900">Email</h3>
                      <a 
                        href={`mailto:${settings.contact_email}`}
                        className="text-gray-600 hover:text-blue-600 transition-colors"
                      >
                        {settings.contact_email}
                      </a>
                    </div>
                  </div>
                )}
                {settings.contact_phone && (
                  <div className="flex items-start gap-3">
                    <Phone className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div>
                      <h3 className="font-semibold mb-1 text-gray-900">Phone</h3>
                      <a 
                        href={`tel:${settings.contact_phone.replace(/[^0-9+]/g, '')}`}
                        className="text-gray-600 hover:text-blue-600 transition-colors"
                      >
                        {settings.contact_phone}
                      </a>
                    </div>
                  </div>
                )}
                {settings.contact_address && (
                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div>
                      <h3 className="font-semibold mb-1 text-gray-900">Address</h3>
                      <p className="text-gray-600 whitespace-pre-line">{settings.contact_address}</p>
                    </div>
                  </div>
                )}
                <div className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <h3 className="font-semibold mb-1 text-gray-900">Schedule a Call</h3>
                    <p className="text-gray-600 mb-3">
                      Book a time to discuss your project
                    </p>
                    {settings.calendar_url ? (
                      <Button variant="outline" asChild>
                        <a href={settings.calendar_url} target="_blank" rel="noopener noreferrer">
                          View Calendar
                        </a>
                      </Button>
                    ) : (
                      <Button variant="outline" asChild>
                        <a href={`mailto:${settings.contact_email || 'info@productbrands.com'}?subject=Schedule a Call`}>
                          Request a Call
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </div>
  )
}
