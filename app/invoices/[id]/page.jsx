import { notFound } from 'next/navigation'
import sql from '../../../lib/db'
import { requireUser, can } from '../../../lib/auth'
import { inr, d, today } from '../../../lib/fmt'
import { ORG } from '../../../lib/org'
import { Card, Field, Tag } from '../../../components/ui'
import { ItemsEditor } from '../../../components/items'
import { PrintButton } from '../../../components/print'
import { addInvoiceItem, deleteInvoiceItem, updateInvoice, addPayment } from '../actions'

export default async function InvoicePage({ params }) {
  const user = await requireUser('billing')
  const id = Number((await params).id)

  const [[inv], items, payments] = await Promise.all([
    sql`select i.*, e.name as school, e.address, e.city, e.state, e.gstin, e.pan
        from invoices i join entities e on e.id = i.entity_id where i.id = ${id}`,
    sql`select * from invoice_items where invoice_id = ${id} order by id`,
    sql`select * from payments where invoice_id = ${id} order by paid_on`,
  ])
  if (!inv) notFound()
  const received = payments.reduce((s, p) => s + Number(p.amount), 0)

  return (
    <>
      <h1>
        Tax Invoice {inv.number} <Tag v={inv.status} />
      </h1>

      <Card>
        <div className="grid">
          <div>
            {/* The invoice is the one page a school keeps, so the mark belongs on paper too. */}
            <img
              src="/brand/school-grads-logo.svg"
              alt=""
              style={{ height: 38, width: 'auto', display: 'block', marginBottom: 10 }}
            />
            <h2>Supplier</h2>
            <div>{ORG.name}</div>
            <div className="muted">{ORG.address}</div>
            <div className="muted">GSTIN: {ORG.gstin}</div>
            {ORG.pan && <div className="muted">PAN: {ORG.pan}</div>}
          </div>
          <div>
            <h2>Recipient</h2>
            <div>
              <a href={`/schools/${inv.entity_id}`}>{inv.school}</a>
            </div>
            <div className="muted">{[inv.address, inv.city, inv.state].filter(Boolean).join(', ')}</div>
            <div className="muted">GSTIN: {inv.gstin || '— unregistered —'}</div>
          </div>
          <div>
            <h2>Invoice</h2>
            <div className="muted">No: {inv.number}</div>
            <div className="muted">Date: {d(inv.invoice_date)}</div>
            <div className="muted">Due: {d(inv.due_date) || '—'}</div>
            <div className="muted">Place of supply: {inv.place_of_supply}</div>
            <div className="muted">{inv.intra_state ? 'CGST + SGST (intra-state)' : 'IGST (inter-state)'}</div>
          </div>
        </div>
      </Card>

      <Card>
        <ItemsEditor
          items={items}
          programs={await sql`select * from programs where active order by name`}
          parentField="invoice_id"
          parentId={inv.id}
          addAction={addInvoiceItem}
          deleteAction={deleteInvoiceItem}
          intraState={inv.intra_state}
          showSac
        />
        {inv.notes && <p className="muted">{inv.notes}</p>}
        {ORG.bank && <p className="muted">Bank: {ORG.bank}</p>}
      </Card>

      <div className="row noprint" style={{ marginBottom: 16 }}>
        <PrintButton />
      </div>

      <Card title="Invoice settings" >
        <form action={updateInvoice} className="row noprint">
          <input type="hidden" name="id" value={inv.id} />
          <Field label="Status" name="status" options={['issued', 'paid', 'cancelled']} value={inv.status} />
          <Field label="Place of supply" name="place_of_supply" value={inv.place_of_supply} />
          <Field label="Due date" name="due_date" type="date" value={d(inv.due_date)} />
          <Field label="Notes" name="notes" value={inv.notes} />
          <div className="field">
            <button type="submit">Save</button>
          </div>
        </form>
      </Card>

      <Card title={`Payments — received ${inr(received)}`}>
        <table>
          <tbody>
            {payments.map((p) => (
              <tr key={p.id}>
                <td style={{ width: 110 }}>{d(p.paid_on)}</td>
                <td className="right">{inr(p.amount)}</td>
                <td>{p.mode}</td>
                <td className="muted">{p.ref}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {can(user, 'finance') && (
          <form action={addPayment} className="row noprint" style={{ marginTop: 10 }}>
            <input type="hidden" name="invoice_id" value={inv.id} />
            <Field label="Date" name="paid_on" type="date" value={today()} />
            <Field label="Amount ₹" name="amount" type="number" step="0.01" required />
            <Field label="Mode" name="mode" options={['NEFT', 'UPI', 'Cheque', 'Cash', 'Other']} />
            <Field label="Reference" name="ref" />
            <div className="field">
              <button type="submit">Record payment</button>
            </div>
          </form>
        )}
      </Card>
    </>
  )
}
