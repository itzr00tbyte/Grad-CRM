'use server'

import { revalidatePath } from 'next/cache'
import sql from '../../lib/db'
import { requireUser, hashPassword, ROLES } from '../../lib/auth'
import { professionalTax } from '../../lib/payroll'

export async function saveEmployee(formData) {
  await requireUser('people')
  const row = {
    name: String(formData.get('name') || ''),
    designation: String(formData.get('designation') || ''),
    doj: formData.get('doj') || null,
    pan: String(formData.get('pan') || ''),
    aadhaar: String(formData.get('aadhaar') || ''),
    bank_account: String(formData.get('bank_account') || ''),
    bank_ifsc: String(formData.get('bank_ifsc') || ''),
    ctc: Number(formData.get('ctc')) || 0,
    uan: String(formData.get('uan') || ''),
    esic_no: String(formData.get('esic_no') || ''),
    emergency_contact: String(formData.get('emergency_contact') || ''),
  }
  const id = Number(formData.get('id'))
  if (id) await sql`update employees set ${sql(row)} where id = ${id}`
  else await sql`insert into employees ${sql(row)}`
  revalidatePath('/people')
}

/** Creates the login for an employee. Admin sets a starting password; there is no
 *  email flow — with fewer than ten staff, handing it over in person is the whole process.
 *
 *  Only an admin may choose the role: the 'people' section also admits finance, and an
 *  unchecked role field would let a finance user mint themselves an admin login and read
 *  everything the role model restricts. Anyone else creates plain employees. */
export async function createUser(formData) {
  const user = await requireUser('people')
  const email = String(formData.get('email') || '').trim()
  const password = String(formData.get('password') || '')
  if (!email || password.length < 8) return
  const asked = String(formData.get('role') || 'employee')
  const role = user.role === 'admin' && ROLES.includes(asked) ? asked : 'employee'
  const [u] = await sql`insert into users (name, email, password_hash, role)
                        values (${formData.get('name')}, ${email}, ${hashPassword(password)}, ${role})
                        on conflict (email) do nothing returning id`
  const empId = Number(formData.get('employee_id'))
  if (u && empId) await sql`update employees set user_id = ${u.id} where id = ${empId}`
  revalidatePath('/people')
}

/** Admin only, unlike the rest of this section. 'people' also admits finance, and setting
 *  someone's password is taking over their account — including an admin's. */
export async function resetPassword(formData) {
  const user = await requireUser('people')
  if (user.role !== 'admin') return
  const password = String(formData.get('password') || '')
  const id = Number(formData.get('user_id'))
  if (!id || password.length < 8) return
  await sql`update users set password_hash = ${hashPassword(password)} where id = ${id}`
  revalidatePath('/people')
}

export async function decideLeave(formData) {
  const user = await requireUser('people')
  await sql`update leave_requests set status = ${formData.get('status')}, decided_by = ${user.id}
            where id = ${Number(formData.get('id'))}`
  revalidatePath('/people')
  revalidatePath('/me')
}

export async function savePayslip(formData) {
  await requireUser('people')
  const basic = Number(formData.get('basic')) || 0
  const hra = Number(formData.get('hra')) || 0
  const allowances = Number(formData.get('allowances')) || 0
  const ptOverride = formData.get('pt')
  const pt = ptOverride === '' || ptOverride == null ? professionalTax(basic + hra + allowances) : Number(ptOverride)

  await sql`insert into payslips (employee_id, period, basic, hra, allowances, pt, tds, other_deductions)
            values (${Number(formData.get('employee_id'))}, ${formData.get('period') + '-01'},
                    ${basic}, ${hra}, ${allowances}, ${pt},
                    ${Number(formData.get('tds')) || 0}, ${Number(formData.get('other_deductions')) || 0})
            on conflict (employee_id, period) do update set
              basic = excluded.basic, hra = excluded.hra, allowances = excluded.allowances,
              pt = excluded.pt, tds = excluded.tds, other_deductions = excluded.other_deductions`
  revalidatePath('/people')
}
