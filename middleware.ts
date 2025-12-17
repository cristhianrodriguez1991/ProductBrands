import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const isAdmin = token?.role === "ADMIN"
    const isCustomer = token?.role === "CUSTOMER"
    const isAuth = !!token

    // Admin routes
    if (req.nextUrl.pathname.startsWith("/admin")) {
      if (!isAdmin) {
        return NextResponse.redirect(new URL("/login", req.url))
      }
    }

    // Portal routes
    if (req.nextUrl.pathname.startsWith("/portal")) {
      if (!isAuth) {
        return NextResponse.redirect(new URL("/login", req.url))
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
          req.nextUrl.pathname.startsWith("/industries") ||
          req.nextUrl.pathname.startsWith("/process") ||
          req.nextUrl.pathname.startsWith("/pricing") ||
          req.nextUrl.pathname.startsWith("/faq") ||
          req.nextUrl.pathname.startsWith("/contact") ||
          req.nextUrl.pathname.startsWith("/terms") ||
          req.nextUrl.pathname.startsWith("/privacy") ||
          req.nextUrl.pathname.startsWith("/quote") ||
          req.nextUrl.pathname.startsWith("/login") ||
          req.nextUrl.pathname.startsWith("/register")
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

