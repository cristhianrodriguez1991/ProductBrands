# Quick Start Guide

## Prerequisites

You need PostgreSQL installed and running. Choose one option:

### Option 1: Install PostgreSQL Locally
1. Download and install PostgreSQL from https://www.postgresql.org/download/windows/
2. During installation, remember the password you set for the `postgres` user
3. Start PostgreSQL service

### Option 2: Use Docker (if installed)
```bash
docker compose up -d postgres
```

### Option 3: Use a Cloud Database
- Use services like Supabase, Neon, or Railway
- Get the connection string and update DATABASE_URL in .env

## Setup Steps

### 1. Create Database

Open PostgreSQL command line or pgAdmin and run:
```sql
CREATE DATABASE productbrands;
```

### 2. Update .env File

The .env file has been created. Update the DATABASE_URL if needed:
- If your PostgreSQL password is different, update it in DATABASE_URL
- If PostgreSQL is on a different port, update the port number

### 3. Run Database Setup

```bash
# Push schema to database
npm run db:push

# Seed with demo data
npm run db:seed
```

### 4. Start the Server

```bash
npm run dev
```

## Access the Website

Once the server is running, open your browser:

- **Homepage**: http://localhost:3000
- **Login Page**: http://localhost:3000/login
- **Admin Panel**: http://localhost:3000/admin (after admin login)
- **Client Portal**: http://localhost:3000/portal (after customer login)

## Default Login Credentials

After running `npm run db:seed`:

**Admin Account:**
- Email: `admin@productbrands.com`
- Password: `admin123`

**Customer Account:**
- Email: `customer@demo.com`
- Password: `customer123`

## Troubleshooting

**Database Connection Error:**
- Make sure PostgreSQL is running
- Check if the database `productbrands` exists
- Verify your password in DATABASE_URL matches your PostgreSQL password

**Port 3000 Already in Use:**
- Change the port: `PORT=3001 npm run dev`
- Then access at http://localhost:3001

