import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
export const DATABASE_SAVE_EVENT = 'caja:database-save'

let pendingWrites = 0
let failedWrite = false
let settleTimer = null

function publishSaveStatus(detail) {
  globalThis.dispatchEvent(new CustomEvent(DATABASE_SAVE_EVENT, { detail }))
}

async function trackedFetch(input, init) {
  const requestUrl = input instanceof URL ? input.href : typeof input === 'string' ? input : input.url
  const method = String(init?.method || input?.method || 'GET').toUpperCase()
  let tracksWrite = false

  try {
    const path = new URL(requestUrl).pathname
    tracksWrite = (path.includes('/rest/v1/') || path.includes('/storage/v1/')) && !['GET', 'HEAD', 'OPTIONS'].includes(method)
  } catch {
    tracksWrite = false
  }

  if (!tracksWrite) return globalThis.fetch(input, init)

  if (settleTimer) {
    clearTimeout(settleTimer)
    settleTimer = null
  } else if (pendingWrites === 0) {
    failedWrite = false
  }
  if (pendingWrites === 0) publishSaveStatus({ status: 'saving', source: 'request' })
  pendingWrites += 1

  let succeeded = false
  try {
    const response = await globalThis.fetch(input, init)
    succeeded = response.ok
    return response
  } finally {
    if (!succeeded) failedWrite = true
    pendingWrites -= 1
    if (pendingWrites === 0) {
      settleTimer = setTimeout(() => {
        settleTimer = null
        if (failedWrite) {
          publishSaveStatus({ status: 'error' })
          return
        }
        publishSaveStatus({ status: 'saved', savedAt: new Date().toISOString() })
      }, 120)
    }
  }
}

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey, { global: { fetch: trackedFetch } })
  : null

export async function loadOpenShift() {
  if (!supabase) return null

  const { data, error } = await supabase
    .from('turnos')
    .select('id, abierto, fecha_hora_inicio, caja_inicial, redondeo, cajas(nombre), dias_turno(nombre, hora_inicio, hora_fin)')
    .eq('abierto', true)
    .order('fecha_hora_inicio', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw error
  return data
}
