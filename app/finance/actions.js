'use server'

import { revalidatePath } from 'next/cache'
import sql from '../../lib/db'
import { requireUser } from '../../lib/auth'

/** Default TDS on vendor bills. Deduct on the amount excluding GST — so `amount` here is ex-GST.
 *  ponytail: flat rates, no threshold tracking across the year. Add a per-payee YTD check if
 *  vendor volume ever grows past a handful of bills. */
const TDS_RATES = { '194J': 10, '194J_technical': 2, '194C_individual': 1, '194C_other': 2 }

export async function addExpense(formData) {
  await requireUser('finance')
  const amount = Number(formData.get('amount')) || 0
  const section = String(formData.get('tds_section') || 'none')
  const override = formData.get('tds_amount')
  const tds =
    override !== '' && override != null
      ? Number(override)
      : Math.round(((amount * (TDS_RATES[section] || 0)) / 100) * 100) / 100

  await sql`insert into expenses (vendor, bill_date, amount, category, tds_section, tds_amount, entity_id, paid, notes)
            values (${formData.get('vendor')}, ${formData.get('bill_date') || null}, ${amount},
                    ${formData.get('category') || null}, ${section}, ${tds},
                    ${Number(formData.get('entity_id')) || null}, ${!!formData.get('paid')},
                    ${formData.get('notes') || null})`
  revalidatePath('/finance')
}

export async function togglePaid(formData) {
  await requireUser('finance')
  await sql`update expenses set paid = not paid where id = ${Number(formData.get('id'))}`
  revalidatePath('/finance')
}
