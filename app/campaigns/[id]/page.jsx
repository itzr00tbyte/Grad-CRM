import { notFound } from 'next/navigation'
import sql from '../../../lib/db'
import { requireUser } from '../../../lib/auth'
import { inr, d } from '../../../lib/fmt'
import { Card, Field, Tag, KPICard } from '../../../components/ui'
import { SubmitButton } from '../../../components/submit'
import { updateCampaign, addTargetEntity, removeTargetEntity } from '../actions'

export default async function CampaignPage({ params }) {
  await requireUser('campaigns')
  const id = Number((await params).id)

  const [[c], targets, deals, entities] = await Promise.all([
    sql`select c.*, u.name as owner from campaigns c left join users u on u.id = c.owner_id where c.id = ${id}`,
    sql`
      select e.id, e.name, e.city, e.status, ce.added_at 
      from campaign_entities ce 
      join entities e on e.id = ce.entity_id 
      where ce.campaign_id = ${id} and e.deleted_at is null
      order by ce.added_at desc
    `,
    sql`
      select dl.*, e.name as school_name 
      from deals dl 
      join entities e on e.id = dl.entity_id 
      where dl.campaign_id = ${id} and dl.deleted_at is null
      order by dl.created_at desc
    `,
    sql`select id, name from entities where deleted_at is null order by name`
  ])

  if (!c) notFound()

  const wonDeals = deals.filter(d => d.stage === 'won')
  const totalPipeline = deals.reduce((s, x) => s + (x.stage !== 'lost' ? Number(x.value) : 0), 0)
  const totalWon = wonDeals.reduce((s, x) => s + Number(x.value), 0)

  return (
    <>
      <div className="page-header">
        <div className="page-title-group">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <a href="/campaigns" className="muted" style={{ fontSize: 13 }}>
              ← Campaigns
            </a>
          </div>
          <h1 style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 12 }}>
            {c.name} <Tag v={c.status} />
          </h1>
          <p className="page-subtitle">
            Timeline: {d(c.start_date)} to {d(c.end_date)} · Owner: {c.owner || '—'}
          </p>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid">
        <KPICard label="Campaign Budget" value={c.budget ? inr(c.budget) : 'Unset'} />
        <KPICard label="Target Schools" value={targets.length} subtext="Reached accounts" />
        <KPICard label="Sourced Won ROI" value={inr(totalWon)} subtext={`${inr(totalPipeline)} total pipeline`} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div>
          <Card title="Campaign Settings">
            <form action={updateCampaign}>
              <input type="hidden" name="id" value={c.id} />
              <div className="row">
                <Field label="Campaign Name" name="name" value={c.name} required />
                <Field label="Status" name="status" options={['active', 'completed']} value={c.status} />
                <Field label="Start Date" name="start_date" type="date" value={d(c.start_date)} />
                <Field label="End Date" name="end_date" type="date" value={d(c.end_date)} />
                <Field label="Budget ₹" name="budget" type="number" step="1000" value={c.budget} />
              </div>
              <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
                <SubmitButton>Save Campaign</SubmitButton>
              </div>
            </form>
          </Card>

          <Card title={`Target Schools (${targets.length})`}>
            <div className="scroll">
              <table>
                <thead>
                  <tr>
                    <th>School</th>
                    <th>City</th>
                    <th>Status</th>
                    <th className="right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {targets.length === 0 ? (
                    <tr><td colSpan={4} className="muted" style={{ padding: '16px' }}>No target schools added yet.</td></tr>
                  ) : (
                    targets.map(t => (
                      <tr key={t.id}>
                        <td><a href={`/schools/${t.id}`} style={{ fontWeight: 600 }}>{t.name}</a></td>
                        <td>{t.city}</td>
                        <td><Tag v={t.status} /></td>
                        <td className="right">
                          <form action={removeTargetEntity}>
                            <input type="hidden" name="campaign_id" value={c.id} />
                            <input type="hidden" name="entity_id" value={t.id} />
                            <SubmitButton className="danger ghost" style={{ padding: '2px 8px', fontSize: 11 }}>Remove</SubmitButton>
                          </form>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <form action={addTargetEntity} className="row" style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--line)' }}>
              <input type="hidden" name="campaign_id" value={c.id} />
              <div className="field">
                <label>Add Target School Account</label>
                <select name="entity_id" required>
                  <option value="">Select school...</option>
                  {entities.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
              </div>
              <div className="field">
                <SubmitButton className="ghost">+ Add Target</SubmitButton>
              </div>
            </form>
          </Card>
        </div>

        <div>
          <Card title={`Sourced Deals (${deals.length})`}>
            <div className="scroll">
              <table>
                <thead>
                  <tr>
                    <th>School</th>
                    <th>Deal Title</th>
                    <th>Stage</th>
                    <th className="right">Value</th>
                  </tr>
                </thead>
                <tbody>
                  {deals.length === 0 ? (
                    <tr><td colSpan={4} className="muted" style={{ padding: '16px' }}>No deals sourced from this campaign.</td></tr>
                  ) : (
                    deals.map(x => (
                      <tr key={x.id}>
                        <td><a href={`/schools/${x.entity_id}`}>{x.school_name}</a></td>
                        <td><a href={`/crm/${x.id}`} style={{ fontWeight: 600 }}>{x.title}</a></td>
                        <td><Tag v={x.stage} /></td>
                        <td className="right" style={{ fontWeight: 700, color: x.stage === 'won' ? 'var(--good-fg)' : 'var(--ink)' }}>
                          {inr(x.value)}
                        </td>
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
