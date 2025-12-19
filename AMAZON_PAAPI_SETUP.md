# Amazon Product Advertising API (PA-API) Setup Guide

This guide will help you set up Amazon PA-API v5 to automatically sync your own Amazon listings (prices, ratings, reviews, images) to your brand pages.

## Prerequisites

**Yes, you DO need an Amazon Associates account to use PA-API.** However, you don't need to actively use it for affiliate marketing - you just need the account to get API access.

### Important Notes for Your Own Products:

- ✅ **You can use PA-API for your own products** - Amazon allows this
- ✅ **You can earn affiliate commissions on your own products** - This is allowed and can be a bonus
- ✅ **You don't need to promote other products** - Just having the account is enough
- ⚠️ **You must meet sales requirements** - Amazon requires at least 3 initial sales and 1 sale per month to maintain PA-API access

### Steps:

1. **Amazon Associates Account**: Sign up for Amazon Associates
   - Sign up at: https://affiliate-program.amazon.com/
   - Approval can take 1-3 business days
   - **Note**: You'll need to generate at least 3 qualified sales to request PA-API access

2. **PA-API Access**: Once you have 3+ sales, request PA-API access
   - Go to: https://webservices.amazon.com/paapi5/documentation/
   - Click "Register Now" or "Get Started"
   - You'll need to maintain at least 1 sale per month to keep access

## Step 1: Get Your Credentials

After your PA-API application is approved:

1. **Log in to Amazon Product Advertising API**
   - Visit: https://webservices.amazon.com/paapi5/documentation/register.html
   - Or go to your Associates Central dashboard

2. **Create Access Keys**
   - Navigate to "Tools" → "Product Advertising API"
   - Click "Manage Your Account" or "Access Keys"
   - You'll see:
     - **Access Key ID** (this is your `AMAZON_PAAPI_ACCESS_KEY`)
     - **Secret Access Key** (this is your `AMAZON_PAAPI_SECRET_KEY`)
     - **Associate Tag** (this is your `AMAZON_PAAPI_PARTNER_TAG`)

3. **Note Your Region and Marketplace**
   - Common regions: `us-east-1`, `eu-west-1`, `us-west-2`
   - Common marketplaces: `www.amazon.com`, `www.amazon.co.uk`, `www.amazon.de`
   - For US: Region = `us-east-1`, Marketplace = `www.amazon.com`

## Step 2: Add Credentials to Your .env File

1. **Create or edit your `.env` file** in the root directory of your project

2. **Add these variables**:

```env
# Amazon Product Advertising API (PA-API v5)
AMAZON_PAAPI_ACCESS_KEY=your_access_key_here
AMAZON_PAAPI_SECRET_KEY=your_secret_key_here
AMAZON_PAAPI_PARTNER_TAG=your_associate_tag_here
AMAZON_PAAPI_REGION=us-east-1
AMAZON_MARKETPLACE=www.amazon.com
```

### Example:

```env
# Amazon Product Advertising API (PA-API v5)
AMAZON_PAAPI_ACCESS_KEY=AKIAIOSFODNN7EXAMPLE
AMAZON_PAAPI_SECRET_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
AMAZON_PAAPI_PARTNER_TAG=yourstore-20
AMAZON_PAAPI_REGION=us-east-1
AMAZON_MARKETPLACE=www.amazon.com
```

## Step 3: Restart Your Development Server

After adding the credentials:

1. **Stop your dev server** (Ctrl+C)
2. **Restart it**:
   ```bash
   npm run dev
   ```

## Step 4: Verify It's Working

1. Visit any brand page (e.g., `/brands/way-coffee`)
2. Products will automatically sync from Amazon and show:
   - ✅ Live prices from your Amazon listings
   - ✅ Star ratings
   - ✅ Review counts
   - ✅ "Synced from Amazon" indicator
3. Each product card has a refresh button to manually sync individual products
4. Products automatically sync when the page loads

## Step 5: Bulk Sync (Optional)

You can also sync all products at once using the API endpoint:

```bash
curl -X POST http://localhost:3000/api/products/sync
```

This will fetch live data for all products in your catalog.

## Troubleshooting

### "PA-API not available" message
- Check that all 5 environment variables are set in `.env`
- Make sure there are no extra spaces or quotes around the values
- Restart your dev server after adding credentials

### "InvalidSignature" or "InvalidPartnerTag" errors
- Verify your Access Key and Secret Key are correct
- Check that your Associate Tag matches your Associates account
- Ensure your PA-API application is approved

### Rate Limits
- PA-API has rate limits (typically 1 request per second)
- The app will automatically fall back to seed data if rate limited
- For production, consider caching product data

### Region/Marketplace Mismatch
- Make sure `AMAZON_PAAPI_REGION` matches your marketplace
- US: `us-east-1` with `www.amazon.com`
- UK: `eu-west-1` with `www.amazon.co.uk`
- Germany: `eu-west-1` with `www.amazon.de`

## Important Notes

⚠️ **Security**: Never commit your `.env` file to Git. It should already be in `.gitignore`.

⚠️ **Associate Tag**: Your Associate Tag is tied to your Associates account. 
   - You'll earn commissions on sales generated through your links (including your own products!)
   - This is allowed by Amazon and can be a nice bonus
   - You must generate at least 1 sale per month to maintain PA-API access

⚠️ **API Limits**: PA-API has usage limits. For high-traffic sites, consider:
- Caching product data
- Using the seed catalog as a fallback
- Implementing rate limiting

## Support

- Amazon PA-API Documentation: https://webservices.amazon.com/paapi5/documentation/
- Amazon Associates Support: https://affiliate-program.amazon.com/help/node/topic/GP38K6J3Y4XZ8N4Q

