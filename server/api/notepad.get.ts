const ID_PATTERN = /^[A-Za-z0-9_-]{16,128}$/

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

export default defineEventHandler(async (event) => {
  const { id } = getQuery(event)
  if (typeof id !== 'string' || !ID_PATTERN.test(id)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid id' })
  }
  const { token, baseId, table, slotField, blobField } = storage()
  const formula = encodeURIComponent(`{${slotField}}='${id}'`)
  const res = await fetch(
    `https://api.airtable.com/v0/${baseId}/${table}?filterByFormula=${formula}&maxRecords=1`,
    { headers: { Authorization: `Bearer ${token}` } }
  )
  if (!res.ok) {
    throw createError({ statusCode: 502, statusMessage: 'Storage error' })
  }
  const data = await res.json()
  const blobStr = data?.records?.[0]?.fields?.[blobField]
  if (!blobStr) return { blob: null }
  try {
    return { blob: JSON.parse(blobStr) }
  } catch {
    return { blob: null }
  }
})
