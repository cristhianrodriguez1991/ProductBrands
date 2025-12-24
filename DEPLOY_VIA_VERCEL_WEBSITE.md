# Deploy to Vercel via Website - Step by Step Guide

## Step 1: Prepare Your Project

✅ Your project is already ready! Make sure:
- All code is committed to Git (GitHub, GitLab, or Bitbucket)
- Your repository is pushed to your Git provider

---

## Step 2: Go to Vercel Website

1. **Visit:** https://vercel.com
2. **Sign in** with your account (or create one if needed)
3. Click **"Add New..."** → **"Project"**

---

## Step 3: Import Your Repository

1. **Connect your Git provider** (if not already connected):
   - Click "Import Git Repository"
   - Authorize Vercel to access your GitHub/GitLab/Bitbucket
   - Select your repository: `ProductBrands` (or whatever you named it)

2. **Select your repository** from the list

---

## Step 4: Configure Project Settings

Vercel will auto-detect Next.js, but verify these settings:

### Framework Preset:
- ✅ **Next.js** (should be auto-detected)

### Root Directory:
- Leave as **`./`** (root of your repo)

### Build and Output Settings:
- **Build Command:** `npm run build` (or `prisma generate && next build`)
- **Output Directory:** `.next` (auto-detected)
- **Install Command:** `npm install`

### Environment Variables:
**IMPORTANT:** Add these BEFORE deploying:

Click **"Environment Variables"** and add:

#### Required:
```
DATABASE_URL=your_postgresql_connection_string
NEXTAUTH_URL=https://your-project-name.vercel.app
NEXTAUTH_SECRET=generate-a-random-secret-here-min-32-chars
```

#### Optional (but recommended):
```
EMAIL_FROM=noreply@productbrands.com
CONTACT_EMAIL=info@productbrands.com
```

**Note:** You can add more environment variables after deployment too.

---

## Step 5: Deploy

1. Click **"Deploy"** button
2. Wait for build to complete (2-5 minutes)
3. Your site will be live at: `https://your-project-name.vercel.app`

---

## Step 6: After Deployment

### Add Environment Variables (if you didn't before):

1. Go to your project dashboard
2. Click **Settings** → **Environment Variables**
3. Add all the variables from Step 4
4. Click **"Redeploy"** to apply changes

### Set Up Database:

1. **Get a free PostgreSQL database:**
   - Option A: **Neon** (https://neon.tech) - Free forever tier
   - Option B: **Supabase** (https://supabase.com) - Free tier
   - Option C: **Railway** (https://railway.app) - Free tier

2. **Copy your database connection string** (DATABASE_URL)

3. **Add it to Vercel:**
   - Go to Settings → Environment Variables
   - Add: `DATABASE_URL` = your connection string
   - Redeploy

4. **Run migrations:**
   - You can use Vercel's CLI or run locally:
   ```bash
   npx prisma db push
   npx prisma db seed
   ```

---

## Step 7: Generate NEXTAUTH_SECRET

You need a secure random secret. Generate one:

**Option 1: Online**
- Visit: https://generate-secret.vercel.app/32
- Copy the generated secret

**Option 2: Command Line**
```bash
openssl rand -base64 32
```

**Option 3: Node.js**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Then add it to Vercel as `NEXTAUTH_SECRET`.

---

## Step 8: Update NEXTAUTH_URL

After deployment, update `NEXTAUTH_URL` to your actual Vercel URL:

1. Go to Settings → Environment Variables
2. Update `NEXTAUTH_URL` to: `https://your-actual-project-name.vercel.app`
3. Redeploy

---

## Quick Checklist

- [ ] Repository pushed to GitHub/GitLab/Bitbucket
- [ ] Logged into Vercel website
- [ ] Imported repository
- [ ] Added `DATABASE_URL` environment variable
- [ ] Added `NEXTAUTH_SECRET` environment variable
- [ ] Added `NEXTAUTH_URL` environment variable (can update after first deploy)
- [ ] Clicked Deploy
- [ ] After deployment: Updated `NEXTAUTH_URL` with actual URL
- [ ] Set up database and ran migrations
- [ ] Tested the deployed site

---

## Troubleshooting

**Build fails:**
- Check build logs in Vercel dashboard
- Make sure all dependencies are in `package.json`
- Verify `DATABASE_URL` is set correctly

**Database connection errors:**
- Verify `DATABASE_URL` is correct
- Check database allows connections from Vercel IPs
- Some databases need IP whitelisting

**Authentication not working:**
- Verify `NEXTAUTH_SECRET` is set
- Check `NEXTAUTH_URL` matches your deployment URL
- Make sure database is set up and migrations are run

---

## Need Help?

- Vercel Docs: https://vercel.com/docs
- Next.js Deployment: https://nextjs.org/docs/deployment
- Check build logs in Vercel dashboard for specific errors

