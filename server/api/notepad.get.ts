import { Redis } from '@upstash/redis'

const ID_PATTERN = /^[A-Za-z0-9_-]{16,128}$/

export default defineEventHandler(async (event) => {
  const { id } = getQuery(event)
  if (typeof id !== 'string' || !ID_PATTERN.test(id)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid id' })
  }
  const redis = Redis.fromEnv()
  const blob = await redis.get<string>(`notepad:${id}`)
  return { blob: blob ?? null }
})
