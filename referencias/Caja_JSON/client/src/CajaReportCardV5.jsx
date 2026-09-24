import React, { useEffect } from "react";
import { ArrowDownToLine, ArrowLeftRight, Banknote, Coins, FileText, Gift, ReceiptText, Ticket, WalletCards } from "lucide-react";

const n = (value) => Number(value) || 0;
const money = (value) => new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", minimumFractionDigits: 2 }).format(n(value));
const moneyWhole = (value) => money(value);
const time = (value) => value ? new Intl.DateTimeFormat("es-AR", { hour: "2-digit", minute: "2-digit" }).format(new Date(value)) : "--:--";
const bonusSlotFor = (createdAt, cajaDate, shiftStart) => {
  const bonusDate = new Date(createdAt);
  const minutes = bonusDate.getHours() * 60 + bonusDate.getMinutes();
  if (shiftStart === 0 && minutes >= 16 * 60) return 0;
  if (shiftStart === 16 && minutes < 8 * 60) return 3;
  const elapsed = minutes - shiftStart * 60;
  return elapsed < 0 ? 0 : Math.min(3, Math.floor(elapsed / 120));
};
const shifts = { Noche: [0, "00:00 - 08:00"], Mañana: [8, "08:00 - 16:00"], Tarde: [16, "16:00 - 00:00"] };
const colors = { teal: "#72d7ca", blue: "#82b8ff", green: "#83d5a2", orange: "#f5ad69", pink: "#ed9fc1", red: "#ef8888", yellow: "#e8d477", violet: "#c2a0ed", slate: "#aebdca" };
const brandIcons = { banknote: Banknote, wallet: WalletCards, coins: Coins, gift: Gift, ticket: Ticket, receipt: ReceiptText };

export default function CajaReportCardV5({ data, snapshotRef }) {
  const { caja, calculations, config, boxes, activeBox } = data;
  const BrandIcon = brandIcons[config.branding?.icon] || Banknote;
  const [start, period] = shifts[caja.shift] || shifts.Noche;
  const wallets = config.accounts.wallets || [];
  const rows = (caja.accounts || []).map((row) => ({ ...row, activeWallets: wallets.filter((wallet) => { const setting = config.accounts.walletSettings?.[row.holder]?.[wallet]; return config.accounts.availability?.[row.holder]?.[wallet] !== false && (setting?.category === "Normal" || !setting?.category || row.walletBoxes?.[wallet] === activeBox?.id) && n(row.values[wallet]) !== 0; }) })).filter((row) => row.activeWallets.length);
  const visibleWallets = wallets.filter((wallet) => rows.some((row) => row.activeWallets.includes(wallet)));
  const colorFor = (row, wallet) => colors[boxes.find((box) => box.id === row.walletBoxes?.[wallet])?.color] || colors[activeBox?.color] || colors.teal;
  const platformColorFor = (platform) => colors[config.platformColors?.[platform]] || colors.teal;
  const operations = [["Gastos", ReceiptText, caja.expenses || [], (row) => [row.category, row.user, row.notes]], ["Propinas", Coins, caja.tips || [], (row) => [row.user, row.notes]], ["Cargas T.A.", ArrowDownToLine, caja.ta || [], (row) => [row.user, row.notes]], ["Traspasos", ArrowLeftRight, caja.transfers || [], (row) => { const from = boxes.find((box) => box.id === row.fromBoxId)?.title || "Caja"; const to = boxes.find((box) => box.id === row.toBoxId)?.title || "Caja"; return [`${from} -> ${to}`, row.note]; }], ["Movimientos de ahorro", ArrowLeftRight, caja.savingsMovements || [], (row) => [row.holder, row.wallet, row.note]], ["Dinero encontrado", Banknote, caja.foundMoney || [], (row) => [row.holder, row.wallet, row.note]], ["Notas del turno", FileText, [caja.notes?.trim() && { id: "current-note", label: "Actual", note: caja.notes }, caja.nextNotes?.trim() && { id: "next-note", label: "Siguiente", note: caja.nextNotes }].filter(Boolean), (row) => [row.label, row.note]]];
  const chips = (caja.chips || []).filter((chip) => config.platformEnabled?.[chip.platform] !== false);
  const chipBalance = (chip) => n(chip.initial) - n(chip.final);
  const totalFor = (title, list) => title === "Gastos" ? list.reduce((sum, row) => { const category = config.expenses.find((item) => item.name === row.category); return sum + n(row.amount) * (category?.inverted ? -1 : 1); }, 0) : list.reduce((sum, row) => sum + n(row.amount), 0);
  const bonusSlots = Array.from({ length: 4 }, (_, index) => { const from = (start + index * 2) % 24; const to = (from + 2) % 24; const items = (caja.bonuses || []).filter((bonus) => bonusSlotFor(bonus.createdAt, caja.date, start) === index); return { label: `${String(from).padStart(2, "0")}:00 - ${String(to).padStart(2, "0")}:00`, items }; });
  const publicity = (caja.bonuses || []).filter((bonus) => bonus.publicity).reduce((sum, bonus) => sum + n(bonus.granted), 0);
  const granted = (caja.bonuses || []).reduce((sum, bonus) => sum + n(bonus.granted), 0) - publicity;
  const recovered = (caja.bonuses || []).reduce((sum, bonus) => sum + n(bonus.recovered), 0);
  const backgroundImageUrl = config.branding?.backgroundImagePath ? `${import.meta.env.VITE_API_URL || ""}/api/cajas/${activeBox?.id}/imagen-fondo?path=${encodeURIComponent(config.branding.backgroundImagePath)}` : "";
  useEffect(() => {
    const headings = snapshotRef.current?.querySelectorAll(".report-v5-head h2, .report-v5-log-group h3") || [];
    headings.forEach((heading) => {
      [...heading.childNodes]
        .filter((node) => node.nodeType === Node.TEXT_NODE && node.textContent.trim())
        .forEach((node) => {
          const text = document.createElement("span");
          text.textContent = node.textContent.trim();
          node.replaceWith(text);
        });
    });
    const platformRows = snapshotRef.current?.querySelectorAll(".report-v5-chip-log .report-v5-line") || [];
    platformRows.forEach((row) => {
      const platform = row.querySelector("span")?.textContent?.split("·")[0].trim();
      const finalValue = row.querySelector(".report-v5-chip-final");
      if (!finalValue || !platform) return;
      finalValue.style.color = colors[config.platformColors?.[platform]] || colors.teal;
    });
    const summaryRows = snapshotRef.current?.querySelectorAll(".report-v5-chip-summary div") || [];
    summaryRows.forEach((row) => {
      const platform = row.querySelector("span")?.textContent?.trim();
      const value = row.querySelector("b");
      if (value && platform) value.style.color = colors[config.platformColors?.[platform]] || colors.teal;
      row.querySelector(".report-v5-chip-detail")?.remove();
      const chip = chips.find((item) => item.platform === platform);
      if (chip && value) {
        const detail = document.createElement("small");
        detail.className = "report-v5-chip-detail";
        detail.innerHTML = `Inicial: ${money(chip.initial)} Saldo: <span class="report-v5-chip-balance ${chipBalance(chip) < 0 ? "negative" : "positive"}">${money(chipBalance(chip))}</span>`;
        row.insertBefore(detail, value);
      }
    });
    const chipTitle = snapshotRef.current?.querySelector(".report-v5-right-summary .report-v5-summary-card:first-child h2");
    if (chipTitle?.lastChild?.nodeType === Node.TEXT_NODE) chipTitle.lastChild.textContent = " Control de Fichas";
  }, [config.platformColors, chips]);
  const metric = (label, value, hero = false) => <div className={`report-v5-metric ${hero ? "hero" : ""}`}><span>{label === "Pre-diferencia" ? "Diferencia de Caja" : label}</span><b className={value < 0 ? "negative" : value > 0 ? "positive" : "neutral"}>{label === "Sobrante / Faltante" && value >= 0 ? "+" : ""}{money(value)}</b></div>;
  return <div ref={snapshotRef} className="snapshot-export report-card report-v5">{backgroundImageUrl && <img className="report-v5-background" src={backgroundImageUrl} alt="" aria-hidden="true" />}
    <header className="report-v5-header"><div className="report-v5-brand"><span><BrandIcon size={24} /></span><div><strong>CAJA<span>{config.branding?.suffix || "flow"}</span></strong><small>Ficha de cierre operativo</small></div></div><div className="report-v5-period"><b>Turno {caja.shift}</b><strong>{period}</strong><small>{new Date(caja.date).toLocaleDateString("es-AR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}</small></div></header>
    <section className="report-v5-kpis">{metric("Caja final", calculations.cashFinal, true)}{metric("Sobrante / Faltante", calculations.shortage, true)}{metric("Diferencia real", calculations.realDifference, true)}{metric("Ganancia Real", calculations.realProfit, true)}<div className="report-v5-secondary">{metric("Caja inicial", calculations.cashInitial)}{metric("Diferencia de caja", calculations.cashDifference)}{metric("Redondeo", caja.found)}</div></section>
    <main className="report-v5-content"><section className="report-v5-left"><section className="report-v5-accounts"><div className="report-v5-head"><h2><WalletCards size={18} /> Matriz de cuentas</h2><span>{rows.length} titulares · {visibleWallets.length} billeteras</span></div>{rows.length === 0 ? <p>Sin saldos registrados</p> : <table><thead><tr><th>Titular</th>{visibleWallets.map((wallet) => <th key={wallet}>{wallet}</th>)}<th>Total</th></tr></thead><tbody>{rows.map((row) => <tr key={row.holder}><th><i style={{ background: colorFor(row, row.activeWallets[0]) }} />{row.holder}</th>{visibleWallets.map((wallet) => { const shown = row.activeWallets.includes(wallet); return <td className={shown ? "has-value" : "empty-value"} style={shown ? { "--v5-accent": colorFor(row, wallet) } : undefined} key={wallet}>{shown ? money(row.values[wallet]) : "-"}</td>; })}<td>{money(row.activeWallets.reduce((sum, wallet) => sum + n(row.values[wallet]), 0))}</td></tr>)}</tbody></table>}</section><section className="report-v5-log"><div className="report-v5-head"><h2><ArrowLeftRight size={18} /> Bitácora operativa</h2><span>Hora · detalle · monto</span></div><div className="report-v5-log-grid">{operations.filter(([, , list]) => list.length).map(([title, Icon, list, detail]) => <div className="report-v5-log-group" key={title}><h3><Icon size={14} />{title}<small>{list.length} · {money(totalFor(title, list))}</small></h3>{list.map((row) => { const isNotes = title === "Notas del turno"; return <div className="report-v5-line" key={row.id}><span>{!isNotes && <time>[{time(row.createdAt)}]</time>} {!isNotes && " "}{detail(row).filter(Boolean).join(" · ") || "Sin detalle"}</span>{!isNotes && <b>{money(row.amount)}</b>}</div>; })}</div>)}<div className="report-v5-log-group report-v5-chip-log"><h3><Ticket size={14} />Casino / Control de fichas<small>{chips.length} plataformas</small></h3>{chips.map((chip) => <div className="report-v5-line" key={chip.platform}><span>{chip.platform} · Inicial {money(chip.initial)} · <b className={chipBalance(chip) < 0 ? "negative" : "positive"}>Saldo {moneyWhole(chipBalance(chip))}</b></span><b className="report-v5-chip-final">Final {moneyWhole(chip.final)}</b></div>)}</div></div></section></section>
      <section className="report-v5-right"><div className="report-v5-right-summary"><section className="report-v5-summary-card"><div className="report-v5-head"><h2><Ticket size={18} /> Fichas finales</h2></div><div className="report-v5-chip-summary">{chips.map((chip) => <div key={chip.platform}><span style={{ color: platformColorFor(chip.platform) }}>{chip.platform}</span><b>{moneyWhole(chip.final)}</b></div>)}</div></section><section className="report-v5-summary-card"><div className="report-v5-head"><h2><Gift size={18} /> Resumen de bonos</h2></div><div className="report-v5-bonus-summary"><strong>{moneyWhole(calculations.bonuses)}</strong><span>Bonos netos</span><div><span>Otorgados <b>{moneyWhole(granted)}</b></span><span>Recuperados <b>{moneyWhole(recovered)}</b></span><span>Publicidad <b>{moneyWhole(publicity)}</b></span></div></div></section></div><section className="report-v5-bonuses"><div className="report-v5-head"><h2><Gift size={18} /> Línea de tiempo de bonos</h2><span className="report-v5-bonus-totals">Otorgados {moneyWhole(granted)} · Recuperados {moneyWhole(recovered)} · Neto {moneyWhole(calculations.bonuses)}</span></div><div className="report-v5-bonus-grid">{bonusSlots.map((slot) => <div className="report-v5-slot" key={slot.label}><h3>{slot.label}</h3><div className="report-v5-bonus-list">{slot.items.map((bonus) => { const isRecovered = n(bonus.recovered) > 0; const isPublicity = !isRecovered && bonus.publicity; return <div className={isRecovered ? "recovered" : isPublicity ? "publicity" : "granted"} key={bonus.id}><span>{time(bonus.createdAt)} | {isRecovered ? "Recuperado" : isPublicity ? "Publicidad" : "Otorgado"}</span><b>{money(isRecovered ? bonus.recovered : bonus.granted)}</b></div>; })}</div><strong>{money(slot.items.reduce((sum, bonus) => sum + n(bonus.granted) - n(bonus.recovered), 0))}</strong></div>)}</div></section></section>
    </main>
  </div>;
}
