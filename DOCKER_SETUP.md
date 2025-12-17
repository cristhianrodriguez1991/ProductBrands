# Docker Setup Guide

## Step 1: Install Docker Desktop

1. **Download Docker Desktop for Windows:**
   - Go to: https://www.docker.com/products/docker-desktop/
   - Download Docker Desktop for Windows
   - Run the installer

2. **Complete Installation:**
   - Follow the installation wizard
   - Restart your computer if prompted
   - Launch Docker Desktop
   - Wait for Docker to start (you'll see a whale icon in the system tray)

3. **Verify Installation:**
   Open PowerShell and run:
   ```powershell
   docker --version
   docker compose version
   ```

## Step 2: Start PostgreSQL with Docker

Once Docker is installed and running, execute:

```powershell
# Start PostgreSQL database
docker compose up -d postgres

# Wait a few seconds for database to be ready, then run:
npm run db:push

# Seed the database with demo data
npm run db:seed
```

## Step 3: Start the Application

You have two options:

### Option A: Run Next.js locally (Recommended for development)
```powershell
npm run dev
```

### Option B: Run everything in Docker
```powershell
docker compose up
```

This will start both PostgreSQL and the Next.js app in containers.

## Step 4: Access the Website

Once running:
- **Homepage**: http://localhost:3000
- **Login**: http://localhost:3000/login
- **Admin Panel**: http://localhost:3000/admin
- **Client Portal**: http://localhost:3000/portal

## Default Login Credentials

After seeding:
- **Admin**: `admin@productbrands.com` / `admin123`
- **Customer**: `customer@demo.com` / `customer123`

## Useful Docker Commands

```powershell
# Start services
docker compose up -d

# Stop services
docker compose down

# View logs
docker compose logs -f

# Restart services
docker compose restart

# Remove everything (including data)
docker compose down -v
```

## Troubleshooting

**Docker not starting:**
- Make sure WSL 2 is enabled (Docker Desktop will prompt you)
- Check Windows features: Virtual Machine Platform and Windows Subsystem for Linux

**Port already in use:**
- Stop any existing PostgreSQL instances
- Change ports in `docker-compose.yml` if needed

**Database connection errors:**
- Wait a few seconds after starting PostgreSQL
- Check if container is running: `docker compose ps`
- View logs: `docker compose logs postgres`


