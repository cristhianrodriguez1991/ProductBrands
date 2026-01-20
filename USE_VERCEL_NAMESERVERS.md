# Use Vercel Nameservers - Step by Step

## Problem

Your domain is using external nameservers, so GoDaddy can't manage DNS records.

**Solution:** Use Vercel nameservers instead - it's easier!

---

## Step 1: Add Domain in Vercel

1. **Go to:** Vercel Dashboard → Your Project
2. **Settings** → **Domains**
3. **Click:** "Add Domain"
4. **Enter:** `productbrands.com`
5. **Click:** "Add"

---

## Step 2: Get Vercel Nameservers

After adding the domain, Vercel will show you nameservers.

**You'll see something like:**
```
ns1.vercel-dns.com
ns2.vercel-dns.com
```

**OR:**
```
a.vercel-dns.com
b.vercel-dns.com
c.vercel-dns.com
d.vercel-dns.com
```

**Copy all the nameservers** - you'll need them in GoDaddy.

---

## Step 3: Update Nameservers in GoDaddy

1. **GoDaddy** → **My Products** → **productbrands.com**
2. **DNS** tab
3. **Nameservers** section
4. **Click:** "Change" button
5. **Select:** "Custom" (not "Default")
6. **Enter nameservers:**
   - Enter each Vercel nameserver on a new line
   - Example:
     ```
     a.vercel-dns.com
     b.vercel-dns.com
     c.vercel-dns.com
     d.vercel-dns.com
     ```
7. **Click:** "Save"

---

## Step 4: Wait for Propagation

**DNS propagation takes:**
- **Minimum:** 1-2 hours
- **Average:** 24 hours
- **Maximum:** 48 hours

**Vercel will:**
- ✅ Automatically configure all DNS records
- ✅ Issue SSL certificate automatically
- ✅ Set up both `productbrands.com` and `www.productbrands.com`

---

## Step 5: Verify in Vercel

1. **Vercel Dashboard** → Settings → Domains
2. **Check status:**
   - ⏳ "Pending" = Still propagating (wait)
   - ✅ "Valid Configuration" = Ready!
   - ❌ "Invalid Configuration" = Check nameservers

3. **Once valid:**
   - SSL certificate will be issued automatically
   - Site will be accessible at `https://productbrands.com`

---

## What Happens Next

**After nameservers propagate:**

1. **Vercel manages everything:**
   - A records
   - CNAME records
   - SSL certificates
   - Both root and www domains

2. **You don't need to:**
   - Add DNS records manually
   - Configure anything else
   - Worry about DNS management

3. **Your site will work at:**
   - `https://productbrands.com`
   - `https://www.productbrands.com`

---

## Troubleshooting

### Issue: Nameservers Not Updating

**Check:**
1. Nameservers are saved in GoDaddy
2. Wait at least 1-2 hours
3. Check propagation: https://dnschecker.org

**Fix:**
- Double-check nameservers are correct
- Make sure you saved them in GoDaddy
- Wait longer (can take up to 48 hours)

### Issue: Vercel Shows "Invalid Configuration"

**Check:**
1. Nameservers are correct in GoDaddy
2. DNS has propagated (use dnschecker.org)
3. Domain is added correctly in Vercel

**Wait:**
- DNS propagation can take 24-48 hours
- Usually works within 1-2 hours

---

## Quick Checklist

- [ ] Domain added in Vercel
- [ ] Vercel nameservers copied
- [ ] Nameservers updated in GoDaddy
- [ ] Saved changes in GoDaddy
- [ ] Waiting for DNS propagation (1-48 hours)
- [ ] Checked status in Vercel

---

## Summary

**Steps:**
1. Add domain in Vercel
2. Copy Vercel nameservers
3. Update nameservers in GoDaddy
4. Wait for propagation
5. Verify in Vercel

**Time:** Usually 1-24 hours for full setup

**Result:** Vercel manages all DNS automatically!

---

## Next Steps

1. **Go to Vercel** and add `productbrands.com`
2. **Copy the nameservers** Vercel shows you
3. **Go to GoDaddy** → DNS → Nameservers → Change to Vercel nameservers
4. **Save and wait**

That's it! Vercel will handle everything else automatically.

