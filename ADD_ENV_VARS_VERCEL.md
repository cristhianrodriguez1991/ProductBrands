# Add Environment Variables to Vercel - Step by Step

## Step 1: Go to Vercel Dashboard

1. **Visit:** https://vercel.com/dashboard
2. **Click on your project** (ProductBrands)
3. Go to **Settings** → **Environment Variables**

---

## Step 2: Add Required Environment Variables

Click **"Add New"** for each variable below:

### 1. DATABASE_URL (Required)

**Name:** `DATABASE_URL`

**Value:** Your PostgreSQL connection string

**Examples:**
- **Neon:** `postgresql://username:password@ep-xxxxx.us-east-2.aws.neon.tech/productbrands?sslmode=require`
- **Supabase:** `postgresql://postgres.xxxxx:password@aws-0-us-east-1.pooler.supabase.com:6543/postgres`
- **Vercel Postgres:** `postgresql://default:xxxxx@xxxxx.vercel-storage.com:5432/verceldb`

**Environments:** ✅ Production, ✅ Preview, ✅ Development

---

### 2. NEXTAUTH_SECRET (Required)

**Name:** `NEXTAUTH_SECRET`

**Value:** Generate a random secret (see below)

**How to generate:**
- **Option 1:** Visit https://generate-secret.vercel.app/32
- **Option 2:** Run: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`
- **Option 3:** Use any random 32+ character string

**Example:** `aB3dE5fG7hI9jK1lM3nO5pQ7rS9tU1vW3xY5zA7bC9dE1fG3hI5jK7lM9nO1p`

**Environments:** ✅ Production, ✅ Preview, ✅ Development

---

### 3. NEXTAUTH_URL (Required)

**Name:** `NEXTAUTH_URL`

**Value:** Your Vercel deployment URL

**Format:** `https://your-project-name.vercel.app`

**Examples:**
- `https://product-brands.vercel.app`
- `https://product-brands-cristhianrodriguez1991.vercel.app`

**Note:** After first deployment, Vercel will give you the exact URL. Use that.

**Environments:** ✅ Production, ✅ Preview, ✅ Development

---

## Step 3: Add Optional Environment Variables

### 4. EMAIL_FROM (Optional but Recommended)

**Name:** `EMAIL_FROM`

**Value:** `noreply@productbrands.com`

**Environments:** ✅ Production, ✅ Preview, ✅ Development

---

### 5. CONTACT_EMAIL (Optional but Recommended)

**Name:** `CONTACT_EMAIL`

**Value:** `info@productbrands.com`

**Environments:** ✅ Production, ✅ Preview, ✅ Development

---

### 6. RESEND_API_KEY (Optional - Only if using email)

**Name:** `RESEND_API_KEY`

**Value:** Your Resend API key (get from https://resend.com)

**Environments:** ✅ Production, ✅ Preview, ✅ Development

---

### 7. GOOGLE_CLIENT_ID (Optional - Only if using Google OAuth)

**Name:** `GOOGLE_CLIENT_ID`

**Value:** Your Google OAuth Client ID

**Environments:** ✅ Production, ✅ Preview, ✅ Development

---

### 8. GOOGLE_CLIENT_SECRET (Optional - Only if using Google OAuth)

**Name:** `GOOGLE_CLIENT_SECRET`

**Value:** Your Google OAuth Client Secret

**Environments:** ✅ Production, ✅ Preview, ✅ Development

---

## Step 4: Amazon PA-API Variables (Optional)

Only add these if you're using Amazon Product Advertising API:

### 9. AMAZON_PAAPI_ACCESS_KEY
### 10. AMAZON_PAAPI_SECRET_KEY
### 11. AMAZON_PAAPI_PARTNER_TAG
### 12. AMAZON_PAAPI_REGION (e.g., `us-east-1`)
### 13. AMAZON_MARKETPLACE (e.g., `www.amazon.com`)

---

## Step 5: S3 Storage Variables (Optional)

Only add these if you're using S3 for file storage:

### 14. S3_ENDPOINT
### 15. S3_REGION (e.g., `us-east-1`)
### 16. S3_ACCESS_KEY_ID
### 17. S3_SECRET_ACCESS_KEY
### 18. S3_BUCKET_NAME
### 19. S3_PUBLIC_URL

---

## Step 6: Stripe Variables (Optional)

Only add these if you're using Stripe payments:

### 20. STRIPE_SECRET_KEY
### 21. STRIPE_PUBLISHABLE_KEY

---

## Quick Checklist

### Minimum Required (Must Have):
- [ ] `DATABASE_URL` - Your PostgreSQL connection string
- [ ] `NEXTAUTH_SECRET` - Random 32+ character secret
- [ ] `NEXTAUTH_URL` - Your Vercel deployment URL

### Recommended:
- [ ] `EMAIL_FROM` - Email address for sending emails
- [ ] `CONTACT_EMAIL` - Contact email address

### Optional:
- [ ] `RESEND_API_KEY` - If using email
- [ ] `GOOGLE_CLIENT_ID` & `GOOGLE_CLIENT_SECRET` - If using Google OAuth
- [ ] Amazon PA-API variables - If using Amazon integration
- [ ] S3 variables - If using S3 storage
- [ ] Stripe variables - If using payments

---

## After Adding Variables

1. **Redeploy your project:**
   - Go to **Deployments** tab
   - Click **"Redeploy"** on the latest deployment
   - Or push a new commit to trigger a new deployment

2. **Verify variables are loaded:**
   - Check build logs to ensure no environment variable errors
   - Test your application

---

## Important Notes

✅ **Always add to all environments** (Production, Preview, Development) unless you have a specific reason not to

✅ **Never commit secrets** - Environment variables are stored securely in Vercel

✅ **Update NEXTAUTH_URL** after first deployment with your actual Vercel URL

✅ **Database must be set up first** - You need a cloud database (Neon, Supabase, etc.) before adding DATABASE_URL

---

## Need Help?

- **Generate NEXTAUTH_SECRET:** https://generate-secret.vercel.app/32
- **Get Database:** https://neon.tech (free PostgreSQL)
- **Vercel Docs:** https://vercel.com/docs/concepts/projects/environment-variables

