# 🚀 Live Deployment Steps for productbrands.com

## Step 1: Login to Vercel

Run this command in your terminal (it will open a browser):
```bash
vercel login
```

Or use email login:
```bash
vercel login --email your@email.com
```

---

## Step 2: Deploy to Vercel

Once logged in, run:
```bash
vercel --prod
```

This will:
- Build your application
- Deploy to Vercel
- Give you a preview URL
- Ask about project settings (accept defaults)

---

## Step 3: Set Environment Variables

After deployment, go to:
1. Vercel Dashboard → Your Project
2. Settings → Environment Variables
3. Add each variable below:

### Required Variables:

```env
DATABASE_URL=your-production-database-url
NEXTAUTH_URL=https://productbrands.com
NEXTAUTH_SECRET=BOO/xB8uIhPYlSVsazbNwZY2oxNL5/L2grBD516zUUs=
EMAIL_FROM=noreply@productbrands.com
CONTACT_EMAIL=info@productbrands.com
RESEND_API_KEY=your-resend-api-key
```

### Optional Variables:
```env
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
S3_ENDPOINT=your-s3-endpoint
S3_REGION=us-east-1
S3_ACCESS_KEY_ID=your-s3-key
S3_SECRET_ACCESS_KEY=your-s3-secret
S3_BUCKET_NAME=product-brands-production
S3_PUBLIC_URL=https://cdn.productbrands.com
STRIPE_SECRET_KEY=your-stripe-secret
STRIPE_PUBLISHABLE_KEY=your-stripe-publishable-key
```

**Important:** 
- Select **Production** environment for all variables
- Click **Save** after adding each variable
- Redeploy after adding variables (Vercel → Deployments → Redeploy)

---

## Step 4: Set Up Production Database

### Option A: Vercel Postgres (Easiest)

1. Vercel Dashboard → Storage → Create Database
2. Select **Postgres**
3. Create database (free tier available)
4. Copy connection string
5. Add to `DATABASE_URL` environment variable
6. Run migrations (see Step 5)

### Option B: Neon (Free Tier Available)

1. Go to [neon.tech](https://neon.tech)
2. Sign up and create project
3. Copy connection string
4. Add to `DATABASE_URL` environment variable

### Option C: Supabase (Free Tier Available)

1. Go to [supabase.com](https://supabase.com)
2. Create project
3. Copy connection string from Settings → Database
4. Add to `DATABASE_URL` environment variable

---

## Step 5: Run Database Migrations

After setting up database:

1. **Install Vercel CLI locally** (if not done):
   ```bash
   npm install -g vercel
   ```

2. **Pull environment variables:**
   ```bash
   vercel env pull .env.production
   ```

3. **Run migrations:**
   ```bash
   npx prisma db push
   ```

4. **Seed initial data** (optional):
   ```bash
   npm run db:seed
   ```

**OR** use Vercel's built-in terminal:
- Vercel Dashboard → Your Project → Deployments → Click on latest deployment
- Open Terminal
- Run: `npx prisma db push`

---

## Step 6: Connect Domain

1. **Vercel Dashboard** → Your Project → **Settings** → **Domains**

2. **Add domains:**
   - `productbrands.com`
   - `www.productbrands.com`

3. **Update DNS records** at your domain registrar:
   - Add A record or CNAME as shown in Vercel
   - Wait 5-30 minutes for DNS propagation

4. **Verify:**
   - Check SSL certificate is issued (automatic)
   - Visit https://productbrands.com

---

## Step 7: Set Up Email (Resend)

1. Sign up at [resend.com](https://resend.com)
2. Create API key
3. Verify domain `productbrands.com`:
   - Add DNS records shown in Resend dashboard
4. Copy API key to `RESEND_API_KEY` environment variable
5. Redeploy

---

## Step 8: Test Everything

- [ ] Homepage loads: https://productbrands.com
- [ ] Can register new account
- [ ] Can login
- [ ] Customer portal works
- [ ] Admin panel accessible
- [ ] File uploads work
- [ ] Emails sending (test contact form)
- [ ] Mobile responsive

---

## Step 9: Final Security Steps

1. **Update admin password:**
   - Login as admin
   - Change default password

2. **Remove test users** (if any)

3. **Enable monitoring:**
   - Vercel Analytics (automatic)
   - Consider Sentry for error tracking

4. **Set up backups:**
   - Database backups (automatic with managed services)
   - Configure backup schedule

---

## Troubleshooting

### Build Fails:
- Check environment variables are set
- Verify DATABASE_URL format
- Check build logs in Vercel

### Database Connection Issues:
- Verify DATABASE_URL is correct
- Check database allows connections from Vercel IPs
- Ensure SSL is enabled

### Domain Not Working:
- Wait for DNS propagation (up to 48 hours, usually 5-30 min)
- Verify DNS records are correct
- Check domain is added in Vercel

---

## Quick Commands Reference

```bash
# Login to Vercel
vercel login

# Deploy to production
vercel --prod

# Pull environment variables
vercel env pull .env.production

# Run database migrations
npx prisma db push

# Seed database
npm run db:seed

# View deployment logs
vercel logs

# List deployments
vercel ls
```

---

**Your site will be live at: https://productbrands.com after completing these steps!**





