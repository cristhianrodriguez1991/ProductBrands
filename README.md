# Product Brands - Private Label Platform

A production-ready web application for a category-agnostic private label company providing branding, labeling, packaging, sourcing, and fulfillment services.

## Tech Stack

- **Frontend**: Next.js 14 (App Router) + TypeScript
- **UI**: TailwindCSS + shadcn/ui + lucide-react
- **Auth**: NextAuth (Credentials + Google)
- **Backend**: Next.js Server Actions + API routes
- **Database**: PostgreSQL with Prisma ORM
- **File Uploads**: S3-compatible (AWS S3) with local storage fallback
- **Email**: Resend (or SMTP fallback)
- **Payments**: Stripe (optional)
- **Deployment**: Docker + docker-compose

## Features

### Public Website
- Home page with hero, trust badges, and CTAs
- Services page
- Industries page
- Process page
- Pricing page
- Portfolio/Case Studies
- FAQ
- Contact form
- Legal pages (Terms, Privacy)

### Customer Portal
- Dashboard with overview
- Quote requests with guided form
- Order tracking
- Messaging system
- Invoice management
- Account settings

### Admin Panel
- User and company management
- Quote management and responses
- Order management
- Invoice creation
- Service catalog management

## Setup Instructions

### Prerequisites

- Node.js 18+ and npm
- Docker and Docker Compose (for local development)
- PostgreSQL (or use Docker)

### Environment Variables

Create a `.env` file in the root directory:

```env
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/productbrands"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-change-in-production"

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

# Amazon Product Advertising API (PA-API v5)
# Get these from: https://webservices.amazon.com/paapi5/documentation/
# See AMAZON_PAAPI_SETUP.md for detailed setup instructions
AMAZON_PAAPI_ACCESS_KEY=""
AMAZON_PAAPI_SECRET_KEY=""
AMAZON_PAAPI_PARTNER_TAG=""
AMAZON_PAAPI_REGION="us-east-1"
AMAZON_MARKETPLACE="www.amazon.com"
```

### Local Development with Docker

1. **Start services:**
   ```bash
   docker-compose up -d
   ```

2. **Run migrations:**
   ```bash
   npm run db:push
   ```

3. **Seed the database:**
   ```bash
   npm run db:seed
   ```

4. **Start the development server:**
   ```bash
   npm run dev
   ```

   The app will be available at `http://localhost:3000`

### Local Development without Docker

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up PostgreSQL:**
   - Install and start PostgreSQL
   - Create a database named `productbrands`
   - Update `DATABASE_URL` in `.env`

3. **Run migrations:**
   ```bash
   npm run db:push
   ```

4. **Seed the database:**
   ```bash
   npm run db:seed
   ```

5. **Start the development server:**
   ```bash
   npm run dev
   ```

### Default Login Credentials

After seeding:

- **Admin:**
  - Email: `admin@productbrands.com`
  - Password: `admin123`

- **Customer:**
  - Email: `customer@demo.com`
  - Password: `customer123`

## Database Commands

```bash
# Push schema changes (dev)
npm run db:push

# Create migration
npm run db:migrate

# Seed database
npm run db:seed

# Open Prisma Studio
npm run db:studio
```

## Production Build

1. **Build the application:**
   ```bash
   npm run build
   ```

2. **Start production server:**
   ```bash
   npm start
   ```

## Docker Production Build

1. **Build the image:**
   ```bash
   docker build -t product-brands .
   ```

2. **Run the container:**
   ```bash
   docker run -p 3000:3000 \
    -e DATABASE_URL="your-database-url" \
    -e NEXTAUTH_SECRET="your-secret" \
    -e NEXTAUTH_URL="https://your-domain.com" \
    product-brands
   ```

## Project Structure

```
├── app/
│   ├── (auth)/          # Auth pages (login, register)
│   ├── (portal)/        # Customer portal
│   ├── (admin)/         # Admin panel
│   ├── api/             # API routes
│   ├── services/        # Marketing pages
│   └── ...
├── components/
│   └── ui/              # shadcn/ui components
├── lib/
│   ├── auth.ts         # NextAuth configuration
│   ├── prisma.ts       # Prisma client
│   ├── storage.ts      # File upload utilities
│   └── email.ts        # Email utilities
├── prisma/
│   ├── schema.prisma   # Database schema
│   └── seed.ts         # Seed script
└── ...
```

## Key Features Implementation

### Quote Workflow
1. Customer submits quote request
2. Admin reviews and adds line items
3. Admin sends quote response
4. Customer accepts/rejects
5. Accepted quotes can be converted to orders

### Order Workflow
1. Order created from accepted quote
2. Status progression: Pending Deposit → In Production → QA → Ready to Ship → Shipped → Delivered
3. Tracking numbers and updates
4. Invoice generation

### File Uploads
- Supports S3-compatible storage
- Falls back to local storage in development
- Files stored in `public/uploads/` locally

### Email Notifications
- Quote submitted confirmation
- Quote response ready
- Order status updates
- Uses Resend API (falls back to console logging if not configured)

## Customization

### Branding
- Update company name in navigation components
- Replace logo placeholder
- Update colors in `tailwind.config.ts`
- Modify content in marketing pages

### Services
- Services are displayed from the database (admin can manage)
- Update service descriptions in `app/services/page.tsx`

## Security Notes

- All routes are protected by middleware
- Server-side validation with Zod
- Password hashing with bcrypt
- File upload type restrictions
- Environment variables for secrets

## License

Private - All rights reserved

## Support

For questions or issues, contact: info@productbrands.com

"# ProductBrands" 
