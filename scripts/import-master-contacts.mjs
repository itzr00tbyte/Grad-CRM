import fs from 'node:fs'
import { parse } from 'csv-parse/sync'
import postgres from 'postgres'
import { loadEnv } from './env.mjs'

loadEnv()

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL not set')
  process.exit(1)
}

const csvPath = '/Users/snehithchalasani/Stuff/SchoolGrads-CRM/InboxTales_School_Contacts_MASTER.csv'
if (!fs.existsSync(csvPath)) {
  console.error('CSV file not found at:', csvPath)
  process.exit(1)
}

const fileContent = fs.readFileSync(csvPath, 'utf8')
const records = parse(fileContent, {
  columns: true,
  skip_empty_lines: true,
  trim: true,
  bom: true
})

console.log(`Loaded ${records.length} records from CSV.`)

const sql = postgres(process.env.DATABASE_URL, { max: 1 })

const schoolMap = new Map()

import { isValidSchoolName } from '../lib/validation.js'

let skippedInvalidCount = 0

for (const row of records) {
  let schoolName = (row['School / Institute'] || '').trim()
  const contactName = (row['Name'] || '').trim()
  const city = (row['City'] || '').trim() || null
  const state = (row['State'] || '').trim() || null
  const board = (row['Board'] || '').trim() || null
  const address = (row['Address'] || '').trim() || null
  const designation = (row['Designation'] || '').trim() || null
  const email = (row['Email'] || '').trim() || null
  const mobile = (row['Mobile'] || '').trim() || (row['Alt Mobile'] || '').trim() || null
  const statusNotes = (row['Status / Notes'] || '').trim() || null
  const sourceTab = (row['Source Tab'] || '').trim() || null

  if (!isValidSchoolName(schoolName)) {
    if (contactName && isValidSchoolName(contactName)) {
      schoolName = contactName
    } else {
      skippedInvalidCount++
      continue
    }
  }

  // Deduplicate school entities by lower-case (schoolName, city)
  const schoolKey = `${schoolName.toLowerCase()}::${(city || '').toLowerCase()}`

  if (!schoolMap.has(schoolKey)) {
    schoolMap.set(schoolKey, {
      name: schoolName,
      city: city,
      state: state,
      board: board,
      address: address,
      notes: statusNotes,
      owner_id: null, // Left unassigned until claimed by a sales rep
      contacts: []
    })
  }

  const school = schoolMap.get(schoolKey)
  school.contacts.push({
    name: contactName || 'Main Contact',
    role_tag: designation,
    email: email,
    phone: mobile,
    notes: sourceTab ? `Source: ${sourceTab}` : null
  })
}

console.log(`Grouped into ${schoolMap.size} unique school entities.`)

let importedEntities = 0
let importedContacts = 0

await sql.begin(async (tx) => {
  for (const [_, school] of schoolMap) {
    const [entity] = await tx`
      insert into entities (name, board, city, state, address, status, notes, owner_id)
      values (
        ${school.name},
        ${school.board},
        ${school.city},
        ${school.state},
        ${school.address},
        'lead',
        ${school.notes},
        ${school.owner_id}
      )
      returning id
    `
    importedEntities++

    for (const c of school.contacts) {
      await tx`
        insert into contacts (entity_id, name, role_tag, email, phone, notes)
        values (
          ${entity.id},
          ${c.name},
          ${c.role_tag},
          ${c.email},
          ${c.phone},
          ${c.notes}
        )
      `
      importedContacts++
    }
  }
})

console.log(`\nImport completed successfully!`)
console.log(`  ✓ Entities (Schools) created: ${importedEntities}`)
console.log(`  ✓ Contacts created: ${importedContacts}`)

await sql.end()
