// Everything that must be true before this portal raises an invoice a school will
// claim input tax credit on. Run it after filling .env, and again after any move:
//   npm run preflight
// Exits non-zero if anything is a blocker, so it can gate a deploy.

import postgres from 'postgres'
import { loadEnv } from './env.mjs'
import { isGstin, isPan, panFromGstin } from '../lib/gst.js'

loadEnv()

const blockers = []
const warnings = []
const block = (m) => blockers.push(m)
const warn = (m) => warnings.push(m)

// --- Invoice supplier block (GST Rule 46) ----------------------------------
const { ORG_NAME, ORG_ADDRESS, ORG_GSTIN, ORG_PAN, ORG_STATE, ORG_BANK } = process.env

if (!ORG_NAME) block('ORG_NAME is empty. The legal billing entity must appear on the invoice.')
if (!ORG_ADDRESS) block('ORG_ADDRESS is empty. Rule 46 wants the supplier address.')
if (!ORG_STATE) block('ORG_STATE is empty. It decides CGST+SGST versus IGST on every invoice.')

if (!ORG_GSTIN) block('ORG_GSTIN is empty. Invoices will print GSTIN-NOT-SET.')
else if (!isGstin(ORG_GSTIN)) block(`ORG_GSTIN "${ORG_GSTIN}" fails the GSTIN checksum. Re-read it off the certificate.`)

if (!ORG_PAN) warn('ORG_PAN is empty. Not printed on the invoice, but your CA will ask.')
else if (!isPan(ORG_PAN)) block(`ORG_PAN "${ORG_PAN}" is not a valid PAN.`)

if (ORG_GSTIN && ORG_PAN && isGstin(ORG_GSTIN) && panFromGstin(ORG_GSTIN) !== ORG_PAN.toUpperCase())
  block(`ORG_PAN ${ORG_PAN} does not match the PAN inside ORG_GSTIN (${panFromGstin(ORG_GSTIN)}). One of them belongs to a different entity.`)

if (!ORG_BANK) warn('ORG_BANK is empty. Schools pay faster when the invoice carries the account.')

// --- Session ---------------------------------------------------------------
const secret = process.env.SESSION_SECRET
if (!secret) block('SESSION_SECRET is not set. Sessions would run on the built-in development key.')
else if (secret.length < 32) block('SESSION_SECRET is under 32 characters. Generate a fresh one.')

// --- Database --------------------------------------------------------------
if (!process.env.DATABASE_URL) {
  block('DATABASE_URL is not set.')
} else {
  const sql = postgres(process.env.DATABASE_URL, { max: 1, connection: { TimeZone: process.env.PGTZ || 'Asia/Kolkata' } })
  try {
    const [{ TimeZone: tz }] = await sql`show timezone`
    if (tz !== 'Asia/Kolkata') warn(`Database session timezone is ${tz}, not Asia/Kolkata. Dates near midnight will book to the wrong day.`)

    const [{ n: admins }] = await sql`select count(*)::int as n from users where role = 'admin' and active`
    if (!admins) block('No active admin user. Run npm run init-db.')

    const [{ n: counters }] = await sql`select count(*)::int as n from information_schema.tables where table_name = 'counters'`
    if (!counters) block('The counters table is missing — invoice numbering depends on it. Re-run npm run init-db.')

    // Anything already typed in has to survive the same check the forms now apply.
    const bad = await sql`select name, gstin from entities where gstin is not null and gstin <> ''`
    for (const e of bad.filter((r) => !isGstin(r.gstin)))
      block(`${e.name} has an invalid GSTIN (${e.gstin}). Invoicing it would deny the school its input tax credit.`)

    const [{ n: priced }] = await sql`select count(*)::int as n from programs where active and (unit_price = 0 or sac_code is null)`
    if (priced) warn(`${priced} active catalog program(s) still have no price or SAC code.`)
  } catch (e) {
    block(`Cannot query the database: ${e.message}`)
  } finally {
    await sql.end()
  }
}

// --- Report ----------------------------------------------------------------
for (const w of warnings) console.log(`warn   ${w}`)
for (const b of blockers) console.log(`BLOCK  ${b}`)

if (blockers.length) {
  console.log(`\n${blockers.length} blocker(s). Do not issue a real invoice yet.`)
  process.exit(1)
}
console.log(`\nReady to invoice.${warnings.length ? ` ${warnings.length} warning(s) above.` : ''}`)
