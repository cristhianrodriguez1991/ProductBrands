# Production Environment Variables Template

Copy these variables to your production environment (Vercel, Docker, or server).

## Required Variables

```env
# Database - Production PostgreSQL Connection
# Use a managed service like Vercel Postgres, Neon, Supabase, or AWS RDS
DATABASE_URL="postgresql://user:password@host:5432/productbrands?sslmode=require"

# NextAuth Configuration
NEXTAUTH_URL="https://productbrands.com"
NEXTAUTH_SECRET="REPLACE_WITH_RANDOM_32_CHAR_STRING_MINIMUM"

# Email Configuration (Resend)
RESEND_API_KEY="re_xxxxxxxxxxxxx"
EMAIL_FROM="noreply@productbrands.com"
CONTACT_EMAIL="info@productbrands.com"
```

## Optional Variables

```env
# Google OAuth (if using Google sign-in)
GOOGLE_CLIENT_ID="your-google-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# AWS S3 Storage (if using S3 for file uploads)
S3_ENDPOINT="https://s3.amazonaws.com"
S3_REGION="us-east-1"
S3_ACCESS_KEY_ID="your-aws-access-key"
S3_SECRET_ACCESS_KEY="your-aws-secret-key"
S3_BUCKET_NAME="product-brands-production"
S3_PUBLIC_URL="https://cdn.productbrands.com"

# Stripe (if using payments)
STRIPE_SECRET_KEY="sk_live_xxxxxxxxxxxxx"
STRIPE_PUBLISHABLE_KEY="pk_live_xxxxxxxxxxxxx"

# Amazon Product Advertising API (if using)
AMAZON_PAAPI_ACCESS_KEY=""
AMAZON_PAAPI_SECRET_KEY=""
AMAZON_PAAPI_PARTNER_TAG=""
AMAZON_PAAPI_HOST="webservices.amazon.com"

# Environment
NODE_ENV="production"
```

## Generating NEXTAUTH_SECRET

**Important:** Generate a strong random secret for production:

```bash
# Using OpenSSL (Mac/Linux):
openssl rand -base64 32

# Using Node.js:
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Using PowerShell (Windows):
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))
```

## Setting Up Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URI: `https://productbrands.com/api/auth/callback/google`
6. Copy Client ID and Secret to environment variables

## Setting Up Resend Email

1. Sign up at [resend.com](https://resend.com)
2. Create API key
3. Verify domain `productbrands.com`
4. Add API key to `RESEND_API_KEY`
5. Update `EMAIL_FROM` to match verified domain

## Database Connection Pooling

For production databases, use connection pooling:

**Vercel Postgres:**
- Automatically includes pooling
- Connection string format: `postgres://...?sslmode=require`

**Supabase:**
- Use connection pooler port: `6543` instead of `5432`
- Format: `postgresql://user:pass@host:6543/db`

**Neon:**
- Connection string automatically includes pooling
- Use the provided connection string as-is

## Security Notes

- ✅ Never commit these values to Git
- ✅ Use different secrets for each environment
- ✅ Rotate secrets periodically
- ✅ Use SSL/HTTPS for all connections
- ✅ Restrict database access to deployment platform IPs

