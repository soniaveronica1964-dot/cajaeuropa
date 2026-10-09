import { supabase } from './supabase'

const APP_CONFIG_BUCKET = 'app-assets'
const APP_IMAGE_PATH = 'app-config/application-original'
const APP_IMAGE_MINI_PATH = 'app-config/application-mini.webp'

function requireSupabase() {
  if (!supabase) throw new Error('Supabase no está configurado')
}

function requireNonNegativeAmount(value) {
  const amount = Number(value)
  if (!Number.isFinite(amount)) throw new Error('Ingresá un monto válido')
  if (amount < 0) throw new Error('El monto no puede ser negativo')
  return amount
}

function requireFiniteAmount(value) {
  const amount = Number(value)
  if (!Number.isFinite(amount)) throw new Error('Ingresá un monto válido')
  return amount
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
  const boxes = await query('cajas', 'id, nombre, color_id, imagen_mini, colores(nombre, hex)', request => request.order('id', { ascending: true }))
  let shiftRequest = supabase
    .from('turnos')
    .select('id, abierto, fecha_hora_inicio, fecha_hora_fin, caja_inicial, caja_final, redondeo, caja_id, cajas(id, nombre), dias_turno(id, nombre, hora_inicio, hora_fin)')
    .eq('abierto', true)
    .order('fecha_hora_inicio', { ascending: false })
    .limit(1)
  if (boxId) shiftRequest = shiftRequest.eq('caja_id', boxId)
  const { data: shift, error: shiftError } = await shiftRequest.maybeSingle()
  if (shiftError) throw shiftError
  if (!shift) {
    const [holders, wallets, walletTypes, accountTypes, expenseTypes, shiftTypes, shiftDays, colors, appConfig, activeTurns, platforms, bonusConditions, bonusTypes] = await Promise.all([
      query('titulares', 'id, nombre, orden_num, is_off', request => request.eq('is_off', false).order('orden_num', { ascending: true }).order('id', { ascending: true })),
      query('billeteras', 'id, nombre, orden_num, is_off, tipo_billetera_id, tipos_billetera(nombre, cobros, retiros)', request => request.eq('is_off', false).order('orden_num', { ascending: true }).order('id', { ascending: true })),
      query('tipos_billetera', 'id, nombre, cobros, retiros, is_off', request => request.eq('is_off', false)),
      query('tipos_cuenta', 'id, nombre, es_compartido, es_deposito, es_publicidad, cobros, retiros, ahorro, is_off', request => request.eq('is_off', false)),
      query('tipos_gasto', 'id, nombre, invertir_signo', request => request.order('id', { ascending: true })),
      query('tipos_turno', 'id, caja_id, nombre, color_id'),
      query('dias_turno', 'id, nombre, dia_semana, hora_inicio, hora_fin, cruza_medianoche, tipo_turno_id'),
      query('colores', 'id, nombre, hex'),
      query('app_config', 'id, nombre, icono, imagen, imagen_mini, tema, ver_notas, singleton'),
      query('turnos', 'id, abierto, fecha_hora_inicio, fecha_hora_fin, caja_inicial, caja_final, redondeo, caja_id, dia_turno_id, dias_turno(id, nombre, dia_semana, hora_inicio, hora_fin, tipos_turno(id, nombre, caja_id, cajas(nombre)))', request => request.eq('abierto', true).order('fecha_hora_inicio', { ascending: false })),
      query('plataformas', 'id, nombre, caja_id, color_id', request => request.order('id', { ascending: true })),
      query('condiciones_bono', 'id, nombre, plataforma', request => request.order('id', { ascending: true })),
      query('tipos_estado', 'id, nombre, cantidad_porcentaje', request => request.order('id', { ascending: true })),
    ])
    return { shift: null, boxes, accounts: [], advertising: [], bonuses: [], tips: [], expenses: [], expenseTypes, logistics: [], users: [], goals: [], chips: [], holders, wallets, platforms, bonusConditions, bonusTypes, walletTypes, accountTypes, shiftTypes, shiftDays, colors, appConfig, activeTurns, taCharges: [], foundMoney: [], shiftNotes: null, movements: [] }
  }

  await ensureAdvertisingLines(shift.id)

  const [accountLinks, advertising, bonuses, tips, expenses, expenseTypes, logistics, users, goals, chips, holders, wallets, platforms, bonusConditions, bonusTypes, accountTypes, walletTypes, shiftTypes, shiftDays, colors, appConfig, activeTurns, taCharges, foundMoney, shiftNotes, movements] = await Promise.all([
    query('cuentas_x_turno', 'id, cuenta_id, caja_id, valor, cobros, retiros', request => request.eq('turno_id', shift.id)),
    query('lineas_publicidad', 'id, publicidad_id, total_llegados, nuevos, repetidos, sin_respuesta, total_derivados, lineas_publicidad_x_caja(caja_id, num_derivado), publicidad!inner(turno_id)', request => request.eq('publicidad.turno_id', shift.id).order('id', { ascending: true })),
    query('lineas_bonos', 'id, bono_id, valor, recuperado, es_publicidad, notas, fecha_hora_creacion, bonos!inner(turno_id)', request => request.eq('bonos.turno_id', shift.id).order('fecha_hora_creacion', { ascending: false })),
    query('propinas', 'id, monto, notas, usuario_texto, fecha_hora_creacion', request => request.eq('turno_id', shift.id).order('fecha_hora_creacion', { ascending: false })),
    query('gastos', 'id, tipo_gasto_id, monto, notas, fecha_hora_creacion, tipos_gasto(nombre, invertir_signo)', request => request.eq('turno_id', shift.id).order('fecha_hora_creacion', { ascending: false })),
    query('tipos_gasto', 'id, nombre, invertir_signo', request => request.order('id', { ascending: true })),
    query('lineas_logistica', 'id, aclaracion, ultimo_reinicio_cobros, ultimo_reinicio_retiros, ultimo_reinicio_caja, ultimo_reinicio_general, num_orden, cuenta_x_turno_id, logistica!inner(turno_id)', request => request.eq('logistica.turno_id', shift.id).order('num_orden')), 
    query('usuarios', 'id, fecha_creacion, bloqueado, nombres_usuario(nombre), telefonos_usuario(numero), titulares_usuario(nombre), paneles_x_usuario(paneles(nombre))', request => request.order('fecha_creacion', { ascending: false })),
    query('subobjetivos_x_turno', 'objetivo_alcanzado_turno, objetivo_final_turno, subobjetivos(fecha, objetivos(nombre, objetivo_alcanzado, objetivo_final))', request => request.eq('turno_id', shift.id)),
    query('fichas', 'id, fichas_inicial, fichas_final, plataforma_id, plataformas(nombre), cargas_fichas(valor, fecha_hora_creacion)', request => request.eq('turno_id', shift.id)),
    query('titulares', 'id, nombre, orden_num, is_off', request => request.eq('is_off', false).order('orden_num', { ascending: true }).order('id', { ascending: true })),
    query('billeteras', 'id, nombre, orden_num, is_off, tipo_billetera_id, tipos_billetera(nombre, cobros, retiros)', request => request.eq('is_off', false).order('orden_num', { ascending: true }).order('id', { ascending: true })),
    query('plataformas', 'id, nombre, caja_id, color_id', request => request.order('id', { ascending: true })),
    query('condiciones_bono', 'id, nombre, plataforma', request => request.order('id', { ascending: true })),
    query('tipos_estado', 'id, nombre, cantidad_porcentaje', request => request.order('id', { ascending: true })),
    query('tipos_cuenta', 'id, nombre, es_compartido, es_deposito, es_publicidad, cobros, retiros, ahorro, is_off', request => request.eq('is_off', false)),
    query('tipos_billetera', 'id, nombre, cobros, retiros, is_off', request => request.eq('is_off', false)),
    query('tipos_turno', 'id, caja_id, nombre, color_id'),
    query('dias_turno', 'id, nombre, dia_semana, hora_inicio, hora_fin, cruza_medianoche, tipo_turno_id'),
    query('colores', 'id, nombre, hex'),
    query('app_config', 'id, nombre, icono, imagen, imagen_mini, tema, ver_notas, singleton'),
    query('turnos', 'id, abierto, fecha_hora_inicio, fecha_hora_fin, caja_inicial, caja_final, redondeo, caja_id, dia_turno_id, dias_turno(id, nombre, dia_semana, hora_inicio, hora_fin, tipos_turno(id, nombre, caja_id, cajas(nombre)))', request => request.eq('abierto', true).order('fecha_hora_inicio', { ascending: false })),
    query('cargas_ta', 'id, usuario_texto, monto, notas, fecha_hora_creacion', request => request.eq('turno_id', shift.id).order('fecha_hora_creacion', { ascending: false })),
    query('dinero_encontrado', 'id, cuenta_x_turno_id, monto, notas, fecha_hora_creacion, cuentas_x_turno!inner(turno_id)', request => request.eq('cuentas_x_turno.turno_id', shift.id).order('fecha_hora_creacion', { ascending: false })),
    query('notas_turno', 'id, nota_general, nota_heredable', request => request.eq('turno_id', shift.id)),
    query('movimientos', 'id, caja_desde_id, caja_hasta_id, fecha_hora_creacion, monto, es_ahorro, cuenta_x_turno_id, notas', request => request.eq('turno_id', shift.id).order('fecha_hora_creacion', { ascending: false })),
  ])

  const accountIds = accountLinks.map(account => account.cuenta_id)
  const accounts = accountIds.length
    ? await query('cuentas', 'id, alias, cuil, patron, notas, tipo_cuenta_id, activa, titular_id, billetera_id, titulares(nombre), billeteras(nombre)', request => request.in('id', accountIds))
    : []
  const accountById = new Map(accounts.map(account => [account.id, account]))
  const linkedAccounts = accountLinks.map(link => ({ ...link, cuentas: accountById.get(link.cuenta_id) || null }))

  const logisticsWithAccounts = logistics.map(line => ({ ...line, cuentas_x_turno: { cuentas: accountById.get(accountLinks.find(link => link.id === line.cuenta_x_turno_id)?.cuenta_id) || null } }))

  return { shift, boxes, accounts: linkedAccounts, advertising, bonuses, tips, expenses, expenseTypes, logistics: logisticsWithAccounts, users, goals, chips, holders, wallets, platforms, bonusConditions, bonusTypes, accountTypes, walletTypes, shiftTypes, shiftDays, colors, appConfig, activeTurns, taCharges, foundMoney, shiftNotes: shiftNotes[0] || null, movements }
}

export async function loadConfigurationData() {
  const [boxes, holders, wallets, walletTypes, accountTypes, expenses, platforms, bonusConditions, bonusTypes, states, shiftTypes, shiftDays, colors, appConfig] = await Promise.all([
    query('cajas', 'id, nombre, imagen, imagen_mini, color_id, es_publicidad'),
    query('titulares', 'id, nombre, orden_num, is_off', request => request.eq('is_off', false).order('orden_num', { ascending: true }).order('id', { ascending: true })),
    query('billeteras', 'id, nombre, orden_num, is_off, tipo_billetera_id, tipos_billetera(nombre, cobros, retiros)', request => request.eq('is_off', false).order('orden_num', { ascending: true }).order('id', { ascending: true })),
    query('tipos_billetera', 'id, nombre, cobros, retiros, is_off', request => request.eq('is_off', false)),
    query('tipos_cuenta', 'id, nombre, es_compartido, es_deposito, es_publicidad, cobros, retiros, ahorro, is_off', request => request.eq('is_off', false)),
    query('tipos_gasto', 'id, nombre, invertir_signo', request => request.order('id', { ascending: true })),
    query('plataformas', 'id, nombre, caja_id, color_id'),
    query('condiciones_bono', 'id, nombre, plataforma'),
    query('tipos_estado', 'id, nombre, cantidad_porcentaje', request => request.order('id', { ascending: true })),
    query('estados', 'id, nombre, imagen_mini, tipo_estado_id, tipos_estado(nombre, cantidad_porcentaje)'),
    query('tipos_turno', 'id, caja_id, nombre, color_id'),
    query('dias_turno', 'id, nombre, dia_semana, hora_inicio, hora_fin, cruza_medianoche, tipo_turno_id'),
    query('colores', 'id, nombre, hex'),
    query('app_config', 'id, nombre, icono, imagen, imagen_mini, tema, ver_notas, singleton'),
  ])
  return { boxes, holders, wallets, walletTypes, accountTypes, expenses, platforms, bonusConditions, bonusTypes, states, shiftTypes, shiftDays, colors, appConfig }
}

export async function loadBonusCatalog() {
  const [states, bonusTypes, bonusConditions, subplatforms] = await Promise.all([
    query('estados', 'id, nombre, imagen, imagen_mini, tipo_estado_id, tipos_estado(nombre, cantidad_porcentaje), lineas_estado(id, porcentaje, condicion_bono_id, subplataforma_id, condiciones_bono(id, nombre, plataforma), subplataformas(id, nombre, plataforma_id, plataformas(nombre)))', request => request.order('id', { ascending: true })),
    query('tipos_estado', 'id, nombre, cantidad_porcentaje', request => request.order('id', { ascending: true })),
    query('condiciones_bono', 'id, nombre, plataforma', request => request.order('id', { ascending: true })),
    query('subplataformas', 'id, nombre, plataforma_id, plataformas(nombre)', request => request.order('id', { ascending: true })),
  ])
  return { states, bonusTypes, bonusConditions, subplatforms }
}

function requireStateLines(lines) {
  if (!Array.isArray(lines)) throw new Error('Agregá los porcentajes y condiciones del estado')
  return lines.map((line) => {
    const percentage = Number(line.percentage)
    const conditionId = Number(line.conditionId)
    const subplatformId = Number(line.subplatformId)
    if (String(line.percentage).trim() === '' || !Number.isFinite(percentage) || percentage < 0 || percentage > 100 || Math.abs(Math.round(percentage * 100) - percentage * 100) > 1e-8) {
      throw new Error('Cada porcentaje debe estar entre 0 y 100, con hasta dos decimales')
    }
    if (!Number.isInteger(conditionId) || conditionId <= 0) throw new Error('Seleccioná una condición para cada porcentaje')
    if (!Number.isInteger(subplatformId) || subplatformId <= 0) throw new Error('No hay una subplataforma válida para asociar al estado')
    return { porcentaje: percentage, condicion_bono_id: conditionId, subplataforma_id: subplatformId }
  })
}

async function validateStateLineCount(typeId, lines) {
  const { data: type, error } = await supabase.from('tipos_estado')
    .select('cantidad_porcentaje')
    .eq('id', typeId)
    .maybeSingle()
  if (error) throw error
  if (!type) throw new Error('El tipo de estado seleccionado ya no existe')
  if (lines.length !== Number(type.cantidad_porcentaje)) {
    throw new Error('La cantidad de porcentajes no coincide con el tipo de estado')
  }
}

function stateImageExtension(file) {
  const allowed = new Map([['image/png', 'png'], ['image/jpeg', 'jpg'], ['image/webp', 'webp'], ['image/gif', 'gif'], ['image/avif', 'avif']])
  const extension = allowed.get(file.type)
  if (!extension) throw new Error('La imagen debe ser PNG, JPG, WEBP, GIF o AVIF')
  return extension
}

async function uploadStateImage(stateId, file) {
  const extension = stateImageExtension(file)
  const path = `estados/${stateId}/${crypto.randomUUID()}.${extension}`
  const { error } = await supabase.storage.from(APP_CONFIG_BUCKET).upload(path, file, {
    contentType: file.type,
    upsert: false,
    cacheControl: '3600',
  })
  if (error) throw error
  return path
}

async function removeStateImage(path) {
  if (!path || /^(data:|https?:\/\/)/i.test(path)) return
  const { error } = await supabase.storage.from(APP_CONFIG_BUCKET).remove([path])
  if (error) throw error
}

export async function createState({ name, typeId, lines, imageFile }) {
  requireSupabase()
  const trimmedName = String(name || '').trim()
  const parsedTypeId = Number(typeId)
  if (!trimmedName) throw new Error('El nombre del estado es obligatorio')
  if (!Number.isInteger(parsedTypeId) || parsedTypeId <= 0) throw new Error('Seleccioná un tipo de estado')
  const validLines = requireStateLines(lines)
  await validateStateLineCount(parsedTypeId, validLines)
  if (imageFile) stateImageExtension(imageFile)
  const { data: state, error } = await supabase.from('estados')
    .insert({ nombre: trimmedName, tipo_estado_id: parsedTypeId })
    .select()
    .single()
  if (error) throw error

  let imagePath = null
  try {
    if (imageFile) {
      imagePath = await uploadStateImage(state.id, imageFile)
      const { error: imageError } = await supabase.from('estados').update({ imagen: imagePath, imagen_mini: imagePath }).eq('id', state.id)
      if (imageError) throw imageError
    }
    if (validLines.length) {
      const { error: linesError } = await supabase.from('lineas_estado')
        .insert(validLines.map(line => ({ ...line, estado_id: state.id })))
      if (linesError) throw linesError
    }
    return state
  } catch (error) {
    const cleanupErrors = []
    const { error: stateCleanupError } = await supabase.from('estados').delete().eq('id', state.id)
    if (stateCleanupError) cleanupErrors.push(stateCleanupError)
    if (imagePath) {
      try {
        await removeStateImage(imagePath)
      } catch (cleanupError) {
        cleanupErrors.push(cleanupError)
      }
    }
    if (cleanupErrors.length) throw new Error(`${error.message || 'No se pudo guardar el estado'}. También falló la limpieza: ${cleanupErrors.map(item => item.message).join('; ')}`)
    throw error
  }
}

export async function updateState(id, { name, typeId, lines, imageFile }) {
  requireSupabase()
  const trimmedName = String(name || '').trim()
  const parsedTypeId = Number(typeId)
  if (!trimmedName) throw new Error('El nombre del estado es obligatorio')
  if (!Number.isInteger(parsedTypeId) || parsedTypeId <= 0) throw new Error('Seleccioná un tipo de estado')
  const validLines = requireStateLines(lines)
  await validateStateLineCount(parsedTypeId, validLines)
  if (imageFile) stateImageExtension(imageFile)
  const { data: oldState, error: loadStateError } = await supabase.from('estados')
    .select('id, nombre, tipo_estado_id, imagen, imagen_mini')
    .eq('id', id)
    .single()
  if (loadStateError) throw loadStateError
  const { data: oldLines, error: loadLinesError } = await supabase.from('lineas_estado')
    .select('id')
    .eq('estado_id', id)
  if (loadLinesError) throw loadLinesError

  let imagePath = oldState.imagen || null
  let uploadedImagePath = null
  let insertedLineIds = []
  let stateUpdated = false
  try {
    if (imageFile) {
      uploadedImagePath = await uploadStateImage(id, imageFile)
      imagePath = uploadedImagePath
    }
    if (validLines.length) {
      const { data: insertedLines, error: insertLinesError } = await supabase.from('lineas_estado')
        .insert(validLines.map(line => ({ ...line, estado_id: id })))
        .select('id')
      if (insertLinesError) throw insertLinesError
      insertedLineIds = (insertedLines || []).map(line => line.id)
    }
    const { error: updateError } = await supabase.from('estados')
      .update({ nombre: trimmedName, tipo_estado_id: parsedTypeId, imagen: imagePath, ...(uploadedImagePath ? { imagen_mini: imagePath } : {}) })
      .eq('id', id)
    if (updateError) throw updateError
    stateUpdated = true

    if (oldLines?.length) {
      const { error: deleteLinesError } = await supabase.from('lineas_estado').delete().in('id', oldLines.map(line => line.id))
      if (deleteLinesError) throw deleteLinesError
    }
  } catch (error) {
    const cleanupErrors = []
    if (stateUpdated) {
      const { error: restoreError } = await supabase.from('estados')
        .update({ nombre: oldState.nombre, tipo_estado_id: oldState.tipo_estado_id, imagen: oldState.imagen, imagen_mini: oldState.imagen_mini })
        .eq('id', id)
      if (restoreError) cleanupErrors.push(restoreError)
    }
    if (insertedLineIds.length) {
      const { error: lineCleanupError } = await supabase.from('lineas_estado').delete().in('id', insertedLineIds)
      if (lineCleanupError) cleanupErrors.push(lineCleanupError)
    }
    if (uploadedImagePath) {
      try {
        await removeStateImage(uploadedImagePath)
      } catch (cleanupError) {
        cleanupErrors.push(cleanupError)
      }
    }
    if (cleanupErrors.length) throw new Error(`${error.message || 'No se pudo actualizar el estado'}. También falló la limpieza: ${cleanupErrors.map(item => item.message).join('; ')}`)
    throw error
  }
  const oldImagePaths = [...new Set([oldState.imagen, oldState.imagen_mini].filter(path => path && path !== imagePath))]
  if (uploadedImagePath && oldImagePaths.length) {
    try {
      for (const path of oldImagePaths) await removeStateImage(path)
    } catch (error) {
      throw new Error(`El estado se guardó, pero no se pudo eliminar la imagen anterior: ${error.message}`)
    }
  }
  return { id, nombre: trimmedName, tipo_estado_id: parsedTypeId, imagen: imagePath }
}

export async function deleteState(id, { image, imageMini } = {}) {
  requireSupabase()
  const { error } = await supabase.from('estados').delete().eq('id', id)
  if (error) throw error
  const paths = [...new Set([image, imageMini].filter(Boolean))]
  try {
    for (const path of paths) await removeStateImage(path)
  } catch (error) {
    throw new Error(`El estado se eliminó, pero no se pudo eliminar su imagen: ${error.message}`)
  }
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

export function updateAccountFlags(accountShiftId, field, enabled) {
  if (!['cobros', 'retiros'].includes(field)) {
    throw new Error('Campo de disponibilidad no permitido')
  }
  return updateRow('cuentas_x_turno', accountShiftId, { [field]: Boolean(enabled) })
}

export function updateChipFinal(chipId, value) {
  const finalValue = value == null ? null : Number(value)
  if (finalValue != null && (!Number.isFinite(finalValue) || finalValue < 0)) {
    throw new Error('La ficha final debe ser un valor igual o mayor a cero')
  }
  return updateRow('fichas', chipId, { fichas_final: finalValue })
}

export function updateAdvertisingLine(lineId, field, value) {
  if (!['total_llegados', 'nuevos', 'repetidos'].includes(field)) {
    throw new Error('Campo de publicidad no permitido')
  }
  const amount = Number(value)
  if (!Number.isInteger(amount) || amount < 0) throw new Error('Ingresá una cantidad igual o mayor a cero')
  return updateAdvertisingCount(lineId, field, amount)
}

async function updateAdvertisingCount(lineId, field, value) {
  requireSupabase()
  const { data: current, error: readError } = await supabase
    .from('lineas_publicidad')
    .select('total_llegados, nuevos, repetidos')
    .eq('id', lineId)
    .single()
  if (readError) throw readError

  const counts = { ...current, [field]: value }
  return updateRow('lineas_publicidad', lineId, {
    [field]: value,
    sin_respuesta: counts.total_llegados - counts.nuevos - counts.repetidos,
  })
}

export async function updateAdvertisingDistribution(lineId, boxId, value) {
  requireSupabase()
  const amount = Number(value)
  if (!Number.isInteger(amount) || amount < 0) throw new Error('Ingresá una cantidad igual o mayor a cero')

  const { error } = await supabase.from('lineas_publicidad_x_caja').upsert({
    caja_id: boxId,
    linea_publicidad_id: lineId,
    num_derivado: amount,
  }, { onConflict: 'caja_id,linea_publicidad_id' })
  if (error) throw error

  const { data: distributions, error: distributionsError } = await supabase
    .from('lineas_publicidad_x_caja')
    .select('num_derivado')
    .eq('linea_publicidad_id', lineId)
  if (distributionsError) throw distributionsError

  const total = (distributions || []).reduce((sum, item) => sum + Number(item.num_derivado || 0), 0)
  return updateRow('lineas_publicidad', lineId, { total_derivados: total })
}

async function recalculateBonusTotals(bonusId) {
  const { data: lines, error: linesError } = await supabase
    .from('lineas_bonos')
    .select('valor, recuperado, es_publicidad')
    .eq('bono_id', bonusId)
  if (linesError) throw linesError

  const totals = (lines || []).reduce((sum, line) => {
    const cents = Math.round(Number(line.valor || 0) * 100)
    if (line.recuperado) sum.recovered += cents
    else if (line.es_publicidad) sum.publicity += cents
    else sum.granted += cents
    return sum
  }, { granted: 0, recovered: 0, publicity: 0 })

  const { error } = await supabase.from('bonos').update({
    total_otorgado: totals.granted / 100,
    total_recuperado: totals.recovered / 100,
    total_publicidad: totals.publicity / 100,
    numero_bonos: lines?.length || 0,
  }).eq('id', bonusId)
  if (error) throw error
}

function bonusTypeFields(type) {
  if (!['granted', 'recovered', 'publicity'].includes(type)) {
    throw new Error('Tipo de bono no válido')
  }
  return { recuperado: type === 'recovered', es_publicidad: type === 'publicity' }
}

export async function createBonusLine(shiftId, { value, type = 'granted', notes, bonusId }) {
  requireSupabase()
  if (bonusId == null) {
    const { data: bonus, error: bonusError } = await supabase.from('bonos')
      .upsert({ turno_id: shiftId }, { onConflict: 'turno_id' })
      .select('id')
      .single()
    if (bonusError) throw bonusError
    bonusId = bonus.id
  }
  const { data, error } = await supabase.from('lineas_bonos').insert({
    bono_id: bonusId,
    valor: Math.max(0, Number(value) || 0),
    ...bonusTypeFields(type),
    notas: notes?.trim() || null,
  }).select().single()
  if (error) throw error
  await recalculateBonusTotals(bonusId)
  return data
}

export async function updateBonusLine(id, { type, notes, value }) {
  const values = {}
  if (type !== undefined) Object.assign(values, bonusTypeFields(type))
  if (notes !== undefined) values.notas = notes?.trim() || null
  if (value !== undefined) values.valor = Math.max(0, Number(value) || 0)
  const line = await updateRow('lineas_bonos', id, values)
  await recalculateBonusTotals(line.bono_id)
  return line
}

export async function deleteBonusLine(id) {
  requireSupabase()
  const { data: line, error: loadError } = await supabase.from('lineas_bonos').select('id, bono_id').eq('id', id).single()
  if (loadError) throw loadError
  const { error } = await supabase.from('lineas_bonos').delete().eq('id', id)
  if (error) throw error
  await recalculateBonusTotals(line.bono_id)
}

export async function createTip(shiftId, { value, user, notes }) {
  requireSupabase()
  const amount = requireNonNegativeAmount(value)
  const { data, error } = await supabase.from('propinas').insert({ turno_id: shiftId, monto: amount, usuario_texto: user?.trim() || null, notas: notes?.trim() || null }).select().single()
  if (error) throw error
  return data
}

export async function updateTipLine(id, { user, value, notes }) {
  const values = {}
  if (user !== undefined) values.usuario_texto = user?.trim() || null
  if (value !== undefined) values.monto = requireNonNegativeAmount(value)
  if (notes !== undefined) values.notas = notes?.trim() || null
  return updateRow('propinas', id, values)
}

export async function deleteTipLine(id) {
  requireSupabase()
  const { error } = await supabase.from('propinas').delete().eq('id', id)
  if (error) throw error
}

export async function createExpense(shiftId, { typeId, value, notes }) {
  requireSupabase()
  if (!typeId) throw new Error('Seleccioná un tipo de gasto')
  const amount = requireNonNegativeAmount(value)
  const { data, error } = await supabase.from('gastos').insert({ turno_id: shiftId, tipo_gasto_id: typeId, monto: amount, notas: notes?.trim() || null }).select().single()
  if (error) throw error
  return data
}

export async function updateExpenseLine(id, { typeId, value, notes }) {
  const values = {}
  if (typeId !== undefined) values.tipo_gasto_id = typeId
  if (value !== undefined) {
    const amount = Number(value)
    if (!Number.isFinite(amount) || amount < 0) throw new Error('El monto del gasto no puede ser negativo')
    values.monto = amount
  }
  if (notes !== undefined) values.notas = notes?.trim() || null
  return updateRow('gastos', id, values)
}

export async function deleteExpenseLine(id) {
  requireSupabase()
  const { error } = await supabase.from('gastos').delete().eq('id', id)
  if (error) throw error
}

export async function createTaCharge(shiftId, { value, user, notes }) {
  requireSupabase()
  const amount = requireFiniteAmount(value)
  const { data, error } = await supabase.from('cargas_ta').insert({
    turno_id: shiftId,
    usuario_texto: user?.trim() || null,
    monto: amount,
    notas: notes?.trim() || null,
  }).select().single()
  if (error) throw error
  return data
}

export async function updateTaChargeLine(id, { user, value, notes }) {
  const values = {}
  if (user !== undefined) values.usuario_texto = user?.trim() || null
  if (value !== undefined) values.monto = requireFiniteAmount(value)
  if (notes !== undefined) values.notas = notes?.trim() || null
  return updateRow('cargas_ta', id, values)
}

export async function deleteTaChargeLine(id) {
  requireSupabase()
  const { error } = await supabase.from('cargas_ta').delete().eq('id', id)
  if (error) throw error
}

export async function createFoundMoney({ accountShiftId, value, notes }) {
  requireSupabase()
  const amount = requireNonNegativeAmount(value)
  const { data, error } = await supabase.from('dinero_encontrado').insert({
    cuenta_x_turno_id: accountShiftId,
    monto: amount,
    notas: notes?.trim() || null,
  }).select().single()
  if (error) throw error
  return data
}

export async function updateFoundMoneyLine(id, { accountShiftId, value, notes }) {
  const values = {}
  if (accountShiftId !== undefined) values.cuenta_x_turno_id = accountShiftId
  if (value !== undefined) values.monto = requireNonNegativeAmount(value)
  if (notes !== undefined) values.notas = notes?.trim() || null
  return updateRow('dinero_encontrado', id, values)
}

export async function deleteFoundMoneyLine(id) {
  requireSupabase()
  const { error } = await supabase.from('dinero_encontrado').delete().eq('id', id)
  if (error) throw error
}

export async function saveShiftNotes(shiftId, { general, inheritable }) {
  requireSupabase()
  const { data, error } = await supabase.from('notas_turno').upsert({
    turno_id: shiftId,
    nota_general: general?.trim() || null,
    nota_heredable: inheritable?.trim() || null,
  }, { onConflict: 'turno_id' }).select().single()
  if (error) throw error
  return data
}

export async function createTransferMovement(shiftId, { fromBoxId, toBoxId, accountShiftId, value, notes, savings }) {
  requireSupabase()
  if (String(fromBoxId) === String(toBoxId)) throw new Error('Elegí dos cajas distintas')
  const { data, error } = await supabase.from('movimientos').insert({
    turno_id: shiftId,
    caja_desde_id: fromBoxId,
    caja_hasta_id: toBoxId,
    cuenta_x_turno_id: accountShiftId,
    monto: Number(value) || 0,
    notas: notes?.trim() || null,
    es_ahorro: Boolean(savings),
  }).select().single()
  if (error) throw error
  return data
}

export async function createChipLoad(chipId, value) {
  requireSupabase()
  const amount = Number(value)
  if (!Number.isFinite(amount) || amount <= 0) throw new Error('Ingresá un monto mayor a cero')
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const { data: chip, error: readError } = await supabase.from('fichas').select('fichas_inicial').eq('id', chipId).single()
    if (readError) throw readError
    const currentInitial = Number(chip.fichas_inicial || 0)
    const { data, error: updateError } = await supabase
      .from('fichas')
      .update({ fichas_inicial: currentInitial + amount })
      .eq('id', chipId)
      .eq('fichas_inicial', currentInitial)
      .select('id')
      .maybeSingle()
    if (updateError) throw updateError
    if (data) return { id: chipId, fichas_id: chipId, valor: amount }
  }
  throw new Error('No se pudo actualizar el valor inicial de las fichas; intentá nuevamente')
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
  const { data: existing, error: findError } = await supabase.from('colores').select('id, hex').eq('nombre', name).limit(1).maybeSingle()
  if (findError) throw findError
  if (existing) {
    const hex = colorHex(color)
    if (existing.hex?.toLowerCase() !== hex.toLowerCase()) {
      const { error: updateError } = await supabase.from('colores').update({ hex }).eq('id', existing.id)
      if (updateError) throw updateError
    }
    return existing.id
  }
  const { data, error } = await supabase.from('colores').insert({ nombre: name, hex: colorHex(color) }).select('id').single()
  if (error) throw error
  return data.id
}

export async function createBox({ name, colorId = null }) {
  requireSupabase()
  const { data, error } = await supabase.from('cajas').insert({ nombre: name.trim(), color_id: colorId, es_publicidad: false }).select().single()
  if (error) throw error
  return data
}

export async function updateBox(id, { name, colorId = null }) {
  requireSupabase()
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

  return Math.max(0, ...numbers) + 1
}

async function persistEntityOrder(table, orderedRows) {
  const maxOrder = Math.max(0, ...orderedRows.map((row) => Number(row.orden_num) || 0))
  const temporaryStart = maxOrder + orderedRows.length + 1

  for (const [index, row] of orderedRows.entries()) {
    const { error } = await supabase.from(table).update({ orden_num: temporaryStart + index }).eq('id', row.id)
    if (error) throw error
  }

  for (const [index, row] of orderedRows.entries()) {
    const { error } = await supabase.from(table).update({ orden_num: index + 1 }).eq('id', row.id)
    if (error) throw error
  }
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

  await persistEntityOrder(table, ordered)

  return ordered
}

export async function reorderEntityOrder(table, orderedIds = []) {
  requireSupabase()
  if (!orderedIds.length) return []

  const { data: rows = [], error } = await supabase
    .from(table)
    .select('id, orden_num, is_off')
    .eq('is_off', false)
    .order('orden_num', { ascending: true })
    .order('id', { ascending: true })

  if (error) throw error

  const byId = new Map((rows || []).map((row) => [String(row.id), row]))
  const includedIds = new Set(orderedIds.map(String))
  const orderedRows = orderedIds.map((id) => byId.get(String(id))).filter(Boolean)
  orderedRows.push(...rows.filter((row) => !includedIds.has(String(row.id))))
  await persistEntityOrder(table, orderedRows)

  return orderedRows.map((row) => row.id)
}

async function ensureHolderWalletCombination({ holderId, walletId, boxId = null, shiftId = null, active = true }) {
  requireSupabase()
  if (!holderId || !walletId) return null
  const account = await createAccount({ holderId, walletId, active })
  if (boxId) {
    await ensureAccountBoxLink({ accountId: account.id, boxId })
  }
  if (boxId && shiftId) {
    await setAccountAvailability({ shiftId, boxId, accountId: account.id, enabled: Boolean(active), value: 0, canCollect: false, canWithdraw: false })
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

  const { data: typeRow, error: typeError } = await supabase.from('tipos_billetera').select('id').eq('nombre', typeName).eq('is_off', false).limit(1).maybeSingle()
  if (typeError) throw typeError
  let typeId = typeRow?.id
  if (!typeId) {
    const { data: createdType, error: createdTypeError } = await supabase.from('tipos_billetera').insert({ nombre: typeName, cobros: true, retiros: true, is_off: false }).select('id').maybeSingle()
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

  const { data: typeRow, error: typeError } = await supabase.from('tipos_billetera').select('id').eq('nombre', typeName).eq('is_off', false).limit(1).maybeSingle()
  if (typeError) throw typeError
  let typeId = typeRow?.id
  if (!typeId) {
    const { data: createdType, error: createdTypeError } = await supabase.from('tipos_billetera').insert({ nombre: typeName, cobros: true, retiros: true, is_off: false }).select('id').maybeSingle()
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

export async function createPlatform({ name, colorId = null, boxId }) {
  requireSupabase()
  if (boxId == null) throw new Error('Seleccioná una caja para asociar la plataforma')
  const { data, error } = await supabase.from('plataformas').insert({ nombre: name.trim(), caja_id: boxId, color_id: colorId }).select().single()
  if (error) throw error
  return data
}

export async function updatePlatform(id, { name, colorId = null }) {
  requireSupabase()
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

function requireBonusType(name, percentageCount) {
  const trimmedName = String(name || '').trim()
  const count = Number(percentageCount)
  if (!trimmedName) throw new Error('El nombre del tipo de bono es obligatorio')
  if (!Number.isInteger(count) || count < 0) throw new Error('La cantidad de porcentajes debe ser un entero igual o mayor a cero')
  return { nombre: trimmedName, cantidad_porcentaje: count }
}

export async function createBonusType({ name, percentageCount }) {
  requireSupabase()
  const { data, error } = await supabase.from('tipos_estado').insert(requireBonusType(name, percentageCount)).select().single()
  if (error) throw error
  return data
}

export async function updateBonusType(id, { name, percentageCount }) {
  requireSupabase()
  const { data, error } = await supabase.from('tipos_estado').update(requireBonusType(name, percentageCount)).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function deleteBonusType(id) {
  requireSupabase()
  const { error } = await supabase.from('tipos_estado').delete().eq('id', id)
  if (error) throw error
}

export async function createColor({ name, hex }) {
  requireSupabase()
  const { data, error } = await supabase.from('colores').insert({ nombre: name.trim(), hex: hex.trim() }).select().single()
  if (error) throw error
  return data
}

export async function updateColor(id, { name, hex }) {
  requireSupabase()
  const { data, error } = await supabase.from('colores').update({ nombre: name.trim(), hex: hex.trim() }).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function deleteColor(id) {
  requireSupabase()
  const { error } = await supabase.from('colores').delete().eq('id', id)
  if (error) throw error
}

export async function createShiftType({ boxId, name, colorId = null }) {
  requireSupabase()
  const { data, error } = await supabase.from('tipos_turno').insert({ caja_id: boxId, nombre: name.trim(), color_id: colorId }).select().single()
  if (error) throw error
  return data
}

export async function updateShiftType(id, { name, colorId = null }) {
  requireSupabase()
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

export async function createDayShifts({ typeId, name, weekdays, start, end, crossesMidnight = false }) {
  requireSupabase()
  const selectedDays = [...new Set((weekdays || []).map(Number).filter(day => day >= 1 && day <= 7))]
  if (!selectedDays.length) throw new Error('Seleccioná al menos un día')
  const { data, error } = await supabase.from('dias_turno').insert(selectedDays.map(weekday => ({
    tipo_turno_id: typeId,
    nombre: name.trim(),
    dia_semana: weekday,
    hora_inicio: start,
    hora_fin: end,
    cruza_medianoche: Boolean(crossesMidnight),
  }))).select()
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

export async function createShift({ dayId, initialAmount = 0 }) {
  requireSupabase()
  const { data, error } = await supabase.from('turnos').insert({
    dia_turno_id: dayId,
    abierto: true,
    caja_inicial: Math.max(0, Number(initialAmount) || 0),
    redondeo: 0,
  }).select().single()
  if (error) throw error
  await ensureAdvertisingLines(data.id)
  return data
}

export async function closeShift(id, finalAmount) {
  requireSupabase()
  const { data, error } = await supabase.from('turnos').update({
    abierto: false,
    fecha_hora_fin: new Date().toISOString(),
    caja_final: Math.max(0, Number(finalAmount) || 0),
  }).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function createAccountType({ name, shared = false, deposit = false, advertising = false, saving = false, canCollect = false, canWithdraw = false }) {
  requireSupabase()
  const trimmedName = normalizeEntityName(name)
  if (!trimmedName) throw new Error('El nombre del tipo de cuenta no puede estar vacío')
  const { data: existing, error: existingError } = await supabase
    .from('tipos_cuenta')
    .select('id')
    .eq('nombre', trimmedName)
    .eq('is_off', true)
    .limit(1)
    .maybeSingle()
  if (existingError) throw existingError

  const payload = {
    nombre: trimmedName,
    es_compartido: Boolean(shared),
    es_deposito: Boolean(deposit),
    es_publicidad: Boolean(advertising),
    ahorro: Boolean(saving),
    cobros: Boolean(canCollect),
    retiros: Boolean(canWithdraw),
    is_off: false,
  }
  const { data, error } = existing
    ? await supabase.from('tipos_cuenta').update(payload).eq('id', existing.id).select().single()
    : await supabase.from('tipos_cuenta').insert(payload).select().single()
  if (error) throw error
  return data
}

export async function updateAccountType(id, { name, shared = false, deposit = false, advertising = false, saving = false, canCollect = false, canWithdraw = false }) {
  requireSupabase()
  const trimmedName = normalizeEntityName(name)
  if (!trimmedName) throw new Error('El nombre del tipo de cuenta no puede estar vacío')
  const { data: activeRows = [], error: listError } = await supabase
    .from('tipos_cuenta')
    .select('id, nombre, is_off')
    .eq('is_off', false)
  if (listError) throw listError

  const duplicate = activeRows.find((row) => row.id !== id && normalizeEntityName(row.nombre) === trimmedName)
  if (duplicate) {
    const { error: disableError } = await supabase.from('tipos_cuenta').update({ is_off: true }).eq('id', id)
    if (disableError) throw disableError
    return duplicate
  }

  const { data, error } = await supabase.from('tipos_cuenta').update({
    nombre: trimmedName,
    es_compartido: Boolean(shared),
    es_deposito: Boolean(deposit),
    es_publicidad: Boolean(advertising),
    ahorro: Boolean(saving),
    cobros: Boolean(canCollect),
    retiros: Boolean(canWithdraw),
    is_off: false,
  }).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function deleteAccountType(id) {
  requireSupabase()
  const { error } = await supabase.from('tipos_cuenta').update({ is_off: true }).eq('id', id)
  if (error) throw error
}

export async function createWalletType({ name, canCollect = true, canWithdraw = true }) {
  requireSupabase()
  const trimmedName = normalizeEntityName(name)
  if (!trimmedName) throw new Error('El nombre del tipo de billetera no puede estar vacío')
  const { data: existing, error: existingError } = await supabase
    .from('tipos_billetera')
    .select('id')
    .eq('nombre', trimmedName)
    .eq('is_off', true)
    .limit(1)
    .maybeSingle()
  if (existingError) throw existingError

  const payload = {
    nombre: trimmedName,
    cobros: Boolean(canCollect),
    retiros: Boolean(canWithdraw),
    is_off: false,
  }
  const { data, error } = existing
    ? await supabase.from('tipos_billetera').update(payload).eq('id', existing.id).select().single()
    : await supabase.from('tipos_billetera').insert(payload).select().single()
  if (error) throw error
  return data
}

export async function updateWalletType(id, { name, canCollect = true, canWithdraw = true }) {
  requireSupabase()
  const trimmedName = normalizeEntityName(name)
  if (!trimmedName) throw new Error('El nombre del tipo de billetera no puede estar vacío')
  const { data: activeRows = [], error: listError } = await supabase
    .from('tipos_billetera')
    .select('id, nombre, is_off')
    .eq('is_off', false)
  if (listError) throw listError

  const duplicate = activeRows.find((row) => row.id !== id && normalizeEntityName(row.nombre) === trimmedName)
  if (duplicate) {
    const { error: disableError } = await supabase.from('tipos_billetera').update({ is_off: true }).eq('id', id)
    if (disableError) throw disableError
    return duplicate
  }

  const { data, error } = await supabase.from('tipos_billetera').update({
    nombre: trimmedName,
    cobros: Boolean(canCollect),
    retiros: Boolean(canWithdraw),
    is_off: false,
  }).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function deleteWalletType(id) {
  requireSupabase()
  const { error } = await supabase.from('tipos_billetera').update({ is_off: true }).eq('id', id)
  if (error) throw error
}

export async function getDefaultAccountTypeId() {
  requireSupabase()
  const { data, error } = await supabase.from('tipos_cuenta').select('id').eq('is_off', false).limit(1).maybeSingle()
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

export async function setAccountAvailability({ shiftId, boxId, accountId, enabled = true, value = 0, canCollect = false, canWithdraw = false }) {
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

export async function saveAppConfig({ name, image, imageMini, theme, showNotes }) {
  requireSupabase()
  const { data: existing, error: loadError } = await supabase.from('app_config').select('id').limit(1).maybeSingle()
  if (loadError) throw loadError

  const payload = {}
  if (name !== undefined) payload.nombre = name.trim() || 'Caja Europa'
  if (image !== undefined) payload.imagen = image
  if (imageMini !== undefined) payload.imagen_mini = imageMini
  if (theme !== undefined) payload.tema = Boolean(theme)
  if (showNotes !== undefined) payload.ver_notas = Boolean(showNotes)

  let promise
  if (existing) {
    promise = supabase.from('app_config').update(payload).eq('id', existing.id).select().single()
  } else {
    promise = supabase.from('app_config').insert({ nombre: 'Caja Europa', singleton: true, ...payload }).select().single()
  }

  const { data, error } = await promise
  if (error) throw error
  return data
}

export function getStoragePublicUrl(path) {
  if (!path) return null
  if (/^(data:|https?:\/\/)/i.test(path)) return path
  requireSupabase()
  return supabase.storage.from(APP_CONFIG_BUCKET).getPublicUrl(path).data.publicUrl
}

export async function replaceAppImage(original, imageMini) {
  requireSupabase()
  const storage = supabase.storage.from(APP_CONFIG_BUCKET)
  const uploads = [
    storage.upload(APP_IMAGE_PATH, original, { contentType: original.type || 'application/octet-stream', upsert: true, cacheControl: '0' }),
    storage.upload(APP_IMAGE_MINI_PATH, imageMini, { contentType: 'image/webp', upsert: true, cacheControl: '0' }),
  ]
  const results = await Promise.all(uploads)
  const failedUpload = results.find(({ error }) => error)
  if (failedUpload) throw failedUpload.error
  return saveAppConfig({ image: APP_IMAGE_PATH, imageMini: APP_IMAGE_MINI_PATH })
}

export async function deleteAppImage() {
  requireSupabase()
  const { error } = await supabase.storage.from(APP_CONFIG_BUCKET).remove([APP_IMAGE_PATH, APP_IMAGE_MINI_PATH])
  if (error) throw error
  return saveAppConfig({ image: null, imageMini: null })
}

export async function formatDatabase() {
  requireSupabase()
  const { error } = await supabase.rpc('format_caja_database')
  if (error) throw error
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

async function ensureAdvertisingLines(shiftId) {
  const advertising = await findOrCreate('publicidad', { turno_id: shiftId }, { turno_id: shiftId })
  const { data: lines, error } = await supabase
    .from('lineas_publicidad')
    .select('id')
    .eq('publicidad_id', advertising.id)
    .order('id', { ascending: true })
  if (error) throw error

  const missingLines = Math.max(0, 2 - (lines || []).length)
  if (!missingLines) return

  const { error: insertError } = await supabase.from('lineas_publicidad').insert(
    Array.from({ length: missingLines }, () => ({ publicidad_id: advertising.id })),
  )
  if (insertError) throw insertError
}

async function ensureLink(table, match, values = match) {
  await findOrCreate(table, match, values)
}

export async function createInitialSetup({ boxName, shiftName = null, startTime = '00:00', endTime = '08:00', holderNames, walletNames, initialAmount = 0, createShift = true }) {
  requireSupabase()
  const color = await findOrCreate('colores', { nombre: 'Tema inicial' }, { nombre: 'Tema inicial', hex: '#C7A0FF' })
  await findOrCreate('app_config', { singleton: true }, { nombre: 'Caja Europa', icono: 'banknote', tema: false, ver_notas: true, singleton: true })
  const walletType = await findOrCreate('tipos_billetera', { nombre: 'Cobros y retiros' }, { nombre: 'Cobros y retiros', cobros: true, retiros: true, is_off: false })
  const accountType = await findOrCreate('tipos_cuenta', { nombre: 'Cuenta operativa' }, { nombre: 'Cuenta operativa', cobros: true, retiros: true, ahorro: false, es_deposito: false, is_off: false })
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

  for (const holder of holders) {
    for (const wallet of wallets) {
      const account = await findOrCreate('cuentas', { titular_id: holder.id, billetera_id: wallet.id }, {
        titular_id: holder.id, billetera_id: wallet.id, alias: null, tipo_cuenta_id: accountType.id, activa: true,
      })
      await ensureLink('cuentas_x_caja', { cuenta_id: account.id, caja_id: box.id })
    }
  }

  if (!createShift) return null
  if (!shiftName?.trim()) throw new Error('El nombre del turno es obligatorio')

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
      await ensureLink('cuentas_x_turno', { turno_id: shift.id, cuenta_id: account.id, caja_id: box.id }, {
        turno_id: shift.id, cuenta_id: account.id, caja_id: box.id, valor: 0, cobros: false, retiros: false,
      })
    }
  }

  await ensureAdvertisingLines(shift.id)
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
