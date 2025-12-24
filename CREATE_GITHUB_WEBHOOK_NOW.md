# Create GitHub Webhook - You Have the URL!

## ✅ You Found the Vercel Webhook URL!

**URL:** `https://api.vercel.com/v1/integrations/deploy/prj_rWsWxeW5FV6ieswIWHlHGMR6hnzs/iunzDmkrAF`

This is your deploy hook URL. We can use this format to create the GitHub webhook.

---

## Step 1: Create Webhook in GitHub

1. **Go to:** https://github.com/cristhianrodriguez1991/ProductBrands/settings/hooks
2. **Click:** "Add webhook" button
3. **Fill in the form:**

### Payload URL:
```
https://api.vercel.com/v1/integrations/deploy/prj_rWsWxeW5FV6ieswIWHlHGMR6hnzs/iunzDmkrAF
```

### Content type:
```
application/json
```

### Secret:
Leave empty (or you can add one if you want extra security)

### SSL verification:
✅ **Enable SSL verification** (checked)

### Which events would you like to trigger this webhook?
✅ **Just the push event** (selected)

### Active:
✅ **Checked**

4. **Click:** "Add webhook"

---

## Step 2: Verify Webhook Was Created

1. **After creating, you should see:**
   - The webhook in the list
   - Status: Active
   - Recent deliveries (will show when you push)

2. **Test it:**
   - Make a small change and push
   - Check "Recent Deliveries" in the webhook
   - Should show successful delivery

---

## Step 3: Test Auto-Deploy

After creating the webhook:

1. **Make a small change:**
   ```cmd
   echo "// Test webhook" >> app/page.tsx
   git add app/page.tsx
   git commit -m "Test webhook auto-deploy"
   git push origin main
   ```

2. **Check Vercel Dashboard:**
   - Go to Deployments tab
   - Within 10-30 seconds, a new deployment should start automatically!

3. **Check GitHub Webhook:**
   - Go to webhook settings
   - Click on the webhook
   - Check "Recent Deliveries"
   - Should show a successful delivery

---

## What This Does

- **GitHub webhook** → Notifies Vercel when you push
- **Vercel receives notification** → Starts deployment automatically
- **Auto-deploy works!** 🎉

---

## Summary

**You have the webhook URL!**  
**Create it in GitHub with the settings above**  
**Auto-deploy will work after that!**

Go to GitHub webhook settings and add the webhook with the URL you found!

