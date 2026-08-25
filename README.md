# School Grads internal portal

CRM + light services-ERP + minimal HRMS around one shared `entities` table (schools).
Next.js 15 (App Router, server actions) + Postgres. No ORM, no CSS framework, no auth library.

## Setup

```bash
npm install
cp .env.example .env          # set DATABASE_URL, SESSION_SECRET, ORG_* invoice fields
npm run init-db -- you@schoolgrads.ai 'your-password'
npm run dev
```

Any Postgres works — local, Neon, Supabase. `init-db` is idempotent: it creates the schema,
the first admin login, and the five catalog rows (prices and SAC codes get filled in the app).

```bash
npm run check                 # GST split, invoice numbering, GSTIN checksum, PT slabs, payslip net
npm run preflight             # is this install allowed to raise a real invoice yet?
npm run seed-demo             # one school through the whole funnel, on an empty database
```

`seed-demo` refuses to run once any school exists (`-- --force` overrides). Besides giving the
portal something to show, it compares the `invoice_totals` view against `lib/gst.js` on the rows
it just wrote and exits non-zero if they disagree — the one check that needs a real database.

`preflight` checks the supplier block, the session secret and the database, and exits non-zero
if anything would produce a non-compliant invoice. Run it after editing `.env` and after any
move to new hosting.

## Modules

| Route | What | Roles |
|---|---|---|
| `/` | Dashboard: pipeline, cash, follow-ups, receivables, delivery, renewals | all |
| `/schools`, `/schools/[id]` | Master record: contacts, deals, invoices, delivery, documents, activity, enquiry log | admin, sales, ops, finance |
| `/crm`, `/crm/[id]` | Needs-attention worklist, weighted forecast, Kanban pipeline board | admin, sales |
| `/catalog` | Programs with unit, price, SAC code, GST rate | admin, sales, finance |
| `/quotes`, `/quotes/[id]` | Catalog-driven quotes per rep → convert to invoice | admin, sales, finance |
| `/invoices`, `/invoices/[id]` | GST Rule 46 invoices, payments, print/PDF | admin, sales, finance |
| `/finance` | Receivables aging, expenses, TDS by section | admin, finance |
| `/delivery` | Training sessions and deliverables per school | admin, ops, sales |
| `/reports` | Team performance dashboard, enquiry funnel, win/loss trends, call analytics | admin, sales, finance |
| `/campaigns` | Outreach campaigns linked to deals | admin, sales |
| `/people` | Employee register, logins, leave approvals, payslip run | admin, finance |
| `/me` | Check in/out, apply for leave, own payslips | everyone |

Salary and CTC are visible only to admin/finance, plus each employee's own payslip.

## Decisions worth knowing

- **One school = one record.** GSTIN and PAN live on `entities` only; quotes, invoices and
  delivery inherit them. Nothing re-types a GSTIN.
- **Invoice numbers** are `SG/26-27/0007`, sequential per financial year, 13 chars (Rule 46 caps
  at 16). A `counters` row per (kind, financial year) hands them out in one atomic upsert, so two
  people issuing at once get different numbers.
- **Dates are Indian.** The DB session runs in `Asia/Kolkata` and dates render in it, so nothing
  books to yesterday when the host is on UTC.
- **Money maths** lives in `lib/gst.js` and the `invoice_totals` view, both rounding per line,
  so the printed invoice and the receivables report never disagree by a paisa.
- **Documents** are links (Drive/Dropbox), not uploads. No file hosting, no storage bill.
- **PDFs** are the browser's print dialog. No PDF library.
- **PF/ESI** fields (UAN, ESIC number) are captured but nothing is filed — those kick in at 20 and
  10 employees. Professional Tax and TDS are computed because they apply now. The People page starts
  warning two hires before each threshold.
- **Login** locks an email out for fifteen minutes after five wrong passwords.
- **Passwords** are changed by the owner under `/me` (the current one is required) and reset by an
  admin under `/people`. No email flow — under ten staff, a reset is handed over in person.

## Before issuing a real invoice

Confirm the legal billing entity, GSTIN, PAN and TAN with your CA and put them in `ORG_*` in
`.env`, then run `npm run preflight` until it passes. Until `ORG_GSTIN` is set, the invoice list
shows a warning and invoices print `GSTIN-NOT-SET`. Also verify the current TDS thresholds and the
e-invoicing turnover floor (₹5 crore at the time of writing) — both have moved recently.

School GSTINs and PANs are checksum-validated on entry, so a transposed pair is refused rather
than printed on an invoice the school then cannot claim credit on.

Backups are the host's job — managed Postgres with point-in-time recovery is the least work.
Self-hosting instead means a `pg_dump` on a schedule; there is nothing in the app for it.

## Docker / VPS Deployment

```bash
# Clone on your VPS
git clone https://github.com/itzr00tbyte/Grad-CRM.git
cd Grad-CRM

# Build image
docker build -t schoolgrads-crm .

# Run (uses the committed .env — swap for .env.production if you want a separate prod env)
docker run -d --name crm -p 3000:3000 --env-file .env --restart unless-stopped schoolgrads-crm

# First run: apply schema + create admin
docker exec crm node scripts/init-db.mjs admin@schoolgrads.ai 'your-password'
```

Put nginx on port 443 in front (certbot for the cert). The `Strict-Transport-Security` header
in `next.config.mjs` takes effect once HTTPS is live.

To update after a `git push`:

```bash
git pull
docker build -t schoolgrads-crm .
docker stop crm && docker rm crm
docker run -d --name crm -p 3000:3000 --env-file .env --restart unless-stopped schoolgrads-crm
```

## Deliberately not built

Marketing automation, double-entry accounting (keep books with the CA), inventory, appraisals,
ATS, PF/ESI filing, student-facing dashboards (those live in the vendors' own apps).
