# Create Webhook via Vercel Dashboard

## Issue: `vercel link` Doesn't Create Webhook

The `vercel link` command links the project but doesn't automatically create the GitHub webhook. We need to connect Git through the Vercel Dashboard.

---

## Step 1: Disconnect Git in Vercel Dashboard

1. **Go to:** Vercel Dashboard → Your Project (`product-brands`)
2. **Settings** → **Git**
3. **Click:** "Disconnect" button (if repository is connected)
4. **Confirm** disconnection

---

## Step 2: Reconnect Git Repository

1. **In Settings → Git**
2. **Click:** "Connect Git Repository" or "Change Git Repository"
3. **Select:** `cristhianrodriguez1991/ProductBrands`
4. **Important:** When GitHub asks for permissions:
   - ✅ Grant access to repository
   - ✅ Allow webhook creation
   - ✅ Grant all requested permissions
5. **Select branch:** `main`
6. **This should create the webhook automatically**

---

## Step 3: Verify Webhook Was Created

1. **Go to:** https://github.com/cristhianrodriguez1991/ProductBrands/settings/hooks
2. **You should now see:**
   - A Vercel webhook
   - URL: `https://api.vercel.com/v1/integrations/deploy/...`
   - Status: Active
   - Recent deliveries

---

## Step 4: Test Auto-Deploy

After the webhook is created:

1. **Make a small change:**
   ```cmd
   echo "// Test" >> app/page.tsx
   git add app/page.tsx
   git commit -m "Test auto-deploy"
   git push origin main
   ```

2. **Check Vercel Dashboard:**
   - Go to Deployments tab
   - Within 10-30 seconds, a new deployment should start automatically

---

## Why Dashboard Works But CLI Doesn't

- **Vercel Dashboard:** Creates webhook automatically when connecting Git
- **Vercel CLI (`vercel link`):** Links project but doesn't create webhook
- **Solution:** Connect Git through Dashboard to create webhook

---

## Alternative: Use Deploy Hook

If webhook still doesn't work:

1. **Settings** → **Git** → **Deploy Hooks**
2. **Create hook:**
   - Name: `Manual Deploy`
   - Branch: `main`
3. **Copy URL** and use it to trigger deployments manually

---

## Summary

**Problem:** `vercel link` doesn't create webhook  
**Solution:** Reconnect Git through Vercel Dashboard  
**Result:** Webhook should be created automatically

**Next:** Go to Vercel Dashboard → Settings → Git → Disconnect → Reconnect

This should create the webhook properly!

