'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import sql from '../../lib/db'
import { requireUser } from '../../lib/auth'
import { nextQuoteNumber } from '../../lib/seq'

export async function createQuote(formData) {
  const user = await requireUser('billing')
  const entityId = Number(formData.get('entity_id'))
  const dealId = Number(formData.get('deal_id')) || null
  const number = await nextQuoteNumber()
  const [q] = await sql`insert into quotes (entity_id, deal_id, number, notes, owner_id)
                        values (${entityId}, ${dealId}, ${number}, ${formData.get('notes') || null}, ${user.id})
                        returning id`
  redirect(`/quotes/${q.id}`)
}

/** Blank price/GST/description fall back to the catalog row — no client-side JS needed. */
export async function addQuoteItem(formData) {
  await requireUser('billing')
  const quoteId = Number(formData.get('quote_id'))
  const programId = Number(formData.get('program_id')) || null
  const [p] = programId ? await sql`select * from programs where id = ${programId}` : [null]

  const description = String(formData.get('description') || '').trim() || p?.name
  if (!description) return
  const rate = formData.get('unit_price')
  const gst = formData.get('gst_rate')

  await sql`insert into quote_items (quote_id, program_id, description, qty, unit_price, gst_rate)
            values (${quoteId}, ${programId}, ${description},
                    ${Number(formData.get('qty')) || 1},
                    ${rate === '' || rate == null ? (p?.unit_price ?? 0) : Number(rate)},
                    ${gst === '' || gst == null ? (p?.gst_rate ?? 18) : Number(gst)})`
  revalidatePath(`/quotes/${quoteId}`)
}

export async function deleteQuoteItem(formData) {
  await requireUser('billing')
  const quoteId = Number(formData.get('quote_id'))
  await sql`delete from quote_items where id = ${Number(formData.get('id'))}`
  revalidatePath(`/quotes/${quoteId}`)
}

export async function updateQuote(formData) {
  await requireUser('billing')
  const id = Number(formData.get('id'))
  await sql`update quotes set status = ${formData.get('status')}, notes = ${formData.get('notes') || null}
            where id = ${id}`
  revalidatePath(`/quotes/${id}`)
}
