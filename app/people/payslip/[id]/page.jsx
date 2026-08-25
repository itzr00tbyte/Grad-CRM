import { notFound } from 'next/navigation'
import sql from '../../../../lib/db'
import { requireUser, can } from '../../../../lib/auth'
import { inr, d } from '../../../../lib/fmt'
import { payslipTotals } from '../../../../lib/payroll'
import { ORG } from '../../../../lib/org'
import { Card } from '../../../../components/ui'
import { PrintButton } from '../../../../components/print'

export default async function PayslipPage({ params }) {
  const user = await requireUser()
  const id = Number((await params).id)

  const [p] = await sql`select p.*, em.name, em.designation, em.pan, em.bank_account, em.user_id
                        from payslips p join employees em on em.id = p.employee_id where p.id = ${id}`
  if (!p) notFound()
  // Own payslip, or HR. Nobody else sees pay.
  if (!can(user, 'people') && p.user_id !== user.id) notFound()

  const t = payslipTotals(p)
  const rows = [
    ['Basic', p.basic],
    ['HRA', p.hra],
    ['Allowances', p.allowances],
  ]
  const ded = [
    ['Professional Tax', p.pt],
    ['TDS', p.tds],
    ['Other deductions', p.other_deductions],
  ]

  return (
    <>
      <h1>Payslip — {d(p.period).slice(0, 7)}</h1>
      <Card>
        <p className="muted">
          {ORG.name} · {ORG.address}
        </p>
        <p>
          <strong>{p.name}</strong> · {p.designation}
          {p.pan && ` · PAN ${p.pan}`}
          {p.bank_account && ` · A/c ${p.bank_account}`}
        </p>
        <table>
          <thead>
            <tr>
              <th>Earnings</th>
              <th className="right">₹</th>
              <th>Deductions</th>
              <th className="right">₹</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([label, v], i) => (
              <tr key={label}>
                <td>{label}</td>
                <td className="right">{inr(v)}</td>
                <td>{ded[i][0]}</td>
                <td className="right">{inr(ded[i][1])}</td>
              </tr>
            ))}
            <tr>
              <td>
                <strong>Gross</strong>
              </td>
              <td className="right">
                <strong>{inr(t.gross)}</strong>
              </td>
              <td>
                <strong>Total deductions</strong>
              </td>
              <td className="right">
                <strong>{inr(t.deductions)}</strong>
              </td>
            </tr>
            <tr>
              <td colSpan={3}>
                <strong>Net pay</strong>
              </td>
              <td className="right">
                <strong>{inr(t.net)}</strong>
              </td>
            </tr>
          </tbody>
        </table>
      </Card>
      <PrintButton />
    </>
  )
}
