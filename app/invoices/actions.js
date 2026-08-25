'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import sql from '../../lib/db'
import { requireUser } from '../../lib/auth'
import { nextInvoiceNumber } from '../../lib/seq'
import { ORG } from '../../lib/org'

export async function createInvoice(formData) {
  await requireUser('billing')
  const entityId = Number(formData.get('entity_id'))
  const [e] = await sql`select * from entities where id = ${entityId}`
  if (!e) return
  const place = String(formData.get('place_of_supply') || e.state || ORG.state)
  const [inv] = await sql`
    insert into invoices (entity_id, number, place_of_supply, intra_state, due_date, notes)
    values (${entityId}, ${await nextInvoiceNumber()}, ${place}, ${place === ORG.state},
            ${formData.get('due_date') || null}, ${formData.get('notes') || null})
    returning id`
  redirect(`/invoices/${inv.id}`)
}

export async function invoiceFromQuote(formData) {
  await requireUser('billing')
  const quoteId = Number(formData.get('quote_id'))
  const [q] = await sql`select q.*, e.state from quotes q join entities e on e.id = q.entity_id where q.id = ${quoteId}`
  if (!q) return
  const place = q.state || ORG.state

  const invId = await sql.begin(async (tx) => {
    const [inv] = await tx`
      insert into invoices (entity_id, quote_id, number, place_of_supply, intra_state, notes)
      values (${q.entity_id}, ${q.id}, ${await nextInvoiceNumber()}, ${place}, ${place === ORG.state}, ${q.notes})
      returning id`
    await tx`
      insert into invoice_items (invoice_id, program_id, description, sac_code, qty, unit_price, gst_rate)
      select ${inv.id}, qi.program_id, qi.description, p.sac_code, qi.qty, qi.unit_price, qi.gst_rate
      from quote_items qi left join programs p on p.id = qi.program_id
      where qi.quote_id = ${q.id}`
    await tx`update quotes set status = 'accepted' where id = ${q.id}`
    return inv.id
  })

  redirect(`/invoices/${invId}`)
}

export async function addInvoiceItem(formData) {
  await requireUser('billing')
  const invoiceId = Number(formData.get('invoice_id'))
  const programId = Number(formData.get('program_id')) || null
  const [p] = programId ? await sql`select * from programs where id = ${programId}` : [null]

  const description = String(formData.get('description') || '').trim() || p?.name
  if (!description) return
  const rate = formData.get('unit_price')
  const gst = formData.get('gst_rate')

  await sql`insert into invoice_items (invoice_id, program_id, description, sac_code, qty, unit_price, gst_rate)
            values (${invoiceId}, ${programId}, ${description}, ${p?.sac_code ?? null},
                    ${Number(formData.get('qty')) || 1},
                    ${rate === '' || rate == null ? (p?.unit_price ?? 0) : Number(rate)},
                    ${gst === '' || gst == null ? (p?.gst_rate ?? 18) : Number(gst)})`
  revalidatePath(`/invoices/${invoiceId}`)
}

export async function deleteInvoiceItem(formData) {
  await requireUser('billing')
  const invoiceId = Number(formData.get('invoice_id'))
  await sql`delete from invoice_items where id = ${Number(formData.get('id'))}`
  revalidatePath(`/invoices/${invoiceId}`)
}

export async function updateInvoice(formData) {
  await requireUser('billing')
  const id = Number(formData.get('id'))
  const place = String(formData.get('place_of_supply') || ORG.state)
  await sql`update invoices set
              status = ${formData.get('status')},
              place_of_supply = ${place},
              intra_state = ${place === ORG.state},
              due_date = ${formData.get('due_date') || null},
              notes = ${formData.get('notes') || null}
            where id = ${id}`
  revalidatePath(`/invoices/${id}`)
}

export async function addPayment(formData) {
  await requireUser('finance')
  const invoiceId = Number(formData.get('invoice_id'))
  const amount = Number(formData.get('amount'))
  if (!(amount > 0)) return
  await sql`insert into payments (invoice_id, paid_on, amount, mode, ref)
            values (${invoiceId}, ${formData.get('paid_on') || null}, ${amount},
                    ${formData.get('mode') || null}, ${formData.get('ref') || null})`
  // Mark paid once receipts cover the invoice.
  await sql`update invoices set status = 'paid'
            where id = ${invoiceId} and status = 'issued'
              and (select total - paid from invoice_totals where id = ${invoiceId}) <= 0`
  revalidatePath(`/invoices/${invoiceId}`)
  revalidatePath('/finance')
}
