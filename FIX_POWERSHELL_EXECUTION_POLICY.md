# Fix PowerShell Execution Policy

## Problem

PowerShell is blocking npm/vercel scripts due to execution policy restrictions.

---

## Solution 1: Change Execution Policy (Requires Admin)

### Step 1: Open PowerShell as Administrator

1. **Right-click** on PowerShell
2. **Select:** "Run as Administrator"
3. **Click:** Yes when prompted

### Step 2: Change Execution Policy

Run this command in Admin PowerShell:

```powershell
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Step 3: Verify

```powershell
Get-ExecutionPolicy
```

Should show: `RemoteSigned`

### Step 4: Now Run Vercel Commands

```powershell
npm i -g vercel
vercel login
vercel link
```

---

## Solution 2: Bypass for Single Command (No Admin Needed)

Run commands with bypass:

```powershell
powershell -ExecutionPolicy Bypass -Command "npm i -g vercel"
powershell -ExecutionPolicy Bypass -Command "vercel login"
powershell -ExecutionPolicy Bypass -Command "vercel link"
```

---

## Solution 3: Use Command Prompt Instead

If PowerShell is too restrictive, use CMD:

1. **Open:** Command Prompt (cmd.exe)
2. **Run:**
   ```cmd
   npm i -g vercel
   vercel login
   vercel link
   ```

---

## Solution 4: Use npx (No Global Install)

You can use npx without installing globally:

```powershell
npx vercel login
npx vercel link
```

---

## Recommended: Use Command Prompt

Easiest solution - just use CMD instead of PowerShell:

1. **Open Command Prompt** (Windows Key + R → type `cmd`)
2. **Navigate to project:**
   ```cmd
   cd C:\Users\yanca\OneDrive\Desktop\ProductBrands
   ```
3. **Run:**
   ```cmd
   npm i -g vercel
   vercel login
   vercel link
   ```

---

## Quick Fix: Use npx (No Installation)

If you don't want to change execution policy:

```powershell
npx vercel login
npx vercel link
```

This uses npx which doesn't require global installation.

---

## Summary

**Easiest:** Use Command Prompt (cmd.exe) instead of PowerShell  
**Alternative:** Use `npx vercel` instead of global install  
**Full fix:** Change execution policy (requires admin)

Try using Command Prompt - it should work without any policy issues!

