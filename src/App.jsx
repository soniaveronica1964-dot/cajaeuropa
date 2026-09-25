import React, { useEffect, useMemo, useState } from 'react'
import {
  ArrowLeftRight,
  BarChart3,
  Banknote,
  Bell,
  Boxes,
  Camera,
  Check,
  ChevronDown,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  Copy,
  Eye,
  FileText,
  Gift,
  GripVertical,
  LayoutGrid,
  LockKeyhole,
  Plus,
  Search,
  Settings2,
  SlidersHorizontal,
  Sparkles,
  Target,
  UserRound,
  Users,
  WalletCards,
  X,
} from 'lucide-react'
import {
  createAccount,
  createAccountType,
  createBonusCondition,
  createBox,
  createDayShift,
  createExpense,
  createExpenseType,
  createHolder,
  createInitialSetup,
  createPlatform,
  createShiftType,
  createTip,
  createWallet,
  deleteAccountType,
  deleteBonusCondition,
  deleteBox,
  deleteDayShift,
  deleteExpenseType,
  deleteHolder,
  deletePlatform,
  deleteShiftType,
  deleteWallet,
  loadCurrentShiftData,
  saveAppConfig,
  setAccountAvailability,
  updateAccount,
  updateAccountType,
  updateAccountValue,
  updateAdvertisingLine,
  updateBonusCondition,
  updateBox,
  updateDayShift,
  updateExpenseType,
  updateHolder,
  updatePlatform,
  updateShiftRounding,
  updateShiftType,
  updateWallet,
} from './lib/data'

const money = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 })

const navItems = [
  ['dashboard', 'Caja', LayoutGrid],
  ['stats', 'Estadísticas', BarChart3],
  ['logistics', 'Logística', WalletCards],
  ['users', 'Usuarios', Users],
  ['bonuses', 'Bonos', Gift],
  ['settings', 'Configuración', Settings2],
]

function App() {
  const [view, setView] = useState('dashboard')
  const [openGoal, setOpenGoal] = useState(true)
  const [toast, setToast] = useState('')
  const [appData, setAppData] = useState(null)
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    loadCurrentShiftData().then(setAppData).catch((error) => setLoadError(error.message || 'No se pudieron cargar los datos de Supabase.'))
  }, [])

  useEffect(() => {
    if (!toast) return undefined
    const timer = setTimeout(() => setToast(''), 3200)
    return () => clearTimeout(timer)
  }, [toast])

  const activeLabel = navItems.find(([id]) => id === view)?.[1] ?? 'Caja'
  const shift = appData?.shift
  const shiftName = shift?.dias_turno?.nombre ?? 'Sin turno abierto'
  const shiftTime = shift?.dias_turno ? `${shift.dias_turno.hora_inicio.slice(0, 5)} - ${shift.dias_turno.hora_fin.slice(0, 5)}` : '--:-- - --:--'
  const selectedBoxId = shift?.caja_id ?? appData?.boxes?.[0]?.id ?? null
  const activeBox = shift?.cajas?.nombre ?? appData?.boxes?.find(boxItem => boxItem.id === selectedBoxId)?.nombre ?? 'Sin caja'
  const reloadData = (boxId = selectedBoxId) => {
    setLoadError('')
    setAppData(null)
    loadCurrentShiftData(boxId).then(setAppData).catch((error) => setLoadError(error.message || 'No se pudieron cargar los datos de Supabase.'))
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand" onClick={() => setView('dashboard')} role="button" tabIndex="0">
          <div className="brand-mark"><Banknote size={21} /></div>
          <div><strong>CAJA<span>Europa</span></strong><small>Control operativo</small></div>
        </div>
        <div className="shift-nav">
          <button className="icon-button" title="Turno anterior"><ChevronRight size={17} className="flip-x" /></button>
          <div className="shift-title"><span><Clock3 size={14} /> {shiftName}</span><b>{shift ? new Date(shift.fecha_hora_inicio).toLocaleDateString('es-AR') : '--/--'} <em>/</em> {shiftTime}</b></div>
          <button className="icon-button" title="Turno siguiente"><ChevronRight size={17} /></button>
        </div>
        <div className="top-actions">
          <BoxSelector boxes={appData?.boxes || []} selectedId={selectedBoxId} onChange={reloadData} />
          <span className="saved"><i /> {shift ? 'Conectado' : 'Sin turno'}</span>
          <button className="camera-button" title="Cámara"><Camera size={16} /></button>
          <button className="lock-button" title="Bloquear caja"><LockKeyhole size={16} /></button>
        </div>
      </header>

      <div className="workspace">
        <aside className="sidebar">
          <p className="sidebar-label">Operación</p>
          {navItems.map(([id, label, Icon]) => <button key={id} className={`side-link ${view === id ? 'active' : ''}`} onClick={() => setView(id)}><Icon size={16} /><span>{label}</span>{id === 'bonuses' && appData && <b className="nav-count">{appData.bonuses.length}</b>}</button>)}
          <div className="sidebar-bottom"><div className="operator"><span>MR</span><div><strong>Marina Ríos</strong><small>Operadora</small></div><ChevronDown size={14} /></div></div>
        </aside>

        <main className="main-content">
          <section className="page-heading">
            <div><span className="eyebrow">{shift ? `Turno iniciado · ${new Date(shift.fecha_hora_inicio).toLocaleString('es-AR')}` : 'Sin turno abierto'}</span><h1>{activeLabel === 'Caja' ? `${shiftName} / ${shiftTime}` : activeLabel}</h1><p>{shift ? new Date(shift.fecha_hora_inicio).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' }) : 'Seleccioná una caja con un turno abierto'} · {activeBox}</p></div>
          </section>

          {loadError && <div className="empty-state"><strong>Error al cargar Supabase</strong><p>{loadError}</p></div>}
          {!loadError && !appData && <div className="empty-state"><strong>Cargando datos</strong><p>Consultando el turno y la información operativa.</p></div>}
          {!loadError && appData && view === 'dashboard' && !appData.shift && <SetupWizard onCreated={reloadData} setToast={setToast} />}
          {!loadError && appData && view === 'dashboard' && appData.shift && <Dashboard data={appData} openGoal={openGoal} setOpenGoal={setOpenGoal} setToast={setToast} onSaved={reloadData} />}
          {!loadError && appData && view === 'stats' && <LiveStatistics data={appData} />}
          {!loadError && appData && view === 'logistics' && <LiveLogistics data={appData} setToast={setToast} />}
          {!loadError && appData && view === 'users' && <LiveUsersView users={appData.users} />}
          {!loadError && appData && view === 'bonuses' && <LiveBonuses bonuses={appData.bonuses} />}
          {!loadError && appData && view === 'settings' && <LiveSettings data={appData} setToast={setToast} onSaved={reloadData} />}
        </main>
      </div>
      {toast && <div className="toast"><Sparkles size={16} />{toast}</div>}
    </div>
  )
}

function GoalStrip({ open, onToggle, goals = [] }) {
  const summary = goals.slice(0, 2)
  return <section className={`goal-strip ${open ? 'expanded' : ''}`}><div className="goal-strip-head"><strong>Objetivos del turno</strong><div className="goal-summary">{summary.length ? summary.map(goal => <span key={goal.label}>{goal.label} <b>{goal.percent}%</b><i><em style={{ width: `${goal.percent}%` }} /></i><small>{money.format(goal.current)} / {money.format(goal.target)}</small></span>) : <small className="muted-copy">Sin objetivos configurados</small>}</div><button className="icon-button" onClick={onToggle} aria-label="Mostrar objetivos">{open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}</button></div>{open && <div className="goal-details">{goals.length ? goals.map(goal => <Goal key={goal.label} {...goal} />) : <EmptyInline text="No hay objetivos asociados a este turno." />}</div>}</section>
}

function BoxSelector({ boxes, selectedId, onChange }) {
  const [open, setOpen] = useState(false)
  const selected = boxes.find(box => box.id === selectedId) || boxes[0]
  useEffect(() => {
    if (!open) return undefined
    const close = (event) => { if (!event.target.closest('.box-select')) setOpen(false) }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])
  return <div className={`box-select ${open ? 'open' : ''}`}><small>CAJA</small><button type="button" className="box-select-trigger" aria-expanded={open} onClick={() => setOpen(value => !value)}><strong>{selected?.nombre || 'Sin cajas'}</strong><span className="box-dot" /></button>{open && <div className="box-options">{boxes.length ? boxes.map(box => <button type="button" className={box.id === selected?.id ? 'selected' : ''} key={box.id} onClick={() => { setOpen(false); onChange(box.id) }}><i />{box.nombre}</button>) : <span className="box-option-empty">No hay cajas configuradas</span>}</div>}</div>
}

function SetupWizard({ onCreated, setToast }) {
  const [boxName, setBoxName] = useState('')
  const [shiftName, setShiftName] = useState('')
  const [startTime, setStartTime] = useState('00:00')
  const [endTime, setEndTime] = useState('08:00')
  const [initialAmount, setInitialAmount] = useState('0')
  const [holders, setHolders] = useState('')
  const [wallets, setWallets] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    const holderNames = holders.split(',').map(value => value.trim()).filter(Boolean)
    const walletNames = wallets.split(',').map(value => value.trim()).filter(Boolean)
    if (!boxName.trim() || !shiftName.trim() || !holderNames.length || !walletNames.length) {
      setToast('Completá caja, turno, titulares y billeteras')
      return
    }
    setSaving(true)
    try {
      await createInitialSetup({ boxName: boxName.trim(), shiftName: shiftName.trim(), startTime, endTime, holderNames, walletNames, initialAmount })
      setToast('Configuración inicial creada en Supabase')
      onCreated()
    } catch (error) {
      setToast(error.message || 'No se pudo crear la configuración inicial')
    } finally {
      setSaving(false)
    }
  }

  return <section className="setup-page">
    <div className="setup-intro"><span className="eyebrow">Primer acceso</span><h2>Configurá tu primera caja</h2><p>Estos datos se van a guardar en Supabase y después vas a poder editarlos desde Configuración.</p></div>
    <form className="panel setup-form" onSubmit={handleSubmit}>
      <div className="setup-section"><h3>Turno y caja</h3><div className="setup-fields"><label>Nombre de la caja<input value={boxName} onChange={event => setBoxName(event.target.value)} placeholder="Ej. Noruega" /></label><label>Nombre del turno<input value={shiftName} onChange={event => setShiftName(event.target.value)} placeholder="Ej. Turno noche" /></label><label>Hora de inicio<input type="time" value={startTime} onChange={event => setStartTime(event.target.value)} /></label><label>Hora de fin<input type="time" value={endTime} onChange={event => setEndTime(event.target.value)} /></label><label>Monto inicial<input type="number" min="0" step="0.01" value={initialAmount} onChange={event => setInitialAmount(event.target.value)} /></label></div></div>
      <div className="setup-section"><h3>Catálogos iniciales</h3><div className="setup-fields"><label className="full-field">Titulares, separados por coma<textarea value={holders} onChange={event => setHolders(event.target.value)} placeholder="Ej. Persona 1, Persona 2" /></label><label className="full-field">Billeteras, separadas por coma<textarea value={wallets} onChange={event => setWallets(event.target.value)} placeholder="Ej. Billetera 1, Billetera 2" /></label></div></div>
      <div className="setup-actions"><small>Se crearán también las cuentas operativas y sus vínculos con el turno.</small><button className="primary-button" type="submit" disabled={saving}>{saving ? 'Creando...' : 'Crear configuración'}</button></div>
    </form>
  </section>
}
function Goal({ label, current, target, percent }) { return <div className="goal-row"><strong>Obj. {label}</strong><i><em style={{ width: `${percent}%` }} /></i><b>{percent}%</b><small>{money.format(current)} <span>/</span> {money.format(target)}</small></div> }

function mapGoals(rows) {
  return rows.map(row => {
    const target = Number(row.objetivo_final_turno || row.subobjetivos?.objetivo_final_dia || row.subobjetivos?.objetivos?.objetivo_final || 0)
    const current = Number(row.objetivo_alcanzado_turno || row.subobjetivos?.objetivo_alcanzado_dia || row.subobjetivos?.objetivos?.objetivo_alcanzado || 0)
    return { label: row.subobjetivos?.objetivos?.nombre || 'Objetivo', current, target, percent: target ? Math.min(100, Math.round((current / target) * 100)) : 0 }
  })
}

function Dashboard({ data, openGoal, setOpenGoal, setToast, onSaved }) {
  const [rounding, setRounding] = useState('')
  if (!data.shift) return <section className="panel empty-state"><strong>No hay un turno abierto</strong><p>Creá o abrí un turno en Supabase para cargar la operación real de la caja.</p></section>
  const goals = mapGoals(data.goals)
  const accounts = data.accounts.map(account => ({ ...account, holder: account.cuentas?.titulares?.nombre || 'Sin titular', wallet: account.cuentas?.billeteras?.nombre || 'Sin billetera', amount: Number(account.valor || 0) }))
  const total = accounts.reduce((sum, account) => sum + account.amount, 0)
  const tipsTotal = data.tips.reduce((sum, tip) => sum + Number(tip.monto || 0), 0)
  const expensesTotal = data.expenses.reduce((sum, expense) => sum + Number(expense.monto || 0), 0)
  const bonusTotal = data.bonuses.reduce((sum, bonus) => sum + (bonus.recuperado ? -Number(bonus.valor || 0) : Number(bonus.valor || 0)), 0)
  const accountHolders = [...new Set(accounts.map(account => account.holder))]
  const accountWallets = [...new Set(accounts.map(account => account.wallet))]
  return <>
    <GoalStrip open={openGoal} onToggle={() => setOpenGoal(value => !value)} goals={goals} />
    <section className="summary-bar"><div className="summary-status"><span className="eyebrow">Resumen</span><b><i /> {data.shift.abierto ? 'ABIERTA' : 'CERRADA'}</b></div><Metric label="Caja inicial" value={money.format(data.shift.caja_inicial)} tone="positive" /><Metric label="Caja final" value={data.shift.caja_final == null ? 'Sin cierre' : money.format(data.shift.caja_final)} tone="positive" /><Metric label="Propinas" value={money.format(tipsTotal)} tone="positive" /><Metric label="Gastos" value={money.format(expensesTotal)} tone="negative" /><Metric label="Bonos netos" value={money.format(bonusTotal)} tone="positive" /><label className="rounding"><small>Redondeo</small><span>$<input value={rounding === '' ? data.shift.redondeo : rounding} onChange={(event) => setRounding(event.target.value)} onBlur={() => updateShiftRounding(data.shift.id, rounding).then(onSaved).catch(() => setToast('No se pudo guardar el redondeo'))} /></span></label></section>
    <div className="dashboard-grid">
      <div className="dashboard-main">
        <div className="top-panels"><Publicity rows={data.advertising} setToast={setToast} onSaved={onSaved} /><BonusSummary rows={data.bonuses} /><ChipSummary chips={data.chips} /></div>
        <AccountMatrix accounts={accounts} holders={accountHolders} wallets={accountWallets} total={total} setToast={setToast} onSaved={onSaved} />
        <div className="three-panels"><LogisticsCard rows={data.logistics} /><StatusCard /><UsersCard users={data.users} /></div>
        <div className="three-panels lower"><MovementCard title="Gastos" kind="expenses" shiftId={data.shift.id} options={data.expenseTypes} icon={FileText} amount={expensesTotal} rows={data.expenses} onSaved={onSaved} setToast={setToast} /><MovementCard title="Propinas" kind="tips" shiftId={data.shift.id} icon={CircleDollarSign} amount={tipsTotal} rows={data.tips} onSaved={onSaved} setToast={setToast} /><BonusList shiftId={data.shift.id} rows={data.bonuses} onSaved={onSaved} setToast={setToast} /></div>
      </div>
    </div>
  </>
}
function Metric({ label, value, tone = '' }) { return <div className="metric"><small>{label}</small><strong className={tone}>{value}</strong></div> }
function Publicity({ rows, setToast, onSaved }) { const fields = [['Total', 'total_llegados'], ['Nuevos', 'nuevos'], ['Repetidos', 'repetidos'], ['Sin respuesta', 'sin_respuesta']]; const change = (row, field, value) => updateAdvertisingLine(row.id, field, Math.max(0, value)).then(onSaved).catch(() => setToast('No se pudo guardar publicidad')); return <section className="panel publicity"><PanelTitle icon={Bell} title="Publicidad" action={<Copy size={15} />} /><div className="publicity-rows">{rows.length ? rows.map(row => <div className="publicity-row" key={row.id}><strong><FileText size={13} /> Línea {row.id}</strong>{fields.map(([label, field]) => <label key={field}><small>{label}</small><span><button aria-label={`Disminuir ${label}`} onClick={() => change(row, field, Number(row[field]) - 1)}>−</button><b>{row[field] ?? 0}</b><button aria-label={`Aumentar ${label}`} onClick={() => change(row, field, Number(row[field]) + 1)}>+</button></span></label>)}<em>{row.total_derivados ?? 0} derivados</em></div>) : <EmptyInline text="No hay líneas de publicidad para este turno." />}</div></section> }
function BonusSummary({ rows }) { const total = rows.reduce((sum, row) => sum + (row.recuperado ? -Number(row.valor || 0) : Number(row.valor || 0)), 0); return <section className="panel compact-bonus"><PanelTitle icon={Gift} title="Bonos netos" action={<Eye size={15} />} /><strong className="accent-number">{money.format(total)}</strong><p>Últimos movimientos</p>{rows.slice(0, 4).map(row => <div className="mini-row" key={row.id}><span className={row.recuperado ? 'success' : ''}>{row.recuperado ? 'Recuperado' : 'Otorgado'}</span><time>{new Date(row.fecha_hora_creacion).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}</time><b>{money.format(row.valor)}</b></div>)}{!rows.length && <EmptyInline text="No hay bonos registrados." />}</section> }
function ChipSummary({ chips }) { return <section className="panel chip-summary"><PanelTitle icon={Boxes} title="Fichas finales" action={<Plus size={15} />} />{chips.length ? chips.map(chip => <div className="chip-item" key={chip.id}><span>{chip.plataformas?.nombre || 'Plataforma'}</span><b>{money.format(chip.fichas_inicial)}</b><strong className={chip.fichas_final == null ? '' : 'success'}>{chip.fichas_final == null ? 'Sin cierre' : money.format(chip.fichas_final)}</strong></div>) : <EmptyInline text="No hay fichas configuradas para este turno." />}</section> }
function AccountMatrix({ accounts, holders, wallets, total, setToast, onSaved }) { const saveAccount = (account, event) => updateAccountValue(account.id, event.target.value.replace(/\./g, '').replace(',', '.')).then(onSaved).catch(() => setToast('No se pudo guardar el valor de la cuenta')); return <section className="panel account-panel"><PanelTitle icon={WalletCards} title="Matriz de cuentas" meta={`${holders.length} titulares · ${wallets.length} billeteras`} action={<button className="text-action" onClick={() => setToast('La matriz refleja los valores guardados en Supabase')}>Estado de datos</button>} /><div className="matrix-wrap">{accounts.length ? <><div className="matrix-row matrix-head"><strong>Titular</strong>{wallets.map(wallet => <span key={wallet}>{wallet}</span>)}<span>Total</span></div>{holders.map(holder => { const holderAccounts = accounts.filter(account => account.holder === holder); const holderTotal = holderAccounts.reduce((sum, account) => sum + account.amount, 0); return <div className="matrix-row" key={holder}><strong>{holder}</strong>{wallets.map(wallet => { const account = holderAccounts.find(item => item.wallet === wallet); return <label key={`${holder}-${wallet}`} className={account?.amount ? 'green' : ''}>{account ? <><span>$</span><input defaultValue={account.amount.toLocaleString('es-AR')} onFocus={(event) => event.target.select()} onBlur={(event) => saveAccount(account, event)} /></> : '—'}</label> })}<b>{money.format(holderTotal)}</b></div> })}<div className="matrix-total"><span>Total billetera</span>{wallets.map(wallet => <b key={wallet}>{money.format(accounts.filter(account => account.wallet === wallet).reduce((sum, account) => sum + account.amount, 0))}</b>)}<strong>{money.format(total)}</strong></div></> : <EmptyInline text="No hay cuentas vinculadas al turno abierto." />}</div></section> }
function LogisticsCard({ rows }) { return <section className="panel mini-card logistics-card"><PanelTitle icon={WalletCards} title="Logística" action={<ChevronRight size={15} />} />{rows.length ? rows.slice(0, 4).map(row => { const account = row.cuentas_x_turno?.cuentas; return <div className="route-row" key={row.id}><span>{row.num_orden ?? '—'}</span><b>{account?.titulares?.nombre || 'Sin titular'} · {account?.billeteras?.nombre || 'Sin billetera'}</b></div> }) : <EmptyInline text="No hay rutas de logística configuradas." />}</section> }
function StatusCard() { return <section className="panel mini-card"><PanelTitle icon={Sparkles} title="Estados" action={<SlidersHorizontal size={15} />} /><EmptyInline text="Los estados se mostrarán cuando estén configurados en Supabase." /></section> }
function UsersCard({ users }) { return <section className="panel mini-card"><PanelTitle icon={Users} title="Usuarios" action={<Plus size={15} />} /><div className="search-line"><Search size={14} /><input placeholder="Buscar usuario" /></div>{users.slice(0, 5).map(user => <div className="user-row" key={user.id}><span><UserRound size={15} /></span><b>{user.nombres_usuario?.[0]?.nombre || `Usuario #${user.id}`}</b><ChevronRight size={14} /></div>)}{!users.length && <EmptyInline text="No hay usuarios registrados." />}</section> }
function MovementCard({ title, kind, shiftId, options = [], icon: Icon, amount, rows, onSaved, setToast }) {
  const [value, setValue] = useState('')
  const [detail, setDetail] = useState('')
  const [typeId, setTypeId] = useState(options[0]?.id || '')
  const add = async () => {
    if (!Number(value)) { setToast('Ingresá un monto válido'); return }
    try {
      if (kind === 'expenses') await createExpense(shiftId, { typeId, value, notes: detail })
      else await createTip(shiftId, { value, user: detail, notes: '' })
      setValue(''); setDetail(''); setToast(`${title} guardado`); onSaved()
    } catch (error) { setToast(error.message || `No se pudo guardar ${title.toLowerCase()}`) }
  }
  return <section className="panel movement-card"><PanelTitle icon={Icon} title={title} meta={`${rows.length} registros`} action={<button className="icon-button" title={`Ver ${title.toLowerCase()}`}><Eye size={15} /></button>} /><div className="entry-form">{kind === 'expenses' ? <select value={typeId} onChange={(event) => setTypeId(event.target.value)}><option value="">Tipo</option>{options.map(option => <option value={option.id} key={option.id}>{option.nombre}</option>)}</select> : <input placeholder="Usuario" value={detail} onChange={(event) => setDetail(event.target.value)} />}<input placeholder="$ Monto" value={value} onChange={(event) => setValue(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') add() }} />{kind === 'expenses' ? <input placeholder="Notas" value={detail} onChange={(event) => setDetail(event.target.value)} /> : <span /> }<button className="send-button" title={`Agregar ${title.toLowerCase()}`} onClick={add}><ArrowLeftRight size={14} /></button></div><small className="section-kicker">Últimos registros</small>{rows.slice(0, 5).map(row => <div className="movement-row" key={row.id}><span>{row.usuario_texto || row.notas || row.tipos_gasto?.nombre || 'Movimiento'}</span><b>{money.format(row.monto)}</b></div>)}{!rows.length && <EmptyInline text="No hay movimientos registrados." />}<footer>Total <strong>{money.format(amount)}</strong></footer></section>
}
function BonusList({ shiftId, rows, onSaved, setToast }) {
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState('')
  const [recovered, setRecovered] = useState(false)
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const save = async () => {
    if (!Number(value)) { setToast('Ingresá un monto válido'); return }
    setSaving(true)
    try { await createBonusLine(shiftId, { value, recovered, notes }); setOpen(false); setValue(''); setNotes(''); setRecovered(false); setToast('Bono guardado'); onSaved() } catch (error) { setToast(error.message || 'No se pudo guardar el bono') } finally { setSaving(false) }
  }
  return <section className="panel movement-card bonus-list"><PanelTitle icon={Gift} title="Bonos" meta={`${rows.filter(row => !row.recuperado).length} otorgados · ${rows.filter(row => row.recuperado).length} recuperados`} action={<button className="icon-button" title="Agregar bono" onClick={() => setOpen(true)}><Plus size={15} /></button>} /><div className="entry-form"><input placeholder="$ Insertar bono otorgado" value={value} onChange={(event) => setValue(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') save() }} /><button className="send-button" title="Agregar bono" onClick={save}><ArrowLeftRight size={14} /></button></div><small className="section-kicker">Últimos bonos</small>{rows.slice(0, 8).map(row => <div className="movement-row" key={row.id}><span className={row.recuperado ? 'success' : 'warning'}>{row.recuperado ? 'Recuperado' : 'Otorgado'}</span><time>{new Date(row.fecha_hora_creacion).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}</time><b>{money.format(row.valor)}</b></div>)}{!rows.length && <EmptyInline text="No hay bonos registrados." />}{open && <div className="modal-backdrop" onClick={() => !saving && setOpen(false)}><div className="modal bonus-entry-modal" onClick={(event) => event.stopPropagation()}><button className="modal-close" title="Cerrar" onClick={() => setOpen(false)}><X size={18} /></button><div className="modal-icon"><Gift size={20} /></div><h2>Agregar bono</h2><p>Elegí el tipo, indicá el monto y confirmá.</p><label className="modal-field"><span>Tipo</span><select value={recovered ? 'recuperado' : 'otorgado'} onChange={(event) => setRecovered(event.target.value === 'recuperado')}><option value="otorgado">Otorgado</option><option value="recuperado">Recuperado</option></select></label><label className="modal-field"><span>Monto</span><AmountInput value={value} onChange={setValue} /></label><label className="modal-field"><span>Nota</span><input value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Nota del bono" /></label><div className="modal-actions"><button className="ghost-button" onClick={() => setOpen(false)}>Cancelar</button><button className="close-button" onClick={save} disabled={saving}>{saving ? 'Guardando...' : 'Guardar'} <Check size={15} /></button></div></div></div>}</section>
}
function EmptyInline({ text }) { return <p className="empty-inline">{text}</p> }
function PanelTitle({ icon: Icon, title, meta, action }) { return <div className="panel-title"><div><Icon size={16} /><h2>{title}</h2>{meta && <small>{meta}</small>}</div>{action && <span className="panel-action">{action}</span>}</div> }

function ConfigList({ title, items, select }) { return <section className="panel config-list"><div className="panel-title"><h2>{title}</h2><small>{items.length} elementos</small></div>{items.map(item => <div className="config-row" key={item.id || item}><span className="drag">⠿</span><input defaultValue={item.nombre || item} />{select && <select defaultValue="Cobros + retiros"><option>Cobros + retiros</option><option>Solo cobros</option><option>Solo depósito</option></select>}<button className="icon-button"><X size={14} /></button></div>)}{!items.length && <EmptyInline text="No hay registros configurados." />}<button className="secondary-button"><Plus size={14} /> Agregar</button></section> }

function LiveStatistics({ data }) {
  const tips = data.tips.reduce((sum, row) => sum + Number(row.monto || 0), 0)
  const expenses = data.expenses.reduce((sum, row) => sum + Number(row.monto || 0), 0)
  const bonuses = data.bonuses.reduce((sum, row) => sum + (row.recuperado ? -Number(row.valor || 0) : Number(row.valor || 0)), 0)
  return <><GoalStrip open={false} onToggle={() => {}} goals={mapGoals(data.goals)} /><section className="panel stats-toolbar"><div><span className="eyebrow">Turno actual</span><h2>{data.shift ? new Date(data.shift.fecha_hora_inicio).toLocaleString('es-AR') : 'Sin turno abierto'}</h2></div><div className="stats-filters"><span className="muted-copy">Las estadísticas históricas estarán disponibles cuando existan turnos cerrados.</span></div></section><div className="stats-grid"><section className="panel stat-card featured"><div className="stat-head"><h2>Turno actual</h2><small>1 turno</small></div><h3>GENERAL</h3><div className="stat-line"><span>Caja inicial</span><b>{money.format(data.shift?.caja_inicial || 0)}</b></div><div className="stat-line"><span>Propinas</span><b>{money.format(tips)}</b></div><div className="stat-line"><span>Gastos</span><b>{money.format(expenses)}</b></div><h3>BONOS</h3><div className="stat-line"><span>Bonos netos</span><b>{money.format(bonuses)}</b></div><h3>DATOS</h3><div className="stat-line"><span>Cuentas activas</span><b>{data.accounts.length}</b></div><div className="stat-line"><span>Movimientos</span><b>{data.tips.length + data.expenses.length + data.bonuses.length}</b></div></section><section className="panel stat-card"><EmptyInline text="No hay otros turnos cerrados en el rango cargado." /></section></div></>
}

function LiveLogistics({ data, setToast }) {
  const [filter, setFilter] = useState('')
  const rows = data.logistics.filter(row => {
    const account = row.cuentas_x_turno?.cuentas
    const text = `${account?.titulares?.nombre || ''} ${account?.billeteras?.nombre || ''}`
    return text.toLowerCase().includes(filter.toLowerCase())
  })

  return <>
    <GoalStrip open={false} onToggle={() => {}} goals={mapGoals(data.goals)} />
    <section className="panel logistics-page">
      <PanelTitle icon={WalletCards} title="Ruta de cuentas" meta={`${rows.length} registros del turno`} action={<button className="primary-button" onClick={() => setToast('La creación de logística se conectará a la tabla lineas_logistica')}><Plus size={14} /> Agregar billetera</button>} />
      <div className="search-line wide"><Search size={14} /><input placeholder="Filtrar cliente o billetera" value={filter} onChange={(event) => setFilter(event.target.value)} /></div>
      <div className="logistics-table">
        <div className="logistics-head"><span>Orden</span><span>Cliente</span><span>Billetera</span><span>Aclaración</span><span>Último cobro</span><span>Último retiro</span><span>Caja</span></div>
        {rows.map(row => {
          const account = row.cuentas_x_turno?.cuentas
          return <div className="logistics-row" key={row.id}><span>{row.num_orden ?? '—'}</span><b>{account?.titulares?.nombre || 'Sin titular'}</b><strong>{account?.billeteras?.nombre || 'Sin billetera'}</strong><span>{row.aclaracion || '—'}</span><time>{row.ultimo_reinicio_cobros ? new Date(row.ultimo_reinicio_cobros).toLocaleString('es-AR') : '—'}</time><time>{row.ultimo_reinicio_retiros ? new Date(row.ultimo_reinicio_retiros).toLocaleString('es-AR') : '—'}</time><button onClick={() => setToast('La asignación se guarda en Supabase al conectar el formulario')}>Sin asignar</button></div>
        })}
        {!rows.length && <EmptyInline text="No hay líneas de logística para el turno actual." />}
      </div>
    </section>
  </>
}

function LiveUsersView({ users }) { const [expanded, setExpanded] = useState(null); return <><GoalStrip open={false} onToggle={() => {}} /><section className="panel directory"><PanelTitle icon={Users} title="Usuarios" meta={`${users.length} registros`} action={<button className="primary-button"><Plus size={14} /> Nuevo usuario</button>} />{users.map(user => { const name = user.nombres_usuario?.[0]?.nombre || `Usuario #${user.id}`; return <div className={`directory-row ${expanded === user.id ? 'expanded' : ''}`} key={user.id}><button className="expand-button" onClick={() => setExpanded(expanded === user.id ? null : user.id)}>{expanded === user.id ? <ChevronDown size={15} /> : <ChevronRight size={15} />}</button><b>{name}</b><div className="tags">{user.titulares_usuario?.map(holder => <span key={holder.id}>{holder.nombre}</span>)}</div><button className="icon-button"><Settings2 size={15} /></button>{expanded === user.id && <div className="user-detail"><label>Nombre<input defaultValue={name} /></label><label>Teléfono<input defaultValue={user.telefonos_usuario?.[0]?.numero || ''} /></label><label>Titular<input defaultValue={user.titulares_usuario?.[0]?.nombre || ''} /></label><label>Estado<input defaultValue={user.bloqueado ? 'Bloqueado' : 'Activo'} readOnly /></label></div>}</div> })}{!users.length && <EmptyInline text="No hay usuarios registrados en Supabase." />}</section></> }

function LiveBonuses({ bonuses }) { const grouped = bonuses.reduce((groups, bonus) => { const key = bonus.es_publicidad ? 'Publicidad' : (bonus.recuperado ? 'Recuperados' : 'Otorgados'); groups[key] = [...(groups[key] || []), bonus]; return groups }, {}); return <><GoalStrip open={false} onToggle={() => {}} /><section className="panel bonus-library"><PanelTitle icon={Gift} title="Bonos del turno" meta={`${bonuses.length} registros`} action={<button className="primary-button"><Plus size={14} /> Nuevo bono</button>} />{Object.entries(grouped).map(([group, items]) => <div className="bonus-group" key={group}><div className="group-heading"><h2>{group}</h2><small>{items.length} registros</small></div><div className="bonus-cards">{items.map(bonus => <article className="bonus-card" key={bonus.id}><div className="bonus-art art-0"><Gift size={31} /><strong>{money.format(bonus.valor)}</strong></div><div><h3>{bonus.notas || (bonus.es_publicidad ? 'Bono de publicidad' : 'Bono operativo')}</h3><p>{new Date(bonus.fecha_hora_creacion).toLocaleString('es-AR')}</p><small>{bonus.recuperado ? 'Recuperado' : 'Otorgado'}</small></div></article>)}</div></div>)}{!bonuses.length && <EmptyInline text="No hay bonos registrados para el turno actual." />}</section></> }

function LiveSettings({ data, setToast, onSaved }) {
  const [saveNotice, setSaveNotice] = useState('')
  const [dragState, setDragState] = useState({ type: null, index: null })

  const persistUpdate = async (action, successMessage) => {
    try {
      await action()
      setSaveNotice(successMessage)
      window.setTimeout(() => setSaveNotice(''), 1800)
    } catch (error) {
      setToast(error.message || 'No se pudo guardar la configuración')
    }
  }

  const buildUniqueItems = (items, getItem) => {
    const unique = new Map()
    items.forEach((entry) => {
      const item = getItem(entry)
      const label = item?.nombre || item?.title || 'Sin dato'
      const key = String(label).trim().toLowerCase() || 'sin-dato'
      if (!unique.has(key)) {
        unique.set(key, { ...item, id: item?.id ?? key, nombre: label })
      }
    })
    return [...unique.values()]
  }

  const buildDefaultConfig = useMemo(() => {
    const sortByOrder = (items = []) => [...items].sort((left, right) => {
      const leftValue = Number(left?.orden_num ?? Number.MAX_SAFE_INTEGER)
      const rightValue = Number(right?.orden_num ?? Number.MAX_SAFE_INTEGER)
      if (leftValue !== rightValue) return leftValue - rightValue
      return String(left?.nombre || '').localeCompare(String(right?.nombre || ''))
    })

    const holdersFromData = sortByOrder(buildUniqueItems(data.holders || data.accounts || [], (entry) => (entry?.nombre ? entry : (entry?.cuentas?.titulares || { id: entry?.cuenta_id, nombre: 'Sin titular' }))))
    const walletsFromData = sortByOrder(buildUniqueItems(data.wallets || data.accounts || [], (entry) => (entry?.nombre ? entry : (entry?.cuentas?.billeteras || { id: entry?.cuenta_id, nombre: 'Sin billetera' }))))
    const availability = {}
    holdersFromData.forEach((holder) => {
      const holderName = holder.nombre || 'Sin titular'
      availability[holderName] = {}
      walletsFromData.forEach((wallet) => {
        const walletName = wallet.nombre || 'Sin billetera'
        const isAvailable = (data.accounts || []).some((account) => {
          const accountHolder = account?.cuentas?.titulares?.nombre || data.holders?.find((item) => item.id === account?.titular_id)?.nombre
          const accountWallet = account?.cuentas?.billeteras?.nombre || data.wallets?.find((item) => item.id === account?.billetera_id)?.nombre
          return accountHolder === holderName && accountWallet === walletName
        })
        availability[holderName][walletName] = isAvailable
      })
    })

    return {
      boxes: (data.boxes || []).map((box) => ({ id: box.id, title: box.nombre || 'Caja', color: box.color_id || 'teal' })),
      accounts: {
        holders: holdersFromData.map((holder) => holder.nombre || 'Sin titular'),
        wallets: walletsFromData.map((wallet) => wallet.nombre || 'Sin billetera'),
        availability,
        walletModes: Object.fromEntries((walletsFromData.map((wallet) => [wallet.nombre || 'Sin billetera', 'Cobros y retiros']))),
      },
      expenses: (data.expenseTypes || []).map((expense) => ({ id: expense.id, name: expense.nombre || 'Gasto', inverted: Boolean(expense.invertir_signo) })),
      platforms: (data.platforms || []).map((platform) => platform.nombre || 'Plataforma'),
      platformColors: Object.fromEntries((data.platforms || []).map((platform) => [platform.nombre || 'Plataforma', platform.color_id ? 'teal' : 'teal'])),
      bonusConditions: (data.bonusConditions || []).map((condition) => ({ id: condition.id, label: condition.nombre || 'Condición', allow: Boolean(condition.plataforma) })),
    }
  }, [data.accounts, data.boxes, data.holders, data.wallets, data.platforms, data.expenseTypes, data.bonusConditions])

  const [tab, setTab] = useState('accounts')
  const [draft, setDraft] = useState(buildDefaultConfig)
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    setDraft(buildDefaultConfig)
  }, [buildDefaultConfig])

  const updateAccounts = (patch) => {
    setDraft((current) => ({ ...current, accounts: { ...current.accounts, ...patch } }))
  }

  const reorderAccountEntries = async (type, fromIndex, toIndex) => {
    if (fromIndex === toIndex || fromIndex === null || toIndex === null) return

    const key = type === 'holders' ? 'holders' : 'wallets'
    const next = [...draft.accounts[key]]
    const [moved] = next.splice(fromIndex, 1)
    next.splice(toIndex, 0, moved)
    updateAccounts({ [key]: next })

    const source = type === 'holders' ? (data.holders || []) : (data.wallets || [])
    const orderedIds = next
      .map((label) => source.find((item) => item.nombre === label)?.id)
      .filter(Boolean)

    for (let index = 0; index < orderedIds.length; index += 1) {
      const id = orderedIds[index]
      const label = next[index]
      if (type === 'holders') {
        await updateHolder(id, { name: label, orderNum: index + 1 })
      } else {
        const walletMode = draft.accounts.walletModes?.[label] || 'Cobros y retiros'
        await updateWallet(id, { name: label, typeName: walletMode === 'Cobros + Retiros' ? 'Cobros y retiros' : walletMode === 'Solo Cobros' ? 'Cobros' : 'Depósito', orderNum: index + 1 })
      }
    }
  }

  const toggleWallet = async (holderName, walletName) => {
    const holder = data.holders?.find((item) => item.nombre === holderName)
    const wallet = data.wallets?.find((item) => item.nombre === walletName)

    if (!holder || !wallet) {
      return
    }

    const existingAccount = (data.accounts || []).find((account) => {
      const accountHolder = account?.cuentas?.titulares?.nombre || data.holders?.find((item) => item.id === account?.titular_id)?.nombre
      const accountWallet = account?.cuentas?.billeteras?.nombre || data.wallets?.find((item) => item.id === account?.billetera_id)?.nombre
      return accountHolder === holderName && accountWallet === walletName
    })

    const currentChecked = Boolean(existingAccount?.cuentas?.activa ?? existingAccount?.cuentas?.check ?? existingAccount?.cuentas?.activo ?? true)
    const nextValue = !currentChecked

    try {
      if (!existingAccount?.cuentas) {
        const created = await createAccount({
          holderId: holder.id,
          walletId: wallet.id,
          alias: '',
          cuil: '',
          password: '',
          notes: '',
          typeId: data.accountTypes?.[0]?.id ?? undefined,
          active: nextValue,
        })

        if (data.shift?.id && data.shift?.caja_id) {
          await setAccountAvailability({
            shiftId: data.shift.id,
            boxId: data.shift.caja_id,
            accountId: created.id,
            enabled: nextValue,
            value: 0,
            canCollect: true,
            canWithdraw: true,
          })
        }
      } else {
        await updateAccount(existingAccount.cuentas.id, {
          active: nextValue,
          alias: existingAccount.cuentas.alias ?? '',
          cuil: existingAccount.cuentas.cuil ?? '',
          password: existingAccount.cuentas.patron ?? '',
          notes: existingAccount.cuentas.notas ?? '',
          typeId: existingAccount.cuentas.tipo_cuenta_id ?? null,
        })

        if (data.shift?.id && data.shift?.caja_id && !nextValue) {
          await setAccountAvailability({
            shiftId: data.shift.id,
            boxId: data.shift.caja_id,
            accountId: existingAccount.cuentas.id,
            enabled: false,
            value: existingAccount.valor ?? 0,
            canCollect: true,
            canWithdraw: true,
          })
        }
      }

      setSaveNotice(nextValue ? 'Cuenta activada' : 'Cuenta desactivada')
      window.setTimeout(() => setSaveNotice(''), 1800)
    } catch (error) {
      setToast(error.message || 'No se pudo guardar la cuenta')
    }
  }

  const buildTargetSetting = (holderName, walletName) => {
    const existingAccount = (data.accounts || []).find((account) => {
      const accountHolder = account?.cuentas?.titulares?.nombre || data.holders?.find((item) => item.id === account?.titular_id)?.nombre
      const accountWallet = account?.cuentas?.billeteras?.nombre || data.wallets?.find((item) => item.id === account?.billetera_id)?.nombre
      return accountHolder === holderName && accountWallet === walletName
    })

    const account = existingAccount?.cuentas || null
    return {
      holder: holderName,
      wallet: walletName,
      accountId: account?.id || existingAccount?.cuenta_id || null,
      typeId: account?.tipo_cuenta_id || data.accountTypes?.[0]?.id || '',
      alias: account?.alias || '',
      cuil: account?.cuil || '',
      password: account?.patron || '',
      note: account?.notas || '',
    }
  }

  const saveAccountSettings = async () => {
    if (!selected) return
    try {
      const holder = data.holders?.find((item) => item.nombre === selected.holder)
      const wallet = data.wallets?.find((item) => item.nombre === selected.wallet)

      if (!holder || !wallet) {
        setToast('No se encontró el titular o la billetera de esta cuenta')
        return
      }

      const payload = {
        alias: selected.alias || '',
        cuil: selected.cuil || '',
        password: selected.password || '',
        notes: selected.note || '',
        typeId: selected.typeId || data.accountTypes?.[0]?.id || null,
      }

      if (!selected.accountId) {
        const account = await createAccount({
          holderId: holder.id,
          walletId: wallet.id,
          ...payload,
        })

        if (data.shift?.id && data.shift?.caja_id) {
          await setAccountAvailability({
            shiftId: data.shift.id,
            boxId: data.shift.caja_id,
            accountId: account.id,
            enabled: true,
            value: 0,
            canCollect: true,
            canWithdraw: true,
          })
        }
      } else {
        await updateAccount(selected.accountId, payload)
      }

      setSelected(null)
      setSaveNotice('Cuenta guardada')
      window.setTimeout(() => setSaveNotice(''), 1800)
    } catch (error) {
      setToast(error.message || 'No se pudo guardar la cuenta')
    }
  }

  const renderTabButton = (id, label, Icon) => (
    <button key={id} type="button" className={tab === id ? 'active' : ''} onClick={() => setTab(id)}><Icon size={15} /> {label}</button>
  )

  const accountEntryRows = draft.accounts.holders.map((holder) => {
    const holderName = holder || 'Sin titular'
    return <div key={holderName} className="availability-row" style={{ '--wallet-count': draft.accounts.wallets.length }}>
      <b>{holderName}</b>
      {draft.accounts.wallets.map((wallet) => {
        const walletName = wallet || 'Sin billetera'
        const match = (data.accounts || []).find((account) => {
          const accountHolder = account?.cuentas?.titulares?.nombre || data.holders?.find((item) => item.id === account?.titular_id)?.nombre
          const accountWallet = account?.cuentas?.billeteras?.nombre || data.wallets?.find((item) => item.id === account?.billetera_id)?.nombre
          return accountHolder === holderName && accountWallet === walletName
        })
        const enabled = Boolean(match?.cuentas?.activa ?? match?.cuentas?.check ?? match?.cuentas?.activo ?? true)
        return <div className="account-config-cell" key={`${holderName}-${walletName}`}>
          <label className="toggle-cell" aria-label={`Activar ${holderName} · ${walletName}`}>
            <input type="checkbox" checked={enabled} onChange={() => toggleWallet(holderName, walletName)} />
            <span />
          </label>
          <button type="button" className="account-settings-button" title={`Configurar ${holderName} · ${walletName}`} onClick={() => setSelected(buildTargetSetting(holderName, walletName))}>
            <Settings2 size={14} />
          </button>
        </div>
      })}
    </div>
  })

  return <>
    <GoalStrip open={false} onToggle={() => {}} />
    <div className="settings-page">
      <div className="settings-tabs">
        {renderTabButton('boxes', 'Cajas', Banknote)}
        {renderTabButton('turns', 'Turnos', Clock3)}
        {renderTabButton('accounts', 'Matriz de cuentas', WalletCards)}
        {renderTabButton('expenses', 'Gastos', FileText)}
        {renderTabButton('platforms', 'Control de fichas', Boxes)}
        {renderTabButton('users', 'Usuarios', Users)}
        {renderTabButton('bonuses', 'Bonos', Gift)}
        {renderTabButton('account-types', 'Tipos de cuenta', CircleDollarSign)}
        {renderTabButton('goals', 'Objetivos', Target)}
        {renderTabButton('app', 'App', Settings2)}
      </div>

      <section className="settings-intro">
        <span className="eyebrow">Configuración</span>
        <h2>{tab === 'boxes' ? 'Cajas' : tab === 'accounts' ? 'Matriz de cuentas' : tab === 'expenses' ? 'Gastos' : tab === 'platforms' ? 'Control de fichas' : tab === 'users' ? 'Usuarios' : tab === 'bonuses' ? 'Bonos' : 'Objetivos'}</h2>
        {saveNotice && <div className="inline-status" style={{ marginTop: '8px', fontSize: '12px', padding: '6px 10px', borderRadius: '999px', display: 'inline-flex', alignItems: 'center', background: '#dff7eb', color: '#1d6341', border: '1px solid rgba(29,99,65,0.18)' }}>{saveNotice}</div>}
      </section>

      {tab === 'boxes' && <>
        <div className="config-two-columns">
          <div className="config-list">
            <div className="config-list-head"><h3>Mis cajas</h3><span>{draft.boxes.length} espacios</span></div>
            {draft.boxes.map((box, index) => (
              <div className="config-list-row" key={box.id || index}>
                <input value={box.title} onChange={(event) => setDraft((current) => ({ ...current, boxes: current.boxes.map((item, itemIndex) => itemIndex === index ? { ...item, title: event.target.value } : item) }))} onBlur={async (event) => {
                  const value = event.target.value.trim()
                  if (!box.id || !value) return
                  await persistUpdate(() => updateBox(box.id, { name: value, color: box.color || 'teal' }), 'Caja actualizada en Supabase')
                }} />
                <select value={box.color} onChange={(event) => {
                  const nextColor = event.target.value
                  setDraft((current) => ({ ...current, boxes: current.boxes.map((item, itemIndex) => itemIndex === index ? { ...item, color: nextColor } : item) }))
                  if (box.id) persistUpdate(() => updateBox(box.id, { name: box.title, color: nextColor }), 'Color de caja actualizado en Supabase')
                }}>
                  <option value="teal">Turquesa</option>
                  <option value="blue">Azul</option>
                  <option value="green">Verde</option>
                  <option value="orange">Naranja</option>
                  <option value="pink">Rosa</option>
                  <option value="red">Rojo</option>
                  <option value="yellow">Amarillo</option>
                  <option value="violet">Violeta</option>
                  <option value="slate">Pizarra</option>
                </select>
                <button type="button" className="delete-button" title="Eliminar caja" onClick={() => {
                  if (!box.id) return
                  persistUpdate(() => deleteBox(box.id), 'Caja eliminada de Supabase')
                }}><X size={14} /></button>
              </div>
            ))}
            <button type="button" className="config-add" onClick={async () => {
              const name = 'Nueva caja'
              await persistUpdate(() => createBox({ name, color: 'teal' }), 'Caja creada en Supabase')
            }}><Plus size={15} /> Agregar caja</button>
          </div>

          <div className="config-card">
            <div className="config-list-head"><h3>Referencia DB</h3><span>Los valores se mantienen en Supabase</span></div>
            <div className="config-list-row" style={{ display: 'grid', gap: '8px' }}>
              <span className="muted-copy">Tabla: cajas</span>
              <span className="muted-copy">Campos: nombre, color_id, imagen, imagen_mini</span>
            </div>
          </div>
        </div>
      </>}

      {tab === 'turns' && <>
        <div className="config-two-columns">
          <section className="config-card">
            <div className="config-list-head"><h3>Tipos de turno</h3><span>{(data.shiftTypes || []).length} registros</span></div>
            {(data.shiftTypes || []).map((type) => (
              <div className="config-list-row" key={type.id}>
                <input value={type.nombre || ''} onChange={async (event) => {
                  const next = event.target.value.trim()
                  if (!next) return
                  await persistUpdate(() => updateShiftType(type.id, { name: next, color: 'teal' }), 'Tipo de turno actualizado en Supabase')
                }} placeholder="Nombre del tipo" />
                <button type="button" className="delete-button" title="Eliminar tipo de turno" onClick={() => persistUpdate(() => deleteShiftType(type.id), 'Tipo de turno eliminado de Supabase')}><X size={14} /></button>
              </div>
            ))}
            <button type="button" className="config-add" onClick={() => persistUpdate(() => createShiftType({ boxId: data.boxes?.[0]?.id || null, name: 'Nuevo turno', color: 'teal' }), 'Tipo de turno creado en Supabase')}><Plus size={15} /> Agregar tipo de turno</button>
          </section>

          <section className="config-card">
            <div className="config-list-head"><h3>Días de turno</h3><span>{(data.shiftDays || []).length} registros</span></div>
            {(data.shiftDays || []).map((day) => (
              <div className="config-list-row" key={day.id} style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr 1fr 1fr auto', gap: '8px', alignItems: 'center' }}>
                <input value={day.nombre || ''} onChange={async (event) => {
                  const next = event.target.value.trim()
                  if (!next) return
                  await persistUpdate(() => updateDayShift(day.id, { name: next, weekday: day.dia_semana || 1, start: day.hora_inicio || '08:00', end: day.hora_fin || '18:00', crossesMidnight: Boolean(day.cruza_medianoche) }), 'Día de turno actualizado en Supabase')
                }} placeholder="Nombre del día" />
                <input type="number" min="1" max="7" value={day.dia_semana || 1} onChange={async (event) => {
                  await persistUpdate(() => updateDayShift(day.id, { name: day.nombre || 'Día', weekday: Number(event.target.value), start: day.hora_inicio || '08:00', end: day.hora_fin || '18:00', crossesMidnight: Boolean(day.cruza_medianoche) }), 'Orden del día actualizado en Supabase')
                }} />
                <input type="time" value={day.hora_inicio || '08:00'} onChange={async (event) => {
                  await persistUpdate(() => updateDayShift(day.id, { name: day.nombre || 'Día', weekday: day.dia_semana || 1, start: event.target.value, end: day.hora_fin || '18:00', crossesMidnight: Boolean(day.cruza_medianoche) }), 'Hora de inicio actualizada en Supabase')
                }} />
                <input type="time" value={day.hora_fin || '18:00'} onChange={async (event) => {
                  await persistUpdate(() => updateDayShift(day.id, { name: day.nombre || 'Día', weekday: day.dia_semana || 1, start: day.hora_inicio || '08:00', end: event.target.value, crossesMidnight: Boolean(day.cruza_medianoche) }), 'Hora de fin actualizada en Supabase')
                }} />
                <button type="button" className="delete-button" title="Eliminar día" onClick={() => persistUpdate(() => deleteDayShift(day.id), 'Día de turno eliminado de Supabase')}><X size={14} /></button>
              </div>
            ))}
            <button type="button" className="config-add" onClick={() => persistUpdate(() => createDayShift({ typeId: data.shiftTypes?.[0]?.id || null, name: 'Nuevo día', weekday: 1, start: '08:00', end: '18:00', crossesMidnight: false }), 'Día de turno creado en Supabase')}><Plus size={15} /> Agregar día</button>
          </section>
        </div>
      </>}

      {tab === 'accounts' && <>
        <div className="config-two-columns">
          <div className="config-list">
            <div className="config-list-head"><h3>Titulares</h3><span>{draft.accounts.holders.length} elementos</span></div>
            {draft.accounts.holders.map((holder, index) => (
              <div className="config-list-row" key={`holder-row-${index}`} draggable onDragStart={() => setDragState({ type: 'holders', index })} onDragOver={(event) => event.preventDefault()} onDrop={async () => { await reorderAccountEntries('holders', dragState.index, index); setDragState({ type: null, index: null }) }} onDragEnd={() => setDragState({ type: null, index: null })}>
                <span className="drag-handle" title="Reordenar"><GripVertical size={14} /></span>
                <input value={holder} onChange={(event) => {
                  const next = [...draft.accounts.holders]
                  next[index] = event.target.value
                  updateAccounts({ holders: next })
                }} onBlur={async (event) => {
                  const value = event.target.value.trim()
                  if (!value) return
                  const target = data.holders.find(item => item.nombre === holder)
                  if (!target) {
                    const created = await createHolder({ name: value })
                    if (created) {
                      const next = [...draft.accounts.holders]
                      next[index] = created.nombre
                      updateAccounts({ holders: next })
                    }
                    return
                  }
                  await persistUpdate(() => updateHolder(target.id, { name: value, orderNum: index + 1 }), 'Titular actualizado')
                }} placeholder="Nombre del titular" />
                <button type="button" className="delete-button" title="Eliminar titular" onClick={async () => {
                  const current = data.holders.find(item => item.nombre === holder)
                  if (!current) return
                  await persistUpdate(async () => {
                    await deleteHolder(current.id)
                    updateAccounts({ holders: draft.accounts.holders.filter((_, itemIndex) => itemIndex !== index) })
                  }, 'Titular desactivado')
                }}><X size={14} /></button>
              </div>
            ))}
            <button type="button" className="config-add" onClick={async () => {
              await persistUpdate(async () => {
                const created = await createHolder({ name: 'Nuevo titular' })
                updateAccounts({ holders: [...draft.accounts.holders, created.nombre] })
              }, 'Titular creado')
            }}><Plus size={15} /> Agregar titular</button>
          </div>

          <div className="config-list">
            <div className="config-list-head"><h3>Billeteras</h3><span>{draft.accounts.wallets.length} elementos</span></div>
            {draft.accounts.wallets.map((wallet, index) => (
              <div className="wallet-config-row" key={`wallet-row-${index}`} draggable onDragStart={() => setDragState({ type: 'wallets', index })} onDragOver={(event) => event.preventDefault()} onDrop={async () => { await reorderAccountEntries('wallets', dragState.index, index); setDragState({ type: null, index: null }) }} onDragEnd={() => setDragState({ type: null, index: null })}>
                <span className="drag-handle" title="Reordenar"><GripVertical size={14} /></span>
                <input value={wallet} onChange={(event) => {
                  const next = [...draft.accounts.wallets]
                  next[index] = event.target.value
                  updateAccounts({ wallets: next })
                }} onBlur={async (event) => {
                  const value = event.target.value.trim()
                  if (!value) return
                  const target = data.wallets.find(item => item.nombre === wallet)
                  if (!target) {
                    const created = await createWallet({ name: value, typeName: draft.accounts.walletModes?.[wallet] || 'Cobros y retiros' })
                    if (created) {
                      const next = [...draft.accounts.wallets]
                      next[index] = created.nombre
                      updateAccounts({ wallets: next })
                    }
                    return
                  }
                  await persistUpdate(() => updateWallet(target.id, { name: value, typeName: draft.accounts.walletModes?.[wallet] || 'Cobros y retiros', orderNum: index + 1 }), 'Billetera actualizada')
                }} placeholder="Nombre de billetera" />
                <select value={draft.accounts.walletModes?.[wallet] || 'Cobros + Retiros'} onChange={async (event) => {
                  const nextMode = event.target.value
                  updateAccounts({ walletModes: { ...(draft.accounts.walletModes || {}), [wallet]: nextMode } })
                  const target = data.wallets.find(item => item.nombre === wallet)
                  if (target) {
                    await persistUpdate(() => updateWallet(target.id, { name: wallet, typeName: nextMode === 'Cobros + Retiros' ? 'Cobros y retiros' : nextMode === 'Solo Cobros' ? 'Cobros' : 'Depósito' }), 'Modo de billetera actualizado en Supabase')
                  }
                }}>
                  <option>Cobros + Retiros</option>
                  <option>Solo Cobros</option>
                  <option>Solo Depósito</option>
                </select>
                <button type="button" className="delete-button" title="Eliminar billetera" onClick={async () => {
                  const current = data.wallets.find(item => item.nombre === wallet)
                  if (!current) return
                  await persistUpdate(async () => {
                    await deleteWallet(current.id)
                    updateAccounts({ wallets: draft.accounts.wallets.filter((_, itemIndex) => itemIndex !== index) })
                  }, 'Billetera desactivada')
                }}><X size={14} /></button>
              </div>
            ))}
            <button type="button" className="config-add" onClick={async () => {
              await persistUpdate(async () => {
                const created = await createWallet({ name: 'Nueva billetera', typeName: 'Cobros y retiros' })
                updateAccounts({ wallets: [...draft.accounts.wallets, created.nombre] })
              }, 'Billetera creada')
            }}><Plus size={15} /> Agregar billetera</button>
          </div>
        </div>

        <section className="config-card matrix-config-card">
          <div className="config-list-head"><h3>Cuentas</h3><span>Activá y configurá cada cuenta</span></div>
          <div className="availability-table">
            <div className="availability-row availability-head" style={{ '--wallet-count': draft.accounts.wallets.length }}>
              <b>Titular</b>
              {draft.accounts.wallets.map((wallet) => <span key={wallet}>{wallet || 'Sin billetera'}</span>)}
            </div>
            {accountEntryRows}
          </div>
        </section>
      </>}

      {tab === 'expenses' && <section className="config-card">
        <div className="config-list-head"><h3>Opciones del selector</h3><span>{draft.expenses.length} categorías</span></div>
        {draft.expenses.map((expense, index) => (
          <div className="config-list-row" key={expense.id || `expense-${index}`}>
            <input value={expense.name} onChange={(event) => setDraft((current) => ({ ...current, expenses: current.expenses.map((item, itemIndex) => itemIndex === index ? { ...item, name: event.target.value } : item) }))} onBlur={async (event) => {
              const value = event.target.value.trim()
              if (!value || !data.expenseTypes.find(item => item.nombre === expense.name)) return
              const target = data.expenseTypes.find(item => item.nombre === expense.name)
              await persistUpdate(() => updateExpenseType(target.id, { name: value, inverted: expense.inverted }), 'Tipo de gasto actualizado en Supabase')
            }} placeholder="Nombre del gasto" />
            <label className="toggle-cell" aria-label={`Invertir signo para ${expense.name}`}>
              <input type="checkbox" checked={expense.inverted} onChange={async () => {
                setDraft((current) => ({ ...current, expenses: current.expenses.map((item, itemIndex) => itemIndex === index ? { ...item, inverted: !item.inverted } : item) }))
                const target = data.expenseTypes.find(item => item.nombre === expense.name)
                if (target) {
                  await persistUpdate(() => updateExpenseType(target.id, { name: expense.name, inverted: !expense.inverted }), 'Regla de signo guardada en Supabase')
                }
              }} />
              <span />
            </label>
            <button type="button" className="delete-button" title="Eliminar gasto" onClick={async () => {
              const target = data.expenseTypes.find(item => item.nombre === expense.name)
              if (!target) return
              await persistUpdate(() => deleteExpenseType(target.id), 'Tipo de gasto eliminado de Supabase')
            }}><X size={14} /></button>
          </div>
        ))}
        <button type="button" className="config-add" onClick={async () => {
          await persistUpdate(() => createExpenseType({ name: 'Nueva categoría', inverted: false }), 'Categoría creada en Supabase')
        }}><Plus size={15} /> Agregar categoría</button>
      </section>}

      {tab === 'platforms' && <section className="config-card">
        <div className="config-list-head"><h3>Plataformas</h3><span>{draft.platforms.length} elementos</span></div>
        {draft.platforms.map((platform, index) => (
          <div className="config-list-row" key={`${platform}-${index}`}>
            <input value={platform} onChange={(event) => setDraft((current) => ({ ...current, platforms: current.platforms.map((item, itemIndex) => itemIndex === index ? event.target.value : item) }))} onBlur={async (event) => {
              const value = event.target.value.trim()
              const target = data.platforms.find(item => item.nombre === platform)
              if (!value || !target) return
              await persistUpdate(() => updatePlatform(target.id, { name: value, color: draft.platformColors?.[platform] || 'teal' }), 'Plataforma actualizada en Supabase')
            }} placeholder="Nombre de plataforma" />
            <select value={draft.platformColors?.[platform] || 'teal'} onChange={async (event) => {
              const nextColor = event.target.value
              setDraft((current) => ({ ...current, platformColors: { ...(current.platformColors || {}), [platform]: nextColor } }))
              const target = data.platforms.find(item => item.nombre === platform)
              if (target) await persistUpdate(() => updatePlatform(target.id, { name: platform, color: nextColor }), 'Color de plataforma guardado en Supabase')
            }}>
              <option value="teal">Turquesa</option>
              <option value="blue">Azul</option>
              <option value="green">Verde</option>
              <option value="orange">Naranja</option>
              <option value="pink">Rosa</option>
              <option value="red">Rojo</option>
              <option value="yellow">Amarillo</option>
              <option value="violet">Violeta</option>
            </select>
            <button type="button" className="delete-button" title="Eliminar plataforma" onClick={async () => {
              const target = data.platforms.find(item => item.nombre === platform)
              if (!target) return
              await persistUpdate(() => deletePlatform(target.id), 'Plataforma eliminada de Supabase')
            }}><X size={14} /></button>
          </div>
        ))}
        <button type="button" className="config-add" onClick={async () => {
          const boxId = data.boxes?.[0]?.id || null
          await persistUpdate(() => createPlatform({ name: 'Nueva plataforma', color: 'teal', boxId }), 'Plataforma creada en Supabase')
        }}><Plus size={15} /> Agregar plataforma</button>
      </section>}

      {tab === 'account-types' && <>
        <section className="config-card">
          <div className="config-list-head"><h3>Tipos de cuenta</h3><span>{(data.accountTypes || []).length} registros</span></div>
          {(data.accountTypes || []).map((type) => (
            <div className="config-list-row" key={type.id} style={{ display: 'grid', gridTemplateColumns: '1.3fr auto auto auto auto auto auto', gap: '8px', alignItems: 'center' }}>
              <input value={type.nombre || ''} onChange={async (event) => {
                const next = event.target.value.trim()
                if (!next) return
                await persistUpdate(() => updateAccountType(type.id, {
                  name: next,
                  shared: Boolean(type.es_compartido),
                  advertising: Boolean(type.es_publicidad),
                  saving: Boolean(type.ahorro),
                  canCollect: Boolean(type.cobros),
                  canWithdraw: Boolean(type.retiros),
                }), 'Tipo de cuenta actualizado en Supabase')
              }} placeholder="Nombre del tipo" />
              <label className="toggle-cell" title="Compartida"><input type="checkbox" checked={Boolean(type.es_compartido)} onChange={async () => persistUpdate(() => updateAccountType(type.id, { name: type.nombre || 'Tipo', shared: !Boolean(type.es_compartido), advertising: Boolean(type.es_publicidad), saving: Boolean(type.ahorro), canCollect: Boolean(type.cobros), canWithdraw: Boolean(type.retiros) }), 'Config de tipo de cuenta guardada')} /><span /></label>
              <label className="toggle-cell" title="Publicidad"><input type="checkbox" checked={Boolean(type.es_publicidad)} onChange={async () => persistUpdate(() => updateAccountType(type.id, { name: type.nombre || 'Tipo', shared: Boolean(type.es_compartido), advertising: !Boolean(type.es_publicidad), saving: Boolean(type.ahorro), canCollect: Boolean(type.cobros), canWithdraw: Boolean(type.retiros) }), 'Config de tipo de cuenta guardada')} /><span /></label>
              <label className="toggle-cell" title="Ahorro"><input type="checkbox" checked={Boolean(type.ahorro)} onChange={async () => persistUpdate(() => updateAccountType(type.id, { name: type.nombre || 'Tipo', shared: Boolean(type.es_compartido), advertising: Boolean(type.es_publicidad), saving: !Boolean(type.ahorro), canCollect: Boolean(type.cobros), canWithdraw: Boolean(type.retiros) }), 'Config de tipo de cuenta guardada')} /><span /></label>
              <label className="toggle-cell" title="Cobros"><input type="checkbox" checked={Boolean(type.cobros)} onChange={async () => persistUpdate(() => updateAccountType(type.id, { name: type.nombre || 'Tipo', shared: Boolean(type.es_compartido), advertising: Boolean(type.es_publicidad), saving: Boolean(type.ahorro), canCollect: !Boolean(type.cobros), canWithdraw: Boolean(type.retiros) }), 'Config de tipo de cuenta guardada')} /><span /></label>
              <label className="toggle-cell" title="Retiros"><input type="checkbox" checked={Boolean(type.retiros)} onChange={async () => persistUpdate(() => updateAccountType(type.id, { name: type.nombre || 'Tipo', shared: Boolean(type.es_compartido), advertising: Boolean(type.es_publicidad), saving: Boolean(type.ahorro), canCollect: Boolean(type.cobros), canWithdraw: !Boolean(type.retiros) }), 'Config de tipo de cuenta guardada')} /><span /></label>
              <button type="button" className="delete-button" title="Eliminar tipo de cuenta" onClick={() => persistUpdate(() => deleteAccountType(type.id), 'Tipo de cuenta eliminado de Supabase')}><X size={14} /></button>
            </div>
          ))}
          <button type="button" className="config-add" onClick={() => persistUpdate(() => createAccountType({ name: 'Nuevo tipo de cuenta', shared: false, advertising: false, saving: false, canCollect: true, canWithdraw: true }), 'Tipo de cuenta creado en Supabase')}><Plus size={15} /> Agregar tipo de cuenta</button>
        </section>
      </>}

      {tab === 'users' && <>
        <section className="config-card">
          <div className="config-list-head"><h3>Usuarios</h3><span>{(data.users || []).length} registros</span></div>
          {(data.users || []).length ? (data.users || []).slice(0, 12).map((user) => (
            <div className="config-list-row" key={user.id}>
              <span>{user.nombres_usuario?.[0]?.nombre || `Usuario #${user.id}`}</span>
              <small className="muted-copy">{user.bloqueado ? 'Bloqueado' : 'Activo'}</small>
            </div>
          )) : <div className="empty-inline-block">No hay usuarios activos en Supabase.</div>}
        </section>
      </>}

      {tab === 'bonuses' && <>
        <div className="config-two-columns">
          <section className="config-card">
            <div className="config-list-head"><h3>Condiciones de bono</h3><span>{draft.bonusConditions.length} elementos</span></div>
            {draft.bonusConditions.map((condition, index) => (
              <div className="config-list-row" key={condition.id || index}>
                <input value={condition.label} onChange={(event) => setDraft((current) => ({ ...current, bonusConditions: current.bonusConditions.map((item, itemIndex) => itemIndex === index ? { ...item, label: event.target.value } : item) }))} onBlur={async (event) => {
                  const value = event.target.value.trim()
                  const target = data.bonusConditions?.find(item => item.nombre === condition.label)
                  if (!value || !target) return
                  await persistUpdate(() => updateBonusCondition(target.id, { name: value, platform: condition.allow }), 'Condición de bono guardada en Supabase')
                }} placeholder="Etiqueta" />
                <label className="toggle-cell" aria-label={`Habilitar ${condition.label}`}>
                  <input type="checkbox" checked={condition.allow} onChange={async () => {
                    setDraft((current) => ({ ...current, bonusConditions: current.bonusConditions.map((item, itemIndex) => itemIndex === index ? { ...item, allow: !item.allow } : item) }))
                    const target = data.bonusConditions?.find(item => item.nombre === condition.label)
                    if (target) await persistUpdate(() => updateBonusCondition(target.id, { name: condition.label, platform: !condition.allow }), 'Condición de bono actualizada en Supabase')
                  }} />
                  <span />
                </label>
                <button type="button" className="delete-button" title="Eliminar condición" onClick={async () => {
                  const target = data.bonusConditions?.find(item => item.nombre === condition.label)
                  if (!target) return
                  await persistUpdate(() => deleteBonusCondition(target.id), 'Condición de bono eliminada de Supabase')
                }}><X size={14} /></button>
              </div>
            ))}
            <button type="button" className="config-add" onClick={async () => {
              await persistUpdate(() => createBonusCondition({ name: 'Nueva condición', platform: true }), 'Condición creada en Supabase')
            }}><Plus size={15} /> Agregar condición</button>
          </section>
        </div>
      </>}

      {tab === 'app' && <>
        <section className="config-card">
          <div className="config-list-head"><h3>Configuración de la aplicación</h3><span>Único registro activo</span></div>
          <div className="account-settings-fields">
            <label><span>Nombre</span><input value={(data.appConfig?.[0]?.nombre) || 'Caja Europa'} onChange={async (event) => {
              const next = event.target.value.trim()
              if (!next) return
              await persistUpdate(() => saveAppConfig({ name: next, icon: data.appConfig?.[0]?.icono || 'banknote', theme: Boolean(data.appConfig?.[0]?.tema), showNotes: Boolean(data.appConfig?.[0]?.ver_notas), singleton: Boolean(data.appConfig?.[0]?.singleton) }), 'Configuración de la app guardada en Supabase')
            }} /></label>
            <label><span>Ícono</span><input value={(data.appConfig?.[0]?.icono) || 'banknote'} onChange={async (event) => {
              const next = event.target.value.trim()
              if (!next) return
              await persistUpdate(() => saveAppConfig({ name: data.appConfig?.[0]?.nombre || 'Caja Europa', icon: next, theme: Boolean(data.appConfig?.[0]?.tema), showNotes: Boolean(data.appConfig?.[0]?.ver_notas), singleton: Boolean(data.appConfig?.[0]?.singleton) }), 'Ícono actualizado en Supabase')
            }} /></label>
            <label className="toggle-cell" aria-label="Tema oscuro"><span>Tema</span><input type="checkbox" checked={Boolean(data.appConfig?.[0]?.tema)} onChange={async () => persistUpdate(() => saveAppConfig({ name: data.appConfig?.[0]?.nombre || 'Caja Europa', icon: data.appConfig?.[0]?.icono || 'banknote', theme: !Boolean(data.appConfig?.[0]?.tema), showNotes: Boolean(data.appConfig?.[0]?.ver_notas), singleton: Boolean(data.appConfig?.[0]?.singleton) }), 'Tema actualizado')} /></label>
            <label className="toggle-cell" aria-label="Ver notas"><span>Ver notas</span><input type="checkbox" checked={Boolean(data.appConfig?.[0]?.ver_notas !== false)} onChange={async () => persistUpdate(() => saveAppConfig({ name: data.appConfig?.[0]?.nombre || 'Caja Europa', icon: data.appConfig?.[0]?.icono || 'banknote', theme: Boolean(data.appConfig?.[0]?.tema), showNotes: !Boolean(data.appConfig?.[0]?.ver_notas !== false), singleton: Boolean(data.appConfig?.[0]?.singleton) }), 'Configuración visual guardada')} /></label>
            <label className="toggle-cell" aria-label="Singleton"><span>Singleton</span><input type="checkbox" checked={Boolean(data.appConfig?.[0]?.singleton !== false)} onChange={async () => persistUpdate(() => saveAppConfig({ name: data.appConfig?.[0]?.nombre || 'Caja Europa', icon: data.appConfig?.[0]?.icono || 'banknote', theme: Boolean(data.appConfig?.[0]?.tema), showNotes: Boolean(data.appConfig?.[0]?.ver_notas !== false), singleton: !Boolean(data.appConfig?.[0]?.singleton !== false) }), 'Configuración singleton guardada')} /></label>
          </div>
        </section>
      </>}

      {tab === 'goals' && <section className="config-card">
        <div className="config-list-head"><h3>Objetivos activos</h3><span>{(data.goals || []).length} registros</span></div>
        {(data.goals || []).length ? (data.goals || []).map((goal, index) => (
          <div className="config-list-row" key={`${goal.subobjetivos?.id || goal.id || index}`} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', alignItems: 'center' }}>
            <span><strong>Meta</strong><br />{money.format(Number(goal.objetivo_final_turno || goal.subobjetivos?.objetivo_final_dia || 0))}</span>
            <span><strong>Alcanzado</strong><br />{money.format(Number(goal.objetivo_alcanzado_turno || goal.subobjetivos?.objetivo_alcanzado_dia || 0))}</span>
            <span><strong>Nombre</strong><br />{goal.subobjetivos?.objetivos?.nombre || 'Objetivo'}</span>
          </div>
        )) : <div className="empty-inline-block">No hay objetivos activos en Supabase para este turno.</div>}
      </section>}

      {selected && (
        <div className="modal-backdrop" onClick={() => setSelected(null)}>
          <div className="modal account-settings-modal" onClick={(event) => event.stopPropagation()}>
            <button type="button" className="modal-close" onClick={() => setSelected(null)} title="Cerrar"><X size={18} /></button>
            <div className="modal-icon"><Settings2 size={21} /></div>
            <h2>{selected.holder} · {selected.wallet}</h2>
            <p>Datos del titular y la billetera para esta cuenta operativa.</p>
            <div className="account-settings-fields">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <label><span>Alias</span><input value={selected.alias || ''} onChange={(event) => setSelected((current) => ({ ...current, alias: event.target.value }))} /></label>
                <label><span>CUIL</span><input value={selected.cuil || ''} onChange={(event) => setSelected((current) => ({ ...current, cuil: event.target.value }))} /></label>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <label><span>Contraseña</span><input value={selected.password || ''} onChange={(event) => setSelected((current) => ({ ...current, password: event.target.value }))} /></label>
                <label><span>Tipo de cuenta</span>
                  <select value={selected.typeId || ''} onChange={(event) => setSelected((current) => ({ ...current, typeId: event.target.value }))}>
                    <option value="">Seleccionar</option>
                    {(data.accountTypes || []).map((type) => (
                      <option value={type.id} key={type.id}>{type.nombre}</option>
                    ))}
                  </select>
                </label>
              </div>
              <label className="account-settings-note"><span>Nota</span><textarea rows="4" value={selected.note || ''} onChange={(event) => setSelected((current) => ({ ...current, note: event.target.value }))} /></label>
            </div>
            <div className="modal-actions">
              <button type="button" className="close-button" onClick={saveAccountSettings}>Listo <Check size={16} /></button>
            </div>
          </div>
        </div>
      )}
    </div>
  </>
}

export default App
