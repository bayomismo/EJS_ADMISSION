# Deploying EJS to Vercel + Neon

This document walks through a first-time deploy. After the initial setup, subsequent deploys are automatic on every push to `main`.

---

## 0. Prereqs

- Vercel account (free tier is enough for preview; **Pro** required for cron jobs)
- Neon account (free tier works)
- GitHub repo: `bayomismo/EJS_ADMISSION`
- Node 20+ for local CLI work

---

## 1. Create the Neon database

1. Go to <https://console.neon.tech>
2. New project → name: `ejs-prod` → region: **Frankfurt** (fra1) to match Vercel's edge region
3. Copy the **pooled connection string** (ends in `-pooler...`) — this is what Vercel uses
4. Copy the **direct connection string** too (for one-time migrations from your machine)

---

## 2. Push the schema to Neon (one-time, from your machine)

```bash
git clone https://github.com/bayomismo/EJS_ADMISSION.git
cd EJS_ADMISSION
npm install
# paste the direct Neon URL
export DATABASE_URL='postgresql://...@...neon.tech/ejs?sslmode=require'
npm run db:push:prod    # this creates all the tables
```

For subsequent schema changes, prefer `prisma migrate dev` locally, commit the migration files, then `prisma migrate deploy` in prod (or use Neon's branching workflow).

---

## 3. Seed the production database (one-time)

The seed script prints credentials ONCE — copy them to a password manager immediately.

```bash
export ALLOW_PROD_SEED=1
export NODE_ENV=production
npx tsx prisma/seed.ts
```

Default super-admin: `admin@ejs.gov.eg` with a freshly generated password. **You must log in and change it on first visit.**

---

## 4. Create the Vercel project

1. Go to <https://vercel.com/new>
2. Import `bayomismo/EJS_ADMISSION` from GitHub
3. Framework: **Next.js** (auto-detected)
4. **Build & Development Settings** — defaults are fine, but verify:
   - Build command: `prisma generate && next build`
   - Install command: `npm install --no-audit --no-fund`
5. **Environment Variables** — add the following (use the Neon **pooled** URL for `DATABASE_URL`):

   | Name | Value | Notes |
   |---|---|---|
   | `DATABASE_URL` | `postgresql://...?sslmode=require&pgbouncer=true&connect_timeout=10` | Neon pooled URL |
   | `NEXTAUTH_SECRET` | `openssl rand -hex 32` | 64 hex chars |
   | `NEXTAUTH_URL` | `https://ejs-admission.vercel.app` (or your custom domain) | **Must match** the deployed URL exactly, including https |
   | `CRON_SECRET` | `openssl rand -hex 32` | 64 hex chars, used by Vercel Cron |

6. Click **Deploy**

---

## 5. Enable Vercel Blob (for media uploads)

1. In the Vercel project → **Storage** → **Create Database** → **Blob**
2. Connect to the project. This auto-injects `BLOB_READ_WRITE_TOKEN` into the env.
3. Redeploy (or push a commit) — uploads now go to Vercel Blob.

---

## 6. (Optional) Custom domain

1. Vercel project → **Settings** → **Domains**
2. Add `ejs.moe.gov.eg` (or your domain)
3. Update `NEXTAUTH_URL` env var to the custom domain
4. Update `NEXTAUTH_URL` in the code reference (the **URL only** — the env var is what matters at runtime, not what's in the code)

---

## 7. Vercel Cron

Already configured in `vercel.json`:

```json
{ "crons": [{ "path": "/api/cron/retention", "schedule": "0 3 * * *" }] }
```

- Vercel auto-sends `Authorization: Bearer <CRON_SECRET>` on each invocation
- The handler in `src/app/api/cron/retention/route.ts` purges VerificationCode (>30d) and AuditLog (>2y)
- **Cron requires Vercel Pro** (or you can use an external cron like <https://cron-job.org> hitting the endpoint manually)

Verify after deploy:
```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://ejs-admission.vercel.app/api/cron/retention
```

---

## 8. Local dev against Neon

```bash
# .env.local
DATABASE_URL=postgresql://...@...neon.tech/ejs?sslmode=require
NEXTAUTH_SECRET=dev-secret-doesnt-matter
NEXTAUTH_URL=http://localhost:3000
# leave BLOB_READ_WRITE_TOKEN empty for local-fs uploads
```

```bash
npm run dev
```

---

## 9. Rollback

Vercel keeps every deploy. To roll back:
- Vercel project → **Deployments** → select a previous green build → **Promote to Production**

---

## 10. What's different from the self-hosted bundle

| | Self-hosted (Linux/Caddy) | Vercel + Neon |
|---|---|---|
| DB | SQLite or local Postgres | Neon Postgres |
| File uploads | Local fs (`var/ejs-uploads/`) | Vercel Blob |
| Cron | systemd timer | Vercel Cron (or external) |
| Rate limiter | In-process (token bucket) | **Same** — but desyncs across lambda instances. To fix: swap in Upstash Redis (interface is already abstracted in `src/lib/rate-limit.ts`) |
| Standalone output | `node server.js` | Serverless functions (output:standalone is ignored) |
| TLS / headers | Caddy | Vercel edge + vercel.json headers |
| Retention | `npm run db:retention` | `/api/cron/retention` (daily 03:00) |

The `ejs-app.tar.gz` bundle (for self-hosting) and the GitHub repo (for Vercel) ship the same code with the same data model. Same `prisma/schema.prisma`, same `src/`, same RBAC, same security headers. Only the runtime differs.

---

## 11. Production smoke checklist (Vercel)

After the first deploy, walk through:

- [ ] `curl -fsS https://YOUR_DOMAIN/ | head` — page renders
- [ ] `curl -fsS https://YOUR_DOMAIN/sitemap.xml | head` — sitemap
- [ ] `curl -fsS https://YOUR_DOMAIN/robots.txt` — robots
- [ ] Visit `/admin/login` — login form renders
- [ ] Log in with the seeded super-admin; you should be redirected to `/admin`
- [ ] Change the password on first login (enforced by `mustChangePassword`)
- [ ] Visit `/apply` — student form, including the ID-reference image
- [ ] Upload a test image to the admin media library
- [ ] Verify the image is on Vercel Blob (Vercel dashboard → Storage → Blob)
- [ ] Test the cron manually:
  ```bash
  curl -H "Authorization: Bearer $CRON_SECRET" https://YOUR_DOMAIN/api/cron/retention
  ```