import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const isAdmin = token?.role === "ADMIN"
    const isAuth = !!token
    const pathname = req.nextUrl.pathname

    // Skip middleware for login pages and public routes
    if (
      pathname === "/admin-login" || 
      pathname === "/login" || 
      pathname === "/register" ||
      pathname === "/" ||
      pathname.startsWith("/api") ||
      pathname.startsWith("/services") ||
      pathname.startsWith("/brands") ||
      pathname.startsWith("/industries") ||
      pathname.startsWith("/process") ||
      pathname.startsWith("/pricing") ||
      pathname.startsWith("/faq") ||
      pathname.startsWith("/contact") ||
      pathname.startsWith("/terms") ||
      pathname.startsWith("/privacy") ||
      pathname.startsWith("/quote")
    ) {
      return NextResponse.next()
    }

    // Admin routes - redirect to admin login if not admin
    if (pathname.startsWith("/admin")) {
      if (!isAuth || !isAdmin) {
        return NextResponse.redirect(new URL("/admin-login", req.url))
      }
    }

    // Portal routes - clients only
    if (pathname.startsWith("/portal")) {
      if (!isAuth) {
        return NextResponse.redirect(new URL("/login", req.url))
      }
      // Block admins from client portal
      if (isAdmin) {
        return NextResponse.redirect(new URL("/admin", req.url))
      }
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      // Always return true - we handle all redirects manually in the middleware function above
      authorized: () => true,
    },
  }
)

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}

