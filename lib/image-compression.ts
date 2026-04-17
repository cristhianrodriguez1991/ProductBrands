/**
 * Compresses an image to a maximum width to significantly reduce file size
 * Suitable for JPEGs, PNGs. Returns the original file if not a compressible image.
 */
export async function compressImage(file: File, maxWidth = 1920, quality = 0.7): Promise<File> {
  // Only compress JPEGs/PNGs/WebPs
  if (!file.type.startsWith('image/') || file.type === 'image/gif' || file.type === 'image/svg+xml') {
    return file;
  }

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Calculate aspect ratio and target dimensions
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(file);

        // Draw image onto canvas
        ctx.drawImage(img, 0, 0, width, height);

        // Compress and extract
        canvas.toBlob(
          (blob) => {
            if (!blob) return resolve(file);
            
            // Name the file properly using .jpg
            const baseName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
            const newName = file.type === 'image/jpeg' ? file.name : `${baseName}.jpg`;
            
            const compressedFile = new File([blob], newName, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });
            
            // Safety fallback: if compression somehow made it larger, keep original
            resolve(compressedFile.size < file.size ? compressedFile : file);
          },
          'image/jpeg',
          quality
        );
      };
      img.onerror = () => resolve(file); // fallback on error
      img.src = event.target?.result as string;
    };
    reader.onerror = () => resolve(file); // fallback on error
    reader.readAsDataURL(file);
  });
}
