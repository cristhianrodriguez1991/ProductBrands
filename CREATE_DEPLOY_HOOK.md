# Create Deploy Hook - Quick Trigger for Deployments

## What is a Deploy Hook?

A deploy hook is a unique URL that triggers a deployment when you visit it. It's useful as a backup when auto-deploy isn't working.

---

## Create Deploy Hook

### Step 1: Fill in the Form

In the Deploy Hooks section:

1. **Name:** `Manual Deploy` (or any name you want)
2. **Branch:** `main`
3. **Click:** "Create Hook" or "Add"

### Step 2: Copy the Hook URL

After creating, you'll get a URL like:
```
https://api.vercel.com/v1/integrations/deploy/xxxxx/xxxxx
```

**Save this URL** - you'll use it to trigger deployments.

---

## How to Use Deploy Hook

### Option 1: Visit the URL

1. **Copy the deploy hook URL**
2. **Open it in a browser**
3. **Or use curl:**
   ```bash
   curl https://api.vercel.com/v1/integrations/deploy/xxxxx/xxxxx
   ```
4. **This triggers a deployment** of the latest commit from `main` branch

### Option 2: Add to GitHub Actions

You can use the hook in GitHub Actions to trigger deployments automatically.

---

## ⚠️ Important: This is a Workaround

**Deploy hooks are NOT the same as auto-deploy:**
- ✅ Deploy hook: Manual trigger via URL
- ✅ Auto-deploy: Automatic on git push (what you want)

**You still need to fix the Git connection** for true auto-deploy.

---

## Fix Git Connection (Still Needed)

Even with a deploy hook, you should fix auto-deploy:

1. **Settings** → **Git**
2. **Disconnect** the repository
3. **Reconnect** it
4. This will fix auto-deploy for future pushes

---

## Quick Setup

1. **Create deploy hook now:**
   - Name: `Manual Deploy`
   - Branch: `main`
   - Click Create

2. **Use it to deploy latest commit:**
   - Visit the hook URL
   - Triggers deployment of latest code

3. **Fix Git connection:**
   - Disconnect and reconnect Git
   - This enables auto-deploy

---

## Summary

**Deploy Hook:** Manual trigger (good backup)  
**Auto-Deploy:** Automatic on push (what you want)  
**Both:** Useful to have!

Create the deploy hook, then fix the Git connection for full auto-deploy functionality.

