<script setup>
import { ref, computed, onMounted } from 'vue'

const data = ref(null)
const loading = ref(true)
const error = ref('')

const mapUrl = computed(() => {
  if (!data.value || data.value.latitude == null) return ''
  return `https://www.google.com/maps?q=${data.value.latitude},${data.value.longitude}`
})

const rows = computed(() => {
  if (!data.value) return []
  const d = data.value
  const items = [
    ['IP Address', d.ip],
    ['Connection Type', d.type],
    ['Continent', d.continent],
    ['Country', d.country],
    ['Country Code', d.country_code],
    ['Region', d.region],
    ['City', d.city],
    ['Latitude', d.latitude],
    ['Longitude', d.longitude],
    ['ISP', d.connection?.isp],
    ['Organization', d.connection?.org],
    ['ASN', d.connection?.asn],
    ['Domain', d.connection?.domain],
    ['Timezone', d.timezone?.id],
    ['UTC Offset', d.timezone?.utc],
    ['Current Time', d.timezone?.current_time],
  ]
  return items.filter(([, v]) => v != null && v !== '')
})

onMounted(async () => {
  try {
    const res = await fetch('https://ipwho.is/')
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    data.value = await res.json()
  } catch (e) {
    error.value = 'Could not fetch visitor info.'
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="visitor-root">
    <div v-if="loading" class="visitor-center">
      <p>Fetching visitor info…</p>
    </div>

    <div v-else-if="error" class="visitor-center">
      <p>{{ error }}</p>
    </div>

    <div v-else class="visitor-body">
      <div class="visitor-head">
        <h3>Visitor Info</h3>
        <a v-if="mapUrl" class="visitor-map" :href="mapUrl" target="_blank">Open in Maps</a>
      </div>
      <table class="visitor-table">
        <tbody>
          <tr v-for="[label, value] in rows" :key="label">
            <td class="visitor-label">{{ label }}</td>
            <td class="visitor-value">{{ value }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.visitor-root {
  height: 100%;
  width: 100%;
  background: #1e1e1e;
  color: #d4d4d4;
  font-family: 'SF Mono', 'Cascadia Code', Consolas, 'Courier New', monospace;
  overflow-y: auto;
}

.visitor-center {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  color: #9d9d9d;
}

.visitor-body {
  padding: 12px 16px;
}

.visitor-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.visitor-head h3 {
  margin: 0;
  font-size: 15px;
  color: #569cd6;
}

.visitor-map {
  font-size: 12px;
  color: #4ec9b0;
  text-decoration: none;
}

.visitor-map:hover {
  text-decoration: underline;
}

.visitor-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}

.visitor-table tr {
  border-bottom: 1px solid #333;
}

.visitor-label {
  width: 45%;
  padding: 5px 8px;
  color: #9d9d9d;
  vertical-align: top;
}

.visitor-value {
  padding: 5px 8px;
  color: #d4d4d4;
  word-break: break-word;
}
</style>
