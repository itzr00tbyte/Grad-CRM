// Creates the schema, the first admin login, and the four resold programs.
// Safe to re-run: schema is idempotent, seeds are skipped if present.
//   npm run init-db -- admin@schoolgrads.ai 'a-strong-password'

import { readFileSync } from 'node:fs'
import postgres from 'postgres'
import bcrypt from 'bcryptjs'
import { loadEnv } from './env.mjs'

loadEnv()

const [email = process.env.ADMIN_EMAIL, password = process.env.ADMIN_PASSWORD] = process.argv.slice(2)
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL not set')
if (!email || !password || password.length < 8) {
  throw new Error("usage: npm run init-db -- <admin-email> <password (8+ chars)>")
}

const sql = postgres(process.env.DATABASE_URL, { max: 1 })

await sql.unsafe(readFileSync(new URL('../schema.sql', import.meta.url), 'utf8'))
console.log('schema ok')

const [admin] = await sql`
  insert into users (name, email, password_hash, role)
  values ('Admin', ${email}, ${bcrypt.hashSync(password, 10)}, 'admin')
  on conflict (email) do nothing returning id`
console.log(admin ? `admin created: ${email}` : `admin already exists: ${email}`)

const programs = [
  ['Code School Finland — school licence', 'Code School Finland', 'per_school'],
  ['Code School Finland — teacher training', 'Code School Finland', 'per_teacher'],
  ['Moomin Language School', 'Moomin Language School', 'per_student'],
  ['Kindiedays preschool programme', 'Kindiedays', 'per_school'],
  ['Finnish Experience', 'Finnish Experience', 'per_school'],
]
for (const [name, vendor, unit] of programs) {
  await sql`insert into programs (name, vendor, unit)
            select ${name}, ${vendor}, ${unit}
            where not exists (select 1 from programs where name = ${name})`
}
console.log('catalog seeded (set prices and SAC codes in the app)')

await sql.end()
