import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import ClientProductPage from "./ClientProductPage"
import { Metadata } from "next"

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const product = await prisma.infoProduct.findUnique({
    where: { slug: params.slug }
  })

  if (!product) return { title: "Not Found" }

  return {
    title: product.name,
    description: product.description || product.tagline,
  }
}

export default async function ProductInfoSlugPage({ params }: { params: { slug: string } }) {
  const product = await prisma.infoProduct.findUnique({
    where: { slug: params.slug }
  })

  if (!product) {
    notFound()
  }

  if (!product.isActive) {
    notFound()
  }

  return (
    <ClientProductPage product={product} />
  )
}
