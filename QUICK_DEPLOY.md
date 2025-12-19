# Quick Deploy Guide - productbrands.com

## Fastest Way: Deploy to Vercel (5 minutes)

### Step 1: Install Vercel CLI (if not installed)
```bash
npm install -g vercel
```

### Step 2: Login to Vercel
```bash
vercel login
```

### Step 3: Deploy
```bash
vercel --prod
```

### Step 4: Set Environment Variables
1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add all variables from `PRODUCTION_ENV_TEMPLATE.md`
3. Generate `NEXTAUTH_SECRET` using:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
   ```

### Step 5: Connect Domain
1. Vercel Dashboard → Settings → Domains
2. Add `productbrands.com` and `www.productbrands.com`
3. Update DNS records as shown in Vercel
4. Wait for DNS propagation (5-30 minutes)

### Step 6: Set Up Database
1. Use Vercel Postgres (integrated) or external service (Neon, Supabase)
2. Run migrations:
   ```bash
   npx prisma db push
   ```
3. Seed initial data (if needed):
   ```bash
   npm run db:seed
   ```

### Step 7: Verify
- Visit https://productbrands.com
- Test login/register
- Check admin panel

---

## Alternative: Deploy via GitHub (Automatic)

1. Push code to GitHub
2. Go to vercel.com → Import Project
3. Connect GitHub repository
4. Configure environment variables
5. Deploy!

Every push to `main` branch will auto-deploy.

---

## Manual Docker Deployment

### Build:
```bash
docker build -t product-brands:latest .
```

### Run:
```bash
docker run -d \
  -p 3000:3000 \
  -e DATABASE_URL="your-db-url" \
  -e NEXTAUTH_URL="https://productbrands.com" \
  -e NEXTAUTH_SECRET="your-secret" \
  --name product-brands \
  product-brands:latest
```

---

## Need Help?

See `DEPLOYMENT.md` for detailed instructions.

