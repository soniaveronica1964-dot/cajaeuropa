import { supabase } from './supabase'

function requireSupabase() {
  if (!supabase) throw new Error('Supabase no está configurado')
}

async function query(table, columns, configure = () => {}) {
  requireSupabase()
  let request = supabase.from(table).select(columns)
  request = configure(request) || request
  const { data, error } = await request
  if (error) throw error
  return data ?? []
}

export async function loadCurrentShiftData() {
  requireSupabase()
  const { data: shift, error: shiftError } = await supabase
    .from('turnos')
    .select('id, abierto, fecha_hora_inicio, fecha_hora_fin, caja_inicial, caja_final, redondeo, caja_id, cajas(id, nombre), dias_turno(id, nombre, hora_inicio, hora_fin)')
    .eq('abierto', true)
    .order('fecha_hora_inicio', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (shiftError) throw shiftError
  if (!shift) return { shift: null, accounts: [], advertising: [], bonuses: [], tips: [], expenses: [], logistics: [], users: [], goals: [], chips: [] }

  const [accounts, advertising, bonuses, tips, expenses, logistics, users, goals, chips] = await Promise.all([
    query('cuentas_x_turno', 'id, cuenta_id, caja_id, valor, cobros, retiros, cuentas(alias, titulares(nombre), billeteras(nombre))', request => request.eq('turno_id', shift.id)),
    query('lineas_publicidad', 'id, publicidad_id, total_llegados, nuevos, repetidos, sin_respuesta, total_derivados, publicidad!inner(turno_id)', request => request.eq('publicidad.turno_id', shift.id)),
    query('lineas_bonos', 'id, bono_id, valor, recuperado, es_publicidad, notas, fecha_hora_creacion, bonos!inner(turno_id)', request => request.eq('bonos.turno_id', shift.id).order('fecha_hora_creacion', { ascending: false })),
    query('propinas', 'id, monto, notas, usuario_texto, fecha_hora_creacion', request => request.eq('turno_id', shift.id).order('fecha_hora_creacion', { ascending: false })),
    query('gastos', 'id, monto, notas, fecha_hora_creacion, tipos_gasto(nombre, invertir_signo)', request => request.eq('turno_id', shift.id).order('fecha_hora_creacion', { ascending: false })),
    query('lineas_logistica', 'id, aclaracion, ultimo_reinicio_cobros, ultimo_reinicio_retiros, ultimo_reinicio_caja, ultimo_reinicio_general, num_orden, logistica!inner(turno_id), cuentas_x_turno(cuentas(alias, titulares(nombre), billeteras(nombre)))', request => request.eq('logistica.turno_id', shift.id).order('num_orden')), 
    query('usuarios', 'id, fecha_creacion, bloqueado, nombres_usuario(nombre), telefonos_usuario(numero), titulares_usuario(nombre), paneles_x_usuario(paneles(nombre))', request => request.order('fecha_creacion', { ascending: false })),
    query('subobjetivos_x_turno', 'objetivo_alcanzado_turno, objetivo_final_turno, subobjetivos(fecha, objetivos(nombre, objetivo_alcanzado, objetivo_final))', request => request.eq('turno_id', shift.id)),
    query('fichas', 'id, fichas_inicial, fichas_final, plataforma_id, plataformas(nombre), cargas_fichas(valor, fecha_hora_creacion)', request => request.eq('turno_id', shift.id)),
  ])

  return { shift, accounts, advertising, bonuses, tips, expenses, logistics, users, goals, chips }
}

export async function loadConfigurationData() {
  const [boxes, holders, wallets, walletTypes, accountTypes, expenses, platforms, bonusConditions, states] = await Promise.all([
    query('cajas', 'id, nombre, imagen, imagen_mini, color_id, es_publicidad'),
    query('titulares', 'id, nombre, orden_num'),
    query('billeteras', 'id, nombre, orden_num, tipo_billetera_id, tipos_billetera(nombre, cobros, retiros)'),
    query('tipos_billetera', 'id, nombre, cobros, retiros'),
    query('tipos_cuenta', 'id, nombre, es_compartido, es_publicidad, cobros, retiros, ahorro'),
    query('tipos_gasto', 'id, nombre, invertir_signo'),
    query('plataformas', 'id, nombre, caja_id, color_id'),
    query('condiciones_bono', 'id, nombre, plataforma'),
    query('estados', 'id, nombre, imagen_mini, tipo_estado_id, tipos_estado(nombre, cantidad_porcentaje)'),
  ])
  return { boxes, holders, wallets, walletTypes, accountTypes, expenses, platforms, bonusConditions, states }
}

export async function loadBonusCatalog() {
  return query('estados', 'id, nombre, imagen, imagen_mini, tipo_estado_id, tipos_estado(nombre, cantidad_porcentaje), lineas_estado(porcentaje, condiciones_bono(nombre, plataforma), subplataformas(nombre))')
}

async function updateRow(table, id, values) {
  requireSupabase()
  const { data, error } = await supabase.from(table).update(values).eq('id', id).select().single()
  if (error) throw error
  return data
}

export function updateShiftRounding(shiftId, value) {
  return updateRow('turnos', shiftId, { redondeo: Number(value) || 0 })
}

export function updateAccountValue(accountShiftId, value) {
  return updateRow('cuentas_x_turno', accountShiftId, { valor: Number(value) || 0 })
}

export function updateAdvertisingLine(lineId, field, value) {
  if (!['total_llegados', 'nuevos', 'repetidos', 'sin_respuesta', 'total_derivados'].includes(field)) {
    throw new Error('Campo de publicidad no permitido')
  }
  return updateRow('lineas_publicidad', lineId, { [field]: Math.max(0, Number(value) || 0) })
}

export async function loadStatistics(from, to, cajaId) {
  const [shifts, tips, expenses, bonuses] = await Promise.all([
    query('turnos', 'id, abierto, fecha_hora_inicio, fecha_hora_fin, caja_inicial, caja_final, redondeo, caja_id, dias_turno(nombre, hora_inicio, hora_fin)', request => {
      let next = request.gte('fecha_hora_inicio', from).lte('fecha_hora_inicio', to).order('fecha_hora_inicio', { ascending: false })
      if (cajaId) next = next.eq('caja_id', cajaId)
      return next
    }),
    query('propinas', 'id, monto, fecha_hora_creacion, turno_id, turnos!inner(fecha_hora_inicio, caja_id)', request => {
      let next = request.gte('fecha_hora_creacion', from).lte('fecha_hora_creacion', to)
      if (cajaId) next = next.eq('turnos.caja_id', cajaId)
      return next
    }),
    query('gastos', 'id, monto, fecha_hora_creacion, turno_id, turnos!inner(fecha_hora_inicio, caja_id)', request => {
      let next = request.gte('fecha_hora_creacion', from).lte('fecha_hora_creacion', to)
      if (cajaId) next = next.eq('turnos.caja_id', cajaId)
      return next
    }),
    query('lineas_bonos', 'id, valor, recuperado, fecha_hora_creacion, bonos!inner(turno_id, turnos!inner(fecha_hora_inicio, caja_id))', request => {
      let next = request.gte('fecha_hora_creacion', from).lte('fecha_hora_creacion', to)
      if (cajaId) next = next.eq('bonos.turnos.caja_id', cajaId)
      return next
    }),
  ])
  return { shifts, tips, expenses, bonuses }
}
