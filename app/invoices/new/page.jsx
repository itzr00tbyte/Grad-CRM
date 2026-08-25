import sql from '../../../lib/db'
import { requireUser } from '../../../lib/auth'
import { Card, Field } from '../../../components/ui'
import { createInvoice } from '../actions'

export default async function NewInvoicePage({ searchParams }) {
  await requireUser('billing')
  const sp = await searchParams
  const schools = await sql`select id, name from entities order by name`

  return (
    <Card title="New invoice">
      <form action={createInvoice} className="row">
        <Field label="School" name="entity_id" options={schools.map((s) => [s.id, s.name])} value={sp?.entity} required />
        <Field label="Place of supply" name="place_of_supply" placeholder="defaults to school's state" />
        <Field label="Due date" name="due_date" type="date" />
        <div className="field">
          <button type="submit">Create</button>
        </div>
      </form>
    </Card>
  )
}
