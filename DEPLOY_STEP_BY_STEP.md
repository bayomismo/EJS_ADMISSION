# EJS — Step-by-step Vercel deploy (the only guide you need)

This walks through a clean deploy from scratch. Read it top-to-bottom.

---

## 0. Prereqs (one-time)

- Node.js 20+ (`node --version`)
- A Vercel account with a project linked to the GitHub repo `bayomismo/EJS_ADMISSION`
- A Neon Postgres database
- Optional: Vercel CLI (`npm install -g vercel`) for diagnostics

---

## 1. Make sure your local is in sync with GitHub

```powershell
cd C:\Users\ihab.bayomi\ejs-admission
git remote set-url origin https://github.com/bayomismo/EJS_ADMISSION.git
git fetch origin
git reset --hard origin/main
git log --oneline -3
```

The last line should show the 3 most recent commits including `Strip baseline cruft`.

---

## 2. Set up `.env` locally (for the seed step)

```powershell
Copy-Item .env.example .env
notepad .env
```

You only need to fill `DATABASE_URL` for the seed. Use the **direct** Neon URL (NOT the pooler):

```
DATABASE_URL="postgresql://neondb_owner:YOUR_PASSWORD@ep-shiny-wind-abrudza1.eu-west-2.aws.neon.tech/neondb?sslmode=require"
```

URL-encode any special characters in the password. Save and close.

---

## 3. Install + push schema + seed

```powershell
npm install
$env:DATABASE_URL = 'postgresql://neondb_owner:YOUR_PASSWORD@ep-shiny-wind-abrudza1.eu-west-2.aws.neon.tech/neondb?sslmode=require'

# Push schema (idempotent, only creates what doesn't exist)
npx prisma db push --skip-generate

# Seed: roles, users, schools, governorates, settings, terms pages, logo URL
$env:ALLOW_PROD_SEED = "1"
$env:NODE_ENV = "production"
npx tsx prisma/seed.ts
```

**Capture the 4 user passwords from the output**. They won't be shown again.

If the seed hangs or returns auth errors, the URL is wrong — go back to step 2.

---

## 4. Reset the super-admin password to a known value

```powershell
npx tsx reset-admin.ts "EjsLogin2026"
```

Expected output:
```
OK: admin password reset.
   email:    admin@ejs.gov.eg
   password: EjsLogin2026
   active:   True
```

(Use any ASCII-only password you prefer. No special chars to avoid URL issues.)

---

## 5. Vercel project setup

If the Vercel project isn't created yet:

1. <https://vercel.com/new> → Import `bayomismo/EJS_ADMISSION`
2. Framework: **Next.js** (auto-detected)
3. Production branch: **main**

In **Settings → Environment Variables**, add (all for **Production**):

| Name | Value |
|---|---|
| `DATABASE_URL` | The **pooled** Neon URL (the one with `-pooler.…` in the hostname) |
| `NEXTAUTH_SECRET` | 64 hex chars — `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `NEXTAUTH_URL` | `https://ejs-admission.vercel.app` (must match your production domain exactly) |
| `CRON_SECRET` | 64 hex chars, different from above |

> **The single most common cause of login failing:** `NEXTAUTH_URL` doesn't match the URL you actually use. If you visit `https://ejs-admission.vercel.app/` but the env var says `https://ejs-admission-abc.vercel.app/`, login won't work.

> **Special characters in passwords:** if the Neon password has `@`, `#`, `$`, `&`, `?`, `+`, `/` etc., they must be URL-encoded as `%40`, `%23`, etc. Or reset the password to one with only letters and digits.

---

## 6. Enable Vercel Blob (for media uploads)

Vercel dashboard → **Storage** → **Create Database** → **Blob** → Connect to your project.

This auto-injects `BLOB_READ_WRITE_TOKEN` into the env. After this, push a no-op commit (or run any deploy) to make Vercel pick up the new env.

---

## 7. Deploy

Either:
- **Auto-deploy:** push to `main` and Vercel deploys automatically.
- **Manual via Vercel CLI:**
  ```powershell
  vercel login
  vercel link
  vercel deploy --prod
  ```

The build takes ~1-2 minutes. Watch the build log in the Vercel dashboard.

---

## 8. Verify the deploy

Open the **production URL** (the one matching `NEXTAUTH_URL`): `https://ejs-admission.vercel.app/`

In a fresh tab (close other tabs to clear cookies):
- **Home page:** should show the real MOE + EJS logos, Arabic hero, countdown, school cards
- **`/apply`:** should show the terms page (the terms text from the seed). If you see "فشل تحميل الشروط", the terms pages aren't in the DB — re-run step 3
- **`/admin/login`:** log in with `admin@ejs.gov.eg` / `EjsLogin2026`

If login fails:
1. Vercel → **Logs** → search for `[auth]` and `[auth-resp]`
2. You'll see one of:
   - `login OK: admin@ejs.gov.eg` + `set-cookie: next-auth.session-token` → cookie is being set, but the browser is rejecting it (check Application tab in DevTools)
   - `no user for email=...` → admin user isn't in the DB (re-run seed)
   - `bad password for admin@ejs.gov.eg` → wrong password (re-run reset-admin.ts)
   - No `[auth-resp]` line at all → the request didn't reach the auth callback (probably a middleware block or NEXTAUTH_URL mismatch)

---

## 9. Run the daily retention cron

Already configured in `vercel.json`:
```json
"crons": [{ "path": "/api/cron/retention", "schedule": "0 3 * * *" }]
```

Vercel auto-sends `Authorization: Bearer $CRON_SECRET` on each invocation. **Requires Vercel Pro.** On free tier, manually trigger:
```powershell
curl -H "Authorization: Bearer $CRON_SECRET" https://ejs-admission.vercel.app/api/cron/retention
```

---

## 10. What to do if something breaks

| Symptom | Fix |
|---|---|
| Build fails on `/_not-found` | Should be fixed. If it recurs, the build is using a cached prisma client. Run `npx prisma generate` then rebuild. |
| Login "nothing happens" (no error) | Cookie not being set. Check Vercel logs for `[auth-resp]`. Make sure `NEXTAUTH_URL` matches your URL exactly. |
| Login "بيانات الدخول غير صحيحة" | Wrong password. Re-run `npx tsx reset-admin.ts "NewPassword"` and try again. |
| Terms "فشل تحميل الشروط" | The `student-terms` and `teacher-terms` pages aren't in the DB. Re-run the seed (step 3). |
| Logo is a fake | `branding.logoUrl` in the DB is empty. Re-run the seed (step 3). |
| 500 on any page | Check Vercel logs. Common cause: DATABASE_URL points to the pooler for a write operation; switch to the direct URL or use the pooler (with `?pgbouncer=true&connection_limit=1`) for everything. |

---

## What you should have on Vercel after this

- ✅ Real MOE + EJS logos in the header
- ✅ Terms pages load on `/apply` and `/apply/teacher`
- ✅ Login works with `admin@ejs.gov.eg` / `EjsLogin2026`
- ✅ Real DB (Neon) with all seeded data
- ✅ Daily retention cron
- ✅ Vercel Blob for media uploads
- ✅ CSP, HSTS, and security headers from `vercel.json` + Caddyfile (Caddyfile is for self-hosted fallback; Vercel handles the actual TLS)
