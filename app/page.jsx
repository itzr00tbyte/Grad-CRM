import sql from '../lib/db'
import { requireUser, can } from '../lib/auth'
import { inr, d, today } from '../lib/fmt'
import { Card, Tag, KPICard } from '../components/ui'
import { completeActivity } from './actions'

export default async function Dashboard({ searchParams }) {
  const user = await requireUser()
  const denied = (await searchParams)?.denied

  const [pipeline, cash, aging, deliveries, renewals, tasks, leave] = await Promise.all([
    can(user, 'crm')
      ? sql`select stage, count(*)::int as n, coalesce(sum(value),0) as value
            from deals where stage not in ('won','lost') and deleted_at is null group by stage`
      : [],
    can(user, 'finance')
      ? sql`select
              (select coalesce(sum(total),0) from invoice_totals
                where date_trunc('month', invoice_date) = date_trunc('month', current_date)) as billed_month,
              (select coalesce(sum(amount),0) from payments
                where date_trunc('month', paid_on) = date_trunc('month', current_date)) as received_month,
              (select coalesce(sum(total - paid),0) from invoice_totals
                where status <> 'cancelled' and total > paid) as outstanding`
      : [],
    can(user, 'finance')
      ? sql`select e.name, t.number, t.invoice_date, t.total - t.paid as due,
                   (current_date - t.invoice_date)::int as age
            from invoice_totals t join entities e on e.id = t.entity_id
            where t.status <> 'cancelled' and t.total > t.paid and e.deleted_at is null
            order by t.invoice_date limit 10`
      : [],
    can(user, 'delivery')
      ? sql`select dl.*, e.name as school from deliveries dl join entities e on e.id = dl.entity_id
            where dl.status = 'planned' and dl.scheduled_on <= current_date + 14 and e.deleted_at is null
            order by dl.scheduled_on nulls last limit 10`
      : [],
    can(user, 'crm')
      ? sql`select id, name, renewal_date from entities
            where renewal_date between current_date and current_date + 90 and deleted_at is null order by renewal_date`
      : [],
    sql`select a.*, e.name as school,
               (select c.name || coalesce(' (' || c.role_tag || ')', '') from contacts c where c.entity_id = e.id and c.deleted_at is null order by c.id limit 1) as poc_name
        from activities a left join entities e on e.id = a.entity_id
        where a.done_at is null and a.due_on is not null and a.due_on <= current_date + 7
          and a.deleted_at is null
          and (a.owner_id = ${user.id} or ${user.role} = 'admin')
        order by a.due_on limit 15`,
    sql`select em.id, em.cl_total, em.el_total,
           coalesce((select sum(days) from leave_requests l
                     where l.employee_id = em.id and l.status='approved' and l.kind in ('CL','SL')
                       and date_part('year', l.from_on) = date_part('year', current_date)),0) as cl_used,
           coalesce((select sum(days) from leave_requests l
                     where l.employee_id = em.id and l.status='approved' and l.kind='EL'
                       and date_part('year', l.from_on) = date_part('year', current_date)),0) as el_used
         from employees em where em.user_id = ${user.id}`,
  ])

  const c = cash[0]
  const emp = leave[0]

  return (
    <>
      <div className="page-header">
        <div className="page-title-group">
          <h1>Executive Dashboard</h1>
          <p className="page-subtitle">Welcome back, {user.name}. Here is your CRM & operational overview.</p>
        </div>
      </div>

      {denied && <p className="err">No access to “{denied}”. Ask an admin.</p>}

      {/* KPI Section */}
      <div className="grid">
        {c && (
          <>
            <KPICard label="Billed This Month" value={inr(c.billed_month)} subtext="Current billing cycle" />
            <KPICard label="Received This Month" value={inr(c.received_month)} subtext="Collections settled" />
            <KPICard label="Total Outstanding" value={inr(c.outstanding)} subtext="Uncollected receivables" />
          </>
        )}
        {emp && (
          <KPICard
            label="My Leave Balance"
            value={`${emp.cl_total - emp.cl_used} CL · ${emp.el_total - emp.el_used} EL`}
            subtext="Available leave days"
            action={
              <a className="muted" href="/me" style={{ fontWeight: 600, fontSize: 12 }}>
                Apply for leave →
              </a>
            }
          />
        )}
      </div>

      {/* Main Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 16 }}>
        {/* Left Column */}
        <div>
          {pipeline.length > 0 && (
            <Card title="Pipeline Summary" actions={<a href="/crm" className="muted" style={{ fontWeight: 600 }}>Open Pipeline →</a>}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12 }}>
                {pipeline.map((p) => (
                  <div key={p.stage} style={{ background: 'var(--canvas)', padding: '12px', borderRadius: 'var(--r-sm)', border: '1px solid var(--line)' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--ink-soft)' }}>{p.stage}</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--navy)', margin: '4px 0' }}>{inr(p.value)}</div>
                    <div className="muted">{p.n} deal(s)</div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          <Card title="Follow-ups Due">
            {tasks.length === 0 ? (
              <p className="muted" style={{ margin: 0, padding: '12px 0' }}>
                Nothing due. Log the next step on a deal so it shows up here.
              </p>
            ) : (
              <div className="scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Due Date</th>
                      <th>School Reference</th>
                      <th>Contact Person (POC)</th>
                      <th>Task / Note</th>
                      <th className="right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tasks.map((t) => (
                      <tr key={t.id}>
                        <td style={{ width: 110 }}>
                          <Tag v={d(t.due_on) < today() ? 'overdue' : ''} />
                          <span style={{ fontSize: 12, marginLeft: 4 }}>{d(t.due_on)}</span>
                        </td>
                        <td><strong>{t.school || '—'}</strong></td>
                        <td>{t.poc_name ? <span>👤 {t.poc_name}</span> : <span className="muted">No POC</span>}</td>
                        <td>{t.note}</td>
                        <td className="right">
                          <form action={completeActivity}>
                            <input type="hidden" name="id" value={t.id} />
                            <button className="ghost" type="submit" style={{ padding: '3px 10px', fontSize: '12px' }}>
                              Mark Done
                            </button>
                          </form>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>

        {/* Right Column */}
        <div>
          {aging.length > 0 && (
            <Card title="Receivables (Oldest First)" actions={<a href="/finance" className="muted" style={{ fontWeight: 600 }}>Finance →</a>}>
              <div className="scroll">
                <table>
                  <thead>
                    <tr>
                      <th>School</th>
                      <th>Invoice #</th>
                      <th>Age</th>
                      <th className="right">Amount Due</th>
                    </tr>
                  </thead>
                  <tbody>
                    {aging.map((r) => (
                      <tr key={r.number}>
                        <td><strong>{r.name}</strong></td>
                        <td>{r.number}</td>
                        <td><span className="tag overdue">{r.age}d</span></td>
                        <td className="right" style={{ fontWeight: 700, color: 'var(--bad-fg)' }}>{inr(r.due)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {deliveries.length > 0 && (
            <Card title="Delivery — Next 14 Days" actions={<a href="/delivery" className="muted" style={{ fontWeight: 600 }}>Delivery →</a>}>
              <div className="scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>School</th>
                      <th>Milestone / Activity</th>
                      <th>Trainer</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deliveries.map((x) => (
                      <tr key={x.id}>
                        <td style={{ width: 100 }}>{d(x.scheduled_on)}</td>
                        <td><strong>{x.school}</strong></td>
                        <td>{x.title}</td>
                        <td>{x.trainer}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {renewals.length > 0 && (
            <Card title="Renewals Due (Next 90 Days)">
              <div className="scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Renewal Date</th>
                      <th>School</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {renewals.map((r) => (
                      <tr key={r.id}>
                        <td style={{ width: 120 }}><Tag v="renewal" /> {d(r.renewal_date)}</td>
                        <td><strong>{r.name}</strong></td>
                        <td>
                          <a href={`/schools/${r.id}`} className="btn ghost" style={{ padding: '3px 8px', fontSize: '12px' }}>
                            View School
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      </div>
    </>
  )
}
