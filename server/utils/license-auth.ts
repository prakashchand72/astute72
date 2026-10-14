import { createHash, timingSafeEqual } from 'node:crypto'

// Shared auth for the /license endpoint. The password lives in the Vercel env
// var DOCUMENT_PASSWORD (same gate as /document). Never hardcode it here.
export const LICENSE_COOKIE = 'license_auth'
export const MAX_ATTEMPTS = 5
export const LOCKOUT_MS = 60_000

// In-memory brute-force throttle keyed by client IP.
export const attempts = new Map<string, { count: number; until: number }>()

export function safeEqual(a: string, b: string): boolean {
  const ha = createHash('sha256').update(a).digest()
  const hb = createHash('sha256').update(b).digest()
  return timingSafeEqual(ha, hb)
}

// Stateless signed token so a forged cookie can't bypass the password.
export function sign(value: string): string {
  return createHash('sha256')
    .update(`${value}:${process.env.DOCUMENT_PASSWORD ?? ''}`)
    .digest('hex')
}

export function ipOf(event: any): string {
  return event.node.req.socket?.remoteAddress || 'unknown'
}

// True when the request carries a valid auth cookie.
export function isAuthed(event: any): boolean {
  const cookie = getCookie(event, LICENSE_COOKIE)
  return !!cookie && safeEqual(cookie, sign('ok'))
}

export function setAuthCookie(event: any): void {
  setCookie(event, LICENSE_COOKIE, sign('ok'), {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24,
  })
}

export function formHtml(error?: string): string {
  const err = error
    ? `<p style="color:#c00;font-weight:600;margin:0 0 12px">${error}</p>`
    : ''
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>License</title>
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
  <form class="card" method="post" action="/license">
    <h1>License &amp; Vehicle Documents</h1>
    <p class="sub">Enter the access password to view the documents.</p>
    ${err}
    <input type="password" name="password" placeholder="Password" autocomplete="current-password" autofocus required>
    <button type="submit">View documents</button>
  </form>
</body>
</html>`
}
