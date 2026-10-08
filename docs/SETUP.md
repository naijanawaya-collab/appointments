# Setup & deployment guide

From zero to a live platform with your brother's shop on its own domain.
Follow the steps in order; each one says what you need from the previous one.
Plan about 2 hours, plus DNS waiting time (usually minutes, up to a few hours).

> **Placeholders used below.** Replace them with your real values:
> `yourdomain.com` = the platform domain you buy · `app.yourdomain.com` = admin and
> sign-in · `mail.yourdomain.com` = email sending · `you@…` = your own email.

---

## 0. What you'll end up with

| Address | What it is |
| --- | --- |
| `https://yourdomain.com` | Platform landing page |
| `https://app.yourdomain.com` | Sign-in and admin for you and shop owners |
| `https://yourdomain.com/kaiser`, `/fadelab`, `/lune` | Demo storefronts (examples) |
| `https://mbacutzhairstudio.com` | Your brother's storefront and booking |
| `bookings@mail.yourdomain.com` | Sender of booking emails, shown as the shop's name |

### Accounts and costs

| Service | Plan | Cost | Why |
| --- | --- | --- | --- |
| Domain registrar (any) | n/a | ~€10–40 / year | Your platform domain |
| [Vercel](https://vercel.com) | **Pro** | ~$20 / month | Hosting. The free Hobby plan doesn't allow commercial use. |
| [Neon](https://neon.tech) (via Vercel) | Free to start | €0 | PostgreSQL database, Frankfurt |
| [Resend](https://resend.com) | Free | €0 (3,000 emails/month, 100/day, 3 domains) | Booking emails. Upgrade (Pro, no daily limit) when you pass 100/day. |
| [Cloudinary](https://cloudinary.com) | Free | €0 | Shop photos |
| [GitHub](https://github.com) | Free | €0 | Code + automatic tests |

Pricing and limits change; check each site when you sign up.

---

## 1. Buy the platform domain

1. Buy `yourdomain.com` at any registrar (Namecheap, Cloudflare, nic.at…).
2. Don't set up any DNS records yet. You'll add exactly what Vercel and Resend ask for.
3. Decide the platform's display name (e.g. "Nextchair"). It goes into
   `NEXT_PUBLIC_PLATFORM_NAME` in step 5. No code change is needed.

---

## 2. Create the Vercel project

1. Sign up at Vercel with your GitHub account and **upgrade the team to Pro**.
2. **Add New → Project →** import `naijanawaya-collab/appointments`.
3. Framework is detected as **Next.js**. Leave the build settings alone: `vercel.json`
   already sets the install command, `pnpm vercel-build` (runs database migrations,
   then builds) and the Frankfurt region (`fra1`).
4. **Don't deploy yet**: click through, or let the first deploy fail. It needs
   the database and settings from the next steps. A failed first deploy is harmless.

---

## 3. Database: Neon (through Vercel)

1. In the Vercel project: **Storage → Create Database → Neon** (Marketplace).
2. Region: **Frankfurt (eu-central-1)**.
3. Connect it to the project for **Production** and **Preview**.
4. **Enable "create a database branch for each Preview deployment"** if offered.
   This matters: every deploy runs migrations against its `DATABASE_URL`. With
   branching, test deployments get their own copy and never touch the live data.
   *Without* branching, set Preview's `DATABASE_URL` to a separate Neon branch by hand.
5. The integration adds `DATABASE_URL` (pooled) and `DATABASE_URL_UNPOOLED`
   (direct, used for migrations) automatically. Check under **Settings →
   Environment Variables**.

---

## 4. Email: Resend

1. Sign up at Resend. **Domains → Add Domain →** `mail.yourdomain.com`, region **EU (Ireland)**.
   Using a subdomain keeps your main domain's email reputation separate.
2. Resend shows DNS records (an MX and a TXT record for the sending subdomain, and a
   TXT record for DKIM). Add **exactly those** at your registrar.
   Recommended extra: a DMARC record, `TXT _dmarc.mail.yourdomain.com` →
   `v=DMARC1; p=none; rua=mailto:you@yourdomain.com`.
3. Click **Verify** in Resend (it can take a few minutes).
4. **API Keys → Create API Key**, permission **Sending access**, for that domain. Copy it
   (it's shown once) → `RESEND_API_KEY`.
5. Your sender becomes `EMAIL_FROM="Bookings <bookings@mail.yourdomain.com>"`.
   Booking emails show the **shop's name** as sender, and replies go to the shop's own
   email address (set in each shop's Settings).

---

## 5. Photos: Cloudinary

1. Sign up at Cloudinary (free plan).
2. **Settings → API Keys**: copy the **Cloud name**, **API Key** and **API Secret**.
3. Nothing else to configure: uploads are signed by the app and stored per shop in
   `tenants/<shop-id>/`. Leave "strict transformations" **off** (the app requests
   resized versions on the fly).

---

## 6. Environment variables (Vercel)

**Vercel → Settings → Environment Variables.** Add for **Production** (and Preview
where noted). The app checks these when it starts and refuses to boot with a clear
message if a required one is missing or weak.

| Name | Value | Env |
| --- | --- | --- |
| `DATABASE_URL`, `DATABASE_URL_UNPOOLED` | set by the Neon integration | both |
| `BETTER_AUTH_SECRET` | `openssl rand -base64 32` (or any 32+ random characters) | both (different values) |
| `MANAGE_TOKEN_SECRET` | another random 32+ characters. **Never change it later**: it signs the "manage my booking" links already in customers' inboxes. | Production |
| `BETTER_AUTH_URL` | `https://app.yourdomain.com` | Production |
| `NEXT_PUBLIC_PLATFORM_URL` | `https://yourdomain.com` | Production |
| `NEXT_PUBLIC_PLATFORM_NAME` | your brand name | both |
| `PLATFORM_HOSTS` | `yourdomain.com,www.yourdomain.com,app.yourdomain.com` | Production |
| `PLATFORM_ADMIN_EMAILS` | `you@yourdomain.com` (the operator; comma-separate several) | both |
| `NEXT_PUBLIC_CONTACT_EMAIL` | where "Open your storefront" requests go | both |
| `PLATFORM_OPERATOR_NAME` | your legal name or company (for the Impressum) | Production |
| `PLATFORM_OPERATOR_ADDRESS` | your postal address (for the Impressum) | Production |
| `RESEND_API_KEY` | from step 4 | Production |
| `EMAIL_FROM` | `"Bookings <bookings@mail.yourdomain.com>"` | Production |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | from step 5 | both |
| `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | from step 5 | both |
| `VERCEL_TOKEN`, `VERCEL_PROJECT_ID`, `VERCEL_TEAM_ID` | see step 9 (optional, recommended) | Production |

For **Preview** deployments (test URLs ending in `.vercel.app`), set
`BETTER_AUTH_URL` and `NEXT_PUBLIC_PLATFORM_URL` to your preview URL if you sign in
there, and `EMAIL_DRIVER=console` so test deploys never email real customers.

Then **Deployments → Redeploy**. The build log shows `migrations applied
successfully` followed by the Next.js build.

---

## 7. Connect the platform domain

1. **Vercel → Settings → Domains → Add**: `yourdomain.com`, then `www.yourdomain.com`
   (choose "redirect to yourdomain.com"), then `app.yourdomain.com`.
2. Vercel shows the DNS records for each. Add **exactly those** at your registrar
   (usually an A record for the bare domain and CNAME records for `www` and `app`).
3. Wait for the green "Valid configuration" checks. HTTPS certificates are automatic.
4. Open `https://yourdomain.com`: you should see the landing page.
   `https://yourdomain.com/login` redirects to `https://app.yourdomain.com/login`
   (one place to sign in).
5. Health check: `https://yourdomain.com/api/health` → `{"ok":true}`. Optional but
   recommended: add it to a free uptime monitor (Better Stack, UptimeRobot).

---

## 8. Create your operator account and the demo shops

Do this once, from your computer (the repo cloned, `pnpm install` done):

```bash
# Use the UNPOOLED Neon connection string (Vercel → Storage → Neon → .env tab)
DATABASE_URL="postgresql://…(unpooled)…" \
NEXT_PUBLIC_PLATFORM_URL="https://yourdomain.com" \
SEED_ADMIN_EMAIL="you@yourdomain.com" \
SEED_ADMIN_PASSWORD="a-long-password-you-keep-in-a-password-manager" \
pnpm db:seed:prod
```

- Creates your sign-in (it must be one of `PLATFORM_ADMIN_EMAILS` to get the operator
  console) and the three demo shops (Kaiser & Co., FADE/LAB, Lune).
- Safe to run again: existing users and shops are left untouched.
- Admin only, no demo shops: add `SEED_DEMO=0`.
- Later, to take a demo shop down: **All shops… → Take offline**. Its pages
  return 404 and it disappears from the sitemap. The landing page's example phones link
  to the demos, so update `src/app/page.tsx` when you remove them.

Sign in at `https://app.yourdomain.com/login`. You land in a shop's dashboard, and
**All shops…** in the shop switcher opens the operator console (`/admin/shops`).

---

## 9. (Recommended) Automatic custom domains

With a Vercel API token, a shop owner adding a domain in the admin also adds it to
Vercel and sees live DNS status ("Pending DNS" → "Live").

1. Vercel → **Account Settings → Tokens → Create**, scope: your team, no expiry or a
   long one. → `VERCEL_TOKEN`.
2. Project → **Settings → General**: copy **Project ID** → `VERCEL_PROJECT_ID`.
3. Team → **Settings → General**: copy **Team ID** → `VERCEL_TEAM_ID`.
4. Add the three variables (Production) and redeploy.

Without them everything still works: you add each shop domain in Vercel → Domains
yourself, and the admin shows the owner which DNS records to set.

---

## 10. Set up your brother's shop

1. **All shops… → Create shop**:
   - Shop name: *Mba Cutz Hair Studio*
   - Address on the platform: `mbacutz`, giving `https://yourdomain.com/mbacutz`
   - Preset: pick one (it can be changed any time in the editor)
   - Owner: your brother's name and email
2. He receives an **invite email** (valid 24 h) to set his password. If it doesn't
   arrive, the console shows the invite link to copy and send him directly.
3. In the admin (he or you; operators can act for any shop):
   - **Settings**: address (the map pin is found automatically), phone, the shop's email
     (receives booking notifications and customer replies), tagline, about text,
     Instagram/TikTok/WhatsApp, cancellation window, booking rules, legal notice
     (Impressum details).
   - **Opening hours**: weekly hours and holidays/closures.
   - **Team**: each barber, photo, which services they do, their working hours.
   - **Services**: categories, services, durations, prices, optional photos.
   - **Storefront**: the editor. Preset → colours → font → logo → hero → sections →
     content (photos, announcement) → **Publish**. Visitors only see changes after Publish.
4. Make a test booking at `https://yourdomain.com/mbacutz` and cancel it from the email.

---

## 11. Move mbacutzhairstudio.com to the new storefront

His domain currently points at his old booking site. Switch it over when step 10 is
done and tested.

1. **Admin → Domain** (in his shop): add `mbacutzhairstudio.com`. Both the bare domain
   and `www` are handled. Without the Vercel token, also add both in Vercel → Domains.
2. The page shows the DNS records to set. At his domain registrar:
   - **Change only the website records**: the A record for `@` and the CNAME (or A)
     for `www`. Delete the old ones that point at the old booking site, then add the
     ones the admin shows.
   - **Do not touch MX, and leave existing TXT records for SPF/DKIM/verification as they
     are.** Those carry his email; changing them breaks his inbox.
   - If the domain uses another provider's nameservers (e.g. the old site builder
     manages DNS), make the changes in that provider's DNS panel. Don't move
     nameservers unless you're sure email is recreated there too.
3. Wait until the admin shows **Live** (often minutes, up to 48 h for old TTLs).
   HTTPS is issued automatically.
4. Set it as **primary**. Links in emails and search engines then use his domain, and
   `yourdomain.com/mbacutz` keeps working too.
5. Check `https://mbacutzhairstudio.com` and `https://www.mbacutzhairstudio.com`, make
   one more test booking, then switch off the old booking system.

---

## 12. Go-live checklist

- [ ] Landing, Impressum (`/impressum`) and privacy (`/privacy`) show your details. The
      Impressum warns if any are missing. Have the privacy text checked; it's a
      starting point, not legal advice.
- [ ] Your brother's shop **Settings → legal notice** is filled in (his storefront's
      Impressum).
- [ ] Booking email arrives (check Gmail **and** Outlook, including the spam folder),
      sender shows the shop name, "Manage or cancel" works, "Add to calendar" works.
- [ ] Owner gets the new-booking email at the shop email.
- [ ] Phone test: book on iPhone Safari and Android Chrome on his real domain.
- [ ] `https://yourdomain.com/api/health` is monitored.
- [ ] GitHub → Actions: the latest run on `main` is green (lint, types, unit, component,
      integration, end-to-end, Lighthouse).

---

## 13. Day-to-day operations

- **Deploying**: push to `main`. GitHub Actions runs every test layer; Vercel builds
  and deploys, running new database migrations first. A failed migration fails the
  deploy, and the previous version stays live.
- **Database backups**: Neon keeps point-in-time restore history (the length depends
  on the plan). Before risky changes, create a branch in Neon as a snapshot.
- **Logs and errors**: Vercel → Logs. Server errors are logged as one JSON line with
  `"event":"request_error"`; filter by it.
- **Never rotate `MANAGE_TOKEN_SECRET`**. Rotating `BETTER_AUTH_SECRET` signs everyone
  out, which is fine if needed.
- **Limits to know**: the per-IP booking rate limit is kept per server instance
  (move to Upstash Redis when traffic grows); Resend free allows 100 emails/day.

---

## 14. Local development (reference)

```bash
pnpm install
cp .env.example .env.local        # set BETTER_AUTH_SECRET
pnpm db:setup                     # Docker Postgres + migrations + demo data
pnpm dev                          # http://localhost:3000 · admin@example.com / change-me-please
```

Custom domains locally: `http://kaiser.localhost:3000` behaves like a shop's own
domain. Photo uploads need the Cloudinary variables in `.env.local`.
Tests: `pnpm test` (fast), `pnpm test:integration`, `pnpm test:e2e`, `pnpm test:all`.

---

## 15. Troubleshooting

| Symptom | Fix |
| --- | --- |
| Deploy fails with "Missing or invalid environment variables" | The message lists exactly which; add them in Vercel and redeploy. |
| Deploy fails during `drizzle-kit migrate` | `DATABASE_URL_UNPOOLED` missing or wrong; reconnect the Neon integration. |
| Emails not sent | Resend domain not verified yet, or `EMAIL_FROM` isn't on that domain. Vercel logs show `[email]` errors. |
| "Photo uploads aren't set up yet" | Cloudinary variables missing; add them and redeploy. |
| Shop domain shows a 404 page | Domain not added for that shop in **Admin → Domain**, or added in Vercel only. |
| Shop domain shows "Invalid configuration" in Vercel | DNS records not changed yet or still propagating; compare with the records shown. |
| Signed in on one address, signed out on another | Expected: sign-in lives on `app.yourdomain.com` only. |
| `/admin/shops` is a 404 | Your email isn't in `PLATFORM_ADMIN_EMAILS` (exact match, redeploy after changing). |
