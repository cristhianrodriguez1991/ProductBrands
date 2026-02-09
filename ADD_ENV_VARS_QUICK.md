# ⚡ Quick Guide: Add Environment Variables to Vercel

## Where to Go:
1. **Vercel Dashboard:** https://vercel.com/dashboard
2. **Click** your project: `product-brands`
3. **Settings** → **Environment Variables**

## Copy & Paste These:

### 1. DATABASE_URL
**Value:** [Paste your Neon connection string here]
**Environment:** ✅ Production

### 2. NEXTAUTH_URL
**Value:** `https://productbrands.com`
**Environment:** ✅ Production

### 3. NEXTAUTH_SECRET
**Value:** `BOO/xB8uIhPYlSVsazbNwZY2oxNL5/L2grBD516zUUs=`
**Environment:** ✅ Production

### 4. EMAIL_FROM
**Value:** `noreply@productbrands.com`
**Environment:** ✅ Production

### 5. CONTACT_EMAIL
**Value:** `info@productbrands.com`
**Environment:** ✅ Production

### 6. RESEND_API_KEY
**Value:** Your Resend API key (starts with `re_` — use the same key as in `.env.local` if you have one)
**Environment:** ✅ Production

---

## After Adding All Variables:

1. Go to **Deployments** tab
2. Click **⋯** on latest deployment
3. Click **Redeploy**
4. Wait 2-3 minutes

**Done!** ✅






