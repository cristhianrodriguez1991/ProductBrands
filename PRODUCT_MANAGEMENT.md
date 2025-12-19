# Product Management Guide

Since these are **your own products**, you can automatically sync them from your Amazon listings. The system will pull live data (prices, ratings, reviews, images) directly from Amazon.

## Managing Your Products

All product data is stored in: `data/brandCatalog.seed.json`

### Product Data Structure

Each product can have the following fields:

```json
{
  "asin": "B0DYG17PNV",
  "amazonUrl": "https://www.amazon.com/dp/B0DYG17PNV",
  "title": "WAY Coffee Dark Roast Single-Serve Pods",
  "imageUrl": "https://m.media-amazon.com/images/I/81pYh8kYH-L._AC_SL1500_.jpg",
  "description": "Bold dark-roast coffee crafted for consistent flavor...",
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

### Fields Explained

- **`asin`** (required): Amazon Standard Identification Number
- **`amazonUrl`** (required): Direct link to the product on Amazon
- **`title`**: Product name/title
- **`imageUrl`**: Product image URL (Amazon CDN or your own hosting)
- **`description`**: Product description text
- **`bullets`**: Array of feature bullets (shown as bullet points)
- **`priceAmount`**: Product price (number, e.g., 24.99)
- **`priceCurrency`**: Currency code (default: "USD")
- **`rating`**: Star rating (1-5, e.g., 4.5)
- **`reviewCount`**: Number of reviews (integer)

### Adding/Updating Products

1. **Open** `data/brandCatalog.seed.json`
2. **Find** the brand you want to edit (e.g., "way-coffee")
3. **Add or update** products in the `products` array
4. **Save** the file
5. **Restart** your dev server (the file is cached)

### Example: Adding a New Product

```json
{
  "slug": "way-coffee",
  "name": "WAY Coffee",
  "parentSlug": "way",
  "products": [
    {
      "asin": "B0DYG17PNV",
      "amazonUrl": "https://www.amazon.com/dp/B0DYG17PNV",
      "title": "WAY Coffee Dark Roast Single-Serve Pods",
      "imageUrl": "https://m.media-amazon.com/images/I/81pYh8kYH-L._AC_SL1500_.jpg",
      "description": "Bold dark-roast coffee...",
      "bullets": ["Feature 1", "Feature 2", "Feature 3"],
      "priceAmount": 24.99,
      "priceCurrency": "USD",
      "rating": 4.5,
      "reviewCount": 127
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

### Getting Product Images

You can use:
- **Amazon CDN URLs**: Copy image URLs from your Amazon listings
- **Your own hosting**: Upload images and use your own URLs
- **Image hosting services**: Use services like Imgur, Cloudinary, etc.

### Updating Prices, Ratings, Reviews

Simply update the values in the JSON file:

```json
{
  "priceAmount": 29.99,  // Update price
  "rating": 4.7,         // Update rating
  "reviewCount": 250     // Update review count
}
```

## Automatic Amazon Sync

**Recommended**: Set up Amazon PA-API to automatically sync your listings.

When PA-API is configured:
- ✅ Products automatically sync from Amazon when pages load
- ✅ Live prices, ratings, and reviews are displayed
- ✅ Manual refresh button on each product card
- ✅ Bulk sync endpoint available (`/api/products/sync`)

See `AMAZON_PAAPI_SETUP.md` for setup instructions.

**Without PA-API**: You can still manually add product data to the seed file, but you'll need to update prices, ratings, and reviews manually.

## Tips

1. **Keep backups**: Make regular backups of `brandCatalog.seed.json`
2. **Image URLs**: Use reliable image hosting (Amazon CDN, your own server, or CDN)
3. **Validation**: Make sure JSON is valid (use a JSON validator if needed)
4. **Restart server**: After editing the seed file, restart your dev server to see changes

## Need Help?

- Check JSON syntax if the file won't load
- Ensure all required fields (`asin`, `amazonUrl`) are present
- Verify image URLs are accessible
- Restart the dev server after making changes

