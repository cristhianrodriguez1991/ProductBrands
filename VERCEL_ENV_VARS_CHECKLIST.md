# Vercel Environment Variables Checklist

## ✅ Required Variables (Must Have)

### 1. DATABASE_URL
```
postgresql://neondb_owner:npg_0BjVpNHbtrf7@ep-dark-field-ahhqbnn4-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require
```
**Check:**
- ✅ Exact copy from Neon dashboard
- ✅ Includes `sslmode=require`
- ✅ No extra spaces

### 2. NEXTAUTH_SECRET
```
y6uYplsRHUpnU3OtWUjVtlr0xJbT1jbd4MfDDhZ2YOs=
```
**Check:**
- ✅ Set to this value
- ✅ No quotes around it

### 3. NEXTAUTH_URL
```
https://your-actual-vercel-url.vercel.app
```
**Check:**
- ✅ Matches your actual Vercel URL
- ✅ Starts with `https://`
- ✅ No trailing slash
- ⚠️ **Update this AFTER first deployment** with your real URL

---

## 📋 Recommended Variables (Should Have)

### 4. EMAIL_FROM
```
noreply@productbrands.com
```

### 5. CONTACT_EMAIL
```
info@productbrands.com
```

---

## 🔍 How to Check in Vercel

1. **Go to:** Vercel Dashboard → Your Project
2. **Settings** → **Environment Variables**
3. **For each variable:**
   - ✅ Name is exact (case-sensitive!)
   - ✅ Value is correct
   - ✅ All environments selected: Production ✅ Preview ✅ Development ✅

---

## ⚠️ Common Mistakes

### Mistake 1: Wrong Variable Name
- ❌ `DATABASE_URL` (wrong)
- ✅ `DATABASE_URL` (correct - but check for typos!)

### Mistake 2: Missing Environments
- ❌ Only Production selected
- ✅ Production, Preview, AND Development selected

### Mistake 3: NEXTAUTH_URL Wrong
- ❌ `http://localhost:3000`
- ❌ `https://product-brands.vercel.app` (if that's not your URL)
- ✅ Your actual Vercel URL (get from deployment page)

### Mistake 4: Extra Spaces/Quotes
- ❌ `"postgresql://..."` (with quotes)
- ❌ ` postgresql://...` (with leading space)
- ✅ `postgresql://...` (no quotes, no spaces)

---

## 🔄 After Adding/Updating Variables

**Important:** Environment variables only apply to NEW deployments!

1. **Add/update variables**
2. **Redeploy:**
   - Go to Deployments tab
   - Click "Redeploy" on latest deployment
   - OR push a new commit

---

## 🐛 If Still Getting Errors

**Check:**
1. Are all variables added? (Check the list above)
2. Are values correct? (Copy exactly)
3. Are all environments selected?
4. Did you redeploy after adding variables?

**Share the error message** and I'll help fix it!

