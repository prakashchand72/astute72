<script setup>
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { EditorView, basicSetup } from 'codemirror'
import { EditorState, Compartment } from '@codemirror/state'
import { oneDark } from '@codemirror/theme-one-dark'
import { markdown } from '@codemirror/lang-markdown'
import { javascript } from '@codemirror/lang-javascript'
import { python } from '@codemirror/lang-python'
import { html } from '@codemirror/lang-html'
import { css } from '@codemirror/lang-css'
import { json } from '@codemirror/lang-json'
import { marked } from 'marked'

const PBKDF2_ITERATIONS = 250000

const VERIFY_SALT_B64 = '2A0M7fYXMtr/nc3MXekJlw=='
const VERIFY_IV_B64 = 'KqOTnxpuinS4mlOI'
const VERIFY_CT_B64 = 'vgM13TEQuLlR0P8mT4kR+HcV2FoigTDO'
const SLOT_SALT_B64 = 'mMgaA9SpeHvomwpXKrYfKg=='

const mode = ref('loading')
const password = ref('')
const error = ref('')
const status = ref('')
const passwordRef = ref(null)
const editorContainer = ref(null)
const titleInput = ref(null)

const notes = ref([])
const activeNoteId = ref(null)
const viewMode = ref('edit')
const language = ref('Markdown')

const languageMap = {
  Markdown: markdown(),
  JavaScript: javascript(),
  TypeScript: javascript({ typescript: true }),
  Python: python(),
  HTML: html(),
  CSS: css(),
  JSON: json(),
}

let cryptoKey = null
let slotId = null
let autoSaveTimer = null
let suppressAutoSave = false
let editorView = null
let languageCompartment = null
let loadingNote = false
const AUTO_SAVE_DELAY = 600

const hasCrypto = computed(
  () => typeof window !== 'undefined' && window.crypto && window.crypto.subtle
)

const activeNote = computed(() =>
  notes.value.find((n) => n.id === activeNoteId.value) || null
)

const charCount = computed(() => (activeNote.value ? activeNote.value.content.length : 0))
const wordCount = computed(() => {
  const t = activeNote.value ? activeNote.value.content.trim() : ''
  return t ? t.split(/\s+/).length : 0
})

const renderedHtml = computed(() => {
  const src = activeNote.value ? activeNote.value.content : ''
  if (!src) return ''
  try {
    return sanitize(marked.parse(src))
  } catch {
    return ''
  }
})

const sanitize = (html) => {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, '')
    .replace(/<object[\s\S]*?<\/object>/gi, '')
    .replace(/<embed[\s\S]*?<\/embed>/gi, '')
    .replace(/\son\w+="[^"]*"/gi, '')
    .replace(/\son\w+='[^']*'/gi, '')
    .replace(/javascript:/gi, '')
}

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

const makeId = () => {
  if (window.crypto && window.crypto.randomUUID) return window.crypto.randomUUID()
  return 'n' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

const createEditor = (doc) => {
  if (editorView) {
    editorView.destroy()
    editorView = null
  }
  languageCompartment = new Compartment()
  const state = EditorState.create({
    doc,
    extensions: [
      basicSetup,
      oneDark,
      EditorView.lineWrapping,
      languageCompartment.of(languageMap[language.value] || []),
      EditorView.updateListener.of((update) => {
        if (update.docChanged && !loadingNote) {
          const note = activeNote.value
          if (note) {
            note.content = update.state.doc.toString()
            note.updatedAt = Date.now()
            scheduleAutoSave()
          }
        }
      }),
    ],
  })
  editorView = new EditorView({ state, parent: editorContainer.value })
  editorView.focus()
}

const setEditorDoc = (doc) => {
  if (!editorView) return
  loadingNote = true
  editorView.dispatch({ changes: { from: 0, to: editorView.state.doc.length, insert: doc } })
  loadingNote = false
}

const changeLanguage = (lang) => {
  language.value = lang
  if (editorView && languageCompartment) {
    editorView.dispatch({
      effects: languageCompartment.reconfigure(languageMap[lang] || []),
    })
  }
}

const openNote = (id) => {
  if (activeNoteId.value === id) return
  activeNoteId.value = id
  viewMode.value = 'edit'
  nextTick(() => {
    const note = activeNote.value
    if (note) {
      setEditorDoc(note.content)
      if (titleInput.value) titleInput.value.value = note.title
    }
  })
}

const newNote = () => {
  const note = {
    id: makeId(),
    title: 'Untitled',
    content: '',
    updatedAt: Date.now(),
  }
  notes.value.push(note)
  activeNoteId.value = note.id
  viewMode.value = 'edit'
  nextTick(() => {
    setEditorDoc('')
    if (titleInput.value) titleInput.value.value = note.title
    titleInput.value && titleInput.value.focus()
  })
  status.value = 'New note.'
}

const deleteNote = (id) => {
  if (!confirm('Delete this note? This cannot be undone.')) return
  const idx = notes.value.findIndex((n) => n.id === id)
  if (idx === -1) return
  notes.value.splice(idx, 1)
  if (activeNoteId.value === id) {
    activeNoteId.value = notes.value.length ? notes.value[0].id : null
    nextTick(() => {
      const note = activeNote.value
      setEditorDoc(note ? note.content : '')
      if (titleInput.value) titleInput.value.value = note ? note.title : ''
    })
  }
  save()
  status.value = 'Note deleted.'
}

const onTitleInput = (e) => {
  if (activeNote.value) {
    activeNote.value.title = e.target.value
    scheduleAutoSave()
  }
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
    let plain = ''
    try {
      const store = await fetchStore(id)
      if (store) {
        const iv = fromBase64(store.iv)
        const ct = fromBase64(store.ct)
        const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct)
        plain = new TextDecoder().decode(decrypted)
      }
    } catch {
      loadFailed = true
    }
    let parsed = []
    try {
      const obj = JSON.parse(plain)
      if (Array.isArray(obj.notes)) parsed = obj.notes
      else if (typeof obj === 'string') parsed = [{ id: makeId(), title: 'Note', content: obj, updatedAt: Date.now() }]
    } catch {
      if (plain) parsed = [{ id: makeId(), title: 'Note', content: plain, updatedAt: Date.now() }]
    }
    notes.value = parsed
    activeNoteId.value = parsed.length ? parsed[0].id : null
    password.value = ''
    mode.value = 'unlocked'
    status.value = loadFailed ? 'Could not reach server. Edits will not save.' : 'Unlocked.'
    await nextTick()
    const note = activeNote.value
    createEditor(note ? note.content : '')
    if (titleInput.value) titleInput.value.value = note ? note.title : ''
    nextTick(() => { suppressAutoSave = false })
  } catch {
    error.value = 'Incorrect password.'
    password.value = ''
    focusPassword()
  }
}

const saveEncrypted = async () => {
  if (!cryptoKey || !slotId) return
  const payload = { v: 2, notes: notes.value }
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const ct = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    new TextEncoder().encode(JSON.stringify(payload))
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

const clearNote = async () => {
  if (!activeNote.value) return
  if (!confirm('Clear this note? This cannot be undone.')) return
  activeNote.value.content = ''
  activeNote.value.updatedAt = Date.now()
  setEditorDoc('')
  await save()
  status.value = 'Note cleared.'
}

const toggleView = () => {
  viewMode.value = viewMode.value === 'edit' ? 'preview' : 'edit'
}

const lock = async () => {
  cancelAutoSave()
  if (cryptoKey && slotId) {
    try { await saveEncrypted() } catch {}
  }
  if (editorView) {
    editorView.destroy()
    editorView = null
  }
  cryptoKey = null
  slotId = null
  notes.value = []
  activeNoteId.value = null
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
  if (editorView) {
    editorView.destroy()
    editorView = null
  }
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
        Your notes are encrypted. The password is required to view, edit, or clear them.
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

    <div v-else-if="mode === 'unlocked'" class="notepad-workspace">
      <aside class="notepad-sidebar">
        <button type="button" class="notepad-btn notepad-new" @click="newNote">+ New note</button>
        <div class="notepad-list">
          <button
            v-for="note in notes"
            :key="note.id"
            type="button"
            class="notepad-list-item"
            :class="{ active: note.id === activeNoteId }"
            @click="openNote(note.id)"
          >
            <span class="notepad-list-title">{{ note.title || 'Untitled' }}</span>
            <span class="notepad-list-del" title="Delete" @click.stop="deleteNote(note.id)">×</span>
          </button>
          <p v-if="!notes.length" class="notepad-empty">No notes yet. Click "+ New note".</p>
        </div>
      </aside>

      <div class="notepad-main">
        <div class="notepad-toolbar">
          <button type="button" class="notepad-btn" @click="save">Save</button>
          <button type="button" class="notepad-btn" @click="clearNote">Clear</button>
          <button type="button" class="notepad-btn" @click="lock">Lock</button>
          <button type="button" class="notepad-btn" @click="toggleView">
            {{ viewMode === 'edit' ? 'Preview' : 'Edit' }}
          </button>
          <select v-model="language" class="notepad-lang" @change="changeLanguage(language)">
            <option v-for="opt in Object.keys(languageMap)" :key="opt" :value="opt">{{ opt }}</option>
          </select>
          <span class="notepad-status">{{ status }}</span>
        </div>

        <input
          ref="titleInput"
          class="notepad-title-input"
          :value="activeNote ? activeNote.title : ''"
          placeholder="Note title…"
          @input="onTitleInput"
        />

        <div v-if="viewMode === 'edit'" ref="editorContainer" class="notepad-cm"></div>
        <div v-else class="notepad-preview" v-html="renderedHtml"></div>

        <div class="notepad-statusbar">
          <span>{{ notes.length }} note{{ notes.length === 1 ? '' : 's' }}</span>
          <span>{{ wordCount }} words</span>
          <span>{{ charCount }} characters</span>
          <span class="notepad-enc">Encrypted</span>
        </div>
      </div>
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
  background: #1e1e1e;
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
  background: #c0c0c0;
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
  background: #3c3c3c;
  color: #d4d4d4;
  border: 1px solid #555;
  cursor: pointer;
  min-width: 60px;
}

.notepad-btn:hover {
  background: #4a4a4a;
}

.notepad-btn:active {
  background: #2a2a2a;
}

.notepad-workspace {
  display: flex;
  height: 100%;
  width: 100%;
}

.notepad-sidebar {
  width: 180px;
  flex-shrink: 0;
  background: #252526;
  border-right: 1px solid #1a1a1a;
  display: flex;
  flex-direction: column;
  padding: 6px;
  gap: 6px;
}

.notepad-new {
  width: 100%;
}

.notepad-list {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.notepad-list-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  padding: 6px 8px;
  background: transparent;
  border: none;
  color: #cccccc;
  font-size: 12px;
  text-align: left;
  cursor: pointer;
  border-radius: 3px;
}

.notepad-list-item:hover {
  background: #2a2d2e;
}

.notepad-list-item.active {
  background: #094771;
  color: #ffffff;
}

.notepad-list-title {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.notepad-list-del {
  color: #888;
  font-size: 14px;
  padding: 0 2px;
}

.notepad-list-del:hover {
  color: #ff5555;
}

.notepad-empty {
  color: #666;
  font-size: 12px;
  padding: 8px;
}

.notepad-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.notepad-toolbar {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 6px;
  background: #2d2d2d;
  border-bottom: 1px solid #1a1a1a;
}

.notepad-lang {
  font-family: 'MS Sans Serif', monospace;
  font-size: 12px;
  padding: 2px 4px;
  background: #3c3c3c;
  color: #d4d4d4;
  border: 1px solid #555;
  outline: none;
  cursor: pointer;
}

.notepad-status {
  font-size: 12px;
  color: #9cdcfe;
  margin-left: auto;
  padding-right: 4px;
}

.notepad-title-input {
  font-family: 'MS Sans Serif', monospace;
  font-size: 14px;
  font-weight: bold;
  padding: 6px 10px;
  background: #1e1e1e;
  color: #d4d4d4;
  border: none;
  border-bottom: 1px solid #333;
  outline: none;
}

.notepad-cm {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  background: #1e1e1e;
}

.notepad-cm :deep(.cm-editor) {
  height: 100%;
  font-size: 13px;
}

.notepad-cm :deep(.cm-scroller) {
  font-family: 'SF Mono', 'Cascadia Code', Consolas, 'Courier New', monospace;
  line-height: 1.5;
}

.notepad-preview {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 12px 16px;
  background: #1e1e1e;
  color: #d4d4d4;
  font-family: 'SF Mono', 'Cascadia Code', Consolas, 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.6;
}

.notepad-preview :deep(h1),
.notepad-preview :deep(h2),
.notepad-preview :deep(h3) {
  color: #569cd6;
  border-bottom: 1px solid #333;
  padding-bottom: 4px;
}

.notepad-preview :deep(a) {
  color: #4ec9b0;
}

.notepad-preview :deep(code) {
  background: #2d2d2d;
  padding: 1px 4px;
  border-radius: 3px;
  color: #ce9178;
}

.notepad-preview :deep(pre) {
  background: #2d2d2d;
  padding: 10px;
  border-radius: 4px;
  overflow-x: auto;
}

.notepad-preview :deep(pre code) {
  background: transparent;
  padding: 0;
  color: #d4d4d4;
}

.notepad-preview :deep(blockquote) {
  border-left: 3px solid #569cd6;
  margin: 0;
  padding-left: 12px;
  color: #9d9d9d;
}

.notepad-preview :deep(ul),
.notepad-preview :deep(ol) {
  padding-left: 20px;
}

.notepad-preview :deep(table) {
  border-collapse: collapse;
}

.notepad-preview :deep(th),
.notepad-preview :deep(td) {
  border: 1px solid #444;
  padding: 4px 8px;
}

.notepad-statusbar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 3px 8px;
  background: #2d2d2d;
  border-top: 1px solid #1a1a1a;
  font-size: 11px;
  color: #9d9d9d;
}

.notepad-enc {
  margin-left: auto;
  color: #4ec9b0;
  font-weight: bold;
}
</style>
