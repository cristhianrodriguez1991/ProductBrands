# Production Database Setup Guide

## Quick Setup Options

### Option 1: Vercel Postgres (Recommended - Easiest)

1. Go to Vercel Dashboard
2. Click on your project
3. Go to **Storage** tab
4. Click **Create Database**
5. Select **Postgres**
6. Choose plan (Hobby free tier available)
7. Create database
8. Copy the connection string
9. Add to environment variables as `DATABASE_URL`

**Advantages:**
- ✅ Integrated with Vercel
- ✅ Automatic backups
- ✅ Easy to manage
- ✅ Free tier available

---

### Option 2: Neon (Recommended - Serverless PostgreSQL)

1. Go to [neon.tech](https://neon.tech)
2. Sign up (free)
3. Create a new project
4. Name it "product-brands"
5. Copy connection string from dashboard
6. Add to Vercel environment variables as `DATABASE_URL`

**Connection String Format:**
```
postgresql://username:password@ep-xxxxx.us-east-2.aws.neon.tech/productbrands?sslmode=require
```

**Advantages:**
- ✅ Free tier (generous)
- ✅ Serverless (scales automatically)
- ✅ Built-in connection pooling
- ✅ Fast setup

---

### Option 3: Supabase (Full-Featured)

1. Go to [supabase.com](https://supabase.com)
2. Sign up
3. Create new project
4. Wait for database to provision
5. Go to Settings → Database
6. Copy connection string (use Connection Pooler port: 6543)
7. Add to Vercel environment variables

**Connection String Format:**
```
postgresql://postgres.xxxxx:[YOUR-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres
```

**Advantages:**
- ✅ Free tier
- ✅ Includes auth features
- ✅ Real-time subscriptions
- ✅ Dashboard for data management

---

### Option 4: AWS RDS (For Scale)

1. AWS Console → RDS
2. Create PostgreSQL instance
3. Configure security groups
4. Get endpoint
5. Use connection string format:
   ```
   postgresql://username:password@your-rds-endpoint:5432/productbrands?sslmode=require
   ```

---

## After Setting Up Database

### Run Migrations

1. **Pull environment variables locally:**
   ```bash
   vercel env pull .env.production
   ```

2. **Run Prisma migrations:**
   ```bash
   npx prisma db push
   ```

   Or use Vercel's terminal:
   - Deployments → Latest → Terminal
   - Run: `npx prisma db push`

3. **Seed initial data (optional):**
   ```bash
   npm run db:seed
   ```

   This creates:
   - Admin user: `admin@productbrands.com` / `admin123`
   - Demo customer: `customer@demo.com` / `customer123`

---

## Database Security Checklist

- [ ] Use SSL connection (`?sslmode=require`)
- [ ] Strong database password
- [ ] Restrict access to Vercel IPs (if possible)
- [ ] Regular backups enabled
- [ ] Database firewall configured

---

## Recommended: Start with Neon or Vercel Postgres

Both are free and easy to set up. You can always migrate later if needed.
