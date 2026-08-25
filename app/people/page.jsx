import sql from '../../lib/db'
import { requireUser } from '../../lib/auth'
import PeopleClient from './PeopleClient'

export default async function PeoplePage({ searchParams }) {
  const user = await requireUser('people')
  const sp = await searchParams
  const isAddingEmp = sp?.action === 'new_emp'
  const isAddingUser = sp?.action === 'new_user'

  const [emps, leaves, slips, attendance, logins] = await Promise.all([
    sql`select em.*, u.email, u.role from employees em left join users u on u.id = em.user_id
        where em.active order by em.name`,
    sql`select l.*, em.name from leave_requests l join employees em on em.id = l.employee_id
        order by l.status <> 'pending', l.from_on desc limit 50`,
    sql`select p.*, em.name from payslips p join employees em on em.id = p.employee_id
        order by p.period desc, em.name limit 50`,
    sql`select a.*, em.name from attendance a join employees em on em.id = a.employee_id
        where a.on_date >= current_date - 7 order by a.on_date desc, em.name`,
    sql`select id, name, email, role from users where active order by name`,
  ])

  const thisMonth = new Date().toISOString().slice(0, 7)

  return (
    <PeopleClient
      user={user}
      emps={emps}
      leaves={leaves}
      slips={slips}
      attendance={attendance}
      logins={logins}
      isAddingEmp={isAddingEmp}
      isAddingUser={isAddingUser}
      thisMonth={thisMonth}
    />
  )
}
