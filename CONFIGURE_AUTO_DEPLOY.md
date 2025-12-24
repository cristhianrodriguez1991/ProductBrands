# Configure Auto-Deploy on Git Push - Complete Guide

## ✅ Goal: Auto-deploy every time you push to `main` branch

---

## Step 1: Verify Git Connection in Vercel

1. **Go to:** Vercel Dashboard → Your Project → **Settings** → **Git**
2. **Verify:**
   - ✅ Repository: `cristhianrodriguez1991/ProductBrands`
   - ✅ Branch: `main`
   - ✅ Status: Connected

---

## Step 2: Set Production Branch

1. **Go to:** **Settings** → **General**
2. **Find:** "Production Branch"
3. **Set to:** `main`
4. **Click:** Save

**This is CRITICAL** - Without this, Vercel won't know which branch to auto-deploy.

---

## Step 3: Enable Auto-Deploy

1. **Go to:** **Settings** → **General**
2. **Look for:** "Automatic deployments from Git" or "Auto-deploy"
3. **Make sure it's:** ✅ **Enabled/ON**
4. **If it's OFF:** Toggle it ON
5. **Click:** Save

---

## Step 4: Verify Deployment Settings

In **Settings** → **General**, check:

- ✅ **Production Branch:** `main`
- ✅ **Auto-deploy:** Enabled
- ✅ **Preview Deployments:** Enabled (optional, for PRs)

---

## Step 5: Test Auto-Deploy

After configuring, test it:

1. **Make a small change:**
   ```bash
   echo "// Auto-deploy test" >> app/page.tsx
   ```

2. **Commit and push:**
   ```bash
   git add app/page.tsx
   git commit -m "Test auto-deploy"
   git push origin main
   ```

3. **Watch Vercel Dashboard:**
   - Go to **Deployments** tab immediately
   - Within 10-30 seconds, you should see a new deployment starting
   - It should show your commit message

---

## Step 6: If Auto-Deploy Still Doesn't Work

### Option A: Reconnect Git Repository

1. **Settings** → **Git**
2. **Click:** "Disconnect" (if available)
3. **Then:** "Connect Git Repository"
4. **Select:** Your repository
5. **Select branch:** `main`
6. **This will trigger a deployment**

### Option B: Check Branch Protection

1. **Settings** → **Git**
2. Make sure there are no branch protection rules blocking deployments
3. Verify `main` branch is accessible

### Option C: Manual First Deployment

Sometimes the first deployment needs to be manual:

1. **Deployments** tab
2. **Click:** "Deploy" button
3. **Select:** "Deploy Latest Commit"
4. **After this succeeds, auto-deploy should work**

---

## How It Works

Once configured correctly:

1. **You push to `main`** → GitHub webhook triggers Vercel
2. **Vercel detects the push** → Starts a new build
3. **Build completes** → Deploys to production
4. **You get notified** → In Vercel dashboard and GitHub (if enabled)

---

## Verify It's Working

After pushing a commit:

1. **Check Vercel Dashboard** → Deployments tab
2. **You should see:**
   - New deployment starting automatically
   - Your commit message
   - Your commit hash
   - Status: Building → Ready

3. **Timeline:**
   - Push to GitHub: 0 seconds
   - Vercel detects: 10-30 seconds
   - Build starts: 30-60 seconds
   - Deployment: 2-5 minutes

---

## Troubleshooting Checklist

- [ ] Git repository is connected in Settings → Git
- [ ] Production Branch is set to `main` in Settings → General
- [ ] Auto-deploy is enabled in Settings → General
- [ ] You're pushing to `main` branch (not a different branch)
- [ ] First deployment was successful (sometimes needed)
- [ ] No branch protection blocking deployments

---

## Quick Configuration Summary

**Must Have:**
1. ✅ Git connected: `Settings → Git`
2. ✅ Production Branch = `main`: `Settings → General`
3. ✅ Auto-deploy = ON: `Settings → General`

**Test:**
```bash
git commit --allow-empty -m "Test auto-deploy"
git push origin main
```

Then watch Vercel Dashboard → Deployments tab for automatic deployment!

