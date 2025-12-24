# Fix Vercel Git Connection - Auto-Deploy Not Working

## Problem

Vercel is not auto-deploying when you push to GitHub. This means the Git connection is broken.

---

## Solution: Reconnect Git Repository

### Step 1: Disconnect Git

1. **Go to:** Vercel Dashboard → Your Project
2. **Settings** → **Git**
3. **Click:** "Disconnect" (if connected)
4. **Confirm** disconnection

### Step 2: Reconnect Git

1. **Still in Settings → Git**
2. **Click:** "Connect Git Repository"
3. **Select:** GitHub
4. **Authorize** Vercel (if needed)
5. **Select repository:** `cristhianrodriguez1991/ProductBrands`
6. **Select branch:** `main`
7. **Click:** "Connect"

### Step 3: Grant All Permissions

**Important:** When authorizing, make sure to grant:
- ✅ Read repository
- ✅ Write repository (for webhooks)
- ✅ Read/write webhooks

This ensures Vercel can create the webhook for auto-deploy.

### Step 4: Verify Connection

After reconnecting:
1. **Check:** Settings → Git shows your repository
2. **Check:** Branch is set to `main`
3. **Check:** Auto-deploy is enabled

### Step 5: Test Auto-Deploy

1. **Push a test commit:**
   ```cmd
   git commit --allow-empty -m "Test auto-deploy after Git reconnect"
   git push origin main
   ```

2. **Check Vercel Dashboard:**
   - Should see new deployment starting automatically
   - Should show your latest commit

---

## Alternative: Manual Deploy While Fixing

While fixing the connection, you can manually deploy:

1. **Vercel Dashboard** → **Deployments**
2. **Click:** "Deploy" → "Deploy Latest Commit"
3. **Select:** Latest commit
4. **Deploy**

---

## Check Webhook Status

After reconnecting, check if webhook was created:

1. **GitHub** → Your repository
2. **Settings** → **Webhooks**
3. **Look for:** Vercel webhook
4. **Should show:** Recent deliveries

If no webhook appears, the connection might not be complete.

---

## Common Issues

### Issue 1: Permissions Not Granted

**Fix:** Reconnect and make sure to grant ALL permissions when authorizing.

### Issue 2: Wrong Repository Selected

**Fix:** Make sure you selected `cristhianrodriguez1991/ProductBrands`, not a different repo.

### Issue 3: Wrong Branch

**Fix:** Make sure branch is set to `main`, not `master` or another branch.

### Issue 4: Webhook Not Created

**Fix:** Disconnect and reconnect, making sure to grant webhook permissions.

---

## Quick Steps Summary

1. **Vercel Dashboard** → Project → **Settings** → **Git**
2. **Disconnect** (if connected)
3. **Connect Git Repository**
4. **Select GitHub** → **Authorize** (grant all permissions)
5. **Select:** `cristhianrodriguez1991/ProductBrands`
6. **Select branch:** `main`
7. **Connect**
8. **Test:** Push a commit and check for auto-deploy

---

## After Reconnecting

**Verify it works:**
- Push a commit
- Check Vercel Dashboard
- Should see deployment starting automatically

**If still not working:**
- Check GitHub webhooks (Settings → Webhooks)
- Make sure webhook exists and has recent deliveries
- Try disconnecting and reconnecting again

---

## Summary

**Problem:** Git connection broken, no auto-deploy  
**Solution:** Disconnect and reconnect Git repository in Vercel  
**Important:** Grant all permissions when authorizing

Go to Vercel Dashboard → Settings → Git and reconnect now!

