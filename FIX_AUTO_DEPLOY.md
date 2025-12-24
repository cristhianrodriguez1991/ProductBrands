# Fix Auto-Deploy - Step by Step

## Issue: Auto-deploy Not Working

Let's verify and fix the auto-deploy settings.

---

## Step 1: Check Production Branch Settings

1. **Go to Vercel Dashboard** → Your Project
2. **Settings** → **General**
3. Look for **"Production Branch"**
4. **Make sure it's set to:** `main`
5. If it's different, change it to `main` and **Save**

---

## Step 2: Verify Git Integration

1. **Settings** → **Git**
2. Verify:
   - ✅ Repository shows: `cristhianrodriguez1991/ProductBrands`
   - ✅ Branch shows: `main`
3. If anything looks wrong, you may need to reconnect

---

## Step 3: Check Deployment Settings

1. **Settings** → **General**
2. Look for:
   - **"Automatic deployments from Git"** - Should be enabled
   - **"Production Branch"** - Should be `main`
   - **"Auto-deploy"** - Should be ON

---

## Step 4: Manual Trigger (To Test)

If auto-deploy still doesn't work, let's trigger a deployment manually:

1. **Go to Deployments tab**
2. Click **"Redeploy"** on the latest deployment
3. Or click **"Deploy"** → **"Deploy Latest Commit"**

---

## Step 5: Verify Latest Commit is Pushed

Let's make sure the latest code is on GitHub:

```bash
git log --oneline -1
git push origin main
```

---

## Step 6: Check if Deployments Exist

1. **Go to Deployments tab**
2. Check if there are any deployments listed
3. If empty, you may need to trigger the first deployment manually

---

## Alternative: Reconnect Git Repository

If nothing works, try reconnecting:

1. **Settings** → **Git**
2. Click **"Disconnect"** (if available)
3. Then **"Connect Git Repository"**
4. Select your repository again
5. Select branch: `main`
6. This should trigger a new deployment

---

## Quick Fix: Trigger Deployment Now

Let's push a new commit to trigger deployment:

```bash
git commit --allow-empty -m "Trigger deployment"
git push origin main
```

Then check Vercel Dashboard → Deployments for a new deployment.

