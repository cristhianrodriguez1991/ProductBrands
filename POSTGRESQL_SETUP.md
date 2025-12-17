# PostgreSQL Setup Guide (Without Docker)

## Step 1: Install PostgreSQL

### Option A: Download Installer (Recommended)
1. Go to: https://www.postgresql.org/download/windows/
2. Click "Download the installer"
3. Download PostgreSQL 15 or 16
4. Run the installer

### Option B: Using Chocolatey (if you have it)
```powershell
choco install postgresql
```

### Installation Steps:
1. Run the installer
2. **Important:** Remember the password you set for the `postgres` user
3. Port: Keep default (5432)
4. Locale: Default is fine
5. Complete the installation

## Step 2: Create the Database

After installation, you can create the database using one of these methods:

### Method 1: Using pgAdmin (GUI - Easiest)
1. Open pgAdmin (installed with PostgreSQL)
2. Connect to PostgreSQL server (use the password you set)
3. Right-click "Databases" → "Create" → "Database"
4. Name: `productbrands`
5. Click "Save"

### Method 2: Using Command Line
Open PowerShell and run:
```powershell
# Add PostgreSQL to PATH (adjust version number)
$env:Path += ";C:\Program Files\PostgreSQL\15\bin"

# Create database (you'll be prompted for password)
createdb -U postgres productbrands
```

### Method 3: Using SQL
1. Open "SQL Shell (psql)" from Start menu
2. Press Enter for all defaults (host, port, database, username)
3. Enter your postgres password
4. Run: `CREATE DATABASE productbrands;`
5. Type `\q` to exit

## Step 3: Update .env File

Update the DATABASE_URL in `.env` if your password is different:
```
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/productbrands"
```

Replace `YOUR_PASSWORD` with the password you set during installation.

## Step 4: Run Setup Commands

Once PostgreSQL is installed and database is created:

```powershell
# Create database tables
npm run db:push

# Seed with demo data
npm run db:seed

# Start the development server
npm run dev
```

## Step 5: Access the Website

- **Homepage**: http://localhost:3000
- **Login**: http://localhost:3000/login
- **Admin**: http://localhost:3000/admin
- **Portal**: http://localhost:3000/portal

## Default Login (After Seeding)

- **Admin**: `admin@productbrands.com` / `admin123`
- **Customer**: `customer@demo.com` / `customer123`

## Troubleshooting

**Can't connect to database:**
- Make sure PostgreSQL service is running
- Check Windows Services: Look for "postgresql-x64-15" or similar
- Start the service if it's stopped

**Password issues:**
- Make sure DATABASE_URL in .env matches your PostgreSQL password
- Try resetting postgres password if needed

**Port 5432 in use:**
- Check if another PostgreSQL instance is running
- Or change the port in .env and PostgreSQL config

