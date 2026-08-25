# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Internal portal for School Grads (schoolgrads.ai, Hyderabad) — the India partner reselling Finnish
education programs (Code School Finland, Moomin Language School, Kindiedays, Finnish Experience) to
K-12 schools and preschools. CRM + light services-ERP + minimal HRMS for a team under 10.
Built from `SchoolGrads_Internal_Portal_Blueprint_1.pdf` (functional blueprint, not in repo).

## Commands

```bash
npm install
cp .env.example .env                                 # DATABASE_URL, SESSION_SECRET, ORG_* invoice fields
npm run init-db -- admin@schoolgrads.ai 'password'   # idempotent: schema + first admin + catalog seed
npm run dev
npm run check                                        # the only test suite
npm run preflight                                    # go-live gate; exits 1 on any blocker
npm run seed-demo                                    # demo data + the one DB-backed check
npm run seed-demo -- --reset                         # wipe business rows (keeps logins/catalog), reseed

npm run build
```

Don't run `npm run build` while the dev server is up — it rewrites `.next` underneath it and the
running server starts throwing `Cannot find module './NNN.js'` until you restart it.

`npm run check` is a single `node:assert` script ([test/check.mjs](test/check.mjs)) — no framework, no
runner, no single-test flag. Add assertions to that file. It covers only logic that costs money if
wrong: GST split, invoice/quote numbering, FY boundaries, GSTIN/PAN validity, PT slabs, payslip net,
leave balances, statutory headcount triggers, IST date rendering. It needs no database.

The one thing it structurally cannot cover — that the `invoice_totals` view and `lib/gst.js` agree
on real rows — lives in [scripts/seed-demo.mjs](scripts/seed-demo.mjs), which asserts it against the
invoice it seeds. Its line items include a deliberately awkward `3 × 333.33 @ 5%`; keep a case like
that if you edit them, since even totals are what the two independent roundings differ on.

Any Postgres works (local, Neon, Supabase). Schema changes go in [schema.sql](schema.sql) using
`create table if not exists` / `create or replace view`; re-running `init-db` applies them. There are
no migration files — an `alter table` for an existing column must be added to the script deliberately.

## Architecture

Next.js 15 App Router + Postgres, deliberately dependency-thin: **no ORM, no CSS framework, no auth
library, no component library, no PDF library, no file storage.** Deps are `next`, `react`,
`postgres`, `jose`, `bcryptjs` — keep it that way unless a few lines genuinely can't do the job.

**One shared master record.** `entities` (schools) + `contacts` are the keystone; every other module
references `entities.id`. A school is simultaneously a CRM lead, a billing account and a delivery
project — one row for all three. GSTIN/PAN live on `entities` only; quotes, invoices and deliveries
inherit them. Never add a second place to type a GSTIN.

Data flow: deal won → quote → `invoiceFromQuote` copies lines and marks the quote accepted →
payments settle the invoice → deliveries track fulfilment → `renewal_date` drives the renewal alert.

**Every page is an async server component** that calls `requireUser(section)` then queries `sql` with
tagged templates directly — no data-access layer, no API routes. Mutations are server actions in a
per-route `actions.js` (`'use server'`), each re-calling `requireUser` and ending with
`revalidatePath`. Forms are plain `<form action={serverAction}>`; almost nothing is a client
component. `dynamic = 'force-dynamic'` in the root layout — nothing is prerendered.

**Pipeline judgement** is in [lib/pipeline.js](lib/pipeline.js), not in the page: stage odds for the
weighted forecast, and `dealHealth` / `needsAttention`, which rank open deals by neglect (overdue
follow-up → no next step → cold → quiet). `/crm` leads with that worklist because a CRM nobody is
prompted by is a CRM nobody updates. Two rules the logic depends on: a deal's freshness is the
timestamp of its last logged activity (so booking a follow-up counts as touching it), and a deal
nobody has ever logged anything against counts from its creation date rather than reading as fresh.
`STAGE_ODDS` are a guess until there is a year of closed deals — say so before quoting the forecast
to anyone.

**Branding** lives entirely in the `:root` tokens at the top of [app/globals.css](app/globals.css).
The three colours are lifted from the logo file itself — navy `#001f3f`, blue `#004080`, lime
`#b2e600` — with the white header, 12px cards and pill buttons taken from schoolgrads.ai. Restyle by
editing tokens, not rules. Two constraints worth keeping: lime is an accent only (it is unreadable
as text on white, and is used for the focus ring), and the header stays white because the wordmark
is navy and disappears on a dark bar. The logo is a local copy at `public/brand/` — no request to
schoolgrads.ai at page load.

**Auth/roles** ([lib/auth.js](lib/auth.js)): JWT in an httpOnly cookie via `jose`; the `ACCESS` map
is the single source of truth for section → roles, used both by `requireUser` guards and by the nav
in [app/layout.jsx](app/layout.jsx). Five roles: admin, sales, ops, finance, employee (self-service
only). Salary/CTC and deal margin stay admin/finance, plus each employee's own payslip. Don't
introduce per-record RBAC; four roles plus self-service is the intended ceiling.

`login()` returns `{ user }` or `{ error }` — never a bare row — and throttles at five failed
attempts per email for fifteen minutes. The counter is a per-process `Map`, which is correct for a
single instance and nothing more; its `ponytail:` comment says where to move it.

Note that sections are coarse: `people` admits finance as well as admin. Anything inside a section
that grants *more* than the section itself — assigning a user's role or setting someone's password —
must check `user.role` explicitly, or finance can escalate itself to admin. See `createUser` and
`resetPassword` in [app/people/actions.js](app/people/actions.js).

Password changes are the owner's own under `/me` (`changePassword` re-checks the current password,
so a borrowed unlocked laptop is not a takeover) and an admin reset under `/people`. No email/token
flow — under ten staff, a reset is handed over in person.

**Money maths is duplicated on purpose.** [lib/gst.js](lib/gst.js) `totals()` and the
`invoice_totals` view in [schema.sql](schema.sql) both round *per line* so the printed invoice and
the receivables report can never disagree by a paisa. Change one, change the other, and update
`npm run check`. Odd-paisa CGST/SGST splits let the SGST side absorb the remainder.

`postgres` is configured in [lib/db.js](lib/db.js) to parse `numeric` as a JS number (otherwise every
money field needs `Number()`), and the pool is pinned to `globalThis` so dev hot-reload doesn't leak
pools.

## India-specific rules baked in

- **Invoice numbers**: `SG/26-27/0007`, sequential per financial year (April–March), 13 chars against
  the Rule 46 16-char cap. Allocated by [lib/seq.js](lib/seq.js) from the `counters` table — one
  upsert, atomic, so concurrent issues get different numbers. `invoices.number` stays unique as a
  backstop. A failed insert after allocation leaves a gap in the run; gaps are acceptable under
  Rule 46, reuse is not.
- **Place of supply** decides the tax split: `intra_state` = place equals `ORG_STATE` (Telangana) →
  CGST+SGST, else IGST. Set on the invoice at creation from the entity's state.
- **Supplier block** comes from `ORG_*` env ([lib/org.js](lib/org.js)). The legal billing entity,
  GSTIN, PAN and TAN are still unconfirmed — until `ORG_GSTIN` is set, invoices print
  `GSTIN-NOT-SET` and the list shows a warning. Don't hardcode a GSTIN.
- **GSTIN/PAN are checksum-validated** (`isGstin`/`isPan` in [lib/gst.js](lib/gst.js)) at every
  entry point: school forms refuse a bad one, `npm run preflight` refuses a bad `ORG_GSTIN`. The
  mod-36 check digit catches transpositions that a length check would pass. Blank is always
  allowed — a lead has no GST details yet.
- **TDS** is captured as a flag + amount on `expenses` (194J/194C); no filing engine.
- **PF/ESI** fields (`uan`, `esic_no`) exist but nothing is filed — thresholds are 20 and 10
  employees. Professional Tax (Telangana slabs) and TDS on salary are computed because they apply now.
  `statutoryAlerts()` in [lib/payroll.js](lib/payroll.js) banners `/people` from two hires out, so
  registration isn't discovered late; crossing a threshold is when the filing work actually starts.
- Thresholds and rates move (e-invoicing floor, 194J threshold, Income Tax Act 2025 renumbering from
  1 April 2026). Treat the values in [lib/payroll.js](lib/payroll.js) and the README as
  verify-with-a-CA, not settled.

## Deliberately not built

Marketing automation, double-entry accounting/GL (books stay with the CA), inventory, appraisals,
ATS, PF/ESI filing, student-facing dashboards (those live in the vendors' own apps), multi-currency
royalty settlement, SSO/audit trails. Documents are links to Drive/Dropbox, not uploads. PDFs are the
browser print dialog (`.noprint` class hides chrome). Don't build these back in without being asked.

`ponytail:` comments mark deliberate simplifications and name the upgrade path — read one before
"fixing" the code it sits on.
