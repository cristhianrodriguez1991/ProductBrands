"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"
import { Save, Loader2 } from "lucide-react"

type Setting = {
  id: string
  key: string
  value: string
  label: string | null
  type: string
  group: string
  sortOrder: number
}

export default function SettingsPage() {
  const { toast } = useToast()
  const [settings, setSettings] = useState<Setting[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [changes, setChanges] = useState<Record<string, string>>({})

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/admin/settings")
      if (!res.ok) throw new Error("Failed to fetch settings")
      const data = await res.json()
      setSettings(data)
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

  const handleChange = (key: string, value: string) => {
    setChanges((prev) => ({ ...prev, [key]: value }))
  }

  const getValue = (setting: Setting) => {
    return changes[setting.key] !== undefined ? changes[setting.key] : setting.value
  }

  const handleSave = async () => {
    if (Object.keys(changes).length === 0) {
      toast({
        title: "No changes",
        description: "No settings have been modified",
      })
      return
    }

    setSaving(true)
    try {
      const settingsArray = Object.entries(changes).map(([key, value]) => ({ key, value }))
      
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: settingsArray }),
      })

      if (!res.ok) throw new Error("Failed to save settings")

      toast({
        title: "Success",
        description: "Settings saved successfully",
      })

      // Update local state and clear changes
      setSettings((prev) =>
        prev.map((s) => (changes[s.key] !== undefined ? { ...s, value: changes[s.key] } : s))
      )
      setChanges({})
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  // Group settings by group
  const groupedSettings = settings.reduce((acc, setting) => {
    if (!acc[setting.group]) acc[setting.group] = []
    acc[setting.group].push(setting)
    return acc
  }, {} as Record<string, Setting[]>)

  const groupLabels: Record<string, string> = {
    contact: "Contact Information",
    social: "Social Media",
    general: "General Settings",
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Site Settings</h1>
          <p className="text-muted-foreground mt-1">
            Manage contact information and site-wide settings
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving || Object.keys(changes).length === 0}>
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Changes
            </>
          )}
        </Button>
      </div>

      <div className="space-y-6">
        {Object.entries(groupedSettings).map(([group, groupSettings]) => (
          <Card key={group}>
            <CardHeader>
              <CardTitle>{groupLabels[group] || group}</CardTitle>
              <CardDescription>
                {group === "contact" && "Update your contact information displayed on the website"}
                {group === "social" && "Add links to your social media profiles"}
                {group === "general" && "General site settings"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {groupSettings.map((setting) => (
                  <div key={setting.id} className={setting.type === "textarea" ? "md:col-span-2" : ""}>
                    <Label htmlFor={setting.key}>{setting.label || setting.key}</Label>
                    {setting.type === "textarea" ? (
                      <Textarea
                        id={setting.key}
                        value={getValue(setting)}
                        onChange={(e) => handleChange(setting.key, e.target.value)}
                        placeholder={`Enter ${setting.label?.toLowerCase() || setting.key}`}
                        className="mt-1"
                        rows={3}
                      />
                    ) : (
                      <Input
                        id={setting.key}
                        type={setting.type === "email" ? "email" : setting.type === "url" ? "url" : "text"}
                        value={getValue(setting)}
                        onChange={(e) => handleChange(setting.key, e.target.value)}
                        placeholder={`Enter ${setting.label?.toLowerCase() || setting.key}`}
                        className="mt-1"
                      />
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {Object.keys(changes).length > 0 && (
        <div className="fixed bottom-4 right-4 bg-yellow-100 border border-yellow-300 rounded-lg px-4 py-2 shadow-lg">
          <p className="text-sm text-yellow-800">
            You have unsaved changes ({Object.keys(changes).length} field{Object.keys(changes).length > 1 ? "s" : ""})
          </p>
        </div>
      )}
    </div>
  )
}
