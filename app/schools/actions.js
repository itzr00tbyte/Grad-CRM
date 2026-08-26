'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import sql from '../../lib/db'
import { requireUser } from '../../lib/auth'
import { isGstin, isPan } from '../../lib/gst'
import { isValidSchoolName } from '../../lib/validation'
import { saveFile } from '../../lib/storage'

const f = (fd, k) => {
  const v = fd.get(k)
  return v === '' || v == null ? null : String(v)
}

/** GSTIN and PAN are stored uppercase and only when they are actually valid — an invoice
 *  carrying a mistyped GSTIN denies the school its input tax credit. Blank stays blank;
 *  a lead has no GST details yet. Returns an error string, or null when the row is clean. */
function idError(formData) {
  const name = f(formData, 'name')
  if (!isValidSchoolName(name)) {
    return 'Please enter a valid school / institute name (at least 3 characters, no email/URL or invalid placeholders).'
  }
  for (const [key, label, ok] of [
    ['gstin', 'GSTIN', isGstin],
    ['pan', 'PAN', isPan],
  ]) {
    const v = f(formData, key)
    if (v && !ok(v)) return `That ${label} (${v}) is not valid. Check it against the school's certificate.`
    if (v) formData.set(key, v.toUpperCase())
  }
  return null
}

export async function createSchool(formData) {
  const user = await requireUser('schools')
  const bad = idError(formData)
  if (bad) redirect('/schools?err=' + encodeURIComponent(bad))
  try {
    const [row] = await sql`
      insert into entities (name, board, segment, city, state, address, gstin, pan, status, owner_id)
      values (${f(formData, 'name')}, ${f(formData, 'board')}, ${f(formData, 'segment')},
              ${f(formData, 'city')}, ${f(formData, 'state') || 'Telangana'}, ${f(formData, 'address')},
              ${f(formData, 'gstin')}, ${f(formData, 'pan')}, ${f(formData, 'status') || 'lead'}, ${user.id})
      returning id`
    redirect(`/schools/${row.id}`)
  } catch (err) {
    if (err.code === '23505') {
      redirect('/schools?err=' + encodeURIComponent('That GSTIN, PAN or Name already exists.'))
    }
    throw err
  }
}

export async function updateSchool(formData) {
  await requireUser('schools')
  const id = Number(formData.get('id'))
  const bad = idError(formData)
  if (bad) redirect(`/schools/${id}?err=` + encodeURIComponent(bad))
  try {
    await sql`update entities set
        name = ${f(formData, 'name')}, board = ${f(formData, 'board')}, segment = ${f(formData, 'segment')},
        city = ${f(formData, 'city')}, state = ${f(formData, 'state')}, address = ${f(formData, 'address')},
        gstin = ${f(formData, 'gstin')}, pan = ${f(formData, 'pan')}, status = ${f(formData, 'status')},
        pilot_start = ${f(formData, 'pilot_start')}, pilot_end = ${f(formData, 'pilot_end')},
        success_criteria = ${f(formData, 'success_criteria')}, renewal_date = ${f(formData, 'renewal_date')},
        notes = ${f(formData, 'notes')}
      where id = ${id}`
    revalidatePath(`/schools/${id}`)
  } catch (err) {
    if (err.code === '23505') {
      redirect(`/schools/${id}?err=` + encodeURIComponent('That GSTIN, PAN or Name already exists on another record.'))
    }
    throw err
  }
}

export async function addContact(formData) {
  await requireUser('schools')
  const id = Number(formData.get('entity_id'))
  await sql`insert into contacts (entity_id, name, role_tag, email, phone)
            values (${id}, ${f(formData, 'name')}, ${f(formData, 'role_tag')},
                    ${f(formData, 'email')}, ${f(formData, 'phone')})`
  revalidatePath(`/schools/${id}`)
}

export async function deleteContact(formData) {
  await requireUser('schools')
  const id = Number(formData.get('entity_id'))
  await sql`update contacts set deleted_at = now() where id = ${Number(formData.get('id'))}`
  revalidatePath(`/schools/${id}`)
}

export async function addDocument(formData) {
  await requireUser('schools')
  const entityId = Number(formData.get('entity_id'))
  const parentId = formData.get('parent_id') ? Number(formData.get('parent_id')) : null
  const file = formData.get('file')
  const kind = formData.get('kind') || 'other'

  if (!file || file.size === 0) {
    redirect(`/schools/${entityId}?err=` + encodeURIComponent('Please select a file to upload.'))
  }

  try {
    // Save to disk
    const { filePath, size, mimeType } = await saveFile(file)
    
    // Insert into DB
    await sql`
      insert into documents (entity_id, parent_id, is_folder, title, file_path, size, mime_type, kind)
      values (${entityId}, ${parentId}, false, ${file.name}, ${filePath}, ${size}, ${mimeType}, ${kind})
    `
    revalidatePath(`/schools/${entityId}`)
  } catch (err) {
    console.error(err)
    redirect(`/schools/${entityId}?err=` + encodeURIComponent('File upload failed.'))
  }
}

export async function createFolder(formData) {
  await requireUser('schools')
  const entityId = Number(formData.get('entity_id'))
  const parentId = formData.get('parent_id') ? Number(formData.get('parent_id')) : null
  const name = formData.get('name')?.trim()

  if (!name) {
    redirect(`/schools/${entityId}?err=` + encodeURIComponent('Folder name is required.'))
  }

  await sql`
    insert into documents (entity_id, parent_id, is_folder, title)
    values (${entityId}, ${parentId}, true, ${name})
  `
  revalidatePath(`/schools/${entityId}`)
}

/** Admin-only: reassign a school account to a different sales rep. */
export async function assignSchool(formData) {
  const user = await requireUser('schools')
  if (user.role !== 'admin') redirect('/schools?err=' + encodeURIComponent('Only admins can reassign school accounts.'))
  const id = Number(formData.get('id'))
  const ownerId = formData.get('owner_id') ? Number(formData.get('owner_id')) : null
  await sql`update entities set owner_id = ${ownerId} where id = ${id}`
  revalidatePath(`/schools/${id}`)
}

/** Log an enquiry touchpoint — simplified form for quick call/meeting/enquiry capture. */
export async function logEnquiry(formData) {
  const user = await requireUser('schools')
  const entityId = Number(formData.get('entity_id'))
  const contactId = formData.get('contact_id') ? Number(formData.get('contact_id')) : null
  const source = f(formData, 'source') || 'call'
  const note = f(formData, 'note') || `${source} enquiry`
  const dueOn = f(formData, 'due_on')
  await sql`
    insert into activities (entity_id, kind, note, due_on, owner_id, outcome, contact_id)
    values (${entityId}, 'enquiry', ${note}, ${dueOn}, ${user.id},
            ${f(formData, 'outcome')}, ${contactId})`
  revalidatePath(`/schools/${entityId}`)
}

/** Bulk Delete selected schools (Soft delete) */
export async function bulkDeleteSchools(formData) {
  const user = await requireUser('schools')
  const rawIds = formData.get('ids')
  if (!rawIds) return

  const ids = JSON.parse(rawIds).map(Number).filter(Boolean)
  if (ids.length === 0) return

  // Admin can delete any; sales can delete schools they own
  if (user.role === 'admin') {
    await sql`update entities set deleted_at = now() where id in ${sql(ids)}`
  } else {
    await sql`update entities set deleted_at = now() where id in ${sql(ids)} and owner_id = ${user.id}`
  }

  revalidatePath('/schools')
}

/** Bulk Reassign selected schools to another rep (Admin only) */
export async function bulkAssignSchools(formData) {
  const user = await requireUser('schools')
  if (user.role !== 'admin') redirect('/schools?err=' + encodeURIComponent('Only admins can reassign school accounts.'))

  const rawIds = formData.get('ids')
  const ownerId = formData.get('owner_id') ? Number(formData.get('owner_id')) : null
  if (!rawIds) return

  const ids = JSON.parse(rawIds).map(Number).filter(Boolean)
  if (ids.length === 0) return

  await sql`update entities set owner_id = ${ownerId} where id in ${sql(ids)}`
  revalidatePath('/schools')
}

