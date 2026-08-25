/** GST maths + invoice numbering. Rule 46 fields live on the invoice/entity rows; this is the money part. */

const r2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100

/**
 * @param items [{qty, unit_price, gst_rate}]
 * @param intraState true => CGST+SGST (within Telangana), false => IGST
 */
export function totals(items, intraState) {
  let taxable = 0
  let tax = 0
  for (const it of items) {
    const line = r2(Number(it.qty) * Number(it.unit_price))
    taxable += line
    tax += r2((line * Number(it.gst_rate)) / 100)
  }
  taxable = r2(taxable)
  tax = r2(tax)
  const half = r2(tax / 2)
  return {
    taxable,
    cgst: intraState ? half : 0,
    sgst: intraState ? r2(tax - half) : 0, // remainder side absorbs the odd paisa
    igst: intraState ? 0 : tax,
    tax,
    total: r2(taxable + tax),
  }
}

export function lineTotal(it) {
  const line = r2(Number(it.qty) * Number(it.unit_price))
  return { taxable: line, tax: r2((line * Number(it.gst_rate)) / 100) }
}

/** Indian financial year label for a date: 2026-08-12 -> "26-27". */
export function fyLabel(d = new Date()) {
  const y = d.getFullYear()
  const start = d.getMonth() + 1 >= 4 ? y : y - 1
  return `${String(start).slice(2)}-${String(start + 1).slice(2)}`
}

/** 1 April of the financial year containing d, as YYYY-MM-DD. */
export function fyStart(d = new Date()) {
  const y = d.getFullYear()
  return `${d.getMonth() + 1 >= 4 ? y : y - 1}-04-01`
}

/** "SG/26-27/0007" — 13 chars, under the Rule 46 16-char cap, sequential per FY. */
export function invoiceNumber(fy, seq) {
  return `SG/${fy}/${String(seq).padStart(4, '0')}`
}

export function quoteNumber(fy, seq) {
  return `Q/${fy}/${String(seq).padStart(4, '0')}`
}

// --- Identity ---------------------------------------------------------------
// A wrong GSTIN on an invoice costs the school its input tax credit and is a pain to
// amend later, so typos get caught at entry. The last character is a mod-36 checksum,
// which catches a transposed pair that a length-and-shape check would wave through.

const B36 = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'
const PAN_RE = /^[A-Z]{5}[0-9]{4}[A-Z]$/
const GSTIN_RE = /^[0-3][0-9][A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/

export const isPan = (v) => PAN_RE.test(String(v || '').toUpperCase())

export function gstinCheckDigit(first14) {
  let sum = 0
  for (let i = 0; i < 14; i++) {
    const product = B36.indexOf(first14[i]) * (i % 2 ? 2 : 1)
    sum += Math.floor(product / 36) + (product % 36)
  }
  return B36[(36 - (sum % 36)) % 36]
}

export function isGstin(v) {
  const s = String(v || '').toUpperCase()
  return GSTIN_RE.test(s) && s[14] === gstinCheckDigit(s.slice(0, 14))
}

/** The PAN embedded in a GSTIN, positions 3-12. Handy for cross-checking the two fields. */
export const panFromGstin = (v) => String(v || '').toUpperCase().slice(2, 12)
