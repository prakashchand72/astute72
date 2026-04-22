<script setup>
import { ref, computed, onMounted, onBeforeUnmount, nextTick, watch } from 'vue'

const PBKDF2_ITERATIONS = 250000

const VERIFY_SALT_B64 = '2A0M7fYXMtr/nc3MXekJlw=='
const VERIFY_IV_B64 = 'KqOTnxpuinS4mlOI'
const VERIFY_CT_B64 = 'vgM13TEQuLlR0P8mT4kR+HcV2FoigTDO'
const SLOT_SALT_B64 = 'mMgaA9SpeHvomwpXKrYfKg=='

const mode = ref('loading')
const password = ref('')
const error = ref('')
const content = ref('')
const status = ref('')
const passwordRef = ref(null)

let cryptoKey = null
let slotId = null
let autoSaveTimer = null
let suppressAutoSave = false
const AUTO_SAVE_DELAY = 600

const hasCrypto = computed(
  () => typeof window !== 'undefined' && window.crypto && window.crypto.subtle
)

const toBase64 = (buf) => {
  const bytes = new Uint8Array(buf)
  let s = ''
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i])
  return btoa(s)
}

const fromBase64 = (b64) => {
  const s = atob(b64)
  const bytes = new Uint8Array(s.length)
  for (let i = 0; i < s.length; i++) bytes[i] = s.charCodeAt(i)
  return bytes
}

const deriveKey = async (pw, salt) => {
  const baseKey = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(pw),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  )
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

const toBase64Url = (buf) =>
  toBase64(buf).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

const deriveSlotId = async (pw) => {
  const salt = fromBase64(SLOT_SALT_B64)
  const baseKey = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(pw),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  )
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    baseKey,
    128
  )
  return toBase64Url(bits)
}

const fetchStore = async (id) => {
  const res = await fetch(`/api/notepad?id=${encodeURIComponent(id)}`, {
    headers: { Accept: 'application/json' },
  })
  if (!res.ok) throw new Error(`Fetch failed: ${res.status}`)
  const data = await res.json()
  if (!data || !data.blob || typeof data.blob !== 'object') return null
  return data.blob
}

const putStore = async (id, payload) => {
  const res = await fetch('/api/notepad', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, blob: payload }),
  })
  if (!res.ok) throw new Error(`Save failed: ${res.status}`)
}

const focusPassword = () => {
  nextTick(() => {
    if (passwordRef.value) passwordRef.value.focus()
  })
}

const unlock = async () => {
  error.value = ''
  try {
    const verifySalt = fromBase64(VERIFY_SALT_B64)
    const verifyIv = fromBase64(VERIFY_IV_B64)
    const verifyCt = fromBase64(VERIFY_CT_B64)
    const key = await deriveKey(password.value, verifySalt)
    await crypto.subtle.decrypt({ name: 'AES-GCM', iv: verifyIv }, key, verifyCt)
    const id = await deriveSlotId(password.value)
    cryptoKey = key
    slotId = id
    suppressAutoSave = true
    let loadFailed = false
    try {
      const store = await fetchStore(id)
      if (store) {
        const iv = fromBase64(store.iv)
        const ct = fromBase64(store.ct)
        const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct)
        content.value = new TextDecoder().decode(plain)
      } else {
        content.value = ''
      }
    } catch {
      loadFailed = true
      content.value = ''
    }
    password.value = ''
    mode.value = 'unlocked'
    status.value = loadFailed ? 'Could not reach server. Edits will not save.' : 'Unlocked.'
    nextTick(() => { suppressAutoSave = false })
  } catch {
    error.value = 'Incorrect password.'
    password.value = ''
    focusPassword()
  }
}

const saveEncrypted = async () => {
  if (!cryptoKey || !slotId) return
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const ct = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    new TextEncoder().encode(content.value)
  )
  await putStore(slotId, { v: 1, iv: toBase64(iv), ct: toBase64(ct) })
}

const save = async () => {
  try {
    await saveEncrypted()
    const now = new Date()
    const hh = String(now.getHours()).padStart(2, '0')
    const mm = String(now.getMinutes()).padStart(2, '0')
    const ss = String(now.getSeconds()).padStart(2, '0')
    status.value = `Saved at ${hh}:${mm}:${ss}`
  } catch {
    status.value = 'Save failed.'
  }
}

const cancelAutoSave = () => {
  if (autoSaveTimer) {
    clearTimeout(autoSaveTimer)
    autoSaveTimer = null
  }
}

const scheduleAutoSave = () => {
  if (suppressAutoSave) return
  if (mode.value !== 'unlocked' || !cryptoKey) return
  cancelAutoSave()
  status.value = 'Saving…'
  autoSaveTimer = setTimeout(() => {
    autoSaveTimer = null
    save()
  }, AUTO_SAVE_DELAY)
}

watch(content, () => {
  scheduleAutoSave()
})

const lock = async () => {
  cancelAutoSave()
  if (cryptoKey && slotId) {
    try { await saveEncrypted() } catch {}
  }
  cryptoKey = null
  slotId = null
  content.value = ''
  status.value = ''
  mode.value = 'locked'
  focusPassword()
}

onMounted(() => {
  if (!hasCrypto.value) {
    mode.value = 'unsupported'
    return
  }
  mode.value = 'locked'
  focusPassword()
})

onBeforeUnmount(() => {
  cancelAutoSave()
})
</script>

<template>
  <div class="notepad-root">
    <div v-if="mode === 'loading'" class="notepad-center">
      <p>Loading…</p>
    </div>

    <div v-else-if="mode === 'unsupported'" class="notepad-center">
      <p>This browser does not support the Web Crypto API, which is required for encrypted notes.</p>
    </div>

    <form
      v-else-if="mode === 'locked'"
      class="notepad-center"
      @submit.prevent="unlock"
    >
      <h3 class="notepad-title">Enter password</h3>
      <p class="notepad-hint">
        Notes are encrypted. The password is required to view, edit, or clear them.
      </p>
      <label class="notepad-label">Password
        <input
          ref="passwordRef"
          v-model="password"
          type="password"
          class="notepad-input"
          autocomplete="current-password"
        />
      </label>
      <p v-if="error" class="notepad-error">{{ error }}</p>
      <div class="notepad-row">
        <button type="submit" class="notepad-btn">Unlock</button>
      </div>
    </form>

    <div v-else-if="mode === 'unlocked'" class="notepad-editor">
      <div class="notepad-toolbar">
        <button type="button" class="notepad-btn" @click="save">Save</button>
        <button type="button" class="notepad-btn" @click="lock">Lock</button>
        <span class="notepad-status">{{ status }}</span>
      </div>
      <textarea
        v-model="content"
        class="notepad-textarea"
        spellcheck="false"
        placeholder="Start typing…"
        @keydown.ctrl.s.prevent="save"
        @keydown.meta.s.prevent="save"
      ></textarea>
    </div>
  </div>
</template>

<style scoped>
.notepad-root {
  height: 100%;
  width: 100%;
  display: flex;
  flex-direction: column;
  font-family: 'MS Sans Serif', monospace;
  background: #c0c0c0;
}

.notepad-center {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: stretch;
  padding: 24px;
  gap: 8px;
  max-width: 360px;
  margin: 0 auto;
  width: 100%;
}

.notepad-title {
  font-size: 14px;
  font-weight: bold;
  margin: 0 0 4px 0;
}

.notepad-hint {
  font-size: 12px;
  color: #333;
  margin: 0 0 8px 0;
}

.notepad-label {
  display: flex;
  flex-direction: column;
  font-size: 12px;
  gap: 4px;
}

.notepad-input {
  font-family: 'MS Sans Serif', monospace;
  font-size: 13px;
  padding: 4px 6px;
  border-top: 1px solid #808080;
  border-left: 1px solid #808080;
  border-right: 1px solid #ffffff;
  border-bottom: 1px solid #ffffff;
  background: #ffffff;
  outline: none;
}

.notepad-error {
  color: #a00000;
  font-size: 12px;
  margin: 4px 0 0 0;
}

.notepad-row {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}

.notepad-btn {
  font-family: 'MS Sans Serif', monospace;
  font-size: 12px;
  padding: 4px 12px;
  background: #c0c0c0;
  color: #000;
  border-top: 1px solid #ffffff;
  border-left: 1px solid #ffffff;
  border-right: 1px solid #808080;
  border-bottom: 1px solid #808080;
  cursor: pointer;
  min-width: 72px;
}

.notepad-btn:active {
  border-top: 1px solid #808080;
  border-left: 1px solid #808080;
  border-right: 1px solid #ffffff;
  border-bottom: 1px solid #ffffff;
}

.notepad-editor {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
}

.notepad-toolbar {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 6px;
  background: #c0c0c0;
  border-bottom: 1px solid #808080;
}

.notepad-status {
  font-size: 12px;
  color: #333;
  margin-left: auto;
  padding-right: 4px;
}

.notepad-textarea {
  flex: 1;
  width: 100%;
  resize: none;
  border: none;
  outline: none;
  padding: 8px;
  font-family: 'MS Sans Serif', monospace;
  font-size: 13px;
  line-height: 1.45;
  background: #ffffff;
  color: #000;
  box-sizing: border-box;
}
</style>
