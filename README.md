# EJS Admission Platform

منصة التقديم للمدارس المصرية اليابانية — الموقع الرسمي والإدارة.

## Stack

- **Next.js 16** (App Router, standalone output) + **React 19** + **TypeScript**
- **Tailwind CSS 4** + **shadcn/ui** (Radix)
- **Prisma** (SQLite by default; swap `DATABASE_URL` for Postgres in production)
- **NextAuth (Auth.js)** — JWT sessions, cookies hardened in prod
- **Zod** for input validation, **rate-limit** in-process (token bucket)
- **Caddy 2** as reverse proxy / TLS terminator / edge security headers

## Local development

```bash
npm install
npx prisma generate
npx prisma db push     # apply schema to db/custom.db
npm run seed           # creates default roles + admin user (prints credentials once)
npm run dev            # http://localhost:3000
```

## Production deployment

1. Provision a host with Docker + Caddy (or run Caddy on the host).
2. `npm ci && npx prisma generate && NEXT_TELEMETRY_DISABLED=1 npx next build`
3. Deploy the `public/` + `.next/static/` + standalone bundle (see `npm run build`).
4. Start Caddy with the provided `Caddyfile` — terminates TLS and adds HSTS / CSP / rate-limit headers.
5. Schedule `npm run db:retention` daily (cron / systemd timer).

### Required environment variables

| Var | Required | Notes |
|---|---|---|
| `NEXTAUTH_URL` | yes | Public origin (e.g. `https://ejs.moe.gov.eg`) |
| `NEXTAUTH_SECRET` | yes | 48-byte CSPRNG. Generate with `openssl rand -hex 32`. Fail-fast in prod if missing. |
| `DATABASE_URL` | yes | Prisma connection string. |
| `NODE_ENV` | yes | `production` |
| `PRISMA_SLOW_QUERY_MS` | no | Defaults to 200. Slow queries go to stderr as one-line JSON. |
| `ALLOW_PROD_SEED` | no | Set to `1` to permit `npm run seed` in production (one-time use). |

## Operational endpoints

| Path | Who | Purpose |
|---|---|---|
| `/` | public | Home (ISR, `revalidatePath` after admin mutations) |
| `/apply` | public | Student admission form (rate-limited at middleware + route) |
| `/apply/teacher` | public | Teacher admission form |
| `/admin` | RBAC | CMS (NextAuth-gated; `mustChangePassword` enforced) |
| `/sitemap.xml` | public | Generated from active schools + published news |
| `/robots.txt` | public | Allows /, disallows `/admin /api /apply/check` |
| `/privacy` `/terms` | public | Static legal copy |

## Security features

- HSTS, CSP, X-Frame-Options DENY, Referrer-Policy, Permissions-Policy (Caddyfile + Next.js headers)
- TLS-only NextAuth cookies with `__Secure-` prefix in production
- Argon2 password hashing, `mustChangePassword` on first login
- RBAC: Role → Permission join + per-route `requirePermission`
- Scope-based filtering for admission managers (schoolIds / governorateIds)
- Token-bucket rate limit on public POSTs (5/IP/h, 30/IP/d, 3/email/d)
- Edge rate-limit on `/api/public/applications/*` (Caddy)
- Audit log for every admin mutation + login / logout (with PII redaction)
- Media upload: magic-byte detection, MIME allowlist, path-traversal-safe resolve
- Out-of-scope rows return 404 (no existence oracle)
- `/api/public/applications/check/[ref]` does NOT accept any PII

## Performance

- ISR (`revalidate = 3600`) on `/about /faq /documents`, 600 on `/announcements`
- `unstable_cache` + `revalidateTag` on settings + tagged reads
- Prisma slow-query log via `db.$on('query')`
- Connection pooling inherited from Prisma; in production point at Postgres

## Cron / scheduled jobs

| Schedule | Command | Purpose |
|---|---|---|
| Daily 03:00 | `npm run db:retention` | Purge VerificationCode (30 d grace) + AuditLog (2 y retention) |

## File layout

```
src/
  app/                  App Router pages + API routes
    api/admin/          RBAC-gated CRUD
    api/public/         Public read APIs (cacheable)
  components/           UI (admin + public shells)
  lib/                  auth, db, rate-limit, redact, schemas, settings, cache, audit
  scripts/              retention.ts (cron-invoked)
prisma/
  schema.prisma         all entities
  seed.ts               default roles + admin
Caddyfile               reverse-proxy + security headers + TLS
```

## Sprint roadmap (post-review)

| Sprint | Status | Highlights |
|---|---|---|
| 1 — Unblock prod | ✅ | Secret rotation, media safety, public rate limit, scope-based RBAC, audit logging |
| 2 — Harden | ✅ | CSP/HSTS, middleware auth gate, PII redaction, session hardening, ID-reference image, schema centralization |
| 3 — Operational maturity | ✅ | `unstable_cache` + `revalidateTag`, ISR, indexes + onDelete rules, slow-query log |
| 4 — Polish + future-proof | ✅ | error/not-found/loading, sitemap+robots, privacy/terms, retention cron, `reactStrictMode` |

## Known limitations / next steps

1. Rate limiter is in-process — replace with Redis when multi-pod is on the table.
2. `User.scope` is JSON-encoded; move to a `SchoolMember` join table for proper audit history.
3. `ignoreBuildErrors: true` — flip to `false` and resolve the residual TS errors (separate sprint).
4. No Sentry / external APM — slow-query log is the only first-party signal today.