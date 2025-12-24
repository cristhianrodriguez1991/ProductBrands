# Deploy to Production - Complete Guide

## ✅ Local Server is Working!

Now let's get it online. Follow these steps:

---

## Step 1: Commit and Push Latest Changes

Make sure all your code is saved and pushed to GitHub:

```cmd
git add .
git commit -m "Fix syntax errors and prepare for deployment"
git push origin main
```

---

## Step 2: Verify Code is on GitHub

1. **Go to:** https://github.com/cristhianrodriguez1991/ProductBrands
2. **Check:** Latest commit is there
3. **Verify:** All files are committed

---

## Step 3: Set Up Database (If Not Done)

You already have Neon database set up! Just verify:

**Database URL:**
```
postgresql://neondb_owner:npg_0BjVpNHbtrf7@ep-dark-field-ahhqbnn4-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require
```

**Status:** ✅ Already set up and seeded

---

## Step 4: Add Environment Variables to Vercel

1. **Go to:** Vercel Dashboard → Your Project (`product-brands`)
2. **Settings** → **Environment Variables**
3. **Add these variables:**

### Required Variables:

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
https://your-project-name.vercel.app
```
**Note:** Update this after first deployment with your actual Vercel URL

### Recommended Variables:

#### 4. EMAIL_FROM
```
noreply@productbrands.com
```

#### 5. CONTACT_EMAIL
```
info@productbrands.com
```

**For each variable:**
- Select all environments: ✅ Production, ✅ Preview, ✅ Development
- Click "Save"

---

## Step 5: Deploy to Vercel

### Option A: Auto-Deploy (If Webhook is Working)

1. **Push a commit:**
   ```cmd
   git commit --allow-empty -m "Trigger production deployment"
   git push origin main
   ```

2. **Check Vercel Dashboard:**
   - Go to Deployments tab
   - Should see new deployment starting automatically

### Option B: Manual Deploy

1. **Vercel Dashboard** → **Deployments** tab
2. **Click:** "Deploy" → "Deploy Latest Commit"
3. **Select:** Latest commit from `main` branch
4. **Click:** Deploy

---

## Step 6: Wait for Build

1. **Watch the deployment:**
   - Should build successfully (has axios now)
   - Should complete in 2-5 minutes

2. **Check build logs:**
   - Click on the deployment
   - Watch for any errors
   - Should succeed!

---

## Step 7: Update NEXTAUTH_URL

After deployment completes:

1. **Get your Vercel URL:**
   - Should be: `https://product-brands-xxxxx.vercel.app`
   - Or your custom domain

2. **Update environment variable:**
   - Settings → Environment Variables
   - Edit `NEXTAUTH_URL`
   - Set to your actual Vercel URL
   - Redeploy

---

## Step 8: Test Your Live Site

1. **Visit your Vercel URL**
2. **Test the homepage**
3. **Test login:**
   - Admin: `admin@productbrands.com` / `admin123`
   - Customer: `customer@demo.com` / `customer123`

---

## Step 9: Set Up Custom Domain (Optional)

1. **Settings** → **Domains**
2. **Add your domain** (e.g., productbrands.com)
3. **Follow DNS setup instructions**
4. **Wait for DNS propagation**

---

## Checklist

### Before Deploying:
- [ ] Code committed and pushed to GitHub
- [ ] Database set up (Neon) ✅
- [ ] Environment variables added to Vercel
- [ ] Latest code includes axios ✅

### After Deploying:
- [ ] Build succeeds
- [ ] Site loads at Vercel URL
- [ ] Update NEXTAUTH_URL with actual URL
- [ ] Test login functionality
- [ ] Test all pages

---

## Quick Deploy Commands

```cmd
# 1. Commit latest changes
git add .
git commit -m "Ready for production deployment"
git push origin main

# 2. Check Vercel Dashboard
# - Should auto-deploy if webhook is working
# - Or manually deploy from Deployments tab
```

---

## Troubleshooting

**Build fails:**
- Check build logs in Vercel
- Verify all dependencies are in package.json
- Check environment variables are set

**Site loads but has errors:**
- Check browser console for errors
- Verify DATABASE_URL is correct
- Check NEXTAUTH_SECRET is set

**Can't log in:**
- Verify NEXTAUTH_URL matches your Vercel URL
- Check database is accessible
- Verify environment variables are set

---

## Summary

**Steps:**
1. ✅ Commit and push code
2. ✅ Add environment variables to Vercel
3. ✅ Deploy (auto or manual)
4. ✅ Update NEXTAUTH_URL after deployment
5. ✅ Test your live site!

Let's start with Step 1 - committing and pushing your code!

