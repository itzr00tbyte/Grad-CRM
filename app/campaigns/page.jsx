import sql from '../../lib/db'
import { requireUser } from '../../lib/auth'
import { inr, d } from '../../lib/fmt'
import { Card, Field, Tag } from '../../components/ui'
import { SubmitButton } from '../../components/submit'
import { createCampaign } from './actions'

export default async function CampaignsPage({ searchParams }) {
  await requireUser('campaigns')
  const sp = await searchParams
  const isCreating = sp?.action === 'new'

  const campaigns = await sql`
    select c.*, u.name as owner,
      (select count(*) from campaign_entities ce where ce.campaign_id = c.id) as targets_count,
      (select coalesce(sum(dl.value), 0) from deals dl where dl.campaign_id = c.id and dl.stage = 'won' and dl.deleted_at is null) as won_value
    from campaigns c
    left join users u on u.id = c.owner_id
    order by c.created_at desc
  `

  return (
    <>
      <div className="page-header">
        <div className="page-title-group">
          <h1>Marketing Campaigns</h1>
          <p className="page-subtitle">Track outbound marketing programs, targeted schools, and won deal ROI.</p>
        </div>
        <div className="page-actions">
          <a href={isCreating ? '/campaigns' : '/campaigns?action=new'} className="btn">
            {isCreating ? 'Close Form' : '+ New Campaign'}
          </a>
        </div>
      </div>

      {isCreating && (
        <Card title="Launch New Campaign">
          <form action={createCampaign}>
            <div className="row">
              <Field label="Campaign Name" name="name" required placeholder="e.g. Q1 Hyderabad K12 Outreach" />
              <Field label="Start Date" name="start_date" type="date" required />
              <Field label="End Date" name="end_date" type="date" />
              <Field label="Budget ₹" name="budget" type="number" step="1000" placeholder="50000" />
            </div>
            <div style={{ marginTop: 12, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <a href="/campaigns" className="btn ghost">Cancel</a>
              <SubmitButton>Create Campaign</SubmitButton>
            </div>
          </form>
        </Card>
      )}

      <Card title={`All Campaigns (${campaigns.length})`}>
        <div className="scroll">
          <table>
            <thead>
              <tr>
                <th>Campaign Name</th>
                <th>Status</th>
                <th>Timeline</th>
                <th className="right">Budget</th>
                <th className="right">Target Schools</th>
                <th className="right">Won Value (ROI)</th>
                <th>Owner</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.length === 0 ? (
                <tr><td colSpan={7} className="muted" style={{ padding: '24px', textAlign: 'center' }}>No campaigns launched yet.</td></tr>
              ) : (
                campaigns.map(c => (
                  <tr key={c.id}>
                    <td><a href={`/campaigns/${c.id}`} style={{ fontWeight: 600 }}>{c.name}</a></td>
                    <td><Tag v={c.status} /></td>
                    <td>{d(c.start_date)} - {d(c.end_date)}</td>
                    <td className="right">{c.budget ? inr(c.budget) : '—'}</td>
                    <td className="right">{c.targets_count}</td>
                    <td className="right" style={{ fontWeight: 700, color: 'var(--good-fg)' }}>{inr(c.won_value)}</td>
                    <td>{c.owner || '—'}</td>
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
