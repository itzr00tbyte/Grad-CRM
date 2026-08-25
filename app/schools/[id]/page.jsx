import { notFound } from 'next/navigation'
import sql from '../../../lib/db'
import { requireUser, can } from '../../../lib/auth'
import SchoolDetailClient from './SchoolDetailClient'

export default async function SchoolPage({ params, searchParams }) {
  const user = await requireUser('schools')
  const id = Number((await params).id)
  const err = (await searchParams)?.err
  const folderId = (await searchParams)?.folder ? Number((await searchParams).folder) : null

  const [[e], contacts, deals, invoices, deliveries, docs, acts, [parentFolder], campaigns, salesUsers] = await Promise.all([
    sql`select e.*, u.name as owner_name from entities e left join users u on u.id = e.owner_id where e.id = ${id}`,
    sql`select * from contacts where entity_id = ${id} and deleted_at is null order by id`,
    sql`select * from deals where entity_id = ${id} and deleted_at is null order by created_at desc`,
    can(user, 'billing')
      ? sql`select * from invoice_totals where entity_id = ${id} order by invoice_date desc`
      : [],
    sql`select * from deliveries where entity_id = ${id} order by scheduled_on nulls last`,
    folderId
      ? sql`select * from documents where entity_id = ${id} and parent_id = ${folderId} order by is_folder desc, title asc`
      : sql`select * from documents where entity_id = ${id} and parent_id is null order by is_folder desc, title asc`,
    sql`select a.*, u.name as owner,
               c.name as contact_name
        from activities a
        left join users u on u.id = a.owner_id
        left join contacts c on c.id = a.contact_id
        where a.entity_id = ${id} and a.deleted_at is null order by a.created_at desc limit 50`,
    folderId ? sql`select parent_id from documents where id = ${folderId}` : [null],
    sql`select id, name from campaigns where status = 'active' order by name`,
    sql`select id, name, role from users where active and role in ('admin','sales') order by name`,
  ])
  if (!e) notFound()

  return (
    <SchoolDetailClient
      e={e}
      contacts={contacts}
      deals={deals}
      invoices={invoices}
      deliveries={deliveries}
      docs={docs}
      acts={acts}
      parentFolder={parentFolder}
      campaigns={campaigns}
      salesUsers={salesUsers}
      user={user}
      allowedBilling={can(user, 'billing')}
      allowedCrm={can(user, 'crm')}
      err={err}
      folderId={folderId}
    />
  )
}
