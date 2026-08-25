import sql from '../../lib/db'
import { requireUser } from '../../lib/auth'
import { inr } from '../../lib/fmt'
import { Card, Field } from '../../components/ui'
import { SubmitButton } from '../../components/submit'
import { saveProgram } from './actions'

const UNITS = ['per_school', 'per_teacher', 'per_student']
const VENDORS = ['Code School Finland', 'Moomin Language School', 'Kindiedays', 'Finnish Experience', 'Other']

export default async function CatalogPage({ searchParams }) {
  await requireUser('catalog')
  const sp = await searchParams
  const isAdding = sp?.action === 'new'

  const rows = await sql`select * from programs order by vendor, name`

  return (
    <>
      <div className="page-header">
        <div className="page-title-group">
          <h1>Product & Program Catalog</h1>
          <p className="page-subtitle">Master price book, vendor listings, SAC codes, and GST rates for quotes & invoices.</p>
        </div>
        <div className="page-actions">
          <a href={isAdding ? '/catalog' : '/catalog?action=new'} className="btn">
            {isAdding ? 'Close Form' : '+ Add Program'}
          </a>
        </div>
      </div>

      {isAdding && (
        <Card title="Add Program to Catalog">
          <form action={saveProgram}>
            <div className="row">
              <Field label="Program Title" name="name" required placeholder="e.g. Code School Finland License" />
              <Field label="Vendor Partner" name="vendor" options={VENDORS} />
              <Field label="Pricing Unit" name="unit" options={UNITS} />
              <Field label="Unit Price ₹ (Excl. GST)" name="unit_price" type="number" step="0.01" placeholder="100000" />
              <Field label="SAC Code" name="sac_code" placeholder="999299" />
              <Field label="GST Rate %" name="gst_rate" type="number" step="0.01" value="18" />
            </div>
            <div style={{ marginTop: 12, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <a href="/catalog" className="btn ghost">Cancel</a>
              <SubmitButton>Add to Catalog</SubmitButton>
            </div>
          </form>
        </Card>
      )}

      <Card title={`Active Program Master List (${rows.length})`}>
        <div className="scroll">
          <table>
            <thead>
              <tr>
                <th>Program Name</th>
                <th>Vendor</th>
                <th>Pricing Unit</th>
                <th>SAC Code</th>
                <th>GST Rate %</th>
                <th>Unit Price ₹</th>
                <th className="right">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan={7} className="muted" style={{ padding: '24px', textAlign: 'center' }}>No catalog programs added.</td></tr>
              ) : (
                rows.map((p) => (
                  <tr key={p.id}>
                    <td colSpan={7} style={{ padding: 0 }}>
                      <form action={saveProgram} className="row" style={{ padding: '10px 12px', gap: 8, background: 'var(--canvas)', borderBottom: '1px solid var(--line)' }}>
                        <input type="hidden" name="id" value={p.id} />
                        <Field label="Name" name="name" value={p.name} />
                        <Field label="Vendor" name="vendor" options={VENDORS} value={p.vendor} />
                        <Field label="Unit" name="unit" options={UNITS} value={p.unit} />
                        <Field label="SAC" name="sac_code" value={p.sac_code} />
                        <Field label="GST %" name="gst_rate" type="number" step="0.01" value={p.gst_rate} />
                        <Field label="Price ₹" name="unit_price" type="number" step="0.01" value={p.unit_price} />
                        <div className="field" style={{ flex: '0 0 auto', display: 'flex', alignItems: 'flex-end' }}>
                          <SubmitButton className="ghost" style={{ padding: '6px 12px' }}>Save</SubmitButton>
                        </div>
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
