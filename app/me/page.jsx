import sql from '../../lib/db'
import { requireUser } from '../../lib/auth'
import { inr, d, today } from '../../lib/fmt'
import { payslipTotals } from '../../lib/payroll'
import { Card, Field, Tag, KPICard } from '../../components/ui'
import { SubmitButton } from '../../components/submit'
import { punch, applyLeave, changePassword } from './actions'

export default async function MePage({ searchParams }) {
  const user = await requireUser()
  const q = (await searchParams) || {}
  const err = q.err
  const [em] = await sql`select * from employees where user_id = ${user.id}`

  const passwordCard = (
    <Card title="Change Security Password">
      {q.pwerr && <p className="err">{q.pwerr}</p>}
      {q.pwok && (
        <div style={{ background: 'var(--good-bg)', color: 'var(--good-fg)', padding: '10px 14px', borderRadius: 'var(--r-sm)', marginBottom: 12, fontWeight: 600 }}>
          Password successfully updated.
        </div>
      )}
      <form action={changePassword} className="row">
        <Field label="Current Password" name="current" type="password" required />
        <Field label="New Password (Min 8 Chars)" name="next" type="password" minLength={8} required />
        <div className="field">
          <SubmitButton className="ghost">Update Password</SubmitButton>
        </div>
      </form>
    </Card>
  )

  if (!em) {
    return (
      <>
        <div className="page-header">
          <div className="page-title-group">
            <h1>My Profile & Security</h1>
            <p className="page-subtitle">User Account: <strong>{user.name}</strong> ({user.role})</p>
          </div>
        </div>
        <Card title="Account Overview">
          <p className="muted">
            No employee record is linked to this login yet. An admin can link one under People.
          </p>
        </Card>
        {passwordCard}
      </>
    )
  }

  const [attendance, leaves, slips, [used]] = await Promise.all([
    sql`select * from attendance where employee_id = ${em.id} order by on_date desc limit 14`,
    sql`select * from leave_requests where employee_id = ${em.id} order by from_on desc limit 20`,
    sql`select * from payslips where employee_id = ${em.id} order by period desc`,
    sql`select
          coalesce(sum(days) filter (where kind in ('CL','SL') and status in ('approved','pending')),0) as cl,
          coalesce(sum(days) filter (where kind='EL' and status in ('approved','pending')),0) as el
        from leave_requests
        where employee_id = ${em.id} and date_part('year', from_on) = date_part('year', current_date)`,
  ])

  const punchedToday = attendance.find((a) => d(a.on_date) === today())

  return (
    <>
      <div className="page-header">
        <div className="page-title-group">
          <h1>Employee Self-Service Portal</h1>
          <p className="page-subtitle">Welcome, {em.name} · {em.designation || 'Team Member'}</p>
        </div>
      </div>

      <div className="grid">
        <KPICard
          label="Today's Attendance"
          value={punchedToday ? (punchedToday.check_out ? 'Completed' : 'Checked In') : 'Not Checked In'}
          subtext={
            punchedToday
              ? `In ${new Date(punchedToday.check_in).toLocaleTimeString('en-IN')}${
                  punchedToday.check_out
                    ? ` · Out ${new Date(punchedToday.check_out).toLocaleTimeString('en-IN')}`
                    : ''
                }`
              : 'Tap button to log attendance'
          }
          action={
            <form action={punch}>
              <SubmitButton className={punchedToday ? 'ghost' : ''}>
                {punchedToday ? 'Check Out' : 'Check In'}
              </SubmitButton>
            </form>
          }
        />
        <KPICard
          label="Available Leave Balance"
          value={`${em.cl_total - Number(used.cl)} CL/SL · ${em.el_total - Number(used.el)} EL`}
          subtext={`Taken this year: ${Number(used.cl)} CL/SL, ${Number(used.el)} EL`}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div>
          <Card title="Apply for Leave">
            {err && <p className="err">{err}</p>}
            <form action={applyLeave}>
              <div className="row">
                <Field label="Leave Kind" name="kind" options={['CL', 'SL', 'EL', 'LOP']} />
                <Field label="From Date" name="from_on" type="date" required />
                <Field label="To Date" name="to_on" type="date" />
                <Field label="Reason" name="reason" wide placeholder="Reason for leave..." />
              </div>
              <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end' }}>
                <SubmitButton>Submit Request</SubmitButton>
              </div>
            </form>
          </Card>

          <Card title="My Leave Request History">
            <div className="scroll">
              <table>
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Dates & Duration</th>
                    <th>Reason</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {leaves.length === 0 ? (
                    <tr><td colSpan={4} className="muted" style={{ padding: '16px' }}>No leave requests submitted.</td></tr>
                  ) : (
                    leaves.map((l) => (
                      <tr key={l.id}>
                        <td><Tag v={l.kind} /></td>
                        <td>{d(l.from_on)} → {d(l.to_on)} ({Number(l.days)}d)</td>
                        <td className="muted">{l.reason || '—'}</td>
                        <td><Tag v={l.status} /></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        <div>
          <Card title="My Payslips">
            <div className="scroll">
              <table>
                <thead>
                  <tr>
                    <th>Pay Period</th>
                    <th className="right">Net Salary Amount</th>
                    <th className="right">Statement</th>
                  </tr>
                </thead>
                <tbody>
                  {slips.length === 0 ? (
                    <tr><td colSpan={3} className="muted" style={{ padding: '16px' }}>No payslips generated.</td></tr>
                  ) : (
                    slips.map((p) => (
                      <tr key={p.id}>
                        <td>{d(p.period).slice(0, 7)}</td>
                        <td className="right" style={{ fontWeight: 700, color: 'var(--good-fg)' }}>{inr(payslipTotals(p).net)}</td>
                        <td className="right">
                          <a href={`/people/payslip/${p.id}`} className="btn ghost" style={{ padding: '3px 8px', fontSize: 11 }}>
                            View Statement →
                          </a>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          {passwordCard}

          <Card title="My Attendance Log (Last 14 Days)">
            <div className="scroll">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Check In</th>
                    <th>Check Out</th>
                  </tr>
                </thead>
                <tbody>
                  {attendance.length === 0 ? (
                    <tr><td colSpan={3} className="muted" style={{ padding: '16px' }}>No attendance records.</td></tr>
                  ) : (
                    attendance.map((a) => (
                      <tr key={a.id}>
                        <td>{d(a.on_date)}</td>
                        <td>{a.check_in ? new Date(a.check_in).toLocaleTimeString('en-IN') : '—'}</td>
                        <td>{a.check_out ? new Date(a.check_out).toLocaleTimeString('en-IN') : '—'}</td>
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
