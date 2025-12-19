#!/bin/bash
# Quick deployment script for Vercel

echo "🚀 Deploying to Vercel..."
echo ""

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "📦 Installing Vercel CLI..."
    npm install -g vercel
fi

# Check if logged in
if ! vercel whoami &> /dev/null; then
    echo "🔐 Please login to Vercel:"
    vercel login
fi

# Deploy
echo "📤 Deploying..."
vercel --prod

echo ""
echo "✅ Deployment complete!"
echo "🌐 Your site is now live at: https://productbrands.com"
echo ""
echo "Next steps:"
echo "1. Set up environment variables in Vercel dashboard"
echo "2. Connect your domain in Vercel Settings → Domains"
echo "3. Update DNS records as instructed"
echo "4. Run database migrations"
echo ""

