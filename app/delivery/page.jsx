import sql from '../../lib/db'
import { requireUser } from '../../lib/auth'
import { d } from '../../lib/fmt'
import { Card, Field, Tag } from '../../components/ui'
import { SubmitButton } from '../../components/submit'
import { addDelivery, setDeliveryStatus } from './actions'

export default async function DeliveryPage({ searchParams }) {
  await requireUser('delivery')
  const sp = await searchParams
  const entity = sp?.entity
  const isScheduling = sp?.action === 'new'

  const [rows, schools, gaps] = await Promise.all([
    sql`select dl.*, e.name as school from deliveries dl join entities e on e.id = dl.entity_id
        order by dl.status = 'done', dl.scheduled_on nulls last`,
    sql`select id, name from entities order by name`,
    sql`select distinct e.id, e.name from deals dl join entities e on e.id = dl.entity_id
        where dl.stage = 'won' and not exists (select 1 from deliveries x where x.entity_id = e.id)`,
  ])

  return (
    <>
      <div className="page-header">
        <div className="page-title-group">
          <h1>Delivery & Operations</h1>
          <p className="page-subtitle">Schedule teacher training, curriculum delivery, and project milestones.</p>
        </div>
        <div className="page-actions">
          <a href={isScheduling ? '/delivery' : '/delivery?action=new'} className="btn">
            {isScheduling ? 'Close Form' : '+ Schedule Session'}
          </a>
        </div>
      </div>

      {gaps.length > 0 && (
        <div className="err">
          <strong>⚠️ Won Deals Missing Delivery Plan:</strong>{' '}
          {gaps.map((g) => (
            <a key={g.id} href={`/delivery?entity=${g.id}`} style={{ marginRight: 8, textDecoration: 'underline' }}>
              {g.name}
            </a>
          ))}
        </div>
      )}

      {isScheduling && (
        <Card title="Schedule a Session or Deliverable">
          <form action={addDelivery}>
            <div className="row">
              <Field label="School Account" name="entity_id" options={schools.map((s) => [s.id, s.name])} value={entity} required />
              <Field label="Milestone Title" name="title" required placeholder="Teacher training — batch 1" />
              <Field label="Kind" name="kind" options={['session', 'deliverable']} />
              <Field label="Assigned Trainer" name="trainer" placeholder="e.g. Finnish partner / local lead" />
              <Field label="Scheduled Date" name="scheduled_on" type="date" />
              <Field label="Notes" name="notes" placeholder="Session details..." />
            </div>
            <div style={{ marginTop: 12, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <a href="/delivery" className="btn ghost">Cancel</a>
              <SubmitButton>Schedule Milestone</SubmitButton>
            </div>
          </form>
        </Card>
      )}

      <Card title={`Delivery Schedule (${rows.length})`}>
        <div className="scroll">
          <table>
            <thead>
              <tr>
                <th>Scheduled Date</th>
                <th>School Account</th>
                <th>Milestone Title</th>
                <th>Kind</th>
                <th>Trainer</th>
                <th>Status</th>
                <th className="right">Update Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan={7} className="muted" style={{ padding: '24px', textAlign: 'center' }}>No delivery milestones scheduled.</td></tr>
              ) : (
                rows.map((x) => (
                  <tr key={x.id}>
                    <td>{d(x.scheduled_on)}</td>
                    <td>
                      <a href={`/schools/${x.entity_id}`} style={{ fontWeight: 600 }}>{x.school}</a>
                    </td>
                    <td><strong>{x.title}</strong></td>
                    <td><span className="tag">{x.kind}</span></td>
                    <td>{x.trainer || 'Unassigned'}</td>
                    <td>
                      <Tag v={x.status} />
                    </td>
                    <td className="right">
                      <form action={setDeliveryStatus} className="row" style={{ gap: 4, justifyContent: 'flex-end' }}>
                        <input type="hidden" name="id" value={x.id} />
                        <select name="status" defaultValue={x.status} style={{ padding: '3px 6px', fontSize: 12 }}>
                          {['planned', 'done', 'blocked'].map((s) => (
                            <option key={s}>{s}</option>
                          ))}
                        </select>
                        <SubmitButton className="ghost" style={{ padding: '3px 8px', fontSize: 12 }}>
                          Set
                        </SubmitButton>
                      </form>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  )
}
