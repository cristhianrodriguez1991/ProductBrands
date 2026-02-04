import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const isAdmin = token?.role === "ADMIN"
    const isAuth = !!token
    const pathname = req.nextUrl.pathname

    // Skip middleware for login pages
    if (pathname === "/admin-login" || pathname === "/login" || pathname === "/register") {
      return NextResponse.next()
    }

    // Admin routes (but NOT /admin-login)
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
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // Allow public routes
        if (
          req.nextUrl.pathname === "/" ||
          req.nextUrl.pathname.startsWith("/api") ||
          req.nextUrl.pathname.startsWith("/services") ||
          req.nextUrl.pathname.startsWith("/brands") ||
          req.nextUrl.pathname.startsWith("/industries") ||
          req.nextUrl.pathname.startsWith("/process") ||
          req.nextUrl.pathname.startsWith("/pricing") ||
          req.nextUrl.pathname.startsWith("/faq") ||
          req.nextUrl.pathname.startsWith("/contact") ||
          req.nextUrl.pathname.startsWith("/terms") ||
          req.nextUrl.pathname.startsWith("/privacy") ||
          req.nextUrl.pathname.startsWith("/quote") ||
          req.nextUrl.pathname.startsWith("/login") ||
          req.nextUrl.pathname.startsWith("/register") ||
          req.nextUrl.pathname.startsWith("/admin-login")
        ) {
          return true
        }

        // Protected routes require auth
        if (req.nextUrl.pathname.startsWith("/portal") || req.nextUrl.pathname.startsWith("/admin")) {
          return !!token
        }

        return true
      },
    },
  }
)

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}

