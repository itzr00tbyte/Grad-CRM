'use server'

import { revalidatePath } from 'next/cache'
import sql from '../../lib/db'
import { requireUser } from '../../lib/auth'

export async function addDelivery(formData) {
  await requireUser('delivery')
  const entityId = Number(formData.get('entity_id'))
  await sql`insert into deliveries (entity_id, invoice_id, title, kind, trainer, scheduled_on, notes)
            values (${entityId}, ${Number(formData.get('invoice_id')) || null},
                    ${formData.get('title')}, ${formData.get('kind') || 'session'},
                    ${formData.get('trainer') || null}, ${formData.get('scheduled_on') || null},
                    ${formData.get('notes') || null})`
  revalidatePath('/delivery')
  revalidatePath(`/schools/${entityId}`)
}

export async function setDeliveryStatus(formData) {
  await requireUser('delivery')
  const [row] = await sql`update deliveries set status = ${formData.get('status')}
                          where id = ${Number(formData.get('id'))} returning entity_id`
  revalidatePath('/delivery')
  revalidatePath(`/schools/${row.entity_id}`)
}
