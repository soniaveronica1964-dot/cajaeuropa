import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
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
  RefreshCw,
  Search,
  Settings2,
  SlidersHorizontal,
  Sparkles,
  Target,
  Trash2,
  Upload,
  UserRound,
  Users,
  WalletCards,
  X,
} from 'lucide-react'
import {
  createAccount,
  createAccountType,
  createBonusCondition,
  createColor,
  createBox,
  createDayShifts,
  createDayShift,
  createShift,
  createExpense,
  createExpenseType,
  createHolder,
  createWalletType,
  createInitialSetup,
  createPlatform,
  createShiftType,
  createTip,
  createWallet,
  deleteAccountType,
  deleteBonusLine,
  deleteBonusCondition,
  deleteColor,
  deleteBox,
  deleteDayShift,
  deleteWalletType,
  deleteExpenseType,
  deleteHolder,
  deletePlatform,
  deleteShiftType,
  deleteWallet,
  closeShift,
  formatDatabase,
  loadCurrentShiftData,
  deleteAppImage,
  getStoragePublicUrl,
  replaceAppImage,
  reorderEntityOrder,
  saveAppConfig,
  setAccountAvailability,
  updateAccount,
  updateAccountFlags,
  updateAccountType,
  updateAccountValue,
  updateBonusLine,
  updateAdvertisingLine,
  updateChipFinal,
  updateColor,
  updateWalletType,
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
const moneyWithCents = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 2, maximumFractionDigits: 2 })
const numberWithCents = new Intl.NumberFormat('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const numberCompact = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 2 })

function parseLocalizedAmount(value) {
  const raw = String(value).trim().replace(/\s/g, '')
  if (!raw) return 0
  const normalized = raw.includes(',')
    ? raw.replace(/\./g, '').replace(',', '.')
    : /^-?\d{1,3}(?:\.\d{3})+$/.test(raw) ? raw.replace(/\./g, '') : raw
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

async function createAppImagePayload(file) {
  const image = await new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(new Error('No se pudo leer la imagen'))
    reader.readAsDataURL(file)
  })
  const preview = new Image()
  preview.src = image
  await preview.decode()

  const scale = Math.min(1, 256 / Math.max(preview.naturalWidth, preview.naturalHeight))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(preview.naturalWidth * scale))
  canvas.height = Math.max(1, Math.round(preview.naturalHeight * scale))
  canvas.getContext('2d').drawImage(preview, 0, 0, canvas.width, canvas.height)

  const imageMini = await new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob)
      else reject(new Error('No se pudo generar la imagen miniatura'))
    }, 'image/webp', 0.88)
  })

  return { original: file, imageMini }
}

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
  const [openGoal, setOpenGoal] = useState(false)
  const [toast, setToast] = useState('')
  const [appData, setAppData] = useState(null)
  const [selectedBoxId, setSelectedBoxId] = useState(null)
  const [selectedBoxAccent, setSelectedBoxAccent] = useState('#72d7ca')
  const [loadError, setLoadError] = useState('')
  const [cashDiscrepancyPreview, setCashDiscrepancyPreview] = useState(null)

  useEffect(() => {
    loadCurrentShiftData().then((freshData) => {
      const initialBoxId = freshData.shift?.caja_id ?? freshData.boxes?.[0]?.id ?? null
      setAppData(freshData)
      setSelectedBoxId(initialBoxId)
      setSelectedBoxAccent(freshData.boxes?.find((box) => box.id === initialBoxId)?.colores?.hex || '#72d7ca')
    }).catch((error) => setLoadError(error.message || 'No se pudieron cargar los datos de Supabase.'))
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
  const selectedBox = appData?.boxes?.find(boxItem => boxItem.id === selectedBoxId)
  const activeBox = shift?.cajas?.nombre ?? selectedBox?.nombre ?? 'Sin caja'
  const accentColor = selectedBox?.colores?.hex || selectedBoxAccent
  const cashTotal = (appData?.accounts || []).reduce((sum, account) => sum + Number(account.valor || 0), 0)
  const countedChipDifference = (appData?.chips || []).reduce((sum, chip) => {
    if (chip.fichas_final == null) return sum
    return sum + Number(chip.fichas_inicial || 0) - Number(chip.fichas_final || 0)
  }, 0)
  const bonusImpact = (appData?.bonuses || []).reduce((sum, bonus) => sum + (bonus.recuperado ? -Number(bonus.valor || 0) : Number(bonus.valor || 0)), 0)
  const savedCashDiscrepancy = cashTotal - Number(shift?.caja_inicial || 0) - countedChipDifference + Number(shift?.redondeo || 0) + bonusImpact
  const cashDiscrepancy = cashDiscrepancyPreview ?? savedCashDiscrepancy
  const cashDiscrepancyTone = cashDiscrepancy === 0 ? 'neutral' : cashDiscrepancy > 0 ? 'positive' : 'negative'
  const cashDiscrepancyLabel = cashDiscrepancy >= 0
    ? `+${moneyWithCents.format(cashDiscrepancy)}`
    : moneyWithCents.format(cashDiscrepancy)
  const reloadData = (boxId = selectedBoxId ?? shift?.caja_id ?? appData?.boxes?.[0]?.id ?? null) => {
    setSelectedBoxId(boxId)
    const requestedBoxAccent = appData?.boxes?.find((box) => box.id === boxId)?.colores?.hex || '#72d7ca'
    setSelectedBoxAccent(requestedBoxAccent)
    setLoadError('')
    loadCurrentShiftData(boxId).then((freshData) => {
      setAppData(freshData)
      setSelectedBoxAccent(freshData.boxes?.find((box) => box.id === boxId)?.colores?.hex || requestedBoxAccent)
    }).catch((error) => setLoadError(error.message || 'No se pudieron cargar los datos de Supabase.'))
  }
  const updateSettingsData = (freshData) => {
    if (freshData) {
      setAppData(freshData)
      setSelectedBoxAccent(freshData.boxes?.find((box) => box.id === selectedBoxId)?.colores?.hex || '#72d7ca')
      return
    }
    reloadData()
  }
  const updateChipFinalData = (chipId, value) => {
    setAppData(current => current ? {
      ...current,
      chips: current.chips.map(chip => chip.id === chipId ? { ...chip, fichas_final: value } : chip),
    } : current)
  }
  const updateRoundingData = (value) => {
    setAppData(current => current?.shift ? { ...current, shift: { ...current.shift, redondeo: value } } : current)
  }
  const appConfig = appData?.appConfig?.[0]
  const appName = appConfig?.nombre || 'Caja Europa'
  const isLightTheme = Boolean(appConfig?.tema)
  const appImagePreview = getStoragePublicUrl(appConfig?.imagen_mini || appConfig?.imagen)

  if (!appData && !loadError) {
    return (
      <div className="loading-screen" role="status" aria-live="polite">
        <div className="loading-screen-content">
          <RefreshCw className="loading-screen-icon" size={22} aria-hidden="true" />
          <span>{selectedBoxId == null ? 'Cargando caja y recursos...' : 'Cargando caja...'}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="app-shell" data-theme={isLightTheme ? 'light' : 'dark'} style={{ '--accent': accentColor }}>
      <header className="topbar">
        <div className="brand" onClick={() => setView('dashboard')} role="button" tabIndex="0">
          <div className="brand-mark">{appImagePreview ? <img className="brand-image" src={appImagePreview} alt="" /> : <Banknote size={21} />}</div>
          <div><strong>Caja<span>{appName}</span></strong><small>Control operativo</small></div>
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
            {view === 'dashboard' && shift && <div className="shift-discrepancy" aria-label={`Sobrante o faltante: ${cashDiscrepancyLabel}`}><span>Sobrante / Faltante</span><strong className={cashDiscrepancyTone}>{cashDiscrepancyLabel}</strong></div>}
          </section>

          {loadError && <div className="empty-state"><strong>Error al cargar Supabase</strong><p>{loadError}</p></div>}
          {!loadError && !appData && <div className="empty-state"><strong>Cargando datos</strong><p>Consultando el turno y la información operativa.</p></div>}
          {!loadError && appData && view === 'dashboard' && !appData.shift && !appData.boxes?.length && <SetupWizard onCreated={reloadData} setToast={setToast} />}
          {!loadError && appData && view === 'dashboard' && !appData.shift && appData.boxes?.length > 0 && <div className="empty-state"><strong>No hay un turno abierto</strong><p>Configurá o abrí un turno desde Supabase para comenzar a operar.</p></div>}
          {!loadError && appData && view === 'dashboard' && appData.shift && <Dashboard data={appData} openGoal={openGoal} setOpenGoal={setOpenGoal} setToast={setToast} onSaved={reloadData} onChipFinalSaved={updateChipFinalData} onRoundingChange={updateRoundingData} onDiscrepancyChange={setCashDiscrepancyPreview} />}
          {!loadError && appData && view === 'stats' && <LiveStatistics data={appData} />}
          {!loadError && appData && view === 'logistics' && <LiveLogistics data={appData} setToast={setToast} />}
          {!loadError && appData && view === 'users' && <LiveUsersView users={appData.users} />}
          {!loadError && appData && view === 'bonuses' && <LiveBonuses bonuses={appData.bonuses} shift={appData.shift} onSaved={reloadData} setToast={setToast} />}
          {!loadError && appData && view === 'settings' && <LiveSettings data={appData} selectedBoxId={selectedBoxId} setToast={setToast} onSaved={updateSettingsData} />}
        </main>
      </div>
      {toast && <div className="toast"><Sparkles size={16} />{toast}</div>}
    </div>
  )
}

function GoalStrip({ open, onToggle, goals = [] }) {
  const summary = goals.slice(0, 2)
  return <section className={`goal-strip ${open ? 'expanded' : ''}`}><div className="goal-strip-head"><strong>Objetivos</strong><div className="goal-summary">{summary.length ? summary.map(goal => <span key={goal.label}>{goal.label} <b>{goal.percent}%</b><i><em style={{ width: `${goal.percent}%` }} /></i><small>{money.format(goal.current)} / {money.format(goal.target)}</small></span>) : <small className="muted-copy">Sin objetivos configurados</small>}</div><button className="icon-button" onClick={onToggle} aria-label="Mostrar objetivos">{open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}</button></div>{open && <div className="goal-details">{goals.length ? goals.map(goal => <Goal key={goal.label} {...goal} />) : <EmptyInline text="No hay objetivos asociados a este turno." />}</div>}</section>
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
  return <div className={`box-select ${open ? 'open' : ''}`}><small>CAJA</small><button type="button" className="box-select-trigger" aria-expanded={open} onClick={() => setOpen(value => !value)}><strong>{selected?.nombre || 'Sin cajas'}</strong><span className="box-dot" style={{ backgroundColor: selected?.colores?.hex || '#879598' }} /></button>{open && <div className="box-options">{boxes.length ? boxes.map(box => <button type="button" className={box.id === selected?.id ? 'selected' : ''} key={box.id} onClick={() => { setOpen(false); onChange(box.id) }}><i style={{ backgroundColor: box.colores?.hex || '#879598' }} />{box.nombre}</button>) : <span className="box-option-empty">No hay cajas configuradas</span>}</div>}</div>
}

function SetupWizard({ onCreated, setToast }) {
  const [boxName, setBoxName] = useState('')
  const [holders, setHolders] = useState('')
  const [wallets, setWallets] = useState('')
  const [saving, setSaving] = useState(false)

  async function createSetup(values, successMessage, errorMessage) {
    setSaving(true)
    try {
      await createInitialSetup(values)
      setToast(successMessage)
      onCreated()
    } catch (error) {
      setToast(error.message || errorMessage)
    } finally {
      setSaving(false)
    }
  }

  async function handleSubmit(event) {
    event.preventDefault()
    const holderNames = holders.split(',').map(value => value.trim()).filter(Boolean)
    const walletNames = wallets.split(',').map(value => value.trim()).filter(Boolean)
    if (!boxName.trim() || !holderNames.length || !walletNames.length) {
      setToast('Completá caja, titulares y billeteras')
      return
    }
    await createSetup({ boxName: boxName.trim(), holderNames, walletNames, createShift: false }, 'Configuración inicial creada en Supabase', 'No se pudo crear la configuración inicial')
  }

  const handleBasicSetup = () => createSetup({ boxName: 'Caja principal', holderNames: ['Titular inicial'], walletNames: ['Billetera principal'], createShift: false }, 'Configuración básica creada en Supabase', 'No se pudo crear la configuración básica')

  return <section className="setup-page">
    <div className="setup-intro"><span className="eyebrow">Primer acceso</span><h2>Configurá la base de tu caja</h2><p>Los turnos, horarios y montos iniciales se configuran después.</p></div>
    <form className="panel setup-form" onSubmit={handleSubmit}>
      <div className="setup-section"><h3>Caja</h3><div className="setup-fields"><label>Nombre de la caja<input value={boxName} onChange={event => setBoxName(event.target.value)} placeholder="Ej. Noruega" /></label></div></div>
      <div className="setup-section"><h3>Catálogos iniciales</h3><div className="setup-fields"><label className="full-field">Titulares, separados por coma<textarea value={holders} onChange={event => setHolders(event.target.value)} placeholder="Ej. Persona 1, Persona 2" /></label><label className="full-field">Billeteras, separadas por coma<textarea value={wallets} onChange={event => setWallets(event.target.value)} placeholder="Ej. Billetera 1, Billetera 2" /></label></div></div>
      <div className="setup-actions"><small>Se crearán la app, los tipos básicos, las cuentas y sus vínculos con la caja.</small><div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}><button className="secondary-button" type="button" onClick={handleBasicSetup} disabled={saving}>Crear configuración básica</button><button className="primary-button" type="submit" disabled={saving}>{saving ? 'Creando...' : 'Crear configuración'}</button></div></div>
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

function Dashboard({ data, openGoal, setOpenGoal, setToast, onSaved, onChipFinalSaved, onRoundingChange, onDiscrepancyChange }) {
  const [rounding, setRounding] = useState(null)
  const [accountValueDrafts, setAccountValueDrafts] = useState({})
  const [chipFinalDrafts, setChipFinalDrafts] = useState({})
  useEffect(() => setRounding(null), [data.shift?.id])
  useEffect(() => {
    setAccountValueDrafts(current => {
      let changed = false
      const next = { ...current }
      Object.entries(current).forEach(([accountId, value]) => {
        const account = data.accounts.find(item => String(item.id) === accountId)
        if (account && Number(account.valor || 0) === value) {
          delete next[accountId]
          changed = true
        }
      })
      return changed ? next : current
    })
  }, [data.accounts])
  useEffect(() => {
    setChipFinalDrafts(current => {
      let changed = false
      const next = { ...current }
      Object.entries(current).forEach(([chipId, value]) => {
        const chip = data.chips.find(item => String(item.id) === chipId)
        const savedValue = chip?.fichas_final == null ? null : Number(chip.fichas_final)
        if (chip && savedValue === value) {
          delete next[chipId]
          changed = true
        }
      })
      return changed ? next : current
    })
  }, [data.chips])
  const updateAccountValueDraft = (accountId, value) => {
    setAccountValueDrafts(current => {
      const next = { ...current }
      if (value === undefined) delete next[String(accountId)]
      else next[String(accountId)] = value
      return next
    })
  }
  const updateChipFinalDraft = (chipId, value) => {
    setChipFinalDrafts(current => ({ ...current, [String(chipId)]: value }))
  }
  const saveRounding = (event) => {
    const input = event.currentTarget
    const value = parseLocalizedAmount(input.value)
    if (value == null) {
      const savedValue = Number(data.shift.redondeo || 0)
      const formatted = savedValue ? numberCompact.format(savedValue) : ''
      input.value = formatted
      setRounding(formatted)
      setToast('Ingresá un redondeo válido')
      return
    }
    const formatted = value ? numberCompact.format(value) : ''
    input.value = formatted
    setRounding(formatted)
    updateShiftRounding(data.shift.id, value).then(() => {
      onRoundingChange(value)
      onSaved()
    }).catch(() => {
      const savedValue = Number(data.shift.redondeo || 0)
      const reverted = savedValue ? numberCompact.format(savedValue) : ''
      input.value = reverted
      setRounding(reverted)
      setToast('No se pudo guardar el redondeo')
    })
  }
  if (!data.shift) return <section className="panel empty-state"><strong>No hay un turno abierto</strong><p>Creá o abrí un turno en Supabase para cargar la operación real de la caja.</p></section>
  const goals = mapGoals(data.goals)
  const accounts = data.accounts.map(account => {
    const savedAmount = Number(account.valor || 0)
    return { ...account, holder: account.cuentas?.titulares?.nombre || 'Sin titular', wallet: account.cuentas?.billeteras?.nombre || 'Sin billetera', savedAmount, amount: accountValueDrafts[String(account.id)] ?? savedAmount }
  })
  const total = accounts.reduce((sum, account) => sum + account.amount, 0)
  const chips = data.chips.map(chip => ({
    ...chip,
    fichas_final: Object.prototype.hasOwnProperty.call(chipFinalDrafts, String(chip.id)) ? chipFinalDrafts[String(chip.id)] : chip.fichas_final,
  }))
  const tipsTotal = data.tips.reduce((sum, tip) => sum + Number(tip.monto || 0), 0)
  const expensesTotal = data.expenses.reduce((sum, expense) => sum + Number(expense.monto || 0), 0)
  const orderNamesByConfig = (configured, names) => {
    const remaining = new Set(names)
    const ordered = configured.map(item => item.nombre).filter(name => remaining.delete(name))
    return [...ordered, ...remaining]
  }
  const accountHolders = orderNamesByConfig(data.holders, accounts.map(account => account.holder))
  const accountWallets = orderNamesByConfig(data.wallets, accounts.map(account => account.wallet))
  const savedRounding = Number(data.shift.redondeo || 0)
  const roundingValue = rounding === null ? (savedRounding ? numberCompact.format(savedRounding) : '') : rounding
  const roundingAmount = rounding === null ? savedRounding : parseLocalizedAmount(rounding) ?? savedRounding
  const cashInitial = Number(data.shift.caja_inicial || 0)
  const countedChipDifference = chips.reduce((sum, chip) => chip.fichas_final == null ? sum : sum + Number(chip.fichas_inicial || 0) - Number(chip.fichas_final || 0), 0)
  const cashDifference = total - cashInitial
  const realDifference = cashDifference
  const bonusImpact = data.bonuses.reduce((sum, bonus) => sum + (bonus.recuperado ? -Number(bonus.valor || 0) : Number(bonus.valor || 0)), 0)
  const cashDiscrepancy = cashDifference - countedChipDifference + roundingAmount + bonusImpact
  useLayoutEffect(() => {
    onDiscrepancyChange(cashDiscrepancy)
  }, [cashDiscrepancy, onDiscrepancyChange])
  return <>
    <GoalStrip open={openGoal} onToggle={() => setOpenGoal(value => !value)} goals={goals} />
    <section className="summary-bar">
      <div className="summary-status"><span className="eyebrow">Resumen</span><b><i /> {data.shift.abierto ? 'ABIERTA' : 'CERRADA'}</b></div>
      <Metric label="Caja inicial" value={moneyWithCents.format(cashInitial)} tone="positive" />
      <Metric label="Caja final" value={moneyWithCents.format(total)} tone="positive" />
      <Metric label="Diferencia caja" value={moneyWithCents.format(cashDifference)} tone={cashDifference < 0 ? 'negative' : 'positive'} />
      <Metric label="Diferencia real" value={moneyWithCents.format(realDifference)} tone={realDifference < 0 ? 'negative' : 'positive'} />
      <label className="rounding"><small>Redondeo</small><span className={Number(parseLocalizedAmount(roundingValue)) ? 'has-value' : ''}>$<input value={roundingValue} placeholder="0,00" onChange={(event) => setRounding(event.target.value)} onBlur={saveRounding} /></span></label>
    </section>
    <div className="dashboard-grid">
      <div className="dashboard-main">
        <div className="top-panels"><Publicity rows={data.advertising} setToast={setToast} onSaved={onSaved} /><BonusList shiftId={data.shift.id} shift={data.shift} rows={data.bonuses} onSaved={onSaved} setToast={setToast} /><ChipSummary chips={data.chips} setToast={setToast} onChipFinalSaved={onChipFinalSaved} onChipFinalPreview={updateChipFinalDraft} /></div>
        <AccountMatrix accounts={accounts} holders={accountHolders} wallets={accountWallets} total={total} setToast={setToast} onSaved={onSaved} onAccountValueDraft={updateAccountValueDraft} />
        <div className="three-panels"><LogisticsCard rows={data.logistics} /><StatusCard /><UsersCard users={data.users} /></div>
        <div className="three-panels lower"><MovementCard title="Gastos" kind="expenses" shiftId={data.shift.id} options={data.expenseTypes} icon={FileText} amount={expensesTotal} rows={data.expenses} onSaved={onSaved} setToast={setToast} /><MovementCard title="Propinas" kind="tips" shiftId={data.shift.id} icon={CircleDollarSign} amount={tipsTotal} rows={data.tips} onSaved={onSaved} setToast={setToast} /></div>
      </div>
    </div>
  </>
}
function Metric({ label, value, tone = '' }) { return <div className="metric"><small>{label}</small><strong className={tone}>{value}</strong></div> }
function Publicity({ rows, setToast, onSaved }) { const fields = [['Total', 'total_llegados'], ['Nuevos', 'nuevos'], ['Repetidos', 'repetidos'], ['Sin respuesta', 'sin_respuesta']]; const change = (row, field, value) => updateAdvertisingLine(row.id, field, Math.max(0, value)).then(onSaved).catch(() => setToast('No se pudo guardar publicidad')); return <section className="panel publicity"><PanelTitle icon={Bell} title="Publicidad" action={<Copy size={15} />} /><div className="publicity-rows">{rows.length ? rows.map(row => <div className="publicity-row" key={row.id}><strong><FileText size={13} /> Línea {row.id}</strong>{fields.map(([label, field]) => <label key={field}><small>{label}</small><span><button aria-label={`Disminuir ${label}`} onClick={() => change(row, field, Number(row[field]) - 1)}>−</button><b>{row[field] ?? 0}</b><button aria-label={`Aumentar ${label}`} onClick={() => change(row, field, Number(row[field]) + 1)}>+</button></span></label>)}<em>{row.total_derivados ?? 0} derivados</em></div>) : <EmptyInline text="No hay líneas de publicidad para este turno." />}</div></section> }
function bonusTypeOf(bonus) {
  if (bonus.recuperado) return 'recovered'
  if (bonus.es_publicidad) return 'publicity'
  return 'granted'
}

const bonusTypeLabels = { granted: 'Otorgado', recovered: 'Recuperado', publicity: 'Publicidad' }

function bonusNetTotal(rows) {
  return rows.reduce((sum, bonus) => sum + (bonus.recuperado ? -Number(bonus.valor || 0) : Number(bonus.valor || 0)), 0)
}

function BonusList({ shiftId, shift, rows, onSaved, setToast }) {
  const [mode, setMode] = useState('granted')
  const [value, setValue] = useState('')
  const [saving, setSaving] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const recentRows = rows.slice(0, 5)
  const modeOrder = ['granted', 'recovered', 'publicity']
  const net = bonusNetTotal(rows)

  const cycleMode = () => setMode(current => modeOrder[(modeOrder.indexOf(current) + 1) % modeOrder.length])
  const create = async (event) => {
    const key = event.key
    if (!['Enter', '+', '-'].includes(key)) return
    event.preventDefault()
    const amount = parseLocalizedAmount(value)
    if (!(amount > 0)) {
      setToast('Ingresá un monto válido')
      return
    }
    const type = key === '+' ? 'recovered' : key === '-' ? 'publicity' : mode
    setSaving(true)
    try {
      await createBonusLine(shiftId, { value: amount, type })
      setValue('')
      setMode(type)
      setToast(`${bonusTypeLabels[type]} guardado`)
      onSaved()
    } catch (error) {
      setToast(error.message || 'No se pudo guardar el bono')
    } finally {
      setSaving(false)
    }
  }

  return <section className="panel bonus-quick-panel">
    <PanelTitle icon={Gift} title="Bonos del turno" meta={`${rows.length} registros`} />
    <div className="bonus-quick-controls">
      <label className={`bonus-quick-amount bonus-type-${mode}`}>
        <span>$</span>
        <input aria-label="Monto del bono" inputMode="decimal" value={value} placeholder={`Bonos netos: ${moneyWithCents.format(net)}`} onChange={(event) => setValue(event.target.value)} onKeyDown={create} disabled={saving} />
      </label>
      <button type="button" className={`bonus-mode-button bonus-type-${mode}`} title={`Tipo: ${bonusTypeLabels[mode]}. Cambiar tipo`} aria-label={`Tipo de bono: ${bonusTypeLabels[mode]}`} onClick={cycleMode}><ArrowLeftRight size={14} /></button>
      <button type="button" className="icon-button bonus-placeholder-button" title="Agregar bono manual próximamente" aria-label="Agregar bono manual próximamente"><Plus size={14} /></button>
      <button type="button" className="icon-button" title="Ver bonos del turno" aria-label="Ver bonos del turno" onClick={() => setHistoryOpen(true)}><Eye size={14} /></button>
    </div>
    <div className="bonus-recent-list">
      <small>Últimos 5 bonos</small>
      {recentRows.map(bonus => <div className={`bonus-recent-row bonus-type-${bonusTypeOf(bonus)}`} key={bonus.id}>
        <span>{bonusTypeLabels[bonusTypeOf(bonus)]}</span>
        <time>{new Date(bonus.fecha_hora_creacion).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}</time>
        <b>{moneyWithCents.format(bonus.valor)}</b>
      </div>)}
      {!recentRows.length && <span className="bonus-recent-empty">Sin bonos registrados</span>}
    </div>
    {historyOpen && <BonusHistoryModal bonuses={rows} shift={shift} onClose={() => setHistoryOpen(false)} onSaved={onSaved} setToast={setToast} />}
  </section>
}

function LiveBonuses({ bonuses, shift, onSaved, setToast }) {
  return <section className="panel bonus-library">
    <PanelTitle icon={Gift} title="Bonos del turno" meta={`${bonuses.length} registros`} />
    <BonusHistoryContent bonuses={bonuses} shift={shift} onSaved={onSaved} setToast={setToast} />
  </section>
}

function bonusHistoryGroups(bonuses, shift) {
  const parseMinutes = (time) => {
    const [hours, minutes] = String(time || '').split(':').map(Number)
    return Number.isFinite(hours) && Number.isFinite(minutes) ? hours * 60 + minutes : null
  }
  const start = parseMinutes(shift?.dias_turno?.hora_inicio) ?? 0
  const end = parseMinutes(shift?.dias_turno?.hora_fin) ?? (start + 480) % 1440
  const duration = (end - start + 1440) % 1440 || 480
  const count = Math.max(1, Math.ceil(duration / 120))
  const formatTime = (minutes) => `${String(Math.floor((minutes % 1440) / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
  const groups = Array.from({ length: count }, (_, index) => ({
    label: `${formatTime(start + index * 120)} - ${formatTime(start + Math.min((index + 1) * 120, duration))}`,
    items: [],
  }))

  bonuses.forEach(bonus => {
    const created = new Date(bonus.fecha_hora_creacion)
    const minutes = created.getHours() * 60 + created.getMinutes()
    const elapsed = (minutes - start + 1440) % 1440
    const index = Math.min(count - 1, Math.floor(elapsed / 120))
    groups[index].items.push(bonus)
  })
  return groups
}

function BonusHistoryContent({ bonuses, shift, onSaved, setToast }) {
  const [editingNoteId, setEditingNoteId] = useState(null)
  const [noteDraft, setNoteDraft] = useState('')
  const [savingId, setSavingId] = useState(null)
  const groups = bonusHistoryGroups(bonuses, shift)

  const changeType = async (bonus) => {
    const order = ['granted', 'recovered', 'publicity']
    const type = order[(order.indexOf(bonusTypeOf(bonus)) + 1) % order.length]
    setSavingId(bonus.id)
    try {
      await updateBonusLine(bonus.id, { type })
      onSaved()
    } catch (error) {
      setToast(error.message || 'No se pudo cambiar el tipo del bono')
    } finally {
      setSavingId(null)
    }
  }

  const saveNote = async (bonus) => {
    setSavingId(bonus.id)
    try {
      await updateBonusLine(bonus.id, { notes: noteDraft })
      setEditingNoteId(null)
      setNoteDraft('')
      onSaved()
    } catch (error) {
      setToast(error.message || 'No se pudo guardar la nota')
    } finally {
      setSavingId(null)
    }
  }

  const removeBonus = async (bonus) => {
    if (!window.confirm('¿Querés borrar este bono? Esta acción no se puede deshacer.')) return
    setSavingId(bonus.id)
    try {
      await deleteBonusLine(bonus.id)
      onSaved()
    } catch (error) {
      setToast(error.message || 'No se pudo borrar el bono')
    } finally {
      setSavingId(null)
    }
  }

  return <div className="bonus-history-grid">
    {groups.map(group => <section className="bonus-history-group" key={group.label}>
      <h3>{group.label}</h3>
      {group.items.length ? group.items.map(bonus => {
        const type = bonusTypeOf(bonus)
        const time = new Date(bonus.fecha_hora_creacion).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
        return <article className={`bonus-history-item bonus-type-${type}`} key={bonus.id}>
          <div className="bonus-history-main">
            <time>{time}</time>
            <button type="button" className={`bonus-mode-button bonus-type-${type}`} title={`Cambiar tipo de ${bonusTypeLabels[type]}`} aria-label={`Cambiar tipo de ${bonusTypeLabels[type]}`} onClick={() => changeType(bonus)} disabled={savingId === bonus.id}><ArrowLeftRight size={13} /></button>
            <b>{moneyWithCents.format(bonus.valor)}</b>
            <button type="button" className="icon-button" title="Editar nota" aria-label="Editar nota" onClick={() => { setEditingNoteId(bonus.id); setNoteDraft(bonus.notas || '') }} disabled={savingId === bonus.id}><FileText size={13} /></button>
            <button type="button" className="icon-button" title="Borrar bono" aria-label="Borrar bono" onClick={() => removeBonus(bonus)} disabled={savingId === bonus.id}><Trash2 size={13} /></button>
          </div>
          {bonus.notas && editingNoteId !== bonus.id && <p className="bonus-history-note">{bonus.notas}</p>}
          {editingNoteId === bonus.id && <div className="bonus-note-editor"><textarea value={noteDraft} onChange={(event) => setNoteDraft(event.target.value)} placeholder="Nota del bono" /><button type="button" className="icon-button" title="Guardar nota" onClick={() => saveNote(bonus)} disabled={savingId === bonus.id}><Check size={13} /></button><button type="button" className="icon-button" title="Cancelar edición" onClick={() => setEditingNoteId(null)} disabled={savingId === bonus.id}><X size={13} /></button></div>}
        </article>
      }) : <p className="bonus-history-empty">Sin bonos</p>}
    </section>)}
  </div>
}

function BonusHistoryModal({ bonuses, shift, onClose, onSaved, setToast }) {
  return <div className="modal-backdrop bonus-history-backdrop" onClick={onClose}>
    <section className="bonus-history-modal" role="dialog" aria-modal="true" aria-label="Bonos del turno" onClick={(event) => event.stopPropagation()}>
      <header><div><h2>Bonos del turno</h2><span>Revisá y editá los registros del turno</span></div><button type="button" className="modal-close" title="Cerrar" aria-label="Cerrar" onClick={onClose}><X size={17} /></button></header>
      <div className="bonus-history-scroll"><BonusHistoryContent bonuses={bonuses} shift={shift} onSaved={onSaved} setToast={setToast} /></div>
      <footer><button type="button" className="primary-button" onClick={onClose}>Listo <Check size={14} /></button></footer>
    </section>
  </div>
}
function ChipSummary({ chips, setToast, onChipFinalSaved, onChipFinalPreview }) {
  const formatValue = (value) => value == null ? '' : Number(value).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const parseValue = (value) => {
    const normalized = String(value).trim().replace(/\s/g, '').replace(/\./g, '').replace(',', '.')
    if (!normalized) return null
    const parsed = Number(normalized)
    return Number.isFinite(parsed) ? parsed : Number.NaN
  }
  const [draftValues, setDraftValues] = useState(() => Object.fromEntries(chips.map(chip => [chip.id, formatValue(chip.fichas_final)])))

  useEffect(() => {
    setDraftValues(Object.fromEntries(chips.map(chip => [chip.id, formatValue(chip.fichas_final)])))
  }, [chips])

  const saveFinal = async (chip) => {
    const rawValue = draftValues[chip.id] ?? formatValue(chip.fichas_final)
    const nextValue = parseValue(rawValue)
    if (rawValue.trim() && (!Number.isFinite(nextValue) || nextValue < 0)) {
      setToast('Ingresá un valor final válido, igual o mayor a cero')
      setDraftValues(current => ({ ...current, [chip.id]: formatValue(chip.fichas_final) }))
      onChipFinalPreview(chip.id, chip.fichas_final == null ? null : Number(chip.fichas_final))
      return
    }
    const savedValue = chip.fichas_final == null ? null : Number(chip.fichas_final)
    if (nextValue === savedValue) return
    try {
      await updateChipFinal(chip.id, nextValue)
      onChipFinalSaved(chip.id, nextValue)
      setToast('Ficha final guardada')
    } catch (error) {
      setToast(error.message || 'No se pudo guardar la ficha final')
      setDraftValues(current => ({ ...current, [chip.id]: formatValue(chip.fichas_final) }))
      onChipFinalPreview(chip.id, chip.fichas_final == null ? null : Number(chip.fichas_final))
    }
  }

  return <section className="panel chip-summary">
    <PanelTitle icon={Boxes} title="Fichas finales" />
    {chips.length ? <div className="chip-final-list">{chips.map(chip => (
      <div className="chip-final-field" key={chip.id}>
        <span>Ficha Final ({chip.plataformas?.nombre || 'Plataforma'})</span>
        <div className="chip-final-value">
          <b>$</b>
          <input
            aria-label={`Ficha final ${chip.plataformas?.nombre || 'Plataforma'}`}
            inputMode="decimal"
            value={draftValues[chip.id] ?? formatValue(chip.fichas_final)}
            onChange={(event) => {
              const value = event.target.value
              const parsed = parseValue(value)
              setDraftValues(current => ({ ...current, [chip.id]: value }))
              if (parsed == null || Number.isFinite(parsed)) onChipFinalPreview(chip.id, parsed)
            }}
            onBlur={() => saveFinal(chip)}
            onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur() }}
            placeholder="0,00"
          />
        </div>
        {(() => {
          const parsedFinal = parseValue(draftValues[chip.id] ?? formatValue(chip.fichas_final))
          const finalValue = parsedFinal == null ? 0 : parsedFinal
          const difference = Number.isFinite(finalValue) ? finalValue - Number(chip.fichas_inicial || 0) : null
          const differenceTone = difference == null || difference === 0 ? 'neutral' : difference > 0 ? 'positive' : 'negative'
          return <small className={differenceTone}>{difference == null ? '—' : `$ ${difference.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}</small>
        })()}
      </div>
    ))}</div> : <EmptyInline text="No hay fichas configuradas para este turno." />}
  </section>
}
function AccountMatrix({ accounts, holders, wallets, total, setToast, onSaved, onAccountValueDraft }) {
  const [flagOverrides, setFlagOverrides] = useState({})
  const saveAccount = async (account, event) => {
    const input = event.currentTarget
    const value = parseLocalizedAmount(input.value)
    if (value == null || value < 0) {
      input.value = account.savedAmount ? numberWithCents.format(account.savedAmount) : ''
      onAccountValueDraft(account.id, undefined)
      setToast('Ingresá un valor válido, igual o mayor a cero')
      return
    }
    input.value = value ? numberWithCents.format(value) : ''
    if (value === account.savedAmount) {
      onAccountValueDraft(account.id, undefined)
      return
    }
    try {
      await updateAccountValue(account.id, value)
      onSaved()
    } catch {
      onAccountValueDraft(account.id, undefined)
      input.value = account.savedAmount ? numberWithCents.format(account.savedAmount) : ''
      setToast('No se pudo guardar el valor de la cuenta')
    }
  }
  const saveFlag = (account, field, checked) => {
    const previousFlags = flagOverrides[account.id] || { cobros: Boolean(account.cobros), retiros: Boolean(account.retiros) }
    const nextFlags = { ...previousFlags, [field]: checked }
    setFlagOverrides(current => ({ ...current, [account.id]: nextFlags }))
    updateAccountFlags(account.id, field, checked).then(() => onSaved()).catch(() => {
      setFlagOverrides(current => ({ ...current, [account.id]: previousFlags }))
      setToast(`No se pudo guardar ${field === 'cobros' ? 'cobros' : 'retiros'}`)
    })
  }
  const columns = { '--wallet-count': wallets.length }

  return <section className="panel account-panel">
    <div className="matrix-wrap" style={columns}>
      {accounts.length ? <>
        <div className="matrix-row matrix-head">
          <strong className="matrix-box-heading"><WalletCards size={13} />Caja</strong>
          {wallets.map(wallet => <span key={wallet}>{wallet}</span>)}
          <span>Total</span>
        </div>
        {holders.map(holder => {
          const holderAccounts = accounts.filter(account => account.holder === holder)
          const holderTotal = holderAccounts.reduce((sum, account) => sum + account.amount, 0)
          return <div className="matrix-row" key={holder}>
            <strong>{holder}</strong>
            {wallets.map(wallet => {
              const account = holderAccounts.find(item => item.wallet === wallet)
              if (!account) return <span className="matrix-account-empty" key={`${holder}-${wallet}`} aria-hidden="true" />
              const flags = flagOverrides[account.id] || account
              const valueTone = flags.cobros && flags.retiros ? 'both-enabled' : flags.cobros ? 'collecting' : flags.retiros ? 'withdrawing' : ''
              return <div className="matrix-account-cell" key={`${holder}-${wallet}`}>
                <label className={`matrix-value ${valueTone}`}>
                  <span>$</span>
                  <input defaultValue={account.savedAmount ? numberWithCents.format(account.savedAmount) : ''} placeholder="-" onFocus={(event) => event.target.select()} onChange={(event) => {
                    const value = parseLocalizedAmount(event.target.value)
                    if (value !== null && value >= 0) onAccountValueDraft(account.id, value)
                  }} onBlur={(event) => saveAccount(account, event)} aria-label={`Valor ${wallet}, ${holder}`} />
                </label>
                <div className="matrix-account-flags">
                  <label className="matrix-flag" title="Cobros">
                    <input type="checkbox" aria-label={`Cobros ${wallet}, ${holder}`} checked={Boolean(flags.cobros)} onChange={(event) => saveFlag(account, 'cobros', event.target.checked)} />
                  </label>
                  <label className="matrix-flag" title="Retiros">
                    <input type="checkbox" aria-label={`Retiros ${wallet}, ${holder}`} checked={Boolean(flags.retiros)} onChange={(event) => saveFlag(account, 'retiros', event.target.checked)} />
                  </label>
                </div>
              </div>
            })}
            <b>{moneyWithCents.format(holderTotal)}</b>
          </div>
        })}
        <div className="matrix-total">
          <span>Total billetera</span>
          {wallets.map(wallet => <b key={wallet}>{moneyWithCents.format(accounts.filter(account => account.wallet === wallet).reduce((sum, account) => sum + account.amount, 0))}</b>)}
          <strong>{moneyWithCents.format(total)}</strong>
        </div>
      </> : <EmptyInline text="No hay cuentas vinculadas al turno abierto." />}
    </div>
  </section>
}
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
function LegacyBonusList({ shiftId, rows, onSaved, setToast }) {
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
  return <><section className="panel stats-toolbar"><div><span className="eyebrow">Turno actual</span><h2>{data.shift ? new Date(data.shift.fecha_hora_inicio).toLocaleString('es-AR') : 'Sin turno abierto'}</h2></div><div className="stats-filters"><span className="muted-copy">Las estadísticas históricas estarán disponibles cuando existan turnos cerrados.</span></div></section><div className="stats-grid"><section className="panel stat-card featured"><div className="stat-head"><h2>Turno actual</h2><small>1 turno</small></div><h3>GENERAL</h3><div className="stat-line"><span>Caja inicial</span><b>{money.format(data.shift?.caja_inicial || 0)}</b></div><div className="stat-line"><span>Propinas</span><b>{money.format(tips)}</b></div><div className="stat-line"><span>Gastos</span><b>{money.format(expenses)}</b></div><h3>BONOS</h3><div className="stat-line"><span>Bonos netos</span><b>{money.format(bonuses)}</b></div><h3>DATOS</h3><div className="stat-line"><span>Cuentas activas</span><b>{data.accounts.length}</b></div><div className="stat-line"><span>Movimientos</span><b>{data.tips.length + data.expenses.length + data.bonuses.length}</b></div></section><section className="panel stat-card"><EmptyInline text="No hay otros turnos cerrados en el rango cargado." /></section></div></>
}

function LiveLogistics({ data, setToast }) {
  const [filter, setFilter] = useState('')
  const rows = data.logistics.filter(row => {
    const account = row.cuentas_x_turno?.cuentas
    const text = `${account?.titulares?.nombre || ''} ${account?.billeteras?.nombre || ''}`
    return text.toLowerCase().includes(filter.toLowerCase())
  })

  return <>
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

function LiveUsersView({ users }) { const [expanded, setExpanded] = useState(null); return <><section className="panel directory"><PanelTitle icon={Users} title="Usuarios" meta={`${users.length} registros`} action={<button className="primary-button"><Plus size={14} /> Nuevo usuario</button>} />{users.map(user => { const name = user.nombres_usuario?.[0]?.nombre || `Usuario #${user.id}`; return <div className={`directory-row ${expanded === user.id ? 'expanded' : ''}`} key={user.id}><button className="expand-button" onClick={() => setExpanded(expanded === user.id ? null : user.id)}>{expanded === user.id ? <ChevronDown size={15} /> : <ChevronRight size={15} />}</button><b>{name}</b><div className="tags">{user.titulares_usuario?.map(holder => <span key={holder.id}>{holder.nombre}</span>)}</div><button className="icon-button"><Settings2 size={15} /></button>{expanded === user.id && <div className="user-detail"><label>Nombre<input defaultValue={name} /></label><label>Teléfono<input defaultValue={user.telefonos_usuario?.[0]?.numero || ''} /></label><label>Titular<input defaultValue={user.titulares_usuario?.[0]?.nombre || ''} /></label><label>Estado<input defaultValue={user.bloqueado ? 'Bloqueado' : 'Activo'} readOnly /></label></div>}</div> })}{!users.length && <EmptyInline text="No hay usuarios registrados en Supabase." />}</section></> }

function LiveSettings({ data, selectedBoxId, setToast, onSaved }) {
  const appImageInputRef = useRef(null)
  const [dragState, setDragState] = useState({ type: null, index: null })
  const [editingSnapshot, setEditingSnapshot] = useState({ holders: {}, wallets: {} })
  const [localData, setLocalData] = useState(data)
  const [formatting, setFormatting] = useState(false)
  const [selectedWeekdays, setSelectedWeekdays] = useState([])
  const [dayDraft, setDayDraft] = useState({ typeId: '', name: '', start: '08:00', end: '18:00', crossesMidnight: false })
  const [turnDraft, setTurnDraft] = useState({ dayId: '', initialAmount: '0' })
  const weekdayLabels = ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom']
  const currentBoxId = selectedBoxId ?? data.shift?.caja_id ?? data.boxes?.[0]?.id ?? null
  const currentBox = data.boxes?.find((box) => String(box.id) === String(currentBoxId))
  const currentShiftTypes = currentBoxId == null ? [] : (data.shiftTypes || []).filter((type) => String(type.caja_id) === String(currentBoxId))
  const currentShiftDays = (data.shiftDays || []).filter((day) => currentShiftTypes.some((type) => String(type.id) === String(day.tipo_turno_id)))
  const currentActiveTurns = (data.activeTurns || []).filter((turn) => String(turn.caja_id) === String(currentBoxId))

  useEffect(() => {
    setDayDraft((current) => ({ ...current, typeId: '' }))
    setTurnDraft((current) => ({ ...current, dayId: '' }))
  }, [currentBoxId])
  const appImageReference = data.appConfig?.[0]?.imagen_mini || data.appConfig?.[0]?.imagen
  const appImagePreview = getStoragePublicUrl(appImageReference)

  useEffect(() => {
    setLocalData(data)
  }, [data])

  const persistUpdate = async (action, successMessage) => {
    try {
      await action()
      const fresh = await refreshLocalData()
      setLocalData(fresh)
      onSaved(fresh)
      setToast(successMessage)
    } catch (error) {
      setToast(error.message || 'No se pudo guardar la configuración')
    }
  }

  const refreshLocalData = async () => {
    const fresh = await loadCurrentShiftData(currentBoxId)
    setLocalData(fresh)
    return fresh
  }

  const handleFormatDatabase = async () => {
    if (!window.confirm('Esto eliminará todos los datos de la aplicación y reiniciará los IDs. ¿Continuar?')) return
    if (!window.confirm('Confirmá nuevamente: esta acción no se puede deshacer.')) return
    setFormatting(true)
    try {
      await formatDatabase()
      setToast('Base de datos formateada e IDs reiniciados')
      onSaved()
    } catch (error) {
      setToast(error.message || 'No se pudo formatear la base de datos')
    } finally {
      setFormatting(false)
    }
  }

  const resolveBySnapshot = (type, index, fallbackName) => {
    const source = type === 'holders' ? (localData.holders || []) : (localData.wallets || [])
    const snapshot = editingSnapshot[type]?.[index]
    if (snapshot?.id) {
      return source.find((item) => String(item.id) === String(snapshot.id)) || source.find((item) => item.nombre === snapshot.name) || null
    }
    return source.find((item) => item.nombre === fallbackName) || null
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

    const holdersFromData = sortByOrder(buildUniqueItems(localData.holders || localData.accounts || [], (entry) => (entry?.nombre ? entry : (entry?.cuentas?.titulares || { id: entry?.cuenta_id, nombre: 'Sin titular' }))))
    const walletsFromData = sortByOrder(buildUniqueItems(localData.wallets || localData.accounts || [], (entry) => (entry?.nombre ? entry : (entry?.cuentas?.billeteras || { id: entry?.cuenta_id, nombre: 'Sin billetera' }))))
    const availability = {}
    holdersFromData.forEach((holder) => {
      const holderName = holder.nombre || 'Sin titular'
      availability[holderName] = {}
      walletsFromData.forEach((wallet) => {
        const walletName = wallet.nombre || 'Sin billetera'
        const isAvailable = (localData.accounts || []).some((account) => {
          const accountHolder = account?.cuentas?.titulares?.nombre || localData.holders?.find((item) => item.id === account?.titular_id)?.nombre
          const accountWallet = account?.cuentas?.billeteras?.nombre || localData.wallets?.find((item) => item.id === account?.billetera_id)?.nombre
          return accountHolder === holderName && accountWallet === walletName
        })
        availability[holderName][walletName] = isAvailable
      })
    })

    return {
      boxes: (localData.boxes || []).map((box) => {
        const color = localData.colors?.find((item) => item.id === box.color_id) || box.colores
        return { id: box.id, title: box.nombre || 'Caja', colorId: box.color_id, colorHex: color?.hex || null }
      }),
      accounts: {
        holders: holdersFromData.map((holder) => holder.nombre || 'Sin titular'),
        wallets: walletsFromData.map((wallet) => wallet.nombre || 'Sin billetera'),
        availability,
        walletModes: Object.fromEntries((walletsFromData.map((wallet) => [wallet.nombre || 'Sin billetera', wallet.tipos_billetera?.nombre || localData.walletTypes?.[0]?.nombre || 'Cobros y retiros']))),
      },
      expenses: (localData.expenseTypes || []).map((expense) => ({ id: expense.id, name: expense.nombre || 'Gasto', inverted: Boolean(expense.invertir_signo) })),
      platforms: (localData.platforms || [])
        .filter(platform => String(platform.caja_id) === String(currentBoxId))
        .sort((a, b) => a.id - b.id)
        .map((platform) => {
          const color = localData.colors?.find((item) => item.id === platform.color_id)
          return { id: platform.id, nombre: platform.nombre || 'Plataforma', colorId: platform.color_id, colorHex: color?.hex || null }
        }),
      bonusConditions: (localData.bonusConditions || []).map((condition) => ({ id: condition.id, label: condition.nombre || 'Condición', allow: Boolean(condition.plataforma) })),
    }
  }, [localData.accounts, localData.boxes, localData.colors, localData.holders, localData.wallets, localData.walletTypes, localData.platforms, localData.expenseTypes, localData.bonusConditions, currentBoxId])

  const [tab, setTab] = useState('boxes')
  const [draft, setDraft] = useState(buildDefaultConfig)
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    setDraft(buildDefaultConfig)
  }, [buildDefaultConfig])

  const updateAccounts = (patch) => {
    setDraft((current) => ({ ...current, accounts: { ...current.accounts, ...patch } }))
  }

  const reorderAccountEntries = async (type, fromIndex, toIndex) => {
    if (dragState.type !== type || fromIndex === toIndex || fromIndex === null || toIndex === null) return

    const key = type === 'holders' ? 'holders' : 'wallets'
    const previous = [...draft.accounts[key]]
    const next = [...previous]
    const [moved] = next.splice(fromIndex, 1)
    next.splice(toIndex, 0, moved)
    updateAccounts({ [key]: next })

    const source = type === 'holders' ? (localData.holders || []) : (localData.wallets || [])
    const orderedIds = next
      .map((label) => source.find((item) => item.nombre === label)?.id)
      .filter(Boolean)

    try {
      await reorderEntityOrder(type === 'holders' ? 'titulares' : 'billeteras', orderedIds)
      onSaved()
    } catch (error) {
      updateAccounts({ [key]: previous })
      setToast(error.message || 'No se pudo guardar el orden')
    }
  }

  const getLatestAccountData = async () => {
    const latest = await loadCurrentShiftData(data?.shift?.caja_id ?? null)
    return latest
  }

  const toggleWallet = async (holderName, walletName) => {
    const latest = await getLatestAccountData()
    const holder = latest.holders?.find((item) => item.nombre === holderName)
    const wallet = latest.wallets?.find((item) => item.nombre === walletName)

    if (!holder || !wallet) {
      return
    }

    const existingAccount = (latest.accounts || []).find((account) => {
      const accountHolder = account?.cuentas?.titulares?.nombre || latest.holders?.find((item) => item.id === account?.titular_id)?.nombre
      const accountWallet = account?.cuentas?.billeteras?.nombre || latest.wallets?.find((item) => item.id === account?.billetera_id)?.nombre
      return accountHolder === holderName && accountWallet === walletName
    })

    const currentChecked = Boolean(existingAccount?.cuentas?.activa ?? existingAccount?.cuentas?.check ?? existingAccount?.cuentas?.activo ?? draft.accounts.availability?.[holderName]?.[walletName] ?? true)
    const nextValue = !currentChecked

    setDraft((current) => ({
      ...current,
      accounts: {
        ...current.accounts,
        availability: {
          ...(current.accounts?.availability || {}),
          [holderName]: {
            ...((current.accounts?.availability || {})[holderName] || {}),
            [walletName]: nextValue,
          },
        },
      },
    }))

    try {
      if (!existingAccount?.cuentas) {
        const created = await createAccount({
          holderId: holder.id,
          walletId: wallet.id,
          alias: '',
          cuil: '',
          password: '',
          notes: '',
          typeId: latest.accountTypes?.[0]?.id ?? data.accountTypes?.[0]?.id ?? undefined,
          active: nextValue,
        })

        if (latest.shift?.id && latest.shift?.caja_id) {
          await setAccountAvailability({
            shiftId: latest.shift.id,
            boxId: latest.shift.caja_id,
            accountId: created.id,
            enabled: nextValue,
            value: 0,
            canCollect: false,
            canWithdraw: false,
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

        if (latest.shift?.id && latest.shift?.caja_id && !nextValue) {
          await setAccountAvailability({
            shiftId: latest.shift.id,
            boxId: latest.shift.caja_id,
            accountId: existingAccount.cuentas.id,
            enabled: false,
            value: existingAccount.valor ?? 0,
            canCollect: false,
            canWithdraw: false,
          })
        }
      }

      setToast(nextValue ? 'Cuenta activada' : 'Cuenta desactivada')
      const refreshed = await refreshLocalData()
      if (refreshed?.accounts) {
        setDraft((current) => ({
          ...current,
          accounts: {
            ...current.accounts,
            availability: {
              ...(current.accounts?.availability || {}),
              [holderName]: {
                ...((current.accounts?.availability || {})[holderName] || {}),
                [walletName]: Boolean(
                  (refreshed.accounts || []).find((account) => {
                    const accountHolder = account?.cuentas?.titulares?.nombre || refreshed.holders?.find((item) => item.id === account?.titular_id)?.nombre
                    const accountWallet = account?.cuentas?.billeteras?.nombre || refreshed.wallets?.find((item) => item.id === account?.billetera_id)?.nombre
                    return accountHolder === holderName && accountWallet === walletName
                  })?.cuentas?.activa ?? nextValue
                ),
              },
            },
          },
        }))
      }
    } catch (error) {
      setDraft((current) => ({
        ...current,
        accounts: {
          ...current.accounts,
          availability: {
            ...(current.accounts?.availability || {}),
            [holderName]: {
              ...((current.accounts?.availability || {})[holderName] || {}),
              [walletName]: currentChecked,
            },
          },
        },
      }))
      setToast(error.message || 'No se pudo guardar la cuenta')
    }
  }

  const buildTargetSetting = (holderName, walletName, sourceData = localData) => {
    const existingAccount = (sourceData?.accounts || []).find((account) => {
      const accountHolder = account?.cuentas?.titulares?.nombre || sourceData?.holders?.find((item) => item.id === account?.titular_id)?.nombre
      const accountWallet = account?.cuentas?.billeteras?.nombre || sourceData?.wallets?.find((item) => item.id === account?.billetera_id)?.nombre
      return accountHolder === holderName && accountWallet === walletName
    })

    const account = existingAccount?.cuentas || null
    return {
      holder: holderName,
      wallet: walletName,
      accountId: account?.id || existingAccount?.cuenta_id || null,
      typeId: account?.tipo_cuenta_id || localData.accountTypes?.[0]?.id || '',
      alias: account?.alias || '',
      cuil: account?.cuil || '',
      password: account?.patron || '',
      note: account?.notas || '',
    }
  }

  const saveAccountSettings = async () => {
    if (!selected) return
    try {
      const latest = await refreshLocalData()
      const holder = latest.holders?.find((item) => item.nombre === selected.holder)
      const wallet = latest.wallets?.find((item) => item.nombre === selected.wallet)

      if (!holder || !wallet) {
        setToast('No se encontró el titular o la billetera de esta cuenta')
        return
      }

      const payload = {
        alias: selected.alias || '',
        cuil: selected.cuil || '',
        password: selected.password || '',
        notes: selected.note || '',
        typeId: selected.typeId || latest.accountTypes?.[0]?.id || data.accountTypes?.[0]?.id || null,
      }

      if (!selected.accountId) {
        const account = await createAccount({
          holderId: holder.id,
          walletId: wallet.id,
          ...payload,
        })

        if (latest.shift?.id && latest.shift?.caja_id) {
          await setAccountAvailability({
            shiftId: latest.shift.id,
            boxId: latest.shift.caja_id,
            accountId: account.id,
            enabled: true,
            value: 0,
            canCollect: false,
            canWithdraw: false,
          })
        }
      } else {
        await updateAccount(selected.accountId, payload)
      }

      setSelected(null)
      setToast('Cuenta guardada')
      const refreshed = await refreshLocalData()
      setDraft((current) => ({
        ...current,
        accounts: {
          ...current.accounts,
          availability: {
            ...(current.accounts?.availability || {}),
            [selected.holder]: {
              ...((current.accounts?.availability || {})[selected.holder] || {}),
              [selected.wallet]: Boolean((refreshed.accounts || []).find((account) => {
                const accountHolder = account?.cuentas?.titulares?.nombre || refreshed.holders?.find((item) => item.id === account?.titular_id)?.nombre
                const accountWallet = account?.cuentas?.billeteras?.nombre || refreshed.wallets?.find((item) => item.id === account?.billetera_id)?.nombre
                return accountHolder === selected.holder && accountWallet === selected.wallet
              })?.cuentas?.activa ?? true),
            },
          },
        },
      }))
    } catch (error) {
      setToast(error.message || 'No se pudo guardar la cuenta')
    }
  }

  const addBlankConfigItem = (type) => {
    const key = type === 'holders' ? 'holders' : 'wallets'
    updateAccounts({ [key]: [...(draft.accounts?.[key] || []), ''] })
  }

  const renderTabButton = (id, label, Icon) => (
    <button key={id} type="button" className={tab === id ? 'active' : ''} onClick={() => setTab(id)}><Icon size={15} /> {label}</button>
  )

  const accountEntryRows = draft.accounts.holders.map((holder, holderIndex) => {
    const holderName = holder || 'Sin titular'
    return <div key={`holder-row-${holderIndex}`} className="availability-row" style={{ '--wallet-count': draft.accounts.wallets.length }}>
      <b>{holderName}</b>
      {draft.accounts.wallets.map((wallet, walletIndex) => {
        const walletName = wallet || 'Sin billetera'
        const match = (data.accounts || []).find((account) => {
          const accountHolder = account?.cuentas?.titulares?.nombre || data.holders?.find((item) => item.id === account?.titular_id)?.nombre
          const accountWallet = account?.cuentas?.billeteras?.nombre || data.wallets?.find((item) => item.id === account?.billetera_id)?.nombre
          return accountHolder === holderName && accountWallet === walletName
        })
        const enabled = Boolean(draft.accounts.availability?.[holderName]?.[walletName] ?? match?.cuentas?.activa ?? match?.cuentas?.check ?? match?.cuentas?.activo ?? true)
        return <div className="account-config-cell" key={`holder-${holderIndex}-wallet-${walletIndex}`}>
          <label className="toggle-cell" aria-label={`Activar ${holderName} · ${walletName}`}>
            <input type="checkbox" checked={enabled} onChange={() => toggleWallet(holderName, walletName)} />
            <span />
          </label>
          <button type="button" className="account-settings-button" title={`Configurar ${holderName} · ${walletName}`} onClick={async () => {
            const latest = await refreshLocalData()
            setSelected(buildTargetSetting(holderName, walletName, latest))
          }}>
            <Settings2 size={14} />
          </button>
        </div>
      })}
    </div>
  })

  return <>
    <div className="settings-page">
      <div className="settings-tabs">
        {renderTabButton('boxes', 'Cajas', Banknote)}
        {renderTabButton('turns', 'Turnos', Clock3)}
        {renderTabButton('accounts', 'Matriz de cuentas', WalletCards)}
        {renderTabButton('expenses', 'Gastos', FileText)}
        {renderTabButton('platforms', 'Control de fichas', Boxes)}
        {renderTabButton('users', 'Usuarios', Users)}
        {renderTabButton('bonuses', 'Bonos', Gift)}
        {renderTabButton('goals', 'Objetivos', Target)}
        {renderTabButton('app', 'Aplicación', Settings2)}
      </div>

      <section className="settings-intro">
        <span className="eyebrow">Configuración</span>
        <h2>{tab === 'boxes' ? 'Cajas' : tab === 'turns' ? 'Turnos' : tab === 'accounts' ? 'Matriz de cuentas' : tab === 'expenses' ? 'Gastos' : tab === 'platforms' ? 'Control de fichas' : tab === 'users' ? 'Usuarios' : tab === 'bonuses' ? 'Bonos' : tab === 'goals' ? 'Objetivos' : 'Aplicación'}</h2>
      </section>

      {tab === 'boxes' && <>
        <section className="config-list">
            <div className="config-list-head"><h3>Mis cajas</h3><span>{draft.boxes.length} espacios</span></div>
            {draft.boxes.map((box, index) => (
              <div className="config-list-row box-config-row" key={box.id || index}>
                <span className="box-config-dot" style={{ backgroundColor: box.colorHex || '#879598' }} />
                <input value={box.title} onChange={(event) => setDraft((current) => ({ ...current, boxes: current.boxes.map((item, itemIndex) => itemIndex === index ? { ...item, title: event.target.value } : item) }))} onBlur={async (event) => {
                  const value = event.target.value.trim()
                  if (!box.id || !value) return
                  const savedName = localData.boxes?.find((item) => item.id === box.id)?.nombre
                  if (value === savedName) return
                  await persistUpdate(() => updateBox(box.id, { name: value, colorId: box.colorId }), 'Caja actualizada en Supabase')
                }} placeholder="Nombre" />
                <select value={box.colorId == null ? '' : String(box.colorId)} onChange={(event) => {
                  const nextColorId = event.target.value || null
                  const selectedColor = localData.colors?.find((color) => String(color.id) === nextColorId)
                  setDraft((current) => ({ ...current, boxes: current.boxes.map((item, itemIndex) => itemIndex === index ? { ...item, colorId: nextColorId, colorHex: selectedColor?.hex || null } : item) }))
                  if (box.id) persistUpdate(() => updateBox(box.id, { name: box.title, colorId: nextColorId }), 'Color de caja actualizado en Supabase')
                }} aria-label="Color">
                  {localData.colors?.length ? localData.colors.map((color) => <option value={String(color.id)} key={color.id}>{color.nombre}</option>) : <option value="">Sin colores disponibles</option>}
                </select>
                <button type="button" className="delete-button" title="Eliminar caja" onClick={() => {
                  if (!box.id) return
                  persistUpdate(() => deleteBox(box.id), 'Caja eliminada de Supabase')
                }}><X size={14} /></button>
              </div>
            ))}
            <button type="button" className="config-add" onClick={async () => {
              const name = 'Nueva caja'
              await persistUpdate(() => createBox({ name, colorId: localData.colors?.[0]?.id ?? null }), 'Caja creada en Supabase')
            }}><Plus size={15} /> Agregar caja</button>
        </section>
      </>}

      {tab === 'turns' && <>
        <div className="config-two-columns">
          <section className="config-card">
            <div className="config-list-head"><h3>Tipos de turno</h3><span>{currentShiftTypes.length} registros</span></div>
            {currentShiftTypes.map((type) => (
              <div className="config-list-row" key={type.id} style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: '8px', alignItems: 'center' }}>
                <input defaultValue={type.nombre || ''} onBlur={async (event) => {
                  const next = event.target.value.trim()
                  if (!next || next === type.nombre) return
                  await persistUpdate(() => updateShiftType(type.id, { name: next, colorId: type.color_id }), 'Tipo de turno actualizado en Supabase')
                }} placeholder="Nombre del tipo" />
                <button type="button" className="delete-button" title="Eliminar tipo de turno" onClick={() => persistUpdate(() => deleteShiftType(type.id), 'Tipo de turno eliminado de Supabase')}><X size={14} /></button>
              </div>
            ))}
            <button type="button" className="config-add" onClick={() => persistUpdate(() => {
              if (!currentBoxId) throw new Error('No hay una caja seleccionada')
              return createShiftType({ boxId: currentBoxId, name: 'Nuevo turno', colorId: currentBox?.color_id ?? data.colors?.[0]?.id ?? null })
            }, 'Tipo de turno creado en Supabase')}><Plus size={15} /> Agregar tipo de turno</button>
          </section>

          <section className="config-card">
            <div className="config-list-head"><h3>Crear días de turno</h3><span>Un registro por cada día seleccionado</span></div>
            <div className="setup-fields">
              <label>Tipo de turno<select value={dayDraft.typeId} onChange={(event) => setDayDraft(current => ({ ...current, typeId: event.target.value }))}><option value="">Seleccionar tipo</option>{currentShiftTypes.map(type => <option value={type.id} key={type.id}>{type.nombre}</option>)}</select></label>
              <label>Nombre<input value={dayDraft.name} onChange={(event) => setDayDraft(current => ({ ...current, name: event.target.value }))} placeholder="Ej. Horario habitual" /></label>
              <label>Inicio<input type="time" value={dayDraft.start} onChange={(event) => setDayDraft(current => ({ ...current, start: event.target.value }))} /></label>
              <label>Fin<input type="time" value={dayDraft.end} onChange={(event) => setDayDraft(current => ({ ...current, end: event.target.value }))} /></label>
            </div>
            <div className="weekday-picker">{weekdayLabels.map((label, index) => <button type="button" key={label} className={selectedWeekdays.includes(index + 1) ? 'primary-button weekday-toggle active' : 'secondary-button weekday-toggle inactive'} onClick={() => setSelectedWeekdays(current => current.includes(index + 1) ? current.filter(day => day !== index + 1) : [...current, index + 1])}>{label}</button>)}</div>
            <label className="toggle-cell shift-midnight-toggle"><span>Cruza medianoche</span><input type="checkbox" checked={dayDraft.crossesMidnight} onChange={(event) => setDayDraft(current => ({ ...current, crossesMidnight: event.target.checked }))} /><span aria-hidden="true" /></label>
            <button type="button" className="config-add" onClick={() => persistUpdate(async () => {
              if (!dayDraft.typeId || !dayDraft.name.trim() || !selectedWeekdays.length) throw new Error('Seleccioná tipo, nombre y al menos un día')
              await createDayShifts({ typeId: dayDraft.typeId, name: dayDraft.name, weekdays: selectedWeekdays, start: dayDraft.start, end: dayDraft.end, crossesMidnight: dayDraft.crossesMidnight })
              setSelectedWeekdays([])
            }, 'Días de turno creados en Supabase')}><Plus size={15} /> Crear días seleccionados</button>
          </section>
        </div>

        <section className="config-card">
          <div className="config-list-head"><h3>Días configurados</h3><span>{currentShiftDays.length} registros</span></div>
          {currentShiftDays.map((day) => <div className="config-list-row" key={day.id} style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr auto auto auto auto', gap: '8px', alignItems: 'center' }}>
            <span><strong>{currentShiftTypes.find(type => String(type.id) === String(day.tipo_turno_id))?.nombre || 'Tipo de turno'}</strong><br /><small>{day.nombre}</small></span>
            <b>{weekdayLabels[(day.dia_semana || 1) - 1] || '?'}</b>
            <input type="time" defaultValue={day.hora_inicio || '08:00'} onBlur={(event) => {
              if (event.target.value === (day.hora_inicio || '08:00')) return
              persistUpdate(() => updateDayShift(day.id, { name: day.nombre || 'Día', weekday: day.dia_semana, start: event.target.value, end: day.hora_fin || '18:00', crossesMidnight: Boolean(day.cruza_medianoche) }), 'Hora de inicio actualizada')
            }} />
            <input type="time" defaultValue={day.hora_fin || '18:00'} onBlur={(event) => {
              if (event.target.value === (day.hora_fin || '18:00')) return
              persistUpdate(() => updateDayShift(day.id, { name: day.nombre || 'Día', weekday: day.dia_semana, start: day.hora_inicio || '08:00', end: event.target.value, crossesMidnight: Boolean(day.cruza_medianoche) }), 'Hora de fin actualizada')
            }} />
            <label className="toggle-cell" title="Cruza medianoche"><input type="checkbox" checked={Boolean(day.cruza_medianoche)} onChange={(event) => persistUpdate(() => updateDayShift(day.id, { name: day.nombre || 'Día', weekday: day.dia_semana, start: day.hora_inicio || '08:00', end: day.hora_fin || '18:00', crossesMidnight: event.target.checked }), 'Cruce de medianoche actualizado')} /><span /></label>
            <button type="button" className="delete-button" title="Eliminar día" onClick={() => persistUpdate(() => deleteDayShift(day.id), 'Día de turno eliminado de Supabase')}><X size={14} /></button>
          </div>)}
          {!currentShiftDays.length && <EmptyInline text="Todavía no hay días de turno configurados para esta caja." />}
        </section>

        <section className="config-card" style={{ marginTop: '18px' }}>
          <div className="config-list-head"><h3>Turnos activos</h3><span>{currentActiveTurns.length} abiertos</span></div>
          <div className="setup-fields">
            <label>Día configurado<select value={turnDraft.dayId} onChange={(event) => setTurnDraft(current => ({ ...current, dayId: event.target.value }))}><option value="">Seleccionar día</option>{currentShiftDays.map(day => <option value={day.id} key={day.id}>{currentShiftTypes.find(type => String(type.id) === String(day.tipo_turno_id))?.nombre || 'Turno'} · {weekdayLabels[(day.dia_semana || 1) - 1]} · {day.nombre}</option>)}</select></label>
            <label>Caja inicial<input type="number" min="0" step="0.01" value={turnDraft.initialAmount} onChange={(event) => setTurnDraft(current => ({ ...current, initialAmount: event.target.value }))} /></label>
          </div>
          <button type="button" className="config-add" onClick={() => persistUpdate(async () => {
            if (!turnDraft.dayId) throw new Error('Seleccioná un día configurado')
            await createShift({ dayId: turnDraft.dayId, initialAmount: turnDraft.initialAmount })
            setTurnDraft({ dayId: '', initialAmount: '0' })
          }, 'Turno abierto en Supabase')}><Plus size={15} /> Abrir turno</button>
          {currentActiveTurns.map((turn) => <div className="config-list-row" key={turn.id} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '8px', alignItems: 'center' }}>
            <span><strong>{turn.dias_turno?.tipos_turno?.nombre || 'Turno'}</strong><br /><small>{weekdayLabels[(turn.dias_turno?.dia_semana || 1) - 1]} · {turn.dias_turno?.nombre || 'Día'} · Caja inicial {money.format(turn.caja_inicial || 0)}</small></span>
            <small>{new Date(turn.fecha_hora_inicio).toLocaleString('es-AR')}</small>
            <button type="button" className="delete-button" title="Cerrar turno" onClick={() => {
              const finalAmount = window.prompt('Caja final', String(turn.caja_inicial || 0))
              if (finalAmount === null) return
              persistUpdate(() => closeShift(turn.id, finalAmount), 'Turno cerrado')
            }}><X size={14} /></button>
          </div>)}
          {!currentActiveTurns.length && <EmptyInline text="No hay turnos activos para esta caja." />}
        </section>
      </>}

      {tab === 'accounts' && <>
        <div className="config-two-columns">
          <div className="config-list">
            <div className="config-list-head"><h3>Titulares</h3><span>{draft.accounts.holders.length} elementos</span></div>
            {draft.accounts.holders.map((holder, index) => (
              <div className="config-list-row" key={`holder-row-${index}`} draggable onDragStart={() => setDragState({ type: 'holders', index })} onDragOver={(event) => event.preventDefault()} onDrop={async () => { await reorderAccountEntries('holders', dragState.index, index); setDragState({ type: null, index: null }) }} onDragEnd={() => setDragState({ type: null, index: null })}>
                <span className="drag-handle" title="Reordenar"><GripVertical size={14} /></span>
                <input
                  value={holder}
                  onFocus={() => setEditingSnapshot((current) => ({
                    ...current,
                    holders: {
                      ...current.holders,
                      [index]: {
                        id: (data.holders || [])[index]?.id ?? (data.holders || []).find((item) => item.nombre === holder)?.id ?? null,
                        name: holder,
                      },
                    },
                  }))}
                  onChange={(event) => {
                    const next = [...draft.accounts.holders]
                    next[index] = event.target.value
                    updateAccounts({ holders: next })
                  }}
                  onBlur={async (event) => {
                    const value = event.target.value.trim()
                    if (!value) return
                    if (value.toLowerCase() === 'nuevo titular') {
                      setToast('Ingresá un nombre real para el titular')
                      return
                    }
                    const target = resolveBySnapshot('holders', index, holder)
                    if (!target) {
                      const created = await createHolder({
                        name: value,
                        boxId: data.shift?.caja_id ?? data.boxes?.[0]?.id ?? null,
                        shiftId: data.shift?.id ?? null,
                      })
                      if (created) {
                        const refreshed = await refreshLocalData()
                        const next = [...(refreshed.holders || []).map((item) => item.nombre)]
                        updateAccounts({ holders: next })
                      }
                      return
                    }
                    await persistUpdate(() => updateHolder(target.id, { name: value, orderNum: index + 1 }), 'Titular actualizado')
                  }}
                  placeholder="Nombre del titular"
                />
                <button type="button" className="delete-button" title="Eliminar titular" onClick={async () => {
                  const current = resolveBySnapshot('holders', index, holder)
                  if (!current) return
                  await persistUpdate(async () => {
                    await deleteHolder(current.id)
                    updateAccounts({ holders: draft.accounts.holders.filter((_, itemIndex) => itemIndex !== index) })
                  }, 'Titular desactivado')
                }}><X size={14} /></button>
              </div>
            ))}
            <button type="button" className="config-add" onClick={() => addBlankConfigItem('holders')}><Plus size={15} /> Agregar titular</button>
          </div>

          <div className="config-list">
            <div className="config-list-head"><h3>Billeteras</h3><span>{draft.accounts.wallets.length} elementos</span></div>
            {draft.accounts.wallets.map((wallet, index) => (
              <div className="wallet-config-row" key={`wallet-row-${index}`} draggable onDragStart={() => setDragState({ type: 'wallets', index })} onDragOver={(event) => event.preventDefault()} onDrop={async () => { await reorderAccountEntries('wallets', dragState.index, index); setDragState({ type: null, index: null }) }} onDragEnd={() => setDragState({ type: null, index: null })}>
                <span className="drag-handle" title="Reordenar"><GripVertical size={14} /></span>
                <input
                  value={wallet}
                  onFocus={() => setEditingSnapshot((current) => ({
                    ...current,
                    wallets: {
                      ...current.wallets,
                      [index]: {
                        id: (data.wallets || [])[index]?.id ?? (data.wallets || []).find((item) => item.nombre === wallet)?.id ?? null,
                        name: wallet,
                      },
                    },
                  }))}
                  onChange={(event) => {
                    const next = [...draft.accounts.wallets]
                    next[index] = event.target.value
                    updateAccounts({ wallets: next })
                  }}
                  onBlur={async (event) => {
                    const value = event.target.value.trim()
                    if (!value) return
                    if (value.toLowerCase() === 'nueva billetera') {
                      setToast('Ingresá un nombre real para la billetera')
                      return
                    }
                    const target = resolveBySnapshot('wallets', index, wallet)
                    if (!target) {
                      const created = await createWallet({
                        name: value,
                        typeName: draft.accounts.walletModes?.[wallet] || localData.walletTypes?.[0]?.nombre || 'Cobros y retiros',
                        boxId: data.shift?.caja_id ?? data.boxes?.[0]?.id ?? null,
                        shiftId: data.shift?.id ?? null,
                      })
                      if (created) {
                        const refreshed = await refreshLocalData()
                        const next = [...(refreshed.wallets || []).map((item) => item.nombre)]
                        updateAccounts({ wallets: next })
                      }
                      return
                    }
                    await persistUpdate(() => updateWallet(target.id, { name: value, typeName: draft.accounts.walletModes?.[wallet] || localData.walletTypes?.[0]?.nombre || 'Cobros y retiros', orderNum: index + 1 }), 'Billetera actualizada')
                  }}
                  placeholder="Nombre de billetera"
                />
                <select value={draft.accounts.walletModes?.[wallet] || localData.walletTypes?.[0]?.nombre || ''} onChange={async (event) => {
                  const nextMode = event.target.value
                  updateAccounts({ walletModes: { ...(draft.accounts.walletModes || {}), [wallet]: nextMode } })
                  const target = resolveBySnapshot('wallets', index, wallet)
                  if (target) {
                    await persistUpdate(() => updateWallet(target.id, { name: wallet, typeName: nextMode }), 'Tipo de billetera actualizado en Supabase')
                  }
                }}>
                  {(localData.walletTypes || []).map((type) => <option key={type.id} value={type.nombre}>{type.nombre}</option>)}
                </select>
                <button type="button" className="delete-button" title="Eliminar billetera" onClick={async () => {
                  const current = resolveBySnapshot('wallets', index, wallet)
                  if (!current) return
                  await persistUpdate(async () => {
                    await deleteWallet(current.id)
                    updateAccounts({ wallets: draft.accounts.wallets.filter((_, itemIndex) => itemIndex !== index) })
                  }, 'Billetera desactivada')
                }}><X size={14} /></button>
              </div>
            ))}
            <button type="button" className="config-add" onClick={() => addBlankConfigItem('wallets')}><Plus size={15} /> Agregar billetera</button>
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

        <div className="config-two-columns" style={{ marginTop: '18px', borderTop: '1px solid rgba(148, 163, 184, 0.25)', paddingTop: '18px' }}>
          <section className="config-card">
            <div className="config-list-head"><h3>Tipo de cuenta</h3><span>{(localData.accountTypes || []).length} registros</span></div>
            {(localData.accountTypes || []).map((type) => (
              <div className="config-list-row" key={type.id} style={{ display: 'grid', gridTemplateColumns: '1.3fr auto auto auto auto auto auto auto', gap: '8px', alignItems: 'center' }}>
                <input defaultValue={type.nombre || ''} onBlur={async (event) => {
                  const next = event.target.value.trim()
                  if (!next || next === type.nombre) return
                  await persistUpdate(() => updateAccountType(type.id, {
                    name: next,
                    shared: Boolean(type.es_compartido),
                    deposit: Boolean(type.es_deposito),
                    advertising: Boolean(type.es_publicidad),
                    saving: Boolean(type.ahorro),
                    canCollect: Boolean(type.cobros),
                    canWithdraw: Boolean(type.retiros),
                  }), 'Tipo de cuenta actualizado en Supabase')
                }} placeholder="Nombre del tipo" />
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                  <small style={{ fontSize: '10px', opacity: 0.7 }}>Cobros</small>
                  <label className="toggle-cell" title="Cobros"><input type="checkbox" checked={Boolean(type.cobros)} onChange={async () => persistUpdate(() => updateAccountType(type.id, { name: type.nombre || 'Tipo', shared: Boolean(type.es_compartido), deposit: Boolean(type.es_deposito), advertising: Boolean(type.es_publicidad), saving: Boolean(type.ahorro), canCollect: !Boolean(type.cobros), canWithdraw: Boolean(type.retiros) }), 'Config de tipo de cuenta guardada')} /><span /></label>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                  <small style={{ fontSize: '10px', opacity: 0.7 }}>Retiros</small>
                  <label className="toggle-cell" title="Retiros"><input type="checkbox" checked={Boolean(type.retiros)} onChange={async () => persistUpdate(() => updateAccountType(type.id, { name: type.nombre || 'Tipo', shared: Boolean(type.es_compartido), deposit: Boolean(type.es_deposito), advertising: Boolean(type.es_publicidad), saving: Boolean(type.ahorro), canCollect: Boolean(type.cobros), canWithdraw: !Boolean(type.retiros) }), 'Config de tipo de cuenta guardada')} /><span /></label>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', borderLeft: '1px solid rgba(148, 163, 184, 0.35)', paddingLeft: '8px' }}>
                  <small style={{ fontSize: '10px', opacity: 0.7 }}>Compartida</small>
                  <label className="toggle-cell" title="Compartida"><input type="checkbox" checked={Boolean(type.es_compartido)} onChange={async () => persistUpdate(() => updateAccountType(type.id, { name: type.nombre || 'Tipo', shared: !Boolean(type.es_compartido), deposit: Boolean(type.es_deposito), advertising: Boolean(type.es_publicidad), saving: Boolean(type.ahorro), canCollect: Boolean(type.cobros), canWithdraw: Boolean(type.retiros) }), 'Config de tipo de cuenta guardada')} /><span /></label>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                  <small style={{ fontSize: '10px', opacity: 0.7 }}>Depósito</small>
                  <label className="toggle-cell" title="Depósito"><input type="checkbox" checked={Boolean(type.es_deposito)} onChange={async () => persistUpdate(() => updateAccountType(type.id, { name: type.nombre || 'Tipo', shared: Boolean(type.es_compartido), deposit: !Boolean(type.es_deposito), advertising: Boolean(type.es_publicidad), saving: Boolean(type.ahorro), canCollect: Boolean(type.cobros), canWithdraw: Boolean(type.retiros) }), 'Config de tipo de cuenta guardada')} /><span /></label>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                  <small style={{ fontSize: '10px', opacity: 0.7 }}>Ahorro</small>
                  <label className="toggle-cell" title="Ahorro"><input type="checkbox" checked={Boolean(type.ahorro)} onChange={async () => persistUpdate(() => updateAccountType(type.id, { name: type.nombre || 'Tipo', shared: Boolean(type.es_compartido), deposit: Boolean(type.es_deposito), advertising: Boolean(type.es_publicidad), saving: !Boolean(type.ahorro), canCollect: Boolean(type.cobros), canWithdraw: Boolean(type.retiros) }), 'Config de tipo de cuenta guardada')} /><span /></label>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', borderLeft: '1px solid rgba(148, 163, 184, 0.35)', paddingLeft: '8px' }}>
                  <small style={{ fontSize: '10px', opacity: 0.7 }}>Publicidad</small>
                  <label className="toggle-cell" title="Publicidad"><input type="checkbox" checked={Boolean(type.es_publicidad)} onChange={async () => persistUpdate(() => updateAccountType(type.id, { name: type.nombre || 'Tipo', shared: Boolean(type.es_compartido), deposit: Boolean(type.es_deposito), advertising: !Boolean(type.es_publicidad), saving: Boolean(type.ahorro), canCollect: Boolean(type.cobros), canWithdraw: Boolean(type.retiros) }), 'Config de tipo de cuenta guardada')} /><span /></label>
                </div>
                <button type="button" className="delete-button" title="Desactivar tipo de cuenta" onClick={() => persistUpdate(() => deleteAccountType(type.id), 'Tipo de cuenta desactivado')}><X size={14} /></button>
              </div>
            ))}
            <button type="button" className="config-add" onClick={() => persistUpdate(() => createAccountType({ name: 'Nuevo tipo de cuenta', shared: false, deposit: false, advertising: false, saving: false, canCollect: true, canWithdraw: true }), 'Tipo de cuenta creado en Supabase')}><Plus size={15} /> Agregar tipo de cuenta</button>
          </section>

          <section className="config-card">
            <div className="config-list-head"><h3>Tipo de billetera</h3><span>{(localData.walletTypes || []).length} registros</span></div>
            {(localData.walletTypes || []).map((type) => (
              <div className="config-list-row" key={type.id} style={{ display: 'grid', gridTemplateColumns: '1.3fr auto auto auto', gap: '8px', alignItems: 'center' }}>
                <input defaultValue={type.nombre || ''} onBlur={async (event) => {
                  const next = event.target.value.trim()
                  if (!next || next === type.nombre) return
                  await persistUpdate(() => updateWalletType(type.id, {
                    name: next,
                    canCollect: Boolean(type.cobros),
                    canWithdraw: Boolean(type.retiros),
                  }), 'Tipo de billetera actualizado en Supabase')
                }} placeholder="Nombre del tipo" />
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                  <small style={{ fontSize: '10px', opacity: 0.7 }}>Cobros</small>
                  <label className="toggle-cell" title="Cobros"><input type="checkbox" checked={Boolean(type.cobros)} onChange={async () => persistUpdate(() => updateWalletType(type.id, { name: type.nombre || 'Tipo', canCollect: !Boolean(type.cobros), canWithdraw: Boolean(type.retiros) }), 'Config de tipo de billetera guardada')} /><span /></label>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                  <small style={{ fontSize: '10px', opacity: 0.7 }}>Retiros</small>
                  <label className="toggle-cell" title="Retiros"><input type="checkbox" checked={Boolean(type.retiros)} onChange={async () => persistUpdate(() => updateWalletType(type.id, { name: type.nombre || 'Tipo', canCollect: Boolean(type.cobros), canWithdraw: !Boolean(type.retiros) }), 'Config de tipo de billetera guardada')} /><span /></label>
                </div>
                <button type="button" className="delete-button" title="Desactivar tipo de billetera" onClick={() => persistUpdate(() => deleteWalletType(type.id), 'Tipo de billetera desactivado')}><X size={14} /></button>
              </div>
            ))}
            <button type="button" className="config-add" onClick={() => persistUpdate(() => createWalletType({ name: 'Nuevo tipo de billetera', canCollect: true, canWithdraw: true }), 'Tipo de billetera creado en Supabase')}><Plus size={15} /> Agregar tipo de billetera</button>
          </section>
        </div>
      </>}

      {tab === 'expenses' && <section className="config-card expense-settings-card">
        <div className="config-list-head"><h3>Opciones del selector</h3><span>{draft.expenses.length} categorías</span></div>
        {draft.expenses.map((expense, index) => (
          <div className="config-list-row expense-config-row" key={expense.id || `expense-${index}`}>
            <input value={expense.name} onChange={(event) => setDraft((current) => ({ ...current, expenses: current.expenses.map((item, itemIndex) => itemIndex === index ? { ...item, name: event.target.value } : item) }))} onBlur={async (event) => {
              const value = event.target.value.trim()
              if (!value || !expense.id) return
              const target = data.expenseTypes.find(item => item.id === expense.id)
              if (!target || value === target.nombre) return
              await persistUpdate(() => updateExpenseType(target.id, { name: value, inverted: expense.inverted }), 'Tipo de gasto actualizado en Supabase')
            }} placeholder="Nombre del gasto" />
            <label className="toggle-cell expense-invert-toggle">
              <span>Invierte el signo</span>
              <input type="checkbox" checked={expense.inverted} onChange={async () => {
                setDraft((current) => ({ ...current, expenses: current.expenses.map((item, itemIndex) => itemIndex === index ? { ...item, inverted: !item.inverted } : item) }))
                const target = data.expenseTypes.find(item => item.id === expense.id)
                if (target) {
                  await persistUpdate(() => updateExpenseType(target.id, { name: expense.name, inverted: !expense.inverted }), 'Regla de signo guardada en Supabase')
                }
              }} />
              <span aria-hidden="true" />
            </label>
            <button type="button" className="delete-button" title="Eliminar gasto" onClick={async () => {
              const target = data.expenseTypes.find(item => item.id === expense.id)
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
          <div className="config-list-row box-config-row" key={platform.id || index}>
            <span className="box-config-dot" style={{ backgroundColor: platform.colorHex || '#879598' }} />
            <input value={platform.nombre} onChange={(event) => setDraft((current) => ({ ...current, platforms: current.platforms.map((item, itemIndex) => itemIndex === index ? { ...item, nombre: event.target.value } : item) }))} onBlur={async (event) => {
              const value = event.target.value.trim()
              if (!platform.id || !value) return
              const savedName = data.platforms?.find((item) => item.id === platform.id)?.nombre
              if (value === savedName) return
              await persistUpdate(() => updatePlatform(platform.id, { name: value, colorId: platform.colorId }), 'Plataforma actualizada en Supabase')
            }} placeholder="Nombre de plataforma" />
            <select value={platform.colorId == null ? '' : String(platform.colorId)} onChange={(event) => {
              const nextColorId = event.target.value || null
              const selectedColor = localData.colors?.find((color) => String(color.id) === nextColorId)
              setDraft((current) => ({ ...current, platforms: current.platforms.map((item, itemIndex) => itemIndex === index ? { ...item, colorId: nextColorId, colorHex: selectedColor?.hex || null } : item) }))
              if (platform.id) persistUpdate(() => updatePlatform(platform.id, { name: platform.nombre, colorId: nextColorId }), 'Color de plataforma actualizado en Supabase')
            }} aria-label="Color">
              {localData.colors?.length ? localData.colors.map((color) => <option value={String(color.id)} key={color.id}>{color.nombre}</option>) : <option value="">Sin colores disponibles</option>}
            </select>
            <button type="button" className="delete-button" title="Eliminar plataforma" onClick={async () => {
              if (!platform.id) return
              await persistUpdate(() => deletePlatform(platform.id), 'Plataforma eliminada de Supabase')
            }}><X size={14} /></button>
          </div>
        ))}
        <button type="button" className="config-add" onClick={async () => {
          if (currentBoxId == null) {
            setToast('Seleccioná una caja antes de crear una plataforma')
            return
          }
          await persistUpdate(() => createPlatform({ name: 'Nueva plataforma', colorId: localData.colors?.[0]?.id ?? null, boxId: currentBoxId }), 'Plataforma creada en Supabase')
        }}><Plus size={15} /> Agregar plataforma</button>
      </section>}

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
        <div className="app-settings-columns">
        <section className="config-card">
          <div className="config-list-head"><h3>Configuración de la aplicación</h3><span>Único registro activo</span></div>
          <div className="account-settings-fields app-config-fields">
            <label><span>Nombre</span><input defaultValue={(data.appConfig?.[0]?.nombre) || 'Caja Europa'} onBlur={async (event) => {
              const next = event.target.value.trim()
              if (!next || next === (data.appConfig?.[0]?.nombre || 'Caja Europa')) return
              await persistUpdate(() => saveAppConfig({ name: next }), 'Configuración de la app guardada en Supabase')
            }} /></label>
            <div className="app-image-upload">
              <span>Imagen</span>
              <div className="app-image-controls">
                {appImagePreview && <img src={appImagePreview} alt="Vista previa de la imagen de la aplicación" />}
                <div>
                  <input ref={appImageInputRef} type="file" accept="image/*" hidden onChange={async (event) => {
                    const file = event.target.files?.[0]
                    if (!file) return
                    try {
                      const imagePayload = await createAppImagePayload(file)
                      await persistUpdate(() => replaceAppImage(imagePayload.original, imagePayload.imageMini), 'Imagen de la aplicación actualizada')
                    } catch (error) {
                      setToast(error.message || 'No se pudo procesar la imagen')
                    } finally {
                      event.target.value = ''
                    }
                  }} />
                  <button type="button" className="secondary-button app-image-action" onClick={() => appImageInputRef.current?.click()}><Upload size={14} /> {appImageReference ? 'Reemplazar archivo' : 'Subir archivo'}</button>
                  <button type="button" className="delete-button app-image-delete" disabled={!appImageReference} onClick={() => persistUpdate(() => deleteAppImage(), 'Imagen de la aplicación eliminada')}><Trash2 size={14} /> Eliminar imagen</button>
                </div>
              </div>
            </div>
            <div className="app-config-toggles">
              <label className="toggle-cell" aria-label={data.appConfig?.[0]?.tema ? 'Tema claro' : 'Tema oscuro'}><span>{data.appConfig?.[0]?.tema ? 'Tema claro' : 'Tema oscuro'}</span><input type="checkbox" checked={Boolean(data.appConfig?.[0]?.tema)} onChange={async () => persistUpdate(() => saveAppConfig({ theme: !Boolean(data.appConfig?.[0]?.tema) }), 'Tema actualizado')} /><span aria-hidden="true" /></label>
              <label className="toggle-cell" aria-label="Ver notas"><span>Ver notas</span><input type="checkbox" checked={Boolean(data.appConfig?.[0]?.ver_notas !== false)} onChange={async () => persistUpdate(() => saveAppConfig({ showNotes: !Boolean(data.appConfig?.[0]?.ver_notas !== false) }), 'Configuración visual guardada')} /><span aria-hidden="true" /></label>
            </div>
          </div>
        </section>
        <section className="config-card">
          <div className="config-list-head"><h3>Colores</h3><span>{(data.colors || []).length} registros</span></div>
          {(data.colors || []).map((color) => <div className="config-list-row app-color-row" key={color.id}>
            <input defaultValue={color.nombre || ''} onBlur={(event) => {
              const name = event.target.value.trim()
              if (!name || name === color.nombre) return
              persistUpdate(() => updateColor(color.id, { name, hex: color.hex || '#72D7CA' }), 'Nombre de color actualizado')
            }} />
            <input type="color" defaultValue={color.hex || '#72D7CA'} onBlur={(event) => {
              const hex = event.target.value
              if (hex === (color.hex || '#72D7CA')) return
              persistUpdate(() => updateColor(color.id, { name: color.nombre || 'Color', hex }), 'Color actualizado')
            }} />
            <button type="button" className="delete-button" title="Eliminar color" onClick={() => persistUpdate(() => deleteColor(color.id), 'Color eliminado')}><X size={14} /></button>
          </div>)}
          <button type="button" className="config-add" onClick={() => persistUpdate(() => createColor({ name: 'Nuevo color', hex: '#72D7CA' }), 'Color creado')}><Plus size={15} /> Agregar color</button>
        </section>
        </div>
        <section className="config-card" style={{ marginTop: '18px', borderColor: 'rgba(239, 136, 136, 0.5)' }}>
          <div className="config-list-head"><h3>Zona de desarrollo</h3><span>Acción destructiva</span></div>
          <p className="muted-copy">El formateo elimina todos los datos de la aplicación y reinicia las identidades desde 1.</p>
          <button type="button" className="secondary-button app-format-button" onClick={handleFormatDatabase} disabled={formatting}>{formatting ? 'Formateando...' : 'Formatear base de datos'}</button>
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
