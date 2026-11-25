# EJS Admission — Release 1 Permission Matrix (PROPOSAL, awaiting Product Owner approval: R-6)

**Date:** 25 November 2026 · **Branch:** `claude-enhancement` · **Status:** Proposal only. **Nothing is implemented.**

**Basis:** the Product Owner role decisions of 25 Nov 2026 (R-1..R-5, D6, D6-b, D11, D12), recorded in `EJS_T1.3_Decisions_Register_AR.md` §0.

---

## 1. How permissions work today (verified in code)

Access is controlled in three ways today:

1. **Module permission keys** (`module.action`) from `ROLE_PERMISSION_MATRIX` in `src/lib/permissions.ts`, checked by `requirePermission()`. Used by the CMS, schools, users, settings and audit routes.
2. **Role-name checks**, which bypass the permission keys:
   - Student/teacher applications: `requireAdmissionManager(kind)` in `src/lib/guards.ts`.
   - Report pages: the `ALLOWED` lists in `admin/(dashboard)/reports/*/page.tsx`.
   - `api/admin/reports/metrics/*`.
   - The sidebar: `admin-sidebar.tsx:62-64`.
3. **Permissions are frozen in the session token at login.** This is replaced by the approved B18 design: roles and permissions are read from the database on every request (D12).

**Proposed change:** replace every role-name check with explicit permission keys, so the matrix below is the single source of truth:
- `applications.student.view`, `applications.student.update`, `applications.student.export`, `applications.student.delete`
- `applications.teacher.*`
- `reports.student.view`, `reports.teacher.view`

Roles stay hard-coded (no role editor), as agreed.

---

## 2. Proposed Release 1 matrix

✔ = allowed · ✘ = not allowed · **S** = only within the user's assigned school/governorate scope (scope is mandatory for this role, B1)

| Capability | **General Admin** (`super-admin`) | **Student Admissions Manager** | **Teacher Admissions Manager** *(reserved)* | **Content Editor** |
|---|---|---|---|---|
| Sign in, admin dashboard (counts only) | ✔ | ✔ | ✔ | ✔ |
| Change own password | ✔ | ✔ | ✔ | ✔ |
| **Student applications:** view list and details | ✔ (full data) | ✔ **S** (sensitive fields masked, as today) | ✘ | ✘ |
| Student applications: change status / add note | ✔ | ✔ **S** | ✘ | ✘ |
| Student applications: move to another school | ✔ | ✔ **S** (target school must also be in scope) | ✘ | ✘ |
| Student applications: Excel export | ✔ | ✔ **S** (masked) | ✘ | ✘ |
| Student applications: delete | ✔ (audited; plan T4.3) | ✘ | ✘ | ✘ |
| **Teacher applications** (any operation) | ✘ *(feature disabled in Release 1, D6)* | ✘ | ✘ | ✘ |
| Reports: student metrics | ✔ | ✔ **S** | ✘ | ✘ |
| Reports: teacher metrics | ✘ *(disabled in Release 1)* | ✘ | ✘ | ✘ |
| Schools, governorates, cities: view | ✔ | ✔ (for filters) | ✘ | ✘ |
| Schools, governorates, cities: create / edit / archive / import | ✔ | ✘ | ✘ | ✘ |
| News, FAQ, announcements, documents, media, text blocks: view / create / edit | ✔ | ✘ | ✘ | ✔ |
| News, FAQ, announcements, documents, media, text blocks: delete | ✔ | ✘ | ✘ | ✘ |
| Site settings (admission dates and status, branding, contact) | ✔ | ✘ | ✘ | ✘ |
| **Staff accounts:** create, change role, enable/disable, reset password | ✔ | ✘ | ✘ | ✘ |
| Audit log | ✔ | ✘ | ✘ | ✘ |
| Assign the General Admin role | ✔ (General Admin only) | ✘ | ✘ | ✘ |

**Not assignable in Release 1:** `admin`, `viewer`. They are kept in code but hidden from the role list and rejected by the users API. No accounts are created with them (R-5).

Pages, banners and menus are not in the table. These modules have **no admin screens** today, so no role is granted anything new for them; only General Admin's existing wildcard covers them.

---

## 3. Account safety rules (R-1, D11)

1. **At least one active General Admin at all times.** The system refuses to disable, or change the role of, the last active General Admin.
2. **A General Admin cannot disable themselves or change their own role.** This prevents accidental lock-out; another General Admin must do it.
3. **Accounts are disabled, never hard-deleted (D11).** The delete action is removed from the API and UI.
4. **Role changes take effect on the next request** without re-login. **Disabling an account or resetting its password ends all of its sessions immediately (B18).**
5. **A Student Admissions Manager account cannot be saved without a valid scope** (at least one school or governorate).
6. Every account change is audited with a specific event: created, role changed, disabled/enabled, password reset, session revoked. **No passwords or hashes are ever logged.**

---

## 4. Differences from the current code (what would change)

| Role | Removed vs today | Added vs today |
|---|---|---|
| General Admin | Teacher applications and teacher reports (feature disabled) | — |
| Student Admissions Manager | `audit.view`, `settings.view` | Mandatory scope; explicit `applications.student.*` and `reports.student.view` keys |
| Teacher Admissions Manager | All teacher-application access, `reports.view`, `schools.view`, `governorates.view`, `settings.view`, `audit.view` | — (dashboard only) |
| Content Editor | `schools.create/update/view`, `governorates.view`, `cities.view`, `pages.*`, `banners.*`, `menus.view`, `reports.view`, `settings.view`, `audit.view` | — |
| `admin`, `viewer` | Not assignable | — |

**Side effect to note:** today the dashboard shows the latest audit entries to every role (plan item SEC-09). Under this matrix that panel is shown to General Admin only.

---

## 5. Points for the Product Owner to confirm (R-6)

1. Approve the matrix in section 2 as written, or mark changes.
2. **Student Admissions Manager data masking:** keep today's behaviour (national IDs, phone and e-mail masked for managers), or allow managers to see full guardian contact details within their scope?
3. **Teacher Admissions Manager:** may such accounts be created in Release 1 (dashboard only), or should the role also be non-assignable until teacher admissions open?
4. **Content Editor delete rights:** keep "no delete" (General Admin deletes), or allow deleting their own content?
