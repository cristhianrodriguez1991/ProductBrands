# Switch Vercel Account

## Problem: Logged into Wrong Account

You need to logout and login to the correct Vercel account.

---

## Step 1: Logout from Current Account

Run this command:

```cmd
npx vercel logout
```

This will log you out of the current account.

---

## Step 2: Login to Correct Account

Run this command:

```cmd
npx vercel login
```

**This will:**
1. Show you a URL to visit
2. Show a code to enter
3. **Make sure you're logged into the CORRECT Vercel account in your browser**
4. Visit the URL and enter the code
5. Press Enter when done

---

## Important: Check Your Browser

When you visit the Vercel login URL:

1. **Check which account you're logged into** in your browser
2. **If it's the wrong account:**
   - Logout from Vercel in your browser
   - Login to the correct account
   - Then enter the code

---

## Step 3: Verify You're on Correct Account

After logging in, check:

```cmd
npx vercel whoami
```

This shows which account you're logged into.

---

## Step 4: Link Project (After Correct Login)

Once logged into the correct account:

```cmd
npx vercel link
```

This will link to the project under the correct account.

---

## Summary

1. **Logout:** `npx vercel logout`
2. **Login:** `npx vercel login` (make sure browser has correct account)
3. **Verify:** `npx vercel whoami`
4. **Link:** `npx vercel link`

Make sure you're logged into the CORRECT Vercel account in your browser before entering the code!

