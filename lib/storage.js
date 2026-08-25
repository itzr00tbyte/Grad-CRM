import { promises as fs } from 'fs'
import path from 'path'
import crypto from 'crypto'

const UPLOADS_DIR = path.join(process.cwd(), '.data', 'uploads')

export async function saveFile(file) {
  // Ensure the uploads directory exists
  await fs.mkdir(UPLOADS_DIR, { recursive: true })

  // Generate a unique filename to prevent collisions
  const filename = crypto.randomUUID()
  const filePath = path.join(UPLOADS_DIR, filename)

  // Write the file to disk
  const buffer = Buffer.from(await file.arrayBuffer())
  await fs.writeFile(filePath, buffer)

  return {
    filePath,
    size: file.size,
    mimeType: file.type,
  }
}
