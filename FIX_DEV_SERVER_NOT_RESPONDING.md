# Fix Dev Server Not Responding

## Problem: Error -102 (Connection Refused)

The server might be:
- Not starting properly
- Crashing on startup
- Blocked by firewall
- Using wrong port

---

## Solution: Check Terminal Output

**Most Important:** Look at the PowerShell window running `npm run dev`

**What to look for:**
- ✅ "Ready" message
- ✅ "Local: http://localhost:3000"
- ❌ Error messages
- ❌ Panic/crash messages
- ❌ Build failures

---

## Common Issues & Fixes

### Issue 1: Server Crashed

**Check terminal for:**
- Panic messages
- Build errors
- Missing dependencies

**Fix:** Restart the server

### Issue 2: Port Already in Use

**Check:**
```cmd
netstat -ano | findstr ":3000"
```

**If something else is using it:**
- Kill that process
- Or use different port: `set PORT=3001 && npm run dev`

### Issue 3: Firewall Blocking

**Check Windows Firewall:**
- Allow Node.js through firewall
- Or temporarily disable firewall to test

### Issue 4: Server Not Fully Started

**Wait longer:**
- First startup can take 30-60 seconds
- Wait for "Ready" message before trying browser

---

## Step-by-Step Fix

### 1. Stop All Node Processes

```cmd
taskkill /F /IM node.exe
```

### 2. Start Fresh

```cmd
cd C:\Users\yanca\OneDrive\Desktop\ProductBrands
npm run dev
```

### 3. Watch Terminal

**Wait for:**
- "Ready" message
- "Local: http://localhost:3000"
- No errors

### 4. Try Browser

**Only after seeing "Ready":**
- Open: http://localhost:3000
- Or try: http://127.0.0.1:3000

---

## Alternative: Use Different Port

If port 3000 has issues:

```cmd
set PORT=3001
npm run dev
```

Then access: http://localhost:3001

---

## Check What's Wrong

**In the terminal, look for:**
1. **Syntax errors** - Should be fixed now
2. **Database errors** - Check DATABASE_URL in .env
3. **Missing dependencies** - Run `npm install`
4. **Build failures** - Check error messages

---

## Quick Diagnostic

**Run this to check:**
```cmd
npm run dev
```

**Then watch for:**
- Does it start?
- Does it show "Ready"?
- Any error messages?

**Share the terminal output** and I can help fix the specific issue!

---

## Summary

**Error -102:** Server not responding  
**Check:** Terminal output for errors  
**Fix:** Restart server, check for errors, wait for "Ready" message

**What does the terminal show?** Share the output and I'll help fix it!

