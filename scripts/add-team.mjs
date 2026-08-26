// Seed/Add SchoolGrads team members to users and employees tables.
// Usage: node scripts/add-team.mjs [default_password] [default_role]

import { loadEnv } from './env.mjs'
import postgres from 'postgres'
import bcrypt from 'bcryptjs'

loadEnv()

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set')
}

const sql = postgres(process.env.DATABASE_URL, { max: 1 })

const defaultPassword = process.argv[2] || 'SchoolGrads@2026'
const defaultRole = process.argv[3] || 'sales'

const team = [
  {
    name: 'Maddireddy Nithin Reddy',
    email: 'nithinreddy@schoolgrads.ai',
    role: 'admin',
    designation: 'Owner & Founder',
  },
  {
    name: 'Syed Gulam Murtuza',
    email: 'murtuza@schoolgrads.ai',
    role: 'admin',
    designation: 'Business & Operations Head',
  },
  {
    name: 'Donnipad Raghavendra Rao',
    email: 'raghu@schoolgrads.ai',
    role: 'sales',
    designation: 'Sales Representative',
  },
  {
    name: 'Anushree Sharma',
    email: 'anushree@schoolgrads.ai',
    role: 'sales',
    designation: 'Sales Representative',
  },
  {
    name: 'Somya Rawat',
    email: 'somyarawat@schoolgrads.ai',
    role: 'sales',
    designation: 'Sales Representative',
  },
]

const hash = bcrypt.hashSync(defaultPassword, 10)

console.log(`Adding ${team.length} team members with default password "${defaultPassword}"...`)

for (const member of team) {
  // Upsert user
  const [u] = await sql`
    insert into users (name, email, password_hash, role, active)
    values (${member.name}, ${member.email.toLowerCase()}, ${hash}, ${member.role || defaultRole}, true)
    on conflict (email) do update set
      name = excluded.name,
      role = excluded.role,
      active = true
    returning id, name, email, role
  `

  // Upsert corresponding employee record
  const [emp] = await sql`
    select id from employees where user_id = ${u.id} or lower(name) = lower(${member.name}) limit 1
  `

  if (emp) {
    await sql`
      update employees set user_id = ${u.id}, designation = ${member.designation} where id = ${emp.id}
    `
  } else {
    await sql`
      insert into employees (name, designation, user_id, ctc)
      values (${member.name}, ${member.designation}, ${u.id}, 0)
    `
  }

  console.log(`✓ Added/Updated: ${u.name} <${u.email}> (${u.role})`)
}

console.log('\nAll team members added successfully!')
await sql.end()
