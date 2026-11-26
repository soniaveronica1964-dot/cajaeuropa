import React, { useEffect, useMemo, useState } from 'react'
import { BarChart3, Gift, Coins } from 'lucide-react'
import { loadStatistics } from './lib/data'
import './statistics.css'

const currency = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 2 })
const shifts = ['Mañana', 'Tarde', 'Noche']
const weekdays = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
const number = value => Number(value) || 0
const sum = (rows, selector) => rows.reduce((total, row) => total + selector(row), 0)
const localInput = date => {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 16)
}
const dateFromInput = value => new Date(value)
const labelForShift = shift => shift.dias_turno?.tipos_turno?.nombre || shift.dias_turno?.nombre || 'Sin turno'
const accentForBox = box => box.colores?.hex || '#bb91ee'
const groupBy = (rows, selector) => rows.reduce((groups, row) => {
  const key = selector(row)
  groups[key] = groups[key] || []
  groups[key].push(row)
  return groups
}, {})

function makeStatisticsRows(data, boxes) {
  const boxesById = new Map(boxes.map(box => [String(box.id), box.nombre]))
  const byShift = (items, idOf) => groupBy(items || [], item => String(idOf(item)))
  const tips = byShift(data.tips, item => item.turno_id)
  const expenses = byShift(data.expenses, item => item.turno_id)
  const bonuses = byShift(data.bonuses, item => item.bonos?.turno_id)
  const chips = byShift(data.chips, item => item.turno_id)
  const taCharges = byShift(data.taCharges, item => item.turno_id)
  const foundMoney = byShift(data.foundMoney, item => item.cuentas_x_turno?.turno_id)
  const transfers = data.movements || []

  return data.shifts.map(shift => {
    const id = String(shift.id)
    const shiftTips = tips[id] || []
    const shiftExpenses = expenses[id] || []
    const shiftBonuses = bonuses[id] || []
    const shiftChips = chips[id] || []
    const shiftTaCharges = taCharges[id] || []
    const shiftFound = foundMoney[id] || []
    const shiftTransfers = transfers.filter(item => String(item.turno_id) === id || String(item.turno_destino_id) === id)
    const expenseByCategory = groupBy(shiftExpenses, item => item.tipos_gasto?.nombre || 'Sin categoría')
    const expensesByCategory = Object.fromEntries(Object.entries(expenseByCategory).map(([category, items]) => [
      category,
      sum(items, item => number(item.monto) * (item.tipos_gasto?.invertir_signo ? -1 : 1)),
    ]))
    const expensesWithoutChips = sum(
      shiftExpenses.filter(item => item.tarea_x_turno_id == null && item.tipos_gasto?.nombre?.trim().toLocaleLowerCase('es') !== 'fichas'),
      item => number(item.monto) * (item.tipos_gasto?.invertir_signo ? -1 : 1),
    )
    const taskExpensesByNote = Object.fromEntries(Object.entries(groupBy(
      shiftExpenses.filter(item => item.tarea_x_turno_id != null),
      item => item.notas?.trim() || 'Sin nota',
    )).map(([note, items]) => [
      note,
      sum(items, item => number(item.monto) * (item.tipos_gasto?.invertir_signo ? -1 : 1)),
    ]))
    const platforms = {}
    shiftChips.forEach(chip => {
      const name = chip.plataformas?.nombre || 'Sin plataforma'
      platforms[name] = (platforms[name] || 0) + sum(chip.cargas_fichas || [], item => number(item.valor))
    })
    const granted = sum(shiftBonuses.filter(item => !item.recuperado), item => number(item.valor))
    const recovered = sum(shiftBonuses.filter(item => item.recuperado), item => number(item.valor))
    const cashInitial = number(shift.caja_inicial)
    const cashFinal = number(shift.caja_final)
    const cashDifference = cashFinal - cashInitial
    const balance = sum(shiftChips, chip => number(chip.fichas_inicial) - number(chip.fichas_final))
    const transferImpact = sum(shiftTransfers, item => {
      const amount = number(item.monto)
      if (item.es_ahorro) {
        if (String(item.caja_desde_id) === String(shift.caja_id)) return amount
        if (String(item.caja_hasta_id) === String(shift.caja_id)) return -amount
        return 0
      }
      return String(item.turno_id) === id ? amount : -amount
    })
    const expenseTotal = sum(Object.values(expensesByCategory), value => value)
    const taTotal = sum(shiftTaCharges, item => number(item.monto))
    const realDifference = cashDifference + expenseTotal + taTotal + transferImpact
    const routeTotals = {}
    shiftTransfers.filter(item => !item.es_ahorro && String(item.turno_id) === id).forEach(item => {
      const route = `${boxesById.get(String(item.caja_desde_id)) || 'Caja'} → ${boxesById.get(String(item.caja_hasta_id)) || 'Caja'}`
      routeTotals[route] = (routeTotals[route] || 0) + number(item.monto)
    })
    return {
      ...shift,
      date: new Date(shift.fecha_hora_inicio),
      label: labelForShift(shift),
      tips: sum(shiftTips, item => number(item.monto)),
      found: sum(shiftFound, item => number(item.monto)),
      granted,
      recovered,
      bonusesNet: granted - recovered,
      expenses: expenseTotal,
      expensesByCategory,
      expensesWithoutChips,
      taskExpensesByNote,
      ta: taTotal,
      cashInitial,
      cashFinal,
      cashDifference,
      realDifference,
      realProfit: realDifference * 0.77,
      balance,
      rounding: number(shift.redondeo),
      platforms,
      routeTotals,
      bonuses: shiftBonuses,
      shiftExpenses,
      shiftTips,
      shiftChips,
      shiftTaCharges,
    }
  })
}

function summarize(rows) {
  const totals = { expensesByCategory: {}, taskExpensesByNote: {}, platforms: {}, routeTotals: {} }
  rows.forEach(row => {
    ;['tips', 'found', 'granted', 'recovered', 'bonusesNet', 'expenses', 'expensesWithoutChips', 'ta', 'cashInitial', 'cashFinal', 'cashDifference', 'realDifference', 'realProfit', 'balance', 'rounding'].forEach(key => {
      totals[key] = (totals[key] || 0) + row[key]
    })
    Object.entries(row.expensesByCategory).forEach(([key, value]) => { totals.expensesByCategory[key] = (totals.expensesByCategory[key] || 0) + value })
    Object.entries(row.taskExpensesByNote).forEach(([key, value]) => { totals.taskExpensesByNote[key] = (totals.taskExpensesByNote[key] || 0) + value })
    Object.entries(row.platforms).forEach(([key, value]) => { totals.platforms[key] = (totals.platforms[key] || 0) + value })
    Object.entries(row.routeTotals).forEach(([key, value]) => { totals.routeTotals[key] = (totals.routeTotals[key] || 0) + value })
  })
  return totals
}

function Statistics({ data }) {
  const boxes = data.boxes || []
  const today = new Date()
  const [from, setFrom] = useState(() => localInput(new Date(today.getFullYear(), today.getMonth(), 1)))
  const [to, setTo] = useState(() => localInput(today))
  const [selectedBoxIds, setSelectedBoxIds] = useState(() => boxes.map(box => box.id))
  const [combined, setCombined] = useState(true)
  const [records, setRecords] = useState(null)
  const [error, setError] = useState('')
  const [metric, setMetric] = useState('tips')
  const [selectedBar, setSelectedBar] = useState('')
  const [employees, setEmployees] = useState(1)
  const [percent, setPercent] = useState(100)
  const [bonusDays, setBonusDays] = useState(weekdays.map((_, index) => index))
  const [bonusShifts, setBonusShifts] = useState([...shifts])
  const [fromHour, setFromHour] = useState(0)
  const [toHour, setToHour] = useState(23)
  const [bonusMode, setBonusMode] = useState('all')
  const [bonusMetric, setBonusMetric] = useState('value')

  useEffect(() => {
    let active = true
    if (!selectedBoxIds.length) {
      setRecords({ shifts: [], tips: [], expenses: [], bonuses: [], chips: [], taCharges: [], foundMoney: [], movements: [] })
      setError('')
      return () => { active = false }
    }
    setRecords(null)
    setError('')
    loadStatistics(dateFromInput(from).toISOString(), dateFromInput(to).toISOString(), selectedBoxIds)
      .then(result => { if (active) setRecords(result) })
      .catch(reason => { if (active) setError(reason.message || 'No se pudieron cargar las estadísticas.') })
    return () => { active = false }
  }, [from, to, selectedBoxIds])

  const rows = useMemo(() => records ? makeStatisticsRows(records, boxes) : [], [records, boxes])
  const groupedRows = useMemo(() => ({
    Total: rows,
    Mañana: rows.filter(row => row.label.toLocaleLowerCase().includes('mañana')),
    Tarde: rows.filter(row => row.label.toLocaleLowerCase().includes('tarde')),
    Noche: rows.filter(row => row.label.toLocaleLowerCase().includes('noche')),
  }), [rows])
  const summaries = ['Total', ...shifts].map(label => ({ label, rows: groupedRows[label], values: summarize(groupedRows[label]) }))
  const chartMetrics = [
    ['tips', 'Propinas'],
    ['found', 'Encontrado'],
    ['granted', 'Bonos otorgados'],
    ['expenses', 'Salidas'],
    ['ta', 'Cargas T.A.'],
  ]
  const chartRows = summaries.map(item => ({ label: item.label, value: item.values[metric] || 0 }))
  const maxChart = Math.max(...chartRows.map(item => Math.abs(item.value)), 1)
  const bonusRows = rows.flatMap(row => row.bonuses.map(bonus => {
    const date = new Date(bonus.fecha_hora_creacion)
    return { date, shift: row.label, net: number(bonus.valor) * (bonus.recuperado ? -1 : 1) }
  })).filter(item => Number.isFinite(item.date.getTime())
    && bonusDays.includes(item.date.getDay())
    && bonusShifts.includes(item.shift)
    && item.date.getHours() >= fromHour
    && item.date.getHours() <= toHour
    && (bonusMode === 'all' || bonusMode === 'positive' && item.net > 0 || bonusMode === 'negative' && item.net < 0))
  const bonusValue = items => bonusMetric === 'count' ? items.length : sum(items, item => item.net)
  const bonusTotal = bonusValue(bonusRows)
  const bonusPercentage = value => bonusTotal ? value / bonusTotal * 100 : 0
  const formattedBonus = value => bonusMetric === 'count' ? `${value} ${value === 1 ? 'bono' : 'bonos'}` : currency.format(value)
  const dailyRows = Object.entries(groupBy(bonusRows, item => `${item.date.getFullYear()}-${item.date.getMonth()}-${item.date.getDate()}`))
    .map(([key, items]) => ({ key, date: items[0].date, items }))
    .sort((a, b) => a.date - b.date)
  const hourlyRows = shifts.map(label => {
    const items = bonusRows.filter(item => item.shift === label)
    return { label, items, total: bonusValue(items) }
  })
  const hourlyRanges = [
    { label: 'Noche', start: 0, end: 7 },
    { label: 'Mañana', start: 8, end: 15 },
    { label: 'Tarde', start: 16, end: 23 },
  ]
  const hourlyValues = Array.from({ length: 24 }, (_, hour) => bonusValue(bonusRows.filter(item => item.date.getHours() === hour)))
  const maxHourlyValue = Math.max(1, ...hourlyValues.map(value => Math.abs(value)))
  const setShortcut = shortcut => {
    const now = new Date()
    let start = new Date(now.getFullYear(), now.getMonth(), 1)
    let end = now
    if (shortcut === 'today') start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    if (shortcut === 'yesterday') {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59)
    }
    if (shortcut === 'week') {
      start = new Date(now)
      start.setDate(now.getDate() - ((now.getDay() + 6) % 7))
      start.setHours(0, 0, 0, 0)
    }
    if (shortcut === 'previous') {
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59)
    }
    setFrom(localInput(start))
    setTo(localInput(end))
  }
  const toggle = (values, setValues, value) => setValues(current => current.includes(value) ? current.filter(item => item !== value) : [...current, value])
  const displayedSets = combined
    ? [{ label: 'Suma seleccionadas', color: '#bb91ee', rows, summaries }]
    : boxes.filter(box => selectedBoxIds.includes(box.id)).map(box => {
      const boxRows = rows.filter(row => String(row.caja_id) === String(box.id))
      const byShift = { Total: boxRows }
      shifts.forEach(name => { byShift[name] = boxRows.filter(row => row.label.toLocaleLowerCase().includes(name.toLocaleLowerCase())) })
      return { label: box.nombre, color: accentForBox(box), rows: boxRows, summaries: ['Total', ...shifts].map(name => ({ label: name, rows: byShift[name], values: summarize(byShift[name]) })) }
    })
  const alignedSets = displayedSets.map(set => {
    const sharedNames = (property, includeValue = () => true) => [...new Set(set.summaries.flatMap(group => (
      Object.entries(group.values[property])
        .filter(([, value]) => includeValue(value))
        .map(([name]) => name)
    )))]
    return {
      ...set,
      rowNames: {
        platforms: sharedNames('platforms'),
        routes: sharedNames('routeTotals'),
        expenses: sharedNames('expensesByCategory', value => value !== 0),
        tasks: sharedNames('taskExpensesByNote').sort((left, right) => left.localeCompare(right, 'es', { sensitivity: 'base' })),
      },
    }
  })
  const grandTotal = summarize(rows)

  return <main className="statistics-page">
    <section className="panel statistics-toolbar">
      <div className="statistics-toolbar-heading"><h2><BarChart3 size={18} /> Estadísticas</h2><span>{rows.length} turnos dentro del período</span></div>
      <div className="statistics-toolbar-controls">
        <div className="statistics-toolbar-selection"><div className="statistics-boxes"><strong>Cajas</strong>{boxes.map(box => <label key={box.id} style={{ color: accentForBox(box) }}><input type="checkbox" checked={selectedBoxIds.includes(box.id)} onChange={() => toggle(selectedBoxIds, setSelectedBoxIds, box.id)} />{box.nombre}</label>)}</div><label className="statistics-combined"><input type="checkbox" checked={combined} onChange={event => setCombined(event.target.checked)} /> Suma seleccionadas</label></div>
        <div className="statistics-toolbar-filters"><div className="statistics-dates"><label>Desde<input type="datetime-local" value={from} onChange={event => setFrom(event.target.value)} /></label><label>Hasta<input type="datetime-local" value={to} onChange={event => setTo(event.target.value)} /></label></div><div className="statistics-shortcuts">{[['today', 'Hoy'], ['yesterday', 'Ayer'], ['week', 'Semana actual'], ['month', 'Mes actual'], ['previous', 'Mes anterior']].map(([key, label]) => <button type="button" key={key} onClick={() => setShortcut(key)}>{label}</button>)}</div></div>
      </div>
    </section>
    {error && <section className="panel statistics-error"><strong>No se pudieron cargar las estadísticas</strong><span>{error}</span></section>}
    {!error && !records && <section className="panel statistics-loading">Cargando estadísticas…</section>}
    {records && alignedSets.map(set => <section className="statistics-box-section" key={set.label} style={{ '--stats-accent': set.color }}>
      <h2 className="statistics-box-title">{set.label}</h2>
      <section className="statistics-grid">{set.summaries.map(group => <article className={`panel statistics-shift ${group.label === 'Total' ? 'statistics-total' : ''}`} key={`${set.label}-${group.label}`}>
        <header className="statistics-shift-head"><h2>{group.label}</h2><span>{group.rows.length} turnos</span></header>
        <div className="statistics-card-content">
          <MetricSection title="General">
            <Metric label="Propinas" value={group.values.tips} />
            <MetricGroup title="Promedio" rows={group.rows} values={group.values} metrics={['cashInitial', 'cashFinal', 'cashDifference', 'realDifference', 'realProfit', 'balance', 'rounding']} average />
            <MetricGroup title="Total" rows={group.rows} values={group.values} metrics={['cashDifference', 'realDifference', 'realProfit', 'balance', 'rounding']} />
          </MetricSection>
          <MetricSection title="Bonos"><Metric label="Bonos otorgados" value={group.values.granted} /><Metric label="Bonos recuperados" value={group.values.recovered} /><Metric label="Bonos netos" value={group.values.bonusesNet} /></MetricSection>
          <MetricSection title="Cargas de fichas">{set.rowNames.platforms.map(name => Object.prototype.hasOwnProperty.call(group.values.platforms, name)
            ? <Metric key={name} label={name} value={group.values.platforms[name]} />
            : <MetricPlaceholder key={name} label={name} />)}</MetricSection>
          <MetricSection title="Traspasos">{set.rowNames.routes.map(name => Object.prototype.hasOwnProperty.call(group.values.routeTotals, name)
            ? <Metric key={name} label={name} value={group.values.routeTotals[name]} />
            : <MetricPlaceholder key={name} label={name} />)}</MetricSection>
          <MetricSection title="Gastos">{set.rowNames.expenses.map(name => Object.prototype.hasOwnProperty.call(group.values.expensesByCategory, name) && group.values.expensesByCategory[name] !== 0
            ? <Metric key={name} label={name} value={group.values.expensesByCategory[name]} />
            : <MetricPlaceholder key={name} label={name} />)}<div className="statistics-expense-total"><span>Total de gastos (sin Fichas ni Tareas)</span><b>{currency.format(number(group.values.expensesWithoutChips))}</b></div></MetricSection>
          <MetricSection title="Tareas">{set.rowNames.tasks.length
            ? set.rowNames.tasks.map(note => Object.prototype.hasOwnProperty.call(group.values.taskExpensesByNote, note)
              ? <Metric key={note} label={note} value={group.values.taskExpensesByNote[note]} />
              : <MetricPlaceholder key={note} label={note} />)
            : <p className="statistics-task-empty">Sin gastos de tareas</p>}<div className="statistics-expense-total"><span>Total tareas</span><b>{currency.format(sum(Object.values(group.values.taskExpensesByNote), value => value))}</b></div></MetricSection>
        </div>
      </article>)}</section>
    </section>)}
    {records && <section className="statistics-visuals">
      <section className="panel statistics-chart"><div className="statistics-chart-head"><div><h2>Comparativa por turno</h2><span>Seleccioná una métrica y una barra</span></div><select value={metric} onChange={event => { setMetric(event.target.value); setSelectedBar('') }}>{chartMetrics.map(([key, label]) => <option value={key} key={key}>{label}</option>)}</select></div><div className="statistics-bars">{chartRows.map(row => <button type="button" className={selectedBar === row.label ? 'selected' : ''} key={row.label} onClick={() => setSelectedBar(row.label)}><span className="statistics-bar-value">{currency.format(row.value)}</span><i style={{ height: `${Math.max(4, Math.abs(row.value) / maxChart * 150)}px` }} /><small>{row.label}</small></button>)}</div>{selectedBar && <p className="statistics-chart-detail">{selectedBar}: <b>{currency.format(chartRows.find(row => row.label === selectedBar)?.value || 0)}</b></p>}</section>
      <section className="panel statistics-tips"><div className="statistics-chart-head"><div><h2>Totalizador de propinas</h2><span>Resumen para el período y cajas seleccionados</span></div><Coins size={18} /></div><div className="statistics-tip-total"><span>Total de propinas</span><strong>{currency.format(grandTotal.tips || 0)}</strong></div><div className="statistics-tip-fields"><label>Empleados<input type="number" min="1" value={employees} onChange={event => setEmployees(Math.max(1, number(event.target.value)))} /></label><label>Propinas c/u<strong>{currency.format((grandTotal.tips || 0) / Math.max(1, employees))}</strong></label><label>% proporcional<input type="number" min="0" max="100" value={percent} onChange={event => setPercent(Math.min(100, Math.max(0, number(event.target.value))))} /></label><label>Proporcional c/u<strong>{currency.format((grandTotal.tips || 0) / Math.max(1, employees) * percent / 100)}</strong></label></div></section>
    </section>}
    {records && <section className="panel bonus-analysis-panel">
      <div className="bonus-analysis-head"><div><h2><Gift size={18} /> Análisis de bonos netos</h2><span>{bonusRows.length} movimientos · {dailyRows.length} días · período y cajas tomados de arriba</span></div><strong>{formattedBonus(bonusTotal)}</strong></div>
      <div className="bonus-analysis-filters">
        <div className="bonus-analysis-filter-group"><span>Días de la semana</span><div>{weekdays.map((day, index) => <label key={day}><input type="checkbox" checked={bonusDays.includes(index)} onChange={() => toggle(bonusDays, setBonusDays, index)} />{day.slice(0, 3)}</label>)}</div></div>
        <div className="bonus-analysis-filter-group"><span>Turnos</span><div>{shifts.map(shift => <label key={shift}><input type="checkbox" checked={bonusShifts.includes(shift)} onChange={() => toggle(bonusShifts, setBonusShifts, shift)} />{shift}</label>)}</div></div>
        <label className="bonus-analysis-select"><span>Agrupar por</span><select value={bonusMetric} onChange={event => setBonusMetric(event.target.value)}><option value="value">Valor neto</option><option value="count">Recuento de bonos</option></select></label>
        <label className="bonus-analysis-select"><span>Desde hora</span><select value={fromHour} onChange={event => setFromHour(Number(event.target.value))}>{Array.from({ length: 24 }, (_, hour) => <option value={hour} key={hour}>{String(hour).padStart(2, '0')}:00</option>)}</select></label>
        <label className="bonus-analysis-select"><span>Hasta hora</span><select value={toHour} onChange={event => setToHour(Number(event.target.value))}>{Array.from({ length: 24 }, (_, hour) => <option value={hour} key={hour}>{String(hour).padStart(2, '0')}:59</option>)}</select></label>
        <label className="bonus-analysis-select"><span>Resultado</span><select value={bonusMode} onChange={event => setBonusMode(event.target.value)}><option value="all">Todos los netos</option><option value="positive">Solo netos positivos</option><option value="negative">Solo netos negativos</option></select></label>
      </div>
      <div className="bonus-analysis-summary"><div><span>{bonusMetric === 'count' ? 'Recuento de bonos' : 'Valor neto'} seleccionado</span><strong>{formattedBonus(bonusTotal)}</strong></div>{hourlyRows.map(row => <div key={row.label}><span>{row.label}</span><strong>{formattedBonus(row.total)} <small>{bonusPercentage(row.total).toFixed(1)}%</small></strong></div>)}</div>
      <div className="bonus-analysis-grid">
        <section className="bonus-analysis-table-wrap"><div className="bonus-analysis-section-head"><h3>Resultado por día</h3><span>Porcentaje sobre el total filtrado</span></div><div className="bonus-analysis-table-scroll"><table className="bonus-analysis-table"><thead><tr><th>Día</th>{shifts.map(shift => <th key={shift}>{shift}</th>)}<th>Total</th><th>%</th></tr></thead><tbody>{dailyRows.map(row => {
          const total = bonusValue(row.items)
          return <tr key={row.key}><th>{row.date.toLocaleDateString('es-AR')}<small>{weekdays[row.date.getDay()]}</small></th>{shifts.map(shift => <td key={shift}>{formattedBonus(bonusValue(row.items.filter(item => item.shift === shift)))}</td>)}<td><b>{formattedBonus(total)}</b></td><td><b>{bonusPercentage(total).toFixed(1)}%</b></td></tr>
        })}{dailyRows.length === 0 && <tr><td colSpan="6" className="bonus-analysis-empty">No hay bonos para los filtros seleccionados.</td></tr>}</tbody></table></div></section>
        <section className="bonus-analysis-hours"><div className="bonus-analysis-section-head"><h3>Distribución por hora</h3><span>{bonusMetric === 'count' ? 'Recuento de bonos' : 'Valor neto'} y participación</span></div><div className="bonus-hour-bars">{hourlyRanges.map(range => <div key={range.label}>{Array.from({ length: range.end - range.start + 1 }, (_, index) => {
          const hour = range.start + index
          const items = bonusRows.filter(item => item.date.getHours() === hour)
          const value = bonusValue(items)
          return <div className={`bonus-hour-row ${value < 0 ? 'negative' : ''}`} key={hour}><span>{String(hour).padStart(2, '0')}h</span><i><b style={{ width: `${Math.min(100, Math.abs(value) / maxHourlyValue * 100)}%` }} /></i><strong>{formattedBonus(value)}</strong><small>{bonusPercentage(value).toFixed(1)}%</small></div>
        })}<div className="bonus-hour-shift-total"><span>Total {range.label}</span><strong>{formattedBonus(bonusValue(bonusRows.filter(item => item.date.getHours() >= range.start && item.date.getHours() <= range.end)))}</strong><small>{bonusPercentage(bonusValue(bonusRows.filter(item => item.date.getHours() >= range.start && item.date.getHours() <= range.end))).toFixed(1)}%</small></div></div>)}</div></section>
      </div>
    </section>}
  </main>
}

function MetricSection({ title, children }) {
  return <section className="statistics-section"><h3>{title}</h3>{children}</section>
}

function Metric({ label, value }) {
  return <div><span>{label}</span><b>{currency.format(number(value))}</b></div>
}

function MetricPlaceholder({ label }) {
  return <div className="statistics-metric-placeholder" aria-hidden="true"><span>{label}</span><b>{currency.format(0)}</b></div>
}

function MetricGroup({ title, rows, values, metrics, average = false }) {
  const labels = {
    cashInitial: 'Caja inicial',
    cashFinal: 'Caja final',
    cashDifference: 'Diferencia de caja',
    realDifference: 'Diferencia real',
    realProfit: 'Ganancia Real',
    balance: 'Saldo',
    rounding: 'Redondeo',
  }
  return <div className="statistics-metric-group"><h4>{title}</h4>{metrics.map(key => {
    const value = average && rows.length ? values[key] / rows.length : values[key]
    return <div key={key}><span>{labels[key]}</span><b className={value < 0 ? 'negative' : 'positive'}>{currency.format(value || 0)}</b></div>
  })}</div>
}

export default Statistics
