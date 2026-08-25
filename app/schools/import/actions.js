'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { parse } from 'csv-parse/sync'
import sql from '../../../lib/db'
import { requireUser } from '../../../lib/auth'
import { isValidSchoolName } from '../../../lib/validation'

export async function importLeads(formData) {
  const user = await requireUser('schools')
  const file = formData.get('file')
  
  if (!file || file.size === 0) {
    redirect('/schools/import?err=' + encodeURIComponent('Please upload a valid CSV file.'))
  }

  let records
  try {
    const text = await file.text()
    records = parse(text, {
      columns: true, // Use first row as headers
      skip_empty_lines: true,
      trim: true,
      // Convert headers to lowercase for easier mapping
      columns: header => header.map(column => column.toLowerCase().trim())
    })
  } catch (err) {
    console.error('CSV Parse Error:', err)
    redirect('/schools/import?err=' + encodeURIComponent('Invalid CSV format. Please use the template.'))
  }

  let importedCount = 0
  let skippedCount = 0

  for (const row of records) {
    const name = row.name
    if (!name || !isValidSchoolName(name)) {
      skippedCount++
      continue
    }

    try {
      // Map standard headers (name, city, state, board, segment, status, notes)
      const city = row.city || null
      const state = row.state || null
      const board = row.board || null
      const segment = row.segment || null
      const status = row.status || 'lead'
      const notes = row.notes || null

      await sql`
        insert into entities (name, city, state, board, segment, status, notes, owner_id)
        values (${name}, ${city}, ${state}, ${board}, ${segment}, ${status}, ${notes}, ${user.id})
      `
      importedCount++
    } catch (err) {
      // e.g. unique constraint violation or something
      console.error('Row import error:', err)
      skippedCount++
    }
  }

  revalidatePath('/schools')
  redirect(`/schools/import?success=${encodeURIComponent(`Successfully imported ${importedCount} leads. Skipped ${skippedCount} rows.`)}`)
}
