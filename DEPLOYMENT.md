# Deployment Guide for productbrands.com

This guide covers deploying your Next.js application to production at **productbrands.com**.

## 🚀 Deployment Options

### Option 1: Vercel (Recommended for Next.js)

Vercel is the easiest platform for deploying Next.js applications with automatic SSL, CDN, and deployments from Git.

#### Steps:

1. **Prepare your repository:**
   ```bash
   git add .
   git commit -m "Prepare for production deployment"
   git push origin main
   ```

2. **Deploy to Vercel:**
   - Go to [vercel.com](https://vercel.com)
   - Sign up/login and click "Import Project"
   - Connect your Git repository
   - Configure environment variables (see below)
   - Deploy!

3. **Configure your domain:**
   - In Vercel dashboard, go to Settings → Domains
   - Add `productbrands.com` and `www.productbrands.com`
   - Update DNS records as instructed by Vercel

#### Vercel Environment Variables:

Set these in Vercel Dashboard → Settings → Environment Variables:

```
DATABASE_URL=your-production-postgresql-connection-string
NEXTAUTH_URL=https://productbrands.com
NEXTAUTH_SECRET=your-strong-random-secret-32-characters-minimum
EMAIL_FROM=noreply@productbrands.com
CONTACT_EMAIL=info@productbrands.com
RESEND_API_KEY=your-resend-api-key
GOOGLE_CLIENT_ID=your-google-oauth-client-id (optional)
GOOGLE_CLIENT_SECRET=your-google-oauth-secret (optional)
S3_ENDPOINT=your-s3-endpoint (optional)
S3_REGION=us-east-1 (optional)
S3_ACCESS_KEY_ID=your-s3-access-key (optional)
S3_SECRET_ACCESS_KEY=your-s3-secret (optional)
S3_BUCKET_NAME=product-brands (optional)
S3_PUBLIC_URL=https://your-cdn-url.com (optional)
STRIPE_SECRET_KEY=your-stripe-secret (optional)
STRIPE_PUBLISHABLE_KEY=your-stripe-publishable-key (optional)
```

4. **Database Setup:**
   - Use a managed PostgreSQL service (Vercel Postgres, Neon, Supabase, or AWS RDS)
   - Update DATABASE_URL with production connection string
   - Run migrations: `npx prisma db push` or use Prisma Migrate

---

### Option 2: Docker Deployment

For VPS/hosting with Docker support (DigitalOcean, AWS EC2, etc.).

1. **Build and push Docker image:**
   ```bash
   docker build -t product-brands:latest .
   ```

2. **Run with docker-compose:**
   Update `docker-compose.prod.yml` with production settings

3. **Set up reverse proxy (Nginx/Traefik):**
   - Configure SSL with Let's Encrypt
   - Point domain to your server IP

---

### Option 3: Traditional VPS

For servers without Docker.

1. **Install Node.js 18+**
2. **Clone repository**
3. **Install dependencies:** `npm ci`
4. **Build:** `npm run build`
5. **Run with PM2:** `pm2 start npm --name "product-brands" -- start`
6. **Set up Nginx reverse proxy**

---

## 📋 Pre-Deployment Checklist

### 1. Environment Variables

- [ ] Generate strong `NEXTAUTH_SECRET` (use: `openssl rand -base64 32`)
- [ ] Set up production PostgreSQL database
- [ ] Configure `NEXTAUTH_URL` to `https://productbrands.com`
- [ ] Set up email service (Resend recommended)
- [ ] Configure S3 for file uploads (or use local storage)
- [ ] Set up Google OAuth (optional)
- [ ] Set up Stripe (optional)

### 2. Database

- [ ] Create production PostgreSQL database
- [ ] Run migrations: `npx prisma db push` or `npm run db:migrate`
- [ ] Seed initial admin user (or create manually)
- [ ] Test database connection

### 3. Domain & DNS

- [ ] Point `productbrands.com` A record to server IP (or CNAME to Vercel)
- [ ] Point `www.productbrands.com` to server IP (or CNAME to Vercel)
- [ ] Set up SSL certificate (automatic with Vercel, or use Let's Encrypt)
- [ ] Configure redirects (www to non-www or vice versa)

### 4. Security

- [ ] Update all admin passwords
- [ ] Remove test/demo users
- [ ] Review and update `.env` variables
- [ ] Enable security headers
- [ ] Set up backup strategy for database

### 5. Testing

- [ ] Test all public pages
- [ ] Test authentication (login/register)
- [ ] Test customer portal features
- [ ] Test admin panel
- [ ] Test file uploads
- [ ] Test email notifications
- [ ] Test on mobile devices

---

## 🔧 Production Configuration

### Update next.config.js

The config is already set for production with:
- Image optimization configured
- Standalone output for Docker
- Server actions body size limit

### Database Connection Pooling

For production, use a connection pooler like:
- **PgBouncer** (recommended)
- **Supabase** (includes pooling)
- **Neon** (serverless PostgreSQL with pooling)

Example connection string with pooling:
```
DATABASE_URL=postgresql://user:pass@host:6543/db?pgbouncer=true
```

---

## 📧 Email Configuration

Set up Resend (recommended):

1. Sign up at [resend.com](https://resend.com)
2. Create API key
3. Verify domain `productbrands.com`
4. Add `RESEND_API_KEY` to environment variables
5. Update `EMAIL_FROM` to use your domain

---

## 📦 File Storage

### Option A: AWS S3 (Recommended)

1. Create S3 bucket: `product-brands-production`
2. Set up CloudFront CDN (optional)
3. Configure CORS
4. Add S3 credentials to environment variables

### Option B: Local Storage

Files will be stored in `public/uploads/` on your server. Ensure:
- Sufficient disk space
- Regular backups
- CDN setup for faster delivery

---

## 🔄 Deployment Process

### First Time Deployment:

1. **Prepare repository:**
   ```bash
   git add .
   git commit -m "Production ready"
   git push
   ```

2. **Deploy to platform** (Vercel/recommended):
   - Connect repository
   - Set environment variables
   - Deploy

3. **Set up database:**
   ```bash
   npx prisma db push
   npm run db:seed  # Only for initial setup
   ```

4. **Verify deployment:**
   - Check all pages load
   - Test authentication
   - Verify email sending

### Ongoing Deployments:

With Vercel: Automatic on every git push to main branch.

With Docker: 
```bash
docker build -t product-brands:latest .
docker-compose up -d
```

---

## 🐛 Troubleshooting

### Build Errors:
- Check Node.js version (18+)
- Verify all dependencies installed
- Check Prisma client generated: `npx prisma generate`

### Database Connection:
- Verify DATABASE_URL is correct
- Check database is accessible from deployment platform
- Verify SSL requirements if needed

### Authentication Issues:
- Verify NEXTAUTH_URL matches your domain exactly
- Check NEXTAUTH_SECRET is set
- Verify callback URLs in OAuth providers

### File Upload Issues:
- Check S3 credentials
- Verify bucket permissions
- Check file size limits

---

## 📞 Support

For deployment issues:
- Check Vercel logs (if using Vercel)
- Check server logs
- Review environment variables
- Test database connection separately

---

## 🔐 Security Best Practices

1. **Never commit `.env` files**
2. **Use strong, unique secrets for production**
3. **Enable HTTPS only**
4. **Regular security updates**
5. **Database backups**
6. **Monitor for security issues**
7. **Use environment-specific configurations**

---

## Next Steps After Deployment

1. ✅ Set up monitoring (Vercel Analytics, Sentry)
2. ✅ Configure backup strategy
3. ✅ Set up CI/CD pipeline
4. ✅ Create admin user account
5. ✅ Test all functionality
6. ✅ Set up error tracking
7. ✅ Configure CDN for static assets
8. ✅ Set up database backups

---

**Ready to deploy? Start with Vercel for the easiest setup!**

