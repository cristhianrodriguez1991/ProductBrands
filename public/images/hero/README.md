# Hero Slideshow Images

Add your hero slideshow images to this directory. The images will be displayed in a rotating slideshow on the homepage.

## How to Add Images

1. **Upload your images** to this directory (any name is fine)

2. **Update the image list** in `lib/hero-images.ts`:
   ```typescript
   export const heroImages = [
     "/images/hero/imagesheroslide1.jpg",
     "/images/hero/imagesheroslide2.png",
     "/images/hero/imagesheroslide3.png",
     "/images/hero/your-new-image.jpg",  // Just add a new line!
   ]
   ```

That's it! The slideshow will automatically include all images you add to the array.

## Image Specifications

- **Format**: JPG, PNG, or WebP (all supported)
- **Recommended size**: 1200x800px or larger
- **Aspect ratio**: 3:2 or 16:9 works best
- **File size**: Under 500KB for best performance
- **Naming**: Any name is fine - just use the exact filename in the config

## Features

- **Auto-play**: Images automatically rotate every 5 seconds
- **Navigation**: Users can click arrows or dots to navigate
- **Pause on hover**: Slideshow pauses when mouse hovers over it
- **Responsive**: Adapts to all screen sizes
- **Smooth transitions**: Fade effect between images
- **Unlimited images**: Add as many as you want!

## Current Images

Your slideshow currently includes:
- imagesheroslide1.jpg
- imagesheroslide2.png
- imagesheroslide3.png
