"use client"

import { useState, useRef } from "react"
import { X, Plus, Trash2, Download } from "lucide-react"
import { QRCodeSVG } from "qrcode.react"

export default function InfoProductModal({ product, onClose, onSuccess }: { product?: any, onClose: () => void, onSuccess: () => void }) {
  const [formData, setFormData] = useState({
    slug: product?.slug || "",
    name: product?.name || "",
    tagline: product?.tagline || "",
    description: product?.description || "",
    actionUrl: product?.actionUrl || "",
    isActive: product ? product.isActive : true,
    features: product?.features || [],
    mediaUrls: product?.mediaUrls || [],
  })
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  
  const qrRef = useRef<SVGSVGElement>(null)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    if (type === "checkbox") {
      setFormData(prev => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }))
    } else {
      setFormData(prev => ({ ...prev, [name]: value }))
    }
  }

  const handleAddFeature = () => {
    setFormData(prev => ({ ...prev, features: [...prev.features, { title: "", description: "" }] }))
  }

  const handleUpdateFeature = (index: number, field: string, value: string) => {
    const newFeatures = [...formData.features]
    newFeatures[index][field] = value
    setFormData(prev => ({ ...prev, features: newFeatures }))
  }

  const handleRemoveFeature = (index: number) => {
    const newFeatures = [...formData.features]
    newFeatures.splice(index, 1)
    setFormData(prev => ({ ...prev, features: newFeatures }))
  }

  const handleAddMedia = () => {
    setFormData(prev => ({ ...prev, mediaUrls: [...prev.mediaUrls, ""] }))
  }

  const handleUpdateMedia = (index: number, value: string) => {
    const newMedia = [...formData.mediaUrls]
    newMedia[index] = value
    setFormData(prev => ({ ...prev, mediaUrls: newMedia }))
  }

  const handleRemoveMedia = (index: number) => {
    const newMedia = [...formData.mediaUrls]
    newMedia.splice(index, 1)
    setFormData(prev => ({ ...prev, mediaUrls: newMedia }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const url = product ? `/api/admin/productinfo/${product.id}` : "/api/admin/productinfo"
      const method = product ? "PATCH" : "POST"

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      })

      if (!res.ok) {
        const text = await res.text()
        throw new Error(text || "Failed to save")
      }

      onSuccess()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const downloadQR = () => {
    if (!qrRef.current) return
    const svgData = new XMLSerializer().serializeToString(qrRef.current)
    const canvas = document.createElement("canvas")
    const ctx = canvas.getContext("2d")
    const img = new Image()
    img.onload = () => {
      canvas.width = img.width
      canvas.height = img.height
      ctx?.drawImage(img, 0, 0)
      const pngFile = canvas.toDataURL("image/png")
      const downloadLink = document.createElement("a")
      downloadLink.download = `QR_${formData.slug || "product"}.png`
      downloadLink.href = `${pngFile}`
      downloadLink.click()
    }
    img.src = "data:image/svg+xml;base64," + btoa(svgData)
  }

  const publicUrl = `https://productbrands.com/productinfo/${formData.slug}`

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-xl font-bold">{product ? "Edit Product Info" : "Create Product Info"}</h2>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-full">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-md border border-red-200">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <form id="info-form" onSubmit={handleSubmit} className="lg:col-span-2 space-y-6">
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Name</label>
                  <input
                    type="text"
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full p-2 border rounded-md"
                    placeholder="e.g. Premium Blend"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Slug (ID: 1, 2, 3...)</label>
                  <input
                    type="text"
                    name="slug"
                    required
                    value={formData.slug}
                    onChange={handleChange}
                    className="w-full p-2 border rounded-md font-mono"
                    placeholder="e.g. 1"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Tagline</label>
                <input
                  type="text"
                  name="tagline"
                  value={formData.tagline}
                  onChange={handleChange}
                  className="w-full p-2 border rounded-md"
                  placeholder="Catchy tagline..."
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Description</label>
                <textarea
                  name="description"
                  rows={4}
                  value={formData.description}
                  onChange={handleChange}
                  className="w-full p-2 border rounded-md"
                  placeholder="Detailed description..."
                />
              </div>

              <div className="space-y-4 border-t pt-4">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-medium">Features</label>
                  <button type="button" onClick={handleAddFeature} className="text-xs text-primary flex items-center">
                    <Plus className="h-3 w-3 mr-1" /> Add Feature
                  </button>
                </div>
                {formData.features.map((feature: any, i: number) => (
                  <div key={i} className="flex gap-2 items-start bg-muted/30 p-3 rounded-md">
                    <div className="flex-1 space-y-2">
                      <input
                        type="text"
                        placeholder="Feature Title"
                        value={feature.title}
                        onChange={(e) => handleUpdateFeature(i, "title", e.target.value)}
                        className="w-full p-2 border rounded-md text-sm"
                      />
                      <input
                        type="text"
                        placeholder="Feature Description"
                        value={feature.description}
                        onChange={(e) => handleUpdateFeature(i, "description", e.target.value)}
                        className="w-full p-2 border rounded-md text-sm"
                      />
                    </div>
                    <button type="button" onClick={() => handleRemoveFeature(i)} className="p-2 text-red-500 hover:bg-red-50 rounded-md">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="space-y-4 border-t pt-4">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-medium">Media URLs (Images/Videos)</label>
                  <button type="button" onClick={handleAddMedia} className="text-xs text-primary flex items-center">
                    <Plus className="h-3 w-3 mr-1" /> Add Media
                  </button>
                </div>
                {formData.mediaUrls.map((url: string, i: number) => (
                  <div key={i} className="flex gap-2">
                    <input
                      type="url"
                      placeholder="https://..."
                      value={url}
                      onChange={(e) => handleUpdateMedia(i, e.target.value)}
                      className="flex-1 p-2 border rounded-md text-sm"
                    />
                    <button type="button" onClick={() => handleRemoveMedia(i)} className="p-2 text-red-500 hover:bg-red-50 rounded-md">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="space-y-2 border-t pt-4">
                <label className="text-sm font-medium">Call to Action URL</label>
                <input
                  type="url"
                  name="actionUrl"
                  value={formData.actionUrl}
                  onChange={handleChange}
                  className="w-full p-2 border rounded-md"
                  placeholder="https://... (Where should 'Buy Now' go?)"
                />
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <input
                  type="checkbox"
                  id="isActive"
                  name="isActive"
                  checked={formData.isActive}
                  onChange={handleChange}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <label htmlFor="isActive" className="text-sm font-medium">Active (Publicly Visible)</label>
              </div>

            </form>

            {/* QR Code Sidebar */}
            <div className="lg:col-span-1 border-l lg:pl-8 space-y-6 flex flex-col items-center">
              <div className="text-center w-full">
                <h3 className="font-semibold mb-2">QR Code Generator</h3>
                <p className="text-xs text-muted-foreground mb-6">
                  Updates automatically as you type the Slug.
                </p>
                
                {formData.slug ? (
                  <div className="flex flex-col items-center space-y-4">
                    <div className="p-4 bg-white border rounded-xl shadow-sm inline-block">
                      <QRCodeSVG
                        value={publicUrl}
                        size={200}
                        bgColor={"#ffffff"}
                        fgColor={"#000000"}
                        level={"H"}
                        includeMargin={false}
                        ref={qrRef}
                      />
                    </div>
                    <a href={publicUrl} target="_blank" className="text-xs text-blue-600 hover:underline break-all max-w-[200px] text-center">
                      {publicUrl}
                    </a>
                    <button
                      onClick={downloadQR}
                      className="mt-4 flex items-center justify-center w-full py-2 border rounded-md hover:bg-muted text-sm font-medium"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download PNG
                    </button>
                  </div>
                ) : (
                  <div className="w-full h-48 bg-muted rounded-xl flex items-center justify-center border border-dashed">
                    <span className="text-muted-foreground text-sm">Enter a slug first</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t bg-gray-50/50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border rounded-md font-medium hover:bg-muted"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="info-form"
            disabled={loading}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md font-medium hover:bg-primary/90 disabled:opacity-50"
          >
            {loading ? "Saving..." : "Save Product"}
          </button>
        </div>
      </div>
    </div>
  )
}
