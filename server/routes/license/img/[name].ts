import { isAuthed } from '../../../utils/license-auth'

// Only these filenames are allowed; anything else is rejected (prevents path
// traversal and serving arbitrary files).
const ALLOWED = new Set([
  'license-card.jpg',
  'fee-receipt.jpg',
  'doc-3.jpg',
  'doc-4.jpg',
  'doc-5.jpg',
])

const MIME: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
}

export default defineEventHandler(async (event) => {
  // Must be authenticated to view any image.
  if (!isAuthed(event)) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const { name } = getRouterParams(event)
  if (typeof name !== 'string' || !ALLOWED.has(name)) {
    throw createError({ statusCode: 404, statusMessage: 'Not found' })
  }

  const storage = useStorage('assets:server')
  const data = await storage.getItemRaw(`license/${name}`)
  if (!data) {
    throw createError({ statusCode: 404, statusMessage: 'Not found' })
  }

  const ext = name.slice(name.lastIndexOf('.'))
  setResponseHeader(event, 'content-type', MIME[ext] ?? 'application/octet-stream')
  setResponseHeader(event, 'cache-control', 'private, max-age=3600')
  return data
})
