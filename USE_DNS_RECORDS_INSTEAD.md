# Use DNS Records Instead of Nameservers

## Problem

GoDaddy doesn't recognize Vercel nameservers. 

**Solution:** Keep GoDaddy nameservers and add A/CNAME records instead.

---

## Step 1: Add Domain in Vercel

1. **Go to:** Vercel Dashboard → Your Project
2. **Settings** → **Domains**
3. **Click:** "Add Domain"
4. **Enter:** `productbrands.com`
5. **Click:** "Add"

---

## Step 2: Get DNS Records from Vercel

After adding the domain, Vercel will show you DNS records to add.

**You'll see something like:**

**For root domain (productbrands.com):**
- **Type:** A
- **Name:** @ (or blank)
- **Value:** `76.76.21.21` (example IP - Vercel will show actual IP)

**For www subdomain (www.productbrands.com):**
- **Type:** CNAME
- **Name:** www
- **Value:** `cname.vercel-dns.com` (example - Vercel will show actual value)

**Copy these values** - you'll need them in GoDaddy.

---

## Step 3: Update DNS Records in GoDaddy

1. **GoDaddy** → **My Products** → **productbrands.com**
2. **DNS** tab
3. **DNS Records** section

### Update A Record for Root Domain:

1. **Find the A record** with `@` and `216.198.79.1`
2. **Click:** "Edit" (pencil icon)
3. **Change Value to:** The IP address from Vercel (e.g., `76.76.21.21`)
4. **Click:** "Save"

**OR if you can't edit:**
1. **Delete** the old A record (`216.198.79.1`)
2. **Click:** "Add New Record"
3. **Type:** A
4. **Name:** @ (or leave blank)
5. **Value:** The IP address from Vercel
6. **TTL:** 600 seconds (or 1 Hour)
7. **Click:** "Save"

### Update CNAME for www:

1. **Find the CNAME record** with `www` and `productbrands.com.`
2. **Click:** "Edit" (pencil icon)
3. **Change Value to:** The CNAME from Vercel (e.g., `cname.vercel-dns.com`)
4. **Click:** "Save"

**OR if you can't edit:**
1. **Delete** the old CNAME record
2. **Click:** "Add New Record"
3. **Type:** CNAME
4. **Name:** www
5. **Value:** The CNAME from Vercel
6. **TTL:** 600 seconds (or 1 Hour)
7. **Click:** "Save"

---

## Step 4: Wait for DNS Propagation

**DNS propagation takes:**
- **Minimum:** 5-10 minutes
- **Average:** 1-2 hours
- **Maximum:** 24-48 hours

---

## Step 5: Verify in Vercel

1. **Vercel Dashboard** → Settings → Domains
2. **Check status:**
   - ⏳ "Pending" = Still propagating (wait)
   - ✅ "Valid Configuration" = Ready!
   - ❌ "Invalid Configuration" = Check DNS records

3. **Once valid:**
   - SSL certificate will be issued automatically
   - Site will be accessible at `https://productbrands.com`
   - Both `productbrands.com` and `www.productbrands.com` will work

---

## What Records to Update

**Current records in GoDaddy:**
- ❌ A record: `@` → `216.198.79.1` (GoDaddy parking) → **Change to Vercel IP**
- ✅ CNAME: `www` → `productbrands.com.` → **Change to Vercel CNAME**

**After update:**
- ✅ A record: `@` → Vercel IP (from Vercel)
- ✅ CNAME: `www` → Vercel CNAME (from Vercel)

---

## Troubleshooting

### Issue: Can't Edit Records

**Try:**
1. Delete old record
2. Add new record with correct values
3. Make sure you're in DNS Records section (not Nameservers)

### Issue: Vercel Shows "Invalid Configuration"

**Check:**
1. A record value matches Vercel's IP exactly
2. CNAME value matches Vercel's CNAME exactly
3. No typos in values
4. Records are saved in GoDaddy

**Wait:**
- DNS propagation can take 1-2 hours
- Check again after waiting

### Issue: Site Not Loading

**Check:**
1. DNS has propagated (use https://dnschecker.org)
2. Records are correct in GoDaddy
3. Vercel shows "Valid Configuration"

**Wait:**
- DNS propagation takes time
- Usually works within 1-2 hours

---

## Quick Checklist

- [ ] Domain added in Vercel
- [ ] DNS records copied from Vercel (A record IP and CNAME)
- [ ] A record updated in GoDaddy (changed from `216.198.79.1` to Vercel IP)
- [ ] CNAME updated in GoDaddy (changed from `productbrands.com.` to Vercel CNAME)
- [ ] Records saved in GoDaddy
- [ ] Waiting for DNS propagation (1-2 hours)
- [ ] Checked status in Vercel

---

## Summary

**Steps:**
1. Add domain in Vercel
2. Copy A record IP and CNAME from Vercel
3. Update A record in GoDaddy (change IP)
4. Update CNAME in GoDaddy (change value)
5. Save and wait 1-2 hours
6. Verify in Vercel

**Time:** Usually 1-2 hours for full setup

**Result:** Site will work at `https://productbrands.com` and `https://www.productbrands.com`

---

## Next Steps

1. **Go to Vercel** and add `productbrands.com`
2. **Copy the A record IP and CNAME** Vercel shows you
3. **Go to GoDaddy** → DNS → Update A record and CNAME
4. **Save and wait**

This approach works better with GoDaddy!

