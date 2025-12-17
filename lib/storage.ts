import { writeFile, unlink, mkdir } from "fs/promises"
import { join } from "path"
import { randomBytes } from "crypto"

// S3 client will be initialized dynamically if needed
let s3Client: any = null

async function getS3Client() {
  if (!process.env.S3_ENDPOINT) return null
  if (s3Client) return s3Client
  
  try {
    const { S3Client, PutObjectCommand, DeleteObjectCommand } = await import("@aws-sdk/client-s3")
    s3Client = new S3Client({
      endpoint: process.env.S3_ENDPOINT,
      region: process.env.S3_REGION || "us-east-1",
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID || "",
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || "",
      },
      forcePathStyle: true,
    })
    return s3Client
  } catch {
    return null
  }
}

const BUCKET_NAME = process.env.S3_BUCKET_NAME || "product-brands"

export async function uploadFile(
  file: File,
  folder: string = "uploads"
): Promise<{ url: string; key: string }> {
  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)

  const ext = file.name.split(".").pop()
  const fileName = `${randomBytes(16).toString("hex")}.${ext}`
  const key = `${folder}/${fileName}`

  // Use S3 if configured, otherwise use local storage
  const client = await getS3Client()
  if (client && process.env.NODE_ENV === "production") {
    const { PutObjectCommand } = await import("@aws-sdk/client-s3")
    await client.send(
      new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
        Body: buffer,
        ContentType: file.type,
      })
    )
    const url = process.env.S3_PUBLIC_URL
      ? `${process.env.S3_PUBLIC_URL}/${key}`
      : `https://${BUCKET_NAME}.s3.amazonaws.com/${key}`
    return { url, key }
  } else {
    // Local storage fallback
    const uploadDir = join(process.cwd(), "public", "uploads", folder)
    await mkdir(uploadDir, { recursive: true })
    const filePath = join(uploadDir, fileName)
    await writeFile(filePath, buffer)
    return { url: `/uploads/${folder}/${fileName}`, key }
  }
}

export async function deleteFile(key: string): Promise<void> {
  const client = await getS3Client()
  if (client && process.env.NODE_ENV === "production") {
    const { DeleteObjectCommand } = await import("@aws-sdk/client-s3")
    await client.send(
      new DeleteObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
      })
    )
  } else {
    // Local storage
    const filePath = join(process.cwd(), "public", key)
    try {
      await unlink(filePath)
    } catch (error) {
      // File might not exist, ignore
    }
  }
}

export function getFileUrl(key: string): string {
  if (process.env.S3_PUBLIC_URL && process.env.NODE_ENV === "production") {
    return `${process.env.S3_PUBLIC_URL}/${key}`
  }
  return key.startsWith("/") ? key : `/${key}`
}

