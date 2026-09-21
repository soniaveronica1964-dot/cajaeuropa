import React, { useEffect, useMemo, useState } from 'react'
import {
  ArrowLeftRight,
  BarChart3,
  Banknote,
  Bell,
  Boxes,
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
  Menu,
  Plus,
  Search,
  Settings2,
  SlidersHorizontal,
  Sparkles,
  UserRound,
  Users,
  WalletCards,
  X,
} from 'lucide-react'
import { createBonusLine, createExpense, createInitialSetup, createTip, loadCurrentShiftData, updateAccountValue, updateAdvertisingLine, updateShiftRounding } from './lib/data'

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
        <button className="mobile-menu icon-button" aria-label="Abrir menú"><Menu size={18} /></button>
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
          <button className="icon-button" title="Notificaciones"><Bell size={17} /></button>
          <button className="lock-button" title="Bloquear caja"><LockKeyhole size={16} /></button>
        </div>
      </header>

      <div className="workspace">
        <aside className="sidebar">
          <p className="sidebar-label">Operación</p>
          {navItems.map(([id, label, Icon]) => <button key={id} className={`side-link ${view === id ? 'active' : ''}`} onClick={() => setView(id)}><Icon size={16} /><span>{label}</span>{id === 'bonuses' && appData && <b className="nav-count">{appData.bonuses.length}</b>}</button>)}
          <div className="sidebar-bottom"><p className="sidebar-label">Sesión activa</p><div className="operator"><span>MR</span><div><strong>Marina Ríos</strong><small>Operadora</small></div><ChevronDown size={14} /></div></div>
        </aside>

        <main className="main-content">
          <section className="page-heading">
            <div><span className="eyebrow">{shift ? `Turno iniciado · ${new Date(shift.fecha_hora_inicio).toLocaleString('es-AR')}` : 'Sin turno abierto'}</span><h1>{activeLabel === 'Caja' ? `${shiftName} / ${shiftTime}` : activeLabel}</h1><p>{shift ? new Date(shift.fecha_hora_inicio).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' }) : 'Seleccioná una caja con un turno abierto'} · {activeBox}</p></div>
            <div className="heading-actions">{navItems.slice(1, 6).map(([id, label, Icon]) => <button key={id} className={`icon-button ${view === id ? 'selected' : ''}`} title={label} onClick={() => setView(id)}><Icon size={17} /></button>)}</div>
          </section>

          {loadError && <div className="empty-state"><strong>Error al cargar Supabase</strong><p>{loadError}</p></div>}
          {!loadError && !appData && <div className="empty-state"><strong>Cargando datos</strong><p>Consultando el turno y la información operativa.</p></div>}
          {!loadError && appData && view === 'dashboard' && !appData.shift && <SetupWizard onCreated={reloadData} setToast={setToast} />}
          {!loadError && appData && view === 'dashboard' && appData.shift && <Dashboard data={appData} openGoal={openGoal} setOpenGoal={setOpenGoal} setToast={setToast} onSaved={reloadData} />}
          {!loadError && appData && view === 'stats' && <LiveStatistics data={appData} />}
          {!loadError && appData && view === 'logistics' && <LiveLogistics data={appData} setToast={setToast} />}
          {!loadError && appData && view === 'users' && <LiveUsersView users={appData.users} />}
          {!loadError && appData && view === 'bonuses' && <LiveBonuses bonuses={appData.bonuses} />}
          {!loadError && appData && view === 'settings' && <LiveSettings data={appData} setToast={setToast} />}
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

function LiveSettings({ data, setToast }) {
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
    const holdersFromData = buildUniqueItems(data.accounts || [], (account) => account.cuentas?.titulares || { id: account.cuenta_id, nombre: 'Sin titular' })
    const walletsFromData = buildUniqueItems(data.accounts || [], (account) => account.cuentas?.billeteras || { id: account.cuenta_id, nombre: 'Sin billetera' })
    const availability = {}
    holdersFromData.forEach((holder) => {
      const holderName = holder.nombre || 'Sin titular'
      availability[holderName] = {}
      walletsFromData.forEach((wallet) => {
        const walletName = wallet.nombre || 'Sin billetera'
        availability[holderName][walletName] = true
      })
    })

    return {
      boxes: (data.boxes || []).map((box) => ({ id: box.id, title: box.nombre || 'Caja', color: box.color_id || 'teal' })),
      accounts: {
        holders: holdersFromData.map((holder) => holder.nombre || 'Sin titular'),
        wallets: walletsFromData.map((wallet) => wallet.nombre || 'Sin billetera'),
        availability,
        walletModes: Object.fromEntries((walletsFromData.map((wallet) => [wallet.nombre || 'Sin billetera', 'Cobros + Retiros']))),
      },
      expenses: [
        { id: 'expense-1', name: 'Gasto operativo', inverted: false },
        { id: 'expense-2', name: 'Transferencia', inverted: false },
        { id: 'expense-3', name: 'Cuenta extra', inverted: true },
      ],
      platforms: ['Web', 'App', 'Local'],
      platformColors: { Web: 'teal', App: 'blue', Local: 'green' },
      platformEnabled: { Web: true, App: true, Local: true },
      userClarifications: [
        { id: 'clarification-1', text: 'Cliente con retiro previo', color: 'blue', emoji: '📌' },
        { id: 'clarification-2', text: 'Revisa saldo antes de cerrar', color: 'orange', emoji: '⚠️' },
      ],
      bonusTypes: [
        { id: 'bonus-type-1', name: 'Comisión', percentageCount: 1 },
        { id: 'bonus-type-2', name: 'Publicidad', percentageCount: 2 },
      ],
      bonusConditions: [
        { id: 'bonus-condition-1', label: 'Cobro del día', allow: true },
        { id: 'bonus-condition-2', label: 'Cliente recurrente', allow: false },
      ],
      monthlyGoal: { final: 0, achieved: 0 },
      bonusGoal: { total: 0, percentages: { Noche: 33, Mañana: 33, Tarde: 34 } },
      savingsGoal: { total: 0, shifts: { Noche: 0, Mañana: 0, Tarde: 0 } },
      branding: { icon: 'banknote', suffix: 'flow' },
    }
  }, [data.accounts, data.boxes])

  const [tab, setTab] = useState('accounts')
  const [draft, setDraft] = useState(buildDefaultConfig)
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    setDraft(buildDefaultConfig)
  }, [buildDefaultConfig])

  const updateAccounts = (patch) => {
    setDraft((current) => ({ ...current, accounts: { ...current.accounts, ...patch } }))
  }

  const toggleWallet = (holderName, walletName) => {
    setDraft((current) => ({
      ...current,
      accounts: {
        ...current.accounts,
        availability: {
          ...(current.accounts.availability || {}),
          [holderName]: {
            ...((current.accounts.availability || {})[holderName] || {}),
            [walletName]: !(((current.accounts.availability || {})[holderName] || {})[walletName] ?? true),
          },
        },
      },
    }))
  }

  const buildTargetSetting = (holderName, walletName) => ({
    holder: holderName,
    wallet: walletName,
    category: 'Normal',
    alias: `${holderName} · ${walletName}`,
    cuil: '',
    password: '',
    note: '',
  })

  const renderTabButton = (id, label, Icon) => (
    <button key={id} type="button" className={tab === id ? 'active' : ''} onClick={() => setTab(id)}><Icon size={15} /> {label}</button>
  )

  const accountEntryRows = draft.accounts.holders.map((holder) => {
    const holderName = holder || 'Sin titular'
    return <div key={holderName} className="availability-row" style={{ '--wallet-count': draft.accounts.wallets.length }}>
      <b>{holderName}</b>
      {draft.accounts.wallets.map((wallet) => {
        const walletName = wallet || 'Sin billetera'
        const enabled = draft.accounts.availability?.[holderName]?.[walletName] !== false
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
        {renderTabButton('accounts', 'Matriz de cuentas', WalletCards)}
        {renderTabButton('expenses', 'Gastos', FileText)}
        {renderTabButton('platforms', 'Control de fichas', Boxes)}
        {renderTabButton('users', 'Usuarios', Users)}
        {renderTabButton('bonuses', 'Bonos', Gift)}
        {renderTabButton('goals', 'Objetivos', Target)}
      </div>

      <section className="settings-intro">
        <span className="eyebrow">Configuración</span>
        <h2>{tab === 'boxes' ? 'Cajas' : tab === 'accounts' ? 'Matriz de cuentas' : tab === 'expenses' ? 'Gastos' : tab === 'platforms' ? 'Control de fichas' : tab === 'users' ? 'Usuarios' : tab === 'bonuses' ? 'Bonos' : 'Objetivos'}</h2>
        <p>Completá la configuración del turno y dejá listo el entorno para operar con cajas, cuentas, plataformas y objetivos.</p>
      </section>

      {tab === 'boxes' && <>
        <div className="config-two-columns">
          <div className="config-list">
            <div className="config-list-head"><h3>Mis cajas</h3><span>{draft.boxes.length} espacios</span></div>
            {draft.boxes.map((box, index) => (
              <div className="config-list-row" key={box.id || index}>
                <input value={box.title} onChange={(event) => setDraft((current) => ({ ...current, boxes: current.boxes.map((item, itemIndex) => itemIndex === index ? { ...item, title: event.target.value } : item) }))} />
                <select value={box.color} onChange={(event) => setDraft((current) => ({ ...current, boxes: current.boxes.map((item, itemIndex) => itemIndex === index ? { ...item, color: event.target.value } : item) }))}>
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
                <button type="button" className="delete-button" title="Eliminar caja" onClick={() => setDraft((current) => ({ ...current, boxes: current.boxes.filter((_, itemIndex) => itemIndex !== index) }))}><X size={14} /></button>
              </div>
            ))}
            <button type="button" className="config-add" onClick={() => setDraft((current) => ({ ...current, boxes: [...current.boxes, { id: `box-${Date.now()}`, title: 'Nueva caja', color: 'teal' }] }))}><Plus size={15} /> Agregar caja</button>
          </div>

          <div className="config-card">
            <div className="config-list-head"><h3>Marca de la caja</h3><span>Se guarda como etiqueta</span></div>
            <div className="config-list-row">
              <select value={draft.branding.icon} onChange={(event) => setDraft((current) => ({ ...current, branding: { ...current.branding, icon: event.target.value } }))}>
                <option value="banknote">Billete</option>
                <option value="wallet">Billetera</option>
                <option value="coins">Monedas</option>
                <option value="gift">Regalo</option>
                <option value="ticket">Ticket</option>
              </select>
            </div>
            <div className="config-list-row">
              <input value={draft.branding.suffix} onChange={(event) => setDraft((current) => ({ ...current, branding: { ...current.branding, suffix: event.target.value } }))} placeholder="Sufijo de marca" />
            </div>
          </div>
        </div>
      </>}

      {tab === 'accounts' && <>
        <div className="config-two-columns">
          <div className="config-list">
            <div className="config-list-head"><h3>Titulares</h3><span>{draft.accounts.holders.length} elementos</span></div>
            {draft.accounts.holders.map((holder, index) => (
              <div className="config-list-row" key={`${holder}-${index}`}>
                <input value={holder} onChange={(event) => {
                  const next = [...draft.accounts.holders]
                  next[index] = event.target.value
                  updateAccounts({ holders: next })
                }} placeholder="Nombre del titular" />
                <button type="button" className="delete-button" title="Eliminar titular" onClick={() => updateAccounts({ holders: draft.accounts.holders.filter((_, itemIndex) => itemIndex !== index) })}><X size={14} /></button>
              </div>
            ))}
            <button type="button" className="config-add" onClick={() => updateAccounts({ holders: [...draft.accounts.holders, 'Nuevo titular'] })}><Plus size={15} /> Agregar titular</button>
          </div>

          <div className="config-list">
            <div className="config-list-head"><h3>Billeteras</h3><span>{draft.accounts.wallets.length} elementos</span></div>
            {draft.accounts.wallets.map((wallet, index) => (
              <div className="wallet-config-row" key={`${wallet}-${index}`}>
                <span className="drag-handle" title="Reordenar"><GripVertical size={14} /></span>
                <input value={wallet} onChange={(event) => {
                  const next = [...draft.accounts.wallets]
                  next[index] = event.target.value
                  updateAccounts({ wallets: next })
                }} placeholder="Nombre de billetera" />
                <select value={draft.accounts.walletModes?.[wallet] || 'Cobros + Retiros'} onChange={(event) => updateAccounts({ walletModes: { ...(draft.accounts.walletModes || {}), [wallet]: event.target.value } })}>
                  <option>Cobros + Retiros</option>
                  <option>Solo Cobros</option>
                  <option>Solo Depósito</option>
                </select>
                <button type="button" className="delete-button" title="Eliminar billetera" onClick={() => updateAccounts({ wallets: draft.accounts.wallets.filter((_, itemIndex) => itemIndex !== index) })}><X size={14} /></button>
              </div>
            ))}
            <button type="button" className="config-add" onClick={() => updateAccounts({ wallets: [...draft.accounts.wallets, 'Nueva billetera'], walletModes: { ...(draft.accounts.walletModes || {}), ['Nueva billetera']: 'Cobros + Retiros' } })}><Plus size={15} /> Agregar billetera</button>
          </div>
        </div>

        <section className="config-card matrix-config-card">
          <div className="config-list-head"><h3>Billeteras utilizables por titular</h3><span>Activá y configurá cada cuenta</span></div>
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
            <input value={expense.name} onChange={(event) => setDraft((current) => ({ ...current, expenses: current.expenses.map((item, itemIndex) => itemIndex === index ? { ...item, name: event.target.value } : item) }))} placeholder="Nombre del gasto" />
            <label className="toggle-cell" aria-label={`Invertir signo para ${expense.name}`}>
              <input type="checkbox" checked={expense.inverted} onChange={() => setDraft((current) => ({ ...current, expenses: current.expenses.map((item, itemIndex) => itemIndex === index ? { ...item, inverted: !item.inverted } : item) }))} />
              <span />
            </label>
            <button type="button" className="delete-button" title="Eliminar gasto" onClick={() => setDraft((current) => ({ ...current, expenses: current.expenses.filter((_, itemIndex) => itemIndex !== index) }))}><X size={14} /></button>
          </div>
        ))}
        <button type="button" className="config-add" onClick={() => setDraft((current) => ({ ...current, expenses: [...current.expenses, { id: `expense-${Date.now()}`, name: 'Nueva categoría', inverted: false }] }))}><Plus size={15} /> Agregar categoría</button>
      </section>}

      {tab === 'platforms' && <section className="config-card">
        <div className="config-list-head"><h3>Plataformas</h3><span>{draft.platforms.length} elementos</span></div>
        {draft.platforms.map((platform, index) => (
          <div className="config-list-row" key={`${platform}-${index}`}>
            <input value={platform} onChange={(event) => setDraft((current) => ({ ...current, platforms: current.platforms.map((item, itemIndex) => itemIndex === index ? event.target.value : item) }))} placeholder="Nombre de plataforma" />
            <select value={draft.platformColors?.[platform] || 'teal'} onChange={(event) => setDraft((current) => ({ ...current, platformColors: { ...(current.platformColors || {}), [platform]: event.target.value } }))}>
              <option value="teal">Turquesa</option>
              <option value="blue">Azul</option>
              <option value="green">Verde</option>
              <option value="orange">Naranja</option>
              <option value="pink">Rosa</option>
              <option value="red">Rojo</option>
              <option value="yellow">Amarillo</option>
              <option value="violet">Violeta</option>
            </select>
            <button type="button" className="delete-button" title="Eliminar plataforma" onClick={() => setDraft((current) => ({ ...current, platforms: current.platforms.filter((_, itemIndex) => itemIndex !== index) }))}><X size={14} /></button>
          </div>
        ))}
        <button type="button" className="config-add" onClick={() => setDraft((current) => ({ ...current, platforms: [...current.platforms, 'Nueva plataforma'], platformColors: { ...(current.platformColors || {}), ['Nueva plataforma']: 'teal' } }))}><Plus size={15} /> Agregar plataforma</button>
      </section>}

      {tab === 'users' && <>
        <section className="config-card">
          <div className="config-list-head"><h3>Aclaraciones</h3><span>{draft.userClarifications.length} elementos</span></div>
          {draft.userClarifications.map((clarification, index) => (
            <div className="config-list-row" key={clarification.id || index}>
              <input value={clarification.text} onChange={(event) => setDraft((current) => ({ ...current, userClarifications: current.userClarifications.map((item, itemIndex) => itemIndex === index ? { ...item, text: event.target.value } : item) }))} placeholder="Texto aclaración" />
              <select value={clarification.color} onChange={(event) => setDraft((current) => ({ ...current, userClarifications: current.userClarifications.map((item, itemIndex) => itemIndex === index ? { ...item, color: event.target.value } : item) }))}>
                <option value="teal">Turquesa</option>
                <option value="blue">Azul</option>
                <option value="green">Verde</option>
                <option value="orange">Naranja</option>
                <option value="pink">Rosa</option>
                <option value="red">Rojo</option>
                <option value="yellow">Amarillo</option>
                <option value="violet">Violeta</option>
              </select>
              <input value={clarification.emoji || ''} maxLength={2} onChange={(event) => setDraft((current) => ({ ...current, userClarifications: current.userClarifications.map((item, itemIndex) => itemIndex === index ? { ...item, emoji: event.target.value } : item) }))} placeholder="🙂" />
              <button type="button" className="delete-button" title="Eliminar aclaración" onClick={() => setDraft((current) => ({ ...current, userClarifications: current.userClarifications.filter((_, itemIndex) => itemIndex !== index) }))}><X size={14} /></button>
            </div>
          ))}
          <button type="button" className="config-add" onClick={() => setDraft((current) => ({ ...current, userClarifications: [...current.userClarifications, { id: `clarification-${Date.now()}`, text: 'Nueva aclaración', color: 'blue', emoji: '•' }] }))}><Plus size={15} /> Agregar aclaración</button>
        </section>
      </>}

      {tab === 'bonuses' && <>
        <div className="config-two-columns">
          <section className="config-card">
            <div className="config-list-head"><h3>Tipos de bonos</h3><span>{draft.bonusTypes.length} elementos</span></div>
            {draft.bonusTypes.map((bonusType, index) => (
              <div className="config-list-row" key={bonusType.id || index}>
                <input value={bonusType.name} onChange={(event) => setDraft((current) => ({ ...current, bonusTypes: current.bonusTypes.map((item, itemIndex) => itemIndex === index ? { ...item, name: event.target.value } : item) }))} placeholder="Nombre del tipo" />
                <input type="number" min="1" max="20" value={bonusType.percentageCount || 1} onChange={(event) => setDraft((current) => ({ ...current, bonusTypes: current.bonusTypes.map((item, itemIndex) => itemIndex === index ? { ...item, percentageCount: Math.max(1, Math.min(20, Number(event.target.value) || 1)) } : item) }))} style={{ width: '84px' }} />
                <button type="button" className="delete-button" title="Eliminar tipo" onClick={() => setDraft((current) => ({ ...current, bonusTypes: current.bonusTypes.filter((_, itemIndex) => itemIndex !== index) }))}><X size={14} /></button>
              </div>
            ))}
            <button type="button" className="config-add" onClick={() => setDraft((current) => ({ ...current, bonusTypes: [...current.bonusTypes, { id: `bonus-type-${Date.now()}`, name: 'Nuevo tipo', percentageCount: 1 }] }))}><Plus size={15} /> Agregar tipo</button>
          </section>

          <section className="config-card">
            <div className="config-list-head"><h3>Condiciones de bono</h3><span>{draft.bonusConditions.length} elementos</span></div>
            {draft.bonusConditions.map((condition, index) => (
              <div className="config-list-row" key={condition.id || index}>
                <input value={condition.label} onChange={(event) => setDraft((current) => ({ ...current, bonusConditions: current.bonusConditions.map((item, itemIndex) => itemIndex === index ? { ...item, label: event.target.value } : item) }))} placeholder="Etiqueta" />
                <label className="toggle-cell" aria-label={`Habilitar ${condition.label}`}>
                  <input type="checkbox" checked={condition.allow} onChange={() => setDraft((current) => ({ ...current, bonusConditions: current.bonusConditions.map((item, itemIndex) => itemIndex === index ? { ...item, allow: !item.allow } : item) }))} />
                  <span />
                </label>
                <button type="button" className="delete-button" title="Eliminar condición" onClick={() => setDraft((current) => ({ ...current, bonusConditions: current.bonusConditions.filter((_, itemIndex) => itemIndex !== index) }))}><X size={14} /></button>
              </div>
            ))}
            <button type="button" className="config-add" onClick={() => setDraft((current) => ({ ...current, bonusConditions: [...current.bonusConditions, { id: `bonus-condition-${Date.now()}`, label: 'Nueva condición', allow: true }] }))}><Plus size={15} /> Agregar condición</button>
          </section>
        </div>
      </>}

      {tab === 'goals' && <>
        <div className="config-two-columns">
          <section className="config-card">
            <div className="config-list-head"><h3>Objetivo de depósitos</h3><span>Meta mensual</span></div>
            <div className="config-list-row">
              <label style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '6px', color: 'var(--muted)', fontSize: '11px' }}>
                <span>Objetivo final</span>
                <input type="number" value={draft.monthlyGoal.final} onChange={(event) => setDraft((current) => ({ ...current, monthlyGoal: { ...current.monthlyGoal, final: Number(event.target.value) || 0 } }))} />
              </label>
            </div>
            <div className="config-list-row">
              <label style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '6px', color: 'var(--muted)', fontSize: '11px' }}>
                <span>Objetivo alcanzado</span>
                <input type="number" value={draft.monthlyGoal.achieved} onChange={(event) => setDraft((current) => ({ ...current, monthlyGoal: { ...current.monthlyGoal, achieved: Number(event.target.value) || 0 } }))} />
              </label>
            </div>
          </section>

          <section className="config-card">
            <div className="config-list-head"><h3>Objetivos de bonos</h3><span>Por turno</span></div>
            <div className="config-list-row">
              <label style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '6px', color: 'var(--muted)', fontSize: '11px' }}>
                <span>Meta total</span>
                <input type="number" value={draft.bonusGoal.total} onChange={(event) => setDraft((current) => ({ ...current, bonusGoal: { ...current.bonusGoal, total: Number(event.target.value) || 0 } }))} />
              </label>
            </div>
            {Object.entries(draft.bonusGoal.percentages || {}).map(([shift, value]) => (
              <div className="config-list-row" key={shift}>
                <label style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '6px', color: 'var(--muted)', fontSize: '11px' }}>
                  <span>{shift}</span>
                  <input type="number" min="0" max="100" value={value} onChange={(event) => setDraft((current) => ({ ...current, bonusGoal: { ...current.bonusGoal, percentages: { ...(current.bonusGoal.percentages || {}), [shift]: Math.max(0, Math.min(100, Number(event.target.value) || 0)) } } }))} />
                </label>
              </div>
            ))}
          </section>
        </div>

        <section className="config-card">
          <div className="config-list-head"><h3>Objetivo de ahorro</h3><span>Meta mensual por turno</span></div>
          <div className="config-list-row">
            <label style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '6px', color: 'var(--muted)', fontSize: '11px' }}>
              <span>Meta total</span>
              <input type="number" value={draft.savingsGoal.total} onChange={(event) => setDraft((current) => ({ ...current, savingsGoal: { ...current.savingsGoal, total: Number(event.target.value) || 0 } }))} />
            </label>
          </div>
          {Object.entries(draft.savingsGoal.shifts || {}).map(([shift, value]) => (
            <div className="config-list-row" key={shift}>
              <label style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '6px', color: 'var(--muted)', fontSize: '11px' }}>
                <span>{shift}</span>
                <input type="number" value={value} onChange={(event) => setDraft((current) => ({ ...current, savingsGoal: { ...current.savingsGoal, shifts: { ...(current.savingsGoal.shifts || {}), [shift]: Number(event.target.value) || 0 } } }))} />
              </label>
            </div>
          ))}
        </section>
      </>}

      {selected && (
        <div className="modal-backdrop" onClick={() => setSelected(null)}>
          <div className="modal account-settings-modal" onClick={(event) => event.stopPropagation()}>
            <button type="button" className="modal-close" onClick={() => setSelected(null)} title="Cerrar"><X size={18} /></button>
            <div className="modal-icon"><Settings2 size={21} /></div>
            <h2>{selected.holder} · {selected.wallet}</h2>
            <p>Datos del titular y la billetera para esta cuenta operativa.</p>
            <div className="account-settings-fields">
              <label><span>Alias</span><input value={selected.alias} onChange={() => setSelected((current) => ({ ...current, alias: event.target.value }))} /></label>
              <label><span>CUIL</span><input value={selected.cuil} onChange={() => setSelected((current) => ({ ...current, cuil: event.target.value }))} /></label>
              <label><span>Contraseña</span><input value={selected.password} onChange={() => setSelected((current) => ({ ...current, password: event.target.value }))} /></label>
              <label><span>Tipo de billetera</span>
                <select value={selected.category} onChange={(event) => setSelected((current) => ({ ...current, category: event.target.value }))}>
                  <option>Normal</option>
                  <option>Depósitos</option>
                  <option>Compartidas</option>
                  <option>Ahorro</option>
                </select>
              </label>
              <label className="account-settings-note"><span>Nota</span><textarea rows="4" value={selected.note} onChange={(event) => setSelected((current) => ({ ...current, note: event.target.value }))} /></label>
            </div>
            <div className="modal-actions">
              <button type="button" className="close-button" onClick={() => setSelected(null)}>Listo <Check size={16} /></button>
            </div>
          </div>
        </div>
      )}
    </div>
  </>
}

export default App
