#!/bin/bash
# Quick Database Setup Script

echo "🚀 Setting up Production Database"
echo ""
echo "Choose your database provider:"
echo "1) Neon (Recommended - Free, Serverless)"
echo "2) Vercel Postgres (Easiest - Integrated)"
echo "3) Supabase (Free, Full-featured)"
echo ""
read -p "Enter choice (1-3): " choice

case $choice in
  1)
    echo ""
    echo "✅ Setting up Neon:"
    echo "1. Go to: https://neon.tech"
    echo "2. Sign up (free)"
    echo "3. Create new project: 'product-brands'"
    echo "4. Copy connection string"
    echo "5. Add to Vercel as DATABASE_URL"
    echo ""
    echo "After setup, run migrations:"
    echo "  npx prisma db push"
    ;;
  2)
    echo ""
    echo "✅ Setting up Vercel Postgres:"
    echo "1. Go to Vercel Dashboard"
    echo "2. Your Project → Storage tab"
    echo "3. Create Database → Postgres"
    echo "4. Copy connection string"
    echo "5. Add to Environment Variables as DATABASE_URL"
    echo ""
    echo "Then run migrations via Vercel terminal:"
    echo "  npx prisma db push"
    ;;
  3)
    echo ""
    echo "✅ Setting up Supabase:"
    echo "1. Go to: https://supabase.com"
    echo "2. Sign up (free)"
    echo "3. Create project: 'product-brands'"
    echo "4. Settings → Database → Copy connection string"
    echo "5. Use Connection Pooler (port 6543)"
    echo "6. Add to Vercel as DATABASE_URL"
    echo ""
    echo "After setup, run migrations:"
    echo "  npx prisma db push"
    ;;
  *)
    echo "Invalid choice"
    ;;
esac

echo ""
echo "📝 Next: Run migrations and seed database"
echo "   npx prisma db push"
echo "   npm run db:seed"






