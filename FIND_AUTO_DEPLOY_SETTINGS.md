# Find Auto-Deploy Settings - You're in the Wrong Section!

## ⚠️ You're Currently In: Framework Settings

The auto-deploy settings are NOT here. You need to go to **General Settings**.

---

## ✅ Where to Find Auto-Deploy Settings

### Step 1: Go to General Settings

1. **In Vercel Dashboard**, you're currently in:
   - **Settings** → **Framework Settings** (where you are now)

2. **You need to go to:**
   - **Settings** → **General** (click on "General" in the left sidebar)

---

## Step 2: Find These Settings in General

Once in **Settings → General**, look for:

### 1. Production Branch
- **Location:** Near the top of the page
- **Should be set to:** `main`
- **If it's different:** Change it to `main` and Save

### 2. Auto-Deploy / Automatic Deployments
- **Location:** In the General settings
- **Look for:** "Automatic deployments from Git" or "Auto-deploy"
- **Should be:** ✅ Enabled/ON
- **If it's OFF:** Toggle it ON and Save

---

## Step 3: Navigation Path

```
Vercel Dashboard
  → Your Project (product-brands)
    → Settings (left sidebar)
      → General ← GO HERE (not Framework Settings)
        → Production Branch: main
        → Auto-deploy: Enabled
```

---

## Current Framework Settings (What You're Looking At)

These settings are fine for auto-deploy:
- ✅ **Framework Preset:** Next.js (correct)
- ✅ **Root Directory:** Empty (correct - code is in root)
- ✅ **Node.js Version:** 24.x (good)
- ✅ **Build Command:** `npm run build` (correct)

**These don't affect auto-deploy** - they're just build configuration.

---

## What You Need to Change

**Go to Settings → General** and check:

1. **Production Branch** = `main` ✅
2. **Auto-deploy** = Enabled ✅

---

## Quick Checklist

- [ ] Go to **Settings → General** (not Framework Settings)
- [ ] Find **"Production Branch"** → Set to `main`
- [ ] Find **"Auto-deploy"** or **"Automatic deployments"** → Enable it
- [ ] Click **Save**
- [ ] Test by pushing a commit

---

## After Configuring

Once you set Production Branch to `main` and enable Auto-deploy:

1. **Push to GitHub:**
   ```bash
   git push origin main
   ```

2. **Watch Vercel:**
   - Go to **Deployments** tab
   - Within 10-30 seconds, a new deployment should start automatically

---

## Summary

**You're in:** Settings → Framework Settings  
**You need:** Settings → General  

**Look for:**
- Production Branch = `main`
- Auto-deploy = Enabled

Then auto-deploy will work on every `git push origin main`!

