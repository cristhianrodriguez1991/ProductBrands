# Admin Portal Setup Guide

## Overview

The Admin Portal has been implemented with:
- ✅ Role-based access control (RBAC) with 7 roles: OWNER, ADMIN, SALES, OPS, SUPPORT, READONLY
- ✅ Product listings management (CRUD + duplicate + archive)
- ✅ Enhanced quotes management with message threads, status workflow, convert to order
- ✅ Client/company management
- ✅ Comprehensive audit logging
- ✅ Secure API routes with validation

## Database Migration

### Step 1: Run Prisma Migration

```bash
# Generate Prisma client with new schema
npx prisma generate

# Create and apply migration
npx prisma migrate dev --name add_admin_portal_models

# Or if in production:
npx prisma migrate deploy
```

### Step 2: Migrate Existing Data (if needed)

If you have existing quotes without `quoteNumber`, run:

```bash
tsx scripts/migrate-quote-numbers.ts
```

## Creating the First Admin User

### Option 1: Using the Script (Recommended)

```bash
tsx scripts/create-admin-user.ts admin@yourcompany.com YourSecurePassword123 ADMIN
```

Available roles:
- `OWNER` - Full access
- `ADMIN` - Full admin access
- `SALES` - Sales team access
- `OPS` - Operations team
- `SUPPORT` - Support team
- `READONLY` - Read-only access

### Option 2: Manual Creation via Prisma Studio

```bash
npx prisma studio
```

Then create a user with:
- Email: your admin email
- Password: bcrypt hash (use `bcryptjs` to hash)
- Role: `ADMIN` or `OWNER`
- isActive: `true`

### Option 3: Via Database Directly

```sql
INSERT INTO "User" (id, email, password, role, "isActive", "createdAt", "updatedAt")
VALUES (
  gen_random_uuid()::text,
  'admin@yourcompany.com',
  '$2a$10$...', -- bcrypt hash of password
  'ADMIN',
  true,
  NOW(),
  NOW()
);
```

## New Routes & Pages

### Admin Pages
- `/admin` - Dashboard with KPIs and recent activity
- `/admin/listings` - Product listings management
- `/admin/listings/new` - Create new listing
- `/admin/listings/[id]` - Edit listing
- `/admin/quotes` - Quotes inbox with filters
- `/admin/quotes/[id]` - Quote detail & management
- `/admin/clients` - Client companies list
- `/admin/clients/[id]` - Client detail page

### API Routes
- `GET/POST /api/admin/listings` - List/create listings
- `GET/PATCH/DELETE /api/admin/listings/[id]` - Get/update/archive listing
- `POST /api/admin/listings/[id]/duplicate` - Duplicate listing
- `GET /api/admin/quotes` - List quotes with filters
- `PATCH /api/admin/quotes/[id]/status` - Update quote status
- `POST /api/admin/quotes/[id]/message` - Add message to quote
- `PUT /api/admin/quotes/[id]/line-items` - Update quote line items
- `POST /api/admin/quotes/[id]/convert-to-order` - Convert quote to order
- `GET /api/admin/clients` - List clients
- `GET /api/admin/audit` - Get audit logs

## Security Features

1. **RBAC Enforcement**: All admin routes check user role server-side
2. **Write Protection**: READONLY role cannot modify data
3. **Audit Logging**: All critical actions are logged with before/after states
4. **Input Validation**: Zod schemas validate all API inputs
5. **Quote Number Generation**: Auto-generated human-readable quote numbers

## Key Features

### Listings Management
- Create/edit/archive product listings
- Manage variants (SKU, options, pricing)
- Upload media/images
- Duplicate listings
- Search and filter by status/category

### Quotes Management
- Enhanced status workflow: NEW → NEEDS_INFO → PRICING → SENT → APPROVED → ORDERED
- Message thread for client communication
- Internal notes (admin-only)
- Line items with pricing and margin tracking
- Convert approved quotes to orders
- Search and filter by status/company

### Audit Logging
- Tracks: listing create/update/delete, quote status changes, pricing edits, user role changes, quote→order conversion
- Includes: actor, action, entity type/id, before/after states, IP, user agent
- Accessible via `/api/admin/audit` and shown on dashboard

## Workflow Example

1. **Client submits quote** → Status: NEW
2. **Admin reviews** → Changes status to NEEDS_INFO, sends message requesting details
3. **Client responds** → Admin updates status to PRICING
4. **Admin adds line items** → Sets pricing, calculates totals
5. **Admin sends quote** → Status: SENT
6. **Client approves** → Status: APPROVED
7. **Admin converts to order** → Creates Order, updates quote status to ORDERED

## TODOs for v2

- [ ] PDF quote generation
- [ ] Email notifications for quote status changes
- [ ] Quote assignment to sales reps
- [ ] Bulk actions (change status, assign owner)
- [ ] Advanced search with filters
- [ ] Listing variants editor UI
- [ ] Media upload UI
- [ ] Category management UI
- [ ] Client contact management UI
- [ ] Order fulfillment tracking enhancements

## Testing

After setup, verify:
1. ✅ Can log in as admin
2. ✅ Can access `/admin` dashboard
3. ✅ Can create a listing
4. ✅ Can view quotes
5. ✅ Can update quote status
6. ✅ Can convert quote to order
7. ✅ Audit logs are being created

## Troubleshooting

**Issue**: "Unauthorized" errors
- Check user role is one of: OWNER, ADMIN, SALES, OPS, SUPPORT, READONLY
- Verify session is valid

**Issue**: Quote numbers not generating
- Run migration script: `tsx scripts/migrate-quote-numbers.ts`
- Check `generateQuoteNumber()` function

**Issue**: Audit logs not appearing
- Check `AuditLog` table exists
- Verify `logAudit()` is being called
- Check console for errors
