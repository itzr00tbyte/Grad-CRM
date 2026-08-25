/** Per-financial-year document numbering. The upsert is atomic, so concurrent
 *  issues get different numbers; counting existing rows did not. */
import sql from './db'
import { fyLabel, invoiceNumber, quoteNumber } from './gst'

async function nextSeq(kind, fy) {
  const [{ n }] = await sql`
    insert into counters (kind, fy, n) values (${kind}, ${fy}, 1)
    on conflict (kind, fy) do update set n = counters.n + 1
    returning n`
  return n
}

export async function nextInvoiceNumber() {
  const fy = fyLabel()
  return invoiceNumber(fy, await nextSeq('invoice', fy))
}

export async function nextQuoteNumber() {
  const fy = fyLabel()
  return quoteNumber(fy, await nextSeq('quote', fy))
}
