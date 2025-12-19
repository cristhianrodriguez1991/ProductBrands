# Manual Product Management Guide

Since you're managing products manually, here's a simple guide to add and update your products.

## Quick Start

All product data is stored in: **`data/brandCatalog.seed.json`**

## Product Structure

Each product in your catalog should look like this:

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

## Required Fields

- **`asin`** - Amazon Standard Identification Number (required)
- **`amazonUrl`** - Direct link to your product on Amazon (required)

## Optional Fields (but recommended)

- **`title`** - Product name/title
- **`imageUrl`** - Product image URL (Amazon CDN or your own hosting)
- **`description`** - Product description text
- **`bullets`** - Array of feature bullets (shown as bullet points)
- **`priceAmount`** - Product price (number, e.g., 24.99)
- **`priceCurrency`** - Currency code (default: "USD")
- **`rating`** - Star rating (1-5, e.g., 4.5)
- **`reviewCount`** - Number of reviews (integer)

## How to Add a New Product

1. **Open** `data/brandCatalog.seed.json`
2. **Find** the brand you want to add to (e.g., "way-coffee")
3. **Add** a new product object to the `products` array:

```json
{
  "slug": "way-coffee",
  "name": "WAY Coffee",
  "parentSlug": "way",
  "products": [
    {
      "asin": "B0DYG17PNV",
      "amazonUrl": "https://www.amazon.com/dp/B0DYG17PNV",
      "title": "Existing Product",
      ...
    },
    {
      "asin": "B0NEWPRODUCT",
      "amazonUrl": "https://www.amazon.com/dp/B0NEWPRODUCT",
      "title": "New Product Name",
      "imageUrl": "https://your-image-url.com/image.jpg",
      "description": "Product description here",
      "bullets": ["Feature 1", "Feature 2"],
      "priceAmount": 19.99,
      "priceCurrency": "USD",
      "rating": 4.8,
      "reviewCount": 45
    }
  ]
}
```

4. **Save** the file
5. **Restart** your dev server (the file is cached)

## How to Update Product Information

1. **Open** `data/brandCatalog.seed.json`
2. **Find** the product you want to update
3. **Edit** any fields (title, price, rating, etc.)
4. **Save** the file
5. **Restart** your dev server

## Getting Product Images

### Option 1: Use Amazon CDN URLs
1. Go to your product on Amazon
2. Right-click the main product image
3. Copy image URL
4. Paste into `imageUrl` field

### Option 2: Use Your Own Hosting
1. Upload images to your server/CDN
2. Use the full URL in `imageUrl` field

### Option 3: Use Image Hosting Services
- Upload to Imgur, Cloudinary, or similar
- Use the provided URL

## Example: Complete Product Entry

```json
{
  "asin": "B0DYG17PNV",
  "amazonUrl": "https://www.amazon.com/dp/B0DYG17PNV",
  "title": "WAY Coffee Dark Roast Single-Serve Pods - 24 Count",
  "imageUrl": "https://m.media-amazon.com/images/I/81pYh8kYH-L._AC_SL1500_.jpg",
  "description": "Bold dark-roast coffee crafted for consistent flavor and everyday energy. Ideal for home, office, and private-label programs.",
  "bullets": [
    "Rich dark-roast flavor with smooth finish",
    "Compatible with Keurig and other single-serve brewers",
    "24-count box, perfect for daily brewing",
    "100% Arabica coffee beans"
  ],
  "priceAmount": 24.99,
  "priceCurrency": "USD",
  "rating": 4.5,
  "reviewCount": 127
}
```

## Tips

1. **Keep JSON valid** - Use a JSON validator if you get errors
2. **Backup your file** - Make regular backups of `brandCatalog.seed.json`
3. **Image URLs** - Make sure image URLs are accessible (test them in a browser)
4. **Restart server** - Always restart your dev server after editing the seed file
5. **ASIN format** - ASINs are 10 characters (letters and numbers)

## Common Issues

### "Product not showing"
- Check that JSON is valid (no syntax errors)
- Make sure the product is inside the correct brand's `products` array
- Restart your dev server

### "Image not loading"
- Verify the image URL is correct
- Test the URL in a browser
- Make sure the URL is publicly accessible

### "Changes not appearing"
- Restart your dev server after editing the seed file
- Clear browser cache (Ctrl+Shift+R)

## File Location

Your product catalog is at:
```
data/brandCatalog.seed.json
```

That's it! You have full control over your product data. Just edit the JSON file and restart your server.

