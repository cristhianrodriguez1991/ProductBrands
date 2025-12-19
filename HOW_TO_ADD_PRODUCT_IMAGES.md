# How to Add Product Images to Your Listings

This guide shows you how to add product images to your product listings in `data/brandCatalog.seed.json`.

## Quick Steps

1. **Get the image URL** from Amazon (or upload your own)
2. **Add it to the product** in `brandCatalog.seed.json`
3. **Save the file** and restart your dev server

## Method 1: Get Image from Amazon (Easiest)

### Step 1: Go to Your Product on Amazon
1. Open your product page on Amazon (e.g., `https://www.amazon.com/dp/B0DYG17PNV`)
2. Find the main product image

### Step 2: Get the Image URL
**Option A: Right-click Method**
1. Right-click on the main product image
2. Select "Copy image address" or "Copy image URL"
3. You'll get a URL like: `https://m.media-amazon.com/images/I/81pYh8kYH-L._AC_SL1500_.jpg`

**Option B: Inspect Element**
1. Right-click on the image
2. Select "Inspect" or "Inspect Element"
3. Look for the `<img>` tag
4. Copy the `src` attribute value

### Step 3: Add to Your Product
Open `data/brandCatalog.seed.json` and add the `imageUrl` field:

```json
{
  "asin": "B0DYG17PNV",
  "amazonUrl": "https://www.amazon.com/dp/B0DYG17PNV",
  "title": "WAY Coffee Dark Roast Single-Serve Pods",
  "imageUrl": "https://m.media-amazon.com/images/I/81pYh8kYH-L._AC_SL1500_.jpg",
  "description": "Your product description...",
  "bullets": ["Feature 1", "Feature 2"]
}
```

## Method 2: Upload Your Own Images

### Step 1: Upload Image
You can use:
- **Your own server/CDN**
- **Image hosting services** (Imgur, Cloudinary, etc.)
- **Amazon S3** (if you have it set up)

### Step 2: Get the Public URL
After uploading, get the public URL of your image.

### Step 3: Add to Product
Add the URL to your product:

```json
{
  "asin": "B0DYG17PNV",
  "amazonUrl": "https://www.amazon.com/dp/B0DYG17PNV",
  "title": "Your Product Name",
  "imageUrl": "https://your-domain.com/images/product.jpg",
  "description": "Your description...",
  "bullets": ["Feature 1", "Feature 2"]
}
```

## Example: Complete Product with Image

```json
{
  "asin": "B0DYG17PNV",
  "amazonUrl": "https://www.amazon.com/dp/B0DYG17PNV",
  "title": "WAY Coffee Dark Roast Single-Serve Pods",
  "imageUrl": "https://m.media-amazon.com/images/I/81pYh8kYH-L._AC_SL1500_.jpg",
  "description": "Bold dark-roast coffee crafted for consistent flavor and everyday energy.",
  "bullets": [
    "Rich dark-roast flavor",
    "Single-serve coffee pods",
    "Perfect for daily brewing"
  ],
  "priceAmount": 24.99,
  "priceCurrency": "USD",
  "rating": 4.5,
  "reviewCount": 127
}
```

## Updating Existing Products

If a product already exists but doesn't have an image:

1. **Open** `data/brandCatalog.seed.json`
2. **Find** the product you want to update
3. **Add or update** the `imageUrl` field:

```json
{
  "asin": "B0DS2TXFZV",
  "amazonUrl": "https://www.amazon.com/dp/B0DS2TXFZV",
  "title": "WAY Coffee Medium Roast",
  "imageUrl": "https://m.media-amazon.com/images/I/YOUR-IMAGE-URL.jpg",  // ← Add this line
  "description": "...",
  "bullets": [...]
}
```

## Image Requirements

- **Format**: JPG, PNG, or WebP
- **Size**: Recommended 800x800px or larger (square images work best)
- **URL**: Must be publicly accessible (not behind a login)
- **HTTPS**: Use HTTPS URLs for security

## Troubleshooting

### Image Not Showing?

1. **Check the URL**: Open the image URL in a new browser tab to verify it works
2. **Check JSON syntax**: Make sure there are no syntax errors (commas, quotes)
3. **Restart server**: Always restart your dev server after editing the seed file
4. **Clear cache**: Try hard refresh (Ctrl+Shift+R)

### Image URL from Amazon Not Working?

- Amazon CDN URLs should work, but sometimes they change
- If an Amazon image stops working, get a fresh URL from the product page
- Consider uploading to your own hosting for reliability

### Best Practices

1. **Use high-quality images**: At least 800x800px
2. **Square format**: Works best for product cards
3. **Test URLs**: Always test image URLs in a browser first
4. **Backup**: Keep a backup of your image URLs
5. **Consistent sizing**: Use similar image sizes for all products

## Quick Reference

**File to edit**: `data/brandCatalog.seed.json`

**Field to add**: `"imageUrl": "YOUR-IMAGE-URL-HERE"`

**After editing**: Restart your dev server (`npm run dev`)

That's it! Your product images will appear on your brand pages automatically.

