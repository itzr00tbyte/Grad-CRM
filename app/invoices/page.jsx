import sql from '../../lib/db'
import { requireUser } from '../../lib/auth'
import { inr, d } from '../../lib/fmt'
import { Card, Field, Tag, KPICard, SearchableSelect } from '../../components/ui'
import { orgReady, ORG } from '../../lib/org'
import { createInvoice } from './actions'
import { SubmitButton } from '../../components/submit'

export default async function InvoicesPage({ searchParams }) {
  await requireUser('billing')
  const sp = await searchParams
  const isCreating = sp?.action === 'new'

  const [rows, schools] = await Promise.all([
    sql`select t.*, e.name as school,
               (select c.name || coalesce(' (' || c.role_tag || ')', '') from contacts c where c.entity_id = e.id and c.deleted_at is null order by c.id limit 1) as poc_name
        from invoice_totals t join entities e on e.id = t.entity_id
        order by t.invoice_date desc, t.id desc`,
    sql`select e.id, e.name,
               (select c.name || coalesce(' (' || c.role_tag || ')', '') from contacts c where c.entity_id = e.id and c.deleted_at is null order by c.id limit 1) as poc_name
        from entities e where e.deleted_at is null order by e.name`,
  ])

  const schoolOptions = schools.map((s) => [s.id, s.poc_name ? `${s.name} — POC: ${s.poc_name}` : s.name])

  const totalBilled = rows.reduce((s, i) => s + (i.status === 'cancelled' ? 0 : Number(i.total)), 0)
  const totalPaid = rows.reduce((s, i) => s + (i.status === 'cancelled' ? 0 : Number(i.paid)), 0)
  const totalDue = rows.reduce((s, i) => s + (i.status === 'cancelled' ? 0 : Number(i.total - i.paid)), 0)

  return (
    <>
      <div className="page-header">
        <div className="page-title-group">
          <h1>GST Invoices & Receivables</h1>
          <p className="page-subtitle">Manage Rule 46 compliant tax invoices and track payments.</p>
        </div>
        <div className="page-actions">
          <a href={isCreating ? '/invoices' : '/invoices?action=new'} className="btn">
            {isCreating ? 'Close Form' : '+ Create Invoice'}
          </a>
        </div>
      </div>

      {!orgReady() && (
        <p className="err">
          Supplier GSTIN not configured. Set ORG_NAME / ORG_GSTIN / ORG_ADDRESS in .env before issuing
          real invoices — right now they print “{ORG.gstin}”.
        </p>
      )}

      {/* KPI Row */}
      <div className="grid">
        <KPICard label="Total Billed" value={inr(totalBilled)} subtext={`${rows.length} total invoice(s)`} />
        <KPICard label="Collected Payments" value={inr(totalPaid)} subtext="Settled collections" />
        <KPICard label="Outstanding Due" value={inr(totalDue)} subtext="Pending receivables" />
      </div>

      {isCreating && (
        <Card title="Issue New Tax Invoice">
          <form action={createInvoice}>
            <div className="row">
              <SearchableSelect
                label="Select School Account / POC"
                name="entity_id"
                options={schoolOptions}
                required
                placeholder="Type contact person name or school..."
              />
              <Field label="Place of Supply (State)" name="place_of_supply" placeholder="Defaults to school's state" />
              <Field label="Payment Due Date" name="due_date" type="date" />
            </div>
            <div style={{ marginTop: 12, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <a href="/invoices" className="btn ghost">Cancel</a>
              <SubmitButton>Generate Invoice Draft</SubmitButton>
            </div>
          </form>
        </Card>
      )}

      <Card title={`All Invoices (${rows.length})`}>
        <div className="scroll">
          <table>
            <thead>
              <tr>
                <th>Invoice Number</th>
                <th>School Reference</th>
                <th>Contact Person (POC)</th>
                <th>Invoice Date</th>
                <th>Status</th>
                <th className="right">Total Billed</th>
                <th className="right">Received</th>
                <th className="right">Amount Due</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan={8} className="muted" style={{ padding: '24px', textAlign: 'center' }}>No invoices created yet.</td></tr>
              ) : (
                rows.map((i) => {
                  const due = i.total - i.paid
                  const isPaid = due <= 0
                  return (
                    <tr key={i.id}>
                      <td>
                        <a href={`/invoices/${i.id}`} style={{ fontWeight: 600 }}>{i.number}</a>
                      </td>
                      <td><strong>{i.school}</strong></td>
                      <td>{i.poc_name ? <span>👤 {i.poc_name}</span> : <span className="muted">No POC</span>}</td>
                      <td>{d(i.invoice_date)}</td>
                      <td>
                        <Tag v={isPaid ? 'paid' : i.status} />
                      </td>
                      <td className="right">{inr(i.total)}</td>
                      <td className="right" style={{ color: 'var(--good-fg)' }}>{inr(i.paid)}</td>
                      <td className="right" style={{ fontWeight: 700, color: due > 0 ? 'var(--bad-fg)' : 'var(--ink-soft)' }}>
                        {inr(due)}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  )
}
