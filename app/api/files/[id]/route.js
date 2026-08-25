import { NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import sql from '../../../../lib/db'
import { getUser } from '../../../../lib/auth'

export async function GET(request, { params }) {
  // Check auth
  const user = await getUser()
  if (!user) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const id = Number((await params).id)
  if (!id) {
    return new NextResponse('Invalid ID', { status: 400 })
  }

  // Fetch file info from DB
  const [doc] = await sql`select * from documents where id = ${id}`
  if (!doc) {
    return new NextResponse('Not Found', { status: 404 })
  }

  if (doc.is_folder || !doc.file_path) {
    return new NextResponse('Not a local file', { status: 400 })
  }

  try {
    // Read the file from disk
    const fileBuffer = await fs.readFile(doc.file_path)

    // Set appropriate headers
    const headers = new Headers()
    headers.set('Content-Type', doc.mime_type || 'application/octet-stream')
    // Use inline to view PDFs/images in browser, or attachment for download
    headers.set('Content-Disposition', `inline; filename="${doc.title}"`)

    return new NextResponse(fileBuffer, { headers })
  } catch (err) {
    console.error('File read error:', err)
    return new NextResponse('File missing on disk', { status: 500 })
  }
}
