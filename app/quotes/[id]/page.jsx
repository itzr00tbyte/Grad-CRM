import { notFound } from 'next/navigation'
import sql from '../../../lib/db'
import { requireUser } from '../../../lib/auth'
import { d } from '../../../lib/fmt'
import { Card, Field, Tag } from '../../../components/ui'
import { ItemsEditor } from '../../../components/items'
import { addQuoteItem, deleteQuoteItem, updateQuote, duplicateQuote } from '../actions'
import { invoiceFromQuote } from '../../invoices/actions'
import { PrintButton } from '../../../components/print'

export default async function QuotePage({ params }) {
  await requireUser('billing')
  const id = Number((await params).id)

  const [[q], items, programs] = await Promise.all([
    sql`select q.*, e.name as school, e.state, e.gstin, e.address, e.city
        from quotes q join entities e on e.id = q.entity_id where q.id = ${id}`,
    sql`select * from quote_items where quote_id = ${id} order by id`,
    sql`select * from programs where active order by name`,
  ])
  if (!q) notFound()
  const intra = (q.state || 'Telangana') === 'Telangana'

  return (
    <>
      <h1>
        Quote {q.number} <Tag v={q.status} />
      </h1>
      <p className="muted">
        <a href={`/schools/${q.entity_id}`}>{q.school}</a> · {d(q.quote_date)}
        {q.gstin && ` · GSTIN ${q.gstin}`}
      </p>

      <Card>
        <ItemsEditor
          items={items}
          programs={programs}
          parentField="quote_id"
          parentId={q.id}
          addAction={addQuoteItem}
          deleteAction={deleteQuoteItem}
          intraState={intra}
        />
      </Card>

      <Card title="Status" >
        <form action={updateQuote} className="row">
          <input type="hidden" name="id" value={q.id} />
          <Field label="Status" name="status" options={['draft', 'sent', 'accepted', 'rejected']} value={q.status} />
          <Field label="Notes" name="notes" value={q.notes} />
          <div className="field">
            <button type="submit">Save</button>
          </div>
        </form>
      </Card>

      <div className="row noprint" style={{ marginTop: 16, display: 'flex', gap: 8, alignItems: 'center' }}>
        <form action={invoiceFromQuote}>
          <input type="hidden" name="quote_id" value={q.id} />
          <button type="submit" disabled={items.length === 0}>
            Convert to GST invoice
          </button>
        </form>

        <form action={duplicateQuote}>
          <input type="hidden" name="id" value={q.id} />
          <button className="ghost" type="submit">
            Duplicate Quote
          </button>
        </form>

        <PrintButton />
      </div>
    </>
  )
}
