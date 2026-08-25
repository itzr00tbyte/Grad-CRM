import sql from '../../lib/db'
import { requireUser } from '../../lib/auth'
import SchoolsClient from './SchoolsClient'

export default async function SchoolsPage({ searchParams }) {
  const user = await requireUser('schools')
  const sp = await searchParams
  const q = (sp?.q || '').trim()
  const err = sp?.err

  const [rows, salesUsers] = await Promise.all([
    sql`
      select e.*, u.name as owner,
             (select c.name || coalesce(' (' || c.role_tag || ')', '') from contacts c where c.entity_id = e.id and c.deleted_at is null order by c.id limit 1) as poc_name,
             (select c.phone from contacts c where c.entity_id = e.id and c.deleted_at is null order by c.id limit 1) as poc_phone,
             (select c.email from contacts c where c.entity_id = e.id and c.deleted_at is null order by c.id limit 1) as poc_email,
             (select count(*)::int from deals dd where dd.entity_id = e.id and dd.stage not in ('won','lost') and dd.deleted_at is null) as open_deals
      from entities e left join users u on u.id = e.owner_id
      where e.deleted_at is null
      order by e.name`,
    sql`select id, name, role from users where active and role in ('admin','sales') order by name`,
  ])

  return <SchoolsClient
    initialRows={rows}
    err={err}
    initialSearch={q}
    user={user}
    salesUsers={salesUsers}
  />
}
