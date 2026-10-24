const ID_PATTERN = /^[A-Za-z0-9_-]{16,128}$/
const MAX_BLOB_BYTES = 200_000

const storage = () => {
  const token = process.env.AIRTABLE_API_KEY
  const baseId = process.env.AIRTABLE_BASE_ID
  const table = process.env.AIRTABLE_TABLE_NAME || 'Notes'
  const slotField = process.env.AIRTABLE_SLOT_FIELD || 'SlotID'
  const blobField = process.env.AIRTABLE_BLOB_FIELD || 'Blob'
  if (!token || !baseId) {
    throw createError({ statusCode: 500, statusMessage: 'Storage not configured' })
  }
  return { token, baseId, table, slotField, blobField }
}

const findRecord = async (token, baseId, table, slotField, id) => {
  const formula = encodeURIComponent(`{${slotField}}='${id}'`)
  const res = await fetch(
    `https://api.airtable.com/v0/${baseId}/${table}?filterByFormula=${formula}&maxRecords=1`,
    { headers: { Authorization: `Bearer ${token}` } }
  )
  if (!res.ok) return null
  const data = await res.json()
  return data?.records?.[0] ?? null
}

export default defineEventHandler(async (event) => {
  const body = await readBody<{ id?: unknown; blob?: unknown }>(event)
  const id = body?.id
  const blob = body?.blob
  if (typeof id !== 'string' || !ID_PATTERN.test(id)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid id' })
  }
  if (
    !blob ||
    typeof blob !== 'object' ||
    typeof (blob as any).iv !== 'string' ||
    typeof (blob as any).ct !== 'string'
  ) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid blob' })
  }
  if (JSON.stringify(blob).length > MAX_BLOB_BYTES) {
    throw createError({ statusCode: 413, statusMessage: 'Blob too large' })
  }
  const { token, baseId, table, slotField, blobField } = storage()
  const blobStr = JSON.stringify(blob)
  const existing = await findRecord(token, baseId, table, slotField, id)

  if (existing) {
    const res = await fetch(
      `https://api.airtable.com/v0/${baseId}/${table}/${existing.id}`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fields: { [blobField]: blobStr } }),
      }
    )
    if (!res.ok) throw createError({ statusCode: 502, statusMessage: 'Storage error' })
  } else {
    const res = await fetch(`https://api.airtable.com/v0/${baseId}/${table}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fields: { [slotField]: id, [blobField]: blobStr } }),
    })
    if (!res.ok) throw createError({ statusCode: 502, statusMessage: 'Storage error' })
  }
  return { ok: true }
})
