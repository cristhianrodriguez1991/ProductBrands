# Troubleshoot localhost:3000 Error -102

## Server is Running But Not Accessible

Port 3000 is listening, but browser can't connect. Let's fix this.

---

## Step 1: Check Server Status

The server process is running, but might have errors. Check the terminal window where `npm run dev` is running:

**Look for:**
- ✅ "Ready" message
- ✅ "Local: http://localhost:3000"
- ❌ Any error messages
- ❌ Build failures

---

## Step 2: Try Alternative URLs

Sometimes `localhost` doesn't work. Try:

1. **http://127.0.0.1:3000**
2. **http://[::1]:3000** (IPv6)
3. **Check firewall** - Windows Firewall might be blocking

---

## Step 3: Check Windows Firewall

1. **Windows Security** → **Firewall & network protection**
2. **Check:** Is Node.js allowed?
3. **If not:** Allow Node.js through firewall

---

## Step 4: Restart Dev Server

The server might be in a bad state. Restart it:

1. **Find the terminal** running `npm run dev`
2. **Press:** `Ctrl + C` to stop it
3. **Restart:**
   ```cmd
   npm run dev
   ```
4. **Wait for:** "Ready" message
5. **Try browser again**

---

## Step 5: Check for Port Conflicts

Something else might be interfering:

```cmd
netstat -ano | findstr ":3000"
```

Should only show the Node.js process. If you see multiple, kill the others.

---

## Step 6: Clear Browser Cache

1. **Press:** `Ctrl + Shift + Delete`
2. **Clear:** Cached images and files
3. **Or try:** Incognito/Private mode

---

## Step 7: Check Server Logs

Look at the terminal output for:
- Build errors
- Database connection errors
- Missing dependencies
- TypeScript errors

---

## Quick Fix: Restart Everything

1. **Stop dev server:** `Ctrl + C` in terminal
2. **Kill Node processes:**
   ```cmd
   taskkill /F /IM node.exe
   ```
3. **Restart dev server:**
   ```cmd
   npm run dev
   ```
4. **Wait for "Ready"**
5. **Try browser:** http://localhost:3000

---

## Alternative: Use Different Port

If port 3000 has issues:

```cmd
set PORT=3001
npm run dev
```

Then access: http://localhost:3001

---

## Summary

**Server is running but not accessible**  
**Check:** Terminal for errors, try 127.0.0.1, restart server  
**Most likely:** Server has errors or needs restart

Check the terminal window running `npm run dev` - what does it show?

