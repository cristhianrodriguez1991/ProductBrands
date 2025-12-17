# Database Setup - Update Password

## Step 1: Update .env File with Your PostgreSQL Password

The `.env` file needs your PostgreSQL password. You have two options:

### Option A: Run this PowerShell command (replace YOUR_PASSWORD):

```powershell
.\update-env.ps1 -Password "YOUR_PASSWORD"
```

### Option B: Manually edit .env file

1. Open the `.env` file in the project root
2. Find this line:
   ```
   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/productbrands
   ```
3. Replace `postgres` (the password part) with your actual PostgreSQL password:
   ```
   DATABASE_URL=postgresql://postgres:YOUR_ACTUAL_PASSWORD@localhost:5432/productbrands
   ```
4. Save the file

## Step 2: Create the Database

After updating the password, run:

```powershell
# Create database tables
npm run db:push

# Seed with demo data
npm run db:seed

# Start the development server
npm run dev
```

## Alternative: Create Database Manually

If you prefer to create the database manually:

1. Open "SQL Shell (psql)" from Start menu
2. Press Enter for all prompts (host, port, database, username)
3. Enter your postgres password when prompted
4. Run: `CREATE DATABASE productbrands;`
5. Type `\q` to exit

Then run `npm run db:push` and `npm run db:seed`

## Don't Remember Your Password?

If you forgot your PostgreSQL password, you can reset it:

1. Open "SQL Shell (psql)" as Administrator
2. Connect to the default `postgres` database
3. Or edit `pg_hba.conf` to allow local connections without password temporarily

