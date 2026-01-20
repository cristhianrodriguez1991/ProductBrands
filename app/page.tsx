import { Navbar } from "@/components/navbar"
import { Hero } from "@/components/home/hero"
import { TrustStrip } from "@/components/home/trust-strip"
import { Capabilities } from "@/components/home/capabilities"
import { ProductFormats } from "@/components/home/product-formats"
import { Industries } from "@/components/home/industries"
import { HowItWorks } from "@/components/home/how-it-works"
import { CTABanner } from "@/components/home/cta-banner"
import { HomeFooter } from "@/components/home/footer"

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-white">
      <Navbar />
      <Hero />
      <TrustStrip />
      <Capabilities />
      <ProductFormats />
      <Industries />
      <HowItWorks />
      <CTABanner />
      <HomeFooter />
    </div>
  )
}
