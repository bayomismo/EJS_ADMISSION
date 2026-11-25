# EJS Admission — W1 Windows Compatibility Test Plan & Revised Project Estimate

**Date:** 25 November 2026 · **Branch:** `claude-enhancement` · **Status:** Plan only, awaiting Product Owner approval. **No W1 execution has taken place. No Windows compatibility is claimed.**

---

## Part 1 — W1 Compatibility Test Plan

### 1.1 Objective
Prove, on a real Windows Server VM, that these components work **together**:
- Node.js 24 LTS
- PostgreSQL 18
- Prisma 6.19.3
- The Next.js application
- Caddy
- WinSW

Find any blocker **before** building the installer. **Windows Server 2022 is a provisional test baseline only**, not an approved production requirement.

### 1.2 Scope
- **In:** building on Windows; running the current `claude-enhancement` code as Windows services behind HTTPS; database connectivity with least-privilege roles; reboot and restart behaviour; and testing a **new, minimal Caddy configuration** (the existing repository `Caddyfile` is also checked, expecting failure).
- **Out:** security fixes B1–B18, the installer (W7), the full backup tooling (W6), and real domain/certificate setup.

### 1.3 Prerequisites

| # | Prerequisite | Owner |
|---|---|---|
| P-1 | **Windows Server 2022 Standard/Datacenter, 64-bit, Desktop Experience** VM, freshly installed, fully patched, **snapshot taken before W1** | EJS IT (or a project-provided isolated VM if EJS agrees) |
| P-2 | Local Administrator account for the tester | EJS IT |
| P-3 | Minimum 4 vCPU, 8 GB RAM, 60 GB free disk *(proposed test size, not a production sizing)* | EJS IT |
| P-4 | Internet access from the VM for downloads, **or** an offline media bundle prepared in advance | EJS IT / project |
| P-5 | **No real applicant data on the VM.** Synthetic data only | Project |
| P-6 | Pinned artifacts, each with a SHA-256 recorded at download: Node.js **v24.22.3** win-x64 zip · PostgreSQL **18.7** official EDB Windows x64 installer · Caddy **v2.11.9** windows_amd64 · WinSW **2.x** (candidate v2.14.1, .NET Framework build) · Git for Windows (test machine only, to fetch the branch) | Project |
| P-7 | A test hostname (e.g. `ejs-w1.test`, resolved via the VM `hosts` file) and a **test certificate** (Caddy internal CA or a self-signed certificate). **No production domain or certificate** | Project |
| P-8 | **B16 decision.** If approved first, W1 tests the target Next/NextAuth versions. If not, W1 tests the current versions and runs a short re-test (W1-R) after B16 | Product Owner |
| P-9 | Read access to the private repository from the VM (deploy key or one-time copy of the branch) | Product Owner |

### 1.4 Preparation artifacts (to be created only after this plan is approved)
- `deploy/w1/Caddyfile.w1`: minimal config with a reverse proxy to `127.0.0.1:3000`, TLS with the test certificate, HTTP→HTTPS redirect, a request body limit, timeouts, and security headers.
- `deploy/w1/EJS-App.xml`, `deploy/w1/EJS-Proxy.xml`: WinSW service definitions (virtual accounts, restart on failure, rolling logs under `C:\ProgramData\EJS Admission\logs`).
- `deploy/w1/Invoke-W1.ps1`: runs the test cases in order, writes PASS/FAIL per case plus versions to a report file, and never prints secrets.
- `deploy/w1/w1-db-roles.sql`: creates `ejs_owner`, `ejs_app` and `ejs_backup` (passwords supplied at run time, never stored in the file).
- Playwright option to target an already-running server via a base URL (test configuration only).

### 1.5 Test cases and pass/fail criteria

| ID | Test | Pass criterion | Fail → action |
|---|---|---|---|
| **W1-01** | Record the OS baseline: edition, build, .NET Framework release key, PowerShell version | Server 2022, 64-bit, .NET Framework ≥ 4.6.2, PowerShell 5.1 present | Stop. The VM is not the agreed baseline |
| **W1-02** | Install Node.js v24.22.3 (portable zip) | `node -v` = v24.22.3; `npm -v` runs | Record the error; try Node 22 fallback (decision) |
| **W1-03** | `npm ci` on Windows | Exit 0; `package-lock.json` unchanged; Windows native packages present | Record the failing package |
| **W1-04** | `npx prisma generate` | Exit 0; Windows engine present | Blocker: Prisma on Windows |
| **W1-05** | `npm run build` | Exit 0 | Record the error |
| **W1-06** | `npm run test:unit` on Node 24 / Windows | **Same result as the Linux baseline:** 84 tests, 77 pass, the same 7 known failures (B8/T3.3) | Any other difference = compatibility defect |
| **W1-07** | `tsc --noEmit` and `lint` | Same counts as the baseline (61 / 15 errors and 3 warnings) | Record differences |
| **W1-08** | Unattended PostgreSQL 18.7 install (official installer); superuser password typed by the tester, passed through a protected option file, deleted afterwards | Service installed, **automatic start**, running; `listen_addresses` = localhost; `scram-sha-256`; installer log saved; **no password in any log** | Record installer errors; PostgreSQL 17.12 fallback (decision) |
| **W1-09** | Create the database and the roles `ejs_owner` / `ejs_app` / `ejs_backup` | `ejs_app` **cannot** `CREATE TABLE` (expected error); `ejs_app` is not a superuser | Fix the role script |
| **W1-10** | Apply the schema to the **test** database: SQL generated by `prisma migrate diff --from-empty --to-schema-datamodel`, applied as `ejs_owner` (test only; T4.1 will create the real baseline migration) | Applied without error; default privileges give `ejs_app` read/write on all tables | Blocker: Prisma 6 + PG 18. Try PG 17 (decision) |
| **W1-11** | Data smoke test with `ejs_app`: create synthetic reference data and one synthetic student application through the public form/API | Application stored; reference number returned; readable in the admin list | Record the error |
| **W1-12** | Run the app as Windows service `EJS-App` (WinSW), with a virtual account `NT SERVICE\EJS-App`, `NODE_ENV=production`, bound to `127.0.0.1:3000` | Service running; port 3000 listening on **loopback only**; logs written under `ProgramData` | Try the Shawl fallback (decision) |
| **W1-13** | Service account least privilege | The service account **cannot** write to the app folder under `Program Files`; **can** write to its logs and uploads folders | Fix ACLs |
| **W1-14** | Crash recovery: `taskkill /F` on the app's node process | Service restarts automatically within **60 s** | Fix the WinSW restart policy |
| **W1-15** | `caddy validate` on the **existing repository `Caddyfile`** | **Expected to FAIL** (non-standard directives). The result is recorded as evidence, and the file is not used | If it passes unexpectedly, record that and review the file |
| **W1-16** | `caddy validate` + run `Caddyfile.w1` as service `EJS-Proxy` (WinSW) | Validation passes; service running; listening on 443 (and 80 for the redirect) | Fix the config |
| **W1-17** | HTTPS behaviour through Caddy | `https://ejs-w1.test/` and `/admin/login` return 200; HTTP returns 301/308 to HTTPS; security headers present; a request above the body limit returns 413; **a client-supplied `X-Forwarded-For` is not trusted** (the app sees the proxy-provided client IP only) | Fix the config |
| **W1-18** | Admin login over HTTPS: a synthetic test admin created at test time (password generated and kept only in the tester's session, never written to the repository or logs) | Login succeeds; session cookie is `Secure` + `HttpOnly`; logout works | Record NEXTAUTH or cookie issues |
| **W1-19** | Arabic/RTL and paths with spaces: public pages render RTL Arabic; media upload stored under `C:\ProgramData\EJS Admission\uploads` | Correct rendering; file stored and served | Fix the path handling |
| **W1-20** | E2E TS-06f against the running HTTPS service | 3/3 pass | Record the failure |
| **W1-21** | **Reboot test:** restart the VM | PostgreSQL, EJS-App and EJS-Proxy all start automatically; login page reachable over HTTPS within **5 minutes** of boot | Fix the service start order or dependencies |
| **W1-22** | Native backup tooling smoke test: `pg_dump -Fc` as `ejs_backup`, then `pg_restore` into a new database | Row counts identical; the app can point at the restored database and serve the login page | Record the error (full W6 comes later) |
| **W1-23** | Secrets hygiene: search all W1 logs and transcripts for the generated passwords | **Zero matches** | Fix the leaking step |

**W1 overall result:**
- **PASS:** every case W1-01..W1-23 passes. W1-15 passes when it shows the expected failure.
- **CONDITIONAL:** a fallback (Node 22, PostgreSQL 17, Shawl) was needed. A Product Owner decision follows.
- **FAIL:** any blocker without a fallback.

**Evidence:** the W1 report file (versions, SHA-256 of artifacts, PASS/FAIL per case, timings), the installer and service logs (checked free of secrets), and the VM snapshot name.

**Restore point:** the VM snapshot is reverted after W1 if requested. Nothing on W1 is production.

### 1.6 W1 estimate
- **8–12 engineering hours** (+2 h for W1-R if B16 is applied afterwards).
- **Not included:** VM provisioning time by EJS IT.

---

## Part 2 — Revised Total Estimate and Schedule

> All numbers are engineering-hour **estimates**. They exclude waiting time for EJS decisions, the VM, domain and certificate.

### 2.1 Remaining security work (approved plan, adjusted for Windows)

| Item | Hours |
|---|---|
| Approved plan total | 102–113 |
| Already done (T1.1, T1.2, T1.3, T1.4, T1.5) | −9 |
| Neon/Vercel-specific tasks moved to the Windows track (T6.1–T6.4 staging, backup and restore drill on Neon) | −9 |
| **Remaining security work** (T1.6 B16 if approved, T2–T5, MF-1..4, T7 UAT preparation; D6 now means *disable* the teacher path) | **≈ 84–95** |
| Account provisioning beyond what the plan already covered (bootstrap, recovery, Release 1 matrix, last-admin guard, disable-not-delete, specific audit events, open-redirect fix, extra tests) | **+13–21** |
| **Security + accounts subtotal** | **≈ 97–116** |

### 2.2 Windows deployment work

| Batch | Hours |
|---|---|
| W1 Compatibility (this plan) | 8–12 |
| W2 On-prem readiness (excluding T4.1, counted above) | 9–13 |
| W4 Database provisioning scripts | 14–18 |
| W5 Services and proxy | 12–16 |
| W6 Backup, restore, upgrade, rollback, diagnostics | 14–18 |
| W7 Installer orchestration and documentation | 16–22 |
| W8 Clean-VM acceptance (install → reboot → login → workflow → backup → restore) | 8–12 |
| **Windows subtotal** | **≈ 81–111** |

*(W3 accounts is counted in 2.1.)*

### 2.3 Total

| | Hours |
|---|---|
| Security + accounts | 97–116 |
| Windows deployment | 81–111 |
| **Total** | **≈ 178–227** |
| With 20% contingency | ≈ 214–272 |

### 2.4 Schedule (working days, after approvals)

| Staffing | Effort days | Realistic duration |
|---|---|---|
| **2 engineers** (~20 productive h/day) | 9–12 | **≈ 3 weeks (11–14 working days)** including contingency |
| 1 engineer (~10 h/day) | 18–23 | **≈ 5 weeks (22–27 working days)** including contingency |

**Proposed sequence (2 engineers, parallel tracks):**

| Week | Engineer A — security & accounts | Engineer B — Windows |
|---|---|---|
| 1 | T1.6 (if approved), T2.x scope and authorization, T3.x public flows and eligibility | **W1** (as soon as the VM is ready), then W2 |
| 2 | T4.x data integrity, T5.x authentication and sessions (B18/D10) + account provisioning | W4 database provisioning, W5 services and proxy |
| 3 | MF-1..4, test completion, UAT preparation | W6 operations, W7 installer and docs, **W8 clean-VM acceptance**, then UAT with EJS |

### 2.5 Critical dependencies
- **Product Owner:**
  - Approve this plan.
  - R-6 (permission matrix).
  - B16 (before or after W1).
  - The Prisma 6 end-of-support risk.
- **EJS:** D1, D2, D2-b (day 2 of the security track); E-01/E-02 (school list); E-07 (domain); certificate; D5/E-04 (privacy, legal).
- **EJS IT:** Q-1..Q-16, above all **Q-15, the Windows Server 2022 test VM. Without it, W1 and W8 cannot run and no Windows compatibility can be claimed.**
