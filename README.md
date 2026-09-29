# শিক্ষকসেতু · ShikkhokSetu — Tuition & Tutor Hiring Marketplace (v2)

A modern, LMS-integrated marketplace for **home, online 1-on-1 and batch** tutoring in Bangladesh.

The workflow is inspired by Caretutors-style hiring:

- Guardians post jobs.
- Only KYC-verified tutors can apply.
- Guardians shortlist up to 5 tutors, then run a trial class.
- A digital agreement is signed by both parties.
- An automated commission invoice follows.

It is rebuilt for online teaching (LMS live classroom, resource sharing, LMS performance data) and for production concerns (race-safe transactions, private KYC storage, idempotent payment webhooks).

---

## 1. Architecture blueprint

```
Browser (Next.js 16 App Router · React 19 · Tailwind v4 · shadcn/ui-style components · Radix Dialog)
   │  Server Components render pages   ·   Server Actions mutate   ·   proxy.ts refreshes the Supabase session
   ▼
Next.js server (Vercel, Node runtime)
   ├─ src/server/actions/*      thin layer: auth → zod validation → service → revalidate/redirect
   ├─ src/server/services/*     business rules + Prisma transactions (tested in scripts/test-workflow.ts)
   ├─ src/server/payments/*     SSLCommerz (bKash · Nagad · Rocket · cards) and Stripe (international)
   └─ src/app/api/*             webhooks: SSLCommerz IPN / return, Stripe, LMS progress ingest
   ▼
Supabase
   ├─ Auth                       email + password; trigger auth.users → public.users
   ├─ Postgres                   marketplace tables (RLS ON, no policies → anon key can't read them)
   └─ Storage (private "kyc")    upload only into <uid>/…, admins read via 2-minute signed URLs
   ▲
Parent LMS ──POST /api/lms/progress (Bearer LMS_API_KEY)──▶ progress snapshots on the engagement page
         ◀── tutors share LMS course / assignment links; trials can open in LMS_LIVE_BASE_URL/live/<id>
```

**Why this split.** Every mutation goes through a service function that takes the signed-in `SessionUser`. That function runs in one Prisma interactive transaction and re-checks ownership and state. The browser never talks to marketplace tables directly: only auth and KYC uploads use the public Supabase key.

### State machines

| Entity | States | Transitions |
|---|---|---|
| TutorProfile.verificationStatus | UNVERIFIED → PENDING → VERIFIED / REJECTED | Tutor submits (needs NID/Passport **and** Student ID/Certificate). Admin approves each document, then issues the badge. The badge can be revoked. |
| TuitionPost | OPEN → SHORTLISTED → CONFIRMED · CANCELLED | Moves to SHORTLISTED on the first shortlist and back to OPEN when the shortlist empties. Moves to CONFIRMED when the tutor counter-signs. |
| TuitionApplication | PENDING → SHORTLISTED → CONFIRMED · REJECTED · WITHDRAWN | When the hire locks, every other applicant is auto-rejected. |
| TrialSession | SCHEDULED → COMPLETED · NO_SHOW · CANCELLED | Paid trials create a TRIAL_FEE invoice. |
| TuitionAgreement | PENDING_SIGNATURES → ACTIVE → COMPLETED · TERMINATED · CANCELLED | Guardian "Accept & Hire" generates the agreement and signs it. Tutor signing makes it ACTIVE, which locks the hire, issues the invoice and reveals contact details. |
| Invoice | ISSUED → PAID · OVERDUE · VOID | Settled exactly once by a gateway callback or an admin manual payment. |

### Production edge cases handled

- **Unverified tutor applies.** Rejected with `TUTOR_NOT_VERIFIED`. The UI explains why and links to KYC. Verification is re-checked at hire time too, because it can be revoked after the tutor applied.
- **Duplicate application (double-click, two tabs).** The unique index `(postId, tutorProfileId)` blocks it. The losing request gets `DUPLICATE_APPLICATION`, and its counter update and credit spend roll back with it.
- **Shortlist cap under concurrency.** Locked with `SELECT … FOR UPDATE` on the job row, plus a `CHECK (shortlistedCount <= maxShortlist)` constraint.
- **Double hire.** Job row lock plus a partial unique index. Only one agreement per job can be `PENDING_SIGNATURES` or `ACTIVE`.
- **Late application to a filled job.** The job's status is re-read under the lock.
- **Credits.** Spent with a conditional `UPDATE … WHERE creditBalance >= cost`, and the balance has a `CHECK (creditBalance >= 0)` constraint.
- **Payments.** Callbacks are re-validated with the gateway's own validation API. Amount, currency and `tran_id` are compared with our transaction. Settlement is idempotent (`status IN (ISSUED, OVERDUE)`), and there is at most one commission invoice per agreement.
- **Privacy.** The guardian's street address and both phone numbers are hidden until the agreement is ACTIVE. The address is also kept out of the signed agreement text.
- **Signatures.** Typed full name that must match the account name, plus a consent box, timestamp and IP address.

`scripts/test-workflow.ts` exercises all of this against real Postgres (28 checks, including parallel races): `npm run db:test`.

## 2. Monetisation (admin → Settings)

- **COMMISSION** (default): X% of the first month's salary, paid by the tutor or the guardian. It is written into the agreement and invoiced automatically.
- **CREDITS**: tutors spend credits per application and buy credit packs (CREDIT_PACK invoices).
- **HYBRID**: both.

## 3. LMS integration

- **Trial classes.** `ONLINE_LMS` builds `LMS_LIVE_BASE_URL/live/<trialId>` (live classroom with whiteboard). `ONLINE_MEET` uses a pasted Google Meet link or an auto-generated Jitsi room. Auto-creating Google Meet links needs Google Calendar OAuth, which isn't set up.
- **Resource sharing.** Tutors share LMS courses, videos, assignments and quizzes with their hired student.
- **Performance.** The guardian links the child's LMS id. The LMS then pushes data:

```http
POST /api/lms/progress
Authorization: Bearer <LMS_API_KEY>
Content-Type: application/json

[{ "lmsStudentId": "stu_1024", "courseId": "acc-u2", "courseTitle": "A Level Accounting U2", "metric": "quiz_avg", "value": 78.5 }]
```

## 3b. Admin CRM (`/admin`)

Admins sign in normally. The header shows an **Admin** link, which opens the CRM. Every page is behind `requireAdmin()`, and every change writes an `audit_logs` row.

| Area | What you can see | What you can control |
|---|---|---|
| Dashboard | KPIs, 30-day charts (signups, posts, revenue), "needs attention" alerts, recent activity | — |
| Search | Users, posts (#number), agreements, invoices (INV-…), transactions (tran_id) in one box | — |
| Users → 360° page | Profile, KYC files, posts, applications, agreements, invoices, reviews, credit ledger, notifications, audit trail | Edit name, phone and LMS id; change role (super admin only); block or unblock; add or deduct credits; approve or reject KYC; force the badge (super admin only); private notes; direct notification |
| Tuition posts → detail | Every field, including the private address, and every applicant with their trials | Edit the post, cancel or re-open it, reject or restore applicants, notes |
| Applications / Trials | All of them, filterable | Reject or restore an application |
| Agreements → detail | Terms, signatures with IP addresses, invoices and transactions, session log, salary, LMS data, review | Cancel an unsigned agreement, mark one completed or terminate it, mark invoices paid, void invoices, notes |
| Sessions & salary / Invoices / Payments / Reviews | Everything, with totals | Mark paid or void; delete a review (super admin only; the tutor's rating is recalculated) |
| Notifications | Broadcast history | Send to everyone (super admin only), all tutors, verified tutors, guardians, admins, or one user |
| Audit log / Export | Every action | Download CSV (opens in Excel with Bangla intact; spreadsheet formulas are neutralised) |

Admin notes are stored as `audit_logs` rows with `action = 'ADMIN_NOTE'`, so the CRM needs no extra migration.

## 4. Project layout

```
prisma/schema.prisma                 data model (Prisma 7, driver adapter, no Rust engine)
prisma/migrations/0001_…/            tables, enums, indexes, constraints
prisma/migrations/0002_supabase_…/   RLS, auth trigger, private kyc bucket, v1 → v2 data import
src/proxy.ts                         session refresh + optimistic route guard
src/server/{auth,validation,errors}  identity, zod schemas, domain errors
src/server/services/                 posts · applications · hiring · billing · engagement · tutors · admin
src/server/actions/                  Server Actions (marketplace, account, admin)
src/app/                             pages (board, tutors, dashboard/*, admin/*) + api routes
src/components/                      UI (ui/* primitives, ApplyDialog, ApplicantActions, …)
```

## 5. Setup

1. Run `prisma/migrations/0001_marketplace_init/migration.sql`, then `0002_supabase_setup/migration.sql`, in Supabase → SQL Editor.
2. Set the environment variables from `.env.example` in Vercel. At minimum: `DATABASE_URL`, `DIRECT_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `APP_URL`.
3. Deploy. The build runs `prisma generate && next build` and doesn't need database access.
4. Local development: `npm i`, put the variables in `.env`, then `npm run dev`. Optionally seed with `npx tsx --conditions=react-server --env-file=.env scripts/seed-demo.ts`.
