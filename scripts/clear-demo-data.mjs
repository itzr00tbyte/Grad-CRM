import postgres from 'postgres'
import { loadEnv } from './env.mjs'

loadEnv()

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL missing')
  process.exit(1)
}

const sql = postgres(process.env.DATABASE_URL, { max: 1 })

const tablesToClear = [
  'audit_logs',
  'payments',
  'invoice_items',
  'invoices',
  'quote_items',
  'quotes',
  'deliveries',
  'activities',
  'documents',
  'contacts',
  'campaign_entities',
  'campaigns',
  'deals',
  'entities',
  'counters',
  'expenses',
  'attendance',
  'leave_requests',
  'payslips'
]

console.log('Clearing all entities and business data from database...')

await sql.begin(async (tx) => {
  for (const table of tablesToClear) {
    await tx`delete from ${tx(table)}`
    console.log(`  ✓ Cleared table: ${table}`)
  }
})

console.log('\nAll entities and business data successfully removed!')

const [{ u_count }] = await sql`select count(*)::int as u_count from users`
const [{ e_count }] = await sql`select count(*)::int as e_count from employees`
const [{ ent_count }] = await sql`select count(*)::int as ent_count from entities`

console.log(`\nDatabase status:`)
console.log(`  Users remaining: ${u_count}`)
console.log(`  Employees remaining: ${e_count}`)
console.log(`  Entities remaining: ${ent_count}`)

await sql.end()
