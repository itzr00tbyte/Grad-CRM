import sql from '../../lib/db'
import { requireUser } from '../../lib/auth'
import { inr, d, today } from '../../lib/fmt'
import { Card, Field, Tag, KPICard } from '../../components/ui'
import { SubmitButton } from '../../components/submit'
import { addExpense, togglePaid } from './actions'

const BUCKETS = [
  ['0–30', 0, 30],
  ['31–60', 31, 60],
  ['61–90', 61, 90],
  ['90+', 91, 100000],
]

export default async function FinancePage({ searchParams }) {
  await requireUser('finance')
  const sp = await searchParams
  const isAdding = sp?.action === 'new'

  const [receivables, expenses, schools, tds] = await Promise.all([
    sql`select t.*, e.name as school, (current_date - t.invoice_date)::int as age
        from invoice_totals t join entities e on e.id = t.entity_id
        where t.status <> 'cancelled' and t.total > t.paid
        order by t.invoice_date`,
    sql`select x.*, e.name as school from expenses x left join entities e on e.id = x.entity_id
        order by x.bill_date desc limit 100`,
    sql`select id, name from entities order by name`,
    sql`select tds_section, sum(tds_amount) as total from expenses
        where tds_amount > 0 and bill_date >= date_trunc('quarter', current_date)
        group by tds_section`,
  ])

  const totalDue = receivables.reduce((s, r) => s + (r.total - r.paid), 0)

  return (
    <>
      <div className="page-header">
        <div className="page-title-group">
          <h1>Financial Management</h1>
          <p className="page-subtitle">Receivables aging analysis, vendor expense management, and TDS tracking.</p>
        </div>
        <div className="page-actions">
          <a href={isAdding ? '/finance' : '/finance?action=new'} className="btn">
            {isAdding ? 'Close Form' : '+ Add Expense Bill'}
          </a>
        </div>
      </div>

      {/* KPI Bucket Row */}
      <div className="grid">
        <KPICard label="Total Outstanding" value={inr(totalDue)} subtext={`${receivables.length} unpaid invoice(s)`} />
        {BUCKETS.map(([label, lo, hi]) => {
          const sum = receivables
            .filter((r) => r.age >= lo && r.age <= hi)
            .reduce((s, r) => s + (r.total - r.paid), 0)
          return (
            <KPICard key={label} label={`Aging: ${label} Days`} value={inr(sum)} subtext="Pending balance" />
          )
        })}
      </div>

      {/* Receivables Table */}
      <Card title={`Receivables Aging Breakdown (${receivables.length})`}>
        <div className="scroll">
          <table>
            <thead>
              <tr>
                <th>School Account</th>
                <th>Invoice #</th>
                <th>Invoice Date</th>
                <th>Age</th>
                <th className="right">Total Billed</th>
                <th className="right">Received</th>
                <th className="right">Amount Due</th>
              </tr>
            </thead>
            <tbody>
              {receivables.length === 0 ? (
                <tr><td colSpan={7} className="muted" style={{ padding: '24px', textAlign: 'center' }}>No outstanding receivables!</td></tr>
              ) : (
                receivables.map((r) => (
                  <tr key={r.id}>
                    <td><strong>{r.school}</strong></td>
                    <td>
                      <a href={`/invoices/${r.id}`} style={{ fontWeight: 600 }}>{r.number}</a>
                    </td>
                    <td>{d(r.invoice_date)}</td>
                    <td><span className="tag overdue">{r.age}d</span></td>
                    <td className="right">{inr(r.total)}</td>
                    <td className="right" style={{ color: 'var(--good-fg)' }}>{inr(r.paid)}</td>
                    <td className="right" style={{ fontWeight: 700, color: 'var(--bad-fg)' }}>{inr(r.total - r.paid)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Add Expense Form */}
      {isAdding && (
        <Card title="Add Vendor Bill / Expense Entry">
          <p className="muted" style={{ marginBottom: 16 }}>
            Enter vendor bill amounts excluding GST — TDS is calculated on the pre-GST base.
          </p>
          <form action={addExpense}>
            <div className="row">
              <Field label="Vendor Name" name="vendor" required placeholder="e.g. Code School Finland Oy" />
              <Field label="Bill Date" name="bill_date" type="date" value={today()} />
              <Field label="Amount ₹ (Excl. GST)" name="amount" type="number" step="0.01" required placeholder="50000" />
              <Field
                label="Category"
                name="category"
                options={['royalty', 'trainer_travel', 'event', 'software', 'other']}
              />
              <Field
                label="TDS Section"
                name="tds_section"
                options={[
                  ['none', 'none'],
                  ['194J', '194J Professional (10%)'],
                  ['194J_technical', '194J Technical (2%)'],
                  ['194C_individual', '194C Individual (1%)'],
                  ['194C_other', '194C Other (2%)'],
                ]}
              />
              <Field label="TDS Amount ₹ (Blank = Auto)" name="tds_amount" type="number" step="0.01" />
              <Field label="School Account (Optional)" name="entity_id" options={[['', '—'], ...schools.map((s) => [s.id, s.name])]} />
              <Field label="Notes" name="notes" placeholder="Expense description..." />
            </div>
            <div style={{ marginTop: 12, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <a href="/finance" className="btn ghost">Cancel</a>
              <SubmitButton>Record Expense</SubmitButton>
            </div>
          </form>
        </Card>
      )}

      {/* Quarterly TDS Summary */}
      {tds.length > 0 && (
        <Card title="Quarterly TDS Deductions (Form 26Q Summary)">
          <div className="scroll">
            <table>
              <thead>
                <tr>
                  <th>TDS Section</th>
                  <th className="right">Total TDS Amount</th>
                </tr>
              </thead>
              <tbody>
                {tds.map((t) => (
                  <tr key={t.tds_section}>
                    <td><span className="tag active">{t.tds_section}</span></td>
                    <td className="right" style={{ fontWeight: 700 }}>{inr(t.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Expenses List */}
      <Card title={`Expense History (${expenses.length})`}>
        <div className="scroll">
          <table>
            <thead>
              <tr>
                <th>Bill Date</th>
                <th>Vendor</th>
                <th>Category</th>
                <th>Associated School</th>
                <th className="right">Amount (Ex-GST)</th>
                <th>TDS Section</th>
                <th className="right">TDS ₹</th>
                <th className="right">Payment Status</th>
              </tr>
            </thead>
            <tbody>
              {expenses.length === 0 ? (
                <tr><td colSpan={8} className="muted" style={{ padding: '24px', textAlign: 'center' }}>No expenses recorded yet.</td></tr>
              ) : (
                expenses.map((x) => (
                  <tr key={x.id}>
                    <td>{d(x.bill_date)}</td>
                    <td><strong>{x.vendor}</strong></td>
                    <td><span className="tag">{x.category}</span></td>
                    <td>{x.school || '—'}</td>
                    <td className="right" style={{ fontWeight: 700 }}>{inr(x.amount)}</td>
                    <td>{x.tds_section !== 'none' && <Tag v={x.tds_section} />}</td>
                    <td className="right">{Number(x.tds_amount) ? inr(x.tds_amount) : '—'}</td>
                    <td className="right">
                      <form action={togglePaid}>
                        <input type="hidden" name="id" value={x.id} />
                        <SubmitButton className={`ghost ${x.paid ? 'active' : ''}`} style={{ padding: '3px 8px', fontSize: 11 }}>
                          {x.paid ? '✓ Paid' : 'Mark Paid'}
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
