import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Toaster } from "@/components/ui/toaster"
import { Providers } from "./providers"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Product Brands - Private Label Solutions",
  description: "We help businesses launch private-label products across any category—sourcing, branding, labeling, packaging, and fulfillment—through one streamlined partner.",
  openGraph: {
    title: "Product Brands - Private Label Solutions",
    description: "We help businesses launch private-label products across any category—sourcing, branding, labeling, packaging, and fulfillment—through one streamlined partner.",
    type: "website",
  },
  icons: {
    icon: "/images/favicon.png",
    apple: "/images/favicon.png",
  },
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 5,
    viewportFit: "cover",
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  )
}

