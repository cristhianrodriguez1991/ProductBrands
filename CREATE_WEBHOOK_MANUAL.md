# Create GitHub Webhook Manually for Vercel

## Step 1: Get Vercel Webhook URL

We need to get the webhook URL from Vercel. There are a few ways:

### Option A: Create Deploy Hook First (Easiest)

1. **Vercel Dashboard** → Your Project → **Settings** → **Git** → **Deploy Hooks**
2. **Create a deploy hook:**
   - Name: `GitHub Webhook`
   - Branch: `main`
   - Click **Create**
3. **Copy the URL** - it will look like:
   ```
   https://api.vercel.com/v1/integrations/deploy/{hookId}/{secret}
   ```
4. **Note:** This is a deploy hook URL, but we can use a similar format for the webhook

### Option B: Get from Vercel Integration

The webhook URL format for Vercel Git integration is typically:
```
https://api.vercel.com/v1/integrations/deploy/{integrationId}/{secret}
```

But we need the actual integration ID from Vercel.

---

## Step 2: Create Webhook in GitHub

Once you have the URL, fill in the form:

### Payload URL:
```
https://api.vercel.com/v1/integrations/deploy/{YOUR_INTEGRATION_ID}/{YOUR_SECRET}
```

**You'll need to get this from Vercel. Let me help you find it.**

### Content type:
```
application/json
```

### Secret:
Leave empty (or get from Vercel if they provide one)

### SSL verification:
✅ **Enable SSL verification** (checked)

### Which events:
✅ **Just the push event** (selected)

### Active:
✅ **Checked**

---

## Step 3: Get Integration ID from Vercel

The challenge is getting the actual integration ID. Let's try:

1. **Vercel Dashboard** → Your Project → **Settings** → **Git**
2. **Look for:** Integration ID or Webhook URL
3. **OR:** Check browser network tab when connecting Git
4. **OR:** Use Vercel API to list integrations

---

## Alternative: Use Vercel CLI (Recommended)

This is easier and more reliable:

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Link project (this creates the webhook automatically)
vercel link
```

This will properly set up the webhook for you.

---

## Quick Solution: Check Vercel Project Settings

1. **Vercel Dashboard** → Your Project
2. **Settings** → **Git**
3. **Look for:** "Webhook URL" or "Integration details"
4. **Copy the webhook URL** if shown

---

## If You Can't Find the URL

The webhook URL is typically generated when you connect Git. Since reconnecting didn't create it, we might need to:

1. **Use Vercel CLI** (most reliable)
2. **Contact Vercel support** to get the webhook URL
3. **Use deploy hooks** as a workaround (manual trigger)

---

## Recommended: Use Vercel CLI

This is the most reliable way:

```bash
npm i -g vercel
vercel login
vercel link
```

This will:
- Properly connect your project
- Create the webhook automatically
- Set up everything correctly

---

## Summary

**To create webhook manually, you need:**
1. Vercel webhook URL (format: `https://api.vercel.com/v1/integrations/deploy/{id}/{secret}`)
2. Get this from Vercel settings or use CLI

**Easier solution:**
- Use `vercel link` command - it sets up everything automatically

Let me know if you want to use the CLI method or if you can find the webhook URL in Vercel settings!

