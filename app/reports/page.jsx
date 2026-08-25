import sql from '../../lib/db'
import { requireUser } from '../../lib/auth'
import { inr } from '../../lib/fmt'
import { Card, KPICard } from '../../components/ui'

export default async function ReportsPage() {
  const user = await requireUser('reports')
  const isAdmin = user.role === 'admin'

  const [repPerformance, trends, callTracking, teamSchools, teamQuotes, enquiries] = await Promise.all([
    sql`
      select
        u.name as rep_name, u.id as rep_id,
        count(*) filter (where dl.stage not in ('won', 'lost'))::int as open_count,
        coalesce(sum(dl.value) filter (where dl.stage not in ('won', 'lost')), 0) as open_value,
        count(*) filter (where dl.stage = 'won')::int as won_count,
        coalesce(sum(dl.value) filter (where dl.stage = 'won'), 0) as won_value,
        count(*) filter (where dl.stage = 'lost')::int as lost_count,
        coalesce(sum(dl.value) filter (where dl.stage = 'lost'), 0) as lost_value
      from deals dl
      join users u on u.id = dl.owner_id
      where dl.deleted_at is null
      group by u.id, u.name
      order by won_value desc
    `,
    sql`
      with closed_deals as (
        select
          stage,
          value,
          date_trunc('month', coalesce(expected_close, created_at)) as month_dt
        from deals
        where stage in ('won', 'lost') and deleted_at is null
      )
      select
        to_char(month_dt, 'Mon YYYY') as month_label,
        month_dt,
        count(*) filter (where stage = 'won')::int as won_count,
        coalesce(sum(value) filter (where stage = 'won'), 0) as won_value,
        count(*) filter (where stage = 'lost')::int as lost_count,
        coalesce(sum(value) filter (where stage = 'lost'), 0) as lost_value
      from closed_deals
      where month_dt >= date_trunc('month', current_date - interval '5 months')
      group by month_dt
      order by month_dt asc
    `,
    sql`
      select
        u.name as rep_name,
        count(*)::int as total_calls,
        coalesce(sum(duration_minutes), 0)::int as total_minutes,
        count(*) filter (where outcome = 'connected')::int as connected_count,
        count(*) filter (where outcome = 'meeting_booked')::int as meeting_count
      from activities a
      join users u on u.id = a.owner_id
      where a.kind = 'call'
        and a.deleted_at is null
        and a.created_at >= current_date - interval '30 days'
      group by u.id, u.name
      order by total_calls desc
    `,
    // Per-rep: assigned schools
    sql`
      select u.name as rep_name, u.id as rep_id, count(e.id)::int as assigned_schools
      from users u
      left join entities e on e.owner_id = u.id and e.deleted_at is null
      where u.active and u.role in ('admin', 'sales')
      group by u.id, u.name
      order by u.name
    `,
    // Per-rep: quotes created + accepted
    sql`
      select u.name as rep_name, u.id as rep_id,
             count(q.id)::int as total_quotes,
             count(q.id) filter (where q.status = 'accepted')::int as accepted_quotes,
             coalesce(sum(coalesce(
               (select sum(round(qi.qty * qi.unit_price * (1 + qi.gst_rate / 100), 2)) from quote_items qi where qi.quote_id = q.id),
               0)) filter (where q.status = 'accepted'), 0) as accepted_value
      from users u
      left join quotes q on q.owner_id = u.id and q.deleted_at is null
      where u.active and u.role in ('admin', 'sales')
      group by u.id, u.name
      order by u.name
    `,
    // Per-rep: enquiries in last 30 days
    sql`
      select u.name as rep_name, u.id as rep_id,
             count(*) filter (where a.kind = 'enquiry')::int as enquiry_count,
             count(*) filter (where a.kind = 'enquiry' and a.created_at >= current_date - interval '30 days')::int as enquiry_30d,
             count(*) filter (where a.kind in ('call', 'meeting', 'email', 'enquiry') and a.created_at >= current_date - interval '30 days')::int as activity_30d
      from users u
      left join activities a on a.owner_id = u.id and a.deleted_at is null
      where u.active and u.role in ('admin', 'sales')
      group by u.id, u.name
      order by u.name
    `
  ])

  const totalWonVal = repPerformance.reduce((s, r) => s + Number(r.won_value), 0)
  const totalOpenVal = repPerformance.reduce((s, r) => s + Number(r.open_value), 0)
  const totalCalls = callTracking.reduce((s, r) => s + Number(r.total_calls), 0)

  // Merge per-rep stats
  const repMap = {}
  for (const r of teamSchools) {
    repMap[r.rep_id] = { ...r }
  }
  for (const r of teamQuotes) {
    if (repMap[r.rep_id]) Object.assign(repMap[r.rep_id], r)
    else repMap[r.rep_id] = { ...r }
  }
  for (const r of enquiries) {
    if (repMap[r.rep_id]) Object.assign(repMap[r.rep_id], r)
    else repMap[r.rep_id] = { ...r }
  }
  for (const r of repPerformance) {
    if (repMap[r.rep_id]) Object.assign(repMap[r.rep_id], { won_count: r.won_count, won_value: r.won_value, open_count: r.open_count, lost_count: r.lost_count })
    else repMap[r.rep_id] = { ...r }
  }
  const teamRows = Object.values(repMap).sort((a, b) => (b.won_count || 0) - (a.won_count || 0))

  // Show only own stats to non-admins
  const myStats = teamRows.find((r) => r.rep_id === user.id) || {}

  return (
    <>
      <div className="page-header">
        <div className="page-title-group">
          <h1>Analytics &amp; {isAdmin ? 'Executive Reports' : 'My Performance'}</h1>
          <p className="page-subtitle">
            {isAdmin
              ? 'Sales rep performance benchmarks, win/loss conversion trends, enquiry funnel, and call activity analytics.'
              : 'Your personal performance summary, quote pipeline, and recent activity.'}
          </p>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid">
        {isAdmin ? (
          <>
            <KPICard label="Total Won Revenue" value={inr(totalWonVal)} subtext="Closed-won deals value" />
            <KPICard label="Active Pipeline" value={inr(totalOpenVal)} subtext="Open opportunity value" />
            <KPICard label="Outbound Calls (30d)" value={totalCalls} subtext="Logged calling touchpoints" />
          </>
        ) : (
          <>
            <KPICard label="My Won Deals" value={myStats.won_count || 0} subtext="Closed-won deals" />
            <KPICard label="My Pipeline Value" value={inr(myStats.open_value || 0)} subtext="Open opportunity value" />
            <KPICard label="My Assigned Schools" value={myStats.assigned_schools || 0} subtext="Schools under your ownership" />
            <KPICard label="My Activity (30d)" value={myStats.activity_30d || 0} subtext="Touchpoints this month" />
          </>
        )}
      </div>

      {/* ADMIN ONLY: Full Team Performance Grid */}
      {isAdmin && (
        <Card title="🏆 Team Performance Dashboard">
          <div className="scroll">
            <table>
              <thead>
                <tr>
                  <th>Sales Representative</th>
                  <th className="right">Assigned Schools</th>
                  <th className="right">Activity (30d)</th>
                  <th className="right">Enquiries (30d)</th>
                  <th className="right">Quotes Created</th>
                  <th className="right">Quotes Won</th>
                  <th className="right">Won Value</th>
                  <th className="right">Open Deals</th>
                  <th className="right">Conversion %</th>
                </tr>
              </thead>
              <tbody>
                {teamRows.length === 0 ? (
                  <tr><td colSpan={9} className="muted" style={{ padding: '24px', textAlign: 'center' }}>No team data available.</td></tr>
                ) : teamRows.map((rep) => {
                  const totalClosed = (rep.won_count || 0) + (rep.lost_count || 0)
                  const winRate = totalClosed > 0 ? Math.round(((rep.won_count || 0) / totalClosed) * 100) : 0
                  const quoteConv = (rep.total_quotes || 0) > 0 ? Math.round(((rep.accepted_quotes || 0) / rep.total_quotes) * 100) : 0
                  return (
                    <tr key={rep.rep_id}>
                      <td>
                        <strong style={{ color: 'var(--navy)' }}>{rep.rep_name}</strong>
                      </td>
                      <td className="right">{rep.assigned_schools || 0}</td>
                      <td className="right">{rep.activity_30d || 0}</td>
                      <td className="right">
                        {(rep.enquiry_30d || 0) > 0
                          ? <span className="tag pilot">{rep.enquiry_30d}</span>
                          : <span className="muted">0</span>}
                      </td>
                      <td className="right">{rep.total_quotes || 0}</td>
                      <td className="right" style={{ fontWeight: 700 }}>
                        {rep.accepted_quotes || 0}
                        {quoteConv > 0 && <span className="muted" style={{ fontWeight: 400, marginLeft: 4, fontSize: 11 }}>({quoteConv}%)</span>}
                      </td>
                      <td className="right" style={{ fontWeight: 700, color: 'var(--good-fg)' }}>
                        {inr(rep.won_value || 0)}
                      </td>
                      <td className="right">{rep.open_count || 0}</td>
                      <td className="right">
                        <span className={`tag ${winRate >= 50 ? 'won' : winRate >= 20 ? 'pilot' : 'lost'}`}>
                          {winRate}%
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Rep Performance Leaderboard (deals) */}
      <Card title={isAdmin ? 'Sales Rep Deal Leaderboard' : 'My Deal History'}>
        <div className="scroll">
          <table>
            <thead>
              <tr>
                <th>Sales Representative</th>
                <th className="right">Open Deals</th>
                <th className="right">Open Pipeline</th>
                <th className="right">Won Deals</th>
                <th className="right">Won Value</th>
                <th className="right">Lost Deals</th>
                <th className="right">Win Rate %</th>
              </tr>
            </thead>
            <tbody>
              {(isAdmin ? repPerformance : repPerformance.filter((r) => r.rep_id === user.id)).length === 0 ? (
                <tr><td colSpan={7} className="muted" style={{ padding: '24px', textAlign: 'center' }}>No rep performance data recorded.</td></tr>
              ) : (isAdmin ? repPerformance : repPerformance.filter((r) => r.rep_id === user.id)).map((rep) => {
                const totalClosed = rep.won_count + rep.lost_count
                const winRate = totalClosed > 0 ? Math.round((rep.won_count / totalClosed) * 100) : 0
                return (
                  <tr key={rep.rep_name}>
                    <td><strong>{rep.rep_name}</strong></td>
                    <td className="right">{rep.open_count}</td>
                    <td className="right">{inr(rep.open_value)}</td>
                    <td className="right" style={{ fontWeight: 700 }}>{rep.won_count}</td>
                    <td className="right" style={{ fontWeight: 700, color: 'var(--good-fg)' }}>{inr(rep.won_value)}</td>
                    <td className="right" style={{ color: 'var(--bad-fg)' }}>{rep.lost_count}</td>
                    <td className="right">
                      <span className={`tag ${winRate >= 50 ? 'won' : winRate >= 20 ? 'pilot' : 'lost'}`}>
                        {winRate}%
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Win / Loss Trend */}
      <Card title="Win / Loss Revenue Trend (Last 6 Months)">
        <div className="scroll">
          <table style={{ tableLayout: 'fixed' }}>
            <thead>
              <tr>
                <th style={{ width: 140 }}>Month</th>
                <th className="right" style={{ width: 120 }}>Won Revenue</th>
                <th className="right" style={{ width: 120 }}>Lost Value</th>
                <th>Win / Loss Ratio</th>
              </tr>
            </thead>
            <tbody>
              {trends.length === 0 ? (
                <tr><td colSpan={4} className="muted" style={{ padding: '24px', textAlign: 'center' }}>No closed deals in the last 6 months.</td></tr>
              ) : trends.map((t) => {
                const totalCount = t.won_count + t.lost_count
                const wonPct = totalCount > 0 ? (t.won_count / totalCount) * 100 : 0
                const lostPct = totalCount > 0 ? (t.lost_count / totalCount) * 100 : 0
                return (
                  <tr key={t.month_label}>
                    <td><strong>{t.month_label}</strong></td>
                    <td className="right" style={{ color: 'var(--good-fg)' }}>
                      <div style={{ fontWeight: 700 }}>{t.won_count} won</div>
                      <div className="muted" style={{ fontSize: 11 }}>{inr(t.won_value)}</div>
                    </td>
                    <td className="right" style={{ color: 'var(--bad-fg)' }}>
                      <div>{t.lost_count} lost</div>
                      <div className="muted" style={{ fontSize: 11 }}>{inr(t.lost_value)}</div>
                    </td>
                    <td style={{ verticalAlign: 'middle' }}>
                      {totalCount > 0 ? (
                        <div className="bar-container">
                          {wonPct > 0 && <div className="bar-won" style={{ width: `${wonPct}%` }} title={`${Math.round(wonPct)}% Won`} />}
                          {lostPct > 0 && <div className="bar-lost" style={{ width: `${lostPct}%` }} title={`${Math.round(lostPct)}% Lost`} />}
                        </div>
                      ) : (
                        <div className="muted">No closed data</div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Call Activity Tracking */}
      <Card title={`Outbound Calling & Meeting Analytics (Last 30 Days)`}>
        <div className="scroll">
          <table>
            <thead>
              <tr>
                <th>Sales Representative</th>
                <th className="right">Total Calls</th>
                <th className="right">Total Minutes</th>
                <th className="right">Connected Calls</th>
                <th className="right">Meetings Booked</th>
                <th className="right">Connect Rate %</th>
              </tr>
            </thead>
            <tbody>
              {(isAdmin ? callTracking : callTracking.filter((r) => r.rep_name === user.name)).length === 0 ? (
                <tr><td colSpan={6} className="muted" style={{ padding: '24px', textAlign: 'center' }}>No calls logged in the last 30 days.</td></tr>
              ) : (isAdmin ? callTracking : callTracking.filter((r) => r.rep_name === user.name)).map((rep) => {
                const connectRate = rep.total_calls > 0 ? Math.round((rep.connected_count / rep.total_calls) * 100) : 0
                return (
                  <tr key={rep.rep_name}>
                    <td><strong>{rep.rep_name}</strong></td>
                    <td className="right">{rep.total_calls}</td>
                    <td className="right">{rep.total_minutes} mins</td>
                    <td className="right">{rep.connected_count}</td>
                    <td className="right" style={{ fontWeight: 700, color: 'var(--good-fg)' }}>{rep.meeting_count}</td>
                    <td className="right">
                      <span className={`tag ${connectRate >= 30 ? 'won' : 'pilot'}`}>
                        {connectRate}%
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  )
}
