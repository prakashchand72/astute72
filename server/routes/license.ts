import {
  LICENSE_COOKIE,
  MAX_ATTEMPTS,
  LOCKOUT_MS,
  attempts,
  safeEqual,
  sign,
  ipOf,
  isAuthed,
  setAuthCookie,
  formHtml,
} from '../utils/license-auth'

export default defineEventHandler(async (event) => {
  const method = getMethod(event)
  const ip = ipOf(event)

  if (method === 'GET') {
    if (isAuthed(event)) {
      const storage = useStorage('assets:server')
      const html = await storage.getItemRaw('license/license.html')
      if (html) {
        setResponseHeader(event, 'content-type', 'text/html; charset=utf-8')
        return html
      }
      throw createError({ statusCode: 500, statusMessage: 'License page not found' })
    }
    setResponseHeader(event, 'content-type', 'text/html; charset=utf-8')
    return formHtml()
  }

  if (method === 'POST') {
    const rec = attempts.get(ip)
    if (rec && rec.until > Date.now()) {
      return formHtml('Too many attempts. Try again in a minute.')
    }

    const body = await readBody<{ password?: unknown }>(event)
    const pw = typeof body?.password === 'string' ? body.password : ''
    const expected = process.env.DOCUMENT_PASSWORD

    // Fail closed: no password configured on the server means deny.
    if (expected && safeEqual(pw, expected)) {
      attempts.delete(ip)
      setAuthCookie(event)
      const storage = useStorage('assets:server')
      const html = await storage.getItemRaw('license/license.html')
      if (html) {
        setResponseHeader(event, 'content-type', 'text/html; charset=utf-8')
        return html
      }
      throw createError({ statusCode: 500, statusMessage: 'License page not found' })
    }

    const cur = attempts.get(ip) ?? { count: 0, until: 0 }
    cur.count += 1
    if (cur.count >= MAX_ATTEMPTS) {
      cur.until = Date.now() + LOCKOUT_MS
      cur.count = 0
    }
    attempts.set(ip, cur)
    return formHtml('Incorrect password.')
  }

  throw createError({ statusCode: 405, statusMessage: 'Method not allowed' })
})
