'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import sql from '../../lib/db'
import { requireUser } from '../../lib/auth'

const f = (formData, key) => (formData.get(key) || '').toString().trim() || null

export async function createCampaign(formData) {
  const user = await requireUser('campaigns')
  const [row] = await sql`
    insert into campaigns (name, start_date, end_date, budget, owner_id)
    values (${f(formData, 'name')}, ${f(formData, 'start_date')}, ${f(formData, 'end_date')},
            ${Number(formData.get('budget')) || null}, ${user.id})
    returning id`
  redirect(`/campaigns/${row.id}`)
}

export async function updateCampaign(formData) {
  await requireUser('campaigns')
  const id = Number(formData.get('id'))
  await sql`
    update campaigns set
      name = ${f(formData, 'name')}, status = ${f(formData, 'status')},
      start_date = ${f(formData, 'start_date')}, end_date = ${f(formData, 'end_date')},
      budget = ${Number(formData.get('budget')) || null}
    where id = ${id}
  `
  revalidatePath(`/campaigns/${id}`)
}

export async function addTargetEntity(formData) {
  await requireUser('campaigns')
  const campaignId = Number(formData.get('campaign_id'))
  const entityId = Number(formData.get('entity_id'))
  try {
    await sql`insert into campaign_entities (campaign_id, entity_id) values (${campaignId}, ${entityId})`
  } catch (err) {
    if (err.code !== '23505') throw err // ignore unique violation if already added
  }
  revalidatePath(`/campaigns/${campaignId}`)
}

export async function removeTargetEntity(formData) {
  await requireUser('campaigns')
  const campaignId = Number(formData.get('campaign_id'))
  const entityId = Number(formData.get('entity_id'))
  await sql`delete from campaign_entities where campaign_id = ${campaignId} and entity_id = ${entityId}`
  revalidatePath(`/campaigns/${campaignId}`)
}
