# 🚀 START HERE - Quick Deployment Guide

## Current Status
✅ Deployment files created
✅ Code committed
✅ Vercel CLI installed
⏳ Ready for deployment

---

## Next Steps (Do These Now)

### 1️⃣ Login to Vercel

**Run this command:**
```bash
vercel login
```

This will:
- Open your browser
- Ask you to login/signup to Vercel
- Authenticate the CLI

**If you don't have a Vercel account:**
- Sign up at [vercel.com](https://vercel.com) (free)
- Then run `vercel login`

---

### 2️⃣ Deploy to Vercel

**After logging in, run:**
```bash
vercel --prod
```

This will:
- Build your app
- Deploy to production
- Give you a deployment URL
- Ask project questions (accept defaults)

---

### 3️⃣ Set Environment Variables

1. Go to **Vercel Dashboard** → Your Project → **Settings** → **Environment Variables**

2. Add these **REQUIRED** variables:

   ```
   DATABASE_URL=your-database-url-here
   NEXTAUTH_URL=https://productbrands.com
   NEXTAUTH_SECRET=BOO/xB8uIhPYlSVsazbNwZY2oxNL5/L2grBD516zUUs=
   EMAIL_FROM=noreply@productbrands.com
   CONTACT_EMAIL=info@productbrands.com
   RESEND_API_KEY=your-resend-api-key
   ```

3. Make sure to select **Production** environment

4. Click **Save** for each variable

5. **Redeploy** after adding variables

---

### 4️⃣ Set Up Database

**Easiest option: Neon (Free)**

1. Go to [neon.tech](https://neon.tech) and sign up
2. Create new project
3. Copy connection string
4. Add to `DATABASE_URL` in Vercel
5. Run migrations: `npx prisma db push` (via Vercel terminal or locally)

See `SETUP_DATABASE.md` for detailed instructions.

---

### 5️⃣ Connect Domain

1. Vercel Dashboard → Settings → Domains
2. Add: `productbrands.com` and `www.productbrands.com`
3. Update DNS records at your domain registrar
4. Wait 5-30 minutes for DNS to propagate

---

## Need Help?

- **Detailed steps:** See `DEPLOYMENT_STEPS.md`
- **Database setup:** See `SETUP_DATABASE.md`
- **Environment variables:** See `PRODUCTION_ENV_TEMPLATE.md`

---

## Quick Command Reference

```bash
# 1. Login
vercel login

# 2. Deploy
vercel --prod

# 3. View logs
vercel logs

# 4. Pull env vars locally
vercel env pull .env.production
```

---

**Ready? Start with Step 1: `vercel login`**





