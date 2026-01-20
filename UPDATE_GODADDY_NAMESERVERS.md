# Update GoDaddy Nameservers to Vercel

## Current Status

Your domain is using GoDaddy's default nameservers:
- `ns31.domaincontrol.com`
- `ns32.domaincontrol.com`

**Next:** Change to Vercel nameservers.

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
3. **Nameservers** section (scroll down)
4. **Click:** "Change" button
5. **Select:** "Custom" (not "Default")
6. **Delete the current nameservers:**
   - Remove: `ns31.domaincontrol.com`
   - Remove: `ns32.domaincontrol.com`
7. **Add Vercel nameservers:**
   - Enter each Vercel nameserver on a new line
   - Example:
     ```
     a.vercel-dns.com
     b.vercel-dns.com
     c.vercel-dns.com
     d.vercel-dns.com
     ```
8. **Click:** "Save"

**Note:** You might see a warning about changing nameservers - that's normal. Click "Save" anyway.

---

## Step 4: Wait for DNS Propagation

**DNS propagation takes:**
- **Minimum:** 1-2 hours
- **Average:** 24 hours
- **Maximum:** 48 hours

**During this time:**
- Your site might be temporarily unavailable
- DNS records will migrate to Vercel
- Vercel will configure everything automatically

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
   - Both `productbrands.com` and `www.productbrands.com` will work

---

## What Happens to Current DNS Records?

**After changing nameservers:**
- Current DNS records in GoDaddy will stop working
- Vercel will create new DNS records automatically
- You don't need to manually add A/CNAME records
- Vercel manages everything

**Current records that will be replaced:**
- A record: `216.198.79.1` → Vercel will set correct IP
- CNAME: `www` → Vercel will configure automatically
- Other records: Vercel will handle as needed

---

## Alternative: Keep GoDaddy Nameservers (Manual DNS)

**If you prefer to keep GoDaddy nameservers:**

1. **Add domain in Vercel**
2. **Vercel will show:** A record and CNAME record to add
3. **In GoDaddy DNS:**
   - **Delete:** Current A record (`216.198.79.1`)
   - **Add:** New A record with Vercel's IP
   - **Update:** CNAME for www (if needed)
4. **Wait for propagation**

**This is more work** - using Vercel nameservers is easier!

---

## Troubleshooting

### Issue: Nameservers Not Saving

**Check:**
1. You're logged in as domain owner
2. Domain is not locked
3. Try different browser

**Fix:**
- Unlock domain if locked
- Try incognito/private mode
- Contact GoDaddy support if needed

### Issue: Site Not Loading After Change

**This is normal:**
- DNS propagation takes 1-48 hours
- Site might be unavailable during this time
- Wait for propagation to complete

**Check:**
- Use https://dnschecker.org to check propagation
- Wait at least 2-4 hours before worrying

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
- [ ] Nameservers updated in GoDaddy (changed from GoDaddy to Vercel)
- [ ] Saved changes in GoDaddy
- [ ] Waiting for DNS propagation (1-48 hours)
- [ ] Checked status in Vercel

---

## Summary

**Steps:**
1. Add domain in Vercel
2. Copy Vercel nameservers
3. GoDaddy → DNS → Nameservers → Change to Vercel nameservers
4. Save and wait 1-24 hours
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

