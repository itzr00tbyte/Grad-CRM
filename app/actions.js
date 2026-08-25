'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { login, logout, requireUser } from '../lib/auth'
import sql from '../lib/db'

export async function loginAction(_prev, formData) {
  const { error } = await login(String(formData.get('email') || ''), String(formData.get('password') || ''))
  if (error) return error
  redirect('/')
}

export async function logoutAction() {
  await logout()
  redirect('/login')
}

/** Shared: log an activity / follow-up task against a school or deal. */
export async function addActivity(formData) {
  const user = await requireUser('schools')
  const entityId = Number(formData.get('entity_id')) || null
  const dealId = Number(formData.get('deal_id')) || null
  const durationMinutes = formData.get('duration_minutes') ? Number(formData.get('duration_minutes')) : null
  const outcome = (formData.get('outcome') || '').toString().trim() || null

  await sql`insert into activities (entity_id, deal_id, kind, note, due_on, duration_minutes, outcome, owner_id)
            values (${entityId}, ${dealId}, ${formData.get('kind') || 'note'},
                    ${formData.get('note')}, ${formData.get('due_on') || null}, 
                    ${durationMinutes}, ${outcome}, ${user.id})`
  revalidatePath('/')
  if (entityId) revalidatePath(`/schools/${entityId}`)
  if (dealId) revalidatePath(`/crm/${dealId}`)
}

export async function completeActivity(formData) {
  await requireUser('schools')
  const [a] = await sql`update activities set done_at = now() where id = ${Number(formData.get('id'))}
                        returning entity_id, deal_id`
  revalidatePath('/')
  revalidatePath('/crm')
  if (a?.deal_id) revalidatePath(`/crm/${a.deal_id}`)
  if (a?.entity_id) revalidatePath(`/schools/${a.entity_id}`)
}
