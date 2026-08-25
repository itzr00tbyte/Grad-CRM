'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import sql from '../../lib/db'
import { requireUser, checkPassword, hashPassword } from '../../lib/auth'
import { leaveDays, leaveRemaining, leaveAllowed } from '../../lib/payroll'

async function myEmployee() {
  const user = await requireUser()
  const [em] = await sql`select * from employees where user_id = ${user.id}`
  return em
}

export async function punch() {
  const em = await myEmployee()
  if (!em) return
  // First punch of the day checks in, any later one moves check-out.
  await sql`insert into attendance (employee_id, on_date, check_in)
            values (${em.id}, current_date, now())
            on conflict (employee_id, on_date) do update set check_out = now()`
  revalidatePath('/me')
}

/** Own password only, and the current one has to be right — otherwise a borrowed unlocked
 *  laptop is a permanent account takeover. Its own ?pwerr / ?pwok so it does not land in the
 *  leave form's error slot. */
export async function changePassword(formData) {
  const user = await requireUser()
  const current = String(formData.get('current') || '')
  const next = String(formData.get('next') || '')
  const fail = (m) => redirect('/me?pwerr=' + encodeURIComponent(m))

  if (next.length < 8) fail('New password must be at least 8 characters.')
  const [u] = await sql`select password_hash from users where id = ${user.id}`
  if (!u || !checkPassword(current, u.password_hash)) fail('Current password is wrong.')

  await sql`update users set password_hash = ${hashPassword(next)} where id = ${user.id}`
  redirect('/me?pwok=1')
}

export async function applyLeave(formData) {
  const em = await myEmployee()
  if (!em) return
  const from = String(formData.get('from_on'))
  const to = String(formData.get('to_on') || from)
  const days = leaveDays(from, to)
  if (days < 1) redirect('/me?err=' + encodeURIComponent('End date is before the start date.'))
  const kind = String(formData.get('kind') || 'CL')

  // Approved and pending both count, so a run of applications cannot overshoot the balance.
  const [used] = await sql`
    select coalesce(sum(days) filter (where kind in ('CL','SL')), 0) as cl,
           coalesce(sum(days) filter (where kind = 'EL'), 0) as el
    from leave_requests
    where employee_id = ${em.id} and status in ('approved','pending')
      and date_part('year', from_on) = date_part('year', ${from}::date)`

  const remaining = leaveRemaining(em, used)
  if (!leaveAllowed(kind, days, remaining)) {
    const left = kind === 'EL' ? remaining.el : remaining.cl
    redirect('/me?err=' + encodeURIComponent(`${days} days of ${kind} exceeds your balance (${left} left).`))
  }

  await sql`insert into leave_requests (employee_id, kind, from_on, to_on, days, reason)
            values (${em.id}, ${kind}, ${from}, ${to}, ${days}, ${formData.get('reason') || null})`
  revalidatePath('/me')
  revalidatePath('/people')
}
