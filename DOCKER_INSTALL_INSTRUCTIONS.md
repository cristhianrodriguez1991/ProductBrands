# Docker Installation Instructions

## Installation Steps

The Docker Desktop installer has been downloaded and should be opening now.

### Follow these steps:

1. **If a UAC prompt appears:**
   - Click "Yes" to allow the installer to run with administrator privileges

2. **Installation Wizard:**
   - Check "Use WSL 2 instead of Hyper-V" (recommended for Windows)
   - Click "Ok" to proceed
   - Wait for the installation to complete

3. **After Installation:**
   - You may be prompted to restart your computer
   - If so, restart and then continue with the steps below

4. **Launch Docker Desktop:**
   - After restart (if required), Docker Desktop should start automatically
   - If not, search for "Docker Desktop" in Start menu and launch it
   - Wait for Docker to fully start (you'll see a whale icon in the system tray)

5. **Verify Installation:**
   - Open PowerShell
   - Run: `docker --version`
   - You should see something like: `Docker version 24.x.x`

## After Docker is Installed

Once Docker Desktop is running, come back here and I'll help you:
1. Start the PostgreSQL database
2. Set up the database schema
3. Seed with demo data
4. Start the development server

## Quick Commands (After Docker is Installed)

```powershell
# Start PostgreSQL
docker compose up -d postgres

# Wait a moment, then setup database
npm run db:push
npm run db:seed

# Start the app
npm run dev
```

## Troubleshooting

**If the installer doesn't open:**
- The installer is located at: `%TEMP%\DockerDesktopInstaller.exe`
- Right-click it and select "Run as administrator"

**If WSL 2 is not installed:**
- Docker will prompt you to install WSL 2
- Follow the prompts to install it
- You may need to enable "Virtual Machine Platform" in Windows Features

**If installation fails:**
- Make sure you have administrator privileges
- Check Windows Features: Enable "Virtual Machine Platform" and "Windows Subsystem for Linux"
- Restart and try again


