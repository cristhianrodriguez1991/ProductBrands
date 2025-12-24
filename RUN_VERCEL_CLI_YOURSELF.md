# Run Vercel CLI in Your Own Terminal

## ✅ You Need to Run These Commands Yourself

Since the automated terminal can't handle interactive prompts, please run these in your own PowerShell or Command Prompt:

---

## Step 1: Open Your Terminal

**Option A: Command Prompt (Recommended - No Policy Issues)**
- Press `Windows Key + R`
- Type: `cmd`
- Press Enter

**Option B: PowerShell**
- Press `Windows Key + R`
- Type: `powershell`
- Press Enter

---

## Step 2: Navigate to Your Project

```cmd
cd C:\Users\yanca\OneDrive\Desktop\ProductBrands
```

---

## Step 3: Run Vercel Commands

### Login to Vercel:
```cmd
npx vercel login
```

**This will:**
1. Show you a URL to visit
2. Show a code to enter
3. Wait for you to press Enter after you authenticate
4. Complete the login

### Link Your Project:
```cmd
npx vercel link
```

**This will:**
1. Ask which project to link (select your product-brands project)
2. Set up the webhook automatically
3. Configure everything properly

---

## Alternative: Use Deploy Hook (No CLI Needed)

If you prefer not to use CLI, you can use deploy hooks:

1. **Vercel Dashboard** → Your Project → **Settings** → **Git** → **Deploy Hooks**
2. **Create hook:**
   - Name: `Manual Deploy`
   - Branch: `main`
3. **Copy the URL**
4. **Use it to trigger deployments** manually when you push

**This works, but requires manual triggering.**

---

## Alternative: Get Webhook URL from Vercel Dashboard

Try to find the webhook URL in Vercel:

1. **Vercel Dashboard** → Your Project
2. **Settings** → **Git**
3. **Look for:** "Webhook URL" or integration details
4. **If you find it:** Use it in GitHub webhook form

---

## Recommended: Run CLI Yourself

**Just open Command Prompt and run:**

```cmd
cd C:\Users\yanca\OneDrive\Desktop\ProductBrands
npx vercel login
npx vercel link
```

**Follow the prompts:**
- Visit the URL it shows
- Enter the code
- Press Enter when done
- Select your project when linking

This will set up the webhook automatically!

---

## Summary

**Easiest:** Run `npx vercel login` and `npx vercel link` in your own Command Prompt  
**Alternative:** Use deploy hooks for manual triggering  
**Manual:** Try to find webhook URL in Vercel settings

Open Command Prompt and run the commands - it's interactive so you need to do it yourself!

