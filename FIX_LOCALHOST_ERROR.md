# Fix Error Code -102 on localhost:3000

## Problem: Can't Connect to Local Dev Server

**Error Code:** -102  
**URL:** http://localhost:3000/  
**Meaning:** Connection refused or server not running

---

## Solution: Start the Dev Server

The dev server isn't running. I just started it for you.

---

## Check if Server Started

1. **Wait 10-20 seconds** for the server to start
2. **Open browser:** http://localhost:3000
3. **Should see:** Your application loading

---

## If Still Not Working

### Check Terminal Output

Look at the terminal where `npm run dev` is running:
- **Should show:** "Ready" message
- **Should show:** "Local: http://localhost:3000"
- **If errors:** Check what they say

### Common Issues:

1. **Port 3000 already in use:**
   - Another app is using port 3000
   - Solution: Kill the process or use different port

2. **Build errors:**
   - Check terminal for error messages
   - Fix any compilation errors

3. **Database connection:**
   - Make sure DATABASE_URL is set in .env
   - Database should be accessible

---

## Manual Start (If Needed)

If the server didn't start automatically:

1. **Open Command Prompt**
2. **Navigate to project:**
   ```cmd
   cd C:\Users\yanca\OneDrive\Desktop\ProductBrands
   ```
3. **Start dev server:**
   ```cmd
   npm run dev
   ```
4. **Wait for:** "Ready" message
5. **Open:** http://localhost:3000

---

## Verify Server is Running

Check if port 3000 is listening:

```cmd
netstat -ano | findstr ":3000"
```

Should show port 3000 in LISTENING state.

---

## Summary

**Error -102:** Dev server not running  
**Solution:** Start dev server with `npm run dev`  
**Status:** I just started it for you - wait 10-20 seconds and try again!

Check your browser - the server should be starting now!

