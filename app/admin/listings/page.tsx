import { requireAdminSession } from "@/lib/rbac"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus, Search, Filter } from "lucide-react"
import { ListingStatus } from "@prisma/client"

export default async function AdminListingsPage() {
  await requireAdminSession()

  const listings = await prisma.listing.findMany({
    include: {
      category: true,
      variants: {
        where: { active: true },
      },
      _count: {
        select: {
          variants: true,
          media: true,
        },
      },
    },
    orderBy: { updatedAt: "desc" },
    take: 50,
  })

  const getStatusColor = (status: ListingStatus) => {
    switch (status) {
      case "ACTIVE":
        return "bg-green-500"
      case "DRAFT":
        return "bg-gray-500"
      case "ARCHIVED":
        return "bg-red-500"
      default:
        return "bg-gray-500"
    }
  }

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Product Listings</h1>
          <p className="text-muted-foreground">Manage your product catalog</p>
        </div>
        <Link href="/admin/listings/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Listing
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex gap-4 items-center">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search listings..."
                className="w-full pl-10 pr-4 py-2 border rounded-md"
              />
            </div>
            <Button variant="outline">
              <Filter className="mr-2 h-4 w-4" />
              Filter
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Listings Table */}
      <div className="space-y-4">
        {listings.map((listing) => (
          <Card key={listing.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <CardTitle className="text-lg">
                      <Link
                        href={`/admin/listings/${listing.id}`}
                        className="hover:text-blue-600"
                      >
                        {listing.title}
                      </Link>
                    </CardTitle>
                    <Badge className={getStatusColor(listing.status)}>
                      {listing.status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    {listing.category && (
                      <span>Category: {listing.category.name}</span>
                    )}
                    {listing.moq && <span>MOQ: {listing.moq}</span>}
                    {listing.leadTimeDays && (
                      <span>Lead Time: {listing.leadTimeDays} days</span>
                    )}
                    <span>
                      {listing._count.variants} variant
                      {listing._count.variants !== 1 ? "s" : ""}
                    </span>
                    <span>
                      {listing._count.media} image
                      {listing._count.media !== 1 ? "s" : ""}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Link href={`/admin/listings/${listing.id}`}>
                    <Button variant="outline" size="sm">
                      Edit
                    </Button>
                  </Link>
                </div>
              </div>
            </CardHeader>
          </Card>
        ))}

        {listings.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground mb-4">
                No listings found. Create your first listing to get started.
              </p>
              <Link href="/admin/listings/new">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Listing
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
