import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowLeft,
  ArrowLeftRight,
  ArrowRight,
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
  Download,
  Eye,
  FileText,
  Gift,
  GripVertical,
  LayoutGrid,
  LockKeyhole,
  Megaphone,
  Pencil,
  Plus,
  Percent,
  RefreshCw,
  Search,
  Send,
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
  createBonusLine,
  createBonusCondition,
  createBonusType,
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
  deleteExpenseLine,
  deleteTipLine,
  deleteTaChargeLine,
  deleteFoundMoneyLine,
  updateExpenseLine,
  updateTipLine,
  updateTaChargeLine,
  updateFoundMoneyLine,
  createTaCharge,
  createFoundMoney,
  createTransferMovement,
  createChipLoad,
  saveShiftNotes,
  createWallet,
  deleteAccountType,
  deleteBonusLine,
  deleteBonusCondition,
  deleteBonusType,
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
  createState,
  deleteState,
  formatDatabase,
  loadBonusCatalog,
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
  updateAdvertisingDistribution,
  updateChipFinal,
  updateColor,
  updateWalletType,
  updateBonusCondition,
  updateBonusType,
  updateBox,
  updateDayShift,
  updateExpenseType,
  updateHolder,
  updatePlatform,
  updateShiftRounding,
  updateState,
  updateShiftType,
  updateWallet,
} from './lib/data'
import { DATABASE_SAVE_EVENT } from './lib/supabase'

const money = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 })
const moneyWithCents = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 2, maximumFractionDigits: 2 })
const numberWithCents = new Intl.NumberFormat('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const numberCompact = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 2 })
const LAST_SAVED_STORAGE_KEY = 'caja:last-saved-at'

function readLastSavedAt() {
  try {
    return globalThis.localStorage.getItem(LAST_SAVED_STORAGE_KEY) || ''
  } catch {
    return ''
  }
}

function parseLocalizedAmount(value) {
  const raw = String(value).trim().replace(/\s/g, '')
  if (!raw) return 0
  const normalized = raw.includes(',')
    ? raw.replace(/\./g, '').replace(',', '.')
    : /^-?\d{1,3}(?:\.\d{3})+$/.test(raw) ? raw.replace(/\./g, '') : raw
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

function sumMovementAmounts(rows = []) {
  return rows.reduce((sum, row) => sum + Number(row.monto || 0), 0)
}

function calculateChipDifference(chips = []) {
  return chips.reduce((sum, chip) => sum + Number(chip.fichas_inicial || 0) - Number(chip.fichas_final || 0), 0)
}

function signedExpenseImpact(rows = []) {
  return rows.reduce((sum, row) => {
    const amount = Number(row.monto || 0)
    return sum + (row.tipos_gasto?.invertir_signo ? -amount : amount)
  }, 0)
}

function calculateCashDiscrepancy({ cashDifference, countedChipDifference, rounding, bonuses, expenses, tips, taCharges, foundMoney }) {
  const bonusImpact = bonusNetTotal(bonuses)
  return cashDifference
    - countedChipDifference
    + rounding
    + bonusImpact
    + sumMovementAmounts(expenses)
    + sumMovementAmounts(taCharges)
    - sumMovementAmounts(tips)
    - sumMovementAmounts(foundMoney)
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
  ['bonuses', 'Estados', Gift],
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
  const [saveStatus, setSaveStatus] = useState('saved')
  const [lastSavedAt, setLastSavedAt] = useState(readLastSavedAt)
  const editStatusTimer = useRef(null)
  const editStatusFrame = useRef(null)

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

  useEffect(() => {
    const handleSaveStatus = (event) => {
      const { status, savedAt } = event.detail || {}
      if (editStatusTimer.current) {
        clearTimeout(editStatusTimer.current)
        editStatusTimer.current = null
      }
      if (editStatusFrame.current) {
        cancelAnimationFrame(editStatusFrame.current)
        editStatusFrame.current = null
      }
      setSaveStatus(status || 'saved')
      if (status !== 'saved' || !savedAt) return
      setLastSavedAt(savedAt)
      try {
        globalThis.localStorage.setItem(LAST_SAVED_STORAGE_KEY, savedAt)
      } catch {
        // The in-memory timestamp still provides the hover detail for this session.
      }
    }
    globalThis.addEventListener(DATABASE_SAVE_EVENT, handleSaveStatus)
    return () => {
      globalThis.removeEventListener(DATABASE_SAVE_EVENT, handleSaveStatus)
      if (editStatusTimer.current) clearTimeout(editStatusTimer.current)
      if (editStatusFrame.current) cancelAnimationFrame(editStatusFrame.current)
    }
  }, [])

  const handleFieldModification = (event) => {
    if (!event.target.matches('input, textarea, select')) return
    if (editStatusTimer.current) {
      clearTimeout(editStatusTimer.current)
      editStatusTimer.current = null
    }
    if (!editStatusFrame.current) {
      editStatusFrame.current = requestAnimationFrame(() => {
        editStatusFrame.current = null
        setSaveStatus('saving')
      })
    }
  }

  const finishFieldModification = (event) => {
    if (!event.target.matches('input, textarea, select')) return
    if (editStatusFrame.current) {
      cancelAnimationFrame(editStatusFrame.current)
      editStatusFrame.current = null
    }
    if (editStatusTimer.current) clearTimeout(editStatusTimer.current)
    editStatusTimer.current = setTimeout(() => {
      editStatusTimer.current = null
      setSaveStatus(current => current === 'saving' ? 'saved' : current)
    }, 600)
  }

  const activeLabel = navItems.find(([id]) => id === view)?.[1] ?? 'Caja'
  const lastSavedLabel = lastSavedAt
    ? `Último guardado: ${new Intl.DateTimeFormat('es-AR', { dateStyle: 'short', timeStyle: 'medium' }).format(new Date(lastSavedAt))}`
    : 'Todavía no hay guardados'
  const saveStatusLabel = saveStatus === 'saving' ? 'Guardando...' : saveStatus === 'error' ? 'Error al guardar' : 'Guardado'
  const shift = appData?.shift
  const shiftName = shift?.dias_turno?.nombre ?? 'Sin turno abierto'
  const shiftTime = shift?.dias_turno ? `${shift.dias_turno.hora_inicio.slice(0, 5)} - ${shift.dias_turno.hora_fin.slice(0, 5)}` : '--:-- - --:--'
  const selectedBox = appData?.boxes?.find(boxItem => boxItem.id === selectedBoxId)
  const activeBox = shift?.cajas?.nombre ?? selectedBox?.nombre ?? 'Sin caja'
  const accentColor = selectedBox?.colores?.hex || selectedBoxAccent
  const cashTotal = (appData?.accounts || []).reduce((sum, account) => sum + Number(account.valor || 0), 0)
  const countedChipDifference = calculateChipDifference(appData?.chips || [])
  const savedCashDiscrepancy = calculateCashDiscrepancy({
    cashDifference: cashTotal - Number(shift?.caja_inicial || 0),
    countedChipDifference,
    rounding: Number(shift?.redondeo || 0),
    bonuses: appData?.bonuses || [],
    expenses: appData?.expenses || [],
    tips: appData?.tips || [],
    taCharges: appData?.taCharges || [],
    foundMoney: appData?.foundMoney || [],
  })
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
    <div
      className="app-shell"
      data-theme={isLightTheme ? 'light' : 'dark'}
      style={{ '--accent': accentColor }}
      onInputCapture={handleFieldModification}
      onChangeCapture={handleFieldModification}
      onBlurCapture={finishFieldModification}
    >
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
          <span className={`saved saved-${saveStatus}`} title={lastSavedLabel} aria-live="polite"><i /> {saveStatusLabel}</span>
          <button className="camera-button" title="Cámara"><Camera size={16} /></button>
          <button className="lock-button" title="Bloquear caja"><LockKeyhole size={16} /></button>
        </div>
      </header>

      <div className="workspace">
        <aside className="sidebar">
          <p className="sidebar-label">Operación</p>
          {navItems.map(([id, label, Icon]) => <button key={id} className={`side-link ${view === id ? 'active' : ''}`} onClick={() => setView(id)}><Icon size={16} /><span>{label}</span></button>)}
          <div className="sidebar-bottom"><div className="operator"><span>MR</span><div><strong>Marina Ríos</strong><small>Operadora</small></div><ChevronDown size={14} /></div></div>
        </aside>

        <main className="main-content">
          <section className="page-heading">
            <div><span className="eyebrow">{view === 'bonuses' ? 'Catálogo de estados' : shift ? `Turno iniciado · ${new Date(shift.fecha_hora_inicio).toLocaleString('es-AR')}` : 'Sin turno abierto'}</span><h1>{activeLabel === 'Caja' ? `${shiftName} / ${shiftTime}` : activeLabel}</h1><p>{view === 'bonuses' ? 'Administrá imágenes, tipos, porcentajes y condiciones' : shift ? `${new Date(shift.fecha_hora_inicio).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })} · ${activeBox}` : 'Seleccioná una caja con un turno abierto'}</p></div>
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
          {!loadError && appData && view === 'bonuses' && <LiveStates setToast={setToast} />}
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
  const countedChipDifference = calculateChipDifference(chips)
  const cashDifference = total - cashInitial
  const taChargesTotal = sumMovementAmounts(data.taCharges)
  const realDifference = cashDifference + signedExpenseImpact(data.expenses) + taChargesTotal
  const cashDiscrepancy = calculateCashDiscrepancy({
    cashDifference,
    countedChipDifference,
    rounding: roundingAmount,
    bonuses: data.bonuses,
    expenses: data.expenses,
    tips: data.tips,
    taCharges: data.taCharges,
    foundMoney: data.foundMoney,
  })
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
        <div className="top-panels"><Publicity rows={data.advertising} boxes={data.boxes} setToast={setToast} onSaved={onSaved} /><BonusList shiftId={data.shift.id} shift={data.shift} rows={data.bonuses} onSaved={onSaved} setToast={setToast} /><ChipSummary chips={data.chips} setToast={setToast} onChipFinalSaved={onChipFinalSaved} onChipFinalPreview={updateChipFinalDraft} /></div>
        <AccountMatrix accounts={accounts} holders={accountHolders} wallets={accountWallets} total={total} setToast={setToast} onSaved={onSaved} onAccountValueDraft={updateAccountValueDraft} />
        <div className="three-panels"><LogisticsCard rows={data.logistics} /><StatusCard /><UsersCard users={data.users} /></div>
        <div className="operations-grid">
          <MovementCard title="Gastos" kind="expenses" shiftId={data.shift.id} options={data.expenseTypes} icon={FileText} amount={expensesTotal} rows={data.expenses} onSaved={onSaved} setToast={setToast} />
          <MovementCard title="Propinas" kind="tips" shiftId={data.shift.id} icon={CircleDollarSign} amount={tipsTotal} rows={data.tips} onSaved={onSaved} setToast={setToast} />
          <BonusOperationCard shiftId={data.shift.id} shift={data.shift} rows={data.bonuses} onSaved={onSaved} setToast={setToast} />
          <TaChargesCard shiftId={data.shift.id} rows={data.taCharges || []} onSaved={onSaved} setToast={setToast} />
          <FoundMoneyCard accounts={accounts} rows={data.foundMoney || []} onSaved={onSaved} setToast={setToast} />
          <ShiftNotesCard shiftId={data.shift.id} notes={data.shiftNotes} onSaved={onSaved} setToast={setToast} />
          <TransferMovementsCard shift={data.shift} boxes={data.boxes} accounts={accounts} rows={data.movements || []} onSaved={onSaved} setToast={setToast} />
          <ChipControlCard chips={chips} onSaved={onSaved} onChipFinalSaved={onChipFinalSaved} setToast={setToast} />
        </div>
      </div>
    </div>
  </>
}
function Metric({ label, value, tone = '' }) { return <div className="metric"><small>{label}</small><strong className={tone}>{value}</strong></div> }
function Publicity({ rows, boxes, setToast, onSaved }) {
  const [savingCell, setSavingCell] = useState('')
  const [countDrafts, setCountDrafts] = useState({})
  const [distributionDrafts, setDistributionDrafts] = useState({})
  useEffect(() => {
    setCountDrafts({})
    setDistributionDrafts({})
  }, [rows])
  const change = async (row, key, update) => {
    setSavingCell(key)
    try {
      await update()
      onSaved()
    } catch (error) {
      setToast(error.message || 'No se pudo guardar publicidad')
    } finally {
      setSavingCell('')
    }
  }
  const getCount = (row, field) => {
    const key = `${row.id}:${field}`
    return Number(countDrafts[key] ?? row[field] ?? 0) || 0
  }
  const getDistribution = (row, boxId) => {
    const key = `${row.id}:box:${boxId}`
    const saved = row.lineas_publicidad_x_caja?.find(item => Number(item.caja_id) === Number(boxId))?.num_derivado
    return Number(distributionDrafts[key] ?? saved ?? 0) || 0
  }
  const commitNumber = (row, key, rawValue, save) => {
    const value = Number(rawValue)
    if (!Number.isInteger(value) || value < 0) {
      setToast('Ingresá una cantidad entera igual o mayor a cero')
      if (key.includes(':box:')) {
        setDistributionDrafts(current => { const next = { ...current }; delete next[key]; return next })
      } else {
        setCountDrafts(current => { const next = { ...current }; delete next[key]; return next })
      }
      return
    }
    change(row, key, () => save(value))
  }
  const summary = rows.map((row, index) => {
    const total = getCount(row, 'total_llegados')
    const derived = boxes.reduce((sum, box) => sum + getDistribution(row, box.id), 0)
    const label = `Publicidad ${String.fromCharCode(65 + index)}`
    return [
      label,
      `Efectividad: ${total ? Math.round((derived / total) * 100) : 0}%`,
      `Llegados: ${total}`,
      `Nuevos: ${getCount(row, 'nuevos')}`,
      `Repetidos: ${getCount(row, 'repetidos')}`,
      `S/Respuesta: ${total - getCount(row, 'nuevos') - getCount(row, 'repetidos')}`,
      `Derivados: ${derived}`,
      ...boxes.map(box => `${box.nombre}: ${getDistribution(row, box.id)}`),
    ].join('\n')
  }).join('\n\n')
  const copySummary = async () => {
    try {
      await navigator.clipboard.writeText(`Conteo de publicidad\n\n${summary}`)
      setToast('Conteo de publicidad copiado')
    } catch (error) {
      setToast(error.message || 'No se pudo copiar el conteo de publicidad')
    }
  }
  const countFields = [
    ['Total LL', 'total_llegados'],
    ['Nuevos', 'nuevos'],
    ['Repetidos', 'repetidos'],
  ]
  return <section className="panel publicity">
    <PanelTitle icon={Megaphone} title="Publicidad" action={<button className="icon-button publicity-copy" type="button" title="Copiar conteo de publicidad" aria-label="Copiar conteo de publicidad" onClick={copySummary}><Copy size={15} /></button>} />
    <div className="publicity-rows">{rows.map((row, index) => {
      const total = getCount(row, 'total_llegados')
      const newCount = getCount(row, 'nuevos')
      const repeated = getCount(row, 'repetidos')
      const derived = boxes.reduce((sum, box) => sum + getDistribution(row, box.id), 0)
      const lineName = `Publicidad ${String.fromCharCode(65 + index)}`
      const stepper = (field, label, value) => {
        const key = `${row.id}:${field}`
        return <label key={field}><small>{label}</small><span className="publicity-stepper">
          <button type="button" title={`Disminuir ${label}`} aria-label={`Disminuir ${label} de ${lineName}`} disabled={savingCell === key} onClick={() => {
            const next = Math.max(0, value - 1)
            setCountDrafts(current => ({ ...current, [key]: next }))
            change(row, key, () => updateAdvertisingLine(row.id, field, next))
          }}><ArrowLeft size={11} /></button>
          <input type="number" min="0" step="1" aria-label={`${label} de ${lineName}`} value={countDrafts[key] ?? value} disabled={savingCell === key} onChange={event => setCountDrafts(current => ({ ...current, [key]: event.target.value }))} onBlur={event => commitNumber(row, key, event.currentTarget.value, next => updateAdvertisingLine(row.id, field, next))} onKeyDown={event => { if (event.key === 'Enter') event.currentTarget.blur() }} />
          <button type="button" title={`Aumentar ${label}`} aria-label={`Aumentar ${label} de ${lineName}`} disabled={savingCell === key} onClick={() => {
            const next = value + 1
            setCountDrafts(current => ({ ...current, [key]: next }))
            change(row, key, () => updateAdvertisingLine(row.id, field, next))
          }}><ArrowRight size={11} /></button>
        </span></label>
      }
      return <div className="publicity-row" key={row.id}>
        <strong><FileText size={13} /> {lineName}</strong>
        <div className="publicity-counts">
          {countFields.map(([label, field]) => stepper(field, label, getCount(row, field)))}
          <label><small>S/Resp</small><b>{total - newCount - repeated}</b></label>
        </div>
        <div className="publicity-total"><small>Total D</small><b>{derived}</b></div>
        <div className="publicity-distributions">{boxes.map(box => {
          const value = getDistribution(row, box.id)
          const key = `${row.id}:box:${box.id}`
          return <label key={box.id}><small>{box.nombre}</small><span className="publicity-stepper">
            <button type="button" title={`Disminuir derivados de ${box.nombre}`} aria-label={`Disminuir derivados de ${box.nombre} en ${lineName}`} disabled={savingCell === key} onClick={() => {
              const next = Math.max(0, value - 1)
              setDistributionDrafts(current => ({ ...current, [key]: next }))
              change(row, key, () => updateAdvertisingDistribution(row.id, box.id, next))
            }}><ArrowLeft size={11} /></button>
            <input type="number" min="0" step="1" aria-label={`Derivados de ${box.nombre} en ${lineName}`} value={distributionDrafts[key] ?? value} disabled={savingCell === key} onChange={event => setDistributionDrafts(current => ({ ...current, [key]: event.target.value }))} onBlur={event => commitNumber(row, key, event.currentTarget.value, next => updateAdvertisingDistribution(row.id, box.id, next))} onKeyDown={event => { if (event.key === 'Enter') event.currentTarget.blur() }} />
            <button type="button" title={`Aumentar derivados de ${box.nombre}`} aria-label={`Aumentar derivados de ${box.nombre} en ${lineName}`} disabled={savingCell === key} onClick={() => {
              const next = value + 1
              setDistributionDrafts(current => ({ ...current, [key]: next }))
              change(row, key, () => updateAdvertisingDistribution(row.id, box.id, next))
            }}><ArrowRight size={11} /></button>
          </span></label>
        })}</div>
        <strong className="publicity-rate"><Percent size={12} />{total ? Math.round((derived / total) * 100) : 0}%</strong>
      </div>
    })}</div>
  </section>
}
function bonusTypeOf(bonus) {
  if (bonus.recuperado) return 'recovered'
  if (bonus.es_publicidad) return 'publicity'
  return 'granted'
}

const bonusTypeLabels = { granted: 'Otorgado', recovered: 'Recuperado', publicity: 'Publicidad' }

function bonusNetTotal(rows) {
  return rows.reduce((net, bonus) => {
    const amount = Number(bonus.valor || 0)
    const type = bonusTypeOf(bonus)
    return net + (type === 'recovered' ? -amount : amount)
  }, 0)
}

function BonusList({ shiftId, shift, rows, onSaved, setToast }) {
  const [mode, setMode] = useState('granted')
  const [value, setValue] = useState('')
  const [saving, setSaving] = useState(false)
  const [savingRecentId, setSavingRecentId] = useState(null)
  const [hiddenRecentIds, setHiddenRecentIds] = useState(() => new Set())
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
      await createBonusLine(shiftId, { value: amount, type, bonusId: rows[0]?.bono_id })
      setValue('')
      setMode('granted')
      setToast(`${bonusTypeLabels[type]} guardado`)
      onSaved()
    } catch (error) {
      setToast(error.message || 'No se pudo guardar el bono')
    } finally {
      setSaving(false)
    }
  }

  const saveRecentAmount = async (event, bonus) => {
    if (event.key !== 'Enter') return
    event.preventDefault()
    const input = event.currentTarget
    const amount = parseLocalizedAmount(input.value)
    if (amount == null || amount < 0) {
      setToast('Ingresá un monto válido')
      return
    }

    setSavingRecentId(bonus.id)
    try {
      if (amount === 0) {
        setHiddenRecentIds(current => new Set(current).add(bonus.id))
        await deleteBonusLine(bonus.id)
        setToast('Bono eliminado')
      } else {
        await updateBonusLine(bonus.id, { value: amount })
        input.value = moneyWithCents.format(amount)
        setToast('Bono actualizado')
      }
      onSaved()
    } catch (error) {
      if (amount === 0) {
        setHiddenRecentIds(current => {
          const next = new Set(current)
          next.delete(bonus.id)
          return next
        })
      }
      setToast(error.message || 'No se pudo guardar el bono')
    } finally {
      setSavingRecentId(null)
    }
  }

  return <section className="panel bonus-quick-panel">
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
      <small className="bonus-recent-heading">Últimos 5 bonos</small>
      {recentRows.filter(bonus => !hiddenRecentIds.has(bonus.id)).map(bonus => <div className={`bonus-recent-row bonus-type-${bonusTypeOf(bonus)}`} key={bonus.id}>
        <span>{bonusTypeLabels[bonusTypeOf(bonus)]}</span>
        <div className="bonus-recent-value">
          <time>{new Date(bonus.fecha_hora_creacion).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}</time>
          <span aria-hidden="true">-</span>
          <input
            aria-label={`Monto de bono ${bonusTypeLabels[bonusTypeOf(bonus)]}`}
            defaultValue={moneyWithCents.format(bonus.valor)}
            inputMode="decimal"
            disabled={savingRecentId === bonus.id}
            onFocus={event => { event.currentTarget.value = numberWithCents.format(bonus.valor); event.currentTarget.select() }}
            onKeyDown={event => saveRecentAmount(event, bonus)}
          />
        </div>
      </div>)}
      {!recentRows.length && <span className="bonus-recent-empty">Sin bonos registrados</span>}
    </div>
    {historyOpen && <BonusHistoryModal bonuses={rows} shift={shift} onClose={() => setHistoryOpen(false)} onSaved={onSaved} setToast={setToast} />}
  </section>
}

function LiveStates({ setToast }) {
  const [catalog, setCatalog] = useState({ states: [], bonusTypes: [], bonusConditions: [], subplatforms: [] })
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [sortBy, setSortBy] = useState('percentage')
  const [groupBy, setGroupBy] = useState('type')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [editingState, setEditingState] = useState(null)
  const [saving, setSaving] = useState(false)

  const refresh = async () => {
    setLoading(true)
    setLoadError('')
    try {
      setCatalog(await loadBonusCatalog())
    } catch (error) {
      setLoadError(error.message || 'No se pudo cargar el catálogo de estados')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { refresh() }, [])

  const filteredStates = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase('es')
    return catalog.states
      .filter(state => !typeFilter || String(state.tipo_estado_id) === typeFilter)
      .filter(state => {
        if (!normalizedSearch) return true
        const searchable = [
          state.nombre,
          state.tipos_estado?.nombre,
          ...(state.lineas_estado || []).flatMap(line => [
            line.porcentaje,
            line.condiciones_bono?.nombre,
            line.subplataformas?.nombre,
            line.subplataformas?.plataformas?.nombre,
          ]),
        ].join(' ').toLocaleLowerCase('es')
        return searchable.includes(normalizedSearch)
      })
      .sort((left, right) => {
        if (sortBy === 'name') return left.nombre.localeCompare(right.nombre, 'es')
        if (sortBy === 'type') return (left.tipos_estado?.nombre || '').localeCompare(right.tipos_estado?.nombre || '', 'es')
        const leftPercentage = Math.min(...(left.lineas_estado || []).map(line => Number(line.porcentaje)), Infinity)
        const rightPercentage = Math.min(...(right.lineas_estado || []).map(line => Number(line.porcentaje)), Infinity)
        return leftPercentage - rightPercentage || left.nombre.localeCompare(right.nombre, 'es')
      })
  }, [catalog.states, search, sortBy, typeFilter])

  const groups = useMemo(() => {
    if (groupBy === 'none') return [{ key: 'all', title: 'Estados', items: filteredStates }]
    const grouped = new Map()
    for (const state of filteredStates) {
      const typeName = state.tipos_estado?.nombre || 'Sin tipo'
      if (!grouped.has(typeName)) grouped.set(typeName, [])
      grouped.get(typeName).push(state)
    }
    return [...grouped.entries()].map(([title, items]) => ({ key: title, title, items }))
  }, [filteredStates, groupBy])

  const save = async (values) => {
    setSaving(true)
    try {
      if (editingState) {
        await updateState(editingState.id, values)
        setToast('Estado actualizado')
      } else {
        await createState(values)
        setToast('Estado creado')
      }
      setEditingState(null)
      await refresh()
    } catch (error) {
      setToast(error.message || 'No se pudo guardar el estado')
    } finally {
      setSaving(false)
    }
  }

  const remove = async (state) => {
    if (!window.confirm(`¿Eliminar el estado "${state.nombre}"? Esta acción no se puede deshacer.`)) return
    try {
      await deleteState(state.id, { image: state.imagen, imageMini: state.imagen_mini })
      setToast('Estado eliminado')
      await refresh()
    } catch (error) {
      setToast(error.message || 'No se pudo eliminar el estado')
    }
  }

  const download = async (state, imageUrl) => {
    try {
      const response = await fetch(imageUrl)
      if (!response.ok) throw new Error(`No se pudo descargar la imagen (${response.status})`)
      const blob = await response.blob()
      const extension = ({ 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif', 'image/avif': 'avif' })[blob.type] || 'img'
      const objectUrl = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = objectUrl
      link.download = `${state.nombre.replace(/[\\/:*?"<>|]/g, '-') || 'estado'}.${extension}`
      document.body.append(link)
      link.click()
      link.remove()
      setTimeout(() => URL.revokeObjectURL(objectUrl), 1000)
    } catch (error) {
      setToast(error.message || 'No se pudo descargar la imagen')
    }
  }

  return <section className="panel state-catalog">
    <header className="state-catalog-toolbar">
      <div className="state-catalog-title"><Gift size={17} /><div><h2>Estados</h2><span>{catalog.states.length} registros</span></div></div>
      <div className="state-catalog-controls">
        <label className="state-search"><Search size={14} /><input aria-label="Buscar estado" placeholder="Buscar estado, porcentaje o condición" value={search} onChange={event => setSearch(event.target.value)} /></label>
        <button type="button" className={`icon-button state-filter-trigger ${filtersOpen ? 'selected' : ''}`} title="Filtros" aria-label="Filtros" aria-expanded={filtersOpen} onClick={() => setFiltersOpen(value => !value)}><SlidersHorizontal size={15} /></button>
        <button type="button" className="icon-button state-add-button" title="Nuevo estado" aria-label="Nuevo estado" onClick={() => setEditingState(false)}><Plus size={17} /></button>
      </div>
    </header>

    {filtersOpen && <div className="state-filter-panel">
      <label><span>TIPO</span><select aria-label="Filtrar por tipo" value={typeFilter} onChange={event => setTypeFilter(event.target.value)}>
        <option value="">Todos los tipos</option>
        {catalog.bonusTypes.map(type => <option value={String(type.id)} key={type.id}>{type.nombre}</option>)}
      </select></label>
      <label><span>ORDENAR POR</span><select aria-label="Ordenar estados" value={sortBy} onChange={event => setSortBy(event.target.value)}>
        <option value="percentage">Porcentaje</option><option value="name">Nombre</option><option value="type">Tipo de estado</option>
      </select></label>
      <label><span>AGRUPAR POR</span><select aria-label="Agrupar estados" value={groupBy} onChange={event => setGroupBy(event.target.value)}>
        <option value="type">Tipo de estado</option><option value="none">Sin agrupar</option>
      </select></label>
    </div>}

    {loadError ? <div className="empty-state"><strong>Error al cargar estados</strong><p>{loadError}</p><button type="button" className="secondary-button" onClick={refresh}>Reintentar</button></div>
      : loading ? <div className="empty-state">Cargando estados...</div>
        : filteredStates.length ? <div className="state-groups">{groups.map(group => <section className="state-group" key={group.key}>
          <header><h3>{group.title}</h3><span>{group.items.length} estados</span></header>
          <div className="state-card-grid">{group.items.map(state => {
            const image = getStoragePublicUrl(state.imagen_mini || state.imagen)
            const lines = [...(state.lineas_estado || [])].sort((left, right) => Number(left.porcentaje) - Number(right.porcentaje))
            return <article className="state-card" key={state.id}>
              {image ? <img className="state-card-image" src={image} alt={`Imagen de ${state.nombre}`} /> : <div className="state-card-image state-card-placeholder"><Gift size={30} /></div>}
              <div className="state-card-body">
                <h4>{state.nombre}</h4>
                <span className="state-card-type">{state.tipos_estado?.nombre || 'Sin tipo'}</span>
                <div className="state-card-lines">{lines.length ? lines.map(line => <p key={line.id}>
                  <strong>{numberCompact.format(Number(line.porcentaje))}%</strong>
                  <span>{line.condiciones_bono?.nombre || 'Sin condición'}</span>
                  {line.condiciones_bono?.plataforma && <small>{line.subplataformas?.nombre || line.subplataformas?.plataformas?.nombre || 'Plataforma'}</small>}
                </p>) : <small>Sin porcentajes configurados</small>}</div>
                <div className="state-card-actions">
                  <button type="button" className="icon-button" title="Editar estado" aria-label={`Editar ${state.nombre}`} onClick={() => setEditingState(state)}><Pencil size={14} /></button>
                  <button type="button" className="icon-button" title="Descargar imagen" aria-label={`Descargar imagen de ${state.nombre}`} disabled={!image} onClick={() => image && download(state, image)}><Download size={14} /></button>
                  <button type="button" className="delete-button" title="Eliminar estado" aria-label={`Eliminar ${state.nombre}`} onClick={() => remove(state)}><Trash2 size={14} /></button>
                </div>
              </div>
            </article>
          })}</div>
        </section>)}</div>
          : <div className="empty-state"><strong>{catalog.states.length ? 'No hay resultados' : 'Todavía no hay estados'}</strong><p>{catalog.states.length ? 'Probá cambiar la búsqueda o los filtros.' : 'Creá un estado para empezar a armar el catálogo.'}</p></div>}

    {editingState !== null && <StateFormModal
      state={editingState || null}
      bonusTypes={catalog.bonusTypes}
      bonusConditions={catalog.bonusConditions}
      subplatforms={catalog.subplatforms}
      saving={saving}
      onClose={() => !saving && setEditingState(null)}
      onSave={save}
      onImageError={message => setToast(message)}
    />}
  </section>
}

function StateFormModal({ state, bonusTypes, bonusConditions, subplatforms, saving, onClose, onSave, onImageError }) {
  const existingLines = [...(state?.lineas_estado || [])].sort((left, right) => Number(left.id) - Number(right.id))
  const [draft, setDraft] = useState(() => {
    const typeId = String(state?.tipo_estado_id || bonusTypes[0]?.id || '')
    const lineCount = Number(bonusTypes.find(type => String(type.id) === typeId)?.cantidad_porcentaje || 0)
    return {
      name: state?.nombre || '',
      typeId,
      imageFile: null,
      imageMiniFile: null,
      lines: Array.from({ length: lineCount }, (_, index) => {
        const line = existingLines[index]
        return {
          percentage: line ? String(line.porcentaje) : '',
          conditionId: String(line?.condicion_bono_id || line?.condiciones_bono?.id || bonusConditions[0]?.id || ''),
          subplatformId: String(line?.subplataforma_id || line?.subplataformas?.id || subplatforms[0]?.id || ''),
        }
      }),
    }
  })
  const [imagePreview, setImagePreview] = useState(state ? getStoragePublicUrl(state.imagen_mini || state.imagen) : '')
  const selectedType = bonusTypes.find(type => String(type.id) === draft.typeId)
  const lineCount = Number(selectedType?.cantidad_porcentaje || 0)
  const requiresSubplatform = draft.lines.some(line => bonusConditions.find(condition => String(condition.id) === line.conditionId)?.plataforma)

  useEffect(() => {
    if (draft.imageMiniFile) {
      const objectUrl = URL.createObjectURL(draft.imageMiniFile)
      setImagePreview(objectUrl)
      return () => URL.revokeObjectURL(objectUrl)
    }
    setImagePreview(state ? getStoragePublicUrl(state.imagen_mini || state.imagen) : '')
  }, [draft.imageMiniFile, state])

  const selectImage = async (file) => {
    if (!file) return
    try {
      const imagePayload = await createAppImagePayload(file)
      setDraft(current => ({ ...current, imageFile: imagePayload.original, imageMiniFile: imagePayload.imageMini }))
    } catch (error) {
      onImageError(error.message || 'No se pudo procesar la imagen')
    }
  }

  const setType = (typeId) => {
    const nextType = bonusTypes.find(type => String(type.id) === typeId)
    const count = Number(nextType?.cantidad_porcentaje || 0)
    setDraft(current => ({
      ...current,
      typeId,
      lines: Array.from({ length: count }, (_, index) => current.lines[index] || {
        percentage: '',
        conditionId: String(bonusConditions[0]?.id || ''),
        subplatformId: String(subplatforms[0]?.id || ''),
      }),
    }))
  }

  const submit = (event) => {
    event.preventDefault()
    if (!draft.name.trim()) return
    if (!draft.typeId) return
    if (draft.lines.length !== lineCount) return
    if (draft.lines.some(line => !line.conditionId || (bonusConditions.find(condition => String(condition.id) === line.conditionId)?.plataforma && !line.subplatformId))) return
    onSave({
      name: draft.name,
      typeId: draft.typeId,
      imageFile: draft.imageFile,
      imageMiniFile: draft.imageMiniFile,
      lines: draft.lines.map(line => ({
        percentage: line.percentage,
        conditionId: line.conditionId,
        subplatformId: bonusConditions.find(condition => String(condition.id) === line.conditionId)?.plataforma
          ? line.subplatformId
          : null,
      })),
    })
  }

  return <div className="modal-backdrop state-modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose() }}>
    <form className="modal state-form-modal" role="dialog" aria-modal="true" aria-label={state ? 'Editar estado' : 'Nuevo estado'} onSubmit={submit}>
      <header><div className="modal-icon"><Gift size={20} /></div><h2>{state ? 'Editar estado' : 'Nuevo estado'}</h2><button type="button" className="modal-close" title="Cerrar" aria-label="Cerrar" onClick={onClose}><X size={17} /></button></header>
      <div className="state-form-fields">
        <label className="state-image-picker"><span>Imagen</span>
          {imagePreview && <img src={imagePreview} alt="Vista previa del estado" />}
          <input type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/avif" onChange={event => selectImage(event.target.files?.[0])} />
        </label>
        <label><span>Nombre</span><input required maxLength="100" value={draft.name} onChange={event => setDraft(current => ({ ...current, name: event.target.value }))} autoFocus /></label>
        <label className="state-type-field"><span>Tipo de estado</span><select required disabled={!bonusTypes.length} value={draft.typeId} onChange={event => setType(event.target.value)}>
          {bonusTypes.map(type => <option value={String(type.id)} key={type.id}>{type.nombre}</option>)}
        </select></label>
        <div className="state-lines-editor">
          <span>Porcentajes y condiciones</span>
          {lineCount === 0 ? <p className="state-form-hint">Este tipo no requiere porcentajes.</p>
            : <div className="state-line-list">{draft.lines.map((line, index) => {
              const condition = bonusConditions.find(item => String(item.id) === line.conditionId)
              return <div className={`state-line-editor ${condition?.plataforma ? 'has-platform' : ''}`} key={`${draft.typeId}-${index}`}>
                <label><span className="state-line-label">Porcentaje {index + 1}</span><div className="state-percentage-input"><span>%</span><input type="number" min="0" max="100" step="0.01" required value={line.percentage} onChange={event => setDraft(current => ({ ...current, lines: current.lines.map((item, lineIndex) => lineIndex === index ? { ...item, percentage: event.target.value } : item) }))} /></div></label>
                <label><span className="state-line-label">Condición</span><select required disabled={!bonusConditions.length} value={line.conditionId} onChange={event => setDraft(current => ({ ...current, lines: current.lines.map((item, lineIndex) => lineIndex === index ? { ...item, conditionId: event.target.value, subplatformId: item.subplatformId || String(subplatforms[0]?.id || '') } : item) }))}>
                  {bonusConditions.map(item => <option value={String(item.id)} key={item.id}>{item.nombre}</option>)}
                </select></label>
                {condition?.plataforma && <label><span className="state-line-label">Plataforma</span><select required disabled={!subplatforms.length} value={line.subplatformId} onChange={event => setDraft(current => ({ ...current, lines: current.lines.map((item, lineIndex) => lineIndex === index ? { ...item, subplatformId: event.target.value } : item) }))}>
                  {subplatforms.map(item => <option value={String(item.id)} key={item.id}>{item.plataformas?.nombre ? `${item.plataformas.nombre} · ${item.nombre}` : item.nombre}</option>)}
                </select></label>}
              </div>
            })}</div>}
        </div>
        {lineCount > 0 && !bonusConditions.length && <p className="state-form-error">Agregá al menos una condición en Configuración → Estados.</p>}
        {requiresSubplatform && !subplatforms.length && <p className="state-form-error">La condición seleccionada requiere una subplataforma. Configurá una desde Control de fichas.</p>}
      </div>
      <footer><button type="button" className="secondary-button" onClick={onClose} disabled={saving}>Cancelar</button><button type="submit" className="primary-button" disabled={saving || !bonusTypes.length || (lineCount > 0 && !bonusConditions.length) || (requiresSubplatform && !subplatforms.length)}>{saving ? 'Guardando...' : 'Guardar'} <Check size={14} /></button></footer>
    </form>
  </div>
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

function BonusHistoryContent({ bonuses, shift, onSaved, setToast, editableAmounts = false }) {
  const [editingNoteId, setEditingNoteId] = useState(null)
  const [noteDraft, setNoteDraft] = useState('')
  const [savingId, setSavingId] = useState(null)
  const [amountDrafts, setAmountDrafts] = useState({})
  const groups = bonusHistoryGroups(bonuses, shift)

  const saveAmount = async (bonus, draft) => {
    if (draft === undefined) return
    const amount = parseLocalizedAmount(draft)
    if (amount == null || amount < 0) {
      setToast('Ingresá un monto válido, igual o mayor a cero')
      setAmountDrafts(current => ({ ...current, [bonus.id]: numberWithCents.format(bonus.valor) }))
      return
    }
    if (amount === Number(bonus.valor)) {
      setAmountDrafts(current => {
        const next = { ...current }
        delete next[bonus.id]
        return next
      })
      return
    }
    setSavingId(bonus.id)
    try {
      await updateBonusLine(bonus.id, { value: amount })
      setAmountDrafts(current => {
        const next = { ...current }
        delete next[bonus.id]
        return next
      })
      setToast('Bono actualizado')
      onSaved()
    } catch (error) {
      setToast(error.message || 'No se pudo guardar el monto del bono')
      setAmountDrafts(current => ({ ...current, [bonus.id]: numberWithCents.format(bonus.valor) }))
    } finally {
      setSavingId(null)
    }
  }

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

  if (editableAmounts) {
    return <div className="bonus-history-editable-list">
      {bonuses.map(bonus => {
        const type = bonusTypeOf(bonus)
        const time = new Date(bonus.fecha_hora_creacion).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
        return <article className={`bonus-history-editable-row bonus-type-${type}`} key={bonus.id}>
          <span>{bonusTypeLabels[type]}</span>
          <time>{time}</time>
          <label className="bonus-history-editable-amount">
            <span>$</span>
            <input
              aria-label={`Editar monto ${bonusTypeLabels[type]}`}
              inputMode="decimal"
              title="Editar monto; presioná Enter o salí del campo para guardar"
              value={amountDrafts[bonus.id] ?? numberWithCents.format(bonus.valor)}
              onChange={event => setAmountDrafts(current => ({ ...current, [bonus.id]: event.target.value }))}
              onFocus={event => event.currentTarget.select()}
              onBlur={event => saveAmount(bonus, event.currentTarget.value)}
              onKeyDown={event => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  event.currentTarget.blur()
                }
                if (event.key === 'Escape') {
                  const originalAmount = numberWithCents.format(bonus.valor)
                  event.currentTarget.value = originalAmount
                  setAmountDrafts(current => ({ ...current, [bonus.id]: originalAmount }))
                  event.currentTarget.blur()
                }
              }}
              disabled={savingId === bonus.id}
            />
          </label>
        </article>
      })}
      {!bonuses.length && <p className="bonus-history-empty">Sin bonos</p>}
    </div>
  }

  return <div className={`bonus-history-grid ${editableAmounts ? 'bonus-history-grid-editable' : ''}`}>
    {groups.map(group => <section className="bonus-history-group" key={group.label}>
      <h3>{group.label}</h3>
      {group.items.length ? group.items.map(bonus => {
        const type = bonusTypeOf(bonus)
        const time = new Date(bonus.fecha_hora_creacion).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
        return <article className={`bonus-history-item bonus-type-${type}`} key={bonus.id}>
          <div className="bonus-history-main">
            <time>{time}</time>
            <button type="button" className={`bonus-mode-button bonus-type-${type}`} title={`Cambiar tipo de ${bonusTypeLabels[type]}`} aria-label={`Cambiar tipo de ${bonusTypeLabels[type]}`} onClick={() => changeType(bonus)} disabled={savingId === bonus.id}><ArrowLeftRight size={13} /></button>
            {editableAmounts
              ? <input
                className="bonus-history-amount"
                aria-label={`Monto ${bonusTypeLabels[type]}`}
                inputMode="decimal"
                value={amountDrafts[bonus.id] ?? numberWithCents.format(bonus.valor)}
                onChange={event => setAmountDrafts(current => ({ ...current, [bonus.id]: event.target.value }))}
                onFocus={event => event.currentTarget.select()}
                onBlur={event => saveAmount(bonus, event.currentTarget.value)}
                onKeyDown={event => { if (event.key === 'Enter') event.currentTarget.blur() }}
                disabled={savingId === bonus.id}
              />
              : <b>{moneyWithCents.format(bonus.valor)}</b>}
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

function BonusHistoryModal({ bonuses, shift, onClose, onSaved, setToast, editableAmounts = false, showTotals = false }) {
  const counts = bonuses.reduce((result, bonus) => {
    result[bonusTypeOf(bonus)] += 1
    return result
  }, { granted: 0, recovered: 0, publicity: 0 })
  const totals = bonuses.reduce((result, bonus) => {
    const type = bonusTypeOf(bonus)
    result[type] += Number(bonus.valor || 0)
    return result
  }, { granted: 0, recovered: 0, publicity: 0 })
  const net = totals.granted - totals.recovered + totals.publicity
  return <div className="modal-backdrop bonus-history-backdrop" onClick={onClose}>
    <section className={`bonus-history-modal ${editableAmounts ? 'bonus-history-modal-detailed' : ''}`} role="dialog" aria-modal="true" aria-label="Bonos del turno" onClick={(event) => event.stopPropagation()}>
      <header><div><h2>{editableAmounts ? 'Bonos' : 'Bonos del turno'}</h2><span>{editableAmounts ? `Bonos: ${counts.granted} Otorgados | ${counts.recovered} Recuperados | ${counts.publicity} Publicidad` : 'Revisá y editá los registros del turno'}</span></div><button type="button" className="modal-close" title="Cerrar" aria-label="Cerrar" onClick={onClose}><X size={17} /></button></header>
      <div className="bonus-history-scroll"><BonusHistoryContent bonuses={bonuses} shift={shift} onSaved={onSaved} setToast={setToast} editableAmounts={editableAmounts} /></div>
      <footer className={showTotals ? 'bonus-history-modal-footer' : ''}>
        {showTotals && <>
          <div><span>Otorgados</span><strong>{moneyWithCents.format(totals.granted)}</strong></div>
          <div><span>Recuperados</span><strong>{moneyWithCents.format(totals.recovered)}</strong></div>
          <div><span>Publicidad</span><strong>{moneyWithCents.format(totals.publicity)}</strong></div>
          <div><span>Neto</span><strong>{moneyWithCents.format(net)}</strong></div>
        </>}
        {!showTotals && <button type="button" className="primary-button" onClick={onClose}>Listo <Check size={14} /></button>}
      </footer>
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
  const [notes, setNotes] = useState('')
  const [typeId, setTypeId] = useState(options[0]?.id || '')
  const [saving, setSaving] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const add = async () => {
    const parsedAmount = parseLocalizedAmount(value)
    if (!(parsedAmount > 0)) { setToast('Ingresá un monto válido'); return }
    setSaving(true)
    try {
      if (kind === 'expenses') await createExpense(shiftId, { typeId, value: parsedAmount, notes })
      else await createTip(shiftId, { value: parsedAmount, user: detail, notes })
      setValue('')
      setDetail('')
      setNotes('')
      setToast(`${title} guardado`)
      onSaved()
    } catch (error) {
      setToast(error.message || `No se pudo guardar ${title.toLowerCase()}`)
    } finally {
      setSaving(false)
    }
  }
  return <section className={`panel operation-card movement-card movement-card-${kind}`}>
    <PanelTitle icon={Icon} title={title} action={<div className="operation-panel-actions"><small>{rows.length} registros</small><button className="icon-button" type="button" title={`Ver ${title.toLowerCase()}`} aria-label={`Ver ${title.toLowerCase()}`} onClick={() => setHistoryOpen(true)}><Eye size={15} /></button></div>} />
    <form className="entry-form" onSubmit={(event) => { event.preventDefault(); add() }}>
      {kind === 'expenses'
        ? <select aria-label="Tipo de gasto" value={typeId} onChange={(event) => setTypeId(event.target.value)} disabled={saving || !options.length}>
          {options.map(option => <option value={option.id} key={option.id}>{option.nombre}</option>)}
        </select>
        : <input aria-label="Usuario" placeholder="Usuario" value={detail} onChange={(event) => setDetail(event.target.value)} disabled={saving} />}
      <input aria-label="Monto" inputMode="decimal" placeholder="$ Monto" value={value} onChange={event => { if (!event.target.value.includes('-')) setValue(event.target.value) }} onKeyDown={event => { if (event.key === '-') event.preventDefault() }} disabled={saving} />
      <input aria-label="Notas" placeholder="Notas" value={notes} onChange={(event) => setNotes(event.target.value)} disabled={saving} />
      <button className="send-button" type="submit" title={`Agregar ${title.toLowerCase()}`} aria-label={`Agregar ${title.toLowerCase()}`} disabled={saving}><Send size={14} /></button>
    </form>
    <small className="section-kicker">{kind === 'expenses' ? 'Últimos gastos' : 'Últimas propinas'}</small>
    {rows.slice(0, 10).map(row => <div className="movement-row" key={row.id}>
      <span>{kind === 'tips'
        ? [row.usuario_texto, row.notas].filter(Boolean).join(' · ') || 'Propina'
        : [row.tipos_gasto?.nombre, row.notas].filter(Boolean).join(' · ') || 'Gasto'}</span>
      <b>{money.format(row.monto)}</b>
    </div>)}
    {!rows.length && <EmptyInline text="No hay movimientos registrados." />}
    <footer className="operation-total">Total <strong>{money.format(amount)}</strong></footer>
    {historyOpen && (kind === 'expenses'
      ? <ExpenseHistoryModal rows={rows} options={options} onClose={() => setHistoryOpen(false)} onSaved={onSaved} setToast={setToast} />
      : <OperationHistoryModal
        title="Propinas del turno"
        items={rows.map(row => ({ id: row.id, createdAt: row.fecha_hora_creacion, label: row.usuario_texto || 'Propina', detail: row.usuario_texto || '', notes: row.notas || '', amount: row.monto }))}
        onSaveItem={(item, draft, amount) => updateTipLine(item.id, { user: draft.detail, value: amount, notes: draft.notes })}
        onDeleteItem={item => deleteTipLine(item.id)}
        onSaved={onSaved}
        setToast={setToast}
        onClose={() => setHistoryOpen(false)}
      />)}
  </section>
}

function ExpenseHistoryModal({ rows, options, onClose, onSaved, setToast }) {
  const createDrafts = () => Object.fromEntries(rows.map(row => [row.id, {
    typeId: String(row.tipo_gasto_id),
    amount: numberWithCents.format(row.monto),
    notes: row.notas || '',
  }]))
  const [drafts, setDrafts] = useState(createDrafts)
  const [savingId, setSavingId] = useState(null)
  const [saving, setSaving] = useState(false)
  const savedDrafts = useRef(createDrafts())

  const changeDraft = (id, field, value) => {
    setDrafts(current => ({ ...current, [id]: { ...current[id], [field]: value } }))
  }

  const saveAll = async () => {
    const pending = rows.flatMap(row => {
      const draft = drafts[row.id]
      const saved = savedDrafts.current[row.id]
      if (!draft || (saved && saved.typeId === draft.typeId && saved.amount === draft.amount && saved.notes === draft.notes)) return []
      const amount = parseLocalizedAmount(draft.amount)
      return [{ row, draft, amount }]
    })
    const invalidAmount = pending.find(item => item.amount == null || item.amount < 0)
    if (invalidAmount) {
      setToast('Ingresá un monto válido')
      return
    }
    if (!pending.length) {
      onClose()
      return
    }

    setSaving(true)
    try {
      const results = await Promise.allSettled(pending.map(({ row, draft, amount }) => updateExpenseLine(row.id, { typeId: draft.typeId, value: amount, notes: draft.notes })))
      const successfulUpdates = []
      results.forEach((result, index) => {
        if (result.status !== 'fulfilled') return
        const { row, draft, amount } = pending[index]
        const savedDraft = { ...draft, amount: numberWithCents.format(amount) }
        savedDrafts.current[row.id] = savedDraft
        successfulUpdates.push([row.id, savedDraft])
      })
      if (successfulUpdates.length) {
        setDrafts(current => {
          const next = { ...current }
          successfulUpdates.forEach(([id, draft]) => { next[id] = draft })
          return next
        })
        onSaved()
      }
      const failedUpdate = results.find(result => result.status === 'rejected')
      if (failedUpdate) {
        setToast(failedUpdate.reason?.message || 'No se pudieron guardar todos los gastos')
        return
      }
      setToast('Gastos guardados')
      onClose()
    } finally {
      setSaving(false)
    }
  }

  const removeRow = async (row) => {
    if (!window.confirm('¿Querés borrar este gasto? Esta acción no se puede deshacer.')) return
    setSavingId(row.id)
    try {
      await deleteExpenseLine(row.id)
      setToast('Gasto eliminado')
      onSaved()
    } catch (error) {
      setToast(error.message || 'No se pudo eliminar el gasto')
    } finally {
      setSavingId(null)
    }
  }

  return <div className="modal-backdrop expense-history-backdrop" onClick={() => !saving && !savingId && onClose()}>
    <section className="bonus-history-modal expense-history-modal" role="dialog" aria-modal="true" aria-label="Gastos del turno" onClick={event => event.stopPropagation()}>
      <header>
        <div><h2><FileText size={16} /> Gastos del turno</h2><span>Editá los datos completos de cada movimiento.</span></div>
        <button className="modal-close" type="button" title="Cerrar" aria-label="Cerrar" onClick={onClose} disabled={saving || Boolean(savingId)}><X size={17} /></button>
      </header>
      <div className="expense-history-scroll">
        {rows.length ? rows.map(row => {
          const draft = drafts[row.id] || { typeId: String(row.tipo_gasto_id), amount: numberWithCents.format(row.monto), notes: row.notas || '' }
          return <div className="expense-history-row" key={row.id}>
            <time>{new Date(row.fecha_hora_creacion).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}</time>
            <select aria-label="Tipo de gasto" value={draft.typeId} onChange={event => changeDraft(row.id, 'typeId', event.target.value)} disabled={saving || savingId === row.id}>
              {options.map(option => <option value={option.id} key={option.id}>{option.nombre}</option>)}
            </select>
            <input aria-label="Monto del gasto" inputMode="decimal" value={draft.amount} onChange={event => { if (!event.target.value.includes('-')) changeDraft(row.id, 'amount', event.target.value) }} onKeyDown={event => { if (event.key === '-') event.preventDefault() }} disabled={saving || savingId === row.id} />
            <input aria-label="Notas del gasto" placeholder="Notas" value={draft.notes} onChange={event => changeDraft(row.id, 'notes', event.target.value)} disabled={saving || savingId === row.id} />
            <button className="delete-button" type="button" title="Eliminar gasto" aria-label="Eliminar gasto" onClick={() => removeRow(row)} disabled={saving || savingId === row.id}><Trash2 size={14} /></button>
          </div>
        }) : <EmptyInline text="Todavía no hay gastos registrados." />}
      </div>
      <footer><button className="close-button" type="button" onClick={saveAll} disabled={saving || Boolean(savingId)}>{saving ? 'Guardando...' : 'Listo'} <Check size={15} /></button></footer>
    </section>
  </div>
}

function OperationHistoryModal({ title, items, onClose, onSaveItem, onDeleteItem, onSaved, setToast, detailOptions = null, detailLabel = 'Usuario', allowNegativeAmounts = false }) {
  const createDrafts = () => Object.fromEntries(items.map(item => [item.id, {
    detail: item.detail || '',
    detailId: item.detailId == null ? '' : String(item.detailId),
    amount: numberWithCents.format(item.amount),
    notes: item.notes || '',
  }]))
  const [drafts, setDrafts] = useState(createDrafts)
  const [saving, setSaving] = useState(false)
  const [savingId, setSavingId] = useState(null)
  const savedDrafts = useRef(createDrafts())
  const editable = Boolean(onSaveItem)

  const changeDraft = (id, field, value) => {
    setDrafts(current => ({ ...current, [id]: { ...current[id], [field]: value } }))
  }

  const saveAll = async () => {
    const pending = items.flatMap(item => {
      const draft = drafts[item.id]
      const saved = savedDrafts.current[item.id]
      if (!draft || (saved && saved.detail === draft.detail && saved.detailId === draft.detailId && saved.amount === draft.amount && saved.notes === draft.notes)) return []
      return [{ item, draft, amount: parseLocalizedAmount(draft.amount) }]
    })
    if (pending.some(entry => entry.amount == null || (!allowNegativeAmounts && entry.amount < 0))) {
      setToast(allowNegativeAmounts ? 'Ingresá un monto válido' : 'Ingresá un monto válido, igual o mayor a cero')
      return
    }
    if (detailOptions && pending.some(entry => !entry.draft.detailId)) {
      setToast('Seleccioná una cuenta')
      return
    }
    if (!pending.length) {
      onClose()
      return
    }

    setSaving(true)
    try {
      const results = await Promise.allSettled(pending.map(({ item, draft, amount }) => onSaveItem(item, draft, amount)))
      const savedEntries = []
      results.forEach((result, index) => {
        if (result.status !== 'fulfilled') return
        const { item, draft, amount } = pending[index]
        const savedDraft = { ...draft, amount: numberWithCents.format(amount) }
        savedDrafts.current[item.id] = savedDraft
        savedEntries.push([item.id, savedDraft])
      })
      if (savedEntries.length) {
        setDrafts(current => {
          const next = { ...current }
          savedEntries.forEach(([id, draft]) => { next[id] = draft })
          return next
        })
        onSaved?.()
      }
      const failedResult = results.find(result => result.status === 'rejected')
      if (failedResult) {
        setToast(failedResult.reason?.message || 'No se pudieron guardar todos los cambios')
        return
      }
      setToast('Cambios guardados')
      onClose()
    } finally {
      setSaving(false)
    }
  }

  const removeItem = async item => {
    if (!onDeleteItem || !window.confirm('¿Querés borrar este registro? Esta acción no se puede deshacer.')) return
    setSavingId(item.id)
    try {
      await onDeleteItem(item)
      setToast('Registro eliminado')
      onSaved?.()
    } catch (error) {
      setToast(error.message || 'No se pudo eliminar el registro')
    } finally {
      setSavingId(null)
    }
  }

  return <div className="modal-backdrop operation-history-backdrop" onClick={() => !saving && !savingId && onClose()}>
    <section className="bonus-history-modal operation-history-modal" role="dialog" aria-modal="true" aria-label={title} onClick={event => event.stopPropagation()}>
      <header>
        <div><h2><Eye size={16} /> {title}</h2><span>{items.length} registros</span></div>
        <button className="modal-close" type="button" title="Cerrar" aria-label="Cerrar" onClick={onClose} disabled={saving || Boolean(savingId)}><X size={17} /></button>
      </header>
      <div className="operation-history-scroll">
        {items.length ? items.map(item => {
          const draft = drafts[item.id] || { detail: item.detail || '', detailId: item.detailId == null ? '' : String(item.detailId), amount: numberWithCents.format(item.amount), notes: item.notes || '' }
          return <div className={`operation-history-row ${editable ? 'editable' : ''}`} key={item.id}>
          <time>{item.createdAt ? new Date(item.createdAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) : '—'}</time>
          {editable ? <>
            {detailOptions
              ? <select aria-label={detailLabel} value={draft.detailId} onChange={event => changeDraft(item.id, 'detailId', event.target.value)} disabled={saving || savingId === item.id}>
                <option value="">Seleccionar cuenta</option>
                {detailOptions.map(option => <option value={option.value} key={option.value}>{option.label}</option>)}
              </select>
              : <input aria-label={detailLabel} placeholder={detailLabel} value={draft.detail} onChange={event => changeDraft(item.id, 'detail', event.target.value)} disabled={saving || savingId === item.id} />}
            <input aria-label="Monto" inputMode="decimal" value={draft.amount} onChange={event => { if (allowNegativeAmounts || !event.target.value.includes('-')) changeDraft(item.id, 'amount', event.target.value) }} onKeyDown={event => { if (!allowNegativeAmounts && event.key === '-') event.preventDefault() }} disabled={saving || savingId === item.id} />
            <input aria-label="Notas" placeholder="Notas" value={draft.notes} onChange={event => changeDraft(item.id, 'notes', event.target.value)} disabled={saving || savingId === item.id} />
            <button className="delete-button" type="button" title="Eliminar registro" aria-label="Eliminar registro" onClick={() => removeItem(item)} disabled={saving || savingId === item.id}><Trash2 size={14} /></button>
          </> : <>
            <span>{[item.label, item.notes].filter(Boolean).join(' · ')}</span>
            <b>{money.format(item.amount)}</b>
          </>}
          </div>
        }) : <EmptyInline text="Todavía no hay registros." />}
      </div>
      <footer><button className="close-button" type="button" onClick={editable ? saveAll : onClose} disabled={saving || Boolean(savingId)}>{saving ? 'Guardando...' : 'Listo'} <Check size={15} /></button></footer>
    </section>
  </div>
}

function BonusOperationCard({ shiftId, shift, rows, onSaved, setToast }) {
  const [value, setValue] = useState('')
  const [type, setType] = useState('granted')
  const [saving, setSaving] = useState(false)
  const [savingRecentId, setSavingRecentId] = useState(null)
  const [historyOpen, setHistoryOpen] = useState(false)
  const grantedCount = rows.filter(row => bonusTypeOf(row) === 'granted').length
  const recoveredCount = rows.filter(row => bonusTypeOf(row) === 'recovered').length
  const publicityCount = rows.filter(row => bonusTypeOf(row) === 'publicity').length
  const bonusTotals = rows.reduce((totals, row) => {
    totals[bonusTypeOf(row)] += Number(row.valor || 0)
    return totals
  }, { granted: 0, recovered: 0, publicity: 0 })
  const cycleType = () => setType(current => {
    const order = ['granted', 'recovered', 'publicity']
    return order[(order.indexOf(current) + 1) % order.length]
  })
  const add = async (event, submittedType = type) => {
    event.preventDefault()
    const amount = parseLocalizedAmount(value)
    if (!(amount > 0)) { setToast('Ingresá un monto válido'); return }
    setSaving(true)
    try {
      await createBonusLine(shiftId, { value: amount, type: submittedType, bonusId: rows[0]?.bono_id })
      setValue('')
      setType('granted')
      setToast(`${bonusTypeLabels[submittedType]} guardado`)
      onSaved()
    } catch (error) {
      setToast(error.message || 'No se pudo guardar el bono')
    } finally {
      setSaving(false)
    }
  }
  const saveRecentAmount = async (event, bonus) => {
    if (event.type === 'keydown' && event.key !== 'Enter') return
    if (event.type === 'keydown') event.preventDefault()
    const input = event.currentTarget
    const amount = parseLocalizedAmount(input.value)
    if (amount == null || amount < 0) {
      setToast('Ingresá un monto válido, igual o mayor a cero')
      input.value = money.format(bonus.valor)
      return
    }
    if (amount === Number(bonus.valor)) {
      input.value = money.format(bonus.valor)
      return
    }
    setSavingRecentId(bonus.id)
    try {
      await updateBonusLine(bonus.id, { value: amount })
      input.value = money.format(amount)
      setToast('Bono actualizado')
      onSaved()
    } catch (error) {
      input.value = money.format(bonus.valor)
      setToast(error.message || 'No se pudo guardar el monto del bono')
    } finally {
      setSavingRecentId(null)
    }
  }
  return <section className="panel operation-card operation-bonus-card">
    <PanelTitle icon={Gift} title="Bonos" meta={`Bonos: ${grantedCount} Otorgados | ${recoveredCount} Recuperados | ${publicityCount} Publicidad`} action={<div className="operation-panel-actions">
      <button className="icon-button" type="button" title="Agregar bono" aria-label="Agregar bono"><Plus size={15} /></button>
      <button className="icon-button" type="button" title="Ver bonos del turno" aria-label="Ver bonos del turno" onClick={() => setHistoryOpen(true)}><Eye size={15} /></button>
    </div>} />
    <form className={`bonus-inline-entry bonus-type-${type}`} onSubmit={add}>
      <label><span>$</span><input aria-label="Monto del bono" inputMode="decimal" placeholder={`Insertar Bono ${bonusTypeLabels[type]}`} value={value} onChange={event => setValue(event.target.value)} onKeyDown={event => {
        if (event.key === '+') {
          event.preventDefault()
          add(event, 'recovered')
        } else if (event.key === '-') {
          event.preventDefault()
          add(event, 'publicity')
        }
      }} disabled={saving} /></label>
      <button className={`bonus-mode-button bonus-type-${type}`} type="button" title={`Tipo: ${bonusTypeLabels[type]}. Cambiar tipo`} aria-label={`Tipo de bono: ${bonusTypeLabels[type]}`} onClick={cycleType} disabled={saving}><ArrowLeftRight size={14} /></button>
    </form>
    <div className="operation-recent-list">
      <small>Últimos bonos</small>
      {rows.slice(0, 20).map(row => <div className={`operation-recent-row bonus-type-${bonusTypeOf(row)}`} key={row.id}>
        <span>{bonusTypeLabels[bonusTypeOf(row)]}</span>
        <time>{new Date(row.fecha_hora_creacion).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}</time>
        <b className="operation-bonus-amount"><input
          aria-label={`Monto de bono ${bonusTypeLabels[bonusTypeOf(row)]}`}
          defaultValue={money.format(row.valor)}
          inputMode="decimal"
          disabled={savingRecentId === row.id}
          onFocus={event => { event.currentTarget.value = numberWithCents.format(row.valor); event.currentTarget.select() }}
          onBlur={event => saveRecentAmount(event, row)}
          onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); event.currentTarget.blur() } }}
        /></b>
      </div>)}
      {!rows.length && <EmptyInline text="Sin bonos registrados." />}
    </div>
    <footer className="operation-total operation-bonus-totals">
      <div><span>Otorgados</span><strong>{moneyWithCents.format(bonusTotals.granted)}</strong></div>
      <div><span>Recuperados</span><strong>{moneyWithCents.format(bonusTotals.recovered)}</strong></div>
      <div><span>Publicidad</span><strong>{moneyWithCents.format(bonusTotals.publicity)}</strong></div>
      <div><span>Neto</span><strong>{moneyWithCents.format(bonusNetTotal(rows))}</strong></div>
    </footer>
    {historyOpen && <BonusHistoryModal bonuses={rows} shift={shift} onClose={() => setHistoryOpen(false)} onSaved={onSaved} setToast={setToast} editableAmounts showTotals />}
  </section>
}

function TaChargesCard({ shiftId, rows, onSaved, setToast }) {
  const [user, setUser] = useState('')
  const [value, setValue] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const add = async (event) => {
    event.preventDefault()
    const amount = parseLocalizedAmount(value)
    if (amount == null || amount === 0) { setToast('Ingresá un monto válido'); return }
    setSaving(true)
    try {
      await createTaCharge(shiftId, { value: amount, user, notes })
      setUser('')
      setValue('')
      setNotes('')
      setToast('Carga T.A. guardada')
      onSaved()
    } catch (error) {
      setToast(error.message || 'No se pudo guardar la carga T.A.')
    } finally {
      setSaving(false)
    }
  }
  const total = rows.reduce((sum, row) => sum + Number(row.monto || 0), 0)
  return <section className="panel operation-card operation-ta-charges">
    <PanelTitle icon={Banknote} title="Cargas T.A." action={<div className="operation-panel-actions"><small>{rows.length} registros</small><button className="icon-button" type="button" title="Ver cargas T.A." aria-label="Ver cargas T.A." onClick={() => setHistoryOpen(true)}><Eye size={15} /></button></div>} />
    <form className="operation-form" onSubmit={add}>
      <input aria-label="Usuario" placeholder="Usuario" value={user} onChange={event => setUser(event.target.value)} disabled={saving} />
      <input aria-label="Monto de carga T.A." inputMode="decimal" placeholder="$ Monto" value={value} onChange={event => setValue(event.target.value)} disabled={saving} />
      <input aria-label="Notas de carga T.A." placeholder="Notas" value={notes} onChange={event => setNotes(event.target.value)} disabled={saving} />
      <button className="operation-submit" type="submit" title="Agregar carga T.A." aria-label="Agregar carga T.A." disabled={saving}><Send size={14} /></button>
    </form>
    <div className="operation-recent-list">
      <small>Últimas cargas</small>
      {rows.slice(0, 9).map(row => <div className="operation-recent-row" key={row.id}>
        <span>{row.usuario_texto || row.notas || 'Carga T.A.'}</span>
        <b>{money.format(row.monto)}</b>
      </div>)}
      {!rows.length && <EmptyInline text="Sin movimientos todavía." />}
    </div>
    <footer className="operation-total">Total <strong>{money.format(total)}</strong></footer>
    {historyOpen && <OperationHistoryModal
      title="Cargas T.A. del turno"
      items={rows.map(row => ({ id: row.id, createdAt: row.fecha_hora_creacion, detail: row.usuario_texto || '', notes: row.notas || '', amount: row.monto }))}
      onSaveItem={(item, draft, amount) => updateTaChargeLine(item.id, { user: draft.detail, value: amount, notes: draft.notes })}
      onDeleteItem={item => deleteTaChargeLine(item.id)}
      onSaved={onSaved}
      setToast={setToast}
      allowNegativeAmounts
      onClose={() => setHistoryOpen(false)}
    />}
  </section>
}

function FoundMoneyCard({ accounts, rows, onSaved, setToast }) {
  const [accountId, setAccountId] = useState(accounts[0]?.id?.toString() || '')
  const [value, setValue] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const accountName = account => `${account.cuentas?.titulares?.nombre || 'Sin titular'} · ${account.cuentas?.billeteras?.nombre || 'Sin billetera'}`
  const add = async (event) => {
    event.preventDefault()
    const amount = parseLocalizedAmount(value)
    if (!accountId) { setToast('Seleccioná una cuenta'); return }
    if (!(amount > 0)) { setToast('Ingresá un monto válido'); return }
    setSaving(true)
    try {
      await createFoundMoney({ accountShiftId: accountId, value: amount, notes })
      setValue('')
      setNotes('')
      setToast('Dinero encontrado guardado')
      onSaved()
    } catch (error) {
      setToast(error.message || 'No se pudo guardar el dinero encontrado')
    } finally {
      setSaving(false)
    }
  }
  const total = rows.reduce((sum, row) => sum + Number(row.monto || 0), 0)
  return <section className="panel operation-card operation-found-money">
    <PanelTitle icon={Search} title="Dinero encontrado" action={<div className="operation-panel-actions"><small>{rows.length} registros</small><button className="icon-button" type="button" title="Ver dinero encontrado" aria-label="Ver dinero encontrado" onClick={() => setHistoryOpen(true)}><Eye size={15} /></button></div>} />
    <form className="operation-form" onSubmit={add}>
      <select aria-label="Cuenta donde se encontró dinero" value={accountId} onChange={event => setAccountId(event.target.value)} disabled={saving || !accounts.length}>
        {accounts.length ? accounts.map(account => <option value={account.id} key={account.id}>{accountName(account)}</option>) : <option value="">Sin cuentas</option>}
      </select>
      <input aria-label="Monto encontrado" inputMode="decimal" placeholder="$ Monto" value={value} onChange={event => { if (!event.target.value.includes('-')) setValue(event.target.value) }} onKeyDown={event => { if (event.key === '-') event.preventDefault() }} disabled={saving} />
      <input aria-label="Notas del dinero encontrado" placeholder="Notas" value={notes} onChange={event => setNotes(event.target.value)} disabled={saving} />
      <button className="operation-submit" type="submit" title="Agregar dinero encontrado" aria-label="Agregar dinero encontrado" disabled={saving || !accounts.length}><Send size={14} /></button>
    </form>
    <div className="operation-recent-list">
      <small>Últimos registros</small>
      {rows.slice(0, 9).map(row => <div className="operation-recent-row" key={row.id}>
        <span>{accounts.find(account => String(account.id) === String(row.cuenta_x_turno_id)) ? accountName(accounts.find(account => String(account.id) === String(row.cuenta_x_turno_id))) : row.notas || 'Dinero encontrado'}</span>
        <b>{money.format(row.monto)}</b>
      </div>)}
      {!rows.length && <EmptyInline text="Sin movimientos todavía." />}
    </div>
    <footer className="operation-total">Total <strong>{money.format(total)}</strong></footer>
    {historyOpen && <OperationHistoryModal
      title="Dinero encontrado del turno"
      items={rows.map(row => ({ id: row.id, createdAt: row.fecha_hora_creacion, detailId: row.cuenta_x_turno_id, detail: accountName(accounts.find(account => String(account.id) === String(row.cuenta_x_turno_id)) || {}), notes: row.notas || '', amount: row.monto }))}
      detailLabel="Cuenta"
      detailOptions={accounts.map(account => ({ value: String(account.id), label: accountName(account) }))}
      onSaveItem={(item, draft, amount) => updateFoundMoneyLine(item.id, { accountShiftId: draft.detailId, value: amount, notes: draft.notes })}
      onDeleteItem={item => deleteFoundMoneyLine(item.id)}
      onSaved={onSaved}
      setToast={setToast}
      onClose={() => setHistoryOpen(false)}
    />}
  </section>
}

function ShiftNotesCard({ shiftId, notes, onSaved, setToast }) {
  const [draft, setDraft] = useState({ general: notes?.nota_general || '', inheritable: notes?.nota_heredable || '' })
  const [saving, setSaving] = useState(false)
  useEffect(() => setDraft({ general: notes?.nota_general || '', inheritable: notes?.nota_heredable || '' }), [notes?.id, notes?.nota_general, notes?.nota_heredable])
  const save = async () => {
    if (draft.general === (notes?.nota_general || '') && draft.inheritable === (notes?.nota_heredable || '')) return
    setSaving(true)
    try {
      await saveShiftNotes(shiftId, draft)
      setToast('Notas del turno guardadas')
      onSaved()
    } catch (error) {
      setToast(error.message || 'No se pudieron guardar las notas')
    } finally {
      setSaving(false)
    }
  }
  return <section className="panel operation-card shift-notes-card">
    <PanelTitle icon={FileText} title="Notas del turno" meta={saving ? 'Guardando...' : '2 notas'} />
    <label className="shift-note-field"><span>Nota actual</span><textarea value={draft.general} onChange={event => setDraft(current => ({ ...current, general: event.target.value }))} onBlur={save} placeholder="Información importante de este turno" /></label>
    <label className="shift-note-field"><span>Para el próximo turno</span><textarea value={draft.inheritable} onChange={event => setDraft(current => ({ ...current, inheritable: event.target.value }))} onBlur={save} placeholder="Información que conviene heredar" /></label>
  </section>
}

function TransferMovementsCard({ shift, boxes, accounts, rows, onSaved, setToast }) {
  const [fromBoxId, setFromBoxId] = useState(shift.caja_id?.toString() || boxes[0]?.id?.toString() || '')
  const [toBoxId, setToBoxId] = useState(boxes.find(box => String(box.id) !== String(shift.caja_id))?.id?.toString() || '')
  const [accountId, setAccountId] = useState(accounts[0]?.id?.toString() || '')
  const [value, setValue] = useState('')
  const [notes, setNotes] = useState('')
  const [savings, setSavings] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showAllRows, setShowAllRows] = useState(false)
  const add = async (event) => {
    event.preventDefault()
    const amount = parseLocalizedAmount(value)
    if (boxes.length < 2) { setToast('Se necesitan dos cajas para crear un movimiento'); return }
    if (!accountId) { setToast('Seleccioná una cuenta'); return }
    if (!(amount > 0)) { setToast('Ingresá un monto válido'); return }
    setSaving(true)
    try {
      await createTransferMovement(shift.id, { fromBoxId, toBoxId, accountShiftId: accountId, value: amount, notes, savings })
      setValue('')
      setNotes('')
      setToast('Movimiento guardado')
      onSaved()
    } catch (error) {
      setToast(error.message || 'No se pudo guardar el movimiento')
    } finally {
      setSaving(false)
    }
  }
  const boxName = id => boxes.find(box => String(box.id) === String(id))?.nombre || 'Caja'
  const accountName = id => {
    const account = accounts.find(item => String(item.id) === String(id))
    return account ? `${account.cuentas?.titulares?.nombre || 'Sin titular'} · ${account.cuentas?.billeteras?.nombre || 'Sin billetera'}` : 'Cuenta'
  }
  const swapBoxes = () => {
    setFromBoxId(toBoxId)
    setToBoxId(fromBoxId)
  }
  return <section className="panel operation-card transfer-card">
    <PanelTitle
      icon={ArrowLeftRight}
      title="Movimientos"
      meta={`${rows.length} registros`}
      action={<div className="operation-panel-actions">
        <label className="savings-toggle"><span>Movimientos de ahorro</span><input type="checkbox" checked={savings} onChange={event => setSavings(event.target.checked)} disabled={saving} /></label>
        <button className="icon-button" type="button" title={showAllRows ? 'Mostrar últimos movimientos' : 'Ver todos los movimientos'} aria-label={showAllRows ? 'Mostrar últimos movimientos' : 'Ver todos los movimientos'} onClick={() => setShowAllRows(current => !current)}><Eye size={15} /></button>
      </div>}
    />
    <form className="transfer-form" onSubmit={add}>
      <label className="transfer-field"><span>Desde</span><select aria-label="Caja de origen" value={fromBoxId} onChange={event => { const nextFrom = event.target.value; setFromBoxId(nextFrom); if (nextFrom === toBoxId) setToBoxId(boxes.find(box => String(box.id) !== nextFrom)?.id?.toString() || '') }} disabled={saving || boxes.length < 2}>
        {boxes.map(box => <option value={box.id} key={box.id}>{box.nombre}</option>)}
      </select></label>
      <button className="transfer-swap" type="button" title="Intercambiar cajas" aria-label="Intercambiar caja de origen y destino" onClick={swapBoxes} disabled={saving || boxes.length < 2}><ArrowLeftRight size={16} /></button>
      <label className="transfer-field"><span>Hasta</span><select aria-label="Caja de destino" value={toBoxId} onChange={event => setToBoxId(event.target.value)} disabled={saving || boxes.length < 2}>
        {boxes.filter(box => String(box.id) !== String(fromBoxId)).map(box => <option value={box.id} key={box.id}>{box.nombre}</option>)}
      </select></label>
      <label className="transfer-field transfer-account"><span>Cuenta</span><select aria-label="Cuenta del movimiento" value={accountId} onChange={event => setAccountId(event.target.value)} disabled={saving || !accounts.length}>
        {accounts.map(account => <option value={account.id} key={account.id}>{accountName(account.id)}</option>)}
      </select></label>
      <label className="transfer-field transfer-amount"><span>Monto</span><input aria-label="Monto del movimiento" inputMode="decimal" placeholder="$ 0,00" value={value} onChange={event => setValue(event.target.value)} disabled={saving} /></label>
      <button className="operation-submit transfer-submit" type="submit" title="Agregar movimiento" aria-label="Agregar movimiento" disabled={saving || boxes.length < 2 || !accounts.length}><Send size={14} /></button>
      <input className="transfer-notes" aria-label="Notas del movimiento" placeholder="Notas" value={notes} onChange={event => setNotes(event.target.value)} disabled={saving} />
    </form>
    <div className="operation-recent-list">
      <small>Últimos movimientos</small>
      {(showAllRows ? rows : rows.slice(0, 4)).map(row => <div className="operation-recent-row" key={row.id}>
        <span>{row.es_ahorro ? 'Ahorro · ' : ''}{boxName(row.caja_desde_id)} &gt; {boxName(row.caja_hasta_id)} · {accountName(row.cuenta_x_turno_id)}</span>
        <b>{money.format(row.monto)}</b>
      </div>)}
      {!rows.length && <EmptyInline text="Sin movimientos todavía." />}
    </div>
  </section>
}

function ChipControlCard({ chips, onSaved, onChipFinalSaved, setToast }) {
  const formatValue = value => value == null ? '' : numberWithCents.format(value)
  const [drafts, setDrafts] = useState(() => Object.fromEntries(chips.map(chip => [chip.id, formatValue(chip.fichas_final)])))
  const chipFinalsKey = chips.map(chip => `${chip.id}:${chip.fichas_final ?? ''}`).join('|')
  const [savingId, setSavingId] = useState(null)
  const [showLoads, setShowLoads] = useState(true)
  const [loadModalOpen, setLoadModalOpen] = useState(false)
  const [loadPlatformId, setLoadPlatformId] = useState(chips[0]?.id?.toString() || '')
  const [loadAmount, setLoadAmount] = useState('')
  const savingLoad = savingId === 'load'
  useEffect(() => {
    setDrafts(Object.fromEntries(chips.map(chip => [chip.id, formatValue(chip.fichas_final)])))
  }, [chipFinalsKey])
  const saveFinal = async chip => {
    const raw = drafts[chip.id] ?? formatValue(chip.fichas_final)
    const normalized = raw.trim().replace(/\s/g, '').replace(/\./g, '').replace(',', '.')
    const value = normalized ? Number(normalized) : null
    if (value != null && (!Number.isFinite(value) || value < 0)) {
      setToast('Ingresá un valor final válido, igual o mayor a cero')
      setDrafts(current => ({ ...current, [chip.id]: formatValue(chip.fichas_final) }))
      return
    }
    const savedValue = chip.fichas_final == null ? null : Number(chip.fichas_final)
    if (value === savedValue) return
    setSavingId(chip.id)
    try {
      await updateChipFinal(chip.id, value)
      onChipFinalSaved(chip.id, value)
      setDrafts(current => ({ ...current, [chip.id]: formatValue(value) }))
      setToast('Ficha final guardada')
    } catch (error) {
      setToast(error.message || 'No se pudo guardar la ficha final')
      setDrafts(current => ({ ...current, [chip.id]: formatValue(chip.fichas_final) }))
    } finally {
      setSavingId(null)
    }
  }
  const addLoad = async event => {
    event.preventDefault()
    const amount = parseLocalizedAmount(loadAmount)
    if (!(amount > 0)) { setToast('Ingresá un monto válido'); return }
    if (!chips.some(chip => String(chip.id) === String(loadPlatformId))) {
      setToast('Seleccioná una plataforma')
      return
    }
    setSavingId('load')
    try {
      await createChipLoad(loadPlatformId, amount)
      setLoadAmount('')
      setLoadModalOpen(false)
      setToast('Carga de fichas guardada')
      onSaved()
    } catch (error) {
      setToast(error.message || 'No se pudo guardar la carga de fichas')
    } finally {
      setSavingId(null)
    }
  }
  const totalBalance = chips.reduce((sum, chip) => {
    return sum + Number(chip.fichas_inicial || 0) - Number(chip.fichas_final || 0)
  }, 0)
  return <section className="panel operation-card chip-control-card">
    <PanelTitle icon={Boxes} title="Control de fichas" meta={`${chips.length} plataformas`} action={<div className="operation-panel-actions">
      <button className="icon-button" type="button" title="Cargar fichas" aria-label="Cargar fichas" onClick={() => { setLoadPlatformId(chips[0]?.id?.toString() || ''); setLoadModalOpen(true) }} disabled={!chips.length}><Plus size={15} /></button>
      <button className={`icon-button ${!showLoads ? 'selected' : ''}`} type="button" title={showLoads ? 'Ocultar cargas registradas' : 'Mostrar cargas registradas'} aria-label={showLoads ? 'Ocultar cargas registradas' : 'Mostrar cargas registradas'} onClick={() => setShowLoads(current => !current)}><Eye size={15} /></button>
    </div>} />
    {chips.length ? <>
      <div className="chip-control-head"><span>Plataforma</span><span>Inicial</span><span>Final</span><span>Saldo</span></div>
      <div className="chip-control-list">{chips.map(chip => {
        const loads = (chip.cargas_fichas || []).reduce((sum, load) => sum + Number(load.valor || 0), 0)
        const balance = Number(chip.fichas_inicial || 0) - Number(chip.fichas_final || 0)
        return <div className="chip-control-row" key={chip.id}>
          <strong>{chip.plataformas?.nombre || 'Plataforma'}</strong>
          <span>{money.format(chip.fichas_inicial)}</span>
          <input className="chip-final-input" aria-label={`Ficha final ${chip.plataformas?.nombre || 'plataforma'}`} inputMode="decimal" placeholder="$ 0,00" value={drafts[chip.id] ?? formatValue(chip.fichas_final)} onChange={event => setDrafts(current => ({ ...current, [chip.id]: event.target.value }))} onBlur={() => saveFinal(chip)} onKeyDown={event => { if (event.key === 'Enter') event.currentTarget.blur() }} disabled={savingId === chip.id || savingLoad} />
          <span className={balance > 0 ? 'positive' : balance < 0 ? 'negative' : ''}>{money.format(balance)}</span>
          {showLoads && <small className="chip-load-total">Cargas registradas {money.format(loads)}</small>}
        </div>
      })}</div>
    </> : <EmptyInline text="No hay fichas configuradas para este turno." />}
    {Boolean(chips.length) && <footer className="operation-total chip-control-total">Total saldo <strong className={totalBalance > 0 ? 'positive' : totalBalance < 0 ? 'negative' : ''}>{money.format(totalBalance)}</strong></footer>}
    {loadModalOpen && <div className="modal-backdrop chip-load-backdrop" onClick={() => !savingLoad && setLoadModalOpen(false)}>
      <section className="modal chip-load-modal" role="dialog" aria-modal="true" aria-labelledby="chip-load-title" onClick={event => event.stopPropagation()}>
        <button className="modal-close" type="button" title="Cerrar" aria-label="Cerrar" onClick={() => setLoadModalOpen(false)} disabled={savingLoad}><X size={17} /></button>
        <h2 id="chip-load-title"><Boxes size={19} /> Carga de fichas</h2>
        <p>Sumá fichas al inicio de este turno.</p>
        <form onSubmit={addLoad}>
          <label><span>Monto</span><div className="chip-load-amount"><b>$</b><input aria-label="Monto de la carga" inputMode="decimal" placeholder="0,00" value={loadAmount} onChange={event => { if (!event.target.value.includes('-')) setLoadAmount(event.target.value) }} disabled={savingLoad} autoFocus /></div></label>
          <label><span>Plataforma</span><select aria-label="Plataforma para cargar fichas" value={loadPlatformId} onChange={event => setLoadPlatformId(event.target.value)} disabled={savingLoad}>
            {chips.map(chip => <option value={chip.id} key={chip.id}>{chip.plataformas?.nombre || 'Plataforma'}</option>)}
          </select></label>
          <div className="chip-load-modal-actions">
            <button className="secondary-button" type="button" onClick={() => setLoadModalOpen(false)} disabled={savingLoad}>Cancelar</button>
            <button className="close-button" type="submit" disabled={savingLoad}>{savingLoad ? 'Cargando...' : 'Cargar'} <Check size={15} /></button>
          </div>
        </form>
      </section>
    </div>}
  </section>
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

function ConfigList({ title, items, select }) { return <section className="panel config-list"><div className="panel-title"><h2>{title}</h2><small>{items.length} elementos</small></div>{items.map(item => <div className="config-row" key={item.id || item}><span className="drag">⠿</span><input defaultValue={item.nombre || item} />{select && <select defaultValue="Cobros + retiros"><option>Cobros + retiros</option><option>Solo cobros</option><option>Solo depósito</option></select>}<button className="icon-button"><Trash2 size={14} /></button></div>)}{!items.length && <EmptyInline text="No hay registros configurados." />}<button className="secondary-button"><Plus size={14} /> Agregar</button></section> }

function LiveStatistics({ data }) {
  const tips = data.tips.reduce((sum, row) => sum + Number(row.monto || 0), 0)
  const expenses = data.expenses.reduce((sum, row) => sum + Number(row.monto || 0), 0)
  const bonuses = bonusNetTotal(data.bonuses)
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
      bonusTypes: (localData.bonusTypes || []).map((type) => ({ id: type.id, name: type.nombre || 'Tipo', percentageCount: Number(type.cantidad_porcentaje ?? 1) })),
    }
  }, [localData.accounts, localData.boxes, localData.colors, localData.holders, localData.wallets, localData.walletTypes, localData.platforms, localData.expenseTypes, localData.bonusConditions, localData.bonusTypes, currentBoxId])

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
        {renderTabButton('bonuses', 'Estados', Gift)}
        {renderTabButton('goals', 'Objetivos', Target)}
        {renderTabButton('app', 'Aplicación', Settings2)}
      </div>

      <section className="settings-intro">
        <span className="eyebrow">Configuración</span>
        <h2>{tab === 'boxes' ? 'Cajas' : tab === 'turns' ? 'Turnos' : tab === 'accounts' ? 'Matriz de cuentas' : tab === 'expenses' ? 'Gastos' : tab === 'platforms' ? 'Control de fichas' : tab === 'users' ? 'Usuarios' : tab === 'bonuses' ? 'Estados' : tab === 'goals' ? 'Objetivos' : 'Aplicación'}</h2>
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
                }}><Trash2 size={14} /></button>
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
                <button type="button" className="delete-button" title="Eliminar tipo de turno" onClick={() => persistUpdate(() => deleteShiftType(type.id), 'Tipo de turno eliminado de Supabase')}><Trash2 size={14} /></button>
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
            <button type="button" className="delete-button" title="Eliminar día" onClick={() => persistUpdate(() => deleteDayShift(day.id), 'Día de turno eliminado de Supabase')}><Trash2 size={14} /></button>
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
            }}><Trash2 size={14} /></button>
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
                }}><Trash2 size={14} /></button>
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
                }}><Trash2 size={14} /></button>
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
                <button type="button" className="delete-button" title="Desactivar tipo de cuenta" onClick={() => persistUpdate(() => deleteAccountType(type.id), 'Tipo de cuenta desactivado')}><Trash2 size={14} /></button>
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
                <button type="button" className="delete-button" title="Desactivar tipo de billetera" onClick={() => persistUpdate(() => deleteWalletType(type.id), 'Tipo de billetera desactivado')}><Trash2 size={14} /></button>
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
            }}><Trash2 size={14} /></button>
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
            }}><Trash2 size={14} /></button>
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
        <div className="config-two-columns bonus-settings-grid">
          <section className="config-card bonus-types-card">
            <div className="config-list-head"><h3>Tipos de estado</h3><span>{draft.bonusTypes.length} elementos</span></div>
            {draft.bonusTypes.map((type, index) => (
              <div className="config-list-row bonus-type-config-row" key={type.id || index}>
                <input value={type.name} aria-label="Nombre del tipo de bono" onChange={event => setDraft(current => ({
                  ...current,
                  bonusTypes: current.bonusTypes.map((item, itemIndex) => itemIndex === index ? { ...item, name: event.target.value } : item),
                }))} onBlur={event => {
                  const name = event.target.value.trim()
                  const target = localData.bonusTypes?.find(item => item.id === type.id)
                  if (!target || !name || name === target.nombre) return
                  persistUpdate(() => updateBonusType(target.id, { name, percentageCount: type.percentageCount }), 'Tipo de bono actualizado')
                }} placeholder="Nombre del tipo" />
                <input type="number" min="0" step="1" value={type.percentageCount} aria-label={`Cantidad de porcentajes para ${type.name}`} title="Cantidad de porcentajes distintos que puede almacenar un bono" onChange={event => setDraft(current => ({
                  ...current,
                  bonusTypes: current.bonusTypes.map((item, itemIndex) => itemIndex === index ? { ...item, percentageCount: event.target.value } : item),
                }))} onBlur={event => {
                  const percentageCount = Number(event.target.value)
                  const target = localData.bonusTypes?.find(item => item.id === type.id)
                  if (!target) return
                  if (!Number.isInteger(percentageCount) || percentageCount < 0) {
                    setToast('La cantidad de porcentajes debe ser un entero igual o mayor a cero')
                    setDraft(current => ({
                      ...current,
                      bonusTypes: current.bonusTypes.map(item => item.id === type.id ? { ...item, percentageCount: Number(target.cantidad_porcentaje ?? 1) } : item),
                    }))
                    return
                  }
                  if (percentageCount === Number(target.cantidad_porcentaje)) return
                  persistUpdate(() => updateBonusType(target.id, { name: type.name, percentageCount }), 'Cantidad de porcentajes actualizada')
                }} />
                <button type="button" className="delete-button" title="Eliminar tipo de bono" aria-label={`Eliminar tipo ${type.name}`} onClick={() => {
                  const target = localData.bonusTypes?.find(item => item.id === type.id)
                  if (target) persistUpdate(() => deleteBonusType(target.id), 'Tipo de bono eliminado')
                }}><Trash2 size={14} /></button>
              </div>
            ))}
            <button type="button" className="config-add" onClick={() => persistUpdate(() => createBonusType({ name: 'Nuevo tipo', percentageCount: 1 }), 'Tipo de bono creado')}><Plus size={15} /> Agregar tipo</button>
          </section>

          <section className="config-card">
            <div className="config-list-head"><h3>Condiciones de bono</h3><span>{draft.bonusConditions.length} elementos</span></div>
            {draft.bonusConditions.map((condition, index) => (
              <div className="config-list-row" key={condition.id || index}>
                <input value={condition.label} onChange={(event) => setDraft((current) => ({ ...current, bonusConditions: current.bonusConditions.map((item, itemIndex) => itemIndex === index ? { ...item, label: event.target.value } : item) }))} onBlur={async (event) => {
                  const value = event.target.value.trim()
                  const target = localData.bonusConditions?.find(item => item.id === condition.id)
                  if (!value || !target) return
                  await persistUpdate(() => updateBonusCondition(target.id, { name: value, platform: condition.allow }), 'Condición de bono guardada en Supabase')
                }} placeholder="Etiqueta" />
                <div className="bonus-condition-platform">
                  <label className="toggle-cell" aria-label={`Plataforma para ${condition.label}`}>
                    <input type="checkbox" checked={condition.allow} onChange={async () => {
                      setDraft((current) => ({ ...current, bonusConditions: current.bonusConditions.map((item, itemIndex) => itemIndex === index ? { ...item, allow: !item.allow } : item) }))
                      const target = localData.bonusConditions?.find(item => item.id === condition.id)
                      if (target) await persistUpdate(() => updateBonusCondition(target.id, { name: condition.label, platform: !condition.allow }), 'Condición de bono actualizada en Supabase')
                    }} />
                    <span />
                  </label>
                  <span>Plataforma</span>
                </div>
                <button type="button" className="delete-button" title="Eliminar condición" onClick={async () => {
                  const target = localData.bonusConditions?.find(item => item.id === condition.id)
                  if (!target) return
                  await persistUpdate(() => deleteBonusCondition(target.id), 'Condición de bono eliminada de Supabase')
                }}><Trash2 size={14} /></button>
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
            <button type="button" className="delete-button" title="Eliminar color" onClick={() => persistUpdate(() => deleteColor(color.id), 'Color eliminado')}><Trash2 size={14} /></button>
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
