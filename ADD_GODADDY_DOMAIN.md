# Add GoDaddy Custom Domain to Vercel

## ✅ Your Site is Online!

Now let's connect your custom domain from GoDaddy.

---

## Step 1: Add Domain in Vercel

1. **Go to:** Vercel Dashboard → Your Project
2. **Settings** → **Domains**
3. **Click:** "Add Domain" or "Add" button
4. **Enter your domain:** 
   - Example: `productbrands.com` (without www)
   - Or: `www.productbrands.com` (with www)
5. **Click:** "Add"

**Note:** You can add both:
- `productbrands.com` (root domain)
- `www.productbrands.com` (www subdomain)

---

## Step 2: Get DNS Configuration from Vercel

After adding the domain, Vercel will show you DNS records to add:

**You'll see something like:**
- **Type:** A
- **Name:** @ (or blank)
- **Value:** `76.76.21.21` (example IP)

**OR:**
- **Type:** CNAME
- **Name:** www
- **Value:** `cname.vercel-dns.com` (example)

**Copy these values** - you'll need them in GoDaddy.

---

## Step 3: Configure DNS in GoDaddy

### Option A: Using A Record (Root Domain)

1. **Go to:** GoDaddy.com → Sign in
2. **My Products** → **DNS** (next to your domain)
3. **Records** tab
4. **Add/Edit A Record:**
   - **Type:** A
   - **Name:** @ (or leave blank)
   - **Value:** The IP address from Vercel (e.g., `76.76.21.21`)
   - **TTL:** 600 (or default)
5. **Save**

### Option B: Using CNAME (www Subdomain)

1. **In GoDaddy DNS:**
2. **Add/Edit CNAME Record:**
   - **Type:** CNAME
   - **Name:** www
   - **Value:** The CNAME from Vercel (e.g., `cname.vercel-dns.com`)
   - **TTL:** 600 (or default)
3. **Save**

---

## Step 4: Wait for DNS Propagation

**DNS changes can take:**
- **Minimum:** 5-10 minutes
- **Average:** 1-2 hours
- **Maximum:** 24-48 hours

**Check status in Vercel:**
- Settings → Domains
- Should show: "Valid Configuration" when ready
- SSL certificate will be issued automatically

---

## Step 5: Verify Domain

1. **Vercel Dashboard** → Settings → Domains
2. **Check status:**
   - ✅ "Valid Configuration" = DNS is correct
   - ⏳ "Pending" = Still propagating
   - ❌ "Invalid Configuration" = Check DNS records

3. **Test your domain:**
   - Visit: `https://yourdomain.com`
   - Should load your Vercel site
   - SSL certificate should be active (HTTPS)

---

## Common DNS Configurations

### Configuration 1: Root + www (Recommended)

**In GoDaddy:**
- **A Record:** @ → Vercel IP
- **CNAME Record:** www → Vercel CNAME

**Result:**
- `yourdomain.com` works
- `www.yourdomain.com` works

### Configuration 2: CNAME Only (www)

**In GoDaddy:**
- **CNAME Record:** www → Vercel CNAME

**Result:**
- `www.yourdomain.com` works
- `yourdomain.com` redirects to www (if configured)

---

## Troubleshooting

### Issue: "Invalid Configuration"

**Check:**
1. DNS records are correct in GoDaddy
2. Values match exactly what Vercel shows
3. No typos in IP addresses or CNAME values
4. TTL is set (600 or default)

**Fix:**
- Double-check DNS records
- Wait a few minutes and refresh Vercel
- Use DNS checker: https://dnschecker.org

### Issue: Domain Not Loading

**Check:**
1. DNS has propagated (use dnschecker.org)
2. Domain is added correctly in Vercel
3. SSL certificate is issued (check in Vercel)

**Wait:**
- DNS can take up to 48 hours
- Usually works within 1-2 hours

### Issue: SSL Certificate Not Issued

**Vercel automatically issues SSL certificates:**
- Usually takes 5-10 minutes after DNS is valid
- Check in Vercel → Settings → Domains
- Should show "Valid" status

---

## Quick Checklist

- [ ] Domain added in Vercel
- [ ] DNS records copied from Vercel
- [ ] DNS records added in GoDaddy
- [ ] Waited for DNS propagation
- [ ] Domain shows "Valid Configuration" in Vercel
- [ ] SSL certificate issued
- [ ] Site loads at custom domain

---

## Summary

**Steps:**
1. Add domain in Vercel
2. Copy DNS records from Vercel
3. Add DNS records in GoDaddy
4. Wait for propagation
5. Verify in Vercel

**Time:** Usually 1-2 hours for full setup

Go to Vercel Dashboard → Settings → Domains and add your domain now!

