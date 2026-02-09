# Resend Email Setup

This project uses [Resend](https://resend.com) for sending transactional email (contact form, quote notifications, chat alerts).

## 1. Get an API key

1. Sign up at [resend.com](https://resend.com).
2. Go to **API Keys** and create a new key.
3. Copy the key (starts with `re_`).

## 2. Set environment variables

**Local (`.env` or `.env.local`):**

```bash
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxx
EMAIL_FROM=noreply@yourdomain.com
```

**Vercel:** Project → Settings → Environment Variables. Add:

- `RESEND_API_KEY` – your Resend API key  
- `EMAIL_FROM` – sender address (must use a verified domain; see below)

Redeploy after changing env vars.

## 3. Verify your domain (required for production)

To send from your own domain (e.g. `noreply@productbrands.com`):

1. In Resend dashboard go to **Domains** → **Add Domain**.
2. Enter your domain (e.g. `productbrands.com`).
3. Add the DNS records Resend shows (SPF, DKIM, etc.) at your DNS provider (GoDaddy, Cloudflare, etc.).
4. Click **Verify** in Resend once DNS has propagated.

Until the domain is verified, you can send from Resend’s sandbox domain (e.g. `onboarding@resend.dev`) for testing only.

## 4. Where email is used in this app

- **Contact form** (`/contact`) → email to `CONTACT_EMAIL` with reply-to set to the submitter.
- **Quote submitted** → confirmation to the user who created the quote.
- **Chat** → admin notified on new customer message; customer notified when admin replies.

All sending goes through `lib/email.ts`; if `RESEND_API_KEY` is not set, emails are logged and not sent (mock success).

## 5. Optional: plain text and reply-to

`sendEmail()` in `lib/email.ts` supports:

- `to`, `subject`, `html` (required)
- `text` – plain text version
- `replyTo` – reply-to address(es)
- `cc`, `bcc`

Example:

```ts
import { sendEmail } from "@/lib/email"

await sendEmail({
  to: "client@example.com",
  subject: "Your quote",
  html: "<p>Hello!</p>",
  text: "Hello!",
  replyTo: "sales@yourdomain.com",
})
```

## Troubleshooting

- **Emails not sending:** Ensure `RESEND_API_KEY` is set and the domain for `EMAIL_FROM` is verified in Resend.
- **Spam / delivery:** Keep SPF/DKIM records correct and avoid spammy content.
- **Rate limits:** See [Resend limits](https://resend.com/docs/dashboard/emails/rate-limit).
