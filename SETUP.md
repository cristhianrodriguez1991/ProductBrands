# Quick Setup Guide

## Step 1: Create Environment File

Create a `.env` file in the root directory with the following content:

```env
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/productbrands"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-change-in-production-replace-with-random-string"

# Google OAuth (optional)
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""

# Email (Resend)
RESEND_API_KEY=""
EMAIL_FROM="noreply@productbrands.com"
CONTACT_EMAIL="info@productbrands.com"

# S3 Storage (optional, uses local storage if not set)
S3_ENDPOINT=""
S3_REGION="us-east-1"
S3_ACCESS_KEY_ID=""
S3_SECRET_ACCESS_KEY=""
S3_BUCKET_NAME="product-brands"
S3_PUBLIC_URL=""

# Stripe (optional)
STRIPE_SECRET_KEY=""
STRIPE_PUBLISHABLE_KEY=""
```

## Step 2: Set Up Database

### Option A: Using Docker (Recommended)

If you have Docker installed:
```bash
docker compose up -d postgres
```

### Option B: Using Local PostgreSQL

1. Install PostgreSQL if not already installed
2. Create a database:
   ```sql
   CREATE DATABASE productbrands;
   ```
3. Update `DATABASE_URL` in `.env` with your PostgreSQL credentials

### Option C: Using SQLite (Quick Start)

If you want to use SQLite for quick testing, update `prisma/schema.prisma`:
- Change `provider = "postgresql"` to `provider = "sqlite"`
- Change `url = env("DATABASE_URL")` to `url = "file:./dev.db"`
- Update `.env` DATABASE_URL to `file:./dev.db`

## Step 3: Run Database Migrations

```bash
npm run db:push
```

## Step 4: Seed the Database

```bash
npm run db:seed
```

This creates:
- Admin user: `admin@productbrands.com` / `admin123`
- Demo customer: `customer@demo.com` / `customer123`
- Sample data (quotes, orders, invoices)

## Step 5: Start Development Server

```bash
npm run dev
```

## Step 6: Access the Website

Open your browser and go to:
- **Homepage**: http://localhost:3000
- **Login**: http://localhost:3000/login
- **Admin Panel**: http://localhost:3000/admin (after logging in as admin)
- **Client Portal**: http://localhost:3000/portal (after logging in)

## Default Login Credentials

After seeding:
- **Admin**: 
  - Email: `admin@productbrands.com`
  - Password: `admin123`
- **Customer**: 
  - Email: `customer@demo.com`
  - Password: `customer123`

## Troubleshooting

### Database Connection Error
- Make sure PostgreSQL is running
- Check your DATABASE_URL in `.env`
- Verify database credentials

### Port Already in Use
- Change the port in `package.json` scripts or use `PORT=3001 npm run dev`

### Prisma Errors
- Run `npx prisma generate` to regenerate Prisma client
- Run `npm run db:push` to sync schema

