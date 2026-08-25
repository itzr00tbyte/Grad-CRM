import { inr } from '../lib/fmt'
import { lineTotal, totals } from '../lib/gst'
import { Field } from './ui'

/** Line editor shared by quotes and invoices. Leave price/GST/description blank
 *  and the action fills them from the chosen program. */
export function ItemsEditor({ items, programs, parentField, parentId, addAction, deleteAction, intraState, showSac }) {
  const t = totals(items, intraState)
  return (
    <>
      <div className="scroll">
        <table>
          <thead>
            <tr>
              <th>Description</th>
              {showSac && <th>SAC</th>}
              <th className="right">Qty</th>
              <th className="right">Rate</th>
              <th className="right">Taxable</th>
              <th className="right">GST%</th>
              <th className="right">Tax</th>
              <th className="noprint" />
            </tr>
          </thead>
          <tbody>
            {items.map((it) => {
              const lt = lineTotal(it)
              return (
                <tr key={it.id}>
                  <td>{it.description}</td>
                  {showSac && <td>{it.sac_code}</td>}
                  <td className="right">{Number(it.qty)}</td>
                  <td className="right">{inr(it.unit_price)}</td>
                  <td className="right">{inr(lt.taxable)}</td>
                  <td className="right">{Number(it.gst_rate)}</td>
                  <td className="right">{inr(lt.tax)}</td>
                  <td className="right noprint">
                    <form action={deleteAction}>
                      <input type="hidden" name="id" value={it.id} />
                      <input type="hidden" name={parentField} value={parentId} />
                      <button className="danger" type="submit">
                        ×
                      </button>
                    </form>
                  </td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={showSac ? 4 : 3} className="right">
                Taxable
              </td>
              <td className="right">{inr(t.taxable)}</td>
              <td colSpan={3} />
            </tr>
            {intraState ? (
              <>
                <tr>
                  <td colSpan={showSac ? 4 : 3} className="right">
                    CGST
                  </td>
                  <td className="right">{inr(t.cgst)}</td>
                  <td colSpan={3} />
                </tr>
                <tr>
                  <td colSpan={showSac ? 4 : 3} className="right">
                    SGST
                  </td>
                  <td className="right">{inr(t.sgst)}</td>
                  <td colSpan={3} />
                </tr>
              </>
            ) : (
              <tr>
                <td colSpan={showSac ? 4 : 3} className="right">
                  IGST
                </td>
                <td className="right">{inr(t.igst)}</td>
                <td colSpan={3} />
              </tr>
            )}
            <tr>
              <td colSpan={showSac ? 4 : 3} className="right">
                <strong>Total</strong>
              </td>
              <td className="right">
                <strong>{inr(t.total)}</strong>
              </td>
              <td colSpan={3} />
            </tr>
          </tfoot>
        </table>
      </div>

      <form action={addAction} className="row noprint" style={{ marginTop: 10 }}>
        <input type="hidden" name={parentField} value={parentId} />
        <Field
          label="Program"
          name="program_id"
          options={[['', '— none —'], ...programs.map((p) => [p.id, `${p.name} (${p.unit})`])]}
        />
        <Field label="Description" name="description" placeholder="blank = program name" />
        <Field label="Qty" name="qty" type="number" step="0.01" value="1" />
        <Field label="Rate ₹" name="unit_price" type="number" step="0.01" placeholder="blank = catalog" />
        <Field label="GST %" name="gst_rate" type="number" step="0.01" placeholder="blank = catalog" />
        <div className="field">
          <button type="submit">Add line</button>
        </div>
      </form>
    </>
  )
}
