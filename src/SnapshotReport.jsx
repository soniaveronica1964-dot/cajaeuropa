import React from 'react'
import {
  ArrowDownToLine,
  ArrowLeftRight,
  Banknote,
  Camera,
  CircleDollarSign,
  FileText,
  Gift,
  ReceiptText,
  Ticket,
  WalletCards,
} from 'lucide-react'
import './snapshot-report.css'

const reportMoney = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const amountOf = value => Number(value) || 0

function formatTime(value) {
  if (!value) return '--:--'
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? '--:--'
    : new Intl.DateTimeFormat('es-AR', { hour: '2-digit', minute: '2-digit' }).format(date)
}

function formatClockMinutes(value) {
  const minutes = ((Math.round(value) % 1440) + 1440) % 1440
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
}

function shiftDurationMinutes(shift) {
  const day = shift.dias_turno
  const [startHour, startMinute] = String(day?.hora_inicio || '').split(':').map(Number)
  const [endHour, endMinute] = String(day?.hora_fin || '').split(':').map(Number)
  if (![startHour, startMinute, endHour, endMinute].every(Number.isFinite)) return 480
  const start = startHour * 60 + startMinute
  const end = endHour * 60 + endMinute
  const duration = (end - start + 1440) % 1440
  return duration || (day?.cruza_medianoche ? 1440 : 480)
}

function makeOperations(data, accounts) {
  const accountByShiftLink = new Map(accounts.map(account => [String(account.id), account]))
  const boxes = data.boxes || []
  const shiftId = String(data.shift.id)
  const movements = data.movements || []
  const belongsToShift = row => (
    String(row.turno_id) === shiftId || String(row.turno_destino_id) === shiftId
  )
  const transfers = movements.filter(row => !row.es_ahorro && belongsToShift(row))
  const savingsMovements = movements.filter(row => row.es_ahorro && belongsToShift(row))
  const boxName = id => boxes.find(box => String(box.id) === String(id))?.nombre || 'Caja'
  const visible = value => value != null && String(value).trim() !== ''
  const details = (...values) => values.filter(visible)
  const total = rows => rows.reduce((sum, row) => sum + amountOf(row.monto), 0)

  return [
    {
      title: 'Gastos',
      Icon: ReceiptText,
      rows: (data.expenses || []).map(row => ({
        ...row,
        createdAt: row.fecha_hora_creacion,
        amount: row.monto,
        detail: details(row.tipos_gasto?.nombre, row.notas),
      })),
      total: (data.expenses || []).reduce((sum, row) => {
        const sign = row.tipos_gasto?.invertir_signo ? -1 : 1
        return sum + amountOf(row.monto) * sign
      }, 0),
    },
    {
      title: 'Propinas',
      Icon: CircleDollarSign,
      rows: (data.tips || []).map(row => ({
        ...row,
        createdAt: row.fecha_hora_creacion,
        amount: row.monto,
        detail: details(row.usuario_texto, row.notas),
      })),
      total: total(data.tips || []),
    },
    {
      title: 'Cargas T.A.',
      Icon: ArrowDownToLine,
      rows: (data.taCharges || []).map(row => ({
        ...row,
        createdAt: row.fecha_hora_creacion,
        amount: row.monto,
        detail: details(row.usuario_texto, row.notas),
      })),
      total: total(data.taCharges || []),
    },
    {
      title: 'Traspasos',
      Icon: ArrowLeftRight,
      rows: transfers.map(row => ({
        ...row,
        createdAt: row.fecha_hora_creacion,
        amount: row.monto,
        detail: details(`${boxName(row.caja_desde_id)} → ${boxName(row.caja_hasta_id)}`, row.notas),
      })),
      total: total(transfers),
    },
    {
      title: 'Movimientos de ahorro',
      Icon: WalletCards,
      rows: savingsMovements.map(row => {
        const account = accountByShiftLink.get(String(row.cuenta_x_turno_id))
        return {
          ...row,
          createdAt: row.fecha_hora_creacion,
          amount: row.monto,
          detail: details(account?.holder, account?.wallet, row.notas),
        }
      }),
      total: total(savingsMovements),
    },
    {
      title: 'Dinero encontrado',
      Icon: Banknote,
      rows: (data.foundMoney || []).map(row => {
        const account = accountByShiftLink.get(String(row.cuenta_x_turno_id))
        return {
          ...row,
          createdAt: row.fecha_hora_creacion,
          amount: row.monto,
          detail: details(account?.holder, account?.wallet, row.notas),
        }
      }),
      total: total(data.foundMoney || []),
    },
    {
      title: 'Notas del turno',
      Icon: FileText,
      rows: [
        data.shiftNotes?.nota_general?.trim() && {
          id: 'current-note',
          label: 'Actual',
          note: data.shiftNotes.nota_general,
        },
        data.shiftNotes?.nota_heredable?.trim() && {
          id: 'next-note',
          label: 'Siguiente',
          note: data.shiftNotes.nota_heredable,
        },
      ].filter(Boolean).map(row => ({ ...row, detail: [row.label, row.note] })),
    },
  ]
}

function SnapshotReport({
  data,
  accounts,
  holders,
  wallets,
  chips,
  cashFinal,
  cashInitial,
  cashDifference,
  cashDiscrepancy,
  realDifference,
  rounding,
  accentColor,
  snapshotRef,
}) {
  const shift = data.shift
  const shiftName = (shift.dias_turno?.nombre || 'Noche').replace(/^turno\s+/i, '')
  const startMinutes = (() => {
    const [hour, minute] = String(shift.dias_turno?.hora_inicio || '00:00').split(':').map(Number)
    return (hour || 0) * 60 + (minute || 0)
  })()
  const duration = shiftDurationMinutes(shift)
  const bonusRows = data.bonuses || []
  const bonusSlots = Array.from({ length: 4 }, (_, index) => {
    const slotDuration = duration / 4
    const from = startMinutes + index * slotDuration
    const to = from + slotDuration
    const items = bonusRows.filter(row => {
      const createdAt = new Date(row.fecha_hora_creacion)
      const shiftStart = new Date(shift.fecha_hora_inicio)
      if (Number.isNaN(createdAt.getTime()) || Number.isNaN(shiftStart.getTime())) return false
      const elapsedMinutes = (createdAt.getTime() - shiftStart.getTime()) / 60000
      return elapsedMinutes >= index * slotDuration && elapsedMinutes < (index + 1) * slotDuration
    }).sort((left, right) => new Date(left.fecha_hora_creacion) - new Date(right.fecha_hora_creacion))
    return {
      label: `${formatClockMinutes(from)} - ${formatClockMinutes(to)}`,
      items,
    }
  })
  const granted = bonusRows.reduce((sum, row) => (
    sum + (!row.recuperado && !row.es_publicidad ? amountOf(row.valor) : 0)
  ), 0)
  const recovered = bonusRows.reduce((sum, row) => (
    sum + (row.recuperado ? amountOf(row.valor) : 0)
  ), 0)
  const publicity = bonusRows.reduce((sum, row) => (
    sum + (!row.recuperado && row.es_publicidad ? amountOf(row.valor) : 0)
  ), 0)
  const bonusesNet = granted + publicity - recovered
  const operations = makeOperations(data, accounts)
  const activeRows = new Map()
  accounts.forEach(account => {
    const value = amountOf(account.amount)
    if (value === 0) return
    if (!activeRows.has(account.holder)) {
      activeRows.set(account.holder, { holder: account.holder, values: {}, colors: {} })
    }
    const row = activeRows.get(account.holder)
    row.values[account.wallet] = amountOf(row.values[account.wallet]) + value
    const colorBoxId = account.sharedOwnerBoxId ?? account.caja_id
    row.colors[account.wallet] = data.boxes?.find(box => String(box.id) === String(colorBoxId))?.colores?.hex || accentColor
  })
  const rows = holders.filter(holder => activeRows.has(holder)).map(holder => activeRows.get(holder))
  const visibleWallets = wallets.filter(wallet => rows.some(row => amountOf(row.values[wallet]) !== 0))
  const activeChips = chips || []
  const metric = (label, value, hero = false) => (
    <div className={`report-v5-metric ${hero ? 'hero' : ''}`} key={label}>
      <span>{label}</span>
      <b className={value < 0 ? 'negative' : value > 0 ? 'positive' : 'neutral'}>
        {label === 'Sobrante / Faltante' && value >= 0 ? '+' : ''}{reportMoney.format(value)}
      </b>
    </div>
  )

  return (
    <div ref={snapshotRef} className="snapshot-export report-card report-v5" data-snapshot-export="true" aria-hidden="true" style={{ '--box-accent': accentColor }}>
      <header className="report-v5-header">
        <div className="report-v5-brand">
          <span><Camera size={24} /></span>
          <div><strong>CAJA<span>flow</span></strong><small>Ficha de cierre operativo</small></div>
        </div>
        <div className="report-v5-period">
          <b>Turno {shiftName}</b>
          <strong>{shift.dias_turno?.hora_inicio?.slice(0, 5) || '--:--'} - {shift.dias_turno?.hora_fin?.slice(0, 5) || '--:--'}</strong>
          <small>{new Date(shift.fecha_hora_inicio).toLocaleDateString('es-AR', {
            weekday: 'long',
            day: '2-digit',
            month: 'long',
            year: 'numeric',
          })}</small>
        </div>
      </header>

      <section className="report-v5-kpis">
        {metric('Caja final', cashFinal, true)}
        {metric('Sobrante / Faltante', cashDiscrepancy, true)}
        {metric('Diferencia real', realDifference, true)}
        {metric('Ganancia Real', realDifference * 0.77, true)}
        <div className="report-v5-secondary">
          {metric('Caja inicial', cashInitial)}
          {metric('Diferencia de caja', cashDifference)}
          {metric('Redondeo', rounding)}
        </div>
      </section>

      <main className="report-v5-content">
        <section className="report-v5-left">
          <section className="report-v5-accounts">
            <div className="report-v5-head">
              <h2><WalletCards size={18} /> Matriz de cuentas</h2>
              <span>{rows.length} titulares · {visibleWallets.length} billeteras</span>
            </div>
            {rows.length === 0
              ? <p className="report-v5-empty">Sin saldos registrados</p>
              : <table>
                <thead><tr><th>Titular</th>{visibleWallets.map(wallet => <th key={wallet}>{wallet}</th>)}<th>Total</th></tr></thead>
                <tbody>{rows.map(row => (
                  <tr key={row.holder}>
                    <th><i style={{ background: row.colors[visibleWallets.find(wallet => row.values[wallet] !== 0)] || accentColor }} />{row.holder}</th>
                    {visibleWallets.map(wallet => {
                      const value = row.values[wallet]
                      return <td
                        key={wallet}
                        className={value === undefined || value === 0 ? 'empty-value' : 'has-value'}
                        style={value !== undefined && value !== 0 ? { '--v5-accent': row.colors[wallet] || accentColor } : undefined}
                      >{value === undefined || value === 0 ? '-' : reportMoney.format(value)}</td>
                    })}
                    <td>{reportMoney.format(visibleWallets.reduce((sum, wallet) => sum + amountOf(row.values[wallet]), 0))}</td>
                  </tr>
                ))}</tbody>
              </table>}
          </section>

          <section className="report-v5-log">
            <div className="report-v5-head"><h2><ArrowLeftRight size={18} /> Bitácora operativa</h2><span>Hora · detalle · monto</span></div>
            <div className="report-v5-log-grid">
              {operations.filter(group => group.rows.length).map(({ title, Icon, rows: groupRows, total }) => (
                <div className="report-v5-log-group" key={title}>
                  <h3><Icon size={14} />{title}{total !== undefined && <small>{groupRows.length} · {reportMoney.format(total)}</small>}</h3>
                  {groupRows.map((row, index) => {
                    const isNote = title === 'Notas del turno'
                    return <div className="report-v5-line" key={row.id ?? `${title}-${index}`}>
                      <span>{!isNote && <time>[{formatTime(row.createdAt)}]</time>} {!isNote && ' '}{row.detail.join(' · ') || 'Sin detalle'}</span>
                      {!isNote && <b>{reportMoney.format(row.amount)}</b>}
                    </div>
                  })}
                </div>
              ))}
            </div>
          </section>
        </section>

        <section className="report-v5-right">
          <div className="report-v5-right-summary">
            <section className="report-v5-summary-card">
              <div className="report-v5-head"><h2><Ticket size={18} /> Fichas finales</h2></div>
              <div className="report-v5-chip-summary">
                {activeChips.map(chip => {
                  const balance = amountOf(chip.fichas_inicial) - amountOf(chip.fichas_final)
                  const color = chip.colorHex || accentColor
                  return <div key={chip.id}>
                    <span style={{ color }}>{chip.plataformas?.nombre || 'Plataforma'}</span>
                    <small className="report-v5-chip-detail">Inicial: {reportMoney.format(chip.fichas_inicial)} Saldo: <b className={balance < 0 ? 'negative' : 'positive'}>{reportMoney.format(balance)}</b></small>
                    <b>{reportMoney.format(chip.fichas_final)}</b>
                  </div>
                })}
              </div>
            </section>
            <section className="report-v5-summary-card">
              <div className="report-v5-head"><h2><Gift size={18} /> Resumen de bonos</h2></div>
              <div className="report-v5-bonus-summary">
                <strong>{reportMoney.format(bonusesNet)}</strong>
                <span>Bonos netos</span>
                <div>
                  <span>Otorgados <b>{reportMoney.format(granted)}</b></span>
                  <span>Recuperados <b>{reportMoney.format(recovered)}</b></span>
                  <span>Publicidad <b>{reportMoney.format(publicity)}</b></span>
                </div>
              </div>
            </section>
          </div>

          <section className="report-v5-bonuses">
            <div className="report-v5-head">
              <h2><Gift size={18} /> Línea de tiempo de bonos</h2>
              <span className="report-v5-bonus-totals">Otorgados {reportMoney.format(granted)} · Recuperados {reportMoney.format(recovered)} · Neto {reportMoney.format(bonusesNet)}</span>
            </div>
            <div className="report-v5-bonus-grid">
              {bonusSlots.map(slot => (
                <div className="report-v5-slot" key={slot.label}>
                  <h3>{slot.label}</h3>
                  <div className="report-v5-bonus-list">
                    {slot.items.map(row => {
                      const type = row.recuperado ? 'recovered' : row.es_publicidad ? 'publicity' : 'granted'
                      return <div className={type} key={row.id}>
                        <span>{formatTime(row.fecha_hora_creacion)} | {row.recuperado ? 'Recuperado' : row.es_publicidad ? 'Publicidad' : 'Otorgado'}</span>
                        <b>{reportMoney.format(row.valor)}</b>
                      </div>
                    })}
                  </div>
                  <strong>{reportMoney.format(slot.items.reduce((sum, row) => sum + (row.recuperado ? -amountOf(row.valor) : amountOf(row.valor)), 0))}</strong>
                </div>
              ))}
            </div>
          </section>
        </section>
      </main>
    </div>
  )
}

export default SnapshotReport
