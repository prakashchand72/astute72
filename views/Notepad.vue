<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'

const STORAGE_KEY = 'notepad:v1'
const PBKDF2_ITERATIONS = 250000

const mode = ref('loading')
const password = ref('')
const confirmPassword = ref('')
const error = ref('')
const content = ref('')
const status = ref('')
const passwordRef = ref(null)

let cryptoKey = null
let saltBytes = null

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
  const enc = new TextEncoder()
  const baseKey = await crypto.subtle.importKey(
    'raw',
    enc.encode(pw),
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

const readStore = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

const focusPassword = () => {
  nextTick(() => {
    if (passwordRef.value) passwordRef.value.focus()
  })
}

const setupPassword = async () => {
  error.value = ''
  if (password.value.length < 6) {
    error.value = 'Password must be at least 6 characters.'
    return
  }
  if (password.value !== confirmPassword.value) {
    error.value = 'Passwords do not match.'
    return
  }
  try {
    saltBytes = crypto.getRandomValues(new Uint8Array(16))
    cryptoKey = await deriveKey(password.value, saltBytes)
    content.value = ''
    await saveEncrypted()
    password.value = ''
    confirmPassword.value = ''
    mode.value = 'unlocked'
    status.value = 'Ready.'
  } catch (e) {
    error.value = 'Could not initialize. Your browser may not support Web Crypto.'
  }
}

const unlock = async () => {
  error.value = ''
  const store = readStore()
  if (!store) {
    mode.value = 'setup'
    return
  }
  try {
    const salt = fromBase64(store.salt)
    const iv = fromBase64(store.iv)
    const ct = fromBase64(store.ct)
    const key = await deriveKey(password.value, salt)
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct)
    cryptoKey = key
    saltBytes = salt
    content.value = new TextDecoder().decode(plain)
    password.value = ''
    mode.value = 'unlocked'
    status.value = 'Unlocked.'
  } catch {
    error.value = 'Incorrect password.'
    password.value = ''
    focusPassword()
  }
}

const saveEncrypted = async () => {
  if (!cryptoKey || !saltBytes) return
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const ct = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    new TextEncoder().encode(content.value)
  )
  const payload = {
    v: 1,
    salt: toBase64(saltBytes),
    iv: toBase64(iv),
    ct: toBase64(ct),
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
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

const lock = () => {
  cryptoKey = null
  saltBytes = null
  content.value = ''
  status.value = ''
  mode.value = 'locked'
  focusPassword()
}

const resetEverything = () => {
  const ok = window.confirm(
    'This will permanently delete all encrypted notes and let you set a new password. Continue?'
  )
  if (!ok) return
  localStorage.removeItem(STORAGE_KEY)
  cryptoKey = null
  saltBytes = null
  content.value = ''
  password.value = ''
  confirmPassword.value = ''
  error.value = ''
  status.value = ''
  mode.value = 'setup'
  focusPassword()
}

onMounted(() => {
  if (!hasCrypto.value) {
    mode.value = 'unsupported'
    return
  }
  const store = readStore()
  mode.value = store ? 'locked' : 'setup'
  focusPassword()
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
      v-else-if="mode === 'setup'"
      class="notepad-center"
      @submit.prevent="setupPassword"
    >
      <h3 class="notepad-title">Set a password</h3>
      <p class="notepad-hint">
        Your notes are encrypted with this password and stored only in this browser.
        Forgetting it means losing the notes.
      </p>
      <label class="notepad-label">Password
        <input
          ref="passwordRef"
          v-model="password"
          type="password"
          class="notepad-input"
          autocomplete="new-password"
        />
      </label>
      <label class="notepad-label">Confirm password
        <input
          v-model="confirmPassword"
          type="password"
          class="notepad-input"
          autocomplete="new-password"
        />
      </label>
      <p v-if="error" class="notepad-error">{{ error }}</p>
      <div class="notepad-row">
        <button type="submit" class="notepad-btn">Create</button>
      </div>
    </form>

    <form
      v-else-if="mode === 'locked'"
      class="notepad-center"
      @submit.prevent="unlock"
    >
      <h3 class="notepad-title">Enter password</h3>
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
        <button type="button" class="notepad-btn notepad-btn-ghost" @click="resetEverything">
          Reset (deletes notes)
        </button>
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

.notepad-btn-ghost {
  background: transparent;
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
