# Production Deployment Checklist

## ✅ Step 1: Code Committed and Pushed

**Status:** ✅ Just committed and pushed!

---

## 📋 Step 2: Add Environment Variables to Vercel

**Go to:** Vercel Dashboard → Your Project → **Settings** → **Environment Variables**

### Add These Variables:

#### 1. DATABASE_URL
```
postgresql://neondb_owner:npg_0BjVpNHbtrf7@ep-dark-field-ahhqbnn4-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require
```

#### 2. NEXTAUTH_SECRET
```
y6uYplsRHUpnU3OtWUjVtlr0xJbT1jbd4MfDDhZ2YOs=
```

#### 3. NEXTAUTH_URL
```
https://product-brands.vercel.app
```
**Note:** Update this after deployment with your actual Vercel URL

#### 4. EMAIL_FROM (Recommended)
```
noreply@productbrands.com
```

#### 5. CONTACT_EMAIL (Recommended)
```
info@productbrands.com
```

**For each variable:**
- ✅ Select: Production, Preview, Development
- Click "Save"

---

## 🚀 Step 3: Deploy to Vercel

### Option A: Auto-Deploy (If Webhook Works)

The code is already pushed. Check Vercel Dashboard:
1. **Go to:** Deployments tab
2. **Should see:** New deployment starting automatically
3. **If not:** Use Option B

### Option B: Manual Deploy

1. **Vercel Dashboard** → **Deployments** tab
2. **Click:** "Deploy" → "Deploy Latest Commit"
3. **Select:** Latest commit from `main`
4. **Click:** Deploy

---

## ⏳ Step 4: Wait for Build

1. **Watch the deployment:**
   - Should build successfully
   - Takes 2-5 minutes

2. **Check build logs:**
   - Click on deployment
   - Should succeed (has axios now)

---

## 🔗 Step 5: Get Your Vercel URL

After deployment completes:

1. **Deployments tab** → Click on successful deployment
2. **Copy the URL:** Should be like `https://product-brands-xxxxx.vercel.app`
3. **Update NEXTAUTH_URL:**
   - Settings → Environment Variables
   - Edit `NEXTAUTH_URL`
   - Set to your actual Vercel URL
   - Redeploy

---

## ✅ Step 6: Test Your Live Site

1. **Visit your Vercel URL**
2. **Test homepage** - Should load
3. **Test login:**
   - Admin: `admin@productbrands.com` / `admin123`
   - Customer: `customer@demo.com` / `customer123`

---

## 📊 Current Status

- ✅ **Code:** Committed and pushed
- ✅ **Database:** Set up (Neon)
- ⏳ **Environment Variables:** Need to add in Vercel
- ⏳ **Deployment:** Ready to deploy

---

## 🎯 Next Actions

1. **Add environment variables** in Vercel (Step 2 above)
2. **Deploy** (should auto-deploy or do it manually)
3. **Update NEXTAUTH_URL** after getting your Vercel URL
4. **Test** your live site!

---

## Summary

**What's done:**
- ✅ Code fixed and pushed
- ✅ Database ready

**What's next:**
- ⏳ Add environment variables to Vercel
- ⏳ Deploy to production
- ⏳ Test live site

**Go to Vercel Dashboard and add the environment variables now!**

