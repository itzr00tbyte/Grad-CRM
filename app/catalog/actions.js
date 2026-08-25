'use server'

import { revalidatePath } from 'next/cache'
import sql from '../../lib/db'
import { requireUser } from '../../lib/auth'

export async function saveProgram(formData) {
  await requireUser('catalog')
  const row = {
    name: String(formData.get('name') || ''),
    vendor: String(formData.get('vendor') || ''),
    unit: String(formData.get('unit') || 'per_school'),
    unit_price: Number(formData.get('unit_price')) || 0,
    sac_code: String(formData.get('sac_code') || ''),
    gst_rate: Number(formData.get('gst_rate')) || 0,
  }
  const id = Number(formData.get('id'))
  if (id) await sql`update programs set ${sql(row)} where id = ${id}`
  else await sql`insert into programs ${sql(row)}`
  revalidatePath('/catalog')
}
