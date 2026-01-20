# 🚀 Step-by-Step Deployment Guide

## STEP 1: Login to Vercel ⚠️ REQUIRES YOUR ACTION

**Run this command in your terminal:**
```bash
vercel login
```

**What will happen:**
- Your browser will open automatically
- You'll see a Vercel login page
- If you don't have an account, click "Sign Up" (free)
- After logging in, return to terminal

**If browser doesn't open:**
1. Visit: https://vercel.com/login
2. Login or create account
3. Return to terminal and run: `vercel login --email your@email.com`

**✅ When done:** You'll see "Success! You are now logged in."

---

## STEP 2: Deploy to Vercel

**After logging in, run:**
```bash
vercel --prod
```

**Or use the script:**
```powershell
.\deploy.ps1
```

**What will happen:**
- Vercel will ask some questions:
  - **"Set up and deploy?"** → Type `Y` or press Enter
  - **"Which scope?"** → Select your account
  - **"Link to existing project?"** → Type `N` (new project)
  - **"What's your project's name?"** → Press Enter (default: product-brands)
  - **"In which directory is your code located?"** → Press Enter (default: ./)
  - **"Want to override the settings?"** → Type `N` or press Enter

**✅ When done:** You'll get a deployment URL like: `https://product-brands-xxx.vercel.app`

**⚠️ Important:** The site will have errors until we add environment variables (next step)

---

## STEP 3: Set Up Database (Choose One)

### Option A: Neon (Recommended - Free, 2 minutes)

1. **Go to:** https://neon.tech
2. **Click:** "Sign Up" (free account)
3. **Create Project:**
   - Project name: `product-brands`
   - Region: Choose closest to you
   - PostgreSQL version: Latest (15)
   - Click "Create Project"
4. **Copy Connection String:**
   - Wait for project to finish creating
   - You'll see a connection string like: `postgresql://user:pass@ep-xxxxx.neon.tech/productbrands?sslmode=require`
   - Click "Copy" button
   - **Save this - you'll need it in Step 4**

### Option B: Vercel Postgres (Easiest - Integrated)

1. **Go to:** Vercel Dashboard → Your Project
2. **Click:** "Storage" tab
3. **Click:** "Create Database"
4. **Select:** "Postgres"
5. **Choose:** Plan (Hobby free tier available)
6. **Create** database
7. **Copy** connection string

### Option C: Supabase (Free, Full-featured)

1. **Go to:** https://supabase.com
2. **Sign up** (free)
3. **Create project:** `product-brands`
4. **Wait** for database to provision (~2 minutes)
5. **Go to:** Settings → Database
6. **Copy** connection string (use Connection Pooler: port 6543)

---

## STEP 4: Add Environment Variables to Vercel

1. **Go to:** https://vercel.com/dashboard
2. **Click** on your project: `product-brands`
3. **Click:** "Settings" (top menu)
4. **Click:** "Environment Variables" (left sidebar)
5. **Add each variable below:**

### Required Variables:

**Variable 1:**
- Name: `DATABASE_URL`
- Value: [Paste the connection string from Step 3]
- Environment: ✅ Production
- Click "Save"

**Variable 2:**
- Name: `NEXTAUTH_URL`
- Value: `https://productbrands.com`
- Environment: ✅ Production
- Click "Save"

**Variable 3:**
- Name: `NEXTAUTH_SECRET`
- Value: `BOO/xB8uIhPYlSVsazbNwZY2oxNL5/L2grBD516zUUs=`
- Environment: ✅ Production
- Click "Save"

**Variable 4:**
- Name: `EMAIL_FROM`
- Value: `noreply@productbrands.com`
- Environment: ✅ Production
- Click "Save"

**Variable 5:**
- Name: `CONTACT_EMAIL`
- Value: `info@productbrands.com`
- Environment: ✅ Production
- Click "Save"

**Variable 6:**
- Name: `RESEND_API_KEY`
- Value: [Get from resend.com - see Step 5]
- Environment: ✅ Production
- Click "Save"

### ✅ After adding all variables:

1. Go to **"Deployments"** tab (top menu)
2. Click the **three dots** (⋯) on latest deployment
3. Click **"Redeploy"**
4. Confirm redeploy

**⏳ Wait 2-3 minutes** for redeployment to complete

---

## STEP 5: Set Up Email (Resend) - 5 minutes

1. **Go to:** https://resend.com
2. **Sign up** (free)
3. **Go to:** API Keys
4. **Click:** "Create API Key"
5. **Name it:** `productbrands-production`
6. **Copy** the API key (starts with `re_`)
7. **Add to Vercel** as `RESEND_API_KEY` (Step 4, Variable 6)
8. **Optional:** Verify domain `productbrands.com` (for better deliverability)

---

## STEP 6: Run Database Migrations

**Option A: Via Vercel Terminal (Easiest)**

1. Go to Vercel Dashboard → Your Project → Deployments
2. Click on latest deployment
3. Click "Functions" tab → Open terminal
4. Run:
   ```bash
   npx prisma db push
   ```

**Option B: Locally**

1. Pull environment variables:
   ```bash
   vercel env pull .env.production
   ```
2. Run migrations:
   ```bash
   npx prisma db push
   ```

**✅ After migrations:** Your database tables are created!

**Optional:** Seed initial data:
```bash
npm run db:seed
```
(This creates admin user: `admin@productbrands.com` / `admin123`)

---

## STEP 7: Connect Your Domain

1. **Go to:** Vercel Dashboard → Your Project → Settings → Domains
2. **Add Domain:**
   - Type: `productbrands.com`
   - Click "Add"
3. **Add www domain:**
   - Type: `www.productbrands.com`
   - Click "Add"
4. **Update DNS Records:**
   - Vercel will show you DNS records to add
   - Go to your domain registrar (where you bought productbrands.com)
   - Add the DNS records shown in Vercel:
     - Usually: A record or CNAME record
     - Point to Vercel's IP or CNAME target
5. **Wait for DNS:**
   - Usually takes 5-30 minutes
   - Can take up to 48 hours (rare)
   - Check status in Vercel Domains page

**✅ When DNS propagates:** SSL certificate is issued automatically
**✅ Your site is live:** https://productbrands.com

---

## STEP 8: Test Everything

✅ Visit: https://productbrands.com
✅ Test: Register new account
✅ Test: Login
✅ Test: Customer portal
✅ Test: Admin panel (login as admin@productbrands.com / admin123)
✅ Test: Contact form
✅ Test: File uploads

---

## STEP 9: Final Security Steps

1. **Change admin password:**
   - Login as admin
   - Go to Account settings
   - Change password

2. **Remove test users** (if any)

3. **Enable monitoring:**
   - Vercel Analytics (automatic)
   - Consider Sentry for error tracking

---

## ✅ You're Done!

Your website is now live at: **https://productbrands.com**

---

## Need Help?

- **Build errors:** Check Vercel Deployment logs
- **Database issues:** Verify DATABASE_URL is correct
- **Domain not working:** Wait for DNS propagation, check DNS records
- **Can't login:** Check NEXTAUTH_URL and NEXTAUTH_SECRET are set

---

## Quick Reference

```bash
# Login
vercel login

# Deploy
vercel --prod

# View deployments
vercel ls

# View logs
vercel logs

# Pull env vars locally
vercel env pull .env.production
```






