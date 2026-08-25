// Fills an empty database with one school carried the whole way through the funnel —
// contact, deal, quote, invoice, part payment, delivery plan, renewal date — so the portal
// can be looked at with something in it. Then it does the job npm run check cannot: compares
// the invoice_totals view against lib/gst.js on real rows. Those two round independently, and
// the promise that they agree to the paisa is only worth as much as this comparison.
//
//   npm run seed-demo            refuses to touch a database that already has data
//   npm run seed-demo -- --force seeds anyway
//
// Exits non-zero if the view and the money maths disagree.

import postgres from 'postgres'
import { loadEnv } from './env.mjs'
import { totals } from '../lib/gst.js'
import { fyLabel, invoiceNumber, quoteNumber } from '../lib/gst.js'

loadEnv()
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL not set')

const force = process.argv.includes('--force')
const reset = process.argv.includes('--reset')
const sql = postgres(process.env.DATABASE_URL, { max: 1, connection: { TimeZone: process.env.PGTZ || 'Asia/Kolkata' } })

// --reset wipes every business row and starts over. Logins and the catalog survive.
// Child rows go first because invoices reference entities with on delete restrict.
if (reset) {
  await sql.begin(async (tx) => {
    for (const t of ['payments', 'invoice_items', 'invoices', 'quote_items', 'quotes',
                     'deliveries', 'activities', 'documents', 'contacts', 'deals', 'entities', 'counters'])
      await tx`delete from ${tx(t)}`
  })
  console.log('reset: all schools, deals, quotes, invoices and activities deleted')
}

const [{ n: existing }] = await sql`select count(*)::int as n from entities`
if (existing && !force) {
  console.log(`${existing} school(s) already exist. Refusing to add demo data — pass --force if you meant it.`)
  await sql.end()
  process.exit(0)
}

const [admin] = await sql`select id from users where role = 'admin' and active order by id limit 1`
if (!admin) throw new Error('No admin user. Run npm run init-db first.')

const [licence] = await sql`select id from programs where unit = 'per_school' order by id limit 1`
const [training] = await sql`select id from programs where unit = 'per_teacher' order by id limit 1`
if (!licence || !training) throw new Error('Catalog is empty. Run npm run init-db first.')

// Prices the catalog seed leaves blank, so quotes and invoices have something to carry.
await sql`update programs set unit_price = 180000, sac_code = '999293', gst_rate = 18 where id = ${licence.id}`
await sql`update programs set unit_price = 12500, sac_code = '999293', gst_rate = 18 where id = ${training.id}`

const seq = await sql`
  insert into counters (kind, fy, n) values ('invoice', ${fyLabel()}, 1)
  on conflict (kind, fy) do update set n = counters.n + 1 returning n`
const qseq = await sql`
  insert into counters (kind, fy, n) values ('quote', ${fyLabel()}, 1)
  on conflict (kind, fy) do update set n = counters.n + 1 returning n`

const [school] = await sql`
  insert into entities (name, board, segment, city, state, gstin, pan, status, owner_id,
                        pilot_start, pilot_end, success_criteria, renewal_date, notes)
  values ('Demo Public School', 'CBSE', 'k12', 'Hyderabad', 'Telangana',
          '36AABCU9603R1ZO', 'AABCU9603R', 'active', ${admin.id},
          current_date - 120, current_date - 30,
          'Two teachers certified; 4 classes running weekly by the end of the pilot',
          current_date + 45, 'Seeded by npm run seed-demo. Safe to delete.')
  returning id`

await sql`insert into contacts (entity_id, name, role_tag, email, phone) values
  (${school.id}, 'Demo Principal', 'principal', 'principal@demoschool.example', '+91 90000 00001'),
  (${school.id}, 'Demo Coordinator', 'coordinator', 'coord@demoschool.example', '+91 90000 00002'),
  (${school.id}, 'Demo Accounts', 'accounts', 'accounts@demoschool.example', '+91 90000 00003')`

const [deal] = await sql`
  insert into deals (entity_id, title, stage, value, expected_close, owner_id)
  values (${school.id}, 'Code School Finland — licence + teacher training', 'won', 217500,
          current_date - 20, ${admin.id})
  returning id`

await sql`insert into activities (entity_id, deal_id, kind, note, due_on, owner_id, done_at) values
  (${school.id}, ${deal.id}, 'meeting', 'Demo for principal and coordinator', current_date - 60, ${admin.id}, now()),
  (${school.id}, ${deal.id}, 'call', 'Pilot feedback — coordinator wants a second batch', current_date - 25, ${admin.id}, now()),
  (${school.id}, ${deal.id}, 'task', 'Send renewal proposal before the anniversary', current_date + 3, ${admin.id}, null)`

// Deliberately awkward money: 3 x 333.33 rounds differently per line than in aggregate,
// which is exactly the case the view and lib/gst.js have to agree on.
const lines = [
  { description: 'Code School Finland — school licence (1 year)', sac_code: '999293', qty: 1, unit_price: 180000, gst_rate: 18, program_id: licence.id },
  { description: 'Teacher training — 3 teachers', sac_code: '999293', qty: 3, unit_price: 12500, gst_rate: 18, program_id: training.id },
  { description: 'Printed workbooks', sac_code: '998912', qty: 3, unit_price: 333.33, gst_rate: 5, program_id: null },
]

const [quote] = await sql`
  insert into quotes (entity_id, deal_id, number, status, notes)
  values (${school.id}, ${deal.id}, ${quoteNumber(fyLabel(), qseq[0].n)}, 'accepted', 'Demo quote')
  returning id`
for (const l of lines)
  await sql`insert into quote_items (quote_id, program_id, description, qty, unit_price, gst_rate)
            values (${quote.id}, ${l.program_id}, ${l.description}, ${l.qty}, ${l.unit_price}, ${l.gst_rate})`

const [invoice] = await sql`
  insert into invoices (entity_id, quote_id, number, invoice_date, due_date, place_of_supply, intra_state, status, notes)
  values (${school.id}, ${quote.id}, ${invoiceNumber(fyLabel(), seq[0].n)}, current_date - 18, current_date + 12,
          'Telangana', true, 'issued', 'Demo invoice')
  returning id`
for (const l of lines)
  await sql`insert into invoice_items (invoice_id, program_id, description, sac_code, qty, unit_price, gst_rate)
            values (${invoice.id}, ${l.program_id}, ${l.description}, ${l.sac_code}, ${l.qty}, ${l.unit_price}, ${l.gst_rate})`

const expected = totals(lines, true)
await sql`insert into payments (invoice_id, paid_on, amount, mode, ref)
          values (${invoice.id}, current_date - 10, 100000, 'NEFT', 'DEMO/NEFT/0001')`

await sql`insert into deliveries (entity_id, invoice_id, title, kind, trainer, scheduled_on, status) values
  (${school.id}, ${invoice.id}, 'Curriculum handover', 'deliverable', 'Finnish partner trainer', current_date - 14, 'done'),
  (${school.id}, ${invoice.id}, 'Teacher onboarding — batch 1', 'session', 'Finnish partner trainer', current_date - 7, 'done'),
  (${school.id}, ${invoice.id}, 'Teacher onboarding — batch 2', 'session', 'Finnish partner trainer', current_date + 5, 'planned')`

// --- An open pipeline, so the board has something to judge -------------------
// Each of these is deliberately in a different state of neglect: one healthy, one gone quiet,
// one with an overdue follow-up, one nobody has ever logged anything against.
const prospects = [
  {
    name: 'Green Valley International', board: 'CBSE', segment: 'k12', city: 'Hyderabad', status: 'pilot',
    deal: { title: 'Moomin Language School — 3 sections', stage: 'pilot', value: 145000, close: 30 },
    lastTouch: 20, nextDue: 5, // logged three weeks ago, next step booked: quiet
  },
  {
    name: 'Sunrise Global School', board: 'IGCSE', segment: 'k12', city: 'Warangal', status: 'lead',
    deal: { title: 'Code School Finland — whole-school licence', stage: 'negotiation', value: 320000, close: 14 },
    lastTouch: 9, nextDue: -6, // follow-up went past six days ago: overdue
  },
  {
    name: 'Little Steps Preschool', board: null, segment: 'preschool', city: 'Secunderabad', status: 'lead',
    deal: { title: 'Kindiedays preschool curriculum', stage: 'proposal', value: 96000, close: 45 },
    lastTouch: null, nextDue: null, // never touched since creation: no next step
  },
  {
    name: 'Oakridge Vidyalaya', board: 'ICSE', segment: 'k12', city: 'Hyderabad', status: 'lead',
    deal: { title: 'Finnish Experience — leadership cohort', stage: 'demo', value: 210000, close: 60 },
    lastTouch: 2, nextDue: 4, // worked this week: healthy
  },
]

for (const p of prospects) {
  const [ent] = await sql`
    insert into entities (name, board, segment, city, state, status, owner_id, notes)
    values (${p.name}, ${p.board}, ${p.segment}, ${p.city}, 'Telangana', ${p.status}, ${admin.id},
            'Seeded by npm run seed-demo. Safe to delete.')
    returning id`
  await sql`insert into contacts (entity_id, name, role_tag, email)
            values (${ent.id}, 'Principal', 'principal', ${'principal@' + p.name.toLowerCase().replace(/\W+/g, '') + '.example'})`

  const [dl] = await sql`
    insert into deals (entity_id, title, stage, value, expected_close, owner_id, created_at)
    values (${ent.id}, ${p.deal.title}, ${p.deal.stage}, ${p.deal.value},
            current_date + ${p.deal.close}::int, ${admin.id}, now() - interval '40 days')
    returning id`

  if (p.lastTouch !== null)
    await sql`insert into activities (entity_id, deal_id, kind, note, owner_id, created_at, done_at)
              values (${ent.id}, ${dl.id}, 'call', 'Discussed scope and pricing', ${admin.id},
                      now() - ${p.lastTouch + ' days'}::interval, now() - ${p.lastTouch + ' days'}::interval)`

  // The next step is booked during the same call, so logging it does not reset the clock —
  // which is what makes "quiet" mean anything.
  if (p.nextDue !== null)
    await sql`insert into activities (entity_id, deal_id, kind, note, due_on, owner_id, created_at)
              values (${ent.id}, ${dl.id}, 'task', 'Send revised proposal', current_date + ${p.nextDue}::int,
                      ${admin.id}, now() - ${(p.lastTouch ?? 0) + ' days'}::interval)`
}

// --- The comparison that matters -------------------------------------------
const [view] = await sql`select * from invoice_totals where id = ${invoice.id}`
const rows = [
  ['taxable', expected.taxable, Number(view.taxable)],
  ['tax', expected.tax, Number(view.tax)],
  ['total', expected.total, Number(view.total)],
]
let mismatch = false
console.log(`\ninvoice ${view.number}`)
for (const [label, lib, dbv] of rows) {
  const ok = Math.abs(lib - dbv) < 0.005
  if (!ok) mismatch = true
  console.log(`  ${label.padEnd(8)} lib/gst.js ${lib.toFixed(2).padStart(12)}   invoice_totals ${dbv.toFixed(2).padStart(12)}   ${ok ? 'agree' : 'DISAGREE'}`)
}
console.log(`  ${'paid'.padEnd(8)} ${Number(view.paid).toFixed(2).padStart(23)}   outstanding ${(Number(view.total) - Number(view.paid)).toFixed(2)}`)
console.log(`  ${'split'.padEnd(8)} CGST ${expected.cgst.toFixed(2)} + SGST ${expected.sgst.toFixed(2)} = ${expected.tax.toFixed(2)}`)

await sql.end()

if (mismatch) {
  console.log('\nThe printed invoice and the receivables report would show different numbers. Fix before invoicing.')
  process.exit(1)
}
console.log('\nSeeded. The view and the money maths agree to the paisa.')
