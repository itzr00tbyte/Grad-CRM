import sql from '../../lib/db'
import { requireUser } from '../../lib/auth'
import { inr, d } from '../../lib/fmt'
import { Card, Field, Tag, STAGES, KPICard, SearchableSelect } from '../../components/ui'
import { SubmitButton } from '../../components/submit'
import { OPEN_STAGES, CLOSED_STAGES, STAGE_ODDS, pipelineValue, needsAttention, dealHealth, daysQuiet } from '../../lib/pipeline'
import { createDeal, updateDeal } from './actions'
import { completeActivity } from '../actions'

const CLOSED_SHOWN = 6
const OPEN_SHOWN = 50

export default async function CrmPage({ searchParams }) {
  const user = await requireUser('crm')
  const sp = await searchParams
  const mine = sp?.mine === '1'
  const isCreating = sp?.action === 'new'

  const [deals, schools] = await Promise.all([
    sql`
      select dl.*, e.name as school, u.name as owner,
             (select c.name || coalesce(' (' || c.role_tag || ')', '') from contacts c where c.entity_id = e.id and c.deleted_at is null order by c.id limit 1) as poc_name,
             (select max(a.created_at) from activities a where a.deal_id = dl.id) as last_touch,
             na.due_on as next_due, na.id as next_activity_id
      from deals dl
      join entities e on e.id = dl.entity_id
      left join users u on u.id = dl.owner_id
      left join lateral (
        select a.id, a.due_on from activities a
        where a.deal_id = dl.id and a.done_at is null and a.due_on is not null and a.deleted_at is null
        order by a.due_on limit 1
      ) na on true
      where dl.deleted_at is null
      ${mine ? sql`and dl.owner_id = ${user.id}` : sql``}
      order by dl.expected_close nulls last`,
    sql`select e.id, e.name,
               (select c.name || coalesce(' (' || c.role_tag || ')', '') from contacts c where c.entity_id = e.id and c.deleted_at is null order by c.id limit 1) as poc_name
        from entities e where e.deleted_at is null order by e.name`,
  ])

  const schoolOptions = schools.map((s) => [s.id, s.poc_name ? `${s.name} — POC: ${s.poc_name}` : s.name])
  const value = pipelineValue(deals)
  const attention = needsAttention(deals)

  return (
    <>
      <div className="page-header">
        <div className="page-title-group">
          <h1>Sales Pipeline & Deals</h1>
          <p className="page-subtitle">Track opportunities, manage stage progression, and engage contact persons.</p>
        </div>
        <div className="page-actions">
          <div style={{ display: 'flex', gap: 4, background: 'var(--line-soft)', padding: 3, borderRadius: 'var(--r-sm)' }}>
            <a
              href="/crm"
              className={`btn ${!mine ? '' : 'ghost'}`}
              style={{ padding: '5px 12px', fontSize: '12px', border: 0 }}
            >
              All Deals
            </a>
            <a
              href="/crm?mine=1"
              className={`btn ${mine ? '' : 'ghost'}`}
              style={{ padding: '5px 12px', fontSize: '12px', border: 0 }}
            >
              My Deals
            </a>
          </div>
          <a
            href={isCreating ? '/crm' : '/crm?action=new'}
            className="btn"
          >
            {isCreating ? 'Close Form' : '+ New Deal'}
          </a>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid">
        <KPICard
          label="Weighted Forecast"
          value={inr(value.weighted)}
          subtext={`${inr(value.raw)} raw across ${value.count} open deal(s)`}
        />
        <KPICard
          label="Needs Attention"
          value={attention.length}
          subtext={attention.length === 0 ? 'All open deals have follow-ups scheduled' : 'Deals with overdue follow-ups or no next step'}
          trend={{ type: attention.length > 0 ? 'down' : 'up', value: attention.length > 0 ? 'Action Required' : 'Healthy' }}
        />
        <KPICard
          label="Pipeline Density"
          value={`${deals.filter(d => !['won','lost'].includes(d.stage)).length} Active`}
          subtext={`${deals.filter(d => d.stage === 'won').length} Won · ${deals.filter(d => d.stage === 'lost').length} Lost`}
        />
      </div>

      {/* Create Deal Card */}
      {isCreating && (
        <Card title="Create New Sales Deal">
          <form action={createDeal}>
            <div className="row">
              <SearchableSelect
                label="Select School Account / POC"
                name="entity_id"
                options={schoolOptions}
                required
                placeholder="Search contact person name or school..."
              />
              <Field label="Deal Title" name="title" required placeholder="e.g. 2026 Preschool Curriculum Package" />
              <Field label="Stage" name="stage" options={STAGES} />
              <Field label="Value ₹" name="value" type="number" step="0.01" placeholder="150000" />
              <Field label="Expected Close Date" name="expected_close" type="date" />
            </div>
            <div style={{ marginTop: 12, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <a href="/crm" className="btn ghost">Cancel</a>
              <SubmitButton>Create Opportunity</SubmitButton>
            </div>
          </form>
        </Card>
      )}

      {/* Needs Attention Warning Table */}
      {attention.length > 0 && (
        <Card title={`⚠️ Deals Needing Attention (${attention.length})`}>
          <div className="scroll">
            <table>
              <thead>
                <tr>
                  <th>Deal Title</th>
                  <th>School Account</th>
                  <th>Contact Person (POC)</th>
                  <th>Stage</th>
                  <th className="right">Value</th>
                  <th>Last Touch</th>
                  <th>Health Status</th>
                  <th className="right noprint">Quick Action</th>
                </tr>
              </thead>
              <tbody>
                {attention.map(({ deal, health }) => (
                  <tr key={deal.id}>
                    <td>
                      <a href={`/crm/${deal.id}`} style={{ fontWeight: 600 }}>
                        {deal.title}
                      </a>
                    </td>
                    <td>{deal.school}</td>
                    <td>{deal.poc_name ? <span>👤 {deal.poc_name}</span> : <span className="muted">No POC</span>}</td>
                    <td>
                      <Tag v={deal.stage} />
                    </td>
                    <td className="right" style={{ fontWeight: 700 }}>
                      {inr(deal.value)}
                    </td>
                    <td className="muted">{deal.last_touch ? `${daysQuiet(deal)}d ago` : 'Never'}</td>
                    <td>
                      <span className={`tag ${health.key}`}>{health.label}</span>
                    </td>
                    <td className="right noprint">
                      {health.key === 'overdue' ? (
                        <form action={completeActivity} style={{ display: 'inline' }}>
                          <input type="hidden" name="id" value={deal.next_activity_id} />
                          <SubmitButton className="ghost" style={{ padding: '3px 8px', fontSize: '12px' }}>
                            Mark Follow-up Done
                          </SubmitButton>
                        </form>
                      ) : (
                        <a className="btn ghost" href={`/crm/${deal.id}`} style={{ padding: '3px 8px', fontSize: '12px' }}>
                          Log Touchpoint
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Modern Kanban Board */}
      <div className="scroll" style={{ paddingBottom: 16 }}>
        <div className="board">
          {STAGES.map((stage) => {
            const all = deals.filter((x) => x.stage === stage)
            const closed = CLOSED_STAGES.includes(stage)
            const sorted = closed
              ? [...all].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
              : [...all].sort((a, b) => dealHealth(b).level - dealHealth(a).level || daysQuiet(a) - daysQuiet(b))
            const shown = closed ? sorted.slice(0, CLOSED_SHOWN) : sorted.slice(0, OPEN_SHOWN)
            const stageValue = all.reduce((s, x) => s + Number(x.value || 0), 0)

            return (
              <div className="col" key={stage}>
                <h3>
                  <span>{stage}</span>
                  <span className="tag" style={{ background: 'var(--surface)', fontSize: 11 }}>{all.length}</span>
                </h3>
                {OPEN_STAGES.includes(stage) && (
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-soft)', marginBottom: 10 }}>
                    {inr(stageValue)} <span style={{ opacity: 0.7 }}>({Math.round(STAGE_ODDS[stage] * 100)}%)</span>
                  </div>
                )}
                {shown.map((x) => {
                  const health = dealHealth(x)
                  return (
                    <div className="deal" key={x.id}>
                      <a href={`/crm/${x.id}`} style={{ fontWeight: 700, fontSize: 13, color: 'var(--navy)' }}>
                        {x.title}
                      </a>
                      <div style={{ fontSize: 12, fontWeight: 600, marginTop: 2 }}>{x.school}</div>
                      {x.poc_name && (
                        <div className="muted" style={{ fontSize: 11 }}>👤 POC: {x.poc_name}</div>
                      )}
                      <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--ink)', marginTop: 4 }}>{inr(x.value)}</div>
                      
                      {!closed && (
                        <div className="muted" style={{ fontSize: 11, marginTop: 4 }}>
                          {x.next_due ? `📅 Next: ${d(x.next_due)}` : '⚠️ No next step'}
                        </div>
                      )}

                      {health.label && (
                        <div style={{ marginTop: 6 }}>
                          <span className={`tag ${health.key}`}>{health.label}</span>
                        </div>
                      )}

                      <form action={updateDeal} className="row" style={{ gap: 4, marginTop: 10 }}>
                        <input type="hidden" name="id" value={x.id} />
                        <select name="stage" defaultValue={x.stage} style={{ padding: '3px 6px', fontSize: 11, flex: 1 }}>
                          {STAGES.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                        <SubmitButton className="ghost" style={{ padding: '3px 8px', fontSize: '11px' }}>
                          Move
                        </SubmitButton>
                      </form>
                    </div>
                  )
                })}
                {all.length > shown.length && (
                  <div className="muted" style={{ textAlign: 'center', marginTop: 8, fontSize: 12 }}>
                    +{all.length - shown.length} older
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}
