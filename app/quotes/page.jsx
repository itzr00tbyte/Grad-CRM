import sql from '../../lib/db'
import { requireUser } from '../../lib/auth'
import { inr, d } from '../../lib/fmt'
import { Card, Field, Tag, SearchableSelect } from '../../components/ui'
import { SubmitButton } from '../../components/submit'
import { createQuote } from './actions'

export default async function QuotesPage({ searchParams }) {
  const user = await requireUser('billing')
  const sp = await searchParams
  const isCreating = sp?.action === 'new'
  const isAdmin = user.role === 'admin'
  // showAll: admin can toggle between my quotes and all quotes
  const showAll = isAdmin && sp?.view !== 'mine'

  const [rows, schools] = await Promise.all([
    showAll
      ? sql`select q.*, e.name as school, u.name as owner_name,
                   (select c.name || coalesce(' (' || c.role_tag || ')', '') from contacts c where c.entity_id = e.id and c.deleted_at is null order by c.id limit 1) as poc_name,
                   coalesce(sum(round(qi.qty*qi.unit_price*(1+qi.gst_rate/100),2)),0) as total
            from quotes q
            join entities e on e.id = q.entity_id
            left join users u on u.id = q.owner_id
            left join quote_items qi on qi.quote_id = q.id
            where q.deleted_at is null
            group by q.id, e.name, e.id, u.name order by q.quote_date desc, q.id desc`
      : sql`select q.*, e.name as school, u.name as owner_name,
                   (select c.name || coalesce(' (' || c.role_tag || ')', '') from contacts c where c.entity_id = e.id and c.deleted_at is null order by c.id limit 1) as poc_name,
                   coalesce(sum(round(qi.qty*qi.unit_price*(1+qi.gst_rate/100),2)),0) as total
            from quotes q
            join entities e on e.id = q.entity_id
            left join users u on u.id = q.owner_id
            left join quote_items qi on qi.quote_id = q.id
            where q.deleted_at is null and (q.owner_id = ${user.id} or q.owner_id is null)
            group by q.id, e.name, e.id, u.name order by q.quote_date desc, q.id desc`,
    sql`select e.id, e.name,
               (select c.name || coalesce(' (' || c.role_tag || ')', '') from contacts c where c.entity_id = e.id and c.deleted_at is null order by c.id limit 1) as poc_name
        from entities e where e.deleted_at is null order by e.name`,
  ])

  const schoolOptions = schools.map((s) => [s.id, s.poc_name ? `${s.name} — POC: ${s.poc_name}` : s.name])

  return (
    <>
      <div className="page-header">
        <div className="page-title-group">
          <h1>Sales Quotes &amp; Proposals</h1>
          <p className="page-subtitle">
            {showAll ? 'All team quotes and proposals.' : 'My quotes and proposals.'}
            {' '}Generate official price quotations, commercial proposals, and track acceptance status.
          </p>
        </div>
        <div className="page-actions">
          {/* Admin toggle: My Quotes / All Quotes */}
          {isAdmin && (
            <div style={{ display: 'flex', gap: 0, border: '1px solid var(--line)', borderRadius: 'var(--r)', overflow: 'hidden' }}>
              <a href="/quotes?view=mine" className={`btn ${!showAll ? '' : 'ghost'}`}
                style={{ borderRadius: 0, border: 'none' }}>
                My Quotes
              </a>
              <a href="/quotes" className={`btn ${showAll ? '' : 'ghost'}`}
                style={{ borderRadius: 0, border: 'none', borderLeft: '1px solid var(--line)' }}>
                All Quotes
              </a>
            </div>
          )}
          <a href={isCreating ? '/quotes' : '/quotes?action=new'} className="btn">
            {isCreating ? 'Close Form' : '+ New Quote'}
          </a>
        </div>
      </div>

      {isCreating && (
        <Card title="Create New Draft Quote &amp; Proposal">
          <form action={createQuote}>
            <div className="row">
              <SearchableSelect
                label="Select School Account / POC"
                name="entity_id"
                options={schoolOptions}
                required
                placeholder="Search by contact person name or school..."
              />
              <Field label="Quote Notes / Proposal Terms" name="notes" wide type="textarea" placeholder="e.g. Valid for 30 days. Includes teacher training & curriculum license for 500 students." />
            </div>
            <div style={{ marginTop: 16, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <a href="/quotes" className="btn ghost">Cancel</a>
              <SubmitButton>Create Draft Quote</SubmitButton>
            </div>
          </form>
        </Card>
      )}

      <Card title={`${showAll ? 'All Team' : 'My'} Quotes (${rows.length})`}>
        <div className="scroll">
          <table>
            <thead>
              <tr>
                <th>Quote Number</th>
                <th>School Reference</th>
                <th>Contact Person (POC)</th>
                <th>Quote Date</th>
                <th>Status</th>
                {isAdmin && showAll && <th>Created By</th>}
                <th className="right">Total Amount</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan={isAdmin && showAll ? 7 : 6} className="muted" style={{ padding: '24px', textAlign: 'center' }}>
                  No quotes found. Click <strong>+ New Quote</strong> to create your first draft.
                </td></tr>
              ) : (
                rows.map((q) => (
                  <tr key={q.id}>
                    <td>
                      <a href={`/quotes/${q.id}`} style={{ fontWeight: 600 }}>{q.number}</a>
                    </td>
                    <td><strong>{q.school}</strong></td>
                    <td>{q.poc_name ? <span>👤 {q.poc_name}</span> : <span className="muted">No POC</span>}</td>
                    <td>{d(q.quote_date)}</td>
                    <td>
                      <Tag v={q.status} />
                    </td>
                    {isAdmin && showAll && (
                      <td>
                        {q.owner_name
                          ? <span style={{ fontSize: 12, fontWeight: 600 }}>{q.owner_name}</span>
                          : <span className="muted" style={{ fontSize: 11 }}>—</span>}
                      </td>
                    )}
                    <td className="right" style={{ fontWeight: 700 }}>{inr(q.total)}</td>
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
