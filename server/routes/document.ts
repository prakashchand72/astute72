import { createHash, timingSafeEqual } from 'node:crypto'

// Public Google Drive folder this endpoint unlocks. Not secret, safe to commit.
const DRIVE_URL =
  'REDACTED_DRIVE_URL'

// The password is NEVER in this file. It lives in the Vercel env var
// DOCUMENT_PASSWORD (set in the Vercel dashboard, not committed to GitHub).
// If that var is missing the route fails closed and denies access.
const COOKIE = 'doc_auth'
const MAX_ATTEMPTS = 5
const LOCKOUT_MS = 60_000

// In-memory brute-force throttle keyed by client IP.
const attempts = new Map<string, { count: number; until: number }>()

function safeEqual(a: string, b: string): boolean {
  const ha = createHash('sha256').update(a).digest()
  const hb = createHash('sha256').update(b).digest()
  return timingSafeEqual(ha, hb)
}

// Stateless signed token so a forged cookie can't bypass the password.
function sign(value: string): string {
  return createHash('sha256')
    .update(`${value}:${process.env.DOCUMENT_PASSWORD ?? ''}`)
    .digest('hex')
}

function ipOf(event: any): string {
  return event.node.req.socket?.remoteAddress || 'unknown'
}

function formHtml(error?: string): string {
  const err = error
    ? `<p style="color:#c00;font-weight:600;margin:0 0 12px">${error}</p>`
    : ''
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Documents</title>
<style>
  * { box-sizing: border-box; }
  body {
    margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    background: #0f172a; color: #e2e8f0;
  }
  .card {
    background: #1e293b; border: 1px solid #334155; border-radius: 12px;
    padding: 32px; width: 100%; max-width: 360px; box-shadow: 0 20px 50px rgba(0,0,0,.4);
  }
  h1 { font-size: 20px; margin: 0 0 6px; }
  p.sub { color: #94a3b8; font-size: 13px; margin: 0 0 20px; }
  input[type=password] {
    width: 100%; padding: 12px 14px; border-radius: 8px; border: 1px solid #475569;
    background: #0f172a; color: #e2e8f0; font-size: 15px; margin-bottom: 14px; outline: none;
  }
  input[type=password]:focus { border-color: #38bdf8; }
  button {
    width: 100%; padding: 12px; border: 0; border-radius: 8px; cursor: pointer;
    background: #38bdf8; color: #0f172a; font-size: 15px; font-weight: 700;
  }
  button:hover { background: #0ea5e9; }
</style>
</head>
<body>
  <form class="card" method="post" action="/document">
    <h1>Documents</h1>
    <p class="sub">Enter the access password to open the shared folder.</p>
    ${err}
    <input type="password" name="password" placeholder="Password" autocomplete="current-password" autofocus required>
    <button type="submit">Open folder</button>
  </form>
</body>
</html>`
}

export default defineEventHandler(async (event) => {
  const method = getMethod(event)
  const ip = ipOf(event)

  if (method === 'GET') {
    const cookie = getCookie(event, COOKIE)
    if (cookie && safeEqual(cookie, sign('ok'))) {
      return sendRedirect(event, DRIVE_URL, 302)
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
      setCookie(event, COOKIE, sign('ok'), {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24,
      })
      return sendRedirect(event, DRIVE_URL, 302)
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
