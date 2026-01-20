# Fix Vercel DNS Conflict - Step by Step

## Current Issue

Vercel shows "Invalid Configuration" because GoDaddy has conflicting A records for `www`.

**Vercel wants:**
- Remove: A records for `www` (15.197.148.33 and 3.33.130.190)
- Add: CNAME record for `www` → `bb9fabe0e7300836.vercel-dns-017.com.`

---

## Step 1: Remove Conflicting A Records in GoDaddy

1. **GoDaddy** → **My Products** → **productbrands.com**
2. **DNS** tab
3. **DNS Records** section
4. **Find and DELETE these A records:**
   - A record: `www` → `15.197.148.33`
   - A record: `www` → `3.33.130.190`
5. **Click:** "Delete" for each one
6. **Confirm** deletion

---

## Step 2: Add CNAME Record in GoDaddy

1. **Still in GoDaddy DNS Records**
2. **Click:** "Add New Record"
3. **Select:** CNAME
4. **Name:** `www`
5. **Value:** `bb9fabe0e7300836.vercel-dns-017.com.`
   - **Important:** Include the trailing dot (.)
6. **TTL:** 600 seconds (or 1 Hour)
7. **Click:** "Save"

---

## Step 3: Add Root Domain in Vercel (Optional but Recommended)

To make `productbrands.com` (without www) work:

1. **Vercel Dashboard** → Settings → Domains
2. **Click:** "Add Domain"
3. **Enter:** `productbrands.com` (without www)
4. **Click:** "Add"
5. **Vercel will show DNS records** for root domain
6. **Add those records in GoDaddy** (usually A record for @)

---

## Step 4: Wait for DNS Propagation

**DNS propagation takes:**
- **Minimum:** 5-10 minutes
- **Average:** 1-2 hours
- **Maximum:** 24-48 hours

---

## Step 5: Verify in Vercel

1. **Vercel Dashboard** → Settings → Domains
2. **Check `www.productbrands.com` status:**
   - ⏳ "Pending" = Still propagating (wait)
   - ✅ "Valid Configuration" = Ready!
   - ❌ "Invalid Configuration" = Check DNS records

3. **Once valid:**
   - SSL certificate will be issued automatically
   - Site will be accessible at `https://www.productbrands.com`

---

## What Your GoDaddy DNS Should Look Like

**After fixing:**

**Keep these (don't delete):**
- A record: `@` → `216.198.79.1` (or update to Vercel IP if you add root domain)
- CNAME: `www` → `bb9fabe0e7300836.vercel-dns-017.com.` (NEW - from Vercel)
- Nameservers: `ns31.domaincontrol.com` and `ns32.domaincontrol.com` (keep these)

**Delete these:**
- ❌ A record: `www` → `15.197.148.33` (DELETE)
- ❌ A record: `www` → `3.33.130.190` (DELETE)

---

## Troubleshooting

### Issue: Can't Delete A Records

**Try:**
1. Click "Edit" instead of "Delete"
2. Change the record to something else first
3. Then delete it
4. Or contact GoDaddy support

### Issue: CNAME Not Saving

**Check:**
1. Value includes trailing dot: `bb9fabe0e7300836.vercel-dns-017.com.`
2. Name is exactly `www` (no spaces)
3. Type is CNAME (not A)

### Issue: Still Shows "Invalid Configuration"

**Check:**
1. Conflicting A records are deleted
2. CNAME record is added correctly
3. Wait at least 10-15 minutes
4. Refresh Vercel dashboard

**Wait:**
- DNS propagation takes time
- Usually works within 1-2 hours

---

## Quick Checklist

- [ ] Conflicting A records deleted in GoDaddy (www → 15.197.148.33 and 3.33.130.190)
- [ ] CNAME record added in GoDaddy (www → bb9fabe0e7300836.vercel-dns-017.com.)
- [ ] CNAME value includes trailing dot
- [ ] Records saved in GoDaddy
- [ ] Waiting for DNS propagation (1-2 hours)
- [ ] Checked status in Vercel

---

## Summary

**Steps:**
1. Delete conflicting A records in GoDaddy (www → 15.197.148.33 and 3.33.130.190)
2. Add CNAME record in GoDaddy (www → bb9fabe0e7300836.vercel-dns-017.com.)
3. Save and wait 1-2 hours
4. Verify in Vercel

**Time:** Usually 1-2 hours for full setup

**Result:** `https://www.productbrands.com` will work!

---

## Next Steps

1. **Go to GoDaddy** → DNS → Delete the conflicting A records
2. **Add the CNAME record** Vercel wants
3. **Save and wait**
4. **Check Vercel** after 1-2 hours

This should fix the "Invalid Configuration" status!

