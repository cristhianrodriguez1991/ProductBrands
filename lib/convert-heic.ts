/**
 * Client-side HEIC/HEIF → JPEG conversion.
 * Uses heic2any (pure JS / WASM) so no native deps.
 * If the file isn't HEIC, returns it unchanged.
 */
export async function convertHeicToJpeg(file: File): Promise<File> {
  const name = file.name.toLowerCase()
  const isHeic =
    name.endsWith(".heic") ||
    name.endsWith(".heif") ||
    file.type === "image/heic" ||
    file.type === "image/heif"

  if (!isHeic) return file

  try {
    const heic2any = (await import("heic2any")).default
    const blob = await heic2any({
      blob: file,
      toType: "image/jpeg",
      quality: 0.92,
    })

    // heic2any can return a single Blob or an array
    const resultBlob = Array.isArray(blob) ? blob[0] : blob

    // Create a new File with .jpg extension
    const newName = file.name.replace(/\.heic$/i, ".jpg").replace(/\.heif$/i, ".jpg")
    return new File([resultBlob], newName, { type: "image/jpeg" })
  } catch (err) {
    console.warn("[convertHeicToJpeg] Conversion failed, returning original:", err)
    return file
  }
}
