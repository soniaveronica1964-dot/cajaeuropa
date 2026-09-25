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

export async function loadCurrentShiftData(boxId = null) {
  requireSupabase()
  const boxes = await query('cajas', 'id, nombre, color_id, imagen_mini')
  let shiftRequest = supabase
    .from('turnos')
    .select('id, abierto, fecha_hora_inicio, fecha_hora_fin, caja_inicial, caja_final, redondeo, caja_id, cajas(id, nombre), dias_turno(id, nombre, hora_inicio, hora_fin)')
    .eq('abierto', true)
    .order('fecha_hora_inicio', { ascending: false })
    .limit(1)
  if (boxId) shiftRequest = shiftRequest.eq('caja_id', boxId)
  const { data: shift, error: shiftError } = await shiftRequest.maybeSingle()
  if (shiftError) throw shiftError
  if (!shift) return { shift: null, boxes, accounts: [], advertising: [], bonuses: [], tips: [], expenses: [], expenseTypes: [], logistics: [], users: [], goals: [], chips: [], walletTypes: [], accountTypes: [] }

  const [accountLinks, advertising, bonuses, tips, expenses, expenseTypes, logistics, users, goals, chips, holders, wallets, platforms, bonusConditions, accountTypes, walletTypes] = await Promise.all([
    query('cuentas_x_turno', 'id, cuenta_id, caja_id, valor, cobros, retiros', request => request.eq('turno_id', shift.id)),
    query('lineas_publicidad', 'id, publicidad_id, total_llegados, nuevos, repetidos, sin_respuesta, total_derivados, publicidad!inner(turno_id)', request => request.eq('publicidad.turno_id', shift.id)),
    query('lineas_bonos', 'id, bono_id, valor, recuperado, es_publicidad, notas, fecha_hora_creacion, bonos!inner(turno_id)', request => request.eq('bonos.turno_id', shift.id).order('fecha_hora_creacion', { ascending: false })),
    query('propinas', 'id, monto, notas, usuario_texto, fecha_hora_creacion', request => request.eq('turno_id', shift.id).order('fecha_hora_creacion', { ascending: false })),
    query('gastos', 'id, tipo_gasto_id, monto, notas, fecha_hora_creacion, tipos_gasto(nombre, invertir_signo)', request => request.eq('turno_id', shift.id).order('fecha_hora_creacion', { ascending: false })),
    query('tipos_gasto', 'id, nombre, invertir_signo'),
    query('lineas_logistica', 'id, aclaracion, ultimo_reinicio_cobros, ultimo_reinicio_retiros, ultimo_reinicio_caja, ultimo_reinicio_general, num_orden, cuenta_x_turno_id, logistica!inner(turno_id)', request => request.eq('logistica.turno_id', shift.id).order('num_orden')), 
    query('usuarios', 'id, fecha_creacion, bloqueado, nombres_usuario(nombre), telefonos_usuario(numero), titulares_usuario(nombre), paneles_x_usuario(paneles(nombre))', request => request.order('fecha_creacion', { ascending: false })),
    query('subobjetivos_x_turno', 'objetivo_alcanzado_turno, objetivo_final_turno, subobjetivos(fecha, objetivos(nombre, objetivo_alcanzado, objetivo_final))', request => request.eq('turno_id', shift.id)),
    query('fichas', 'id, fichas_inicial, fichas_final, plataforma_id, plataformas(nombre), cargas_fichas(valor, fecha_hora_creacion)', request => request.eq('turno_id', shift.id)),
    query('titulares', 'id, nombre, orden_num, is_off', request => request.eq('is_off', false).order('orden_num', { ascending: true }).order('id', { ascending: true })),
    query('billeteras', 'id, nombre, orden_num, is_off, tipo_billetera_id, tipos_billetera(nombre, cobros, retiros)', request => request.eq('is_off', false).order('orden_num', { ascending: true }).order('id', { ascending: true })),
    query('plataformas', 'id, nombre, caja_id, color_id'),
    query('condiciones_bono', 'id, nombre, plataforma'),
    query('tipos_cuenta', 'id, nombre, es_compartido, es_publicidad, cobros, retiros, ahorro'),
    query('tipos_billetera', 'id, nombre, cobros, retiros'),
  ])

  const accountIds = accountLinks.map(account => account.cuenta_id)
  const accounts = accountIds.length
    ? await query('cuentas', 'id, alias, cuil, patron, notas, tipo_cuenta_id, activa, titular_id, billetera_id, titulares(nombre), billeteras(nombre)', request => request.in('id', accountIds))
    : []
  const accountById = new Map(accounts.map(account => [account.id, account]))
  const linkedAccounts = accountLinks.map(link => ({ ...link, cuentas: accountById.get(link.cuenta_id) || null }))

  const logisticsWithAccounts = logistics.map(line => ({ ...line, cuentas_x_turno: { cuentas: accountById.get(accountLinks.find(link => link.id === line.cuenta_x_turno_id)?.cuenta_id) || null } }))

  return { shift, boxes, accounts: linkedAccounts, advertising, bonuses, tips, expenses, expenseTypes, logistics: logisticsWithAccounts, users, goals, chips, holders, wallets, platforms, bonusConditions, accountTypes, walletTypes }
}

export async function loadConfigurationData() {
  const [boxes, holders, wallets, walletTypes, accountTypes, expenses, platforms, bonusConditions, states, shiftTypes, shiftDays, appConfig] = await Promise.all([
    query('cajas', 'id, nombre, imagen, imagen_mini, color_id, es_publicidad'),
    query('titulares', 'id, nombre, orden_num, is_off', request => request.eq('is_off', false).order('orden_num', { ascending: true }).order('id', { ascending: true })),
    query('billeteras', 'id, nombre, orden_num, is_off, tipo_billetera_id, tipos_billetera(nombre, cobros, retiros)', request => request.eq('is_off', false).order('orden_num', { ascending: true }).order('id', { ascending: true })),
    query('tipos_billetera', 'id, nombre, cobros, retiros'),
    query('tipos_cuenta', 'id, nombre, es_compartido, es_publicidad, cobros, retiros, ahorro'),
    query('tipos_gasto', 'id, nombre, invertir_signo'),
    query('plataformas', 'id, nombre, caja_id, color_id'),
    query('condiciones_bono', 'id, nombre, plataforma'),
    query('estados', 'id, nombre, imagen_mini, tipo_estado_id, tipos_estado(nombre, cantidad_porcentaje)'),
    query('tipos_turno', 'id, caja_id, nombre, color_id'),
    query('dias_turno', 'id, nombre, dia_semana, hora_inicio, hora_fin, cruza_medianoche, tipo_turno_id'),
    query('app_config', 'id, nombre, icono, imagen, imagen_mini, tema, ver_notas, singleton'),
  ])
  return { boxes, holders, wallets, walletTypes, accountTypes, expenses, platforms, bonusConditions, states, shiftTypes, shiftDays, appConfig }
}

export async function loadBonusCatalog() {
  return query('estados', 'id, nombre, imagen, imagen_mini, tipo_estado_id, tipos_estado(nombre, cantidad_porcentaje), lineas_estado(porcentaje, condiciones_bono(nombre, plataforma), subplataformas(nombre))')
}

async function updateRow(table, id, values) {
  requireSupabase()
  const { data, error } = await supabase.from(table).update(values).eq('id', id).select().maybeSingle()
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

export async function createBonusLine(shiftId, { value, recovered, notes }) {
  requireSupabase()
  const { data: bonus, error: bonusError } = await supabase.from('bonos').select('id').eq('turno_id', shiftId).limit(1).maybeSingle()
  if (bonusError) throw bonusError
  if (!bonus) throw new Error('Este turno todavía no tiene un registro de bonos')
  const { data, error } = await supabase.from('lineas_bonos').insert({ bono_id: bonus.id, valor: Number(value) || 0, recuperado: Boolean(recovered), es_publicidad: false, notas: notes?.trim() || null }).select().single()
  if (error) throw error
  return data
}

export async function createTip(shiftId, { value, user, notes }) {
  requireSupabase()
  const { data, error } = await supabase.from('propinas').insert({ turno_id: shiftId, monto: Number(value) || 0, usuario_texto: user?.trim() || null, notas: notes?.trim() || null }).select().single()
  if (error) throw error
  return data
}

export async function createExpense(shiftId, { typeId, value, notes }) {
  requireSupabase()
  if (!typeId) throw new Error('Seleccioná un tipo de gasto')
  const { data, error } = await supabase.from('gastos').insert({ turno_id: shiftId, tipo_gasto_id: typeId, monto: Number(value) || 0, notas: notes?.trim() || null }).select().single()
  if (error) throw error
  return data
}

function colorHex(color) {
  const palette = {
    teal: '#72d7ca',
    blue: '#82b8ff',
    green: '#83d5a2',
    orange: '#f5ad69',
    pink: '#ed9fc1',
    red: '#ef8888',
    yellow: '#e8d477',
    violet: '#c2a0ed',
    slate: '#aebdca',
  }
  return palette[color] || '#72d7ca'
}

async function ensureColor(name, color = 'teal') {
  requireSupabase()
  const { data: existing, error: findError } = await supabase.from('colores').select('id').eq('nombre', name).limit(1).maybeSingle()
  if (findError) throw findError
  if (existing) return existing.id
  const { data, error } = await supabase.from('colores').insert({ nombre: name, hex: colorHex(color) }).select('id').single()
  if (error) throw error
  return data.id
}

export async function createBox({ name, color = 'teal' }) {
  requireSupabase()
  const colorId = await ensureColor(name, color)
  const { data, error } = await supabase.from('cajas').insert({ nombre: name.trim(), color_id: colorId, es_publicidad: false }).select().single()
  if (error) throw error
  return data
}

export async function updateBox(id, { name, color = 'teal' }) {
  requireSupabase()
  const colorId = await ensureColor(name || 'Caja', color)
  const { data, error } = await supabase.from('cajas').update({ nombre: name.trim(), color_id: colorId }).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function deleteBox(id) {
  requireSupabase()
  const { error } = await supabase.from('cajas').delete().eq('id', id)
  if (error) throw error
}

function normalizeEntityName(value) {
  return String(value ?? '').trim().replace(/\s+/g, ' ')
}

function isReservedPlaceholderName(value) {
  const normalized = normalizeEntityName(value).toLowerCase()
  return normalized === 'nuevo titular' || normalized === 'nueva billetera'
}

function nextAvailableOrderNumber(rows = []) {
  const numbers = rows
    .map((row) => Number(row.orden_num))
    .filter((value) => Number.isFinite(value) && value > 0)

  const unique = new Set(numbers)
  let index = 1
  while (unique.has(index)) index += 1
  return index
}

async function reindexEntityOrders(table, rows = []) {
  requireSupabase()
  const ordered = [...rows]
    .filter((row) => !Boolean(row.is_off))
    .sort((left, right) => {
      const leftValue = Number(left.orden_num) || Number.MAX_SAFE_INTEGER
      const rightValue = Number(right.orden_num) || Number.MAX_SAFE_INTEGER
      return leftValue - rightValue || Number(left.id) - Number(right.id)
    })
    .map((row, index) => ({ id: row.id, orden_num: index + 1 }))

  await Promise.all(ordered.map(({ id, orden_num }) => supabase
    .from(table)
    .update({ orden_num })
    .eq('id', id)))

  return ordered
}

export async function reorderEntityOrder(table, orderedIds = []) {
  requireSupabase()
  if (!orderedIds.length) return []

  const { data: rows = [], error } = await supabase
    .from(table)
    .select('id, orden_num, is_off')
    .in('id', orderedIds)
    .eq('is_off', false)

  if (error) throw error

  const byId = new Map((rows || []).map((row) => [String(row.id), row]))
  await Promise.all(orderedIds.map((id, index) => {
    if (!byId.has(String(id))) return Promise.resolve(null)
    return supabase.from(table).update({ orden_num: index + 1 }).eq('id', id)
  }))

  return orderedIds
}

async function ensureHolderWalletCombination({ holderId, walletId, boxId = null, shiftId = null, active = true }) {
  requireSupabase()
  if (!holderId || !walletId) return null
  const account = await createAccount({ holderId, walletId, active })
  if (boxId) {
    await ensureAccountBoxLink({ accountId: account.id, boxId })
  }
  if (boxId && shiftId) {
    await setAccountAvailability({ shiftId, boxId, accountId: account.id, enabled: Boolean(active), value: 0, canCollect: true, canWithdraw: true })
  }
  return account
}

export async function createHolder({ name, boxId = null, shiftId = null }) {
  requireSupabase()
  const trimmedName = normalizeEntityName(name)
  if (!trimmedName) throw new Error('El nombre del titular no puede estar vacío')
  if (isReservedPlaceholderName(trimmedName)) throw new Error('Ingresá un nombre real para el titular')

  const { data: activeRows = [], error: listError } = await supabase
    .from('titulares')
    .select('id, nombre, orden_num, is_off')
    .eq('is_off', false)
    .order('orden_num', { ascending: true })
    .order('id', { ascending: true })

  if (listError) throw listError

  const existing = activeRows.find((row) => normalizeEntityName(row.nombre) === trimmedName)
  if (existing) {
    const { data, error } = await supabase
      .from('titulares')
      .update({ nombre: trimmedName, is_off: false, orden_num: Number(existing.orden_num) || nextAvailableOrderNumber(activeRows) })
      .eq('id', existing.id)
      .select()
      .maybeSingle()
    if (error) throw error
    if (boxId) {
      await supabase.from('titulares_x_caja').upsert({ titular_id: data.id, caja_id: boxId }, { onConflict: 'titular_id,caja_id' }).select().maybeSingle()
    }
    return data
  }

  const { data, error } = await supabase
    .from('titulares')
    .insert({ nombre: trimmedName, orden_num: nextAvailableOrderNumber(activeRows), is_off: false })
    .select()
    .maybeSingle()

  if (error) throw error

  if (boxId) {
    await supabase.from('titulares_x_caja').upsert({ titular_id: data.id, caja_id: boxId }, { onConflict: 'titular_id,caja_id' }).select().maybeSingle()
    const { data: walletRows = [] } = await supabase.from('billeteras').select('id').eq('is_off', false)
    for (const wallet of walletRows) {
      await ensureHolderWalletCombination({ holderId: data.id, walletId: wallet.id, boxId, shiftId, active: true })
    }
  }

  return data
}

export async function updateHolder(id, { name, orderNum = null }) {
  requireSupabase()
  const trimmedName = normalizeEntityName(name)
  if (!trimmedName) throw new Error('El nombre del titular no puede estar vacío')
  if (isReservedPlaceholderName(trimmedName)) throw new Error('Ingresá un nombre real para el titular')

  const { data: activeRows = [], error: listError } = await supabase
    .from('titulares')
    .select('id, nombre, orden_num, is_off')
    .eq('is_off', false)

  if (listError) throw listError

  const duplicate = activeRows.find((row) => row.id !== id && normalizeEntityName(row.nombre) === trimmedName)
  if (duplicate) {
    const { error: disableError } = await supabase.from('titulares').update({ is_off: true }).eq('id', id)
    if (disableError) throw disableError
    return duplicate
  }

  const nextOrder = orderNum !== null && orderNum !== undefined ? Number(orderNum) : Number(activeRows.find((row) => row.id === id)?.orden_num || nextAvailableOrderNumber(activeRows))
  const { data, error } = await supabase
    .from('titulares')
    .update({ nombre: trimmedName, orden_num: nextOrder, is_off: false })
    .eq('id', id)
    .select()
    .maybeSingle()

  if (error) throw error
  return data
}

export async function deleteHolder(id) {
  requireSupabase()
  const { data: activeRows = [], error: listError } = await supabase
    .from('titulares')
    .select('id, nombre, orden_num, is_off')
    .eq('is_off', false)
    .order('orden_num', { ascending: true })
    .order('id', { ascending: true })

  if (listError) throw listError

  const { error } = await supabase
    .from('titulares')
    .update({ is_off: true })
    .eq('id', id)

  if (error) throw error

  const remaining = activeRows.filter((row) => row.id !== id)
  await reindexEntityOrders('titulares', remaining)
  return { id }
}

export async function createWallet({ name, typeName = 'Cobros y retiros', boxId = null, shiftId = null }) {
  requireSupabase()
  const trimmedName = normalizeEntityName(name)
  if (!trimmedName) throw new Error('El nombre de la billetera no puede estar vacío')
  if (isReservedPlaceholderName(trimmedName)) throw new Error('Ingresá un nombre real para la billetera')

  const { data: typeRow, error: typeError } = await supabase.from('tipos_billetera').select('id').eq('nombre', typeName).limit(1).maybeSingle()
  if (typeError) throw typeError
  let typeId = typeRow?.id
  if (!typeId) {
    const { data: createdType, error: createdTypeError } = await supabase.from('tipos_billetera').insert({ nombre: typeName, cobros: true, retiros: true }).select('id').maybeSingle()
    if (createdTypeError) throw createdTypeError
    typeId = createdType.id
  }

  const { data: activeRows = [], error: listError } = await supabase
    .from('billeteras')
    .select('id, nombre, orden_num, is_off')
    .eq('is_off', false)
    .order('orden_num', { ascending: true })
    .order('id', { ascending: true })

  if (listError) throw listError

  const existing = activeRows.find((row) => normalizeEntityName(row.nombre) === trimmedName)
  if (existing) {
    const { data, error } = await supabase
      .from('billeteras')
      .update({ nombre: trimmedName, is_off: false, orden_num: Number(existing.orden_num) || nextAvailableOrderNumber(activeRows), tipo_billetera_id: typeId })
      .eq('id', existing.id)
      .select()
      .maybeSingle()
    if (error) throw error
    if (boxId) {
      await supabase.from('billeteras_x_caja').upsert({ billetera_id: data.id, caja_id: boxId }, { onConflict: 'billetera_id,caja_id' }).select().maybeSingle()
    }
    return data
  }

  const { data, error } = await supabase
    .from('billeteras')
    .insert({ nombre: trimmedName, orden_num: nextAvailableOrderNumber(activeRows), tipo_billetera_id: typeId, is_off: false })
    .select()
    .maybeSingle()

  if (error) throw error

  if (boxId) {
    await supabase.from('billeteras_x_caja').upsert({ billetera_id: data.id, caja_id: boxId }, { onConflict: 'billetera_id,caja_id' }).select().maybeSingle()
    const { data: holderRows = [] } = await supabase.from('titulares').select('id').eq('is_off', false)
    for (const holder of holderRows) {
      await ensureHolderWalletCombination({ holderId: holder.id, walletId: data.id, boxId, shiftId, active: true })
    }
  }

  return data
}

export async function updateWallet(id, { name, typeName = 'Cobros y retiros', orderNum = null }) {
  requireSupabase()
  const trimmedName = normalizeEntityName(name)
  if (!trimmedName) throw new Error('El nombre de la billetera no puede estar vacío')
  if (isReservedPlaceholderName(trimmedName)) throw new Error('Ingresá un nombre real para la billetera')

  const { data: typeRow, error: typeError } = await supabase.from('tipos_billetera').select('id').eq('nombre', typeName).limit(1).maybeSingle()
  if (typeError) throw typeError
  let typeId = typeRow?.id
  if (!typeId) {
    const { data: createdType, error: createdTypeError } = await supabase.from('tipos_billetera').insert({ nombre: typeName, cobros: true, retiros: true }).select('id').maybeSingle()
    if (createdTypeError) throw createdTypeError
    typeId = createdType.id
  }

  const { data: activeRows = [], error: listError } = await supabase
    .from('billeteras')
    .select('id, nombre, orden_num, is_off')
    .eq('is_off', false)

  if (listError) throw listError

  const duplicate = activeRows.find((row) => row.id !== id && normalizeEntityName(row.nombre) === trimmedName)
  if (duplicate) {
    const { error: disableError } = await supabase.from('billeteras').update({ is_off: true }).eq('id', id)
    if (disableError) throw disableError
    return duplicate
  }

  const nextOrder = orderNum !== null && orderNum !== undefined ? Number(orderNum) : Number(activeRows.find((row) => row.id === id)?.orden_num || nextAvailableOrderNumber(activeRows))
  const { data, error } = await supabase
    .from('billeteras')
    .update({ nombre: trimmedName, orden_num: nextOrder, tipo_billetera_id: typeId, is_off: false })
    .eq('id', id)
    .select()
    .maybeSingle()

  if (error) throw error
  return data
}

export async function deleteWallet(id) {
  requireSupabase()
  const { data: activeRows = [], error: listError } = await supabase
    .from('billeteras')
    .select('id, nombre, orden_num, is_off')
    .eq('is_off', false)
    .order('orden_num', { ascending: true })
    .order('id', { ascending: true })

  if (listError) throw listError

  const { error } = await supabase
    .from('billeteras')
    .update({ is_off: true })
    .eq('id', id)

  if (error) throw error

  const remaining = activeRows.filter((row) => row.id !== id)
  await reindexEntityOrders('billeteras', remaining)
  return { id }
}

export async function createExpenseType({ name, inverted = false }) {
  requireSupabase()
  const { data, error } = await supabase.from('tipos_gasto').insert({ nombre: name.trim(), invertir_signo: Boolean(inverted) }).select().single()
  if (error) throw error
  return data
}

export async function updateExpenseType(id, { name, inverted = false }) {
  requireSupabase()
  const { data, error } = await supabase.from('tipos_gasto').update({ nombre: name.trim(), invertir_signo: Boolean(inverted) }).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function deleteExpenseType(id) {
  requireSupabase()
  const { error } = await supabase.from('tipos_gasto').delete().eq('id', id)
  if (error) throw error
}

export async function createPlatform({ name, color = 'teal', boxId = null }) {
  requireSupabase()
  const boxTargetId = boxId || (await supabase.from('cajas').select('id').limit(1).maybeSingle()).data?.id
  if (!boxTargetId) throw new Error('No hay una caja disponible para crear la plataforma')
  const colorId = await ensureColor(name, color)
  const { data, error } = await supabase.from('plataformas').insert({ nombre: name.trim(), caja_id: boxTargetId, color_id: colorId }).select().single()
  if (error) throw error
  return data
}

export async function updatePlatform(id, { name, color = 'teal' }) {
  requireSupabase()
  const colorId = await ensureColor(name || 'Plataforma', color)
  const { data, error } = await supabase.from('plataformas').update({ nombre: name.trim(), color_id: colorId }).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function deletePlatform(id) {
  requireSupabase()
  const { error } = await supabase.from('plataformas').delete().eq('id', id)
  if (error) throw error
}

export async function createBonusCondition({ name, platform = false }) {
  requireSupabase()
  const { data, error } = await supabase.from('condiciones_bono').insert({ nombre: name.trim(), plataforma: Boolean(platform) }).select().single()
  if (error) throw error
  return data
}

export async function updateBonusCondition(id, { name, platform = false }) {
  requireSupabase()
  const { data, error } = await supabase.from('condiciones_bono').update({ nombre: name.trim(), plataforma: Boolean(platform) }).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function deleteBonusCondition(id) {
  requireSupabase()
  const { error } = await supabase.from('condiciones_bono').delete().eq('id', id)
  if (error) throw error
}

export async function createShiftType({ boxId, name, color = 'teal' }) {
  requireSupabase()
  const colorId = await ensureColor(name || 'Tipo de turno', color)
  const { data, error } = await supabase.from('tipos_turno').insert({ caja_id: boxId, nombre: name.trim(), color_id: colorId }).select().single()
  if (error) throw error
  return data
}

export async function updateShiftType(id, { name, color = 'teal' }) {
  requireSupabase()
  const colorId = await ensureColor(name || 'Tipo de turno', color)
  const { data, error } = await supabase.from('tipos_turno').update({ nombre: name.trim(), color_id: colorId }).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function deleteShiftType(id) {
  requireSupabase()
  const { error } = await supabase.from('tipos_turno').delete().eq('id', id)
  if (error) throw error
}

export async function createDayShift({ typeId, name, weekday, start, end, crossesMidnight = false }) {
  requireSupabase()
  const { data, error } = await supabase.from('dias_turno').insert({
    tipo_turno_id: typeId,
    nombre: name.trim(),
    dia_semana: Number(weekday) || 1,
    hora_inicio: start,
    hora_fin: end,
    cruza_medianoche: Boolean(crossesMidnight),
  }).select().single()
  if (error) throw error
  return data
}

export async function updateDayShift(id, { name, weekday, start, end, crossesMidnight = false }) {
  requireSupabase()
  const { data, error } = await supabase.from('dias_turno').update({
    nombre: name.trim(),
    dia_semana: Number(weekday) || 1,
    hora_inicio: start,
    hora_fin: end,
    cruza_medianoche: Boolean(crossesMidnight),
  }).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function deleteDayShift(id) {
  requireSupabase()
  const { error } = await supabase.from('dias_turno').delete().eq('id', id)
  if (error) throw error
}

export async function createAccountType({ name, shared = false, advertising = false, saving = false, canCollect = false, canWithdraw = false }) {
  requireSupabase()
  const { data, error } = await supabase.from('tipos_cuenta').insert({
    nombre: name.trim(),
    es_compartido: Boolean(shared),
    es_publicidad: Boolean(advertising),
    ahorro: Boolean(saving),
    cobros: Boolean(canCollect),
    retiros: Boolean(canWithdraw),
  }).select().single()
  if (error) throw error
  return data
}

export async function updateAccountType(id, { name, shared = false, advertising = false, saving = false, canCollect = false, canWithdraw = false }) {
  requireSupabase()
  const { data, error } = await supabase.from('tipos_cuenta').update({
    nombre: name.trim(),
    es_compartido: Boolean(shared),
    es_publicidad: Boolean(advertising),
    ahorro: Boolean(saving),
    cobros: Boolean(canCollect),
    retiros: Boolean(canWithdraw),
  }).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function deleteAccountType(id) {
  requireSupabase()
  const { error } = await supabase.from('tipos_cuenta').delete().eq('id', id)
  if (error) throw error
}

export async function createWalletType({ name, canCollect = true, canWithdraw = true }) {
  requireSupabase()
  const { data, error } = await supabase.from('tipos_billetera').insert({
    nombre: name.trim(),
    cobros: Boolean(canCollect),
    retiros: Boolean(canWithdraw),
  }).select().single()
  if (error) throw error
  return data
}

export async function updateWalletType(id, { name, canCollect = true, canWithdraw = true }) {
  requireSupabase()
  const { data, error } = await supabase.from('tipos_billetera').update({
    nombre: name.trim(),
    cobros: Boolean(canCollect),
    retiros: Boolean(canWithdraw),
  }).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function deleteWalletType(id) {
  requireSupabase()
  const { error } = await supabase.from('tipos_billetera').delete().eq('id', id)
  if (error) throw error
}

export async function getDefaultAccountTypeId() {
  requireSupabase()
  const { data, error } = await supabase.from('tipos_cuenta').select('id').limit(1).maybeSingle()
  if (error) throw error
  if (!data) throw new Error('No hay tipos de cuenta configurados')
  return data.id
}

export async function createAccount({ holderId, walletId, alias = null, cuil = null, password = null, notes = null, typeId = null, active = true }) {
  requireSupabase()
  const resolvedTypeId = typeId ?? await getDefaultAccountTypeId()
  const payload = {
    titular_id: holderId,
    billetera_id: walletId,
    alias: alias?.trim() || null,
    cuil: cuil?.trim() || null,
    patron: password?.trim() || null,
    notas: notes?.trim() || null,
    tipo_cuenta_id: resolvedTypeId,
    activa: Boolean(active),
  }

  const { data, error } = await supabase.from('cuentas').upsert(payload, { onConflict: 'titular_id,billetera_id' }).select().maybeSingle()
  if (error) throw error
  return data
}

export async function updateAccount(id, { alias = null, cuil = null, password = null, notes = null, typeId = null, active = null }) {
  requireSupabase()
  const payload = {
    alias: alias?.trim() || null,
    cuil: cuil?.trim() || null,
    patron: password?.trim() || null,
    notas: notes?.trim() || null,
  }
  if (typeId !== null && typeId !== undefined) payload.tipo_cuenta_id = Number(typeId)
  if (active !== null && active !== undefined) payload.activa = Boolean(active)

  const { data, error } = await supabase.from('cuentas').update(payload).eq('id', id).select().maybeSingle()
  if (error) throw error
  return data
}

export async function deleteAccount(id) {
  requireSupabase()
  const { error } = await supabase.from('cuentas').delete().eq('id', id)
  if (error) throw error
}

export async function ensureAccountBoxLink({ accountId, boxId }) {
  requireSupabase()
  if (!accountId || !boxId) return null
  const { data, error } = await supabase.from('cuentas_x_caja').upsert({
    cuenta_id: accountId,
    caja_id: boxId,
  }, { onConflict: 'cuenta_id,caja_id' }).select().single()
  if (error) throw error
  return data
}

export async function setAccountAvailability({ shiftId, boxId, accountId, enabled = true, value = 0, canCollect = true, canWithdraw = true }) {
  requireSupabase()
  if (!accountId || !shiftId || !boxId) return null

  if (enabled) {
    await ensureAccountBoxLink({ accountId, boxId })
    const { data, error } = await supabase.from('cuentas_x_turno').upsert({
      turno_id: shiftId,
      cuenta_id: accountId,
      caja_id: boxId,
      valor: Number(value) || 0,
      cobros: Boolean(canCollect),
      retiros: Boolean(canWithdraw),
    }, { onConflict: 'turno_id,cuenta_id,caja_id' }).select().single()
    if (error) throw error
    return data
  }

  const { error } = await supabase.from('cuentas_x_turno').delete().eq('turno_id', shiftId).eq('cuenta_id', accountId).eq('caja_id', boxId)
  if (error) throw error
  return null
}

export async function saveAppConfig({ name, icon, theme = false, showNotes = true, singleton = true }) {
  requireSupabase()
  const { data: existing, error: loadError } = await supabase.from('app_config').select('id').limit(1).maybeSingle()
  if (loadError) throw loadError

  const payload = {
    nombre: name?.trim() || 'Caja Europa',
    icono: icon || 'banknote',
    tema: Boolean(theme),
    ver_notas: Boolean(showNotes),
    singleton: Boolean(singleton),
  }

  let promise
  if (existing) {
    promise = supabase.from('app_config').update(payload).eq('id', existing.id).select().single()
  } else {
    promise = supabase.from('app_config').insert(payload).select().single()
  }

  const { data, error } = await promise
  if (error) throw error
  return data
}

async function findOrCreate(table, match, values) {
  requireSupabase()
  let request = supabase.from(table).select('*')
  Object.entries(match).forEach(([column, value]) => {
    request = request.eq(column, value)
  })
  const { data: existing, error: findError } = await request.limit(1).maybeSingle()
  if (findError) throw findError
  if (existing) return existing

  const { data, error } = await supabase.from(table).insert(values).select().maybeSingle()
  if (error) throw error
  return data
}

async function ensureLink(table, match, values = match) {
  await findOrCreate(table, match, values)
}

export async function createInitialSetup({ boxName, shiftName, startTime, endTime, holderNames, walletNames, initialAmount }) {
  requireSupabase()
  const color = await findOrCreate('colores', { nombre: 'Tema inicial' }, { nombre: 'Tema inicial', hex: '#C7A0FF' })
  const walletType = await findOrCreate('tipos_billetera', { nombre: 'Cobros y retiros' }, { nombre: 'Cobros y retiros', cobros: true, retiros: true })
  const accountType = await findOrCreate('tipos_cuenta', { nombre: 'Cuenta operativa' }, { nombre: 'Cuenta operativa', cobros: true, retiros: true, ahorro: false })
  const box = await findOrCreate('cajas', { nombre: boxName }, { nombre: boxName, color_id: color.id, es_publicidad: false })

  const wallets = []
  for (const name of walletNames) {
    wallets.push(await findOrCreate('billeteras', { nombre: name }, { nombre: name, tipo_billetera_id: walletType.id }))
  }
  const holders = []
  for (const name of holderNames) {
    holders.push(await findOrCreate('titulares', { nombre: name }, { nombre: name }))
  }
  for (const holder of holders) await ensureLink('titulares_x_caja', { titular_id: holder.id, caja_id: box.id })
  for (const wallet of wallets) await ensureLink('billeteras_x_caja', { billetera_id: wallet.id, caja_id: box.id })

  const shiftType = await findOrCreate('tipos_turno', { caja_id: box.id, nombre: shiftName }, { caja_id: box.id, nombre: shiftName, color_id: color.id })
  const day = await findOrCreate('dias_turno', { tipo_turno_id: shiftType.id, nombre: `${shiftName} inicial` }, {
    nombre: `${shiftName} inicial`, dia_semana: new Date().getDay() || 7, hora_inicio: startTime, hora_fin: endTime, cruza_medianoche: false, tipo_turno_id: shiftType.id,
  })
  const { data: openShift, error: shiftError } = await supabase.from('turnos').select('*').eq('caja_id', box.id).eq('abierto', true).limit(1).maybeSingle()
  if (shiftError) throw shiftError
  const shift = openShift || (await supabase.from('turnos').insert({ dia_turno_id: day.id, abierto: true, caja_inicial: Number(initialAmount) || 0, redondeo: 0 }).select().single()).data
  if (!shift) throw new Error('No se pudo crear el turno inicial')

  for (const holder of holders) {
    for (const wallet of wallets) {
      const account = await findOrCreate('cuentas', { titular_id: holder.id, billetera_id: wallet.id }, {
        titular_id: holder.id, billetera_id: wallet.id, alias: null, tipo_cuenta_id: accountType.id, activa: true,
      })
      await ensureLink('cuentas_x_caja', { cuenta_id: account.id, caja_id: box.id })
      await ensureLink('cuentas_x_turno', { turno_id: shift.id, cuenta_id: account.id, caja_id: box.id }, {
        turno_id: shift.id, cuenta_id: account.id, caja_id: box.id, valor: 0, cobros: true, retiros: true,
      })
    }
  }

  const advertising = await findOrCreate('publicidad', { turno_id: shift.id }, { turno_id: shift.id })
  const { data: advertisingLines, error: advertisingLinesError } = await supabase.from('lineas_publicidad').select('id').eq('publicidad_id', advertising.id).limit(1)
  if (advertisingLinesError) throw advertisingLinesError
  if (!advertisingLines?.length) await supabase.from('lineas_publicidad').insert({ publicidad_id: advertising.id })
  await findOrCreate('bonos', { turno_id: shift.id }, { turno_id: shift.id, total_otorgado: 0, total_recuperado: 0, total_publicidad: 0, numero_bonos: 0 })
  await findOrCreate('logistica', { turno_id: shift.id }, { turno_id: shift.id })
  return shift
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
