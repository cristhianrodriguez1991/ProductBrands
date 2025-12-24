# Start Dev Server - Step by Step

## Error -102: Dev Server Not Running

The dev server needs to be started manually. Here's how:

---

## Method 1: Start in New Terminal Window

I just opened a new PowerShell window with the dev server starting.

**Check:**
1. **Look for a new PowerShell window** that opened
2. **Wait for it to show:** "Ready" message
3. **Then open:** http://localhost:3000

---

## Method 2: Start Manually

If the window didn't open, start it yourself:

### Step 1: Open Command Prompt or PowerShell

- Press `Windows Key + R`
- Type: `cmd` or `powershell`
- Press Enter

### Step 2: Navigate to Project

```cmd
cd C:\Users\yanca\OneDrive\Desktop\ProductBrands
```

### Step 3: Start Dev Server

```cmd
npm run dev
```

### Step 4: Wait for Server

You should see:
```
▲ Next.js 14.0.4
- Local:        http://localhost:3000
✓ Ready in X seconds
```

### Step 5: Open Browser

Once you see "Ready", open:
```
http://localhost:3000
```

---

## Troubleshooting

### If Port 3000 is Already in Use

**Check what's using it:**
```cmd
netstat -ano | findstr ":3000"
```

**Kill the process:**
```cmd
taskkill /PID <process_id> /F
```

**Or use different port:**
```cmd
set PORT=3001 && npm run dev
```
Then access: http://localhost:3001

---

### If Build Errors

Check the terminal output for:
- Missing dependencies
- TypeScript errors
- Database connection errors

---

## Quick Check

**Is the server running?**
- Check for PowerShell/CMD window with `npm run dev`
- Look for "Ready" message
- Check if port 3000 is listening

**If not running:**
- Start it manually using Method 2 above

---

## Summary

**Error -102:** Server not running  
**Solution:** Start with `npm run dev`  
**Check:** Look for new PowerShell window or start manually

The server should be starting in a new window. Check for it, or start it manually using the steps above!

