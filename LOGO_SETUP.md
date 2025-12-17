# Logo Setup Instructions

## Step 1: Add Your Logo Image

1. Save your logo image file (PNG, SVG, or JPG) to:
   ```
   public/images/logo.png
   ```

2. **Recommended specifications:**
   - Format: PNG (with transparent background) or SVG
   - Width: ~400px (will be scaled down)
   - Height: ~120px (will be scaled down)
   - File size: Under 200KB for best performance

## Step 2: Verify Logo is Displayed

After adding the logo file:
1. Refresh your browser at http://localhost:3000
2. The logo should appear in the navigation bar
3. If the image doesn't load, it will automatically fall back to a text logo

## Step 3: Alternative Formats

If your logo is in a different format, update `components/logo.tsx`:

- For SVG: Change `/images/logo.png` to `/images/logo.svg`
- For JPG: Change `/images/logo.png` to `/images/logo.jpg`

## Current Implementation

The logo component is now used across all pages:
- Homepage
- Services
- Industries
- Process
- Pricing
- Portfolio
- FAQ
- Contact
- Terms
- Privacy
- Quote page

The logo will automatically:
- Link to the homepage when clicked
- Scale appropriately on mobile devices
- Fall back to text if the image file is missing

## File Location

Your logo should be placed at:
```
ProductBrands/
  └── public/
      └── images/
          └── logo.png  ← Place your logo here
```

