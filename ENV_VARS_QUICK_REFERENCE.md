# Environment Variables - Quick Reference Card

## 🚀 Quick Steps

1. Go to: **Vercel Dashboard** → Your Project → **Settings** → **Environment Variables**
2. Click **"Add New"** for each variable below
3. Copy and paste the values
4. Select all environments (Production, Preview, Development)
5. Click **"Save"**
6. **Redeploy** your project

---

## ✅ REQUIRED Variables (Must Add)

### 1. DATABASE_URL
```
postgresql://username:password@host:port/database?sslmode=require
```
**Get from:** Neon, Supabase, Vercel Postgres, or your PostgreSQL provider

---

### 2. NEXTAUTH_SECRET
```
y6uYplsRHUpnU3OtWUjVtlr0xJbT1jbd4MfDDhZ2YOs=
```
**Or generate new:** https://generate-secret.vercel.app/32

---

### 3. NEXTAUTH_URL
```
https://your-project-name.vercel.app
```
**Replace with:** Your actual Vercel deployment URL (get after first deploy)

---

## 📧 RECOMMENDED Variables

### 4. EMAIL_FROM
```
noreply@productbrands.com
```

### 5. CONTACT_EMAIL
```
info@productbrands.com
```

---

## 🔧 OPTIONAL Variables (Only if using)

### Email (Resend)
- `RESEND_API_KEY` - Get from https://resend.com

### Google OAuth
- `GOOGLE_CLIENT_ID` - From Google Cloud Console
- `GOOGLE_CLIENT_SECRET` - From Google Cloud Console

### Amazon PA-API
- `AMAZON_PAAPI_ACCESS_KEY`
- `AMAZON_PAAPI_SECRET_KEY`
- `AMAZON_PAAPI_PARTNER_TAG`
- `AMAZON_PAAPI_REGION` = `us-east-1`
- `AMAZON_MARKETPLACE` = `www.amazon.com`

### S3 Storage
- `S3_ENDPOINT`
- `S3_REGION` = `us-east-1`
- `S3_ACCESS_KEY_ID`
- `S3_SECRET_ACCESS_KEY`
- `S3_BUCKET_NAME`
- `S3_PUBLIC_URL`

### Stripe
- `STRIPE_SECRET_KEY`
- `STRIPE_PUBLISHABLE_KEY`

---

## 📝 Step-by-Step in Vercel

1. **Navigate:**
   - Vercel Dashboard → Your Project → **Settings** → **Environment Variables**

2. **For each variable:**
   - Click **"Add New"**
   - Enter **Name** (e.g., `DATABASE_URL`)
   - Enter **Value** (paste your value)
   - Select environments: ✅ Production ✅ Preview ✅ Development
   - Click **"Save"**

3. **After adding all:**
   - Go to **Deployments** tab
   - Click **"Redeploy"** on latest deployment
   - Or push a commit to trigger new deployment

---

## ⚠️ Important

- **DATABASE_URL** - Must be from a cloud database (not localhost)
- **NEXTAUTH_URL** - Update after first deployment with actual URL
- **NEXTAUTH_SECRET** - Keep this secret, never share it
- Add to **all environments** unless you have a specific reason

---

## 🆘 Need a Database?

**Free Options:**
- **Neon:** https://neon.tech (Recommended - Free, Serverless)
- **Supabase:** https://supabase.com (Free tier)
- **Vercel Postgres:** In Vercel Dashboard → Storage tab

