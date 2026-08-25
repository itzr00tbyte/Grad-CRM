'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import sql from '../../lib/db'
import { requireUser } from '../../lib/auth'

const f = (fd, k) => {
  const v = fd.get(k)
  return v === '' || v == null ? null : String(v)
}

export async function createDeal(formData) {
  const user = await requireUser('crm')
  const entityId = Number(formData.get('entity_id'))
  try {
    const campaignId = formData.get('campaign_id') ? Number(formData.get('campaign_id')) : null
    const [row] = await sql`
      insert into deals (entity_id, title, stage, value, expected_close, owner_id, campaign_id, notes)
      values (${entityId}, ${f(formData, 'title')}, ${f(formData, 'stage') || 'inquiry'},
              ${Number(formData.get('value')) || 0}, ${f(formData, 'expected_close')}, ${user.id}, ${campaignId}, ${f(formData, 'notes')})
      returning id`
      
    await sql`insert into audit_logs (table_name, record_id, user_id, action, changes)
              values ('deals', ${row.id}, ${user.id}, 'create', ${JSON.stringify({ stage: f(formData, 'stage') || 'inquiry', value: Number(formData.get('value')) || 0 })})`
              
    revalidatePath('/crm')
    revalidatePath(`/schools/${entityId}`)
    if (formData.get('stay')) return
    redirect(`/crm/${row.id}`)
  } catch (err) {
    if (err.code === '23505') {
      redirect('/crm?err=' + encodeURIComponent('A deal with that constraint already exists.'))
    }
    throw err
  }
}

/** Patches only the fields the submitted form actually contained, so the board's
 *  stage-only form cannot wipe notes/close-date it never showed. */
export async function updateDeal(formData) {
  await requireUser('crm')
  const id = Number(formData.get('id'))
  const patch = {}
  for (const k of ['title', 'stage', 'expected_close', 'notes']) {
    if (formData.has(k)) patch[k] = f(formData, k)
  }
  if (formData.has('value')) patch.value = Number(formData.get('value')) || 0
  if (Object.keys(patch).length === 0) return

  const [deal] = await sql`update deals set ${sql(patch)} where id = ${id} returning entity_id`

  await sql`insert into audit_logs (table_name, record_id, user_id, action, changes)
            values ('deals', ${id}, ${user.id}, 'update', ${JSON.stringify(patch)})`

  // Won deal promotes the school to an active account — the one automation worth having.
  if (patch.stage === 'won') {
    await sql`update entities set status = 'active' where id = ${deal.entity_id} and status <> 'active'`
    await sql`insert into audit_logs (table_name, record_id, user_id, action, changes)
              values ('entities', ${deal.entity_id}, ${user.id}, 'update_status', ${JSON.stringify({ status: 'active' })})`
  }

  revalidatePath('/crm')
  revalidatePath(`/crm/${id}`)
  revalidatePath(`/schools/${deal.entity_id}`)
}

export async function deleteDeal(formData) {
  const user = await requireUser('crm')
  const id = Number(formData.get('id'))
  const [deal] = await sql`update deals set deleted_at = now() where id = ${id} returning entity_id`
  await sql`insert into audit_logs (table_name, record_id, user_id, action, changes)
            values ('deals', ${id}, ${user.id}, 'delete', '{}')`
  revalidatePath('/crm')
  revalidatePath(`/schools/${deal.entity_id}`)
  redirect('/crm')
}

