import React from "react";
import { ArrowLeftRight, ArrowDownToLine, Banknote, Coins, FileText, Gift, ReceiptText, Ticket, WalletCards } from "lucide-react";

const valueOf = (value) => Number(value) || 0;
const money = (value) => new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", minimumFractionDigits: 2 }).format(valueOf(value));
const timeOf = (value) => value ? new Intl.DateTimeFormat("es-AR", { hour: "2-digit", minute: "2-digit" }).format(new Date(value)) : "--:--";
const shiftInfo = { Noche: [0, "00:00 - 08:00"], Mañana: [8, "08:00 - 16:00"], Tarde: [16, "16:00 - 00:00"] };
const boxColors = { teal: "#72d7ca", blue: "#82b8ff", green: "#83d5a2", orange: "#f5ad69", pink: "#ed9fc1", red: "#ef8888", yellow: "#e8d477", violet: "#c2a0ed", slate: "#aebdca" };

export default function CajaReportCardV3({ data, snapshotRef }) {
  const { caja, calculations, config, boxes, activeBox } = data;
  const [startHour, period] = shiftInfo[caja.shift] || shiftInfo.Noche;
  const wallets = config.accounts.wallets || [];
  const settings = config.accounts.walletSettings || {};
  const availability = config.accounts.availability || {};
  const belongsToActiveBox = (row, wallet) => {
    const setting = settings[row.holder]?.[wallet];
    return availability[row.holder]?.[wallet] !== false && (setting?.category === "Normal" || !setting?.category || row.walletBoxes?.[wallet] === activeBox?.id);
  };
  const rows = (caja.accounts || []).map((row) => ({ ...row, activeWallets: wallets.filter((wallet) => belongsToActiveBox(row, wallet) && valueOf(row.values[wallet]) !== 0) })).filter((row) => row.activeWallets.length);
  const visibleWallets = wallets.filter((wallet) => rows.some((row) => row.activeWallets.includes(wallet)));
  const accentFor = (row, wallet) => boxColors[boxes.find((box) => box.id === row.walletBoxes?.[wallet])?.color] || boxColors[activeBox?.color] || boxColors.teal;
  const operations = [
    ["Gastos", ReceiptText, caja.expenses || [], (row) => [row.category, row.user, row.notes]],
    ["Propinas", Coins, caja.tips || [], (row) => [row.user, row.notes]],
    ["Cargas T.A.", ArrowDownToLine, caja.ta || [], (row) => [row.user, row.notes]],
    ["Traspasos", ArrowLeftRight, caja.transfers || [], (row) => { const from = boxes.find((box) => box.id === row.fromBoxId)?.title || "Caja"; const to = boxes.find((box) => box.id === row.toBoxId)?.title || "Caja"; return [`${from} → ${to}`, row.note]; }],
  ["Dinero encontrado", Banknote, Array.isArray(caja.foundMoney) ? caja.foundMoney : [], (row) => [row.holder, row.wallet, row.note]],
  ];
  const bonusSlots = Array.from({ length: 4 }, (_, index) => {
    const slotStart = (startHour + index * 2) % 24;
    const slotEnd = (slotStart + 2) % 24;
    const items = (caja.bonuses || []).filter((bonus) => { const date = new Date(bonus.createdAt); const elapsed = (date.getHours() * 60 + date.getMinutes() - startHour * 60 + 1440) % 1440; return Math.floor(elapsed / 120) === index; });
    return { label: `${String(slotStart).padStart(2, "0")}:00 - ${String(slotEnd).padStart(2, "0")}:00`, items, dense: items.length > 40 };
  });
  const metric = (label, value, hero = false) => <div className={`report-v3-metric ${hero ? "hero" : ""}`}><span>{label}</span><b className={value < 0 ? "negative" : value > 0 ? "positive" : "neutral"}>{label === "Sobrante / Faltante" && value >= 0 ? "+" : ""}{money(value)}</b></div>;
  const totalFor = (title, list) => title === "Gastos" ? list.reduce((sum, row) => { const category = config.expenses.find((item) => item.name === row.category); return sum + valueOf(row.amount) * (category?.inverted ? -1 : 1); }, 0) : list.reduce((sum, row) => sum + valueOf(row.amount), 0);
  const granted = (caja.bonuses || []).reduce((sum, row) => sum + valueOf(row.granted), 0);
  const recovered = (caja.bonuses || []).reduce((sum, row) => sum + valueOf(row.recovered), 0);
  return <div ref={snapshotRef} className="snapshot-export report-card report-v3">
    <header className="report-v3-header"><div className="report-v3-brand"><span><Banknote size={24} /></span><div><strong>CAJA<span>flow</span></strong><small>Ficha de cierre operativo</small></div></div><div className="report-v3-period"><b>Turno {caja.shift}</b><strong>{period}</strong><small>{new Date(caja.date).toLocaleDateString("es-AR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}</small></div></header>
    <section className="report-v3-kpis">{metric("Caja final", calculations.cashFinal, true)}{metric("Sobrante / Faltante", calculations.shortage, true)}{metric("Diferencia real", calculations.realDifference, true)}<div className="report-v3-secondary">{metric("Caja inicial", calculations.cashInitial)}{metric("Pre-diferencia", calculations.preDifference)}{metric("Redondeo", caja.found)}</div></section>
    <section className="report-v3-middle"><div className="report-v3-left"><section className="report-v3-section report-v3-accounts"><div className="report-v3-section-head"><h2><WalletCards size={18} /> Matriz de cuentas</h2><span>{rows.length} titulares · {visibleWallets.length} billeteras con saldo</span></div>{rows.length === 0 ? <p className="report-v3-empty">Sin saldos registrados</p> : <table><thead><tr><th>Titular</th>{visibleWallets.map((wallet) => <th key={wallet}>{wallet}</th>)}<th>Total</th></tr></thead><tbody>{rows.map((row) => <tr key={row.holder}><th><i style={{ background: accentFor(row, row.activeWallets[0]) }} />{row.holder}</th>{visibleWallets.map((wallet) => { const shown = row.activeWallets.includes(wallet); return <td className={shown ? "has-value" : "empty-value"} style={shown ? { "--v3-cell-accent": accentFor(row, wallet) } : undefined} key={wallet}>{shown ? money(row.values[wallet]) : "-"}</td>; })}<td>{money(row.activeWallets.reduce((sum, wallet) => sum + valueOf(row.values[wallet]), 0))}</td></tr>)}</tbody></table>}</section><section className="report-v3-section report-v3-chips"><div className="report-v3-section-head"><h2><Ticket size={18} /> Control de fichas</h2><span>{caja.chips.length} plataformas</span></div><div className="report-v3-chips-grid"><b>Plataforma</b><b>Inicial</b><b>Final</b><b>Saldo</b>{caja.chips.map((chip) => { const balance = valueOf(chip.initial) - valueOf(chip.final); return <React.Fragment key={chip.platform}><strong>{chip.platform}</strong><span>{money(chip.initial)}</span><span>{money(chip.final)}</span><b className={balance < 0 ? "negative" : "positive"}>{balance >= 0 ? "+" : "-"}{money(Math.abs(balance))}</b></React.Fragment>; })}</div></section></div>
      <section className="report-v3-section report-v3-log"><div className="report-v3-section-head"><h2><ArrowLeftRight size={18} /> Bitácora operativa</h2><span>Hora · detalle · monto</span></div><div className="report-v3-log-list">{operations.filter(([, , list]) => list.length).map(([title, Icon, list, detail]) => <div className="report-v3-log-group" key={title}><h3><Icon size={14} />{title}<small>{list.length} · {money(totalFor(title, list))}</small></h3>{list.map((row) => <div className="report-v3-log-row" key={row.id}><span><time>[{timeOf(row.createdAt)}]</time> {detail(row).filter(Boolean).join(" · ") || "Sin detalle"}</span><b>{money(row.amount)}</b></div>)}</div>)}</div></section>
    <section className="report-v3-bonuses"><div className="report-v3-section-head"><h2><Gift size={18} /> Línea de tiempo de bonos</h2><span>Otorgados {money(granted)} · Recuperados {money(recovered)} · Neto {money(calculations.bonuses)}</span></div><div className="report-v3-bonus-grid">{bonusSlots.map((slot) => <div className={`report-v3-bonus-slot ${slot.dense ? "dense" : ""}`} key={slot.label}><h3>{slot.label}</h3><div className="report-v3-bonus-items">{slot.items.map((bonus) => { const isRecovered = valueOf(bonus.recovered) > 0; return <div className={isRecovered ? "recovered" : "granted"} key={bonus.id}><time>{timeOf(bonus.createdAt)}</time><span>{isRecovered ? "Recuperado" : "Otorgado"}</span><b>{money(isRecovered ? bonus.recovered : bonus.granted)}</b></div>; })}</div><strong>{money(slot.items.reduce((sum, bonus) => sum + valueOf(bonus.granted) - valueOf(bonus.recovered), 0))}</strong></div>)}</div></section></section>
    {(caja.notes?.trim() || caja.nextNotes?.trim()) && <footer className="report-v3-footer"><FileText size={16} /><div>{caja.notes?.trim() && <p><b>Actual</b>{caja.notes}</p>}{caja.nextNotes?.trim() && <p><b>Siguiente</b>{caja.nextNotes}</p>}</div></footer>}
  </div>;
}
