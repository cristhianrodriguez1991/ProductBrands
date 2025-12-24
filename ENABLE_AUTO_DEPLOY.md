# Enable Auto-Deploy from Git Pushes

## Quick Setup Steps

### Step 1: Verify GitHub Integration in Vercel

1. **Go to Vercel Dashboard:** https://vercel.com/dashboard
2. **Click on your project** (ProductBrands)
3. Go to **Settings** → **Git**
4. **Verify the connection:**
   - Should show: `github.com/cristhianrodriguez1991/ProductBrands`
   - Branch: `main`
   - **Production Branch:** Should be set to `main`

### Step 2: Enable Auto-Deploy (If Not Already Enabled)

1. In **Settings** → **Git**
2. Make sure **"Automatic deployments from Git"** is **enabled**
3. Under **Production Branch**, select `main`
4. **Save** changes

### Step 3: Configure Deployment Settings

1. Go to **Settings** → **General**
2. **Production Branch:** `main`
3. **Auto-deploy:** ✅ Enabled
4. **Preview Deployments:** ✅ Enabled (optional, for pull requests)

### Step 4: Trigger a New Deployment

Since Vercel is currently building an old commit, let's trigger a new deployment:

**Option A: Push a new commit (Recommended)**
```bash
git commit --allow-empty -m "Trigger Vercel deployment"
git push origin main
```

**Option B: Redeploy from Vercel Dashboard**
1. Go to **Deployments** tab
2. Click **"Redeploy"** on latest deployment
3. Make sure it's building from the latest commit

---

## Verify Auto-Deploy is Working

After pushing a commit:

1. **Check Vercel Dashboard:**
   - Go to **Deployments** tab
   - You should see a new deployment starting automatically
   - It should show the latest commit hash

2. **Check the commit being built:**
   - The deployment should show commit `d764fb5` or newer
   - NOT commit `7db3c2e` (the old one without axios)

---

## Current Issue

Vercel is building commit `7db3c2e` which doesn't have `axios` in package.json.

**Solution:** 
- The latest commit `d764fb5` has axios
- We need to trigger a new deployment from the latest commit
- Auto-deploy should then work for future pushes

---

## After Enabling Auto-Deploy

Every time you:
- Push to `main` branch → Vercel automatically deploys to production
- Create a pull request → Vercel creates a preview deployment
- Merge to `main` → Vercel deploys to production

---

## Troubleshooting

**If auto-deploy isn't working:**
1. Check GitHub integration in Vercel Settings → Git
2. Verify the repository is connected
3. Check that the branch is set to `main`
4. Make sure you're pushing to the correct repository

**If it's still building old commits:**
1. Go to Deployments → Click "Redeploy"
2. Or push an empty commit to trigger a new build
3. Verify the commit hash in the deployment matches your latest commit

