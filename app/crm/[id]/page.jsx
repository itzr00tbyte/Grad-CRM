import { notFound } from 'next/navigation'
import sql from '../../../lib/db'
import { requireUser } from '../../../lib/auth'
import { inr, d } from '../../../lib/fmt'
import { Card, Field, Tag, STAGES } from '../../../components/ui'
import { updateDeal } from '../actions'
import { addActivity } from '../../actions'
import { SubmitButton } from '../../../components/submit'

export default async function DealPage({ params }) {
  await requireUser('crm')
  const id = Number((await params).id)

  const [[deal], acts, quotes] = await Promise.all([
    sql`select dl.*, e.name as school from deals dl join entities e on e.id = dl.entity_id where dl.id = ${id}`,
    sql`select a.*, u.name as owner from activities a left join users u on u.id = a.owner_id
        where a.deal_id = ${id} order by a.created_at desc`,
    sql`select * from quotes where deal_id = ${id} order by quote_date desc`,
  ])
  if (!deal) notFound()

  return (
    <>
      <div className="page-header">
        <div className="page-title-group">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <a href="/crm" className="muted" style={{ fontSize: 13 }}>
              ← Pipeline
            </a>
          </div>
          <h1 style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 12 }}>
            {deal.title} <Tag v={deal.stage} />
          </h1>
          <p className="page-subtitle">
            Account: <a href={`/schools/${deal.entity_id}`} style={{ fontWeight: 600 }}>{deal.school}</a> · Opportunity Value: <strong>{inr(deal.value)}</strong>
          </p>
        </div>
        <div className="page-actions">
          <a href={`/quotes/new?entity=${deal.entity_id}&deal=${deal.id}`} className="btn">
            + Generate Quote
          </a>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div>
          <Card title="Deal Details & Parameters">
            <form action={updateDeal}>
              <input type="hidden" name="id" value={deal.id} />
              <div className="row">
                <Field label="Deal Title" name="title" value={deal.title} required />
                <Field label="Pipeline Stage" name="stage" options={STAGES} value={deal.stage} />
                <Field label="Deal Value ₹" name="value" type="number" step="0.01" value={deal.value} />
                <Field label="Expected Close Date" name="expected_close" type="date" value={d(deal.expected_close)} />
                <Field label="Deal Notes / Scope" name="notes" type="textarea" wide value={deal.notes} />
              </div>
              <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
                <SubmitButton>Save Changes</SubmitButton>
              </div>
            </form>
          </Card>

          <Card title="Linked Quotes & Proposals" actions={<a href={`/quotes/new?entity=${deal.entity_id}&deal=${deal.id}`} className="muted" style={{ fontWeight: 600 }}>New Quote →</a>}>
            <div className="scroll">
              <table>
                <thead>
                  <tr>
                    <th>Quote #</th>
                    <th>Date</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {quotes.length === 0 ? (
                    <tr><td colSpan={3} className="muted" style={{ padding: '16px' }}>No quotes generated for this deal yet.</td></tr>
                  ) : (
                    quotes.map((q) => (
                      <tr key={q.id}>
                        <td>
                          <a href={`/quotes/${q.id}`} style={{ fontWeight: 600 }}>{q.number}</a>
                        </td>
                        <td>{d(q.quote_date)}</td>
                        <td>
                          <Tag v={q.status} />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        <div>
          <Card title="Log Activity & Follow-up">
            <form action={addActivity} className="row" style={{ marginBottom: 16 }}>
              <input type="hidden" name="deal_id" value={deal.id} />
              <input type="hidden" name="entity_id" value={deal.entity_id} />
              <Field label="Touchpoint Kind" name="kind" options={['note', 'call', 'meeting', 'email', 'task']} />
              <Field label="Note / Discussion" name="note" required placeholder="Details of touchpoint..." />
              <Field label="Follow-up Date" name="due_on" type="date" />
              <div className="field">
                <SubmitButton>Log Touchpoint</SubmitButton>
              </div>
            </form>

            <div className="scroll">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Kind</th>
                    <th>Note</th>
                    <th>Follow-up</th>
                    <th>Logged By</th>
                  </tr>
                </thead>
                <tbody>
                  {acts.length === 0 ? (
                    <tr><td colSpan={5} className="muted" style={{ padding: '16px' }}>No activities logged for this deal.</td></tr>
                  ) : (
                    acts.map((a) => (
                      <tr key={a.id}>
                        <td style={{ width: 100 }}>{d(a.created_at)}</td>
                        <td style={{ width: 80 }}>
                          <Tag v={a.kind} />
                        </td>
                        <td>{a.note}</td>
                        <td className="muted">{a.due_on && !a.done_at ? `due ${d(a.due_on)}` : ''}</td>
                        <td className="muted">{a.owner || '—'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>
    </>
  )
}
