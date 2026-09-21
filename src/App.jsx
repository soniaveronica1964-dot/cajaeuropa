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
import { loadOpenShift, supabase } from './lib/supabase'

const money = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 })

const wallets = ['Ualá', 'Mercado Pago', 'Personal Pay', 'Naranja X', 'Brubank', 'Prex', 'Astro Pay', 'Belo', 'Lemon']
const accountRows = [
  { name: 'Fede Acuña', values: [51109, 0, 0, 0, 0, 0, 0, 0, 0], tone: 'orange' },
  { name: 'Pablo Totaro', values: [0, 0, 0, 0, 0, 0, 0, 0, 0] },
  { name: 'Mateo Ferrer', values: [0, 0, 0, 0, 0, 0, 0, 0, 0] },
  { name: 'Ever Lombardo', values: [0, 0, 297960, 0, 0, 0, 0, 0, 0], tone: 'green' },
]
const bonusRows = [
  { label: 'Otorgado', time: '02:18', amount: 5000 },
  { label: 'Otorgado', time: '02:14', amount: 10000 },
  { label: 'Recuperado', time: '01:59', amount: 1600, recovered: true },
  { label: 'Otorgado', time: '01:41', amount: 1500 },
]
const users = ['bauti9786f', 'sergio0834ff', 'beba0849f', 'andres7231f', 'eli4836y', 'milagrod6804f', 'santiago2015f', 'mario8988f']

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
  const [box, setBox] = useState('Noruega')
  const [openGoal, setOpenGoal] = useState(true)
  const [toast, setToast] = useState('')
  const [shift, setShift] = useState(null)

  useEffect(() => {
    loadOpenShift().then(setShift).catch(() => setToast('No se pudo cargar Supabase; se muestran datos demo.'))
  }, [])

  useEffect(() => {
    if (!toast) return undefined
    const timer = setTimeout(() => setToast(''), 3200)
    return () => clearTimeout(timer)
  }, [toast])

  const activeLabel = navItems.find(([id]) => id === view)?.[1] ?? 'Caja'
  const shiftName = shift?.dias_turno?.nombre ?? 'Turno Noche'
  const shiftTime = shift?.dias_turno ? `${shift.dias_turno.hora_inicio.slice(0, 5)} - ${shift.dias_turno.hora_fin.slice(0, 5)}` : '00:00 - 08:00'

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
          <div className="shift-title"><span><Clock3 size={14} /> {shiftName}</span><b>21/9 <em>/</em> {shiftTime}</b></div>
          <button className="icon-button" title="Turno siguiente"><ChevronRight size={17} /></button>
        </div>
        <div className="top-actions">
          <label className="box-select"><small>CAJA</small><select value={box} onChange={(event) => setBox(event.target.value)}><option>Noruega</option><option>Suiza</option></select><span className="box-dot" /></label>
          <span className="saved"><i /> Guardado</span>
          <button className="icon-button" title="Notificaciones"><Bell size={17} /></button>
          <button className="lock-button" title="Bloquear caja"><LockKeyhole size={16} /></button>
        </div>
      </header>

      <div className="workspace">
        <aside className="sidebar">
          <p className="sidebar-label">Operación</p>
          {navItems.map(([id, label, Icon]) => <button key={id} className={`side-link ${view === id ? 'active' : ''}`} onClick={() => setView(id)}><Icon size={16} /><span>{label}</span>{id === 'bonuses' && <b className="nav-count">36</b>}</button>)}
          <div className="sidebar-bottom"><p className="sidebar-label">Sesión activa</p><div className="operator"><span>MR</span><div><strong>Marina Ríos</strong><small>Operadora</small></div><ChevronDown size={14} /></div></div>
        </aside>

        <main className="main-content">
          <section className="page-heading">
            <div><span className="eyebrow">Último guardado confirmado · 02:23 a. m.</span><h1>{activeLabel === 'Caja' ? `${shiftName} / ${shiftTime}` : activeLabel}</h1><p>lunes, 21 de septiembre · {box}</p></div>
            <div className="heading-actions">{navItems.slice(1, 6).map(([id, label, Icon]) => <button key={id} className={`icon-button ${view === id ? 'selected' : ''}`} title={label} onClick={() => setView(id)}><Icon size={17} /></button>)}</div>
          </section>

          {view === 'dashboard' && <Dashboard openGoal={openGoal} setOpenGoal={setOpenGoal} setToast={setToast} />}
          {view === 'stats' && <Statistics />}
          {view === 'logistics' && <Logistics setToast={setToast} />}
          {view === 'users' && <UsersView />}
          {view === 'bonuses' && <Bonuses />}
          {view === 'settings' && <SettingsView setToast={setToast} />}
        </main>
      </div>
      {toast && <div className="toast"><Sparkles size={16} />{toast}</div>}
    </div>
  )
}

function GoalStrip({ open, onToggle }) {
  return <section className={`goal-strip ${open ? 'expanded' : ''}`}><div className="goal-strip-head"><strong>Objetivos del turno</strong><div className="goal-summary"><span>Ahorro <b className="success">100%</b><i><em style={{ width: '100%' }} /></i><small>$ 50.000 / $ 50.000</small></span><span>Bono <b>80%</b><i><em style={{ width: '80%' }} /></i><small>$ 92.640 / $ 116.025</small></span></div><button className="icon-button" onClick={onToggle} aria-label="Mostrar objetivos">{open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}</button></div>{open && <div className="goal-details"><Goal label="Depósitos generales" value="60%" amount="$ 148.484" target="$ 250.000" width="60%" /><Goal label="Ahorro del mes" value="33%" amount="$ 50.000" target="$ 150.000" width="33%" /><Goal label="Bonos del mes" value="65%" amount="$ 10.698" target="$ 16.500" width="65%" /></div>}</section>
}
function Goal({ label, value, amount, target, width }) { return <div className="goal-row"><strong>Obj. {label}</strong><i><em style={{ width }} /></i><b>{value}</b><small>{amount} <span>/</span> {target}</small></div> }

function Dashboard({ openGoal, setOpenGoal, setToast }) {
  const [rounding, setRounding] = useState('-129')
  const [counts, setCounts] = useState({ A: 0, B: 0 })
  const total = accountRows.reduce((sum, row) => sum + row.values.reduce((rowSum, value) => rowSum + value, 0), 0)
  return <>
    <GoalStrip open={openGoal} onToggle={() => setOpenGoal(value => !value)} />
    <section className="summary-bar"><div className="summary-status"><span className="eyebrow">Resumen</span><b><i /> ABIERTA</b></div><Metric label="Sobrante / faltante" value="$ 0" /><Metric label="Caja inicial" value="$ 497.553" tone="positive" /><Metric label="Caja final" value="$ 357.582" tone="positive" /><Metric label="Diferencia caja" value="-$ 139.971" tone="negative" /><Metric label="Diferencia real" value="$ 110.029" tone="positive" /><label className="rounding"><small>Redondeo</small><span>$<input value={rounding} onChange={(event) => setRounding(event.target.value)} /></span></label></section>
    <div className="dashboard-grid">
      <div className="dashboard-main">
        <div className="top-panels"><Publicity counts={counts} setCounts={setCounts} /><BonusSummary /><ChipSummary /></div>
        <AccountMatrix total={total} setToast={setToast} />
        <div className="three-panels"><LogisticsCard /><StatusCard /><UsersCard /></div>
        <div className="three-panels lower"><MovementCard title="Gastos" icon={FileText} amount="$ 200.000" rows={['Sueldos · NaNo', 'Sueldos · DQ']} /><MovementCard title="Propinas" icon={CircleDollarSign} amount="$ 7.024" rows={['evita6000y · PE']} /><BonusList /></div>
      </div>
    </div>
  </>
}
function Metric({ label, value, tone = '' }) { return <div className="metric"><small>{label}</small><strong className={tone}>{value}</strong></div> }
function Publicity({ counts, setCounts }) { return <section className="panel publicity"><PanelTitle icon={Bell} title="Publicidad" action={<Copy size={15} />} /><div className="publicity-rows">{['A', 'B'].map((item) => <div className="publicity-row" key={item}><strong><FileText size={13} /> Publicidad {item}</strong>{['Total', 'Nuevos', 'Repetidos', 'Sin respuesta'].map((label, index) => <label key={label}><small>{label}</small><span><button onClick={() => setCounts(current => ({ ...current, [item]: Math.max(0, current[item] - 1) }))}>−</button><b>{index === 0 ? counts[item] : 0}</b><button onClick={() => setCounts(current => ({ ...current, [item]: current[item] + 1 }))}>+</button></span></label>)}<em>{counts[item] * 5}%</em></div>)}</div></section> }
function BonusSummary() { return <section className="panel compact-bonus"><PanelTitle icon={Gift} title="Bonos netos" action={<Eye size={15} />} /><strong className="accent-number">$ 92.640</strong><p>Últimos movimientos</p>{bonusRows.map(row => <div className="mini-row" key={`${row.time}-${row.amount}`}><span className={row.recovered ? 'success' : ''}>{row.label}</span><time>{row.time}</time><b>{money.format(row.amount)}</b></div>)}</section> }
function ChipSummary() { return <section className="panel chip-summary"><PanelTitle icon={Boxes} title="Fichas finales" action={<Plus size={15} />} /><div className="chip-item"><span>Fichas Ganamos</span><b>$ 555.476</b><strong className="success">$ 282.700</strong></div><div className="chip-item"><span>Fichas MultiPanel</span><b>$ 1.082.689</b><strong className="negative">-$ 87.184</strong></div></section> }
function AccountMatrix({ total, setToast }) { return <section className="panel account-panel"><PanelTitle icon={WalletCards} title="Matriz de cuentas" meta="4 titulares · 9 billeteras" action={<button className="text-action" onClick={() => setToast('Matriz copiada al portapapeles')}>Copiar conteo</button>} /><div className="matrix-wrap"><div className="matrix-row matrix-head"><strong>Titular</strong>{wallets.map(wallet => <span key={wallet}>{wallet}</span>)}<span>Total</span></div>{accountRows.map(row => <div className="matrix-row" key={row.name}><strong>{row.name}</strong>{row.values.map((value, index) => <label key={`${row.name}-${wallets[index]}`} className={value ? row.tone : ''}>{value ? <><span>$</span><input defaultValue={value.toLocaleString('es-AR')} onFocus={(event) => event.target.select()} /></> : '—'}</label>)}<b>{money.format(row.values.reduce((sum, value) => sum + value, 0))}</b></div>)}<div className="matrix-total"><span>Total billetera</span>{wallets.map(wallet => <b key={wallet}>$ 0</b>)}<strong>{money.format(total)}</strong></div></div></section> }
function LogisticsCard() { return <section className="panel mini-card logistics-card"><PanelTitle icon={WalletCards} title="Logística" action={<ChevronRight size={15} />} /><div className="recommendation"><Sparkles size={14} /><b>Billetera recomendada</b><span>Mateo Ferrer · Prex</span></div>{['Fede Acuña · Ualá', 'Pablo Totaro · Personal Pay', 'Ever Lombardo · Personal Pay'].map((item, index) => <div className={`route-row ${index === 2 ? 'current' : ''}`} key={item}><span>{index === 2 ? 'EN USO' : `${index - 1 > 0 ? '+' : index - 1}`} </span><b>{item}</b></div>)}</section> }
function StatusCard() { return <section className="panel mini-card"><PanelTitle icon={Sparkles} title="Estados" action={<SlidersHorizontal size={15} />} /><div className="search-line"><Search size={14} /><input placeholder="Buscar bono" /></div>{['Bono 10% · Regular', 'Bono 15% · Regular', 'Bono 20% · Regular', 'Bono 30% · Múltiple'].map((item, index) => <div className="status-row" key={item}><span className={`status-thumb tone-${index}`} /><div><b>{item}</b><small>{index % 2 ? 'Múltiple' : 'Regular'}</small></div><button className="icon-button"><ChevronRight size={14} /></button></div>)}</section> }
function UsersCard() { return <section className="panel mini-card"><PanelTitle icon={Users} title="Usuarios" action={<Plus size={15} />} /><div className="search-line"><Search size={14} /><input placeholder="Buscar usuario" /></div>{users.slice(0, 5).map(user => <div className="user-row" key={user}><span><UserRound size={15} /></span><b>{user}</b><ChevronRight size={14} /></div>)}</section> }
function MovementCard({ title, icon: Icon, amount, rows }) { return <section className="panel movement-card"><PanelTitle icon={Icon} title={title} meta={`${rows.length} registros`} action={<Eye size={15} />} /><div className="entry-form"><input placeholder="Tipo" /><input placeholder="$ Monto" /><input placeholder="Notas" /><button className="send-button"><ArrowLeftRight size={14} /></button></div><small className="section-kicker">Últimos registros</small>{rows.map(row => <div className="movement-row" key={row}><span>{row}</span><b>{amount}</b></div>)}<footer>Total <strong>{amount}</strong></footer></section> }
function BonusList() { return <section className="panel movement-card bonus-list"><PanelTitle icon={Gift} title="Bonos" meta="36 otorgados · 2 recuperados" action={<Plus size={15} />} /><div className="entry-form"><input placeholder="$ Insertar bono otorgado" /><button className="send-button"><ArrowLeftRight size={14} /></button></div><small className="section-kicker">Últimos bonos</small>{bonusRows.concat(bonusRows).map((row, index) => <div className="movement-row" key={`${row.time}-${index}`}><span className={row.recovered ? 'success' : 'warning'}>{row.label}</span><time>{row.time}</time><b>{money.format(row.amount)}</b></div>)}</section> }
function PanelTitle({ icon: Icon, title, meta, action }) { return <div className="panel-title"><div><Icon size={16} /><h2>{title}</h2>{meta && <small>{meta}</small>}</div>{action && <span className="panel-action">{action}</span>}</div> }

function Statistics() { return <><GoalStrip open={false} onToggle={() => {}} /><section className="panel stats-toolbar"><div><span className="eyebrow">Período activo</span><h2>120 turnos dentro del período</h2></div><div className="stats-filters"><label>Desde<input type="date" defaultValue="2026-09-01" /></label><label>Hasta<input type="date" defaultValue="2026-09-21" /></label><button>Hoy</button><button>Semana actual</button></div></section><div className="stats-grid">{['Total', 'Mañana', 'Tarde', 'Noche'].map((period, index) => <section className={`panel stat-card ${index === 0 ? 'featured' : ''}`} key={period}><div className="stat-head"><h2>{period}</h2><small>{index ? 40 : 120} turnos</small></div><h3>GENERAL</h3>{[['Propinas', ['$ 454.516', '$ 94.700', '$ 189.022', '$ 170.794'][index]], ['Caja inicial', ['$ 528.145', '$ 571.768', '$ 481.815', '$ 530.851'][index]], ['Caja final', ['$ 535.992', '$ 501.972', '$ 534.720', '$ 571.285'][index]], ['Diferencia real', ['$ 282.270', '$ 349.701', '$ 353.210', '$ 143.897'][index]], ['Ganancia real', ['$ 217.347', '$ 269.270', '$ 271.972', '$ 110.801'][index]]].map(([label, value]) => <div className="stat-line" key={label}><span>{label}</span><b>{value}</b></div>)}<h3>BONOS</h3>{[['Otorgados', '$ 28.580.327'], ['Recuperados', '$ 3.534.133'], ['Bonos netos', '$ 25.046.194']].map(([label, value]) => <div className="stat-line" key={label}><span>{label}</span><b>{value}</b></div>)}<h3>GASTOS</h3>{['Adelanto', 'Sueldos', 'Propinas', 'Fichas'].map(label => <div className="stat-line" key={label}><span>{label}</span><b>$ 400.000</b></div>)}</section>)}</div></> }

function Logistics({ setToast }) { const [filter, setFilter] = useState(''); const rows = ['Ever Lombardo · Prex', 'Ever Lombardo · Mercado Pago', 'Mateo Ferrer · Naranja X', 'Pablo Totaro · Personal Pay', 'Fede Acuña · Ualá', 'Guillermo Bibbo · Ualá', 'Suiza · Lemon']; return <><GoalStrip open={false} onToggle={() => {}} /><section className="panel logistics-page"><PanelTitle icon={WalletCards} title="Ruta de cuentas" meta="Control de reinicios y recomendaciones" action={<button className="primary-button" onClick={() => setToast('Nueva billetera lista para asignar')}> <Plus size={14} /> Agregar billetera</button>} /><div className="search-line wide"><Search size={14} /><input placeholder="Filtrar cliente o billetera" value={filter} onChange={(event) => setFilter(event.target.value)} /></div><div className="logistics-table"><div className="logistics-head"><span>En uso</span><span>Cliente</span><span>Billetera</span><span>Aclaración</span><span>Último cobro</span><span>Último retiro</span><span>Último reinicio</span></div>{rows.filter(row => row.toLowerCase().includes(filter.toLowerCase())).map((row, index) => { const [client, wallet] = row.split(' · '); return <div className={`logistics-row ${index === 4 ? 'attention' : ''}`} key={row}><input type="checkbox" defaultChecked={index === 4} /><b>{client}</b><strong>{wallet}</strong><span>Máximo 250k · Pagos</span><time>20/09/2026 · 02:16</time><time>20/09/2026 · 07:52</time><button onClick={() => setToast(`Ruta actualizada para ${client}`)}>{index === 4 ? 'Noruega' : 'Sin caja'}</button></div> })}</div></section></> }

function UsersView() { const [expanded, setExpanded] = useState(users[1]); return <><GoalStrip open={false} onToggle={() => {}} /><section className="panel directory"><PanelTitle icon={Users} title="Usuarios" meta="66 registros" action={<><div className="search-line"><Search size={14} /><input placeholder="Buscar por nombre, teléfono o titular" /></div><button className="primary-button"><Plus size={14} /> Nuevo usuario</button></>} />{users.concat(['juanpablo3682f', 'fabian7594f', 'maria9416y', 'pablo1369y']).map(user => <div className={`directory-row ${expanded === user ? 'expanded' : ''}`} key={user}><button className="expand-button" onClick={() => setExpanded(expanded === user ? '' : user)}>{expanded === user ? <ChevronDown size={15} /> : <ChevronRight size={15} />}</button><b>{user}</b><div className="tags"><span>Noruega</span><span>Ganamos</span></div><button className="icon-button"><Settings2 size={15} /></button>{expanded === user && <div className="user-detail"><label>Nombre de usuario<input defaultValue={user} /></label><label>Número de teléfono<input defaultValue="+54 9 2214 98-0834" /></label><label>Titular<input placeholder="Titular" /></label><label>Panel<select><option>Sin seleccionar</option><option>Principal</option></select></label><label>Aclaraciones<textarea placeholder="Notas operativas" /></label></div>}</div>)}</section></> }

function Bonuses() { const groups = [{ name: 'Regular', items: ['Bono 10%', 'Bono 10%', 'Bono 15%', 'Bono 20%', 'Bono 30%'] }, { name: 'Múltiple', items: ['Ganamos 20% · MultiPanel 30%', 'Ganamos 30% · MultiPanel 40%', 'MultiPanel 20% · Ganamos 50%'] }, { name: 'Específico', items: ['Ganamos 40%', 'MultiPanel 50%', 'Ganamos 60%'] }]; return <><GoalStrip open={false} onToggle={() => {}} /><section className="panel bonus-library"><PanelTitle icon={Gift} title="Bonos" meta="50 registros" action={<><div className="search-line"><Search size={14} /><input placeholder="Buscar bono, porcentaje o condición" /></div><button className="primary-button"><Plus size={14} /> Nuevo bono</button></>} />{groups.map(group => <div className="bonus-group" key={group.name}><div className="group-heading"><h2>{group.name}</h2><small>{group.items.length} bonos</small></div><div className="bonus-cards">{group.items.map((item, index) => <article className="bonus-card" key={`${group.name}-${item}-${index}`}><div className={`bonus-art art-${index % 4}`}><Gift size={31} /><strong>{item.includes('%') ? item.match(/\d+%/)?.[0] : '★'}</strong></div><div><h3>{item}</h3><p>{group.name}</p><small>Fijo · {10 + index * 10}%</small><footer><button className="icon-button"><Settings2 size={14} /></button><button className="icon-button"><ArrowLeftRight size={14} /></button></footer></div></article>)}</div></div>)}</section></> }

function SettingsView({ setToast }) { return <><GoalStrip open={true} onToggle={() => {}} /><div className="settings-tabs">{['Cajas', 'Matriz de cuentas', 'Gastos', 'Control de fichas', 'Usuarios', 'Bonos', 'Objetivos'].map((tab, index) => <button className={index === 1 ? 'active' : ''} key={tab}>{tab}</button>)}</div><section className="settings-intro"><span className="eyebrow">Matriz de cuentas</span><h2>Titulares y billeteras</h2><p>Definí las listas y qué billeteras puede usar cada titular.</p></section><div className="settings-grid"><ConfigList title="Titulares" items={['Guillermo Bibbo', 'Carlos Almonacid', 'Fede Acuña', 'Pablo Totaro', 'Mateo Ferrer', 'Ever Lombardo', 'Escocia', 'Suiza']} /><ConfigList title="Billeteras" items={wallets} select /></div><section className="panel availability"><PanelTitle icon={SlidersHorizontal} title="Billeteras utilizables por titular" meta="Activá y configurá cada cuenta" action={<button className="primary-button" onClick={() => setToast('Configuración guardada')}>Guardar cambios</button>} />{accountRows.map((row, rowIndex) => <div className="availability-row" key={row.name}><b>{row.name}</b>{wallets.map((wallet, index) => <label key={wallet}><input type="checkbox" defaultChecked={(rowIndex + index) % 3 === 0} /><span /></label>)}</div>)}</section></> }
function ConfigList({ title, items, select }) { return <section className="panel config-list"><div className="panel-title"><h2>{title}</h2><small>{items.length} elementos</small></div>{items.map(item => <div className="config-row" key={item}><span className="drag">⠿</span><input defaultValue={item} />{select && <select defaultValue={item === 'Personal Pay' ? 'Solo cobros' : 'Cobros + retiros'}><option>Cobros + retiros</option><option>Solo cobros</option><option>Solo depósito</option></select>}<button className="icon-button"><X size={14} /></button></div>)}<button className="secondary-button"><Plus size={14} /> Agregar</button></section> }

export default App
