// One runnable check over the logic that costs money if it is wrong: GST split,
// invoice numbering, PT slabs, payslip net. Run: npm run check
import assert from 'node:assert/strict'
import {
  totals, invoiceNumber, quoteNumber, fyLabel, fyStart,
  isGstin, isPan, gstinCheckDigit, panFromGstin,
} from '../lib/gst.js'
import {
  professionalTax, payslipTotals, leaveDays, leaveRemaining, leaveAllowed, statutoryAlerts,
} from '../lib/payroll.js'
import { d, today } from '../lib/fmt.js'
import { pipelineValue, dealHealth, daysQuiet, needsAttention } from '../lib/pipeline.js'

// --- GST -------------------------------------------------------------------
const items = [
  { qty: 1, unit_price: 100000, gst_rate: 18 },
  { qty: 3, unit_price: 5000, gst_rate: 18 },
]
const intra = totals(items, true)
assert.equal(intra.taxable, 115000)
assert.equal(intra.tax, 20700)
assert.equal(intra.cgst + intra.sgst, intra.tax, 'CGST+SGST must equal total tax')
assert.equal(intra.igst, 0)
assert.equal(intra.total, 135700)

const inter = totals(items, false)
assert.equal(inter.igst, 20700)
assert.equal(inter.cgst + inter.sgst, 0)
assert.equal(inter.total, intra.total, 'intra and inter must bill the same amount')

// Odd paisa: the half-split must not lose or invent a paisa.
const odd = totals([{ qty: 1, unit_price: 1000.05, gst_rate: 5 }], true)
assert.equal(odd.cgst + odd.sgst, odd.tax)
assert.equal(odd.total, odd.taxable + odd.tax)

assert.equal(totals([], true).total, 0)

// --- Numbering -------------------------------------------------------------
assert.equal(fyLabel(new Date('2026-08-12')), '26-27')
assert.equal(fyLabel(new Date('2026-03-31')), '25-26', 'March belongs to the previous FY')
assert.equal(fyStart(new Date('2026-03-31')), '2025-04-01')
assert.equal(fyStart(new Date('2026-04-01')), '2026-04-01')
const n = invoiceNumber(fyLabel(new Date('2026-08-12')), 7)
assert.equal(n, 'SG/26-27/0007')
assert.ok(n.length <= 16, 'Rule 46 caps the invoice number at 16 characters')
assert.ok(quoteNumber('26-27', 1).length <= 16)

// --- GSTIN / PAN -----------------------------------------------------------
assert.ok(isGstin('27AAPFU0939F1ZV'))
assert.ok(isGstin('29AAGCB7383J1Z4'))
assert.ok(isGstin('27aapfu0939f1zv'), 'lowercase entry is still the same GSTIN')
assert.ok(!isGstin('27AAPFU0939F1ZX'), 'wrong check digit')
assert.ok(!isGstin('27AAPFU0939F1Z'), 'too short')
assert.ok(!isGstin('99AAPFU0939F1ZV'), 'no such state code')
assert.ok(!isGstin(''), 'blank is not a GSTIN — callers skip empty fields themselves')

// The check digit exists to catch transposition, which a shape-only check would pass.
assert.ok(!isGstin('27AAPFU9039F1ZV'))

// Every single-character corruption of a valid GSTIN must be refused.
const B36 = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'
const good = '27AAPFU0939F1ZV'
for (let i = 0; i < 15; i++)
  for (const c of B36) {
    const bad = good.slice(0, i) + c + good.slice(i + 1)
    if (bad !== good) assert.ok(!isGstin(bad), `accepted a corrupted GSTIN: ${bad}`)
  }

// Appending the computed digit must always produce something valid.
for (const p of ['36AABCU9603R1Z', '07AAACN2082N1Z', '19AABCT1332L1Z'])
  assert.ok(isGstin(p + gstinCheckDigit(p)))

import { isValidSchoolName } from '../lib/validation.js'

assert.ok(isValidSchoolName('The Shree Ram School Aravali'))
assert.ok(isValidSchoolName('Oakridge International School'))
assert.ok(isValidSchoolName('Dr. Radha Krishnan Public School'))
assert.ok(isValidSchoolName('Shri Ram Wonder Years'))
assert.ok(!isValidSchoolName(''), 'empty name rejected')
assert.ok(!isValidSchoolName('D'), 'too short')
assert.ok(!isValidSchoolName('12345'), 'pure numbers rejected')
assert.ok(!isValidSchoolName('---'), 'pure symbols rejected')
assert.ok(!isValidSchoolName('Shwetketusharma@gmail.com'), 'email rejected')
assert.ok(!isValidSchoolName('https://mylearningdays.com'), 'URL rejected')
assert.ok(!isValidSchoolName('(Institute not visible in OCR)'), 'OCR placeholder rejected')
assert.ok(!isValidSchoolName('Ms. Praseeja Nambiar'), 'person salutation without school indicator rejected')

assert.equal(panFromGstin('27AAPFU0939F1ZV'), 'AAPFU0939F')
assert.ok(isPan('AAPFU0939F'))
assert.ok(!isPan('AAPFU0939'), 'PAN is ten characters')
assert.ok(!isPan('AAPF10939F'), 'first five are letters')

// --- Payroll ---------------------------------------------------------------
assert.equal(professionalTax(14999), 0)
assert.equal(professionalTax(15000), 150)
assert.equal(professionalTax(20000), 150)
assert.equal(professionalTax(20001), 200)

const slip = payslipTotals({ basic: 30000, hra: 12000, allowances: 3000, pt: 200, tds: 2500 })
assert.equal(slip.gross, 45000)
assert.equal(slip.net, 42300)

assert.equal(leaveDays('2026-08-12', '2026-08-12'), 1)
assert.equal(leaveDays('2026-08-12', '2026-08-14'), 3)

// --- Leave balance ---------------------------------------------------------
const em = { cl_total: 12, el_total: 15 }
const rem = leaveRemaining(em, { cl: 10, el: 15 })
assert.deepEqual(rem, { cl: 2, el: 0 })
assert.ok(leaveAllowed('CL', 2, rem))
assert.ok(!leaveAllowed('CL', 3, rem), 'CL beyond the balance must be refused')
assert.ok(!leaveAllowed('SL', 3, rem), 'SL draws on the same bucket as CL')
assert.ok(!leaveAllowed('EL', 1, rem))
assert.ok(leaveAllowed('LOP', 30, rem), 'loss of pay is unpaid, so never capped')
assert.deepEqual(leaveRemaining(em, {}), { cl: 12, el: 15 }, 'no leave taken yet')

// --- Pipeline --------------------------------------------------------------
const NOW = new Date('2026-08-12')
const deal = (over) => ({ stage: 'demo', value: 100000, created_at: '2026-08-10', ...over })

// Forecasting on the raw sum is how a pipeline lies. 100k at demo is worth 25k.
const pv = pipelineValue([
  deal({ stage: 'demo', value: 100000 }),
  deal({ stage: 'negotiation', value: 200000 }),
  deal({ stage: 'won', value: 500000 }),
  deal({ stage: 'lost', value: 900000 }),
])
assert.equal(pv.count, 2, 'won and lost are not open pipeline')
assert.equal(pv.raw, 300000)
assert.equal(pv.weighted, 100000 * 0.25 + 200000 * 0.8)

assert.equal(pipelineValue([]).weighted, 0)

// Health, worst first.
assert.equal(dealHealth(deal({ next_due: '2026-08-01', last_touch: '2026-08-11' }), NOW).key, 'overdue')
assert.equal(dealHealth(deal({ next_due: null, last_touch: '2026-08-11' }), NOW).key, 'nostep')
assert.equal(dealHealth(deal({ next_due: '2026-08-20', last_touch: '2026-07-01' }), NOW).key, 'cold')
assert.equal(dealHealth(deal({ next_due: '2026-08-20', last_touch: '2026-07-25' }), NOW).key, 'quiet')
assert.equal(dealHealth(deal({ next_due: '2026-08-20', last_touch: '2026-08-11' }), NOW).key, 'ok')
assert.equal(dealHealth(deal({ stage: 'won', next_due: null }), NOW).key, 'closed', 'closed deals need nothing')
assert.equal(dealHealth(deal({ next_due: '2026-08-12', last_touch: '2026-08-12' }), NOW).key, 'ok', 'due today is not overdue')

// A deal nobody ever touched counts from its creation, not as fresh.
assert.equal(daysQuiet(deal({ created_at: '2026-07-13', last_touch: null }), NOW), 30)

const ranked = needsAttention(
  [
    deal({ id: 1, next_due: '2026-08-20', last_touch: '2026-07-25' }), // quiet
    deal({ id: 2, next_due: '2026-08-01', last_touch: '2026-08-11' }), // overdue
    deal({ id: 3, next_due: '2026-08-20', last_touch: '2026-08-11' }), // fine
    deal({ id: 4, next_due: null, last_touch: '2026-08-11' }), // no next step
  ],
  NOW
)
assert.deepEqual(ranked.map((x) => x.deal.id), [2, 4, 1], 'worst first, healthy deals omitted')

// --- Statutory headcount triggers ------------------------------------------
assert.deepEqual(statutoryAlerts(5), [], 'well under both thresholds, stay quiet')
assert.equal(statutoryAlerts(8).length, 1, 'warn while ESI is still two hires away')
assert.match(statutoryAlerts(10)[0], /mandatory from 10/, 'ESI is triggered at 10, not 11')
assert.equal(statutoryAlerts(18).length, 2, 'ESI already due, EPF approaching')
assert.match(statutoryAlerts(20)[1], /mandatory from 20/)

// --- Dates in IST ----------------------------------------------------------
// 00:30 IST on the 13th is still the 12th in UTC. Rendering the UTC day would
// back-date invoices and mis-tag follow-ups as overdue for anyone working early.
process.env.TZ = 'UTC'
assert.equal(d('2026-08-12T19:00:00Z'), '2026-08-13', 'timestamps render on the Indian day')
assert.equal(d('2026-08-12'), '2026-08-12', 'a plain date column is left alone')
assert.equal(d(null), '')
assert.match(today(), /^\d{4}-\d{2}-\d{2}$/)

console.log('all checks passed')
