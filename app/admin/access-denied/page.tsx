import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ShieldAlert, ArrowLeft } from "lucide-react"
import Link from "next/link"

export default async function AccessDeniedPage() {
  const session = await getServerSession(authOptions)

  if (!session || !(session.user as any)?.role) {
    redirect("/admin-login")
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <ShieldAlert className="h-16 w-16 mx-auto text-red-500 mb-4" />
          <CardTitle className="text-2xl">Access Denied</CardTitle>
          <p className="text-muted-foreground">
            You don&apos;t have permission to access this section.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-center text-muted-foreground">
            Contact your administrator if you believe you should have access to this area.
          </p>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" asChild>
              <Link href="/admin">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
