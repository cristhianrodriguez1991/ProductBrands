"use client"

import { useState, useEffect } from "react"
import { Plus, Edit2, Trash2, QrCode, ExternalLink } from "lucide-react"
import Link from "next/link"
import InfoProductModal from "./components/InfoProductModal"

export default function ProductInfoAdminPage() {
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<any>(null)

  useEffect(() => {
    fetchProducts()
  }, [])

  const fetchProducts = async () => {
    try {
      const res = await fetch("/api/admin/productinfo")
      if (res.ok) {
        const data = await res.json()
        setProducts(data)
      }
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this info product?")) return
    try {
      const res = await fetch(`/api/admin/productinfo/${id}`, { method: "DELETE" })
      if (res.ok) {
        setProducts(products.filter(p => p.id !== id))
      }
    } catch (error) {
      console.error(error)
    }
  }

  const openNewModal = () => {
    setEditingProduct(null)
    setModalOpen(true)
  }

  const openEditModal = (product: any) => {
    setEditingProduct(product)
    setModalOpen(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Product Info Catalog</h1>
          <p className="text-muted-foreground mt-1">
            Manage your standalone infomercial products and QR codes.
          </p>
        </div>
        <button
          onClick={openNewModal}
          className="bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-md font-medium flex items-center"
        >
          <Plus className="mr-2 h-4 w-4" />
          Create Product
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : (
        <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 border-b">
                <tr>
                  <th className="px-6 py-3 font-medium">Product</th>
                  <th className="px-6 py-3 font-medium">Slug / ID</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                  <th className="px-6 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-muted-foreground">
                      No products found. Create one to get started.
                    </td>
                  </tr>
                ) : (
                  products.map((product) => (
                    <tr key={product.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="px-6 py-4">
                        <div className="font-medium text-base">{product.name}</div>
                        {product.tagline && <div className="text-muted-foreground text-xs">{product.tagline}</div>}
                      </td>
                      <td className="px-6 py-4 font-mono text-xs">
                        {product.slug}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${product.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                          {product.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link 
                            href={`/productinfo/${product.slug}`}
                            target="_blank"
                            className="p-2 hover:bg-muted rounded-md text-blue-600"
                            title="View Public Page"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Link>
                          <button
                            onClick={() => openEditModal(product)}
                            className="p-2 hover:bg-muted rounded-md"
                            title="Edit & Get QR Code"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(product.id)}
                            className="p-2 hover:bg-muted rounded-md text-red-600"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {modalOpen && (
        <InfoProductModal
          product={editingProduct}
          takenSlugs={products.map((p) => p.slug)}
          onClose={() => setModalOpen(false)}
          onSuccess={() => {
            setModalOpen(false)
            fetchProducts()
          }}
        />
      )}
    </div>
  )
}
