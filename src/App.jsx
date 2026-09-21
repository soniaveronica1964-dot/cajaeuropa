import React, { useEffect, useState } from 'react'
import {
  ArrowLeftRight,
  BarChart3,
  Banknote,
  Bell,
  Boxes,
  ChevronDown,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  Copy,
  Eye,
  FileText,
  Gift,
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
import { loadCurrentShiftData, updateAccountValue, updateAdvertisingLine, updateShiftRounding } from './lib/data'

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
  const activeBox = shift?.cajas?.nombre ?? 'Sin caja'

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
          <div className="box-select"><small>CAJA</small><strong>{activeBox}</strong><span className="box-dot" /></div>
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
          {!loadError && appData && view === 'dashboard' && <Dashboard data={appData} openGoal={openGoal} setOpenGoal={setOpenGoal} setToast={setToast} />}
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
function Goal({ label, current, target, percent }) { return <div className="goal-row"><strong>Obj. {label}</strong><i><em style={{ width: `${percent}%` }} /></i><b>{percent}%</b><small>{money.format(current)} <span>/</span> {money.format(target)}</small></div> }

function mapGoals(rows) {
  return rows.map(row => {
    const target = Number(row.objetivo_final_turno || row.subobjetivos?.objetivo_final_dia || row.subobjetivos?.objetivos?.objetivo_final || 0)
    const current = Number(row.objetivo_alcanzado_turno || row.subobjetivos?.objetivo_alcanzado_dia || row.subobjetivos?.objetivos?.objetivo_alcanzado || 0)
    return { label: row.subobjetivos?.objetivos?.nombre || 'Objetivo', current, target, percent: target ? Math.min(100, Math.round((current / target) * 100)) : 0 }
  })
}

function Dashboard({ data, openGoal, setOpenGoal, setToast }) {
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
    <section className="summary-bar"><div className="summary-status"><span className="eyebrow">Resumen</span><b><i /> {data.shift.abierto ? 'ABIERTA' : 'CERRADA'}</b></div><Metric label="Caja inicial" value={money.format(data.shift.caja_inicial)} tone="positive" /><Metric label="Caja final" value={data.shift.caja_final == null ? 'Sin cierre' : money.format(data.shift.caja_final)} tone="positive" /><Metric label="Propinas" value={money.format(tipsTotal)} tone="positive" /><Metric label="Gastos" value={money.format(expensesTotal)} tone="negative" /><Metric label="Bonos netos" value={money.format(bonusTotal)} tone="positive" /><label className="rounding"><small>Redondeo</small><span>$<input value={rounding === '' ? data.shift.redondeo : rounding} onChange={(event) => setRounding(event.target.value)} onBlur={() => updateShiftRounding(data.shift.id, rounding).catch(() => setToast('No se pudo guardar el redondeo'))} /></span></label></section>
    <div className="dashboard-grid">
      <div className="dashboard-main">
        <div className="top-panels"><Publicity rows={data.advertising} setToast={setToast} /><BonusSummary rows={data.bonuses} /><ChipSummary chips={data.chips} /></div>
        <AccountMatrix accounts={accounts} holders={accountHolders} wallets={accountWallets} total={total} setToast={setToast} />
        <div className="three-panels"><LogisticsCard rows={data.logistics} /><StatusCard /><UsersCard users={data.users} /></div>
        <div className="three-panels lower"><MovementCard title="Gastos" icon={FileText} amount={expensesTotal} rows={data.expenses} /><MovementCard title="Propinas" icon={CircleDollarSign} amount={tipsTotal} rows={data.tips} /><BonusList rows={data.bonuses} /></div>
      </div>
    </div>
  </>
}
function Metric({ label, value, tone = '' }) { return <div className="metric"><small>{label}</small><strong className={tone}>{value}</strong></div> }
function Publicity({ rows, setToast }) { const fields = [['Total', 'total_llegados'], ['Nuevos', 'nuevos'], ['Repetidos', 'repetidos'], ['Sin respuesta', 'sin_respuesta']]; return <section className="panel publicity"><PanelTitle icon={Bell} title="Publicidad" action={<Copy size={15} />} /><div className="publicity-rows">{rows.length ? rows.map(row => <div className="publicity-row" key={row.id}><strong><FileText size={13} /> Línea {row.id}</strong>{fields.map(([label, field]) => <label key={field}><small>{label}</small><span><button aria-label={`Disminuir ${label}`} onClick={() => updateAdvertisingLine(row.id, field, Number(row[field]) - 1).catch(() => setToast('No se pudo guardar publicidad'))}>−</button><b>{row[field] ?? 0}</b><button aria-label={`Aumentar ${label}`} onClick={() => updateAdvertisingLine(row.id, field, Number(row[field]) + 1).catch(() => setToast('No se pudo guardar publicidad'))}>+</button></span></label>)}<em>{row.total_derivados ?? 0} derivados</em></div>) : <EmptyInline text="No hay líneas de publicidad para este turno." />}</div></section> }
function BonusSummary({ rows }) { const total = rows.reduce((sum, row) => sum + (row.recuperado ? -Number(row.valor || 0) : Number(row.valor || 0)), 0); return <section className="panel compact-bonus"><PanelTitle icon={Gift} title="Bonos netos" action={<Eye size={15} />} /><strong className="accent-number">{money.format(total)}</strong><p>Últimos movimientos</p>{rows.slice(0, 4).map(row => <div className="mini-row" key={row.id}><span className={row.recuperado ? 'success' : ''}>{row.recuperado ? 'Recuperado' : 'Otorgado'}</span><time>{new Date(row.fecha_hora_creacion).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}</time><b>{money.format(row.valor)}</b></div>)}{!rows.length && <EmptyInline text="No hay bonos registrados." />}</section> }
function ChipSummary({ chips }) { return <section className="panel chip-summary"><PanelTitle icon={Boxes} title="Fichas finales" action={<Plus size={15} />} />{chips.length ? chips.map(chip => <div className="chip-item" key={chip.id}><span>{chip.plataformas?.nombre || 'Plataforma'}</span><b>{money.format(chip.fichas_inicial)}</b><strong className={chip.fichas_final == null ? '' : 'success'}>{chip.fichas_final == null ? 'Sin cierre' : money.format(chip.fichas_final)}</strong></div>) : <EmptyInline text="No hay fichas configuradas para este turno." />}</section> }
function AccountMatrix({ accounts, holders, wallets, total, setToast }) { return <section className="panel account-panel"><PanelTitle icon={WalletCards} title="Matriz de cuentas" meta={`${holders.length} titulares · ${wallets.length} billeteras`} action={<button className="text-action" onClick={() => setToast('La matriz refleja los valores guardados en Supabase')}>Estado de datos</button>} /><div className="matrix-wrap">{accounts.length ? <><div className="matrix-row matrix-head"><strong>Titular</strong>{wallets.map(wallet => <span key={wallet}>{wallet}</span>)}<span>Total</span></div>{holders.map(holder => { const holderAccounts = accounts.filter(account => account.holder === holder); const holderTotal = holderAccounts.reduce((sum, account) => sum + account.amount, 0); return <div className="matrix-row" key={holder}><strong>{holder}</strong>{wallets.map(wallet => { const account = holderAccounts.find(item => item.wallet === wallet); return <label key={`${holder}-${wallet}`} className={account?.amount ? 'green' : ''}>{account ? <><span>$</span><input defaultValue={account.amount.toLocaleString('es-AR')} onFocus={(event) => event.target.select()} onBlur={(event) => updateAccountValue(account.id, event.target.value.replace(/\./g, '').replace(',', '.')).catch(() => setToast('No se pudo guardar el valor de la cuenta'))} /></> : '—'}</label> })}<b>{money.format(holderTotal)}</b></div> })}<div className="matrix-total"><span>Total billetera</span>{wallets.map(wallet => <b key={wallet}>{money.format(accounts.filter(account => account.wallet === wallet).reduce((sum, account) => sum + account.amount, 0))}</b>)}<strong>{money.format(total)}</strong></div></> : <EmptyInline text="No hay cuentas vinculadas al turno abierto." />}</div></section> }
function LogisticsCard({ rows }) { return <section className="panel mini-card logistics-card"><PanelTitle icon={WalletCards} title="Logística" action={<ChevronRight size={15} />} />{rows.length ? rows.slice(0, 4).map(row => { const account = row.cuentas_x_turno?.cuentas; return <div className="route-row" key={row.id}><span>{row.num_orden ?? '—'}</span><b>{account?.titulares?.nombre || 'Sin titular'} · {account?.billeteras?.nombre || 'Sin billetera'}</b></div> }) : <EmptyInline text="No hay rutas de logística configuradas." />}</section> }
function StatusCard() { return <section className="panel mini-card"><PanelTitle icon={Sparkles} title="Estados" action={<SlidersHorizontal size={15} />} /><EmptyInline text="Los estados se mostrarán cuando estén configurados en Supabase." /></section> }
function UsersCard({ users }) { return <section className="panel mini-card"><PanelTitle icon={Users} title="Usuarios" action={<Plus size={15} />} /><div className="search-line"><Search size={14} /><input placeholder="Buscar usuario" /></div>{users.slice(0, 5).map(user => <div className="user-row" key={user.id}><span><UserRound size={15} /></span><b>{user.nombres_usuario?.[0]?.nombre || `Usuario #${user.id}`}</b><ChevronRight size={14} /></div>)}{!users.length && <EmptyInline text="No hay usuarios registrados." />}</section> }
function MovementCard({ title, icon: Icon, amount, rows }) { return <section className="panel movement-card"><PanelTitle icon={Icon} title={title} meta={`${rows.length} registros`} action={<Eye size={15} />} /><div className="entry-form"><input placeholder="Tipo" /><input placeholder="$ Monto" /><input placeholder="Notas" /><button className="send-button"><ArrowLeftRight size={14} /></button></div><small className="section-kicker">Últimos registros</small>{rows.slice(0, 5).map(row => <div className="movement-row" key={row.id}><span>{row.usuario_texto || row.notas || row.tipos_gasto?.nombre || 'Movimiento'}</span><b>{money.format(row.monto)}</b></div>)}{!rows.length && <EmptyInline text="No hay movimientos registrados." />}<footer>Total <strong>{money.format(amount)}</strong></footer></section> }
function BonusList({ rows }) { return <section className="panel movement-card bonus-list"><PanelTitle icon={Gift} title="Bonos" meta={`${rows.filter(row => !row.recuperado).length} otorgados · ${rows.filter(row => row.recuperado).length} recuperados`} action={<Plus size={15} />} /><div className="entry-form"><input placeholder="$ Insertar bono otorgado" /><button className="send-button"><ArrowLeftRight size={14} /></button></div><small className="section-kicker">Últimos bonos</small>{rows.slice(0, 8).map(row => <div className="movement-row" key={row.id}><span className={row.recuperado ? 'success' : 'warning'}>{row.recuperado ? 'Recuperado' : 'Otorgado'}</span><time>{new Date(row.fecha_hora_creacion).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}</time><b>{money.format(row.valor)}</b></div>)}{!rows.length && <EmptyInline text="No hay bonos registrados." />}</section> }
function EmptyInline({ text }) { return <p className="empty-inline">{text}</p> }
function PanelTitle({ icon: Icon, title, meta, action }) { return <div className="panel-title"><div><Icon size={16} /><h2>{title}</h2>{meta && <small>{meta}</small>}</div>{action && <span className="panel-action">{action}</span>}</div> }

function Statistics() { return <><GoalStrip open={false} onToggle={() => {}} /><section className="panel stats-toolbar"><div><span className="eyebrow">Período activo</span><h2>120 turnos dentro del período</h2></div><div className="stats-filters"><label>Desde<input type="date" defaultValue="2026-09-01" /></label><label>Hasta<input type="date" defaultValue="2026-09-21" /></label><button>Hoy</button><button>Semana actual</button></div></section><div className="stats-grid">{['Total', 'Mañana', 'Tarde', 'Noche'].map((period, index) => <section className={`panel stat-card ${index === 0 ? 'featured' : ''}`} key={period}><div className="stat-head"><h2>{period}</h2><small>{index ? 40 : 120} turnos</small></div><h3>GENERAL</h3>{[['Propinas', ['$ 454.516', '$ 94.700', '$ 189.022', '$ 170.794'][index]], ['Caja inicial', ['$ 528.145', '$ 571.768', '$ 481.815', '$ 530.851'][index]], ['Caja final', ['$ 535.992', '$ 501.972', '$ 534.720', '$ 571.285'][index]], ['Diferencia real', ['$ 282.270', '$ 349.701', '$ 353.210', '$ 143.897'][index]], ['Ganancia real', ['$ 217.347', '$ 269.270', '$ 271.972', '$ 110.801'][index]]].map(([label, value]) => <div className="stat-line" key={label}><span>{label}</span><b>{value}</b></div>)}<h3>BONOS</h3>{[['Otorgados', '$ 28.580.327'], ['Recuperados', '$ 3.534.133'], ['Bonos netos', '$ 25.046.194']].map(([label, value]) => <div className="stat-line" key={label}><span>{label}</span><b>{value}</b></div>)}<h3>GASTOS</h3>{['Adelanto', 'Sueldos', 'Propinas', 'Fichas'].map(label => <div className="stat-line" key={label}><span>{label}</span><b>$ 400.000</b></div>)}</section>)}</div></> }

function Logistics({ setToast }) { const [filter, setFilter] = useState(''); const rows = ['Ever Lombardo · Prex', 'Ever Lombardo · Mercado Pago', 'Mateo Ferrer · Naranja X', 'Pablo Totaro · Personal Pay', 'Fede Acuña · Ualá', 'Guillermo Bibbo · Ualá', 'Suiza · Lemon']; return <><GoalStrip open={false} onToggle={() => {}} /><section className="panel logistics-page"><PanelTitle icon={WalletCards} title="Ruta de cuentas" meta="Control de reinicios y recomendaciones" action={<button className="primary-button" onClick={() => setToast('Nueva billetera lista para asignar')}> <Plus size={14} /> Agregar billetera</button>} /><div className="search-line wide"><Search size={14} /><input placeholder="Filtrar cliente o billetera" value={filter} onChange={(event) => setFilter(event.target.value)} /></div><div className="logistics-table"><div className="logistics-head"><span>En uso</span><span>Cliente</span><span>Billetera</span><span>Aclaración</span><span>Último cobro</span><span>Último retiro</span><span>Último reinicio</span></div>{rows.filter(row => row.toLowerCase().includes(filter.toLowerCase())).map((row, index) => { const [client, wallet] = row.split(' · '); return <div className={`logistics-row ${index === 4 ? 'attention' : ''}`} key={row}><input type="checkbox" defaultChecked={index === 4} /><b>{client}</b><strong>{wallet}</strong><span>Máximo 250k · Pagos</span><time>20/09/2026 · 02:16</time><time>20/09/2026 · 07:52</time><button onClick={() => setToast(`Ruta actualizada para ${client}`)}>{index === 4 ? 'Noruega' : 'Sin caja'}</button></div> })}</div></section></> }

function UsersView() { const [expanded, setExpanded] = useState(users[1]); return <><GoalStrip open={false} onToggle={() => {}} /><section className="panel directory"><PanelTitle icon={Users} title="Usuarios" meta="66 registros" action={<><div className="search-line"><Search size={14} /><input placeholder="Buscar por nombre, teléfono o titular" /></div><button className="primary-button"><Plus size={14} /> Nuevo usuario</button></>} />{users.concat(['juanpablo3682f', 'fabian7594f', 'maria9416y', 'pablo1369y']).map(user => <div className={`directory-row ${expanded === user ? 'expanded' : ''}`} key={user}><button className="expand-button" onClick={() => setExpanded(expanded === user ? '' : user)}>{expanded === user ? <ChevronDown size={15} /> : <ChevronRight size={15} />}</button><b>{user}</b><div className="tags"><span>Noruega</span><span>Ganamos</span></div><button className="icon-button"><Settings2 size={15} /></button>{expanded === user && <div className="user-detail"><label>Nombre de usuario<input defaultValue={user} /></label><label>Número de teléfono<input defaultValue="+54 9 2214 98-0834" /></label><label>Titular<input placeholder="Titular" /></label><label>Panel<select><option>Sin seleccionar</option><option>Principal</option></select></label><label>Aclaraciones<textarea placeholder="Notas operativas" /></label></div>}</div>)}</section></> }

function Bonuses() { const groups = [{ name: 'Regular', items: ['Bono 10%', 'Bono 10%', 'Bono 15%', 'Bono 20%', 'Bono 30%'] }, { name: 'Múltiple', items: ['Ganamos 20% · MultiPanel 30%', 'Ganamos 30% · MultiPanel 40%', 'MultiPanel 20% · Ganamos 50%'] }, { name: 'Específico', items: ['Ganamos 40%', 'MultiPanel 50%', 'Ganamos 60%'] }]; return <><GoalStrip open={false} onToggle={() => {}} /><section className="panel bonus-library"><PanelTitle icon={Gift} title="Bonos" meta="50 registros" action={<><div className="search-line"><Search size={14} /><input placeholder="Buscar bono, porcentaje o condición" /></div><button className="primary-button"><Plus size={14} /> Nuevo bono</button></>} />{groups.map(group => <div className="bonus-group" key={group.name}><div className="group-heading"><h2>{group.name}</h2><small>{group.items.length} bonos</small></div><div className="bonus-cards">{group.items.map((item, index) => <article className="bonus-card" key={`${group.name}-${item}-${index}`}><div className={`bonus-art art-${index % 4}`}><Gift size={31} /><strong>{item.includes('%') ? item.match(/\d+%/)?.[0] : '★'}</strong></div><div><h3>{item}</h3><p>{group.name}</p><small>Fijo · {10 + index * 10}%</small><footer><button className="icon-button"><Settings2 size={14} /></button><button className="icon-button"><ArrowLeftRight size={14} /></button></footer></div></article>)}</div></div>)}</section></> }

function SettingsView({ setToast }) { return <><GoalStrip open={true} onToggle={() => {}} /><div className="settings-tabs">{['Cajas', 'Matriz de cuentas', 'Gastos', 'Control de fichas', 'Usuarios', 'Bonos', 'Objetivos'].map((tab, index) => <button className={index === 1 ? 'active' : ''} key={tab}>{tab}</button>)}</div><section className="settings-intro"><span className="eyebrow">Matriz de cuentas</span><h2>Titulares y billeteras</h2><p>Definí las listas y qué billeteras puede usar cada titular.</p></section><div className="settings-grid"><ConfigList title="Titulares" items={['Guillermo Bibbo', 'Carlos Almonacid', 'Fede Acuña', 'Pablo Totaro', 'Mateo Ferrer', 'Ever Lombardo', 'Escocia', 'Suiza']} /><ConfigList title="Billeteras" items={wallets} select /></div><section className="panel availability"><PanelTitle icon={SlidersHorizontal} title="Billeteras utilizables por titular" meta="Activá y configurá cada cuenta" action={<button className="primary-button" onClick={() => setToast('Configuración guardada')}>Guardar cambios</button>} />{accountRows.map((row, rowIndex) => <div className="availability-row" key={row.name}><b>{row.name}</b>{wallets.map((wallet, index) => <label key={wallet}><input type="checkbox" defaultChecked={(rowIndex + index) % 3 === 0} /><span /></label>)}</div>)}</section></> }
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

function LiveSettings({ data, setToast }) { const holders = [...new Map(data.accounts.map(account => [account.cuentas?.titulares?.id || account.cuenta_id, account.cuentas?.titulares || { id: account.cuenta_id, nombre: 'Sin titular' }])).values()]; const wallets = [...new Map(data.accounts.map(account => [account.cuentas?.billeteras?.id || account.cuenta_id, account.cuentas?.billeteras || { id: account.cuenta_id, nombre: 'Sin billetera' }])).values()]; return <><GoalStrip open={false} onToggle={() => {}} /><div className="settings-tabs"><button className="active">Matriz de cuentas</button></div><section className="settings-intro"><span className="eyebrow">Datos del turno</span><h2>Titulares y billeteras</h2><p>Estos registros provienen de las cuentas vinculadas al turno abierto.</p></section><div className="settings-grid"><ConfigList title="Titulares" items={holders} /><ConfigList title="Billeteras" items={wallets} select /></div><section className="panel availability"><PanelTitle icon={SlidersHorizontal} title="Cuentas del turno" meta={`${data.accounts.length} cuentas`} action={<button className="primary-button" onClick={() => setToast('La matriz se actualiza desde cuentas_x_turno')}>Actualizar</button>} />{data.accounts.map(account => <div className="availability-row" key={account.id}><b>{account.cuentas?.titulares?.nombre || 'Sin titular'} · {account.cuentas?.billeteras?.nombre || 'Sin billetera'}</b><span>{money.format(account.valor || 0)}</span><span>{account.cobros ? 'Cobros' : 'Sin cobros'}</span><span>{account.retiros ? 'Retiros' : 'Sin retiros'}</span></div>)}{!data.accounts.length && <EmptyInline text="No hay cuentas vinculadas al turno actual." />}</section></> }

export default App
