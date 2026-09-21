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
  if (!shift) return { shift: null, boxes, accounts: [], advertising: [], bonuses: [], tips: [], expenses: [], expenseTypes: [], logistics: [], users: [], goals: [], chips: [] }

  const [accountLinks, advertising, bonuses, tips, expenses, expenseTypes, logistics, users, goals, chips] = await Promise.all([
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
  ])

  const accountIds = accountLinks.map(account => account.cuenta_id)
  const accounts = accountIds.length
    ? await query('cuentas', 'id, alias, titular_id, billetera_id, titulares(nombre), billeteras(nombre)', request => request.in('id', accountIds))
    : []
  const accountById = new Map(accounts.map(account => [account.id, account]))
  const linkedAccounts = accountLinks.map(link => ({ ...link, cuentas: accountById.get(link.cuenta_id) || null }))

  const logisticsWithAccounts = logistics.map(line => ({ ...line, cuentas_x_turno: { cuentas: accountById.get(accountLinks.find(link => link.id === line.cuenta_x_turno_id)?.cuenta_id) || null } }))

  return { shift, boxes, accounts: linkedAccounts, advertising, bonuses, tips, expenses, expenseTypes, logistics: logisticsWithAccounts, users, goals, chips }
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

async function findOrCreate(table, match, values) {
  requireSupabase()
  let request = supabase.from(table).select('*')
  Object.entries(match).forEach(([column, value]) => {
    request = request.eq(column, value)
  })
  const { data: existing, error: findError } = await request.limit(1).maybeSingle()
  if (findError) throw findError
  if (existing) return existing

  const { data, error } = await supabase.from(table).insert(values).select().single()
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
        titular_id: holder.id, billetera_id: wallet.id, alias: `${holder.nombre} · ${wallet.nombre}`, tipo_cuenta_id: accountType.id,
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
