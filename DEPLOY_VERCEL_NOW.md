# 🚀 Deploy to Vercel - Step by Step

## Current Status:
✅ Project ready
✅ Neon chosen as database (free forever)
⏳ Need to deploy to Vercel

---

## STEP 1: Login to Vercel CLI

**Run this command in your terminal:**
```bash
vercel login
```

**What happens:**
1. Browser opens automatically
2. You'll see Vercel login page
3. Login or sign up (free)
4. Authorize CLI access
5. Return to terminal - you'll see "Success! You are now logged in."

**If browser doesn't open:**
- Visit: https://vercel.com/login
- Then run: `vercel login --email your@email.com`

---

## STEP 2: Deploy to Vercel

**After logging in, run:**
```bash
vercel --prod
```

**Vercel will ask questions:**
1. **"Set up and deploy?"** → Type `Y` or press Enter
2. **"Which scope?"** → Select your account
3. **"Link to existing project?"** → Type `N` (first time)
4. **"What's your project's name?"** → Press Enter (default: `product-brands`)
5. **"In which directory is your code located?"** → Press Enter (default: `./`)
6. **"Want to override the settings?"** → Type `N` or press Enter

**Wait 2-5 minutes** for build to complete.

**✅ Success:** You'll get a URL like: `https://product-brands-xxxxx.vercel.app`

**⚠️ Note:** The site will have errors until we add environment variables (next steps).

---

## STEP 3: Set Up Neon Database (Free Forever)

1. **Go to:** https://neon.tech
2. **Click:** "Sign Up" (free, no credit card needed)
3. **Sign up with:**
   - Email, or
   - GitHub (easiest)
4. **Create Project:**
   - Project name: `product-brands`
   - Region: Choose closest to you (US East recommended)
   - PostgreSQL version: Latest (15)
   - Click **"Create Project"**
5. **Wait 30 seconds** for project to create
6. **Copy Connection String:**
   - You'll see a connection string like:
     ```
     postgresql://username:password@ep-xxxxx.us-east-2.aws.neon.tech/neondb?sslmode=require
     ```
   - Click the **"Copy"** button
   - **Save this** - you'll need it in Step 4!

---

## STEP 4: Add Environment Variables to Vercel

1. **Go to:** https://vercel.com/dashboard
2. **Click** on your project: `product-brands`
3. **Click:** "Settings" (top menu)
4. **Click:** "Environment Variables" (left sidebar)
5. **Add each variable** (click "Add New" for each):

### Variable 1: DATABASE_URL
- **Name:** `DATABASE_URL`
- **Value:** [Paste the Neon connection string from Step 3]
- **Environment:** ✅ Production
- Click **"Save"**

### Variable 2: NEXTAUTH_URL
- **Name:** `NEXTAUTH_URL`
- **Value:** `https://productbrands.com`
- **Environment:** ✅ Production
- Click **"Save"**

### Variable 3: NEXTAUTH_SECRET
- **Name:** `NEXTAUTH_SECRET`
- **Value:** `BOO/xB8uIhPYlSVsazbNwZY2oxNL5/L2grBD516zUUs=`
- **Environment:** ✅ Production
- Click **"Save"**

### Variable 4: EMAIL_FROM
- **Name:** `EMAIL_FROM`
- **Value:** `noreply@productbrands.com`
- **Environment:** ✅ Production
- Click **"Save"**

### Variable 5: CONTACT_EMAIL
- **Name:** `CONTACT_EMAIL`
- **Value:** `info@productbrands.com`
- **Environment:** ✅ Production
- Click **"Save"**

### Variable 6: RESEND_API_KEY (Optional for now)
- **Name:** `RESEND_API_KEY`
- **Value:** [Leave empty or get from resend.com later]
- **Environment:** ✅ Production
- Click **"Save"**

---

## STEP 5: Redeploy After Adding Variables

**Important:** After adding environment variables, you MUST redeploy:

1. Go to **"Deployments"** tab (top menu)
2. Click the **three dots** (⋯) on the latest deployment
3. Click **"Redeploy"**
4. Confirm redeploy

**⏳ Wait 2-3 minutes** for redeployment.

---

## STEP 6: Run Database Migrations

After redeployment with DATABASE_URL set:

### Option A: Via Vercel Terminal (Easiest)

1. Go to Vercel Dashboard → Your Project → Deployments
2. Click on latest deployment
3. Click "Functions" tab
4. Look for terminal option or use Vercel CLI

### Option B: Locally

1. **Pull environment variables:**
   ```bash
   vercel env pull .env.production
   ```

2. **Run migrations:**
   ```bash
   npx prisma db push
   ```

3. **Seed initial data (optional):**
   ```bash
   npm run db:seed
   ```
   This creates admin user: `admin@productbrands.com` / `admin123`

---

## STEP 7: Connect Your Domain

1. **Go to:** Vercel Dashboard → Your Project → Settings → Domains
2. **Add Domain:**
   - Type: `productbrands.com`
   - Click **"Add"**
3. **Add www domain:**
   - Type: `www.productbrands.com`
   - Click **"Add"**
4. **Update DNS Records:**
   - Vercel shows you DNS records to add
   - Go to your domain registrar (where you bought productbrands.com)
   - Add the DNS records shown
   - Usually: A record or CNAME pointing to Vercel
5. **Wait for DNS:**
   - Usually 5-30 minutes
   - Can take up to 48 hours (rare)
   - Check status in Vercel Domains page

**✅ When DNS propagates:** SSL certificate is issued automatically
**✅ Your site is live:** https://productbrands.com

---

## Quick Command Reference

```bash
# 1. Login
vercel login

# 2. Deploy
vercel --prod

# 3. Pull env vars locally (after adding in dashboard)
vercel env pull .env.production

# 4. Run migrations
npx prisma db push

# 5. Seed database (optional)
npm run db:seed
```

---

## Summary Checklist

- [ ] Login to Vercel CLI: `vercel login`
- [ ] Deploy: `vercel --prod`
- [ ] Set up Neon database (free forever)
- [ ] Add environment variables in Vercel Dashboard
- [ ] Redeploy after adding variables
- [ ] Run migrations: `npx prisma db push`
- [ ] Connect domain: productbrands.com
- [ ] Test your site!

---

**Let's start with Step 1: `vercel login`**






