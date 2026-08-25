import sql from '../../../lib/db'
import { requireUser } from '../../../lib/auth'
import { Card, Field, SearchableSelect } from '../../../components/ui'
import { createQuote } from '../actions'
import { SubmitButton } from '../../../components/submit'

export default async function NewQuotePage({ searchParams }) {
  await requireUser('billing')
  const sp = await searchParams
  const schools = await sql`
    select e.id, e.name,
           (select c.name || coalesce(' (' || c.role_tag || ')', '') from contacts c where c.entity_id = e.id and c.deleted_at is null order by c.id limit 1) as poc_name
    from entities e where e.deleted_at is null order by e.name`
  const schoolOptions = schools.map((s) => [s.id, s.poc_name ? `${s.name} — POC: ${s.poc_name}` : s.name])

  return (
    <Card title="Create New Sales Quote">
      <form action={createQuote}>
        <input type="hidden" name="deal_id" value={sp?.deal || ''} />
        <div className="row">
          <SearchableSelect
            label="Select School Account / POC"
            name="entity_id"
            options={schoolOptions}
            value={sp?.entity}
            required
            placeholder="Type contact person name or school to search..."
          />
          <Field label="Quote Notes / Proposal Terms" name="notes" wide type="textarea" placeholder="e.g. Valid for 30 days. Includes curriculum license & teacher training." />
        </div>
        <div style={{ marginTop: 16, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <a href="/quotes" className="btn ghost">Cancel</a>
          <SubmitButton>Create Draft Quote</SubmitButton>
        </div>
      </form>
    </Card>
  )
}
