import { execSync } from 'child_process'
import postgres from 'postgres'
import bcrypt from 'bcryptjs'
import { loadEnv } from './env.mjs'

loadEnv()

if (!process.env.DATABASE_URL) {
  console.error('Error: DATABASE_URL is not defined in environment.')
  process.exit(1)
}

const pyCmd = `python3 -c "
import openpyxl, json
wb = openpyxl.load_workbook('InboxTales_School_Contacts_Master.xlsx')
ws = wb['Members']
rows = []
for r in range(2, ws.max_row + 1):
    vals = [ws.cell(r, c).value for c in range(1, 4)]
    if any(vals):
        rows.append({'name': vals[0], 'email': vals[1], 'role': vals[2]})
print(json.dumps(rows))
"`

const excelDataJson = execSync(pyCmd).toString()
const members = JSON.parse(excelDataJson)

console.log('Parsed Excel Members:', members)

const sql = postgres(process.env.DATABASE_URL, { max: 1 })

const defaultPasswordHash = bcrypt.hashSync('SchoolGrads@2026', 10)

for (const member of members) {
  let dbRole = 'employee'
  const roleLower = (member.role || '').toLowerCase()
  if (roleLower.includes('admin') || roleLower.includes('leadership')) {
    dbRole = 'admin'
  } else if (roleLower.includes('sales')) {
    dbRole = 'sales'
  } else if (roleLower.includes('ops')) {
    dbRole = 'ops'
  } else if (roleLower.includes('finance')) {
    dbRole = 'finance'
  }

  const [u] = await sql`
    insert into users (name, email, password_hash, role, active)
    values (${member.name}, ${member.email}, ${defaultPasswordHash}, ${dbRole}, true)
    on conflict (email) do update set
      name = excluded.name,
      role = excluded.role,
      active = true
    returning id, name, email, role`

  console.log(`User created/updated: ID ${u.id} | ${u.name} | ${u.email} | Role: ${u.role}`)

  const [emp] = await sql`
    select id from employees where user_id = ${u.id} or lower(name) = lower(${member.name})`

  if (emp) {
    await sql`
      update employees set
        user_id = ${u.id},
        name = ${member.name},
        designation = ${member.role}
      where id = ${emp.id}`
    console.log(`  └─ Employee updated: ID ${emp.id}`)
  } else {
    const [newEmp] = await sql`
      insert into employees (user_id, name, designation)
      values (${u.id}, ${member.name}, ${member.role})
      returning id`
    console.log(`  └─ Employee created: ID ${newEmp.id}`)
  }
}

console.log('\nImport successful!')
await sql.end()
