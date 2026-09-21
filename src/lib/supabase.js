import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
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
