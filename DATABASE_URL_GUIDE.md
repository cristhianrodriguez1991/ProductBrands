# Database URL Guide for Vercel Deployment

## Your Current Local Database URL

```
postgresql://postgres:2610@localhost:5432/productbrands
```

⚠️ **This won't work on Vercel** - it's only for local development.

---

## For Vercel Deployment - You Need a Cloud Database

### Option 1: Vercel Postgres (Easiest - Recommended)

1. **Go to Vercel Dashboard** → Your Project → **Storage** tab
2. Click **"Create Database"**
3. Select **Postgres**
4. Choose **Hobby** (free tier)
5. Create database
6. **Copy the connection string** - it will look like:
   ```
   postgresql://default:xxxxx@xxxxx.vercel-storage.com:5432/verceldb
   ```
7. Add to Vercel environment variables as `DATABASE_URL`

**Advantages:**
- ✅ Integrated with Vercel
- ✅ Free tier available
- ✅ Automatic backups
- ✅ No separate account needed

---

### Option 2: Neon (Free & Serverless - Recommended)

1. **Go to:** https://neon.tech
2. **Sign up** (free account)
3. **Create a new project:**
   - Name: `product-brands`
   - Region: Choose closest to you
4. **Copy the connection string** from dashboard
   - It will look like:
   ```
   postgresql://username:password@ep-xxxxx.us-east-2.aws.neon.tech/productbrands?sslmode=require
   ```
5. **Add to Vercel:**
   - Go to Vercel Dashboard → Your Project → Settings → Environment Variables
   - Add: `DATABASE_URL` = your Neon connection string

**Advantages:**
- ✅ Free tier (generous limits)
- ✅ Serverless (scales automatically)
- ✅ Built-in connection pooling
- ✅ Fast and reliable

---

### Option 3: Supabase (Full-Featured)

1. **Go to:** https://supabase.com
2. **Sign up** (free tier)
3. **Create new project:**
   - Name: `product-brands`
   - Database password: (save this!)
4. **Wait for provisioning** (2-3 minutes)
5. **Get connection string:**
   - Go to Settings → Database
   - Use **Connection Pooler** (port 6543)
   - Connection string format:
   ```
   postgresql://postgres.xxxxx:[YOUR-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres
   ```
6. **Add to Vercel** environment variables

**Advantages:**
- ✅ Free tier
- ✅ Includes dashboard for data management
- ✅ Real-time features available

---

### Option 4: Railway (Simple & Fast)

1. **Go to:** https://railway.app
2. **Sign up** (free tier with $5 credit)
3. **Create new project**
4. **Add PostgreSQL database**
5. **Copy connection string**
6. **Add to Vercel** environment variables

---

## Database URL Format Explained

A PostgreSQL connection string has this format:

```
postgresql://[username]:[password]@[host]:[port]/[database]?[options]
```

**Example breakdown:**
```
postgresql://postgres:mypassword@db.example.com:5432/productbrands?sslmode=require
│          │         │           │                │   │              │
│          │         │           │                │   │              └─ SSL required
│          │         │           │                │   └─ Database name
│          │         │           │                └─ Port (5432 is default)
│          │         │           └─ Database server hostname
│          │         └─ Database password
│          └─ Database username
└─ Protocol
```

---

## Quick Setup Steps (Recommended: Neon)

1. **Create Neon account:** https://neon.tech
2. **Create project:** Name it "product-brands"
3. **Copy connection string** from Neon dashboard
4. **In Vercel:**
   - Go to your project
   - Settings → Environment Variables
   - Add: `DATABASE_URL` = (paste your Neon connection string)
5. **Redeploy** your project

---

## After Setting Up Database

### Run Database Migrations

After deploying to Vercel with the database URL:

1. **Option A: Use Vercel Terminal**
   - Go to Deployments → Latest deployment
   - Open Terminal
   - Run: `npx prisma db push`
   - Run: `npm run db:seed` (optional - creates admin user)

2. **Option B: Run Locally**
   - Update your local `.env` with the production database URL temporarily
   - Run: `npx prisma db push`
   - Run: `npm run db:seed`
   - Change back to local database URL

---

## Security Notes

✅ **Always use SSL** - Make sure your connection string includes `?sslmode=require`

✅ **Keep password secret** - Never commit database URLs to Git

✅ **Use environment variables** - Store in Vercel, not in code

---

## Recommended: Start with Neon

**Why Neon?**
- Free tier is generous
- Easy to set up
- Serverless (scales automatically)
- Fast connection pooling
- Great for Next.js apps

**Get started:** https://neon.tech → Sign up → Create project → Copy connection string

---

## Need Help?

- **Neon Docs:** https://neon.tech/docs
- **Supabase Docs:** https://supabase.com/docs
- **Vercel Postgres:** https://vercel.com/docs/storage/vercel-postgres

