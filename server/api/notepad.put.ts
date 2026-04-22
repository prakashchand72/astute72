import { Redis } from '@upstash/redis'

const ID_PATTERN = /^[A-Za-z0-9_-]{16,128}$/
const MAX_BLOB_BYTES = 200_000

export default defineEventHandler(async (event) => {
  const body = await readBody<{ id?: unknown; blob?: unknown }>(event)
  const id = body?.id
  const blob = body?.blob
  if (typeof id !== 'string' || !ID_PATTERN.test(id)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid id' })
  }
  if (typeof blob !== 'string' || blob.length === 0 || blob.length > MAX_BLOB_BYTES) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid blob' })
  }
  const redis = Redis.fromEnv()
  await redis.set(`notepad:${id}`, blob)
  return { ok: true }
})
