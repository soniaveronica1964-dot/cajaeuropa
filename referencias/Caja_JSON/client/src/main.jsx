import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { createPortal } from "react-dom";
import {
  ArrowLeft,
  ArrowRight,
  ArrowLeftRight,
  ArrowUpDown,
  ArrowDownToLine,
  BarChart3,
  Banknote,
  Camera,
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  Clock3,
  Coins,
  Download,
  Eye,
  FileText,
  GripVertical,
  Gift,
  LockKeyhole,
  Megaphone,
  Pencil,
  Plus,
  RefreshCw,
  Send,
  Settings2,
  SlidersHorizontal,
  Trash2,
  ReceiptText,
  Target,
  Ticket,
  Upload,
  UserPlus,
  Users,
  WalletCards,
  X,
} from "lucide-react";
import "./styles.css";
import html2canvas from "html2canvas";
import CajaReportCardV2 from "./CajaReportCardV2";
import CajaReportCardV4 from "./CajaReportCardV4";
import CajaReportCardV5 from "./CajaReportCardV5";
import CajaReportCardV6 from "./CajaReportCardV6";
import CajaReportCardFinal from "./CajaReportCardFinal";
import faviconIco from "./img/favicon/favicon.ico";
import favicon16 from "./img/favicon/favicon-16x16.png";
import favicon32 from "./img/favicon/favicon-32x32.png";
import appleTouchIcon from "./img/favicon/apple-touch-icon.png";
import androidIcon from "./img/favicon/android-chrome-192x192.png";

const faviconLinks = [
  { rel: "icon", type: "image/x-icon", href: faviconIco },
  { rel: "icon", type: "image/png", sizes: "16x16", href: favicon16 },
  { rel: "icon", type: "image/png", sizes: "32x32", href: favicon32 },
  { rel: "apple-touch-icon", sizes: "180x180", href: appleTouchIcon },
  { rel: "icon", type: "image/png", sizes: "192x192", href: androidIcon },
];
faviconLinks.forEach(({ rel, type, sizes, href }) => {
  const link = document.createElement("link");
  link.rel = rel;
  if (type) link.type = type;
  if (sizes) link.sizes = sizes;
  link.href = href;
  document.head.appendChild(link);
});

const money = (value) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 2,
  }).format(Number(value) || 0);
const brandIcons = { banknote: Banknote, wallet: WalletCards, coins: Coins, gift: Gift, ticket: Ticket, receipt: ReceiptText };
const BrandIcon = ({ name = "banknote", size = 20 }) => { const Icon = brandIcons[name] || Banknote; return <Icon size={size} />; };
const number = (value) => Number(value) || 0;
const monthKeyFor = (dateValue) => {
  const date = new Date(dateValue);
  return Number.isNaN(date.getTime()) ? "" : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
};
const monthlyGoalForDate = (goal, dateValue) => {
  const source = goal || {};
  const months = source.months && typeof source.months === "object" ? source.months : {};
  const monthKey = monthKeyFor(dateValue);
  const monthKeys = Object.keys(months).sort();
  const fallbackKey = monthKeys.filter((key) => key <= monthKey).at(-1) || monthKeys[0];
  const entry = months[monthKey] || (fallbackKey ? months[fallbackKey] : null);
  if (!entry) return { final: number(source.final), achieved: number(source.achieved), platformDeposits: source.platformDeposits || {} };
  return { final: number(entry.final), achieved: months[monthKey] ? number(entry.achieved) : 0, platformDeposits: months[monthKey] ? (entry.platformDeposits || {}) : {} };
};
const enabledPlatformsFor = (config) => (config?.platforms || []).filter((platform) => config?.platformEnabled?.[platform] !== false);
const parseNumberInput = (value) => {
  const text = String(value ?? "").trim().replace(/\s/g, "");
  if (!text) return 0;
  const sign = text.startsWith("-") ? -1 : 1;
  const unsigned = text.replace(/^[+-]/, "").replace(/[^\d.,]/g, "");
  if (!unsigned) return 0;
  const separators = [...unsigned.matchAll(/[.,]/g)].map((match) => match.index);
  if (!separators.length) return sign * (Number(unsigned) || 0);

  const lastSeparator = separators[separators.length - 1];
  const digitsAfterLast = unsigned.length - lastSeparator - 1;
  const hasBothSeparators = unsigned.includes(".") && unsigned.includes(",");
  const repeatedSeparator = separators.length > 1 && new Set([...unsigned].filter((character) => character === "." || character === ",")).size === 1;
  const decimalSeparator = hasBothSeparators || (!repeatedSeparator && digitsAfterLast <= 2)
    ? unsigned[lastSeparator]
    : null;
  const normalized = decimalSeparator
    ? `${unsigned.slice(0, lastSeparator).replace(/[.,]/g, "")}.${unsigned.slice(lastSeparator + 1)}`
    : unsigned.replace(/[.,]/g, "");
  return sign * (Number(normalized) || 0);
};
const formatNumberInput = (value) => {
  const parsed = parseNumberInput(value);
  if (parsed === 0) return "";
  return parsed
    ? new Intl.NumberFormat("es-AR", { maximumFractionDigits: 2 }).format(parsed)
    : "";
};
const realDifferenceFor = (caja, config, activeBoxId) => {
  const accounts = caja.accounts
    .flatMap((row) => Object.entries(row.values).filter(([wallet]) => walletCountsInCash(row, wallet, config, activeBoxId)).map(([, value]) => value))
    .reduce((sum, value) => sum + number(value), 0);
  const bonuses = caja.bonuses.reduce((sum, bonus) => sum + number(bonus.granted) - number(bonus.recovered), 0);
  const ta = caja.ta.reduce((sum, row) => sum + number(row.amount), 0);
  const expenses = caja.expenses.reduce((sum, row) => {
    const category = config.expenses.find((item) => item.name === row.category);
    return sum + number(row.amount) * (category?.inverted ? -1 : 1);
  }, 0);
  const savings = (caja.savingsMovements || []).reduce((sum, row) => sum + number(row.amount), 0);
    const cashDifference = expenses + ta + accounts + savings - number(caja.cashInitial);
  const transferAdjustment = (caja.transfers || []).reduce((sum, transfer) => sum + (transfer.fromBoxId === activeBoxId ? number(transfer.amount) : transfer.toBoxId === activeBoxId ? -number(transfer.amount) : 0), 0);
  return cashDifference - bonuses + transferAdjustment;
};
  const formatMovementTime = (value) => value ? new Intl.DateTimeFormat("es-AR", { hour: "2-digit", minute: "2-digit" }).format(new Date(value)) : "--:--";
  const bonusSlotFor = (createdAt, cajaDate, shiftStart) => {
    const bonusDate = new Date(createdAt);
    const minutes = bonusDate.getHours() * 60 + bonusDate.getMinutes();
    if (shiftStart === 0 && minutes >= 16 * 60) return 0;
    if (shiftStart === 16 && minutes < 8 * 60) return 3;
    const elapsed = minutes - shiftStart * 60;
    return elapsed < 0 ? 0 : Math.min(3, Math.floor(elapsed / 120));
  };
const isShiftOutOfTime = (caja) => {
  const shiftDate = new Date(caja?.date);
  if (Number.isNaN(shiftDate.getTime())) return false;

  const shiftEnd = new Date(shiftDate);
  if (caja.shift === "Noche") shiftEnd.setHours(8, 0, 0, 0);
  else if (caja.shift === "Mañana") shiftEnd.setHours(16, 0, 0, 0);
  else if (caja.shift === "Tarde") {
    shiftEnd.setDate(shiftEnd.getDate() + 1);
    shiftEnd.setHours(0, 0, 0, 0);
  } else return false;

  return new Date() >= shiftEnd;
};

const walletBelongsToBox = (row, wallet, config, boxId) => {
  const setting = config.accounts.walletSettings[row.holder]?.[wallet];
  return config.accounts.availability[row.holder]?.[wallet] !== false && (setting?.category === "Normal" || !setting?.category ? true : row.walletBoxes?.[wallet] === boxId);
};
const walletCountsInCash = (row, wallet, config, boxId) => {
  const setting = config.accounts.walletSettings[row.holder]?.[wallet];
  return setting?.category !== "Ahorro" && walletBelongsToBox(row, wallet, config, boxId);
};
const walletModeClass = (config, wallet) => ({
  "Cobros + Retiros": "wallet-mode-all",
  "Solo Cobros": "wallet-mode-collections",
  "Solo Depósito": "wallet-mode-deposit",
}[config.accounts.walletModes?.[wallet] || "Cobros + Retiros"]);
const statisticsFor = (caja, config, activeBoxId) => {
  const accounts = (caja.accounts || [])
    .flatMap((row) => Object.entries(row.values || {}).filter(([wallet]) => walletCountsInCash(row, wallet, config, activeBoxId)).map(([, value]) => value))
    .reduce((sum, value) => sum + number(value), 0);
  const tips = (caja.tips || []).reduce((sum, row) => sum + number(row.amount), 0);
  const granted = (caja.bonuses || []).reduce((sum, row) => sum + number(row.granted), 0);
  const recovered = (caja.bonuses || []).reduce((sum, row) => sum + number(row.recovered), 0);
  const ta = (caja.ta || []).reduce((sum, row) => sum + number(row.amount), 0);
  const found = (caja.foundMoney || []).reduce((sum, row) => sum + number(row.amount), 0);
  const savings = (caja.savingsMovements || []).reduce((sum, row) => sum + number(row.amount), 0);
  const rounding = number(caja.found);
  const expensesByCategory = config.expenses.reduce((result, category) => {
    result[category.name] = (caja.expenses || []).filter((row) => row.category === category.name).reduce((sum, row) => sum + number(row.amount), 0);
    return result;
  }, {});
  (caja.expenses || []).forEach((row) => {
    if (!(row.category in expensesByCategory)) expensesByCategory[row.category] = 0;
  });
  const expenses = Object.values(expensesByCategory).reduce((sum, value) => sum + value, 0);
  const balance = (caja.chips || []).reduce((sum, row) => sum + number(row.initial) - number(row.final), 0);
  const cashInitial = number(caja.cashInitial);
  const cashFinal = accounts;
  const preDifference = expenses + ta + cashFinal + granted - recovered + savings;
  const difference = preDifference - cashInitial;
  const cashDifference = cashFinal - cashInitial;
  const transfers = (caja.transfers || []).reduce((sum, transfer) => sum + (transfer.fromBoxId === activeBoxId ? number(transfer.amount) : transfer.toBoxId === activeBoxId ? -number(transfer.amount) : 0), 0);
  const realDifference = difference - (granted - recovered) + transfers;
  const realProfit = realDifference * 0.77;
  return { tips, found, rounding, savings, granted, recovered, ta, expenses, expensesByCategory, balance, cashInitial, cashFinal, preDifference, difference, cashDifference, realDifference, realProfit, transfers, bonusesNet: granted - recovered };
};
const api = (url, options) =>
  fetch(`${import.meta.env.VITE_API_URL || ""}${url}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  }).then(async (response) => {
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      throw new Error("La API no está respondiendo: el servidor devolvió HTML en lugar de JSON. Verificá que VITE_API_URL apunte al backend y que esté actualizado.");
    }
    const result = await response.json();
    if (!response.ok || result?.error) {
      const error = new Error(result?.message || result?.error || `Error de API (${response.status})`);
      error.status = response.status;
      error.code = result?.error;
      throw error;
    }
    return result;
  });

let confirmDialogController = null;

const confirmDelete = (message = "¿Estás seguro?") =>
  new Promise((resolve) => {
    if (confirmDialogController) {
      confirmDialogController({ message, onConfirm: () => resolve(true), onCancel: () => resolve(false), confirmLabel: "Eliminar" });
    } else {
      const confirmed = window.confirm(message);
      resolve(confirmed);
    }
  });

const boxColorStyle = (color) => {
  const palette = {
    teal: { accent: "#72d7ca", glow: "#244344", soft: "#1d302f", line: "#315552" },
    blue: { accent: "#82b8ff", glow: "#263b58", soft: "#202d40", line: "#3d5b7d" },
    green: { accent: "#83d5a2", glow: "#244635", soft: "#20372b", line: "#3c6850" },
    orange: { accent: "#f5ad69", glow: "#4c3423", soft: "#3b2b20", line: "#765336" },
    pink: { accent: "#ed9fc1", glow: "#4b2f3e", soft: "#382730", line: "#70465d" },
    red: { accent: "#ef8888", glow: "#4b292d", soft: "#382326", line: "#704246" },
    yellow: { accent: "#e8d477", glow: "#484224", soft: "#37331f", line: "#706833" },
    violet: { accent: "#c2a0ed", glow: "#3c2d50", soft: "#302640", line: "#604b7c" },
    slate: { accent: "#aebdca", glow: "#303c45", soft: "#29343b", line: "#536976" },
  }[color] || { accent: "#72d7ca", glow: "#244344", soft: "#1d302f", line: "#315552" };
  const lineRgb = palette.line.match(/[\da-f]{2}/gi).map((part) => Number.parseInt(part, 16)).join(", ");
  return {
    "--box-accent": palette.accent,
    "--box-glow": palette.glow,
    "--box-soft": palette.soft,
    "--box-line": palette.line,
    "--box-report-line": `rgba(${lineRgb}, .55)`,
    "--box-report-line-soft": `rgba(${lineRgb}, .38)`,
    "--box-report-line-faint": `rgba(${lineRgb}, .34)`,
    "--box-report-line-strong": `rgba(${lineRgb}, .7)`,
  };
};

function BoxSelector({ boxes, activeBoxId, onChange, label = "CAJA" }) {
  const [open, setOpen] = useState(false);
  const activeBox = boxes.find((box) => box.id === activeBoxId) || boxes[0];
  return <div className={`box-selector ${open ? "open" : ""}`} style={boxColorStyle(activeBox?.color)}>
    <span>{label}</span>
      <button className="box-selector-trigger" onClick={() => setOpen(!open)} aria-expanded={open}><b>{activeBox?.title}</b><i /></button>
    {open && <div className="box-options">{boxes.map((box) => <button className={box.id === activeBox?.id ? "selected" : ""} key={box.id} onClick={() => { onChange(box.id); setOpen(false); }}><i className={box.color} />{box.title}</button>)}</div>}
  </div>;
}

function WalletAssignmentSelector({ boxes, value, onChange, showLabel = true }) {
  const [open, setOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState(null);
  const selectorRef = React.useRef(null);
  const menuRef = React.useRef(null);
  const buttonRef = React.useRef(null);
  const selected = boxes.find((box) => box.id === value);
    const assignmentStyle = (box) => {
    if (!box) return undefined;
    const palette = boxColorStyle(box.color);
    return { "--assignment-accent": palette["--box-accent"], "--assignment-line": palette["--box-line"] };
  };
  const toggleMenu = () => {
    if (open) {
      setOpen(false);
      setMenuPosition(null);
      return;
    }
    const rect = buttonRef.current?.getBoundingClientRect();
    if (rect) setMenuPosition({ top: rect.bottom + 4, left: rect.left });
    setOpen(true);
  };
  useEffect(() => {
    if (!open) return undefined;
    const closeOnOutside = (event) => {
      if (!selectorRef.current?.contains(event.target) && !menuRef.current?.contains(event.target)) {
        setOpen(false);
        setMenuPosition(null);
      }
    };
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", closeOnOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);
  return (
    <div ref={selectorRef} className="wallet-assignment-control" style={assignmentStyle(selected)}>
      <button ref={buttonRef} type="button" tabIndex={-1} className={`wallet-assignment ${selected ? "" : "unassigned"} ${showLabel ? "with-label" : ""}`} aria-label="Caja a la que pertenece" title="Caja a la que pertenece" onClick={toggleMenu}>
        {selected ? <><i className="wallet-assignment-dot" />{showLabel && <b>{selected.title}</b>}</> : showLabel ? "Sin caja" : "-"}
      </button>
      {open && menuPosition && createPortal(
        <div ref={menuRef} className="wallet-assignment-options" style={{ top: menuPosition.top, left: menuPosition.left }}>
          {[null, ...boxes].map((box) => (
            <button type="button" className={!box ? "unassigned" : ""} key={box?.id || "none"} style={assignmentStyle(box)} onClick={() => { onChange(box?.id || ""); setOpen(false); setMenuPosition(null); }}>
              {box ? <><i className="wallet-assignment-dot" />{box.title}</> : "-"}
            </button>
          ))}
        </div>
        , document.body,
      )}
    </div>
  );
}

function TransferBoxPicker({ label, boxes, value, excludeId, onChange }) {
  const [open, setOpen] = useState(false);
  const selected = boxes.find((box) => box.id === value);
  const options = boxes.filter((box) => box.id !== excludeId);
  return <div className="transfer-picker">
    <span>{label}</span>
    <div className={`transfer-picker-control ${open ? "open" : ""}`} style={boxColorStyle(selected?.color)}>
      <button type="button" onClick={() => setOpen(!open)}><i className="transfer-box-dot" /><b>{selected?.title || "Seleccionar caja"}</b><em /></button>
      {open && <div className="transfer-picker-options">{options.map((box) => <button type="button" className={box.id === value ? "selected" : ""} key={box.id} onClick={() => { onChange(box.id); setOpen(false); }} style={boxColorStyle(box.color)}><i className="transfer-box-dot" />{box.title}</button>)}</div>}
    </div>
  </div>;
}

function TransferSection({ caja, config, boxes, activeBoxId, transfers, savingsMovements = [], onCreate, onUpdateTransfer, onDeleteTransfer, onCreateSavings, onUpdateSavings, onDeleteSavings }) {
  const [fromBoxId, setFromBoxId] = useState(activeBoxId);
  const [toBoxId, setToBoxId] = useState(boxes.find((box) => box.id !== activeBoxId)?.id || "");
  const [savingsMode, setSavingsMode] = useState(false);
  const [holder, setHolder] = useState("");
  const [wallet, setWallet] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingMovement, setEditingMovement] = useState(null);
  const [deleteMovement, setDeleteMovement] = useState(null);
  const accountFor = (name) => (caja.accounts || []).find((account) => account.holder === name);
  const savingsWalletsFor = (name) => config.accounts.wallets.filter((item) => config.accounts.walletSettings[name]?.[item]?.category === "Ahorro" && config.accounts.availability[name]?.[item] !== false && item in (accountFor(name)?.values || {}));
  const savingsHolders = config.accounts.holders.filter((name) => savingsWalletsFor(name).length > 0);
  const records = savingsMode ? savingsMovements : transfers;
  const allRecords = [...transfers.map((record) => ({ ...record, movementType: "transfer" })), ...savingsMovements.map((record) => ({ ...record, movementType: "savings" }))].sort((first, second) => new Date(first.createdAt || 0) - new Date(second.createdAt || 0));
  useEffect(() => {
    setFromBoxId(activeBoxId);
    setToBoxId(boxes.find((box) => box.id !== activeBoxId)?.id || "");
  }, [activeBoxId, boxes]);
  useEffect(() => {
    if (!savingsHolders.includes(holder)) {
      setHolder("");
      setWallet("");
    } else if (!savingsWalletsFor(holder).includes(wallet)) {
      setWallet("");
    }
  }, [config, caja.accounts, holder, wallet]);
  const toggleMode = () => {
    setSavingsMode((current) => !current);
    setHolder("");
    setWallet("");
    setAmount("");
    setNote("");
    setError("");
  };
  const changeFromBox = (boxId) => {
    setFromBoxId(boxId);
    if (boxId && boxId === toBoxId) setToBoxId("");
  };
  const invertSelection = () => {
    setFromBoxId(toBoxId);
    setToBoxId(fromBoxId);
  };
  const submit = async (savingsAction = "deposit") => {
    setError("");
    try {
      if (savingsMode) {
        if (!holder || !wallet) throw new Error("Seleccioná un titular y una billetera de ahorro");
        const value = Math.abs(parseNumberInput(amount));
        if (!value) throw new Error("Ingresá un monto válido");
        await onCreateSavings({ id: crypto.randomUUID(), holder, wallet, amount: savingsAction === "withdraw" ? -value : value, note: note.trim(), createdAt: new Date().toISOString() });
      } else {
        await onCreate({ fromBoxId, toBoxId, amount: parseNumberInput(amount), note });
      }
      setAmount("");
      setNote("");
    }
    catch (requestError) { setError(requestError.message); }
  };
  const saveMovement = async () => {
    try {
      const { movementType, ...movement } = editingMovement;
      await (movementType === "savings" ? onUpdateSavings(movement) : onUpdateTransfer(movement));
      setEditingMovement(null);
    }
    catch (requestError) { setError(requestError.message); }
  };
  return (
    <section className="transfer-panel">
      <div className="transfer-form">
        <div className="transfer-form-head"><div className="transfer-form-title"><ArrowLeftRight size={18} /><div><div className="transfer-form-title-line"><h3>Movimientos</h3><span>{records.length} registros</span></div></div></div><div className="transfer-form-actions"><label className="movement-mode-toggle" title="Activar movimientos de ahorro"><span>Movimientos de ahorro</span><input type="checkbox" checked={savingsMode} onChange={toggleMode} /><i /></label><button className="icon-button" title="Ver y editar movimientos" onClick={() => setEditorOpen(true)}><Eye size={16} /></button></div></div>
        {savingsMode ? <div className="transfer-fields savings-movement-fields">
          <label><span>Titular</span><select value={holder} onChange={(event) => { setHolder(event.target.value); setWallet(""); }}><option value="">Titular</option>{savingsHolders.map((name) => <option value={name} key={name}>{name}</option>)}</select></label>
          <label><span>Billetera</span><select value={wallet} disabled={!holder} onChange={(event) => setWallet(event.target.value)}><option value="">Billetera</option>{savingsWalletsFor(holder).map((item) => <option value={item} key={item}>{item}</option>)}</select></label>
          <label><span>Monto</span><AmountInput value={amount} onChange={(value) => setAmount(value)} /></label>
          <label><span>Nota</span><input value={note} placeholder="Nota" onChange={(event) => setNote(event.target.value)} /></label>
          <button type="button" className="send-button transfer-send" title="Ahorrar dinero" aria-label="Ahorrar dinero" onClick={() => submit("deposit")}><Send size={15} /></button><button type="button" className="send-button transfer-withdraw" title="Descargar dinero del ahorro" aria-label="Descargar dinero del ahorro" onClick={() => submit("withdraw")}><Download size={15} /></button>
        </div> : <div className="transfer-fields">
          <TransferBoxPicker label="Desde" boxes={boxes} value={fromBoxId} onChange={changeFromBox} />
          <button type="button" className="transfer-invert" title="Invertir selección" aria-label="Invertir selección" onClick={invertSelection}><ArrowLeftRight size={16} /></button>
          <TransferBoxPicker label="Hasta" boxes={boxes} value={toBoxId} excludeId={fromBoxId} onChange={setToBoxId} />
          <label><span>Monto</span><AmountInput value={amount} onChange={(value) => setAmount(value)} /></label>
          <button type="button" className="send-button transfer-send" title="Enviar traspaso" aria-label="Enviar traspaso" onClick={submit} disabled={boxes.length < 2}><Send size={15} /></button>
        </div>}
        {error && <small className="transfer-error">{error}</small>}
      </div>
      <div className="transfer-history"><div className="recent-movements"><span>Últimos movimientos</span>{allRecords.slice().reverse().map((record) => record.movementType === "savings" ? <div className="recent-movement transfer-row" key={`savings-${record.id}`}><span>Ahorro - {record.holder} · {record.wallet}{record.note ? ` · ${record.note}` : ""}</span><b className={record.amount < 0 ? "transfer-in" : "transfer-out"}>{record.amount < 0 ? "+" : "-"}{money(Math.abs(record.amount))}</b></div> : (() => { const outgoing = record.fromBoxId === activeBoxId; const otherBox = boxes.find((box) => box.id === (outgoing ? record.toBoxId : record.fromBoxId)); return <div className="recent-movement transfer-row" key={`transfer-${record.id}`}><span>Entre cajas - {outgoing ? "Salida a" : "Entrada de"} {otherBox?.title || "otra caja"}{record.note ? ` · ${record.note}` : ""}</span><b className={outgoing ? "transfer-out" : "transfer-in"}>{outgoing ? "-" : "+"}{money(record.amount)}</b></div>; })())}{allRecords.length === 0 && <small>Sin movimientos todavía</small>}</div></div>
      {editorOpen && <div className="modal-backdrop" onClick={() => setEditorOpen(false)}><div className="modal transfer-modal" onClick={(event) => event.stopPropagation()}><button className="modal-close" onClick={() => setEditorOpen(false)}><X size={18} /></button><div className="modal-icon"><ArrowLeftRight size={20} /></div><h2>Movimientos del turno</h2><p>Editá los datos de cada movimiento.</p><div className="transfer-edit-list">{allRecords.length === 0 && <div className="empty-state">Todavía no hay movimientos.</div>}{allRecords.map((record) => <div className="transfer-edit-row" key={`${record.movementType}-${record.id}`}><time className="movement-time">{formatMovementTime(record.createdAt)}</time><div>{record.movementType === "savings" ? <><b>Ahorro - {record.holder}</b><span>{record.wallet}{record.note ? ` · ${record.note}` : ""}</span></> : <><b>Entre cajas - {boxes.find((box) => box.id === record.fromBoxId)?.title}</b><span>hacia {boxes.find((box) => box.id === record.toBoxId)?.title}</span></>}</div><strong>{money(record.amount)}</strong><button className="icon-button" title="Editar movimiento" onClick={() => setEditingMovement({ ...record })}><Settings2 size={14} /></button><button className="delete-button" title="Eliminar movimiento" onClick={() => setDeleteMovement({ id: record.id, type: record.movementType })}><Trash2 size={14} /></button></div>)}</div><div className="modal-actions"><button className="close-button" onClick={() => setEditorOpen(false)}>Listo <Check size={16} /></button></div></div></div>}
      {editingMovement && <div className="modal-backdrop" onClick={() => setEditingMovement(null)}><div className="modal transfer-edit-modal" onClick={(event) => event.stopPropagation()}><button className="modal-close" onClick={() => setEditingMovement(null)}><X size={18} /></button><div className="modal-icon"><Settings2 size={20} /></div><h2>{editingMovement.movementType === "savings" ? "Editar ahorro" : "Editar traspaso"}</h2><div className="transfer-edit-fields">{editingMovement.movementType === "savings" ? <><label><span>Titular</span><select value={editingMovement.holder} onChange={(event) => { const nextHolder = event.target.value; const wallets = savingsWalletsFor(nextHolder); setEditingMovement({ ...editingMovement, holder: nextHolder, wallet: wallets.includes(editingMovement.wallet) ? editingMovement.wallet : "" }); }}><option value="">Titular</option>{savingsHolders.map((name) => <option value={name} key={name}>{name}</option>)}</select></label><label><span>Billetera</span><select value={editingMovement.wallet} disabled={!editingMovement.holder} onChange={(event) => setEditingMovement({ ...editingMovement, wallet: event.target.value })}><option value="">Billetera</option>{savingsWalletsFor(editingMovement.holder).map((item) => <option value={item} key={item}>{item}</option>)}</select></label></> : <><TransferBoxPicker label="Desde" boxes={boxes} value={editingMovement.fromBoxId} onChange={(value) => setEditingMovement({ ...editingMovement, fromBoxId: value })} /><TransferBoxPicker label="Hasta" boxes={boxes} value={editingMovement.toBoxId} excludeId={editingMovement.fromBoxId} onChange={(value) => setEditingMovement({ ...editingMovement, toBoxId: value })} /></>}<label><span>Monto</span><AmountInput value={editingMovement.amount} onChange={(value) => setEditingMovement({ ...editingMovement, amount: value })} /></label><label><span>Nota</span><input value={editingMovement.note || ""} onChange={(event) => setEditingMovement({ ...editingMovement, note: event.target.value })} /></label></div><div className="modal-actions"><button className="ghost-button" onClick={() => setEditingMovement(null)}>Cancelar</button><button className="close-button" onClick={saveMovement}>Guardar <Check size={16} /></button></div></div></div>}
      {deleteMovement && <ConfirmDialog dialog={{ message: "¿Seguro que querés eliminar este movimiento?", onConfirm: async () => { await (deleteMovement.type === "savings" ? onDeleteSavings(deleteMovement.id) : onDeleteTransfer(deleteMovement.id)); setDeleteMovement(null); } }} onClose={() => setDeleteMovement(null)} />}
    </section>
  );
}

function ConfigList({ title, items, onChange, placeholder, sortable = false, onItemChange, entities = [], onEntitiesChange }) {
  const [dragIndex, setDragIndex] = useState(null);
  const reorder = (targetIndex) => {
    if (dragIndex === null || dragIndex === targetIndex) return;
    const next = [...items];
    const [moved] = next.splice(dragIndex, 1);
    next.splice(targetIndex, 0, moved);
    if (onEntitiesChange) {
      const nextEntities = [...entities];
      const [movedEntity] = nextEntities.splice(dragIndex, 1);
      nextEntities.splice(targetIndex, 0, movedEntity);
      onEntitiesChange(nextEntities);
    }
    onChange(next);
    setDragIndex(null);
  };
  return (
    <div className="config-list">
      <div className="config-list-head"><h3>{title}</h3><span>{items.length} elementos</span></div>
      {items.map((item, index) => (
        <div className={`config-list-row ${sortable ? "sortable" : ""}`} key={index} draggable={sortable} onDragStart={() => setDragIndex(index)} onDragOver={(event) => { if (sortable) event.preventDefault(); }} onDrop={() => sortable && reorder(index)} onDragEnd={() => setDragIndex(null)}>
          {sortable && <span className="drag-handle" title="Arrastrar para reordenar"><GripVertical size={15} /></span>}
          <input value={item} placeholder={placeholder} onChange={(event) => { const next = [...items]; next[index] = event.target.value; if (onItemChange) onItemChange(index, event.target.value); else onChange(next); if (onEntitiesChange && entities[index]) onEntitiesChange(entities.map((entity, entityIndex) => entityIndex === index ? { ...entity, name: event.target.value } : entity)); }} />
          <button className="delete-button" title={`Eliminar ${title.toLowerCase()}`} onClick={() => { onChange(items.filter((_, itemIndex) => itemIndex !== index)); if (onEntitiesChange) onEntitiesChange(entities.filter((_, entityIndex) => entityIndex !== index)); }}><Trash2 size={15} /></button>
        </div>
      ))}
      <button className="config-add" onClick={() => { onChange([...items, ""]); if (onEntitiesChange) onEntitiesChange([...entities, { id: `entity-${crypto.randomUUID()}`, name: "" }]); }}><Plus size={15} /> Agregar</button>
    </div>
  );
}

function UserInfoOptionsConfig({ draft, setDraft }) {
  const options = Array.isArray(draft.userInfoOptions) ? draft.userInfoOptions : [];
  return <section className="config-card user-info-options-config"><div className="config-list-head"><h3>Panel</h3><span>{options.length} opciones</span></div>{options.map((option, index) => <div className="config-list-row" key={index}><input value={option} placeholder="Opción de información" onChange={(event) => setDraft((current) => ({ ...current, userInfoOptions: options.map((item, itemIndex) => itemIndex === index ? event.target.value : item) }))} /><button className="delete-button" type="button" title="Eliminar opción" onClick={() => setDraft((current) => ({ ...current, userInfoOptions: options.filter((_, itemIndex) => itemIndex !== index) }))}><Trash2 size={15} /></button></div>)}<button className="config-add" type="button" onClick={() => setDraft((current) => ({ ...current, userInfoOptions: [...options, ""] }))}><Plus size={15} /> Agregar opción</button></section>;
}

function PlatformConfigList({ platforms, platformColors, platformEnabled = {}, platformEntities = [], onPlatformsChange, onEntitiesChange, onColorChange, onEnabledChange, platformSubPlatforms = {}, onSubPlatformsChange }) {
  const [subplatformModal, setSubplatformModal] = useState(null);
  const [subplatformsInEdit, setSubplatformsInEdit] = useState([]);
  const colorNames = { teal: "Turquesa", blue: "Azul", green: "Verde", orange: "Naranja", pink: "Rosa", red: "Rojo", yellow: "Amarillo", violet: "Violeta", slate: "Pizarra" };
  const normalizeSubPlatforms = (subs) => {
    if (!Array.isArray(subs)) return [];
    return subs.map(sub => typeof sub === "string" ? { name: sub, color: "teal" } : sub);
  };
  const openModal = (platform) => {
    setSubplatformModal(platform);
    setSubplatformsInEdit(normalizeSubPlatforms(platformSubPlatforms[platform] || []));
  };
  const closeModal = () => {
    setSubplatformModal(null);
    setSubplatformsInEdit([]);
  };
  const saveModal = () => {
    onSubPlatformsChange({ ...platformSubPlatforms, [subplatformModal]: subplatformsInEdit });
    closeModal();
  };
  return <>
    <div className="config-list platform-config-list">
      <div className="config-list-head"><h3>Plataformas</h3><span>{platforms.length} elementos</span></div>
      {platforms.map((platform, index) => (
        <div className="platform-config-row" key={platformEntities[index]?.id || index}>
          <i className={`box-swatch ${platformColors[platform] || "teal"}`} />
          <input value={platform} placeholder="Nombre de plataforma" onChange={(event) => { const next = [...platforms]; const previous = next[index]; next[index] = event.target.value; onPlatformsChange(next); if (onEntitiesChange && platformEntities[index]) onEntitiesChange(platformEntities.map((entity, entityIndex) => entityIndex === index ? { ...entity, name: event.target.value } : entity)); if (previous !== event.target.value) onColorChange(event.target.value, platformColors[previous] || "teal", previous); }} />
          <select value={platformColors[platform] || "teal"} aria-label={`Color de ${platform}`} onChange={(event) => onColorChange(platform, event.target.value)}>{Object.entries(colorNames).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select>
          <label className="platform-enabled-toggle"><input type="checkbox" checked={platformEnabled[platform] !== false} onChange={(event) => onEnabledChange?.(platform, event.target.checked)} /><span>{platformEnabled[platform] !== false ? "Activa" : "Deshabilitada"}</span></label>
          <button type="button" className="platform-subplatform-button" title={`Configurar subplataformas de ${platform || "esta plataforma"}`} aria-label={`Configurar subplataformas de ${platform || "esta plataforma"}`} onClick={() => openModal(platform)}><Settings2 size={14} /></button>
          <button className="delete-button" title="Eliminar plataforma" onClick={async () => { if (await confirmDelete(`¿Eliminar plataforma "${platform}"?`)) { onPlatformsChange(platforms.filter((_, itemIndex) => itemIndex !== index)); if (onEntitiesChange) onEntitiesChange(platformEntities.filter((_, entityIndex) => entityIndex !== index)); const newSubs = { ...platformSubPlatforms }; delete newSubs[platform]; if (onSubPlatformsChange) onSubPlatformsChange(newSubs); } }}><Trash2 size={15} /></button>
        </div>
      ))}
      <button className="config-add" onClick={() => { onPlatformsChange([...platforms, ""]); if (onEntitiesChange) onEntitiesChange([...platformEntities, { id: `platform-${crypto.randomUUID()}`, name: "" }]); }}><Plus size={15} /> Agregar plataforma</button>
    </div>
    {subplatformModal && <div className="modal-backdrop" onClick={closeModal}>
      <div className="modal" onClick={(event) => event.stopPropagation()} style={{ maxWidth: "500px" }}>
        <button className="modal-close" type="button" title="Cerrar" onClick={closeModal}><X size={18} /></button>
        <h2 style={{ marginBottom: "16px" }}>Subplataformas de {subplatformModal}</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "16px" }}>
          {subplatformsInEdit.map((sub, index) => (
            <div key={index} style={{ display: "grid", gridTemplateColumns: "1fr 100px auto", gap: "8px", alignItems: "center" }}>
              <input value={sub.name || ""} placeholder="Nombre subplataforma" onChange={(event) => { const newSubs = [...subplatformsInEdit]; newSubs[index] = { ...newSubs[index], name: event.target.value }; setSubplatformsInEdit(newSubs); }} />
              <select value={sub.color || "teal"} onChange={(event) => { const newSubs = [...subplatformsInEdit]; newSubs[index] = { ...newSubs[index], color: event.target.value }; setSubplatformsInEdit(newSubs); }}>{Object.entries({ teal: "Turquesa", blue: "Azul", green: "Verde", orange: "Naranja", pink: "Rosa", red: "Rojo", yellow: "Amarillo", violet: "Violeta", slate: "Pizarra" }).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select>
              <button className="delete-button" title="Eliminar" onClick={async () => { if (await confirmDelete(`¿Eliminar "${sub.name || 'sin nombre'}"?`)) { setSubplatformsInEdit(subplatformsInEdit.filter((_, i) => i !== index)); } }}><Trash2 size={15} /></button>
            </div>
          ))}
        </div>
        <button className="config-add" onClick={() => { setSubplatformsInEdit([...subplatformsInEdit, { name: "", color: "teal" }]); }} style={{ width: "100%", marginBottom: "12px" }}><Plus size={15} /> Agregar subplataforma</button>
        <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
          <button onClick={closeModal} style={{ padding: "8px 16px", borderRadius: "4px", border: "1px solid var(--line)", background: "transparent", cursor: "pointer", color: "var(--text-secondary)" }}>Cancelar</button>
          <button onClick={saveModal} style={{ padding: "8px 16px", borderRadius: "4px", background: "var(--box-accent)", color: "white", cursor: "pointer", fontWeight: "600", border: "none" }}>Guardar</button>
        </div>
      </div>
    </div>}
  </>;
}

function WalletConfigList({ wallets, modes, walletEntities = [], onChange, onEntitiesChange, onModeChange }) {
  const [dragIndex, setDragIndex] = useState(null);
  const reorder = (targetIndex) => { if (dragIndex === null || dragIndex === targetIndex) return; const next = [...wallets]; const [moved] = next.splice(dragIndex, 1); next.splice(targetIndex, 0, moved); if (onEntitiesChange) { const nextEntities = [...walletEntities]; const [movedEntity] = nextEntities.splice(dragIndex, 1); nextEntities.splice(targetIndex, 0, movedEntity); onEntitiesChange(nextEntities); } onChange(next); setDragIndex(null); };
  return <div className="config-list wallet-config-list"><div className="config-list-head"><h3>Billeteras</h3><span>{wallets.length} elementos</span></div>{wallets.map((wallet, index) => <div className="wallet-config-row" key={walletEntities[index]?.id || index} draggable onDragStart={() => setDragIndex(index)} onDragOver={(event) => event.preventDefault()} onDrop={() => reorder(index)} onDragEnd={() => setDragIndex(null)}><span className="drag-handle" title="Arrastrar para reordenar"><GripVertical size={15} /></span><input value={wallet} placeholder="Nombre de billetera" onChange={(event) => { const next = [...wallets]; const previous = next[index]; next[index] = event.target.value; onChange(next); if (onEntitiesChange && walletEntities[index]) onEntitiesChange(walletEntities.map((entity, entityIndex) => entityIndex === index ? { ...entity, name: event.target.value } : entity)); if (previous !== event.target.value) onModeChange(event.target.value, modes[previous] || "Cobros + Retiros"); }} /><select aria-label={`Tipo de ${wallet}`} value={modes[wallet] || "Cobros + Retiros"} onChange={(event) => onModeChange(wallet, event.target.value)}><option>Cobros + Retiros</option><option>Solo Cobros</option><option>Solo Depósito</option></select><button className="delete-button" title="Eliminar billetera" onClick={async () => { if (await confirmDelete(`¿Eliminar billetera "${wallet}"?`)) { onChange(wallets.filter((_, itemIndex) => itemIndex !== index)); if (onEntitiesChange) onEntitiesChange(walletEntities.filter((_, entityIndex) => entityIndex !== index)); } }}><Trash2 size={15} /></button></div>)}<button className="config-add" onClick={() => { onChange([...wallets, ""]); if (onEntitiesChange) onEntitiesChange([...walletEntities, { id: `wallet-${crypto.randomUUID()}`, name: "" }]); }}><Plus size={15} /> Agregar billetera</button></div>;
}

function AccountsConfig({ draft, boxes, updateAccounts }) {
  const [settingsTarget, setSettingsTarget] = useState(null);
  const availability = draft.accounts.availability || {};
  const walletSettings = draft.accounts.walletSettings || {};
  const updateWallets = (wallets) => updateAccounts({ wallets });
  const walletModes = draft.accounts.walletModes || {};
  const updateWalletSetting = (holder, wallet, patch) => updateAccounts({ walletSettings: { ...walletSettings, [holder]: { ...(walletSettings[holder] || {}), [wallet]: { ...(walletSettings[holder]?.[wallet] || { category: "Normal", boxId: null }), ...patch } } } });
  const renameHolder = (index, value) => {
    const previousHolder = draft.accounts.holders[index];
    const holders = [...draft.accounts.holders];
    holders[index] = value;
    const availability = { ...draft.accounts.availability };
    const walletSettings = { ...(draft.accounts.walletSettings || {}) };
    if (previousHolder !== value) {
      availability[value] = availability[previousHolder] || {};
      delete availability[previousHolder];
      walletSettings[value] = walletSettings[previousHolder] || {};
      delete walletSettings[previousHolder];
    }
    updateAccounts({ holders, availability, walletSettings });
  };
  const targetSetting = settingsTarget ? walletSettings[settingsTarget.holder]?.[settingsTarget.wallet] || { category: "Normal" } : null;
  const updateTargetSetting = (patch) => updateWalletSetting(settingsTarget.holder, settingsTarget.wallet, patch);
  return <>
    <div className="config-two-columns">
      <ConfigList title="Titulares" items={draft.accounts.holders} entities={draft.accounts.holderEntities} onEntitiesChange={(holderEntities) => updateAccounts({ holderEntities })} placeholder="Nombre del titular" sortable onChange={(holders) => updateAccounts({ holders })} onItemChange={renameHolder} />
      <WalletConfigList wallets={draft.accounts.wallets} walletEntities={draft.accounts.walletEntities} onEntitiesChange={(walletEntities) => updateAccounts({ walletEntities })} modes={walletModes} onChange={updateWallets} onModeChange={(wallet, mode) => updateAccounts({ walletModes: { ...walletModes, [wallet]: mode } })} />
    </div>
    <section className="config-card"><div className="config-list-head"><h3>Billeteras utilizables por titular</h3><span>Activá y configurá cada cuenta</span></div><div className="availability-table"><div className="availability-row availability-head" style={{ "--wallet-count": draft.accounts.wallets.length }}><b>Titular</b>{draft.accounts.wallets.map((wallet) => <span key={wallet}>{wallet}</span>)}</div>{draft.accounts.holders.map((holder, index) => <div className="availability-row" style={{ "--wallet-count": draft.accounts.wallets.length }} key={index}><b>{holder || "Sin nombre"}</b>{draft.accounts.wallets.map((wallet) => { const setting = walletSettings[holder]?.[wallet] || { category: "Normal" }; const enabled = availability[holder]?.[wallet] !== false; return <div className="account-config-cell" key={wallet}><label className="toggle-cell"><input type="checkbox" checked={enabled} onChange={() => { const nextAvailability = structuredClone(availability); nextAvailability[holder] = { ...(nextAvailability[holder] || {}), [wallet]: !enabled }; updateAccounts({ availability: nextAvailability }); }} /><span /></label><button type="button" className="account-settings-button" title={`Configurar ${holder} · ${wallet}`} onClick={() => setSettingsTarget({ holder, wallet })}><Settings2 size={14} /></button></div>; })}</div>)}</div></section>
    {settingsTarget && <div className="modal-backdrop" onClick={() => setSettingsTarget(null)}><div className="modal account-settings-modal" onClick={(event) => event.stopPropagation()}><button className="modal-close" onClick={() => setSettingsTarget(null)} title="Cerrar"><X size={18} /></button><div className="modal-icon"><Settings2 size={21} /></div><h2>{settingsTarget.holder} · {settingsTarget.wallet}</h2><p>Datos disponibles para copiar desde la caja.</p><div className="account-settings-fields"><label><span>Alias</span><input value={targetSetting.alias || ""} onChange={(event) => updateTargetSetting({ alias: event.target.value })} /></label><label><span>CUIL</span><input value={targetSetting.cuil || ""} onChange={(event) => updateTargetSetting({ cuil: event.target.value })} /></label><label><span>Contraseña</span><input value={targetSetting.password || ""} onChange={(event) => updateTargetSetting({ password: event.target.value })} /></label><label><span>Tipo de billetera</span><select value={targetSetting.category || "Normal"} onChange={(event) => updateTargetSetting({ category: event.target.value })}><option>Normal</option><option>Depósitos</option><option>Compartidas</option><option>Ahorro</option></select></label><label className="account-settings-note"><span>Nota</span><textarea rows="4" value={targetSetting.note || ""} onChange={(event) => updateTargetSetting({ note: event.target.value })} /></label></div><div className="modal-actions"><button className="close-button" onClick={() => setSettingsTarget(null)}>Listo <Check size={16} /></button></div></div></div>}
  </>;
}
function MonthlyGoalConfig({ draft, boxes, api, date, update }) {
  const [depositModalOpen, setDepositModalOpen] = useState(false);
  const [depositValues, setDepositValues] = useState({});
  const [platformsByBox, setPlatformsByBox] = useState({});
  const [loadingPlatforms, setLoadingPlatforms] = useState(false);
  const [csvModalOpen, setCsvModalOpen] = useState(false);
  const [csvModalTarget, setCsvModalTarget] = useState(null); // { boxId, platform }
  const [csvFormat, setCsvFormat] = useState("MultiPanel");
  const [csvFile, setCsvFile] = useState(null);
  const [csvProcessing, setCsvProcessing] = useState(false);
  const sourceMonthlyGoal = draft.monthlyGoal || { final: 0, achieved: 0, platformDeposits: {} };
  const monthKey = monthKeyFor(date);
  const monthlyGoal = monthlyGoalForDate(sourceMonthlyGoal, date);
  const updateMonth = (patch) => update({ monthlyGoal: { ...sourceMonthlyGoal, months: { ...(sourceMonthlyGoal.months || {}), [monthKey]: { ...monthlyGoal, ...patch } } } });
  const updateValue = (name, value) => updateMonth({ [name]: number(value) });
  
  const handleOpenDepositModal = async () => {
    const savedDeposits = monthlyGoal.platformDeposits || {};
    setDepositValues(savedDeposits);
    setLoadingPlatforms(true);
    setDepositModalOpen(true);
    
    // Load configurations from all boxes
    try {
      const boxPlatforms = {};
      for (const box of boxes) {
        const config = await api(`/api/configuracion?boxId=${box.id}`);
        const platforms = enabledPlatformsFor(config);
        boxPlatforms[box.id] = { title: box.title, platforms, color: box.color };
      }
      setPlatformsByBox(boxPlatforms);
    } catch (error) {
      console.error("Error loading platforms:", error);
      setPlatformsByBox({});
    } finally {
      setLoadingPlatforms(false);
    }
  };
  
  const handleDepositModalSave = () => {
    const total = Object.values(depositValues).reduce((sum, val) => sum + number(val), 0);
    updateMonth({ achieved: total, platformDeposits: depositValues });
    setDepositModalOpen(false);
    setDepositValues({});
    setPlatformsByBox({});
  };
  
  const handleOpenCsvModal = (boxId, platform) => {
    setCsvModalTarget({ boxId, platform });
    setCsvFile(null);
    setCsvFormat("MultiPanel");
    setCsvModalOpen(true);
  };
  
  const handleCsvFileChange = (event) => {
    const file = event.target.files?.[0];
    if (file) {
      setCsvFile(file);
    }
  };
  
  const parseMultiPanelCSV = async (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const csv = e.target.result;
          const lines = csv.split('\n').filter(line => line.trim());
          let total = 0;
          
          for (const line of lines) {
            const parts = line.split(',');
            if (parts.length >= 3) {
              const amount = parseFloat(parts[2].trim());
              if (!isNaN(amount) && amount > 0) {
                total += amount;
              }
            }
          }
          
          resolve(total);
        } catch (error) {
          reject(new Error("Error al procesar el CSV: " + error.message));
        }
      };
      reader.onerror = () => reject(new Error("Error al leer el archivo"));
      reader.readAsText(file);
    });
  };
  
  const handleCsvImport = async () => {
    if (!csvFile || !csvModalTarget) return;
    
    setCsvProcessing(true);
    try {
      let total = 0;
      
      if (csvFormat === "MultiPanel") {
        total = await parseMultiPanelCSV(csvFile);
      }
      
      setDepositValues({
        ...depositValues,
        [`${csvModalTarget.boxId}-${csvModalTarget.platform}`]: total
      });
      
      setCsvModalOpen(false);
      setCsvModalTarget(null);
      setCsvFile(null);
    } catch (error) {
      alert("Error: " + error.message);
    } finally {
      setCsvProcessing(false);
    }
  };
  
  const boxColorStyle = (color) => {
    const colors = {
      teal: { "--box-accent": "#72d7ca", "--box-soft": "rgba(114, 215, 202, 0.08)", "--box-glow": "rgba(114, 215, 202, 0.3)", "--box-line": "rgba(114, 215, 202, 0.2)" },
      blue: { "--box-accent": "#5aa8d8", "--box-soft": "rgba(90, 168, 216, 0.08)", "--box-glow": "rgba(90, 168, 216, 0.3)", "--box-line": "rgba(90, 168, 216, 0.2)" },
      green: { "--box-accent": "#83d5a2", "--box-soft": "rgba(131, 213, 162, 0.08)", "--box-glow": "rgba(131, 213, 162, 0.3)", "--box-line": "rgba(131, 213, 162, 0.2)" },
      orange: { "--box-accent": "#f5ad69", "--box-soft": "rgba(245, 173, 105, 0.08)", "--box-glow": "rgba(245, 173, 105, 0.3)", "--box-line": "rgba(245, 173, 105, 0.2)" },
      pink: { "--box-accent": "#f597b1", "--box-soft": "rgba(245, 151, 177, 0.08)", "--box-glow": "rgba(245, 151, 177, 0.3)", "--box-line": "rgba(245, 151, 177, 0.2)" },
      red: { "--box-accent": "#ef8888", "--box-soft": "rgba(239, 136, 136, 0.08)", "--box-glow": "rgba(239, 136, 136, 0.3)", "--box-line": "rgba(239, 136, 136, 0.2)" },
      yellow: { "--box-accent": "#f5d547", "--box-soft": "rgba(245, 213, 71, 0.08)", "--box-glow": "rgba(245, 213, 71, 0.3)", "--box-line": "rgba(245, 213, 71, 0.2)" },
      violet: { "--box-accent": "#b7a3e5", "--box-soft": "rgba(183, 163, 229, 0.08)", "--box-glow": "rgba(183, 163, 229, 0.3)", "--box-line": "rgba(183, 163, 229, 0.2)" },
      slate: { "--box-accent": "#8b92a9", "--box-soft": "rgba(139, 146, 169, 0.08)", "--box-glow": "rgba(139, 146, 169, 0.3)", "--box-line": "rgba(139, 146, 169, 0.2)" },
    };
    return colors[color] || colors.teal;
  };
  
  return <>
    <section className="config-card monthly-goal-card">
      <div className="config-list-head"><h3>Obj. de Depósitos General</h3><span>Se actualiza manualmente</span></div>
      <div className="monthly-goal-fields">
        <label><span>Objetivo final</span><AmountInput value={monthlyGoal.final} onChange={(value) => updateValue("final", value)} /></label>
        <label><span>Objetivo alcanzado</span><div style={{ display: "flex", gap: "8px", alignItems: "center" }}><AmountInput value={monthlyGoal.achieved} onChange={(value) => updateValue("achieved", value)} /><button type="button" className="icon-button" title="Importar depósitos por plataforma" onClick={handleOpenDepositModal} style={{ width: "32px", height: "32px", minWidth: "32px", padding: "4px" }}><Download size={16} /></button></div></label>
      </div>
    </section>
    
    {depositModalOpen && <div className="modal-backdrop" onClick={() => setDepositModalOpen(false)}>
      <div className="modal" onClick={(event) => event.stopPropagation()} style={{ maxHeight: "85vh", maxWidth: "700px", overflowY: "auto", overflowX: "hidden", padding: "24px" }}>
        <button className="modal-close" onClick={() => setDepositModalOpen(false)} title="Cerrar"><X size={18} /></button>
        <div className="modal-icon"><Download size={21} /></div>
        <h2>Importar depósitos por plataforma</h2>
        <p>Ingresá los depósitos de cada plataforma en cada caja</p>
        {loadingPlatforms ? (
          <div style={{ padding: "60px 40px", textAlign: "center", color: "var(--text-muted)" }}>Cargando plataformas...</div>
        ) : Object.keys(platformsByBox).length === 0 ? (
          <div style={{ padding: "60px 40px", textAlign: "center", color: "var(--text-muted)" }}>No hay plataformas configuradas</div>
        ) : (
          <div style={{ padding: "20px 0", display: "flex", flexDirection: "column", gap: "24px" }}>
            {Object.entries(platformsByBox).map(([boxId, { title, platforms, color }]) => (
              platforms.length > 0 && (
                <div key={boxId} style={{ ...boxColorStyle(color), borderBottom: `1px solid var(--box-line)`, paddingBottom: "20px" }}>
                  <h3 style={{ fontSize: "0.95em", fontWeight: "700", marginBottom: "14px", color: "var(--box-accent)", textTransform: "uppercase", letterSpacing: "0.5px" }}>{title}</h3>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                    {platforms.map((platform) => (
                      <div key={`${boxId}-${platform}`} style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                        <label style={{ fontSize: "0.8em", fontWeight: "600", color: "var(--text-secondary)" }}>Depósitos {platform}</label>
                        <div style={{ display: "flex", gap: "6px", alignItems: "stretch" }}>
                          <div style={{ display: "flex", alignItems: "center", backgroundColor: "#202a2c", border: `1px solid var(--box-line)`, borderRadius: "5px", paddingLeft: "8px", color: "#758689", fontFamily: "DM Mono", fontSize: "11px", flex: 1 }}>
                            <span>$</span>
                            <input 
                              type="text" 
                              inputMode="decimal"
                              placeholder="0,00"
                              value={formatNumberInput(depositValues[`${boxId}-${platform}`] || 0)} 
                              onChange={(event) => {
                                const rawValue = event.target.value.replace(/\./g, '').replace(',', '.');
                                setDepositValues({ ...depositValues, [`${boxId}-${platform}`]: rawValue || "" });
                              }}
                              style={{ 
                                border: "0",
                                background: "transparent",
                                width: "100%",
                                padding: "8px 8px 8px 4px",
                                textAlign: "right",
                                fontFamily: "DM Mono",
                                fontSize: "11px",
                                color: "inherit"
                              }}
                            />
                          </div>
                          <button type="button" onClick={() => handleOpenCsvModal(boxId, platform)} style={{ padding: "8px 10px", backgroundColor: "var(--box-line)", border: "1px solid var(--box-line)", borderRadius: "5px", color: "var(--text-secondary)", cursor: "pointer", fontSize: "0.8em", fontWeight: "600", whiteSpace: "nowrap" }}>CSV</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            ))}
          </div>
        )}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", alignItems: "center", marginTop: "20px", paddingTop: "16px", borderTop: "1px solid var(--line)" }}>
          <small style={{ color: "var(--text-muted)", fontSize: "0.75em" }}>Suma total:</small>
          <div style={{ fontSize: "0.9em", fontWeight: "600", color: "var(--box-accent)", fontFamily: "DM Mono" }}>${formatNumberInput(Object.values(depositValues).reduce((sum, val) => sum + number(val), 0))}</div>
        </div>
        <div className="modal-actions" style={{ marginTop: "16px", display: "flex", gap: "10px", justifyContent: "flex-end" }}>
          <button onClick={() => setDepositModalOpen(false)} style={{ padding: "8px 16px", backgroundColor: "transparent", border: "1px solid var(--line)", borderRadius: "5px", color: "var(--text-secondary)", cursor: "pointer", fontWeight: "500", transition: "all 0.2s" }}>Cancelar</button>
          <button className="close-button" onClick={handleDepositModalSave} disabled={loadingPlatforms}>Listo <Check size={16} /></button>
        </div>
      </div>
    </div>}
    
    {csvModalOpen && <div className="modal-backdrop" onClick={() => setCsvModalOpen(false)}>
      <div className="modal" onClick={(event) => event.stopPropagation()} style={{ maxHeight: "85vh", maxWidth: "500px", overflowY: "auto", overflowX: "hidden", padding: "24px" }}>
        <button className="modal-close" onClick={() => setCsvModalOpen(false)} title="Cerrar"><X size={18} /></button>
        <div className="modal-icon"><Upload size={21} /></div>
        <h2>Importar desde CSV</h2>
        <p>Selecciona el formato y sube el archivo CSV</p>
        
        <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginTop: "20px" }}>
          <div>
            <label style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <span style={{ fontSize: "0.85em", fontWeight: "600", color: "var(--text-secondary)" }}>Formato</span>
              <select value={csvFormat} onChange={(e) => setCsvFormat(e.target.value)} style={{ padding: "8px 12px", border: "1px solid var(--line)", borderRadius: "5px", backgroundColor: "#202a2c", color: "var(--text-primary)", fontFamily: "inherit" }}>
                <option value="MultiPanel">MultiPanel</option>
              </select>
            </label>
          </div>
          
          <div>
            <label style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <span style={{ fontSize: "0.85em", fontWeight: "600", color: "var(--text-secondary)" }}>Archivo CSV</span>
              <input 
                type="file" 
                accept=".csv"
                onChange={handleCsvFileChange}
                style={{ padding: "8px 12px", border: "1px solid var(--line)", borderRadius: "5px", backgroundColor: "#202a2c", color: "var(--text-secondary)", cursor: "pointer" }}
              />
              {csvFile && <small style={{ color: "var(--box-accent)", fontWeight: "600" }}>✓ {csvFile.name}</small>}
            </label>
          </div>
          
          <small style={{ color: "var(--text-muted)", lineHeight: "1.4" }}>El sistema sumará solo los valores positivos de la tercera columna del CSV, ignorando los negativos.</small>
        </div>
        
        <div className="modal-actions" style={{ marginTop: "24px", display: "flex", gap: "10px", justifyContent: "flex-end" }}>
          <button onClick={() => setCsvModalOpen(false)} style={{ padding: "8px 16px", backgroundColor: "transparent", border: "1px solid var(--line)", borderRadius: "5px", color: "var(--text-secondary)", cursor: "pointer", fontWeight: "500" }}>Cancelar</button>
          <button className="close-button" onClick={handleCsvImport} disabled={!csvFile || csvProcessing}>Importar {csvProcessing && "..."}</button>
        </div>
      </div>
    </div>}
  </>;
}

function getProgressAccentState(percent, fallback) {
  if (percent >= 85) {
    return { accent: "#e8d477", glow: "rgba(232, 212, 119, 0.58)", line: "rgba(232, 212, 119, 0.46)" };
  }
  return { accent: fallback.accent, glow: fallback.glow, line: fallback.line };
}

function getBonusProgressAccentState(percent, fallback) {
  if (percent >= 100) {
    return { accent: "#ff5a5a", glow: "rgba(255, 90, 90, 0.58)", line: "rgba(255, 90, 90, 0.46)" };
  }
  if (percent >= 85) {
    return { accent: "#ff9f43", glow: "rgba(255, 159, 67, 0.62)", line: "rgba(255, 159, 67, 0.5)" };
  }
  return { accent: fallback.accent, glow: fallback.glow, line: fallback.line };
}

function getSavingsProgressAccentState(percent, fallback) {
  if (percent >= 100) {
    return { accent: "#70d88b", glow: "rgba(112, 216, 139, 0.58)", line: "rgba(112, 216, 139, 0.46)" };
  }
  if (percent >= 85) {
    return { accent: "#c8d65a", glow: "rgba(200, 214, 90, 0.62)", line: "rgba(200, 214, 90, 0.5)" };
  }
  return { accent: fallback.accent, glow: fallback.glow, line: fallback.line };
}

function elapsedMonthPercentage(dateValue) {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return 0;
  const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  return ((date.getDate() - 1) / daysInMonth) * 100;
}

function cumulativeShiftPercentage(percentages, shift) {
  const shifts = ["Noche", "Mañana", "Tarde"];
  const shiftIndex = shifts.indexOf(shift);
  if (shiftIndex < 0) return 100;
  return shifts.slice(0, shiftIndex + 1).reduce((sum, currentShift) => sum + number(percentages?.[currentShift]), 0);
}

function MonthlyGoalProgress({ config, boxColor, date }) {
  const goal = monthlyGoalForDate(config.monthlyGoal, date);
  const finalGoal = Math.max(0, number(goal.final));
  const achieved = Math.max(0, number(goal.achieved));
  const percentage = finalGoal > 0 ? (achieved / finalGoal) * 100 : 0;
  const targetPercentage = elapsedMonthPercentage(date);
  const targetAmount = finalGoal * (targetPercentage / 100);
  const colors = boxColorStyle(boxColor);
  const state = getProgressAccentState(percentage, { accent: colors["--box-accent"], glow: colors["--box-glow"], line: colors["--box-line"] });
  return <section className="monthly-goal-progress" aria-label="Progreso del objetivo de depósitos general" style={{ "--goal-accent": state.accent, "--goal-soft": colors["--box-soft"], "--goal-glow": state.glow, "--goal-line": state.line }}>
    <div className="goal-bar-header"><span>Obj. de Depósitos General</span></div>
    <div className="goal-bar-body">
      <div className="monthly-goal-track-wrap"><div className="monthly-goal-track"><span style={{ width: `${Math.min(100, percentage)}%` }} /></div><i className="monthly-goal-target-marker" style={{ left: `${targetPercentage}%` }} tabIndex={0} aria-label={`${Math.round(targetPercentage)}% - ${money(targetAmount)}`}><span className="monthly-goal-target-tooltip">{Math.round(targetPercentage)}% - {money(targetAmount)}</span></i></div>
      <div className="monthly-goal-values"><strong>{Math.round(percentage)}%</strong><span className="monthly-goal-achieved">{money(achieved)}</span><i>/</i><span className="monthly-goal-final">{money(finalGoal)}</span></div>
    </div>
  </section>;
}

function BonusMonthlyGoalConfig({ draft, update }) {
  const bonusGoal = draft.bonusGoal || { total: 0, percentages: { Noche: 33, Mañana: 33, Tarde: 34 } };
  const updateValue = (name, value) => update({ bonusGoal: { ...bonusGoal, [name]: number(value) } });
  const updatePercent = (shift, value) => update({ bonusGoal: { ...bonusGoal, percentages: { ...(bonusGoal.percentages || {}), [shift]: Math.max(0, Math.min(100, number(value))) } } });
  return <section className="config-card monthly-goal-card bonus-goal-card">
    <div className="config-list-head"><h3>Obj. Bonos Mes</h3><span>Se calcula solo con bonos netos</span></div>
    <div className="monthly-goal-fields bonus-goal-fields">
      <label><span>Objetivo total</span><AmountInput value={bonusGoal.total} onChange={(value) => updateValue("total", value)} /></label>
      <div className="bonus-goal-percentages">
        {Object.keys(bonusGoal.percentages || {}).map((shift) => (
          <label key={shift}><span>{shift}</span><input type="number" value={bonusGoal.percentages?.[shift] ?? 0} min="0" max="100" onChange={(event) => updatePercent(shift, event.target.value)} /></label>
        ))}
      </div>
    </div>
  </section>;
}

function SavingsGoalConfig({ draft, update }) {
  const savingsGoal = draft.savingsGoal || { total: 0, shifts: { Noche: 0, Mañana: 0, Tarde: 0 } };
  const updateValue = (name, value) => update({ savingsGoal: { ...savingsGoal, [name]: number(value) } });
  const updateShift = (shift, value) => update({ savingsGoal: { ...savingsGoal, shifts: { ...(savingsGoal.shifts || {}), [shift]: Math.max(0, number(value)) } } });
  return <section className="config-card monthly-goal-card bonus-goal-card savings-goal-card">
    <div className="config-list-head"><h3>Objetivo de Ahorro</h3><span>Se calcula con Total Ahorro</span></div>
    <div className="monthly-goal-fields bonus-goal-fields">
      <label><span>Objetivo total</span><AmountInput value={savingsGoal.total} onChange={(value) => updateValue("total", value)} /></label>
      <div className="bonus-goal-percentages">
        {Object.keys(savingsGoal.shifts || {}).map((shift) => (
          <label key={shift}><span>{shift}</span><AmountInput value={savingsGoal.shifts?.[shift] ?? 0} onChange={(value) => updateShift(shift, value)} /></label>
        ))}
      </div>
    </div>
  </section>;
}

function BonusMonthlyGoalProgress({ config, caja, history, boxColor }) {
  if (!config || !caja) return null;
  const goal = config.bonusGoal || { total: 0, percentages: { Noche: 33, Mañana: 33, Tarde: 34 } };
  const monthItems = [...(Array.isArray(history) ? history : []), caja].filter((item, index, list) => item && list.findIndex((candidate) => String(candidate.id) === String(item.id)) === index);
  const currentDate = new Date(caja.date);
  const sameDateItems = monthItems.filter((item) => {
    const itemDate = new Date(item.date);
    return itemDate.getFullYear() === currentDate.getFullYear() && itemDate.getMonth() === currentDate.getMonth() && itemDate.getDate() === currentDate.getDate();
  });
  const monthItemsInMonth = monthItems.filter((item) => {
    const itemDate = new Date(item.date);
    return itemDate.getFullYear() === currentDate.getFullYear() && itemDate.getMonth() === currentDate.getMonth();
  });
  const monthBonusNet = (row) => (row.bonuses || []).reduce((sum, bonus) => sum + number(bonus.granted) - number(bonus.recovered), 0);
  const dayBonusNet = sameDateItems.reduce((sum, item) => sum + monthBonusNet(item), 0);
  const shiftBonusNet = (shift) => (caja.bonuses || []).reduce((sum, bonus) => {
    const hour = new Date(bonus.createdAt).getHours();
    const bonusShift = hour >= 0 && hour < 8 ? "Noche" : hour < 16 ? "Mañana" : "Tarde";
    return sum + (bonusShift === shift ? number(bonus.granted) - number(bonus.recovered) : 0);
  }, 0);
  const totalTarget = Math.max(0, number(goal.total));
  const currentMonth = new Date(caja.date);
  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const currentDay = currentMonth.getDate();
  const monthTarget = totalTarget;
  const monthAchieved = monthItemsInMonth.reduce((sum, item) => sum + monthBonusNet(item), 0);
  const remainingGoal = Math.max(0, monthTarget - monthAchieved);
  const remainingDays = Math.max(1, daysInMonth - currentDay + 1);
  const dailyTarget = remainingGoal > 0 ? remainingGoal / remainingDays : 0;
  const currentShift = caja.shift;
  const currentPercent = number(goal.percentages?.[currentShift] || 0);
  const currentShiftTarget = dailyTarget * (currentPercent / 100);
  const currentShiftAchieved = shiftBonusNet(currentShift);
  const colors = boxColorStyle(boxColor);
  const renderBar = (label, value, target, percent, targetMarkerPercentage = null) => {
    const state = getBonusProgressAccentState(percent, { accent: colors["--box-accent"], glow: colors["--box-glow"], line: colors["--box-line"] });
    const targetMarkerAmount = target * (targetMarkerPercentage / 100);
    const targetMarkerText = targetMarkerPercentage === null
      ? ""
      : `${Math.round(targetMarkerPercentage)}% - ${money(targetMarkerAmount)}`;
    return (
      <div className="bonus-goal-row" style={{ "--goal-accent": state.accent, "--goal-soft": colors["--box-soft"], "--goal-glow": state.glow, "--goal-line": state.line, "--goal-row-bg": `color-mix(in srgb, ${colors["--box-soft"]} 82%, rgba(15, 17, 22, 0.82))`, "--goal-row-border": state.line }}>
        <div className="bonus-goal-label"><span>{label}</span></div>
        <div className="bonus-goal-main">
          <div className="monthly-goal-track-wrap"><div className="monthly-goal-track"><span style={{ width: `${Math.min(100, percent)}%` }} /></div>{targetMarkerPercentage !== null && targetMarkerPercentage < 100 && <i className="monthly-goal-target-marker" style={{ left: `${targetMarkerPercentage}%` }} tabIndex={0} aria-label={targetMarkerText}><span className="monthly-goal-target-tooltip">{targetMarkerText}</span></i>}</div>
          <div className="monthly-goal-values"><strong>{Math.round(percent)}%</strong><span className="monthly-goal-achieved">{money(value)}</span><i>/</i><span className="monthly-goal-final">{money(target)}</span></div>
        </div>
      </div>
    );
  };
  return <div className="bonus-goal-panel" aria-label="Progreso del objetivo de bonos" style={{ "--bonus-soft": colors["--box-soft"], "--bonus-line": colors["--box-line"], "--bonus-glow": colors["--box-glow"], "--bonus-accent": colors["--box-accent"] }}>
    {renderBar("Obj. Bonos Mes", monthAchieved, monthTarget, monthTarget > 0 ? (monthAchieved / monthTarget) * 100 : 0, elapsedMonthPercentage(caja.date))}
    <div className="bonus-goal-lower-row">
      {renderBar("Obj. Bonos Día", dayBonusNet, dailyTarget, dailyTarget > 0 ? (dayBonusNet / dailyTarget) * 100 : 0, cumulativeShiftPercentage(goal.percentages, currentShift))}
      {renderBar(`Obj. Turno · ${currentShift.toUpperCase()}`, currentShiftAchieved, currentShiftTarget, currentShiftTarget > 0 ? (currentShiftAchieved / currentShiftTarget) * 100 : 0)}
    </div>
  </div>;
}

function SavingsMonthlyGoalProgress({ config, caja, history, boxHistories, activeBoxId, boxColor }) {
  if (!config || !caja) return null;
  const goal = config.savingsGoal || { total: 0, shifts: { Noche: 0, Mañana: 0, Tarde: 0 } };
  const allBoxItems = Object.entries(boxHistories || {}).flatMap(([boxId, items]) => (Array.isArray(items) ? items : []).map((item) => ({ ...item, _boxId: boxId })));
  const monthItems = [...allBoxItems, ...(Array.isArray(history) ? history : []).map((item) => ({ ...item, _boxId: activeBoxId })), { ...caja, _boxId: activeBoxId }].filter((item, index, list) => item && list.findIndex((candidate) => String(candidate._boxId) === String(item._boxId) && String(candidate.id) === String(item.id)) === index);
  const currentDate = new Date(caja.date);
  const activeBoxItems = monthItems.filter((item) => String(item._boxId) === String(activeBoxId));
  const sameDateItems = activeBoxItems.filter((item) => {
    const itemDate = new Date(item.date);
    return itemDate.getFullYear() === currentDate.getFullYear() && itemDate.getMonth() === currentDate.getMonth() && itemDate.getDate() === currentDate.getDate();
  });
  const monthItemsInMonth = monthItems.filter((item) => {
    const itemDate = new Date(item.date);
    return itemDate.getFullYear() === currentDate.getFullYear() && itemDate.getMonth() === currentDate.getMonth();
  });
  const savingsTotal = (row) => (row.savingsMovements || []).reduce((sum, movement) => sum + number(movement.amount), 0);
  const monthTarget = Math.max(0, number(goal.total));
  const dayTarget = ["Noche", "Mañana", "Tarde"].reduce((sum, shift) => sum + Math.max(0, number(goal.shifts?.[shift])), 0);
  const currentShift = caja.shift;
  const shiftTarget = Math.max(0, number(goal.shifts?.[currentShift]));
  const shiftOrder = ["Noche", "Mañana", "Tarde"];
  const currentShiftIndex = shiftOrder.indexOf(currentShift);
  const dayTargetMarkerAmount = shiftOrder.slice(0, currentShiftIndex + 1).reduce((sum, shift) => sum + Math.max(0, number(goal.shifts?.[shift])), 0);
  const dayTargetMarkerPercentage = dayTarget > 0 ? (dayTargetMarkerAmount / dayTarget) * 100 : null;
  const monthAchieved = monthItemsInMonth.reduce((sum, item) => sum + savingsTotal(item), 0);
  const dayAchieved = sameDateItems.reduce((sum, item) => sum + savingsTotal(item), 0);
  const shiftAchieved = savingsTotal(caja);
  const colors = boxColorStyle(boxColor);
  const renderBar = (label, value, target, targetMarkerPercentage = null) => {
    const percent = target > 0 ? (value / target) * 100 : 0;
    const state = getSavingsProgressAccentState(percent, { accent: colors["--box-accent"], glow: colors["--box-glow"], line: colors["--box-line"] });
    const targetMarkerAmount = target * (targetMarkerPercentage / 100);
    const targetMarkerText = targetMarkerPercentage === null ? "" : `${Math.round(targetMarkerPercentage)}% - ${money(targetMarkerAmount)}`;
    return <div className="bonus-goal-row" style={{ "--goal-accent": state.accent, "--goal-soft": colors["--box-soft"], "--goal-glow": state.glow, "--goal-line": state.line, "--goal-row-bg": `color-mix(in srgb, ${colors["--box-soft"]} 82%, rgba(15, 17, 22, 0.82))`, "--goal-row-border": state.line }}>
      <div className="bonus-goal-label"><span>{label}</span></div>
      <div className="bonus-goal-main"><div className="monthly-goal-track-wrap"><div className="monthly-goal-track"><span style={{ width: `${Math.min(100, percent)}%` }} /></div>{targetMarkerPercentage !== null && targetMarkerPercentage < 100 && <i className="monthly-goal-target-marker" style={{ left: `${targetMarkerPercentage}%` }} tabIndex={0} aria-label={targetMarkerText}><span className="monthly-goal-target-tooltip">{targetMarkerText}</span></i>}</div><div className="monthly-goal-values"><strong>{Math.round(percent)}%</strong><span className="monthly-goal-achieved">{money(value)}</span><i>/</i><span className="monthly-goal-final">{money(target)}</span></div></div>
    </div>;
  };
  return <div className="bonus-goal-panel savings-goal-panel" aria-label="Progreso del objetivo de ahorro" style={{ "--bonus-soft": colors["--box-soft"], "--bonus-line": colors["--box-line"], "--bonus-glow": colors["--box-glow"], "--bonus-accent": colors["--box-accent"] }}>
    {renderBar("Obj. Ahorro Mes", monthAchieved, monthTarget, elapsedMonthPercentage(caja.date))}
    <div className="bonus-goal-lower-row">
      {renderBar("Obj. Ahorro Día", dayAchieved, dayTarget, dayTargetMarkerPercentage)}
      {renderBar(`Obj. Ahorro · ${currentShift.toUpperCase()}`, shiftAchieved, shiftTarget)}
    </div>
  </div>;
}

function AdvancedGoalsCompactSummary({ config, caja, history, boxColor }) {
  const savingsGoal = config.savingsGoal || { shifts: { Noche: 0, Mañana: 0, Tarde: 0 } };
  const bonusGoal = config.bonusGoal || { total: 0, percentages: { Noche: 33, Mañana: 33, Tarde: 34 } };
  const currentDate = new Date(caja.date);
  const monthItems = [...(Array.isArray(history) ? history : []), caja].filter((item, index, list) => item && list.findIndex((candidate) => String(candidate.id) === String(item.id)) === index);
  const monthItemsInMonth = monthItems.filter((item) => {
    const itemDate = new Date(item.date);
    return itemDate.getFullYear() === currentDate.getFullYear() && itemDate.getMonth() === currentDate.getMonth();
  });
  const savingsTotal = (row) => (row.savingsMovements || []).reduce((sum, movement) => sum + number(movement.amount), 0);
  const bonusTotal = (row) => (row.bonuses || []).reduce((sum, bonus) => sum + number(bonus.granted) - number(bonus.recovered), 0);
  const currentShift = caja.shift;
  const savingsTarget = Math.max(0, number(savingsGoal.shifts?.[currentShift]));
  const savingsAchieved = savingsTotal(caja);
  const bonusTargetTotal = Math.max(0, number(bonusGoal.total));
  const bonusAchievedMonth = monthItemsInMonth.reduce((sum, item) => sum + bonusTotal(item), 0);
  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const remainingDays = Math.max(1, daysInMonth - currentDate.getDate() + 1);
  const bonusDailyTarget = Math.max(0, bonusTargetTotal - bonusAchievedMonth) / remainingDays;
  const bonusTarget = bonusDailyTarget * (number(bonusGoal.percentages?.[currentShift]) / 100);
  const bonusAchieved = bonusTotal(caja);
  const colors = boxColorStyle(boxColor);
  const metric = (label, achieved, target, state) => {
    const percent = target > 0 ? (achieved / target) * 100 : 0;
    return <div className="goals-compact-metric" style={{ "--compact-accent": state(percent, { accent: colors["--box-accent"], glow: colors["--box-glow"], line: colors["--box-line"] }).accent }}>
      <span>{label}</span><strong>{Math.round(percent)}%</strong><i><b style={{ width: `${Math.min(100, percent)}%` }} /></i><small>{money(achieved)} / {money(target)}</small>
    </div>;
  };
  return <div className="goals-compact-summary" aria-label={`Objetivos del turno ${currentShift}`}>
    {metric("Ahorro turno", savingsAchieved, savingsTarget, getSavingsProgressAccentState)}
    {metric("Bono turno", bonusAchieved, bonusTarget, getBonusProgressAccentState)}
  </div>;
}

function BonusConfig({ draft, setDraft }) {
  const types = draft.bonusTypes || [];
  const conditions = draft.bonusConditions || [];
  const dragIndexRef = React.useRef(null);
  useEffect(() => {
    const rows = [...document.querySelectorAll(".config-two-columns > .config-card:first-child .config-list-row")];
    rows.forEach((row, index) => {
      row.draggable = true;
      row.classList.add("sortable");
      row.ondragstart = () => { dragIndexRef.current = index; };
      row.ondragover = (event) => event.preventDefault();
      row.ondrop = () => {
        const sourceIndex = dragIndexRef.current;
        if (sourceIndex === null || sourceIndex === index) return;
        setDraft((current) => {
          const next = [...(current.bonusTypes || [])];
          const [moved] = next.splice(sourceIndex, 1);
          next.splice(index, 0, moved);
          return { ...current, bonusTypes: next };
        });
        dragIndexRef.current = null;
      };
      row.ondragend = () => { dragIndexRef.current = null; };
    });
    return () => rows.forEach((row) => {
      row.ondragstart = null;
      row.ondragover = null;
      row.ondrop = null;
      row.ondragend = null;
    });
  }, [types.length, setDraft]);
  return <div className="config-two-columns"><section className="config-card"><div className="config-list-head"><h3>Tipos de bonos</h3><span>{types.length} elementos</span></div>{types.map((type, index) => <div className="config-list-row" key={type.id}><input value={type.name} placeholder="Nombre del tipo" onChange={(event) => setDraft((current) => ({ ...current, bonusTypes: (current.bonusTypes || []).map((item, itemIndex) => itemIndex === index ? { ...item, name: event.target.value } : item) }))} /><input className="bonus-type-count" type="number" min="1" max="20" value={type.percentageCount || 1} title="Cantidad de porcentajes" onChange={(event) => setDraft((current) => ({ ...current, bonusTypes: (current.bonusTypes || []).map((item, itemIndex) => itemIndex === index ? { ...item, percentageCount: Math.max(1, Math.min(20, Number(event.target.value) || 1)) } : item) }))} /><button className="delete-button" type="button" title="Eliminar tipo" onClick={() => setDraft((current) => ({ ...current, bonusTypes: (current.bonusTypes || []).filter((_, itemIndex) => itemIndex !== index) }))}><Trash2 size={15} /></button></div>)}<button className="config-add" type="button" onClick={() => setDraft((current) => ({ ...current, bonusTypes: [...(current.bonusTypes || []), { id: `bonus-type-${crypto.randomUUID()}`, name: "", percentageCount: 1 }] }))}><Plus size={15} /> Agregar tipo</button></section><section className="config-card"><div className="config-list-head"><h3>Condiciones de bono</h3><span>{conditions.length} elementos</span></div>{conditions.map((condition, index) => <div className="config-list-row bonus-condition-config-row" key={condition.id}><input value={condition.label} placeholder="Etiqueta de condición" onChange={(event) => setDraft((current) => ({ ...current, bonusConditions: (current.bonusConditions || []).map((item, itemIndex) => itemIndex === index ? { ...item, label: event.target.value } : item) }))} /><label className="bonus-platform-toggle" title="Permitir asignar una plataforma a los porcentajes"><input type="checkbox" checked={condition.allowPlatform === true} onChange={(event) => setDraft((current) => ({ ...current, bonusConditions: (current.bonusConditions || []).map((item, itemIndex) => itemIndex === index ? { ...item, allowPlatform: event.target.checked } : item) }))} /><span /> Plataforma</label><button className="delete-button" type="button" title="Eliminar condición" onClick={() => setDraft((current) => ({ ...current, bonusConditions: (current.bonusConditions || []).filter((_, itemIndex) => itemIndex !== index) }))}><Trash2 size={15} /></button></div>)}<button className="config-add" type="button" onClick={() => setDraft((current) => ({ ...current, bonusConditions: [...(current.bonusConditions || []), { id: `bonus-condition-${crypto.randomUUID()}`, label: "", allowPlatform: false }] }))}><Plus size={15} /> Agregar condición</button></section></div>;
}

function BoxBackgroundConfig({ draft, setDraft, configBoxId, api, onNotify }) {
  const [saving, setSaving] = useState(false);
  const imagePath = draft.branding?.backgroundImagePath || "";
  const imageUrl = imagePath ? `${import.meta.env.VITE_API_URL || ""}/api/cajas/${configBoxId}/imagen-fondo?path=${encodeURIComponent(imagePath)}` : "";
  const upload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.type !== "image/png") { onNotify?.("La imagen de fondo debe ser un archivo PNG."); return; }
    setSaving(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || ""}/api/cajas/${configBoxId}/imagen-fondo`, { method: "POST", headers: { "Content-Type": "image/png", "X-Updated-At": draft.updatedAt || "" }, body: file });
      const result = await response.json();
      if (!response.ok || result.error) throw new Error(result.message || result.error || "No se pudo subir la imagen de fondo");
      setDraft((current) => ({ ...current, updatedAt: result.updatedAt, branding: { ...(current.branding || {}), backgroundImagePath: result.path } }));
      onNotify?.("Imagen de fondo guardada.");
    } catch (error) {
      onNotify?.(error.message);
    } finally {
      setSaving(false);
    }
  };
  const remove = async () => {
    setSaving(true);
    try {
      const result = await api(`/api/cajas/${configBoxId}/imagen-fondo`, { method: "DELETE", body: JSON.stringify({ updatedAt: draft.updatedAt }) });
      setDraft((current) => ({ ...current, updatedAt: result.updatedAt, branding: { ...(current.branding || {}), backgroundImagePath: "" } }));
      onNotify?.("Imagen de fondo eliminada.");
    } catch (error) {
      onNotify?.(error.message);
    } finally {
      setSaving(false);
    }
  };
  return <section className="config-card box-background-config"><div className="config-list-head"><h3>Fondo de la captura</h3><span>PNG transparente · opacidad 15%</span></div><div className="box-background-content">{imageUrl ? <img src={imageUrl} alt="Vista previa del fondo de la captura" /> : <div className="box-background-empty">Sin imagen configurada</div>}<div className="box-background-actions"><label className="config-add"><Upload size={15} /> {imagePath ? "Reemplazar imagen" : "Subir imagen PNG"}<input type="file" accept="image/png" onChange={upload} disabled={saving} /></label>{imagePath && <button type="button" className="danger-button" onClick={remove} disabled={saving}><Trash2 size={15} /> Quitar fondo</button>}</div></div></section>;
}

function ConfigurationPage({ config, boxes, activeBoxId, cajaDate, onSave, onBack, onBoxesChanged, onNotify, api, embedded = false }) {
  const [tab, setTab] = useState("accounts");
  const [configBoxId, setConfigBoxId] = useState(activeBoxId);
  const [draft, setDraft] = useState(structuredClone(config));
  const [saving, setSaving] = useState(false);
  const [loadingConfig, setLoadingConfig] = useState(false);
  const skipAutoSave = React.useRef(true);
  const onSaveRef = React.useRef(onSave);
  onSaveRef.current = onSave;
  const updateAccounts = (patch) => setDraft((current) => ({ ...current, accounts: { ...current.accounts, ...patch } }));
  useEffect(() => {
    let cancelled = false;
    skipAutoSave.current = true;
    setLoadingConfig(true);
    setDraft(null);
    api(`/api/configuracion?boxId=${configBoxId}`).then((nextConfig) => {
      if (cancelled) return;
      setDraft(nextConfig);
      setLoadingConfig(false);
    }).catch((error) => { if (!cancelled) { setLoadingConfig(false); onNotify?.(error.message); } });
    return () => { cancelled = true; };
  }, [configBoxId]);
  useEffect(() => {
    if (loadingConfig || !draft) return undefined;
    if (skipAutoSave.current) {
      skipAutoSave.current = false;
      return undefined;
    }
    setSaving(true);
    const timer = window.setTimeout(async () => {
      try {
        await onSaveRef.current(draft, configBoxId);
      } catch (error) {
        onNotify?.(error.message);
      } finally {
        setSaving(false);
      }
    }, 350);
    return () => window.clearTimeout(timer);
  }, [draft, configBoxId, loadingConfig]);
  const configTarget = boxes.find((box) => box.id === configBoxId) || boxes[0];
  return (
    <div className={`configuration-page ${embedded ? "embedded" : ""}`}>
      {!embedded && <header className="configuration-header">
        <button className="icon-button" title="Volver a la caja" onClick={onBack}><ArrowLeft size={18} /></button>
        <div><span className="eyebrow">Configuración exclusiva</span><h1>Preferencias de la caja</h1></div>
        {tab !== "boxes" && <BoxSelector label="EDITAR" boxes={boxes} activeBoxId={configBoxId} onChange={setConfigBoxId} />}
      </header>}
      <div className="configuration-layout">
        <nav className="configuration-tabs">
          <button className={tab === "boxes" ? "active" : ""} onClick={() => setTab("boxes")}><Banknote size={17} /> Cajas</button>
          <button className={tab === "accounts" ? "active" : ""} onClick={() => setTab("accounts")}><WalletCards size={17} /> Matriz de cuentas</button>
          <button className={tab === "expenses" ? "active" : ""} onClick={() => setTab("expenses")}><ReceiptText size={17} /> Gastos</button>
          <button className={tab === "platforms" ? "active" : ""} onClick={() => setTab("platforms")}><Ticket size={17} /> Control de fichas</button>
          <button className={tab === "users" ? "active" : ""} onClick={() => setTab("users")}><Users size={17} /> Usuarios</button>
          <button className={tab === "bonuses" ? "active" : ""} onClick={() => setTab("bonuses")}><Gift size={17} /> Bonos</button>
          <button className={tab === "monthly-goal" ? "active" : ""} onClick={() => setTab("monthly-goal")}><Target size={17} /> Objetivos</button>
        </nav>
        <main className="configuration-content">
          {tab === "users" && !loadingConfig && draft && <UserInfoOptionsConfig draft={draft} setDraft={setDraft} />}
          {tab === "bonuses" && !loadingConfig && draft && <BonusConfig draft={draft} setDraft={setDraft} />}
          {loadingConfig && <div className="config-loading">Cargando configuración de {configTarget?.title}...</div>}
          {!loadingConfig && draft && <>
          {tab === "boxes" && <BoxBackgroundConfig draft={draft} setDraft={setDraft} configBoxId={configBoxId} api={api} onNotify={onNotify} />}
          {tab === "boxes" && <><div className="config-intro"><span className="eyebrow">Espacios de trabajo</span><h2>Edición de cajas</h2><p>Administrá el nombre, color y existencia de cada caja independiente.</p></div><section className="config-card box-management-list"><div className="config-list-head"><h3>Mis cajas</h3><span>{boxes.length} espacios</span></div>{boxes.map((box) => <div className="box-management-row" key={box.id}><i className={`box-swatch ${box.color}`} /><input value={box.title} onChange={(event) => onBoxesChanged({ type: "update", id: box.id, patch: { title: event.target.value } })} /><select value={box.color} onChange={(event) => onBoxesChanged({ type: "update", id: box.id, patch: { color: event.target.value } })}><option value="teal">Turquesa</option><option value="blue">Azul</option><option value="green">Verde</option><option value="orange">Naranja</option><option value="pink">Rosa</option><option value="red">Rojo</option><option value="yellow">Amarillo</option><option value="violet">Violeta</option><option value="slate">Pizarra</option></select><button className="delete-button" disabled={boxes.length === 1} title="Eliminar caja" onClick={() => onBoxesChanged({ type: "delete", id: box.id })}><Trash2 size={15} /></button></div>)}<button className="config-add" onClick={() => onBoxesChanged({ type: "create" })}><Plus size={15} /> Nueva caja</button></section></>}
          {tab === "boxes" && <section className="config-card brand-config-card"><div className="config-list-head"><h3>Marca de la caja</h3><span>Se guarda en esta caja</span></div><div className="brand-config-fields"><label><span>Ícono</span><select value={draft.branding?.icon || "banknote"} onChange={(event) => setDraft((current) => ({ ...current, branding: { ...(current.branding || {}), icon: event.target.value } }))}><option value="banknote">Billete</option><option value="wallet">Billetera</option><option value="coins">Monedas</option><option value="gift">Regalo</option><option value="ticket">Ticket</option><option value="receipt">Recibo</option></select></label><label><span>Texto de marca</span><input maxLength={18} value={draft.branding?.suffix || "flow"} onChange={(event) => setDraft((current) => ({ ...current, branding: { ...(current.branding || {}), suffix: event.target.value } }))} placeholder="flow" /></label><div className="brand-config-preview"><div className="brand-mark"><BrandIcon name={draft.branding?.icon} size={20} /></div><strong>CAJA<span>{draft.branding?.suffix || "flow"}</span></strong></div></div></section>}
          {tab === "accounts" && <>
            <div className="config-intro"><span className="eyebrow">Matriz de cuentas</span><h2>Titulares y billeteras</h2><p>Creá las listas y definí qué billeteras puede usar cada titular.</p></div>
            <AccountsConfig draft={draft} boxes={boxes} updateAccounts={updateAccounts} />
          </>}
          {tab === "expenses" && <><div className="config-intro"><span className="eyebrow">Gastos</span><h2>Categorías de gastos</h2><p>Definí las opciones del selector y si cada categoría suma o resta al resumen.</p></div><section className="config-card expense-config-list"><div className="config-list-head"><h3>Opciones del selector</h3><span>{draft.expenses.length} categorías</span></div>{draft.expenses.map((expense, index) => <div className="expense-config-row" key={index}><input value={expense.name} placeholder="Nombre del gasto" onChange={(event) => { const expenses = structuredClone(draft.expenses); expenses[index].name = event.target.value; setDraft({ ...draft, expenses }); }} /><label className="invert-toggle"><input type="checkbox" checked={expense.inverted} onChange={() => { const expenses = structuredClone(draft.expenses); expenses[index].inverted = !expenses[index].inverted; setDraft({ ...draft, expenses }); }} /><span /> Invierte el signo</label><button className="delete-button" title="Eliminar categoría" onClick={async () => { if (await confirmDelete(`¿Eliminar categoría "${expense.name}"?`)) setDraft({ ...draft, expenses: draft.expenses.filter((_, itemIndex) => itemIndex !== index) }); }}><Trash2 size={15} /></button></div>)}<button className="config-add" onClick={() => setDraft({ ...draft, expenses: [...draft.expenses, { name: "", inverted: false }] })}><Plus size={15} /> Agregar categoría</button></section></>}
          {tab === "platforms" && <><div className="config-intro"><span className="eyebrow">Control de fichas</span><h2>Plataformas</h2><p>Administrá las plataformas, los nombres, colores y subplataformas de cada una.</p></div><div style={{ display: "flex", gap: "12px", marginBottom: "24px" }}><button className="config-add" type="button" onClick={async () => { if (await confirmDelete("¿Vaciar TODAS las subplataformas en TODAS las cajas? Esto no se puede deshacer.")) { setSaving(true); try { for (const box of (boxes || [])) { const boxConfig = await api(`/api/configuracion?boxId=${box.id}`).catch(() => null); if (boxConfig) { await onSaveRef.current({ ...boxConfig, platformSubPlatforms: {} }, box.id); } } if (configBoxId) { const reloadedConfig = await api(`/api/configuracion?boxId=${configBoxId}`).catch(() => null); if (reloadedConfig) setDraft(reloadedConfig); } onNotify?.("Subplataformas limpias en todas las cajas."); } catch (error) { onNotify?.(error?.message || "Error al limpiar subplataformas."); } finally { setSaving(false); } } }} style={{ background: "rgba(255, 90, 90, 0.2)", color: "#ff5a5a", borderColor: "rgba(255, 90, 90, 0.3)" }} title="Vaciar todas las subplataformas en todas las cajas" disabled={saving}><Trash2 size={15} /> Limpiar todas subplataformas</button></div><PlatformConfigList platforms={draft.platforms} platformEntities={draft.platformEntities} platformEnabled={draft.platformEnabled || {}} onEntitiesChange={(platformEntities) => setDraft((current) => ({ ...current, platformEntities }))} platformColors={draft.platformColors || {}} onPlatformsChange={(platforms) => setDraft((current) => ({ ...current, platforms }))} onEnabledChange={(platform, enabled) => setDraft((current) => ({ ...current, platformEnabled: { ...(current.platformEnabled || {}), [platform]: enabled } }))} onColorChange={(platform, color, previous) => setDraft((current) => { const platformColors = { ...(current.platformColors || {}), [platform]: color }; if (previous) { delete platformColors[previous]; return { ...current, platforms: current.platforms.map((item) => item === previous ? platform : item), platformColors }; } return { ...current, platformColors }; })} platformSubPlatforms={draft.platformSubPlatforms || {}} onSubPlatformsChange={(platformSubPlatforms) => setDraft((current) => ({ ...current, platformSubPlatforms }))} /></>}
          {tab === "monthly-goal" && <><div className="config-intro"><span className="eyebrow">Objetivos</span><h2>Objetivo de Depósitos General y Bonos mensuales</h2><p>Configurá el objetivo general de depósitos y las metas mensuales de bonos y ahorro.</p></div><MonthlyGoalConfig draft={draft} boxes={boxes} api={api} date={cajaDate} update={(patch) => setDraft({ ...draft, ...patch })} /><BonusMonthlyGoalConfig draft={draft} update={(patch) => setDraft({ ...draft, ...patch })} /><SavingsGoalConfig draft={draft} update={(patch) => setDraft({ ...draft, ...patch })} /></>}
          {tab === "users" && <><div className="config-intro"><span className="eyebrow">Usuarios</span><h2>Conf. de usuarios y aclaraciones</h2><p>Definí las aclaraciones rápidas que se podrán asociar a cada usuario.</p></div><section className="config-card"><div className="config-list-head"><h3>Aclaraciones</h3><span>{draft.userClarifications?.length || 0} elementos</span></div>{(draft.userClarifications || []).map((clarification, index) => <div className="platform-config-row" key={clarification.id || index} style={{ display: "grid", gridTemplateColumns: "1.2fr 120px 88px auto", gap: "8px", alignItems: "center" }}><input value={clarification.text} onChange={(event) => setDraft((current) => ({ ...current, userClarifications: (current.userClarifications || []).map((item, itemIndex) => itemIndex === index ? { ...item, text: event.target.value } : item) }))} placeholder="Texto aclaración" /><select value={clarification.color} onChange={(event) => setDraft((current) => ({ ...current, userClarifications: (current.userClarifications || []).map((item, itemIndex) => itemIndex === index ? { ...item, color: event.target.value } : item) }))}>{Object.entries({ teal: "Turquesa", blue: "Azul", green: "Verde", orange: "Naranja", pink: "Rosa", red: "Rojo", yellow: "Amarillo", violet: "Violeta", slate: "Pizarra" }).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select><input value={clarification.emoji || ""} maxLength={2} onChange={(event) => setDraft((current) => ({ ...current, userClarifications: (current.userClarifications || []).map((item, itemIndex) => itemIndex === index ? { ...item, emoji: event.target.value } : item) }))} placeholder="🙂" /><button className="delete-button" title="Eliminar aclaración" onClick={async () => { if (await confirmDelete(`¿Eliminar aclaración "${clarification.text}"?`)) setDraft((current) => ({ ...current, userClarifications: (current.userClarifications || []).filter((_, itemIndex) => itemIndex !== index) })); }}><Trash2 size={15} /></button></div>)}<button className="config-add" onClick={() => setDraft((current) => ({ ...current, userClarifications: [...(current.userClarifications || []), { id: `clarification-${crypto.randomUUID()}`, text: "", color: "teal", emoji: "" }] }))}><Plus size={15} /> Agregar aclaración</button></section></>}
          </>}
        </main>
      </div>

    </div>
  );
}

function SummaryHeader({
  caja,
  config,
  onClose,
  saving,
  saveError,
  offline,
  lastSavedAt,
  onPrevious,
  onNext,
  readOnly,
  onSnapshot,
  capturing,
  onConfigure,
  boxes,
  activeBoxId,
  onBoxChange,
}) {
  return (
    <header className="topbar">
      <div className="brand">
        <div className="brand-mark">
          <BrandIcon name={config?.branding?.icon} size={20} />
        </div>
        <div>
          <strong>
            CAJA<span>{config?.branding?.suffix || "flow"}</span>
          </strong>
          <small>Control operativo</small>
        </div>
      </div>
      <div className="shift-nav">
        <button
          className="icon-button"
          title="Caja anterior"
          onClick={onPrevious}
        >
          <ArrowLeft size={17} />
        </button>
        <div className="shift-title">
          <span>
            <Clock3 size={15} /> Turno {caja.shift}{" "}
            {readOnly && "· Solo lectura"}
          </span>
          <b>
            {new Date(caja.date).toLocaleDateString("es-AR", {
              day: "2-digit",
              month: "2-digit",
            })}{" "}
            <em>/</em>{" "}
            {caja.shift === "Noche"
              ? "00:00 - 08:00"
              : caja.shift === "Mañana"
                ? "08:00 - 16:00"
                : "16:00 - 00:00"}
          </b>
        </div>
        <button className="icon-button" title="Caja siguiente" onClick={onNext}>
          <ArrowRight size={17} />
        </button>
      </div>
      <div className="top-actions">
        <BoxSelector boxes={boxes} activeBoxId={activeBoxId} onChange={onBoxChange} />
        <span className={`save-state ${saving ? "saving" : ""} ${saveError ? "error" : ""} ${offline ? "offline" : ""}`} title={lastSavedAt ? `Último guardado confirmado: ${lastSavedAt}` : "Todavía no hay un guardado confirmado"}>
          <span className="dot" />{" "}
          {readOnly ? "Consulta" : offline ? "Sin conexión" : saveError ? "Error al guardar" : saving ? "Guardando..." : "Guardado"}
        </span>
        <button
          className="icon-button snapshot-button"
          title="Descargar caja como PNG"
          onClick={onSnapshot}
          disabled={capturing}
        >
          <Camera size={17} />
        </button>
        <button
          className="close-button"
          onClick={onClose}
          disabled={readOnly || caja.status === "CERRADA"}
        >
          <LockKeyhole size={16} />
        </button>
      </div>
    </header>
  );
}
function SectionHead({ icon, title, meta, action }) {
  return (
    <div className="section-head">
      <div className="section-title">
        {title === "Publicidad" ? <Megaphone size={16} /> : icon}
        <div className="section-title-copy">
          <div className="section-title-line">
            <h2>{title}</h2>
            {meta && <span>{meta}</span>}
          </div>
        </div>
      </div>
      {action}
    </div>
  );
}
function NumericInput({ value, onChange, placeholder = "", zeroPlaceholder = "", onKeyDown, inputProps = {}, numericOnly = false, selectAllOnFirstClick = false }) {
  const normalizedValue = numericOnly ? Math.max(0, Math.trunc(number(value))) : number(value);
  const hasExplicitValue = value !== null && value !== undefined && value !== "";
  const [inputValue, setInputValue] = useState(
    hasExplicitValue ? (numericOnly ? String(normalizedValue) : formatNumberInput(value)) : "",
  );
  const focused = React.useRef(false);
  const inputRef = React.useRef(null);
  const selectAllPending = React.useRef(false);
  const selectAllHandled = React.useRef(false);
  const [isFocused, setIsFocused] = useState(false);
  const selectionRef = React.useRef(null);

  const digitCountBefore = (text, position) => (text.slice(0, position).match(/\d/g) || []).length;
  const positionAfterDigits = (text, digits) => {
    if (!digits) return 0;
    let seen = 0;
    for (let index = 0; index < text.length; index += 1) {
      if (/\d/.test(text[index])) seen += 1;
      if (seen === digits) return index + 1;
    }
    return text.length;
  };

  useEffect(() => {
    if (!focused.current) {
      if (hasExplicitValue) {
        const displayValue = numericOnly ? formatNumberInput(normalizedValue) : formatNumberInput(value);
        setInputValue(displayValue);
      } else {
        setInputValue("");
      }
    }
  }, [value, numericOnly, normalizedValue, isFocused, hasExplicitValue]);
  useEffect(() => {
    if (!isFocused || !selectionRef.current) return undefined;
    const selection = selectionRef.current;
    const frame = requestAnimationFrame(() => {
      const input = inputRef.current;
      if (!input) return;
      input.setSelectionRange(
        positionAfterDigits(input.value, selection.start),
        positionAfterDigits(input.value, selection.end),
      );
      selectionRef.current = null;
    });
    return () => cancelAnimationFrame(frame);
  }, [isFocused, inputValue]);

  return (
    <input
      ref={inputRef}
      value={inputValue}
      {...inputProps}
      placeholder={placeholder || zeroPlaceholder}
      type={numericOnly ? "text" : undefined}
      min={numericOnly ? 0 : undefined}
      step={numericOnly ? 1 : undefined}
      inputMode={numericOnly ? "numeric" : "decimal"}
      onKeyDown={onKeyDown}
      onMouseDown={() => {
        selectionRef.current = null;
        if (selectAllOnFirstClick && !selectAllHandled.current) selectAllPending.current = true;
      }}
      onFocus={(event) => {
        focused.current = true;
        setIsFocused(true);
        const selectAll = (selectAllOnFirstClick && selectAllPending.current) || event.currentTarget.dataset.selectAllOnFocus === "true";
        delete event.currentTarget.dataset.selectAllOnFocus;
        if (selectAll) {
          selectAllPending.current = false;
          selectAllHandled.current = true;
          const numericText = hasExplicitValue ? String(normalizedValue) : "";
          selectionRef.current = { start: 0, end: numericText.length };
          setInputValue(numericText);
          return;
        }
        if (numericOnly) {
          const start = event.target.selectionStart ?? event.target.value.length;
          const end = event.target.selectionEnd ?? start;
          selectionRef.current = {
            start: digitCountBefore(event.target.value, start),
            end: digitCountBefore(event.target.value, end),
          };
          const numericText = hasExplicitValue ? String(normalizedValue) : "";
          setInputValue(numericText);
        }
      }}
      onClick={(event) => {
        inputProps.onClick?.(event);
        if (selectAllOnFirstClick && selectAllPending.current) {
          selectAllPending.current = false;
          selectAllHandled.current = true;
          requestAnimationFrame(() => event.currentTarget.select());
        }
      }}
      onChange={(event) => {
        const nextValue = numericOnly ? event.target.value.replace(/\D/g, "") : event.target.value;
        setInputValue(nextValue);
        onChange(numericOnly ? (nextValue === "" ? "" : Number(nextValue)) : parseNumberInput(nextValue));
      }}
      onBlur={() => {
        const input = inputRef.current;
        if (input) {
          selectionRef.current = {
            start: digitCountBefore(input.value, input.selectionStart ?? input.value.length),
            end: digitCountBefore(input.value, input.selectionEnd ?? input.value.length),
          };
        }
        focused.current = false;
        selectAllPending.current = false;
        selectAllHandled.current = false;
        setIsFocused(false);
        const formattedValue = numericOnly ? (inputValue === "" ? "" : formatNumberInput(inputValue)) : formatNumberInput(inputValue);
        setInputValue(formattedValue);
      }}
    />
  );
}
function AmountInput({ value, onChange, placeholder = "0,00", className = "", selectAllOnFirstClick = false, inputProps = {} }) {
  return (
    <div className={`amount-input ${className}`}>
      <span>$</span>
      <NumericInput
        value={value ?? ""}
        placeholder={placeholder}
        onChange={onChange}
        selectAllOnFirstClick={selectAllOnFirstClick}
        inputProps={inputProps}
      />
    </div>
  );
}

function QuickBonusAccess({ caja, update, onViewBonuses, onAddManualBonus }) {
  const [quick, setQuick] = useState("");
  const [recoveredMode, setRecoveredMode] = useState(false);
  const [publicityMode, setPublicityMode] = useState(false);
  const granted = caja.bonuses.reduce((sum, bonus) => sum + number(bonus.granted), 0);
  const recovered = caja.bonuses.reduce((sum, bonus) => sum + number(bonus.recovered), 0);
  const recentBonuses = caja.bonuses.slice(-5).reverse();
  const editRecentBonus = (bonusId, value) => {
    const bonuses = caja.bonuses.map((bonus) => bonus.id === bonusId ? { ...bonus, granted: bonus.recovered > 0 ? 0 : value, recovered: bonus.recovered > 0 ? value : 0, publicity: bonus.recovered > 0 ? false : bonus.publicity } : bonus);
    update({ bonuses: value ? bonuses : bonuses.filter((bonus) => bonus.id !== bonusId) });
  };
  const addBonus = (event) => {
    if (!["Enter", "+", "-"].includes(event.key) || !parseNumberInput(quick)) return;
    event.preventDefault();
    const amount = parseNumberInput(quick);
    const recovered = event.key === "+" || (event.key !== "-" && recoveredMode);
    const publicity = !recovered && (event.key === "-" || publicityMode);
    update({ bonuses: [...caja.bonuses, { id: crypto.randomUUID(), label: "", granted: recovered ? 0 : amount, recovered: recovered ? amount : 0, publicity, verified: false, createdAt: new Date().toISOString() }] });
    setQuick("");
    setRecoveredMode(false);
    setPublicityMode(false);
  };
  const cycleMode = () => {
    if (recoveredMode) {
      setRecoveredMode(false);
      setPublicityMode(true);
    } else if (publicityMode) {
      setPublicityMode(false);
    } else {
      setRecoveredMode(true);
    }
  };
  return <div className="quick-bonus-access">
    <div className="quick-bonus-header flex items-center justify-between w-full gap-2">
      <div className={`quick-amount w-28 shrink-0 text-xs px-2 py-1 ${recoveredMode ? "recovered" : publicityMode ? "publicity" : "granted"}`}>
        <span>$</span>
        <input value={quick} placeholder={`Bonos Netos: ${money(granted - recovered)}`} inputMode="decimal" aria-label="Insertar bono" onChange={(event) => setQuick(event.target.value)} onBlur={() => setQuick(formatNumberInput(quick))} onKeyDown={addBonus} />
      </div>
      <div className="quick-bonus-actions flex items-center gap-1.5 flex-shrink-0">
        <button className={`bonus-toggle shrink-0 ${recoveredMode ? "checked recovered" : publicityMode ? "checked publicity" : "granted"}`} title="Cambiar entre otorgado, recuperado y publicidad" onClick={cycleMode} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addBonus(event); } }}><ArrowUpDown size={12} /></button>
        <button className="icon-button shrink-0" title="Agregar bono manual" onClick={onAddManualBonus}><Plus size={14} /></button>
        <button className="icon-button shrink-0" title="Ver y editar bonos" onClick={onViewBonuses}><Eye size={14} /></button>
      </div>
    </div>
    <div className="quick-recent-bonuses"><span className="quick-recent-title">Últimos 5 bonos</span>{recentBonuses.map((bonus) => { const isRecovered = number(bonus.recovered) > 0; const isPublicity = !isRecovered && bonus.publicity; return <div className={`quick-recent-bonus ${isRecovered ? "recovered" : isPublicity ? "publicity" : "granted"}`} key={bonus.id}><span>{isRecovered ? "Recuperado" : isPublicity ? "Publicidad" : "Otorgado"}</span><div className="recent-bonus-value"><span className="recent-bonus-time">{formatMovementTime(bonus.createdAt)} -</span><input defaultValue={money(isRecovered ? bonus.recovered : bonus.granted)} aria-label="Editar bono reciente" onFocus={(event) => { event.currentTarget.value = formatNumberInput(isRecovered ? bonus.recovered : bonus.granted); event.currentTarget.select(); }} onBlur={(event) => { const value = parseNumberInput(event.currentTarget.value); event.currentTarget.value = value ? money(value) : "-"; editRecentBonus(bonus.id, value); }} onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); }} /></div></div>; })}</div>
  </div>;
}

function AdvertisingSection({ caja, update, boxes, config, onViewBonuses, onAddManualBonus, onNotify, notesEnabled, onNotesEnabledChange }) {
  const advertising = caja.advertising || { "Publicidad A": { total: 0, new: 0, repeated: 0, derived: {} }, "Publicidad B": { total: 0, new: 0, repeated: 0, derived: {} } };
  const updateAdvertising = (name, patch) => update({ advertising: { ...advertising, [name]: { ...advertising[name], ...patch } } });
  const updateValue = (name, field, value) => {
    const cleaned = String(value).replace(/\D/g, "").slice(0, 3);
    const numValue = cleaned === "" ? "" : Math.max(0, Number(cleaned));
    updateAdvertising(name, { [field]: numValue });
  };
    const copySummary = async () => {
    const text = ["*Conteo de Publi:*", "", ...["Publicidad A", "Publicidad B"].flatMap((name) => {
      const item = advertising[name] || {};
      const total = number(item.total);
      const newCount = number(item.new);
      const repeated = number(item.repeated);
      const response = total - newCount - repeated;
      const derivedTotal = boxes.reduce((sum, box) => sum + number(item.derived?.[box.id]), 0);
      return [`*${name}*`, `*Efectividad: ${total ? Math.round((derivedTotal / total) * 100) : 0}%*`, "", `Llegados: ${total}`, `- Nuevos: ${newCount}`, `- Repetidos: ${repeated}`, `- S/Respuesta: ${response}`, `Derivados: ${derivedTotal}`, ...boxes.map((box) => `- ${box.title}: ${number(item.derived?.[box.id])}`), ""];
    })].join("\n");
    await navigator.clipboard?.writeText(text);
    onNotify("Copiado al portapapeles");
  };
  return <section className="advertising-panel">
    <div className="advertising-card"><SectionHead icon={<ReceiptText size={16} />} title="Publicidad" action={<button className="icon-button advertising-copy" title="Copiar conteo de publicidad" onClick={copySummary}><Copy size={15} /></button>} /><div className="advertising-content">{["Publicidad A", "Publicidad B"].map((name) => { const item = advertising[name] || {}; const response = number(item.new) + number(item.repeated) - number(item.total); const derivedTotal = boxes.reduce((sum, box) => sum + number(item.derived?.[box.id]), 0); const effectiveness = item.total ? Math.round((derivedTotal / number(item.total)) * 100) : 0; return <div className="advertising-row" key={name}><strong><ReceiptText size={12} />{name}</strong><div className="advertising-subgroup"><div className="advertising-fields"><label><small>Lleg. Total</small><input maxLength={3} inputMode="numeric" value={item.total || ""} onChange={(event) => updateValue(name, "total", event.target.value)} /></label><label><small>Nuevos</small><input maxLength={3} inputMode="numeric" value={item.new || ""} onChange={(event) => updateValue(name, "new", event.target.value)} /></label><label><small>Repetidos</small><input maxLength={3} inputMode="numeric" value={item.repeated || ""} onChange={(event) => updateValue(name, "repeated", event.target.value)} /></label><label><small>S/Resp</small><b>{response}</b></label></div></div><div className="advertising-subgroup"><span>Derivados <b>{derivedTotal}</b></span><div className="advertising-derived">{boxes.map((box) => <label key={box.id}><small className="advertising-box-label">{box.title}</small><input maxLength={3} inputMode="numeric" value={item.derived?.[box.id] || ""} onChange={(event) => updateAdvertising(name, { derived: { ...(item.derived || {}), [box.id]: Math.max(0, Number(String(event.target.value).replace(/\D/g, "").slice(0, 3)) || 0) } })} /></label>)}</div></div><strong className="advertising-effectiveness"><ReceiptText size={11} />{effectiveness}%</strong></div>; })}</div></div>
    <div className="bonus-card"><QuickBonusAccess caja={caja} update={update} onViewBonuses={onViewBonuses} onAddManualBonus={onAddManualBonus} /></div>
    <div className="chips-card"><div className="section-head chips-section-head"><div className="section-title"><Ticket size={16} /><div><h2>Fichas Finales</h2></div></div><label className="notes-toggle" title="Mostrar u ocultar notas de cuentas"><span>Notas</span><input type="checkbox" checked={notesEnabled} onChange={(event) => onNotesEnabledChange(event.target.checked)} /><i /></label></div><div className="final-chip-fields">{caja.chips.map((chip, index) => { const balance = number(chip.initial) - number(chip.final); const platformColor = boxColorStyle(config.platformColors?.[chip.platform] || "teal")["--box-accent"]; const isZero = number(chip.final) === 0; return <label className={`final-chip-field ${!isZero ? "has-value" : ""}`} style={{ "--platform-accent": platformColor }} key={chip.platform}><span>Ficha Final ({chip.platform})</span><AmountInput value={chip.final} className={isZero ? "zero-value" : "non-zero-value"} selectAllOnFirstClick inputProps={{ "aria-label": `Ficha final ${chip.platform}` }} onChange={(value) => { const chips = structuredClone(caja.chips); chips[index].final = value; update({ chips }); }} /><small className={balance < 0 ? "negative" : balance > 0 ? "positive" : "neutral"}>Saldo {money(balance)}</small></label>; })}</div></div>
  </section>;
}

function AdvertisingSectionRebuilt({ caja: sourceCaja, update: saveUpdate, boxes, config, onViewBonuses, onAddManualBonus, onNotify }) {
  const visibleChips = sourceCaja.status === "CERRADA" ? sourceCaja.chips : sourceCaja.chips.filter((chip) => enabledPlatformsFor(config).includes(chip.platform));
  const caja = { ...sourceCaja, chips: visibleChips };
  const update = (patch) => {
    if (!patch.chips) return saveUpdate(patch);
    const nextByPlatform = new Map(patch.chips.map((chip) => [chip.platform, chip]));
    return saveUpdate({ ...patch, chips: sourceCaja.chips.map((chip) => nextByPlatform.get(chip.platform) || chip) });
  };
  const advertising = caja.advertising || {};
  const updateAdvertising = (name, patch) => update({ advertising: { ...advertising, [name]: { ...(advertising[name] || {}), ...patch } } });
  const updateValue = (name, field, value) => {
    const cleaned = String(value).replace(/\D/g, "").slice(0, 3);
    const numValue = cleaned === "" ? "" : Math.max(0, Number(cleaned));
    updateAdvertising(name, { [field]: numValue });
  };
  const copySummary = async () => {
    const lines = ["*CONTEO DE PUBLICIDAD:*", ""];
    ["Publicidad A", "Publicidad B"].forEach((name, index) => {
      const item = advertising[name] || {};
      const total = number(item.total);
      const derived = boxes.reduce((sum, box) => sum + number(item.derived?.[box.id]), 0);
      lines.push(`*${name}*`, `*Efectividad: ${total ? Math.round((derived / total) * 100) : 0}%*`, "", `*Llegados: ${total}*`, `Nuevos: ${number(item.new)}`, `Repetidos: ${number(item.repeated)}`, `S/Resp: ${total - number(item.new) - number(item.repeated)}`, "", `*Derivados: ${derived}*`, ...boxes.map((box) => `${box.title}: ${number(item.derived?.[box.id])}`), "", ...(index === 0 ? ["---------------------", ""] : []));
    });
    const text = lines.join("\n");
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      textarea.remove();
    }
    onNotify("Copiado al portapapeles");
  };
  return <div className="publicity-layout">
    <section className="panel publicity-panel"><SectionHead icon={<ReceiptText size={16} />} title="Publicidad" action={<button className="icon-button" title="Copiar conteo de publicidad" onClick={copySummary}><Copy size={15} /></button>} /><div className="publicity-list">{["Publicidad A", "Publicidad B"].map((name) => { const item = advertising[name] || {}; const total = number(item.total); const derived = boxes.reduce((sum, box) => sum + number(item.derived?.[box.id]), 0); const response = total - number(item.new) - number(item.repeated); const stepper = (field, label) => <label><span>{label}</span><div className="publicity-stepper"><button type="button" title={`Disminuir ${label.toLowerCase()}`} aria-label={`Disminuir ${label.toLowerCase()}`} onClick={() => updateValue(name, field, number(item[field]) - 1)}><ArrowLeft size={10} /></button><input maxLength={3} inputMode="numeric" value={item[field] ?? 0} onChange={(event) => updateValue(name, field, event.target.value)} /><button type="button" title={`Aumentar ${label.toLowerCase()}`} aria-label={`Aumentar ${label.toLowerCase()}`} onClick={() => updateValue(name, field, number(item[field]) + 1)}><ArrowRight size={10} /></button></div></label>; const derivedStepper = (box) => <label key={box.id}><small>{box.title}</small><div className="publicity-stepper"><button type="button" title={`Disminuir derivados de ${box.title}`} aria-label={`Disminuir derivados de ${box.title}`} onClick={() => updateAdvertising(name, { derived: { ...(item.derived || {}), [box.id]: Math.max(0, number(item.derived?.[box.id]) - 1) } })}><ArrowLeft size={10} /></button><input maxLength={3} inputMode="numeric" value={item.derived?.[box.id] ?? 0} onChange={(event) => updateAdvertising(name, { derived: { ...(item.derived || {}), [box.id]: Math.max(0, Number(String(event.target.value).replace(/\D/g, "").slice(0, 3)) || 0) } })} /><button type="button" title={`Aumentar derivados de ${box.title}`} aria-label={`Aumentar derivados de ${box.title}`} onClick={() => updateAdvertising(name, { derived: { ...(item.derived || {}), [box.id]: number(item.derived?.[box.id]) + 1 } })}><ArrowRight size={10} /></button></div></label>; return <div className="publicity-item" key={name}><strong className="publicity-name"><ReceiptText size={13} />{name}</strong><div className="publicity-numbers">{stepper("total", "Total")}{stepper("new", "Nuevos")}{stepper("repeated", "Repetidos")}<label><span>S/Resp</span><b>{response}</b></label></div><div className="publicity-derived"><span>Derivados <b>{derived}</b></span><div>{boxes.map(derivedStepper)}</div></div><strong className="publicity-rate"><ReceiptText size={11} />{total ? Math.round((derived / total) * 100) : 0}%</strong></div>; })}</div></section>
    <section className="panel publicity-bonus-panel"><QuickBonusAccess caja={caja} update={update} onViewBonuses={onViewBonuses} onAddManualBonus={onAddManualBonus} /></section>
    <section className="panel publicity-chips-panel"><SectionHead icon={<Ticket size={16} />} title="Fichas Finales" /><div className="publicity-chip-list">{caja.chips.map((chip, index) => { const balance = number(chip.initial) - number(chip.final); return <label key={chip.platform} style={{ "--platform-accent": boxColorStyle(config.platformColors?.[chip.platform] || "teal")["--box-accent"] }}><span>Ficha Final ({chip.platform})</span><AmountInput value={chip.final} onChange={(value) => { const chips = structuredClone(caja.chips); chips[index].final = value; update({ chips }); }} /><small className={balance < 0 ? "negative" : balance > 0 ? "positive" : "neutral"}>{money(balance)}</small></label>; })}</div></section>
  </div>;
}

function AccountsGrid({ caja, update, config, boxes, activeBoxId, onAssignWallet, onViewBonuses, notesEnabled }) {
  const [notePosition, setNotePosition] = useState(null);
  const [editingNote, setEditingNote] = useState(null);
  const [activeNoteKey, setActiveNoteKey] = useState(null);
  const [visibleNoteKey, setVisibleNoteKey] = useState(null);
  const noteVisibilityTimer = React.useRef(null);
  const wallets = config.accounts.wallets;
  const accountSections = caja.accountSections || {};
  const walletGroups = ["Normal", "Depósitos", "Compartidas", "Ahorro"].map((category) => ({
    category,
    rows: caja.accounts.map((row, index) => ({ row, index })).filter(({ row }) => wallets.some((wallet) => (config.accounts.walletSettings[row.holder]?.[wallet]?.category || "Normal") === category && config.accounts.availability[row.holder]?.[wallet] !== false)),
  })).filter((group) => group.rows.length);
  const rowOffsets = walletGroups.map((group, groupIndex) => walletGroups.slice(0, groupIndex).reduce((total, previousGroup) => total + previousGroup.rows.length, 0));
  const focusAdjacentAmount = (event, rowPosition, walletIndex) => {
    if (event.key === "Enter") {
      event.preventDefault();
      event.currentTarget.blur();
      return;
    }
    const directions = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    const direction = directions[event.key];
    if (!direction) return;
    const [columnStep, rowStep] = direction;
    const input = event.currentTarget;
    const selectionStart = input.selectionStart ?? 0;
    const selectionEnd = input.selectionEnd ?? 0;
    const hasSelection = selectionStart !== selectionEnd;
    const selectedAll = hasSelection && selectionStart === 0 && selectionEnd === input.value.length;
    if (columnStep && !selectedAll && hasSelection) return;
    if (columnStep && !selectedAll && (columnStep < 0 ? selectionStart > 0 : selectionEnd < input.value.length)) return;
    const candidates = [...document.querySelectorAll(".account-grid input[data-matrix-row]")].filter((input) => {
      const candidateRow = Number(input.dataset.matrixRow);
      const candidateColumn = Number(input.dataset.matrixColumn);
      return columnStep ? candidateRow === rowPosition && (candidateColumn - walletIndex) * columnStep > 0 : candidateColumn === walletIndex && (candidateRow - rowPosition) * rowStep > 0;
    });
    candidates.sort((first, second) => {
      const firstDistance = columnStep ? Math.abs(Number(first.dataset.matrixColumn) - walletIndex) : Math.abs(Number(first.dataset.matrixRow) - rowPosition);
      const secondDistance = columnStep ? Math.abs(Number(second.dataset.matrixColumn) - walletIndex) : Math.abs(Number(second.dataset.matrixRow) - rowPosition);
      return firstDistance - secondDistance;
    });
    if (!candidates[0]) return;
    event.preventDefault();
    const nextInput = candidates[0];
    nextInput.dataset.selectAllOnFocus = "true";
    nextInput.focus({ preventScroll: true });
  };
  const totals = useMemo(
    () => ({
      rows: walletGroups.map((group) => group.rows.map(({ row }) => wallets.reduce((sum, wallet) => sum + (config.accounts.walletSettings[row.holder]?.[wallet]?.category === group.category && walletCountsInCash(row, wallet, config, activeBoxId) ? number(row.values[wallet]) : 0), 0))),
      columns: wallets.map((wallet) => walletGroups.reduce((sum, group) => sum + group.rows.reduce((groupSum, { row }) => groupSum + (config.accounts.walletSettings[row.holder]?.[wallet]?.category === group.category && walletCountsInCash(row, wallet, config, activeBoxId) ? number(row.values[wallet]) : 0), 0), 0)),
    }),
    [caja.accounts, wallets, walletGroups, config.accounts.availability, config.accounts.walletSettings, activeBoxId],
  );
  const edit = (rowIndex, wallet, value) => {
    const accounts = structuredClone(caja.accounts);
    accounts[rowIndex].values[wallet] = value;
    update({ accounts });
  };
  const editNote = (rowIndex, wallet, value) => {
    const accounts = structuredClone(caja.accounts);
    accounts[rowIndex].notes = { ...(accounts[rowIndex].notes || {}), [wallet]: value };
    update({ accounts });
  };
  const toggle = (rowIndex, wallet, flag) => {
    const accounts = structuredClone(caja.accounts);
    const current = accounts[rowIndex].verified?.[wallet];
    const state =
      typeof current === "object"
        ? current
        : { collections: Boolean(current), withdrawals: false };
    state[flag] = !state[flag];
    const restartedAt = new Date().toISOString();
    if (!state[flag]) state[`last${flag === "collections" ? "Collections" : "Withdrawals"}At`] = restartedAt;
    accounts[rowIndex].walletRestartAt = { ...(accounts[rowIndex].walletRestartAt || {}), [wallet]: restartedAt };
    accounts[rowIndex].verified = { ...(accounts[rowIndex].verified || {}), [wallet]: state };
    update({ accounts }, true);
  };
  const cellState = (row, wallet) => {
    const state = row.verified?.[wallet];
    return typeof state === "object"
      ? state
      : { collections: Boolean(state), withdrawals: false };
  };
  const noteKey = (rowIndex, wallet) => `${rowIndex}-${wallet}`;
  const showNote = (event, currentNoteKey) => {
    const focusedNote = document.activeElement;
    if (focusedNote?.closest(".wallet-note-popover")) {
      focusedNote.blur();
      setEditingNote(null);
    }
    setActiveNoteKey(currentNoteKey);
    setVisibleNoteKey(null);
    window.clearTimeout(noteVisibilityTimer.current);
    noteVisibilityTimer.current = window.setTimeout(() => {
      setVisibleNoteKey((key) => key === null ? currentNoteKey : key);
    }, 650);
    const rect = event.currentTarget.getBoundingClientRect();
    const height = 110;
    setNotePosition({ left: Math.min(rect.left, window.innerWidth - 198), top: rect.bottom + height > window.innerHeight ? Math.max(8, rect.top - height) : rect.bottom });
  };
  const hideNote = (event, currentNoteKey) => {
    if (event.relatedTarget?.closest?.(".wallet-note-popover") && activeNoteKey === currentNoteKey) return;
    window.clearTimeout(noteVisibilityTimer.current);
    setActiveNoteKey(null);
    setVisibleNoteKey(null);
  };
  const sectionKey = (category) => category === "Depósitos" ? "deposits" : category === "Compartidas" ? "shared" : "savings";
  const isSectionCollapsed = (category) => category !== "Normal" && accountSections[sectionKey(category)] === true;
  const toggleSection = (category) => {
    const key = sectionKey(category);
    update({ accountSections: { ...accountSections, [key]: !isSectionCollapsed(category) } });
  };
  const renderCell = (row, index, wallet, category, rowPosition, walletIndex) => {
    const state = cellState(row, wallet);
    const stateClass = state.collections && state.withdrawals ? "both" : state.collections ? "collections" : state.withdrawals ? "withdrawals" : "";
    const walletCategory = config.accounts.walletSettings[row.holder]?.[wallet]?.category || "Normal";
    if (walletCategory !== category || config.accounts.availability[row.holder]?.[wallet] === false) return <td key={wallet}><div className="disabled-wallet" /></td>;
    const assignedBox = boxes.find((box) => box.id === row.walletBoxes?.[wallet]);
    const cellColorStyle = assignedBox ? boxColorStyle(assignedBox.color) : { "--box-accent": "#758689", "--box-line": "#536976", "--assignment-dot": "transparent" };
    const accountSetting = config.accounts.walletSettings[row.holder]?.[wallet] || {};
    const assignmentSelector = ["Depósitos", "Compartidas"].includes(category) && <WalletAssignmentSelector showLabel={false} boxes={boxes} value={row.walletBoxes?.[wallet] || ""} onChange={(boxId) => onAssignWallet(row.holder, wallet, boxId)} />;
    const checks = <div className="cell-checks"><button tabIndex={-1} className={state.collections ? "checked" : ""} onClick={() => toggle(index, wallet, "collections")} title="Cobros e ingresos"><Check size={11} /></button><button tabIndex={-1} className={state.withdrawals ? "checked" : ""} onClick={() => toggle(index, wallet, "withdrawals")} title="Retiros y egresos"><Check size={11} /></button></div>;
    const currentNoteKey = noteKey(index, wallet);
    const isEditingNote = editingNote === currentNoteKey;
    const note = accountSetting.note || row.notes?.[wallet] || "";
    const accountInfo = [["Alias", accountSetting.alias], ["CUIL", accountSetting.cuil], ["Contraseña", accountSetting.password], ["Nota", note]].filter(([, value]) => String(value || "").trim());
    const hasAccountInfo = accountInfo.length > 0;
    return <td key={wallet}><div className={`wallet-cell ${notesEnabled ? "notes-enabled" : ""}`}><div className={`cell-control ${stateClass} ${number(row.values[wallet]) !== 0 ? "has-money" : ""} ${category === "Normal" ? "wallet-category-normal" : "wallet-category-assigned"}`} style={cellColorStyle}><div className="account-amount"><span>$</span><NumericInput value={row.values[wallet]} zeroPlaceholder="-" numericOnly selectAllOnFirstClick onChange={(value) => edit(index, wallet, value)} onKeyDown={(event) => focusAdjacentAmount(event, rowPosition, walletIndex)} inputProps={{ "data-matrix-row": rowPosition, "data-matrix-column": walletIndex, onMouseEnter: (event) => showNote(event, currentNoteKey), onMouseLeave: (event) => hideNote(event, currentNoteKey) }} /></div>{category === "Normal" && checks}{category === "Depósitos" && assignmentSelector}{category === "Compartidas" && <div className="shared-wallet-controls">{checks}{assignmentSelector}</div>}</div>{hasAccountInfo && <div className={`wallet-note-popover has-note ${activeNoteKey === currentNoteKey ? "active" : ""} ${visibleNoteKey === currentNoteKey ? "visible" : ""}`} style={notePosition ? { left: `${notePosition.left}px`, top: `${notePosition.top}px` } : undefined}><div className="wallet-account-info">{accountInfo.map(([label, value]) => <div key={label}><b>{label}</b><textarea tabIndex={-1} rows={Math.max(1, String(value).split(/\r?\n/).length)} readOnly value={value} /></div>)}</div></div>}</div></td>;
  };
  return (
    <section className="panel accounts-panel">
      <div className="table-scroll">
        <table className="account-grid">
          <thead>
            <tr>
              <th className="sticky-col"><span className="section-icon cyan"><WalletCards size={16} /></span><b>Caja</b></th>
              {wallets.map((wallet) => (
                <th className={walletModeClass(config, wallet)} key={wallet}>{wallet}</th>
              ))}
              <th className="total-column">Total</th>
            </tr>
          </thead>
          <tbody>
            {walletGroups.flatMap((group, groupIndex) => {
              const collapsed = isSectionCollapsed(group.category);
              return [
                group.category !== "Normal" && <tr className="wallet-section-row" key={`${group.category}-title`}><th colSpan={wallets.length + 2}><button type="button" className="wallet-section-toggle" onClick={() => toggleSection(group.category)} aria-expanded={!collapsed} aria-label={`${collapsed ? "Expandir" : "Minimizar"} billeteras ${group.category}`}><span>{`Billeteras ${group.category}`}</span>{collapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}</button></th></tr>,
                ...(!collapsed ? group.rows.map(({ row, index }, rowIndex) => <tr key={`${group.category}-${row.holder}-${index}`}><th className="sticky-col holder">{row.holder}</th>{wallets.map((wallet, walletIndex) => renderCell(row, index, wallet, group.category, rowOffsets[groupIndex] + rowIndex, walletIndex))}<td className="total-cell">{money(totals.rows[groupIndex][rowIndex])}</td></tr>) : []),
              ];
            })}
          </tbody>
          <tfoot>
            <tr>
              <th className="sticky-col">Total billetera</th>
              {totals.columns.map((total, index) => (
                <th key={wallets[index]}>{money(total)}</th>
              ))}
              <th className="grand-total">
                {money(totals.columns.reduce((a, b) => a + b, 0))}
              </th>
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  );
}

function BonusesSection({ caja, update, viewRequest, editorRequest }) {
  const [quick, setQuick] = useState("");
  const [recoveredMode, setRecoveredMode] = useState(false);
  const [publicityMode, setPublicityMode] = useState(false);
  const [open, setOpen] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorAmount, setEditorAmount] = useState("");
  const [editorWithdrawal, setEditorWithdrawal] = useState("");
  const [editorPercent, setEditorPercent] = useState("");
  const [noteId, setNoteId] = useState(null);
  const [deleteIndex, setDeleteIndex] = useState(null);
  const grantedCount = caja.bonuses.filter((bonus) => !bonus.publicity && number(bonus.granted) > 0).length;
  const recoveredCount = caja.bonuses.filter((bonus) => number(bonus.recovered) > 0).length;
  const publicityCount = caja.bonuses.filter((bonus) => bonus.publicity && number(bonus.granted) > 0).length;
  useEffect(() => {
    if (viewRequest) setOpen(true);
  }, [viewRequest]);
  useEffect(() => {
    if (editorRequest) openBonusEditor();
  }, [editorRequest]);
  const publicity = caja.bonuses.reduce((s, x) => s + (x.publicity ? number(x.granted) : 0), 0);
  const granted = caja.bonuses.reduce((s, x) => s + (x.publicity ? 0 : number(x.granted)), 0);
  const recovered = caja.bonuses.reduce((s, x) => s + number(x.recovered), 0);
  const shiftStart = { Noche: 0, Mañana: 8, Tarde: 16 }[caja.shift] ?? 0;
  const bonusSlots = Array.from({ length: 4 }, (_, slot) => {
    const start = (shiftStart + slot * 2) % 24;
    const end = (start + 2) % 24;
    const label = `${String(start).padStart(2, "0")}:00 - ${String(end).padStart(2, "0")}:00`;
    const items = caja.bonuses.slice().reverse().map((bonus) => ({ bonus, index: caja.bonuses.indexOf(bonus) })).filter(({ bonus }) => {
      return bonusSlotFor(bonus.createdAt, caja.date, shiftStart) === slot;
    });
    return { label, items };
  });
  const addBonus = (event) => {
    if (!["Enter", "+", "-"].includes(event.key) || !parseNumberInput(quick)) return;
    event.preventDefault();
    const recovered = event.key === "+" || (event.key !== "-" && recoveredMode);
    const publicity = !recovered && (event.key === "-" || publicityMode);
    update({
      bonuses: [
        ...caja.bonuses,
        {
          id: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
          label: "",
          granted: recovered ? 0 : parseNumberInput(quick),
          recovered: recovered ? parseNumberInput(quick) : 0,
          publicity,
          verified: false,
        },
      ],
    });
    setQuick("");
    setRecoveredMode(false);
    setPublicityMode(false);
  };
  const editBonus = (index, patch) => {
    const bonuses = structuredClone(caja.bonuses);
    bonuses[index] = { ...bonuses[index], ...patch };
    update({ bonuses });
  };
  const removeBonus = (index) => {
    update({ bonuses: caja.bonuses.filter((_, itemIndex) => itemIndex !== index) });
    setNoteId(null);
    setDeleteIndex(null);
  };
  const openBonusEditor = () => {
    setEditorAmount("");
    setEditorWithdrawal("");
    setEditorPercent("");
    setRecoveredMode(false);
    setPublicityMode(false);
    setEditorOpen(true);
  };
  const cycleMode = () => {
    if (recoveredMode) {
      setRecoveredMode(false);
      setPublicityMode(true);
    } else if (publicityMode) {
      setPublicityMode(false);
    } else {
      setRecoveredMode(true);
    }
  };
  const calculatedBonusAmount = Math.ceil(number(editorAmount) * (number(editorPercent) > 0 ? number(editorPercent) / 100 : 1));
  const addEditedBonus = () => {
    const amountValue = number(editorAmount);
    const withdrawalValue = number(editorWithdrawal);
    const percentValue = number(editorPercent);
    
    if (!amountValue || (recoveredMode && !withdrawalValue)) return;
    const amount = calculatedBonusAmount;
    if (!amount) return;
    update({
      bonuses: [
        ...caja.bonuses,
        {
          id: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
          label: "",
          granted: recoveredMode ? 0 : amount,
          recovered: recoveredMode ? amount : 0,
          publicity: !recoveredMode && publicityMode,
          verified: false,
        },
      ],
    });
    setEditorOpen(false);
  };
  return (
    <section className="panel">
      <SectionHead
        icon={<Gift size={18} />}
        title="Bonos"
        meta={`Bonos: ${grantedCount} Otorgados | ${recoveredCount} Recuperados | ${publicityCount} Publicidad`}
        action={
          <div className="bonus-actions">
            <button className="icon-button" title="Agregar bono" onClick={openBonusEditor}>
              <Plus size={16} />
            </button>
            <button className="icon-button" title="Ver y editar bonos" onClick={() => setOpen(true)}>
              <Eye size={16} />
            </button>
          </div>
        }
      />
      <div className="bonus-quick">
        <div className={`quick-amount ${recoveredMode ? "recovered" : publicityMode ? "publicity" : "granted"}`}>
          <span>$</span>
          <input
            value={quick}
            placeholder={`Insertar Bono ${recoveredMode ? "Recuperado" : publicityMode ? "Publicidad" : "Otorgado"}`}
            inputMode="decimal"
            onChange={(e) => setQuick(e.target.value)}
            onBlur={() => setQuick(formatNumberInput(quick))}
            onKeyDown={addBonus}
          />
        </div>
        <button
          className={`bonus-toggle ${recoveredMode ? "checked recovered" : publicityMode ? "checked publicity" : "granted"}`}
          title="Cambiar entre otorgado, recuperado y publicidad"
          onClick={cycleMode}
          onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addBonus(event); } }}
        >
          <ArrowUpDown size={13} />
        </button>
      </div>
      {editorOpen && (
        <div className="modal-backdrop" onClick={() => setEditorOpen(false)}>
          <div className="modal bonus-editor-modal" onClick={(event) => event.stopPropagation()}>
            <button className="modal-close" onClick={() => setEditorOpen(false)} title="Cancelar"><X size={18} /></button>
            <div className={`modal-icon ${recoveredMode ? "green" : publicityMode ? "publicity" : "orange"}`}><Gift size={22} /></div>
            <h2>Agregar bono</h2>
            <p>Ingresá un valor, aplicá un porcentaje (opcional)

 y confirmá el bono.</p>
            <div className="bonus-editor-fields">
              <label className={`bonus-editor-withdrawal ${recoveredMode ? "visible" : "placeholder"}`} aria-hidden={!recoveredMode}>
                <span>Monto a retirar</span>
                <AmountInput value={editorWithdrawal} onChange={setEditorWithdrawal} />
              </label>
              <div className="bonus-editor-fields-divider" />
              <label className="bonus-editor-value-field">
                <span>Valor</span>
                <AmountInput value={editorAmount} onChange={setEditorAmount} />
              </label>
              <label>
                <span>Porcentaje (opcional)
</span>
                <div className="percent-input">
                  <NumericInput value={editorPercent} onChange={setEditorPercent} zeroPlaceholder="0" />
                  <b>%</b>
                </div>
              </label>
            </div>
            <div className={`bonus-editor-type ${recoveredMode ? "recovered" : publicityMode ? "publicity" : "granted"}`}>
              <span>{recoveredMode ? "Bono recuperado" : publicityMode ? "Bono publicidad" : "Bono otorgado"}</span>
              <button className={`bonus-toggle ${recoveredMode ? "checked recovered" : publicityMode ? "checked publicity" : "granted"}`} title="Cambiar tipo" onClick={cycleMode}>
                <ArrowUpDown size={13} />
              </button>
            </div>
            <span className="bonus-editor-label">Sumar al valor</span>
            <div className="bonus-shortcuts">
              {[100, 500, 1000, 2500, 5000, 10000].map((value) => (
                <button key={value} onClick={() => setEditorAmount((current) => current + value)}>{formatNumberInput(value)}</button>
              ))}
            </div>
            <div className={`bonus-editor-preview ${!recoveredMode && (number(editorPercent) === 0 || number(editorPercent) === 100) ? "single-row" : ""}`}>
              <div className={`bonus-editor-complete ${!recoveredMode && (number(editorPercent) === 0 || number(editorPercent) === 100) ? "placeholder" : ""}`}>
                <span>{recoveredMode ? "Retiro completo" : "Carga completa"}</span>
                <b>{recoveredMode ? money(number(editorWithdrawal) - calculatedBonusAmount) : money(number(editorAmount) + calculatedBonusAmount)}</b>
              </div>
              <div className="bonus-editor-preview-row">
                <span>{recoveredMode ? "Bono a recuperar" : "Bono a agregar"}</span>
                <b>{money(calculatedBonusAmount)}</b>
              </div>
            </div>
            <div className="modal-actions">
              <button className="ghost-button" onClick={() => setEditorOpen(false)}>Cancelar</button>
              <button className="close-button" onClick={addEditedBonus}>Listo <Check size={16} /></button>
            </div>
          </div>
        </div>
      )}
      {open && (
        <div className="modal-backdrop" onClick={() => setOpen(false)}>
          <div className="modal bonus-modal" onClick={(event) => event.stopPropagation()}>
            <button className="modal-close" onClick={() => setOpen(false)}><X size={18} /></button>
            <div className="modal-icon"><Gift size={22} /></div>
            <h2>Bonos del turno</h2>
            <p>Revisá el monto, cambiá su tipo con el check y agregá una nota si hace falta.</p>
        <div className="bonus-list">
          {caja.bonuses.length === 0 && <div className="empty-state">Todavía no hay bonos cargados.</div>}
          {bonusSlots.map((slot) => (
            <section className="bonus-time-column" key={slot.label}>
              <h3>{slot.label}</h3>
              <div className="bonus-time-bonuses">
                {slot.items.length === 0 && <span className="bonus-slot-empty">Sin bonos</span>}
                {slot.items.map(({ bonus, index }) => <div className={`bonus-row ${bonus.recovered > 0 ? "recovered" : bonus.publicity ? "publicity" : "granted"}`} key={bonus.id}>
              <time className="movement-time">{formatMovementTime(bonus.createdAt)}</time>
              <AmountInput
                value={bonus.recovered || bonus.granted}
                onChange={(value) => editBonus(index, bonus.recovered > 0 ? { recovered: value, granted: 0 } : { granted: value, recovered: 0 })}
              />
              <button
                className={`bonus-toggle ${bonus.recovered > 0 ? "checked recovered" : bonus.publicity ? "checked publicity" : "granted"}`}
                title="Cambiar entre otorgado y recuperado"
                onClick={() => editBonus(index, bonus.recovered > 0 ? { recovered: 0, granted: bonus.recovered, publicity: true } : bonus.publicity ? { granted: bonus.granted, recovered: 0, publicity: false } : { granted: 0, recovered: bonus.granted, publicity: false })}
              >
                <ArrowUpDown size={13} />
              </button>
              <button className={`note-button ${bonus.note ? "has-note" : ""}`} title="Agregar nota" onClick={() => setNoteId(noteId === bonus.id ? null : bonus.id)}>
                <FileText size={14} />
              </button>
              <button className="delete-button" title="Eliminar bono" onClick={() => setDeleteIndex(index)}>
                <Trash2 size={14} />
              </button>
              {noteId === bonus.id && (
                <input
                  className="note-input"
                  placeholder="Nota del bono"
                  value={bonus.note}
                  onChange={(e) => editBonus(index, { note: e.target.value })}
                />
              )}
                </div>)}
              </div>
            </section>
          ))}
        </div>
            <div className="modal-actions"><button className="close-button" onClick={() => setOpen(false)}>Listo <Check size={16} /></button></div>
          </div>
        </div>
      )}
      <div className="recent-bonuses">
        <span className="recent-bonuses-title">Últimos bonos</span>
        {caja.bonuses.slice().reverse().map((bonus, reverseIndex) => {
          const isRecovered = number(bonus.recovered) > 0;
          const bonusIndex = caja.bonuses.length - 1 - reverseIndex;
          const amount = isRecovered ? bonus.recovered : bonus.granted;
          return (
            <div className={`recent-bonus ${isRecovered ? "recovered" : bonus.publicity ? "publicity" : "granted"}`} key={bonus.id}>
              <span>{isRecovered ? "Recuperado" : bonus.publicity ? "Publicidad" : "Otorgado"}</span>
              <div className="recent-bonus-value"><span className="recent-bonus-time">{formatMovementTime(bonus.createdAt)} -</span><input
                  className="recent-bonus-amount"
                  defaultValue={money(amount)}
                  aria-label={`Valor del bono ${isRecovered ? "recuperado" : "otorgado"}`}
                  inputMode="decimal"
                  onFocus={(event) => { event.currentTarget.value = formatNumberInput(amount); event.currentTarget.select(); }}
                  onBlur={(event) => { const value = parseNumberInput(event.currentTarget.value); if (!value) { removeBonus(bonusIndex); return; } event.currentTarget.value = money(value); editBonus(bonusIndex, isRecovered ? { recovered: value, granted: 0 } : { granted: value, recovered: 0 }); }}
                  onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); }}
                /></div>
            </div>
          );
        })}
        {caja.bonuses.length === 0 && <span className="recent-empty">Sin movimientos todavía</span>}
      </div>
      <div className="totals-line bonus-total">
        <span>
          Otorgados <b>{money(granted)}</b>
        </span>
        <span>
          Recuperados <b>{money(recovered)}</b>
        </span>
        <span>
          Publicidad <b>{money(publicity)}</b>
        </span>
        <strong>
          Neto <b>{money(granted - recovered)}</b>
        </strong>
      </div>
      {deleteIndex !== null && <ConfirmDialog message="¿Seguro que querés eliminar este bono?" onCancel={() => setDeleteIndex(null)} onConfirm={() => removeBonus(deleteIndex)} />}
    </section>
  );
}

function QuickMovementSection({ title, tone, rows, update, kind, config }) {
  const [quick, setQuick] = useState("");
  const [quickNotes, setQuickNotes] = useState("");
  const [quickUser, setQuickUser] = useState("");
  const [quickCategory, setQuickCategory] = useState(config.expenses[0]?.name || "Gasto");
  const [open, setOpen] = useState(false);
  const [deleteIndex, setDeleteIndex] = useState(null);
  const isExpense = kind === "expenses";
  const expenseOptions = config.expenses.filter((expense) => expense.name.trim());
  const movementDetail = (row) => (isExpense ? [row.category, row.notes] : [row.user, row.notes]).filter(Boolean).join(" · ");
  const movementIcon = kind === "expenses" ? <ReceiptText size={20} /> : kind === "tips" ? <Coins size={20} /> : <ArrowDownToLine size={20} />;
  const total = rows.reduce((sum, row) => {
    const expense = isExpense && config.expenses.find((item) => item.name === row.category);
    return sum + number(row.amount) * (expense?.inverted ? -1 : 1);
  }, 0);
  const add = () => {
    if (!parseNumberInput(quick)) return;
    const row = isExpense
      ? { id: crypto.randomUUID(), category: quickCategory, amount: parseNumberInput(quick), notes: quickNotes, createdAt: new Date().toISOString() }
      : { id: crypto.randomUUID(), notes: quickNotes, amount: parseNumberInput(quick), user: quickUser || "Cajero", createdAt: new Date().toISOString() };
    update({ [kind]: [...rows, row] });
    setQuick("");
    setQuickNotes("");
    setQuickUser("");
  };
  const submitOnEnter = (event) => {
    if (event.key === "Enter" && parseNumberInput(quick)) {
      event.preventDefault();
      add();
    }
  };
  const editRow = (index, patch) => {
    const next = structuredClone(rows);
    next[index] = { ...next[index], ...patch };
    update({ [kind]: next });
  };
  const removeRow = (index) => {
    update({ [kind]: rows.filter((_, itemIndex) => itemIndex !== index) });
    setDeleteIndex(null);
  };
  return (
    <section className={`panel compact movement-section ${isExpense ? "expense-movement" : "income-movement"}`}>
      <SectionHead
        icon={
          kind === "expenses" ? <ReceiptText size={18} /> : kind === "tips" ? <Coins size={18} /> : <ArrowDownToLine size={18} />
        }
        title={title}
        meta={`${rows.length} registros`}
        action={
          <button
            className="icon-button"
            title="Ver y editar registros"
            onClick={() => setOpen(true)}
          >
            <Eye size={16} />
          </button>
        }
      />
      <div className="quick-movement-input">
        {isExpense ? <select value={quickCategory} onChange={(e) => setQuickCategory(e.target.value)} onKeyDown={submitOnEnter}>{expenseOptions.map((expense) => <option key={expense.name}>{expense.name}</option>)}</select> : null}
        {!isExpense ? <input className="quick-user" value={quickUser} placeholder="Usuario" onChange={(e) => setQuickUser(e.target.value)} onKeyDown={submitOnEnter} /> : null}
        <div className={`quick-amount ${tone}`}><span>$</span><input value={quick} placeholder="Monto" inputMode="decimal" onChange={(e) => setQuick(e.target.value)} onBlur={() => setQuick(formatNumberInput(quick))} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); add(); } }} /></div>
        <input className="quick-detail" value={quickNotes} placeholder="Notas" onChange={(e) => setQuickNotes(e.target.value)} onKeyDown={submitOnEnter} />
        <button className="send-button" title="Enviar" onClick={add}><Send size={15} /></button>
      </div>
      <div className="recent-movements"><span>Últimos {title.toLowerCase()}</span>{rows.slice().reverse().map((row) => <div className="recent-movement" key={row.id}><span>{movementDetail(row)}</span><b>{money(row.amount)}</b></div>)}{rows.length === 0 && <small>Sin movimientos todavía</small>}</div>
      <div className="movement-total">
        <span>Total</span>
        <b className={tone === "red" ? "negative" : ""}>{money(total)}</b>
      </div>
        {open && <div className="modal-backdrop" onClick={() => setOpen(false)}><div className="modal movement-modal" onClick={(event) => event.stopPropagation()}><button className="modal-close" onClick={() => setOpen(false)}><X size={18} /></button><div className={`modal-icon ${tone}`}>{movementIcon}</div><h2>{title} del turno</h2><p>Editá los datos completos de cada movimiento.</p><div className="movement-edit-list">{rows.length === 0 && <div className="empty-state">Todavía no hay movimientos.</div>}{rows.map((row, index) => <div className="movement-edit-row" key={row.id}><time className="movement-time">{formatMovementTime(row.createdAt)}</time>{isExpense && <select value={row.category} onChange={(e) => editRow(index, { category: e.target.value })}>{expenseOptions.map((expense) => <option key={expense.name}>{expense.name}</option>)}</select>}{!isExpense && <input placeholder="Usuario" value={row.user} onChange={(e) => editRow(index, { user: e.target.value })}/>}<AmountInput value={row.amount} onChange={(value) => editRow(index, { amount: value })} /><input placeholder="Notas" value={row.notes} onChange={(e) => editRow(index, { notes: e.target.value })} /><button className="delete-button" title={`Eliminar ${title.toLowerCase()}`} onClick={() => setDeleteIndex(index)}><Trash2 size={14}/></button></div>)}</div><div className="modal-actions"><button className="close-button" onClick={() => setOpen(false)}>Listo <Check size={16} /></button></div></div></div>}
      {deleteIndex !== null && <ConfirmDialog message={`¿Seguro que querés eliminar este registro de ${title}?`} onCancel={() => setDeleteIndex(null)} onConfirm={() => removeRow(deleteIndex)} />}
    </section>
  );
}

function FoundMoneySection({ caja, update, config }) {
  const [amount, setAmount] = useState("");
  const [holder, setHolder] = useState("");
  const [wallet, setWallet] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const records = Array.isArray(caja.foundMoney) ? caja.foundMoney : (number(caja.found) ? [{ id: "legacy-found", amount: caja.found }] : []);
  const availableWallets = holder ? config.accounts.wallets.filter((item) => config.accounts.availability[holder]?.[item] !== false) : [];
  const add = () => {
    if (!parseNumberInput(amount) || (!holder && !wallet && !note.trim())) { setError("Completá el monto y al menos un dato."); return; }
    update({ foundMoney: [...records, { id: crypto.randomUUID(), amount: parseNumberInput(amount), holder, wallet, note: note.trim(), createdAt: new Date().toISOString() }] });
    setAmount(""); setHolder(""); setWallet(""); setNote(""); setError("");
  };
  const remove = (index) => update({ foundMoney: records.filter((_, itemIndex) => itemIndex !== index) });
  const editRecord = (index, patch) => { const next = structuredClone(records); next[index] = { ...next[index], ...patch }; update({ foundMoney: next }); };
  const detail = (record) => [record.holder, record.wallet, record.note].filter(Boolean).join(" · ") || "Sin detalle";
  return <section className="panel compact found-money-section">
    <SectionHead icon={<Banknote size={18} />} title="Dinero encontrado" meta={`${records.length} registros`} action={<button className="icon-button" title="Ver y editar dinero encontrado" onClick={() => setOpen(true)}><Eye size={16} /></button>} />
    <div className="found-money-input">
      <select value={holder} onChange={(event) => { const nextHolder = event.target.value; const nextWallets = nextHolder ? config.accounts.wallets.filter((item) => config.accounts.availability[nextHolder]?.[item] !== false) : []; setHolder(nextHolder); if (!nextWallets.includes(wallet)) setWallet(""); }}><option value="">Titular</option>{config.accounts.holders.map((item) => <option key={item}>{item}</option>)}</select>
      <select value={wallet} disabled={!holder} onChange={(event) => setWallet(event.target.value)}><option value="">Billetera</option>{availableWallets.map((item) => <option key={item}>{item}</option>)}</select>
      <AmountInput value={amount} onChange={setAmount} />
      <input value={note} placeholder="Nota" onChange={(event) => setNote(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") add(); }} />
      <button className="send-button" title="Agregar dinero encontrado" onClick={add}><Send size={15} /></button>
    </div>
    {error && <small className="transfer-error found-money-error">{error}</small>}
    <div className="recent-movements"><span>Últimos registros</span>{records.slice().reverse().map((record) => <div className="recent-movement" key={record.id}><span>{detail(record)}</span><b>{money(record.amount)}</b></div>)}{records.length === 0 && <small>Sin movimientos todavía</small>}</div>
    <div className="movement-total"><span>Total</span><b>{money(records.reduce((sum, record) => sum + number(record.amount), 0))}</b></div>
    {open && <div className="modal-backdrop" onClick={() => setOpen(false)}><div className="modal movement-modal" onClick={(event) => event.stopPropagation()}><button className="modal-close" onClick={() => setOpen(false)}><X size={18} /></button><div className="modal-icon"><Banknote size={22} /></div><h2>Dinero encontrado del turno</h2><p>Revisá o editá los registros encontrados.</p><div className="movement-edit-list">{records.length === 0 && <div className="empty-state">Todavía no hay registros.</div>}{records.map((record, index) => { const recordWallets = record.holder ? config.accounts.wallets.filter((item) => config.accounts.availability[record.holder]?.[item] !== false) : []; return <div className="movement-edit-row found-money-edit-row" key={record.id}><time className="movement-time">{formatMovementTime(record.createdAt)}</time><select value={record.holder || ""} onChange={(event) => { const nextHolder = event.target.value; const nextWallets = nextHolder ? config.accounts.wallets.filter((item) => config.accounts.availability[nextHolder]?.[item] !== false) : []; editRecord(index, { holder: nextHolder, wallet: nextWallets.includes(record.wallet) ? record.wallet : "" }); }}><option value="">Titular</option>{config.accounts.holders.map((item) => <option key={item}>{item}</option>)}</select><select value={record.wallet || ""} disabled={!record.holder} onChange={(event) => editRecord(index, { wallet: event.target.value })}><option value="">Billetera</option>{recordWallets.map((item) => <option key={item}>{item}</option>)}</select><input value={record.note || ""} placeholder="Nota" onChange={(event) => editRecord(index, { note: event.target.value })} /><AmountInput value={record.amount} onChange={(value) => editRecord(index, { amount: value })} /><button className="delete-button" title="Eliminar dinero encontrado" onClick={() => remove(index)}><Trash2 size={14} /></button></div>; })}</div><div className="modal-actions"><button className="close-button" onClick={() => setOpen(false)}>Listo <Check size={16} /></button></div></div></div>}
  </section>;
}

function ChipsSection({ caja, update, config }) {
  const [loadOpen, setLoadOpen] = useState(false);
  const [loadsEditorOpen, setLoadsEditorOpen] = useState(false);
  const [loadAmount, setLoadAmount] = useState("");
  const [loadPlatform, setLoadPlatform] = useState(caja.chips[0]?.platform || "");
  const chipLoads = caja.chipLoads || [];
  const visibleChips = caja.chips.filter((chip) => enabledPlatformsFor(config).includes(chip.platform));
  const totalBalance = caja.chips.reduce(
    (sum, chip) => sum + number(chip.initial) - number(chip.final),
    0,
  );
  const addChipLoad = () => {
    const amount = parseNumberInput(loadAmount);
    if (!amount || !loadPlatform) return;
    const chips = structuredClone(caja.chips);
    const chip = chips.find((item) => item.platform === loadPlatform);
    if (!chip) return;
    chip.initial = number(chip.initial) + amount;
    update({ chips, chipLoads: [...chipLoads, { id: crypto.randomUUID(), platform: loadPlatform, amount, createdAt: new Date().toISOString() }] });
    setLoadAmount("");
    setLoadOpen(false);
  };
  const updateChipLoads = (nextLoads) => {
    const chips = structuredClone(caja.chips);
    chips.forEach((chip) => {
      const previousLoads = chipLoads.filter((load) => load.platform === chip.platform).reduce((sum, load) => sum + number(load.amount), 0);
      const nextPlatformLoads = nextLoads.filter((load) => load.platform === chip.platform).reduce((sum, load) => sum + number(load.amount), 0);
      chip.initial = number(chip.initial) - previousLoads + nextPlatformLoads;
    });
    update({ chips, chipLoads: nextLoads });
  };
  return (
    <section className="panel compact chips-panel">
      <SectionHead
        icon={<Ticket size={18} />}
        title="Control de fichas"
        meta={`${chipLoads.length} carga${chipLoads.length === 1 ? "" : "s"} de fichas`}
        action={<div className="chips-actions"><button className="icon-button" title="Agregar carga de fichas" onClick={() => setLoadOpen(true)}><Plus size={16} /></button><button className="icon-button" title="Ver y editar cargas de fichas" onClick={() => setLoadsEditorOpen(true)}><Eye size={16} /></button></div>}
      />
      <div className="chips-head">
        <span>Plataforma</span>
        <span>Inicial</span>
        <span>Final</span>
        <span>Saldo</span>
      </div>
      <div className="chips-list">
        {visibleChips.map((chip) => (
          <div className="chip-row" key={chip.platform} style={{ "--platform-accent": boxColorStyle(config.platformColors?.[chip.platform] || "teal")["--box-accent"] }}>
            <b>{chip.platform}</b>
            <span className="readonly-amount chip-initial-input">{money(chip.initial)}</span>
            <AmountInput
              value={chip.final}
              onChange={(value) => {
                const chips = structuredClone(caja.chips);
                const chipIndex = chips.findIndex((item) => item.platform === chip.platform);
                if (chipIndex < 0) return;
                chips[chipIndex].final = value;
                update({ chips });
              }}
            />
            <strong
              className={chip.initial - chip.final < 0 ? "negative" : "positive"}
            >
              {money(number(chip.initial) - number(chip.final))}
            </strong>
          </div>
        ))}
      </div>
      {chipLoads.length > 0 && <div className="chip-loads"><span className="chip-loads-title">Cargas de fichas</span>{chipLoads.slice().reverse().map((load) => <div className="chip-load-row" key={load.id}><span>{load.platform}</span><b>+{money(load.amount)}</b></div>)}</div>}
      <div className="movement-total chips-total">
        <span>Total saldo</span>
        <b className={totalBalance < 0 ? "negative" : "positive"}>{money(totalBalance)}</b>
      </div>
      {loadOpen && <div className="modal-backdrop" onClick={() => setLoadOpen(false)}><div className="modal chip-load-modal" onClick={(event) => event.stopPropagation()}><button className="modal-close" title="Cerrar" onClick={() => setLoadOpen(false)}><X size={18} /></button><div className="modal-icon"><Ticket size={22} /></div><h2>Carga de fichas</h2><p>Sumá fichas al inicio de este turno.</p><div className="chip-load-fields"><label><span>Monto</span><AmountInput value={loadAmount} onChange={setLoadAmount} /></label><label><span>Plataforma</span><select value={loadPlatform} onChange={(event) => setLoadPlatform(event.target.value)}>{visibleChips.map((chip) => <option key={chip.platform}>{chip.platform}</option>)}</select></label></div><div className="modal-actions"><button className="ghost-button" onClick={() => setLoadOpen(false)}>Cancelar</button><button className="close-button" onClick={addChipLoad}>Cargar <Check size={16} /></button></div></div></div>}
      {loadsEditorOpen && <div className="modal-backdrop" onClick={() => setLoadsEditorOpen(false)}><div className="modal chip-load-editor-modal" onClick={(event) => event.stopPropagation()}><button className="modal-close" title="Cerrar" onClick={() => setLoadsEditorOpen(false)}><X size={18} /></button><div className="modal-icon"><Ticket size={22} /></div><h2>Cargas de fichas</h2><p>Modificá o eliminá las cargas de este turno.</p><div className="chip-load-edit-list">{chipLoads.length === 0 && <div className="empty-state">Todavía no hay cargas.</div>}{chipLoads.map((load, index) => <div className="chip-load-edit-row" key={load.id}><time className="movement-time">{formatMovementTime(load.createdAt)}</time><b>{load.platform}</b><AmountInput value={load.amount} onChange={(value) => updateChipLoads(chipLoads.map((item, itemIndex) => itemIndex === index ? { ...item, amount: value } : item))} /><button className="delete-button" title="Eliminar carga" onClick={() => updateChipLoads(chipLoads.filter((_, itemIndex) => itemIndex !== index))}><Trash2 size={14} /></button></div>)}</div><div className="modal-actions"><button className="close-button" onClick={() => setLoadsEditorOpen(false)}>Listo <Check size={16} /></button></div></div></div>}
    </section>
  );
}

function WalletRoute({ caja, config, onUpdateAccounts }) {
  const [pendingWallet, setPendingWallet] = useState(null);
  const stateFor = (row, wallet) => {
    const state = row.verified?.[wallet];
    return typeof state === "object" ? state : { collections: Boolean(state), withdrawals: false };
  };
  const dateValue = (value) => value ? new Date(value).getTime() : 0;
  const logisticsOrder = config.logistics?.order || [];
  const isNormalWallet = (row, wallet) => config.accounts.availability[row.holder]?.[wallet] !== false && (config.accounts.walletSettings[row.holder]?.[wallet]?.category || "Normal") === "Normal" && config.accounts.walletModes?.[wallet] !== "Solo Depósito";
  const isPaymentWallet = (wallet) => config.accounts.walletModes?.[wallet] === "Cobros + Retiros";
  const items = caja.accounts.flatMap((row) => config.accounts.wallets.filter((wallet) => isNormalWallet(row, wallet)).map((wallet) => ({
    key: `${row.holder}::${wallet}`,
    holder: row.holder,
    wallet,
    state: stateFor(row, wallet),
    balance: number(row.values?.[wallet]),
    paymentWallet: isPaymentWallet(wallet),
    restart: row.walletRestartAt?.[wallet] || [stateFor(row, wallet).lastCollectionsAt, stateFor(row, wallet).lastWithdrawalsAt, row.walletBoxUpdatedAt?.[wallet]].sort((first, second) => dateValue(second) - dateValue(first))[0],
  }))).sort((first, second) => {
    const firstIndex = logisticsOrder.indexOf(first.key);
    const secondIndex = logisticsOrder.indexOf(second.key);
    return (firstIndex < 0 ? Number.MAX_SAFE_INTEGER : firstIndex) - (secondIndex < 0 ? Number.MAX_SAFE_INTEGER : secondIndex);
  });
  if (!items.length) return null;
  const inUseIndexes = items.map((item, index) => item.state.collections ? index : -1).filter((index) => index >= 0);
  const currentIndex = inUseIndexes.length === 0 ? 0 : inUseIndexes.find((index) => {
    const previous = (index - 1 + items.length) % items.length;
    const next = (index + 1) % items.length;
    return inUseIndexes.includes(previous) && !inUseIndexes.includes(next);
  }) ?? inUseIndexes[0];
  const currentItem = items[currentIndex];
  const previous = items
    .filter((item) => item.key !== currentItem.key)
    .sort((first, second) => dateValue(second.restart) - dateValue(first.restart))
    .slice(0, 2);
  const route = [0, 1, 2].map((offset) => items[(currentIndex + offset) % items.length]);
  const hasPaymentBalance = items.some((item) => item.paymentWallet && item.balance > 0);
  const recommendationPool = hasPaymentBalance ? items : items.filter((item) => item.paymentWallet);
  const recommended = recommendationPool.filter((item) => item.key !== currentItem.key).sort((first, second) => dateValue(first.restart) - dateValue(second.restart))[0] || recommendationPool[0] || currentItem;
  const recommendationReason = !hasPaymentBalance && recommended.paymentWallet ? "Reinicio más antiguo de billetera de pagos" : "Reinicio más antiguo";
  const formatRestart = (value) => value ? new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(value)) : "Sin reinicio";
  const markInUse = (target) => {
    const now = new Date().toISOString();
    const accounts = structuredClone(caja.accounts);
    accounts.forEach((row) => {
      const normalWallets = config.accounts.wallets.filter((wallet) => isNormalWallet(row, wallet));
      normalWallets.forEach((wallet) => {
        const item = items.find((candidate) => candidate.holder === row.holder && candidate.wallet === wallet);
        if (!item) return;
        const previous = stateFor(row, wallet);
        const nextState = { ...previous, collections: item.key === target.key };
        if (previous.collections !== nextState.collections) {
          if (previous.collections) nextState.lastCollectionsAt = now;
          row.walletRestartAt = { ...(row.walletRestartAt || {}), [wallet]: now };
        }
        row.verified = { ...(row.verified || {}), [wallet]: nextState };
      });
    });
    onUpdateAccounts(accounts);
  };
  const requestInUse = (target) => setPendingWallet(target);
  const moveRoute = (offset) => requestInUse(items[(currentIndex + offset + items.length) % items.length]);

  return <section className="panel wallet-route" aria-label="Seguimiento de billeteras">
    <div className="wallet-route-title"><h2><WalletCards size={16} /> Logística</h2></div>
    <div className="wallet-recommendation"><span><WalletCards size={15} /> Billetera recomendada</span><strong>{recommended.holder} · {recommended.wallet}</strong><small>{recommendationReason} · {formatRestart(recommended.restart)}</small></div>
    <div className="wallet-route-head"><h2><WalletCards size={16} /> Próximas Billeteras</h2><span>Ruta normal</span><div className="wallet-route-actions"><button type="button" title="Billetera anterior" onClick={() => moveRoute(-1)}><ArrowLeft size={13} /> Anterior</button><button type="button" title="Próxima billetera" onClick={() => moveRoute(1)}>Próxima <ArrowRight size={13} /></button><button type="button" title="Usar billetera recomendada" onClick={() => requestInUse(recommended)}><WalletCards size={13} /> Recomendada</button></div></div>
    <div className="wallet-route-list">{previous.map((item, index) => <div className="wallet-route-item history" key={`previous-${item.key}`}><span className="wallet-route-index">-{index + 1}</span><strong>{item.holder} · {item.wallet}</strong></div>)}{route.map((item, index) => <div className={`wallet-route-item ${index === 0 ? "current" : "clickable"}`} key={`${item.key}-${index}`} onClick={() => index > 0 && requestInUse(item)} role={index > 0 ? "button" : undefined} tabIndex={index > 0 ? 0 : undefined} onKeyDown={(event) => { if (index > 0 && (event.key === "Enter" || event.key === " ")) requestInUse(item); }}><span className="wallet-route-index">{index === 0 ? "En uso" : `+${index}`}</span><strong>{item.holder} · {item.wallet}</strong>{item.key === recommended.key && <small>Recomendada</small>}</div>)}</div>
    {pendingWallet && <ConfirmDialog dialog={{ message: `¿Desea colocar en uso la billetera ${pendingWallet.holder} · ${pendingWallet.wallet}?`, onConfirm: () => { markInUse(pendingWallet); setPendingWallet(null); } }} onClose={() => setPendingWallet(null)} />}
  </section>;
}

function UserCreateModal({ config, boxes, activeBoxId, userInfoOptionsByBox, onClose, onSave, onNotify }) {
  const [newUser, setNewUser] = useState({ names: [""], phones: [""], titulars: [""], boxes: [activeBoxId], subPlatforms: [], userInfo: null, createdAt: new Date().toISOString() });
  const platformSubPlatforms = config?.platformSubPlatforms || {};
  const boxById = Object.fromEntries((boxes || []).map((box) => [String(box.id), box]));
  const userInfoOptionsFor = (selectedBoxes) => selectedBoxes.flatMap((boxId) => (userInfoOptionsByBox?.[String(boxId)] || []).map((label) => ({ value: `${boxId}::${label}`, label: `${boxById[String(boxId)]?.title || "Caja"} · ${label}` })));
  const userInfoValueFor = (userInfo) => typeof userInfo === "object" ? (userInfo?.boxId && userInfo?.value ? `${userInfo.boxId}::${userInfo.value}` : "") : String(userInfo || "");
  const userInfoFromValue = (value) => { const separator = value.indexOf("::"); return separator < 0 ? null : { boxId: value.slice(0, separator), value: value.slice(separator + 2) }; };
  const subplatformsFor = (boxId) => (config?.platforms || []).flatMap((platform) => (Array.isArray(platformSubPlatforms[platform]) ? platformSubPlatforms[platform] : []).map((sub) => { const name = typeof sub === "string" ? sub : sub?.name || ""; return { key: `${boxId}::${platform}::${name}`, label: name, color: typeof sub === "string" ? (config.platformColors?.[platform] || "teal") : (sub?.color || config.platformColors?.[platform] || "teal") }; }).filter((option) => option.label));
  const updateList = (field, index, value) => setNewUser((current) => ({ ...current, [field]: current[field].map((item, itemIndex) => itemIndex === index ? value : item) }));
  const renderListField = (label, field) => <div className="users-list-field" data-editable="true"><span>{label}</span><div className="users-inline-list">{newUser[field].map((value, index) => <div key={`${field}-${index}`} className="users-list-item"><input value={value} placeholder={label} onChange={(event) => updateList(field, index, event.target.value)} />{index > 0 && <button type="button" className="delete-button" title={`Eliminar ${label}`} onClick={() => setNewUser((current) => ({ ...current, [field]: current[field].filter((_, itemIndex) => itemIndex !== index) }))}><Trash2 size={13} /></button>}</div>)}<button className="config-add" type="button" disabled={!String(newUser[field].at(-1) || "").trim()} onClick={() => setNewUser((current) => ({ ...current, [field]: [...current[field], ""] }))}><Plus size={15} /> {label.includes("Nombre") ? "Agregar Nombre de Usuario" : label.includes("teléfono") ? "Agregar Número de Teléfono" : "Agregar Titular"}</button></div></div>;
  const save = () => {
    const names = newUser.names.map((name) => name.trim()).filter(Boolean);
    const phones = newUser.phones.map((phone) => phone.trim()).filter(Boolean);
    const titulars = newUser.titulars.map((titular) => titular.trim()).filter(Boolean);
    if (!names.length || !phones.length) { onNotify?.("El usuario necesita al menos un nombre y un número de teléfono."); return; }
    if (!userInfoValueFor(newUser.userInfo)) { onNotify?.("El usuario necesita un panel."); return; }
    if (!newUser.boxes.length) { onNotify?.("El usuario necesita al menos una caja."); return; }
    if (!newUser.subPlatforms.length) { onNotify?.("El usuario necesita al menos una plataforma."); return; }
    onSave({ ...newUser, names, phones, titulars, createdAt: new Date(newUser.createdAt).toISOString(), clarifications: [], linkedUsers: [] });
  };
  return <div className="modal-backdrop" onClick={onClose}><div className="modal users-create-modal" onClick={(event) => event.stopPropagation()}><button className="modal-close" type="button" title="Cancelar" onClick={onClose}><X size={18} /></button><div className="modal-icon"><UserPlus size={21} /></div><h2>Nuevo usuario</h2><p>Completá los datos obligatorios para darlo de alta.</p><div className="user-fields-grid"><div>{renderListField("Nombre de usuario *", "names")}</div><div>{renderListField("Número de teléfono *", "phones")}</div><div>{renderListField("Titular", "titulars")}<label className="field-block"><span>Panel</span><select value={userInfoValueFor(newUser.userInfo)} onChange={(event) => setNewUser((current) => ({ ...current, userInfo: userInfoFromValue(event.target.value) }))}><option value="">Sin seleccionar</option>{userInfoOptionsFor(newUser.boxes).map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}</select></label></div><label className="field-block"><span>Fecha creación</span><input type="datetime-local" value={new Date(newUser.createdAt).toISOString().slice(0, 16)} onChange={(event) => setNewUser((current) => ({ ...current, createdAt: new Date(event.target.value).toISOString() }))} /></label></div><div className="user-checks-grid"><div className="check-group"><span>Cajas</span><div className="checkbox-list">{(boxes || []).map((box) => { const checked = newUser.boxes.includes(box.id); return <label className="user-switch" key={box.id} style={{ "--switch-accent": boxColorStyle(box.color)["--box-accent"] }}><input type="checkbox" checked={checked} onChange={() => setNewUser((current) => ({ ...current, boxes: checked ? current.boxes.filter((id) => id !== box.id) : [...current.boxes, box.id], subPlatforms: checked ? current.subPlatforms.filter((key) => !key.startsWith(`${box.id}::`)) : current.subPlatforms }))} /><i /> <span>{box.title}</span></label>; })}</div></div><div className="check-group"><span>Subplataformas</span><div className="checkbox-list subplatforms-grouped">{(boxes || []).filter((box) => newUser.boxes.includes(box.id)).map((box) => { const options = subplatformsFor(box.id); if (!options.length) return null; return <div key={box.id} className="subplatforms-group" style={{ "--box-pill-accent": boxColorStyle(box.color)["--box-accent"] }}><div className="subplatforms-group-title">{box.title}</div>{options.map((option) => <label className="user-switch" key={option.key} style={{ "--switch-accent": boxColorStyle(option.color)["--box-accent"] }}><input type="checkbox" checked={newUser.subPlatforms.includes(option.key)} onChange={() => setNewUser((current) => ({ ...current, subPlatforms: current.subPlatforms.includes(option.key) ? current.subPlatforms.filter((key) => key !== option.key) : [...current.subPlatforms, option.key] }))} /><i /> <span>{option.label}</span></label>)}</div>; })}</div></div></div><div className="modal-actions"><button className="ghost-button" type="button" onClick={onClose}>Cancelar</button><button className="close-button" type="button" onClick={save}>Guardar <Check size={16} /></button></div></div></div>;
}

function MiniUsersPanel({ config, boxes, activeBoxId, onConfigChange, onNotify }) {
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [newUserOpen, setNewUserOpen] = useState(false);
  const users = Array.isArray(config.users) ? config.users : [];
  const boxById = Object.fromEntries((boxes || []).map((box) => [String(box.id), box]));
  const panelValueFor = (user) => typeof user.userInfo === "object" ? user.userInfo?.value : user.userInfo;
  const displayName = (user) => user.names?.filter(Boolean).join(" / ") || user.name || user.titulars?.filter(Boolean).join(" / ") || user.titular || "Usuario sin nombre";
  const visibleUsers = users.filter((user) => `${displayName(user)} ${user.phones?.join(" ") || user.phone || ""} ${user.titulars?.join(" ") || user.titular || ""}`.toLowerCase().includes(search.toLowerCase()));
  const readOnlyUserFields = (label, values, fallback) => <div className="mini-user-readonly-field"><span>{label}</span>{(values.length ? values : [fallback]).map((value, index) => <input readOnly value={value} key={`${label}-${index}`} />)}</div>;
  const subPlatformFor = (key) => {
    const [, platform, name] = key.split("::");
    const sub = (config.platformSubPlatforms?.[platform] || []).find((item) => (typeof item === "string" ? item : item?.name) === name);
    return { name, color: typeof sub === "object" ? sub.color : config.platformColors?.[platform] || "teal" };
  };
  return <section className="panel mini-users-panel">
    <div className="section-head mini-users-head"><div className="section-title"><Users size={18} /><div><h2>Usuarios</h2></div></div></div>
    <div className="mini-users-search"><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar usuario" aria-label="Buscar usuario" /><button className="icon-button" type="button" title="Dar de alta usuario" aria-label="Dar de alta usuario" onClick={() => setNewUserOpen(true)}><UserPlus size={16} /></button></div>
    <div className="mini-users-list">{visibleUsers.map((user) => <button className="mini-user-row" type="button" key={user.id} onClick={() => setSelectedUser(user)}><span className="mini-user-avatar"><UserPlus size={13} /></span><span><strong>{displayName(user)}</strong><small>{user.phones?.[0] || user.phone || "Sin teléfono"}</small></span><ChevronRight size={14} /></button>)}{visibleUsers.length === 0 && <span className="mini-users-empty">No se encontraron usuarios.</span>}</div>
    {selectedUser && <div className="modal-backdrop" onClick={() => setSelectedUser(null)}><div className="modal mini-user-modal user-detail-popup" onClick={(event) => event.stopPropagation()}><button className="modal-close" type="button" title="Cerrar" onClick={() => setSelectedUser(null)}><X size={18} /></button><div className="modal-icon"><Users size={21} /></div><h2>{displayName(selectedUser)}</h2><div className="user-fields-grid mini-user-fields">{readOnlyUserFields("Nombre de usuario", selectedUser.names || [], "Sin nombre")}{readOnlyUserFields("Número de teléfono", selectedUser.phones || [], "Sin teléfono")}{readOnlyUserFields("Titular", selectedUser.titulars || [], "Sin titular")}<label className="field-block"><span>Panel</span><input readOnly value={panelValueFor(selectedUser) || "Sin panel"} /></label><label className="field-block"><span>Fecha creación</span><input readOnly value={selectedUser.createdAt ? new Date(selectedUser.createdAt).toLocaleDateString("es-AR") : "Sin fecha"} /></label></div><div className="user-checks-grid mini-user-sections"><div className="check-group"><span>Cajas</span><div className="mini-user-colored-list">{(selectedUser.boxes || []).map((boxId) => <span key={boxId} style={{ color: boxColorStyle(boxById[String(boxId)]?.color || "teal")["--box-accent"] }}>{boxById[String(boxId)]?.title || "Sin caja"}</span>)}{!selectedUser.boxes?.length && <small>Sin cajas</small>}</div></div><div className="check-group"><span>Plataformas</span><div className="mini-user-colored-list">{(selectedUser.subPlatforms || []).map((key) => { const sub = subPlatformFor(key); return <span key={key} style={{ color: boxColorStyle(sub.color)["--box-accent"] }}>{sub.name}</span>; })}{!selectedUser.subPlatforms?.length && <small>Sin plataformas</small>}</div></div></div><div className="user-clarifications mini-user-block"><span>Aclaraciones</span><div className="mini-user-colored-list">{(selectedUser.clarifications || []).map((id) => { const clarification = config.userClarifications?.find((item) => item.id === id); return <span key={id} style={{ color: boxColorStyle(clarification?.color || "teal")["--box-accent"] }}>{clarification?.emoji || "•"} {clarification?.text || "Aclaración"}</span>; })}{!selectedUser.clarifications?.length && <small>Sin aclaraciones</small>}</div></div><div className="user-linked-section mini-user-block"><span>Usuarios vinculados</span><div className="linked-tags">{(selectedUser.linkedUsers || []).map((id) => users.find((item) => item.id === id)).filter(Boolean).map((user) => <span className="linked-tag" key={user.id}>{displayName(user)}</span>)}{!selectedUser.linkedUsers?.length && <small>Sin vínculos</small>}</div></div><div className="modal-actions"><button className="close-button" type="button" onClick={() => setSelectedUser(null)}>Listo <Check size={16} /></button></div></div></div>}
    {newUserOpen && <UserCreateModal config={config} boxes={boxes} activeBoxId={activeBoxId} userInfoOptionsByBox={{ [String(activeBoxId)]: config.userInfoOptions || [] }} onClose={() => setNewUserOpen(false)} onSave={(user) => { onConfigChange({ ...config, users: [...users, { ...user, id: `user-${crypto.randomUUID()}` }] }); setNewUserOpen(false); onNotify?.("Usuario dado de alta."); }} onNotify={onNotify} />}
  </section>;
}

function MiniBonusesPanel({ config, activeBoxId, api }) {
  const [bonuses, setBonuses] = useState([]);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [sortBy, setSortBy] = useState("percentage");
  const [sortDirection, setSortDirection] = useState("asc");
  const [groupBy, setGroupBy] = useState("type");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const types = config.bonusTypes || [];
  const conditions = config.bonusConditions || [];
  const imageUrl = (id, download = false) => `${import.meta.env.VITE_API_URL || ""}/api/bonos/${id}/imagen?boxId=${activeBoxId}${download ? "&download=1" : "&mini=1"}`;
  useEffect(() => {
    let cancelled = false;
    api(`/api/bonos?boxId=${activeBoxId}`).then((nextBonuses) => { if (!cancelled) setBonuses(nextBonuses); }).catch(() => { if (!cancelled) setBonuses([]); });
    return () => { cancelled = true; };
  }, [activeBoxId]);
  const typeNameFor = (bonus) => types.find((type) => type.id === bonus.typeId)?.name || "Sin tipo";
  const percentageFor = (bonus) => number(bonus.conditions?.at(-1)?.percentage);
  const platformFor = (bonus) => bonus.conditions?.at(-1)?.platform || "Todas";
  const typeOrder = new Map(types.map((type, index) => [type.name, index]));
  const filtered = bonuses.filter((bonus) => (!typeFilter || bonus.typeId === typeFilter) && `${bonus.name} ${typeNameFor(bonus)} ${(bonus.conditions || []).map((item) => `${item.percentage} ${conditions.find((condition) => condition.id === item.conditionId)?.label || ""} ${item.platform || ""}`).join(" ")}`.toLowerCase().includes(search.toLowerCase()));
  const sorted = filtered.slice().sort((left, right) => {
    const values = sortBy === "name" ? [left.name, right.name] : sortBy === "type" ? [typeNameFor(left), typeNameFor(right)] : sortBy === "percentage" ? [percentageFor(left), percentageFor(right)] : [left.createdAt || "", right.createdAt || ""];
    const comparison = typeof values[0] === "number" ? values[0] - values[1] : String(values[0]).localeCompare(String(values[1]), "es", { sensitivity: "base" });
    return (sortDirection === "asc" ? comparison : -comparison) || left.name.localeCompare(right.name, "es", { sensitivity: "base" });
  });
  const groups = sorted.reduce((result, bonus) => {
    const groupValue = groupBy === "type" ? typeNameFor(bonus) : groupBy === "percentage" ? `${percentageFor(bonus)}%` : groupBy === "platform" ? platformFor(bonus) : "Todos los estados";
    const group = result.find((item) => item.label === groupValue);
    if (group) group.items.push(bonus);
    else result.push({ label: groupValue, items: [bonus], value: groupBy === "percentage" ? percentageFor(bonus) : groupValue });
    return result;
  }, []);
  if (groupBy === "percentage") groups.sort((left, right) => left.value - right.value);
  else if (groupBy === "type") groups.sort((left, right) => (typeOrder.get(left.label) ?? Number.MAX_SAFE_INTEGER) - (typeOrder.get(right.label) ?? Number.MAX_SAFE_INTEGER));
  else if (groupBy === "platform") groups.sort((left, right) => left.label.localeCompare(right.label, "es", { sensitivity: "base" }));
  return <section className="panel mini-bonuses-panel">
    <div className="section-head mini-bonuses-head"><div className="section-title"><Gift size={18} /><div><h2>Estados</h2></div></div></div>
    <div className="mini-bonuses-search"><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar bono" aria-label="Buscar bono" /><button className={`filter-toggle mini-bonuses-filter-toggle ${filtersOpen ? "active" : ""}`} type="button" title="Mostrar filtros" aria-label="Mostrar filtros" aria-expanded={filtersOpen} onClick={() => setFiltersOpen((open) => !open)}><SlidersHorizontal size={14} />{(typeFilter || sortBy !== "percentage" || sortDirection !== "asc" || groupBy !== "type") && <i />}</button>{filtersOpen && <div className="bonus-filters mini-bonus-filters"><label><span>Tipo</span><select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}><option value="">Todos los tipos</option>{types.map((type) => <option value={type.id} key={type.id}>{type.name}</option>)}</select></label><label><span>Ordenar por</span><div className="mini-sort-control"><select value={sortBy} onChange={(event) => setSortBy(event.target.value)}><option value="percentage">Porcentaje</option><option value="name">Nombre</option><option value="type">Tipo de bono</option><option value="date">Fecha de alta</option></select><button className="sort-direction" type="button" title={sortDirection === "asc" ? "Orden ascendente" : "Orden descendente"} aria-label={sortDirection === "asc" ? "Cambiar a orden descendente" : "Cambiar a orden ascendente"} onClick={() => setSortDirection((direction) => direction === "asc" ? "desc" : "asc")}>{sortDirection === "asc" ? "↑" : "↓"}</button></div></label><label><span>Agrupar por</span><select value={groupBy} onChange={(event) => setGroupBy(event.target.value)}><option value="type">Tipo de bono</option><option value="percentage">Porcentaje</option><option value="platform">Plataforma del porcentaje</option><option value="none">Sin agrupación</option></select></label></div>}</div>
    <div className="mini-bonuses-list">{groups.map((group) => <section className="mini-bonus-group" key={group.label}><div className="mini-bonus-group-heading"><strong>{groupBy === "none" ? "Resultados" : group.label}</strong><span>{group.items.length}</span></div>{group.items.map((bonus) => <article className="mini-bonus-row" key={bonus.id}><div className="mini-bonus-image">{bonus.imagePath ? <img src={imageUrl(bonus.id)} alt={bonus.name} /> : <Gift size={15} />}</div><div className="mini-bonus-info"><strong>{bonus.name}</strong><small>{typeNameFor(bonus)}</small><span>{(bonus.conditions || []).map((item, index) => `${item.percentage}%${item.platform ? ` · ${item.platform}` : ""}${index < bonus.conditions.length - 1 ? " / " : ""}`)}</span></div>{bonus.imagePath && <a className="icon-button" title="Descargar bono" aria-label={`Descargar ${bonus.name}`} href={imageUrl(bonus.id, true)}><Download size={14} /></a>}</article>)}</section>)}{groups.length === 0 && <span className="mini-users-empty">No se encontraron bonos.</span>}</div>
  </section>;
}

function StatisticsPage({ history, config, activeBoxId, boxes, boxHistories, onConfigChange }) {
  const today = new Date();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const dateKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  const dateTimeKey = (date) => `${dateKey(date)}T${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
  const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const endOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59);
  const [startDate, setStartDate] = useState(dateTimeKey(monthStart));
  const [endDate, setEndDate] = useState(dateTimeKey(today));
  const [chartMetric, setChartMetric] = useState("tips");
  const [selectedBar, setSelectedBar] = useState(null);
  const [selectedBoxIds, setSelectedBoxIds] = useState(boxes.map(b => b.id));
  const [combinedView, setCombinedView] = useState(true);
  const setRange = (start, end) => { setStartDate(dateTimeKey(start)); setEndDate(dateTimeKey(end)); setSelectedBar(null); };
  const shortcut = (name) => {
    const current = new Date();
    if (name === "hoy") return setRange(startOfDay(current), current);
    if (name === "ayer") { const day = new Date(current); day.setDate(day.getDate() - 1); return setRange(startOfDay(day), endOfDay(day)); }
    if (name === "semana") { const day = new Date(current); day.setDate(day.getDate() - ((day.getDay() + 6) % 7)); return setRange(startOfDay(day), current); }
    if (name === "mes") return setRange(new Date(current.getFullYear(), current.getMonth(), 1), current);
    setRange(new Date(current.getFullYear(), current.getMonth() - 1, 1), endOfDay(new Date(current.getFullYear(), current.getMonth(), 0)));
  };
  const availableHistories = boxes.map((box) => ({ box, rows: Array.isArray(boxHistories?.[box.id]) ? boxHistories[box.id] : box.id === activeBoxId ? history : [] }));
  const selectedHistories = availableHistories.filter(({ box }) => selectedBoxIds.includes(box.id));
  const filterRows = (rows) => rows.filter((caja) => { const date = new Date(caja.date); return date >= new Date(startDate) && date <= new Date(endDate); });
  const combinedRows = selectedHistories.flatMap(({ rows }) => filterRows(rows));
  const filtered = combinedRows;
  const groupsFor = (rows) => ["Mañana", "Tarde", "Noche"].map((shift) => ({ shift, rows: rows.filter((caja) => caja.shift === shift) }));
  const totalGroup = { shift: "Total", rows: combinedRows };
  const summarize = (rows) => rows.reduce((total, caja) => {
    const values = statisticsFor(caja, config, activeBoxId);
    Object.keys(values).forEach((key) => { if (key !== "expensesByCategory") total[key] = (total[key] || 0) + (typeof values[key] === "number" ? values[key] : 0); });
    Object.entries(values.expensesByCategory).forEach(([key, value]) => { total.expensesByCategory[key] = (total.expensesByCategory[key] || 0) + value; });
    return total;
  }, { expensesByCategory: {} });
  const groups = groupsFor(combinedRows);
  const makeSummaries = (rows) => [{ shift: "Total", rows, values: summarize(rows) }, ...groupsFor(rows).map((group) => ({ ...group, values: summarize(group.rows) }))];
  const summarySets = (combinedView ? [{ box: { id: "combined", title: "Suma seleccionadas" }, rows: combinedRows }] : selectedHistories.map(({ box, rows }) => ({ box, rows: filterRows(rows) }))).map(({ box, rows }) => ({ box, rows, summaries: makeSummaries(rows) }));
  const summaries = summarySets[0]?.summaries || makeSummaries([]);
  const total = summarize(totalGroup.rows) || { expensesByCategory: {} };
  const statistics = config.statistics || { employees: 1, proportionalPercent: 100 };
  const employees = number(statistics.employees) || 1;
  const percent = number(statistics.proportionalPercent);
  const updateStatistics = (patch) => onConfigChange({ ...config, statistics: { ...statistics, ...patch } });
  const metricOptions = [{ key: "tips", label: "Propinas" }, { key: "found", label: "Encontrado" }, { key: "granted", label: "Bonos otorgados" }, { key: "expenses", label: "Salidas" }, { key: "ta", label: "Cargas T.A." }];
  const chartRows = summaries.map((group) => ({ label: group.shift, value: group.values?.[chartMetric] || 0 }));
  const maxChart = Math.max(...chartRows.map((row) => row.value), 1);
  const weekdayOptions = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
  const shiftOptions = ["Noche", "Mañana", "Tarde"];
  const [bonusWeekdays, setBonusWeekdays] = useState([0, 1, 2, 3, 4, 5, 6]);
  const [bonusShifts, setBonusShifts] = useState(shiftOptions);
  const [bonusFromHour, setBonusFromHour] = useState(0);
  const [bonusToHour, setBonusToHour] = useState(23);
  const [bonusResultMode, setBonusResultMode] = useState("all");
  const [bonusMetric, setBonusMetric] = useState("value");
  const toggleBonusFilter = (values, setValues, value) => setValues((current) => current.includes(value) ? current.filter((item) => item !== value) : [...current, value]);
  const bonusRecords = selectedHistories.flatMap(({ rows }) => filterRows(rows).flatMap((caja) => (caja.bonuses || []).map((bonus) => {
    const date = new Date(bonus.createdAt);
    return { date, dateKey: dateKey(date), weekday: date.getDay(), hour: date.getHours(), shift: caja.shift, net: number(bonus.granted) - number(bonus.recovered) };
  }))).filter((record) => !Number.isNaN(record.date.getTime()) && record.date >= new Date(startDate) && record.date <= new Date(endDate) && bonusWeekdays.includes(record.weekday) && bonusShifts.includes(record.shift) && record.hour >= bonusFromHour && record.hour <= bonusToHour && (bonusResultMode === "all" || bonusResultMode === "positive" && record.net > 0 || bonusResultMode === "negative" && record.net < 0));
  const bonusMetricValue = (records) => bonusMetric === "count" ? records.length : records.reduce((sum, record) => sum + record.net, 0);
  const bonusNetTotal = bonusMetricValue(bonusRecords);
  const bonusPercentageFor = (value) => bonusNetTotal ? (value / bonusNetTotal) * 100 : 0;
  const formatBonusMetric = (value) => bonusMetric === "count" ? `${value} ${value === 1 ? "bono" : "bonos"}` : money(value);
  const bonusMetricLabel = bonusMetric === "count" ? "Recuento de bonos" : "Valor neto";
  const dailyBonusRows = [...bonusRecords.reduce((result, record) => {
    const current = result.get(record.dateKey) || { dateKey: record.dateKey, date: record.date, weekday: record.weekday, Noche: [], Mañana: [], Tarde: [], total: [] };
    current[record.shift].push(record);
    current.total.push(record);
    result.set(record.dateKey, current);
    return result;
  }, new Map()).values()].sort((first, second) => first.date - second.date);
  const shiftBonusRows = shiftOptions.map((shift) => {
    const value = bonusMetricValue(bonusRecords.filter((record) => record.shift === shift));
    return { shift, value, percentage: bonusPercentageFor(value) };
  });
  const hourlyBonusRows = Array.from({ length: 24 }, (_, hour) => {
    const value = bonusMetricValue(bonusRecords.filter((record) => record.hour === hour));
    return { hour, value, percentage: bonusPercentageFor(value) };
  });
  const shiftRanges = [{ shift: "Noche", start: 0, end: 7 }, { shift: "Mañana", start: 8, end: 15 }, { shift: "Tarde", start: 16, end: 23 }];
  const shiftTotalsForHours = (start, end) => bonusMetricValue(bonusRecords.filter((record) => record.hour >= start && record.hour <= end));
  const hourlyDisplayRows = shiftRanges.flatMap(({ shift, start, end }) => [
    ...hourlyBonusRows.filter((row) => row.hour >= start && row.hour <= end).map((row) => ({ type: "hour", ...row })),
    { type: "shift", shift, value: shiftTotalsForHours(start, end), percentage: bonusPercentageFor(shiftTotalsForHours(start, end)) },
  ]);
  const maxHourlyBonus = Math.max(...hourlyBonusRows.map((row) => Math.abs(row.value)), 1);
  const formatBonusDate = (value) => new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(value);
  const formatPercentage = (value) => bonusNetTotal ? `${value >= 0 ? "+" : ""}${value.toFixed(1)}%` : "-";
  
  const metricsConfig = [
    {
      section: "General",
      metrics: [
        { label: "Propinas", key: "tips" },
      ],
      metricGroups: [
        {
          label: "Promedio",
          metrics: [
            { label: "Caja inicial", key: "cashInitial", isAverage: true },
            { label: "Caja final", key: "cashFinal", isAverage: true },
            { label: "Diferencia de caja", key: "cashDifference", isAverage: true },
            { label: "Diferencia real", key: "realDifference", isAverage: true },
            { label: "Ganancia Real", key: "realProfit", isAverage: true },
            { label: "Saldo", key: "balance", isAverage: true },
            { label: "Redondeo", key: "rounding", isAverage: true },
          ],
        },
        {
          label: "Total",
          metrics: [
            { label: "Diferencia de caja", key: "cashDifference" },
            { label: "Diferencia real", key: "realDifference" },
            { label: "Ganancia Real", key: "realProfit" },
            { label: "Saldo", key: "balance" },
            { label: "Redondeo", key: "rounding" },
          ],
        },
      ],
    },
    {
      section: "Bonos",
      metrics: [
        { label: "Bonos otorgados", key: "granted" },
        { label: "Bonos recuperados", key: "recovered" },
        { label: "Bonos netos", key: "bonusesNet" },
      ]
    },
    {
      section: "Cargas de Fichas",
      dynamic: true
    },
    {
      section: "Traspasos",
      dynamic: true
    },
    {
      section: "Gastos",
      dynamic: true
    }
  ];
  return <main className="statistics-page">
    <section className="panel statistics-toolbar">
      <div className="statistics-toolbar-heading"><h2><BarChart3 size={18} /> Estadísticas</h2><span>{filtered.length} turnos dentro del período</span></div>
      <div className="statistics-toolbar-controls">
        <div className="statistics-toolbar-selection"><div className="statistics-boxes"><strong>Cajas</strong>{boxes.map((box) => <label key={box.id} style={{ color: boxColorStyle(box.color)["--box-accent"] }}><input type="checkbox" checked={selectedBoxIds.includes(box.id)} onChange={() => setSelectedBoxIds((current) => current.includes(box.id) ? current.filter((id) => id !== box.id) : [...current, box.id])} />{box.title}</label>)}</div><label className="statistics-combined" style={{ color: "white" }}><input type="checkbox" checked={combinedView} onChange={(event) => setCombinedView(event.target.checked)} /> Suma seleccionadas</label></div>
        <div className="statistics-toolbar-filters"><div className="statistics-dates"><label>Desde<input type="datetime-local" value={startDate} onChange={(event) => setStartDate(event.target.value)} /></label><label>Hasta<input type="datetime-local" value={endDate} onChange={(event) => setEndDate(event.target.value)} /></label></div><div className="statistics-shortcuts">{[["hoy", "Hoy"], ["ayer", "Ayer"], ["semana", "Semana actual"], ["mes", "Mes actual"], ["anterior", "Mes anterior"]].map(([key, label]) => <button type="button" key={key} onClick={() => shortcut(key)}>{label}</button>)}</div></div>
      </div>
    </section>
    {summarySets.map(({ box, rows: boxRows, summaries: boxSummaries }) => <section className="statistics-box-section" key={box.id} style={combinedView ? {} : boxColorStyle(box.color)}><h2 className="statistics-box-title" style={{ borderBottom: `3px solid ${combinedView ? "#ffffff" : boxColorStyle(box.color)["--box-accent"]}`, paddingBottom: "8px" }}>{box.title}</h2><section className="statistics-grid">{boxSummaries.map((group) => {
      const renderMetricSection = (section) => {
        const accentColor = combinedView ? "#ffffff" : box.color ? boxColorStyle(box.color)["--box-accent"] : "#72d7ca";
        const rowsForGroup = group.shift === "Total" ? boxRows : group.rows;
        if (section.dynamic) {
          if (section.section === "Cargas de Fichas") {
            const chipPlatforms = [...new Set(boxRows.flatMap((caja) => (caja.chipLoads || []).map((load) => load.platform)))];
            const chipData = rowsForGroup.flatMap((caja) => caja.chipLoads || []).reduce((acc, load) => {
              acc[load.platform] = (acc[load.platform] || 0) + number(load.amount);
              return acc;
            }, {});
            return chipPlatforms.length > 0 ? (
              <div key={section.section} className="statistics-section">
                <h3 style={{ color: accentColor }}>{section.section}</h3>
                {combinedView ? selectedHistories.map(({ box: sourceBox, rows }) => {
                  const sourceRows = group.shift === "Total" ? filterRows(rows) : filterRows(rows).filter((caja) => caja.shift === group.shift);
                  const sourceData = sourceRows.flatMap((caja) => caja.chipLoads || []).reduce((acc, load) => ({ ...acc, [load.platform]: (acc[load.platform] || 0) + number(load.amount) }), {});
                  return <div className="statistics-metric-group" key={sourceBox.id}><h4>{sourceBox.title}</h4>{chipPlatforms.map((platform) => <div key={platform}><span style={{ color: boxColorStyle(config.platformColors?.[platform] || "teal")["--box-accent"] }}>{platform}</span><b>{money(sourceData[platform] || 0)}</b></div>)}</div>;
                }) : chipPlatforms.map((platform) => <div key={platform}><span style={{ color: boxColorStyle(config.platformColors?.[platform] || "teal")["--box-accent"] }}>{platform}</span><b>{money(chipData[platform] || 0)}</b></div>)}
              </div>
            ) : null;
          }
          if (section.section === "Traspasos") {
            const transferRoutes = [...new Set(boxRows.flatMap((caja) => (caja.transfers || []).map((transfer) => {
              const fromBox = boxes.find((b) => b.id === transfer.fromBoxId)?.title || "Caja";
              const toBox = boxes.find((b) => b.id === transfer.toBoxId)?.title || "Caja";
              return `${fromBox} → ${toBox}`;
            })))];
            const transferData = rowsForGroup.flatMap((caja) => caja.transfers || []).reduce((acc, transfer) => {
              const fromBox = boxes.find((b) => b.id === transfer.fromBoxId)?.title || "Caja";
              const toBox = boxes.find((b) => b.id === transfer.toBoxId)?.title || "Caja";
              const key = `${fromBox} → ${toBox}`;
              acc[key] = (acc[key] || 0) + number(transfer.amount);
              return acc;
            }, {});
            return transferRoutes.length > 0 ? (
              <div key={section.section} className="statistics-section">
                <h3 style={{ color: accentColor }}>{section.section}</h3>
                {transferRoutes.map((route) => {
                  const [fromTitle, toTitle] = route.split(" → ");
                  const fromBox = boxes.find((item) => item.title === fromTitle);
                  const toBox = boxes.find((item) => item.title === toTitle);
                  const transferNameStyle = (transferBox) => ({ color: boxColorStyle(transferBox?.color || "teal")["--box-accent"], flex: "none", fontWeight: 700 });
                  return <div key={route}><span><span style={transferNameStyle(fromBox)}>{fromTitle}</span> → <span style={transferNameStyle(toBox)}>{toTitle}</span></span><b>{money(transferData[route] || 0)}</b></div>;
                })}
              </div>
            ) : null;
          }
          if (section.section === "Gastos") {
            const expensesObj = group.values.expensesByCategory || {};
            const withoutEmpty = Object.entries(expensesObj).filter(([_, val]) => val !== 0);
            return (
              <div key={section.section} className="statistics-section">
                <h3 style={{ color: accentColor }}>{section.section}</h3>
                {withoutEmpty.length > 0 ? withoutEmpty.map(([category, value]) => (
                  <div key={category}>
                    <span>{category || "Sin Categoría"}</span>
                    <b>{money(value)}</b>
                  </div>
                )) : <small>Sin gastos</small>}
              </div>
            );
          }
        }
        return (
          <div key={section.section} className="statistics-section">
            <h3 style={{ color: accentColor }}>{section.section}</h3>
            {section.metrics?.map((metric) => {
              let displayValue = group.values[metric.key];
              if (metric.isAverage && group.rows.length > 0) {
                displayValue = displayValue / group.rows.length;
              }
              const isAverageMetric = metric.isAverage;
              const valueColor = isAverageMetric ? (displayValue >= 0 ? "#6dd5a8" : "#ef8888") : undefined;
              return (
                <div key={metric.key}>
                  <span>{metric.label}</span>
                  <b style={{ color: valueColor }}>{money(displayValue)}</b>
                </div>
              );
            })}
            {section.metricGroups?.map((metricGroup) => <div className="statistics-metric-group" key={metricGroup.label}>
              <h4>{metricGroup.label}</h4>
              {metricGroup.metrics.map((metric) => {
                let displayValue = group.values[metric.key];
                if (metric.isAverage && group.rows.length > 0) {
                  displayValue = displayValue / group.rows.length;
                }
                const valueColor = displayValue >= 0 ? "#6dd5a8" : "#ef8888";
                return <div key={metric.key}><span>{metric.label}</span><b style={{ color: valueColor }}>{money(displayValue)}</b></div>;
              })}
            </div>)}
          </div>
        );
      };
      return (
        <section className={`panel statistics-shift ${group.shift === "Total" ? "statistics-total" : ""}`} key={`${box.id}-${group.shift}`}>
          <div className="statistics-shift-head">
            <h2>{group.shift}</h2>
            <span>{group.rows.length} turnos</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {metricsConfig.map((section) => renderMetricSection(section))}
          </div>
        </section>
      );
    })}</section></section>)}
    <section className="statistics-visuals"><section className="panel statistics-chart"><div className="statistics-chart-head"><div><h2>Comparativa por turno</h2><span>Seleccioná una métrica y una barra</span></div><select value={chartMetric} onChange={(event) => { setChartMetric(event.target.value); setSelectedBar(null); }}>{metricOptions.map((metric) => <option value={metric.key} key={metric.key}>{metric.label}</option>)}</select></div><div className="statistics-bars">{chartRows.map((row) => <button type="button" className={selectedBar === row.label ? "selected" : ""} key={row.label} onClick={() => setSelectedBar(row.label)}><span className="statistics-bar-value">{money(row.value)}</span><i style={{ height: `${Math.max(4, row.value / maxChart * 150)}px` }} /><small>{row.label}</small></button>)}</div>{selectedBar && <p className="statistics-chart-detail">{selectedBar}: <b>{money(chartRows.find((row) => row.label === selectedBar)?.value)}</b></p>}</section><section className="panel statistics-tips"><div className="statistics-chart-head"><div><h2>Totalizador de propinas</h2><span>Valores guardados en configuración</span></div><Coins size={18} /></div><div className="statistics-tip-total"><span>Total de propinas</span><strong>{money(total.tips)}</strong></div><div className="statistics-tip-fields"><label>Empleados<input type="number" min="1" step="1" value={statistics.employees ?? 1} onChange={(event) => updateStatistics({ employees: Math.max(1, number(event.target.value)) })} /></label><label>Propinas c/u<strong>{money(total.tips / employees)}</strong></label><label>% proporcional<input type="number" min="0" max="100" step="1" value={statistics.proportionalPercent ?? 100} onChange={(event) => updateStatistics({ proportionalPercent: Math.min(100, Math.max(0, number(event.target.value))) })} /></label><label>Proporcional c/u<strong>{money(total.tips / employees * percent / 100)}</strong></label></div></section></section>
    <section className="panel bonus-analysis-panel">
      <div className="bonus-analysis-head"><div><h2><Gift size={18} /> Análisis de bonos netos</h2><span>{bonusRecords.length} movimientos · {dailyBonusRows.length} días · período y cajas tomados de arriba</span></div><strong>{money(bonusNetTotal)}</strong></div>
      <div className="bonus-analysis-filters">
        <div className="bonus-analysis-filter-group"><span>Días de la semana</span><div>{weekdayOptions.map((weekday, index) => <label key={weekday}><input type="checkbox" checked={bonusWeekdays.includes(index)} onChange={() => toggleBonusFilter(bonusWeekdays, setBonusWeekdays, index)} />{weekday.slice(0, 3)}</label>)}</div></div>
        <div className="bonus-analysis-filter-group"><span>Turnos</span><div>{shiftOptions.map((shift) => <label key={shift}><input type="checkbox" checked={bonusShifts.includes(shift)} onChange={() => toggleBonusFilter(bonusShifts, setBonusShifts, shift)} />{shift}</label>)}</div></div>
        <label className="bonus-analysis-select"><span>Agrupar por</span><select value={bonusMetric} onChange={(event) => setBonusMetric(event.target.value)}><option value="value">Valor neto</option><option value="count">Recuento de bonos</option></select></label>
        <label className="bonus-analysis-select"><span>Desde hora</span><select value={bonusFromHour} onChange={(event) => setBonusFromHour(Number(event.target.value))}>{Array.from({ length: 24 }, (_, hour) => <option value={hour} key={hour}>{String(hour).padStart(2, "0")}:00</option>)}</select></label>
        <label className="bonus-analysis-select"><span>Hasta hora</span><select value={bonusToHour} onChange={(event) => setBonusToHour(Number(event.target.value))}>{Array.from({ length: 24 }, (_, hour) => <option value={hour} key={hour}>{String(hour).padStart(2, "0")}:59</option>)}</select></label>
        <label className="bonus-analysis-select"><span>Resultado</span><select value={bonusResultMode} onChange={(event) => setBonusResultMode(event.target.value)}><option value="all">Todos los netos</option><option value="positive">Solo netos positivos</option><option value="negative">Solo netos negativos</option></select></label>
      </div>
      <div className="bonus-analysis-summary"><div><span>{bonusMetricLabel} seleccionado</span><strong>{formatBonusMetric(bonusNetTotal)}</strong></div>{shiftBonusRows.map((row) => <div key={row.shift}><span>{row.shift}</span><strong>{formatBonusMetric(row.value)} <small>{formatPercentage(row.percentage)}</small></strong></div>)}</div>
      <div className="bonus-analysis-grid">
        <section className="bonus-analysis-table-wrap"><div className="bonus-analysis-section-head"><h3>Resultado por día</h3><span>Porcentaje sobre el total filtrado</span></div><div className="bonus-analysis-table-scroll"><table className="bonus-analysis-table"><thead><tr><th>Día</th>{shiftOptions.map((shift) => <th key={shift}>{shift}</th>)}<th>Total</th><th>%</th></tr></thead><tbody>{dailyBonusRows.map((row) => <tr key={row.dateKey}><th>{formatBonusDate(row.date)} <small>{weekdayOptions[row.weekday]}</small></th>{shiftOptions.map((shift) => <td key={shift}>{formatBonusMetric(bonusMetricValue(row[shift]))}</td>)}<td><b>{formatBonusMetric(bonusMetricValue(row.total))}</b></td><td><b>{formatPercentage(bonusPercentageFor(bonusMetricValue(row.total)))}</b></td></tr>)}{dailyBonusRows.length === 0 && <tr><td colSpan="6" className="bonus-analysis-empty">No hay bonos para los filtros seleccionados.</td></tr>}</tbody></table></div></section>
        <section className="bonus-analysis-hours"><div className="bonus-analysis-section-head"><h3>Distribución por hora</h3><span>{bonusMetricLabel} y participación</span></div><div className="bonus-hour-bars">{hourlyDisplayRows.map((row, index) => row.type === "shift" ? <div className="bonus-hour-shift-total" key={`shift-${row.shift}`}><span>Total {row.shift}</span><strong>{formatBonusMetric(row.value)}</strong><small>{formatPercentage(row.percentage)}</small></div> : <div className={`bonus-hour-row ${row.value < 0 ? "negative" : ""}`} key={`hour-${row.hour}-${index}`}><span>{String(row.hour).padStart(2, "0")}h</span><i><b style={{ width: `${Math.max(0, Math.abs(row.value) / maxHourlyBonus * 100)}%` }} /></i><strong>{formatBonusMetric(row.value)}</strong><small>{formatPercentage(row.percentage)}</small></div>)}</div></section>
      </div>
    </section>
    </main>
}

function SummaryCard({ caja, calculations, update }) {
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const metric = (label, value, className = "", valueClass = value > 0 ? "positive" : value < 0 ? "negative" : "neutral") => (
    <div className={className}>
      <span>{label}</span>
      <b className={valueClass}>{money(value)}</b>
    </div>
  );
  return (
    <aside className="summary-card">
      <div className="summary-head">
        <div>
          <span className="eyebrow">Resumen</span>
        </div>
        <div className="summary-actions">
          <button className="icon-button" title="Ver resumen avanzado" onClick={() => setAdvancedOpen(true)}>
            <Eye size={16} />
          </button>
          <span className={`status-badge ${caja.status === "CERRADA" ? "closed" : "open"}`}>
            <span /> {caja.status}
          </span>
        </div>
      </div>
      <div className="main-result">
        <span>Sobrante / Faltante</span>
        <strong className={calculations.shortage < 0 ? "negative" : calculations.shortage > 0 ? "positive" : "neutral"}>
          {calculations.shortage >= 0 ? "+" : ""}{money(calculations.shortage)}
        </strong>
      </div>
      <div className="metric-list">
        {metric("Caja inicial", calculations.cashInitial)}
        {metric("Caja final", calculations.cashFinal)}
        {metric("Diferencia caja", calculations.cashDifference)}
        {metric("Diferencia real", calculations.realDifference)}
      </div>
      <div className="found-money">
        <label>Redondeo</label>
        <AmountInput
          value={caja.found}
          className={number(caja.found) !== 0 ? "has-value" : ""}
          onChange={(value) => update({ found: value })}
        />
      </div>
      {advancedOpen && (
        <div className="modal-backdrop" onClick={() => setAdvancedOpen(false)}>
          <div className="modal advanced-summary-modal" onClick={(event) => event.stopPropagation()}>
            <button className="modal-close" onClick={() => setAdvancedOpen(false)} title="Cerrar resumen avanzado"><X size={18} /></button>
            <div className="modal-icon"><Banknote size={22} /></div>
            <h2>Resumen Avanzado</h2>
            <p>Detalle completo de los valores calculados para este turno.</p>
            <div className="advanced-summary-list">
              {metric("Sobrante / Faltante", calculations.shortage, "highlight")}
              {metric("Caja inicial", calculations.cashInitial)}
              {metric("Caja final", calculations.cashFinal)}
              {metric("Total Ahorro", calculations.savings)}
              {metric("Pre diferencia", calculations.preDifference)}
              {metric("Diferencia", calculations.difference)}
              {metric("Saldo", calculations.balance)}
              {metric("Redondeo", caja.found)}
              {metric("Diferencia caja", calculations.cashDifference)}
              {metric("Diferencia real", calculations.realDifference)}
              {metric("Ganancia Real", calculations.realProfit)}
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}

function HistoryModal({ history, onClose, onSelect, config, activeBoxId }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal history-modal" onClick={(event) => event.stopPropagation()}>
        <button className="modal-close" onClick={onClose} title="Cerrar historial"><X size={18} /></button>
        <div className="modal-icon"><Clock3 size={22} /></div>
        <h2>Cajas recientes</h2>
        <p>Consultá los últimos turnos y sus cierres.</p>
        <div className="history-modal-list">
          {history.map((item, index) => (
            <button type="button" className={`history-item ${index === 0 ? "current" : ""}`} key={item.id} onClick={() => onSelect(index)}>
              <div>
                <b>Turno {item.shift}</b>
                <span>{new Date(item.date).toLocaleDateString("es-AR", { weekday: "long", day: "2-digit", month: "long" })} · {item.status === "ABIERTA" ? "Actual" : "Cerrada"}</span>
              </div>
              <strong>{money(item.cashFinal ?? 0)} <em className={realDifferenceFor(item, config, activeBoxId) >= 0 ? "positive" : "negative"}>/ {realDifferenceFor(item, config, activeBoxId) >= 0 ? "+" : "-"}{money(Math.abs(realDifferenceFor(item, config, activeBoxId)))}</em></strong>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function LegacyReportCard({ caja, calculations, snapshotRef, config, boxes, activeBox }) {
  const wallets = config.accounts.wallets;
  const totalRows = (rows, kind) => rows.reduce((sum, row) => {
    const expense = kind === "expenses" && config.expenses.find((item) => item.name === row.category);
    return sum + number(row.amount) * (expense?.inverted ? -1 : 1);
  }, 0);
  const accountGroups = ["Normal", "Depósitos", "Compartidas", "Ahorro"].map((category) => {
    const categoryWallets = wallets.filter((wallet) => caja.accounts.some((row) => (config.accounts.walletSettings[row.holder]?.[wallet]?.category || "Normal") === category && config.accounts.availability[row.holder]?.[wallet] !== false && number(row.values[wallet]) !== 0));
    const rows = caja.accounts.filter((row) => categoryWallets.some((wallet) => number(row.values[wallet]) !== 0));
    return { category, wallets: categoryWallets, rows };
  });
  const movements = [
    ["Gastos", caja.expenses, "expenses"],
    ["Propinas", caja.tips, "tips"],
    ["Cargas T.A.", caja.ta, "ta"],
  ];
  const detailFor = (row, kind) => kind === "expenses" ? [row.category, row.user, row.notes] : [row.user, row.notes].filter(Boolean);
  const timeFor = (value) => value ? new Intl.DateTimeFormat("es-AR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(new Date(value)) : "--:--:--";
  const shiftStart = { Noche: 0, Mañana: 8, Tarde: 16 }[caja.shift] ?? 0;
  const bonusSlots = Array.from({ length: 4 }, (_, slot) => {
    const start = (shiftStart + slot * 2) % 24;
    const end = (start + 2) % 24;
    const items = caja.bonuses.slice().reverse().filter((bonus) => {
      const date = new Date(bonus.createdAt);
      const elapsed = (date.getHours() * 60 + date.getMinutes() - shiftStart * 60 + 1440) % 1440;
      return Math.floor(elapsed / 120) === slot;
    });
    return { label: `${String(start).padStart(2, "0")}:00 - ${String(end).padStart(2, "0")}:00`, items };
  });
  const generatedAt = new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date());
  const signedMoney = (value) => `${value >= 0 ? "+" : "-"}${money(Math.abs(value))}`;
  const grantedTotal = caja.bonuses.reduce((sum, bonus) => sum + number(bonus.granted), 0);
  const recoveredTotal = caja.bonuses.reduce((sum, bonus) => sum + number(bonus.recovered), 0);
  const foundRecords = Array.isArray(caja.foundMoney) ? caja.foundMoney : number(caja.found) ? [{ id: "legacy-found", amount: caja.found }] : [];
  const metric = (label, value, highlight = false) => <div className={`report-metric ${highlight ? "highlight" : ""}`}><span>{label}</span><b className={value > 0 ? "positive" : value < 0 ? "negative" : "neutral"}>{label === "Sobrante / Faltante" && value >= 0 ? "+" : ""}{money(value)}</b></div>;
  return (
    <div ref={snapshotRef} className="snapshot-export report-card" style={boxColorStyle(activeBox?.color)}>
      <header className="report-header">
        <div className="report-brand"><span className="report-brand-mark"><Banknote size={22} /></span><div><strong>CAJA<span>flow</span></strong><small>Reporte de cierre de caja</small></div></div>
        <div className="report-period"><b>Turno {caja.shift}</b><span>{caja.shift === "Noche" ? "00:00 - 08:00" : caja.shift === "Mañana" ? "08:00 - 16:00" : "16:00 - 00:00"}</span><small>{new Date(caja.date).toLocaleDateString("es-AR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}</small></div>
      </header>
      <section className="report-kpis">
        {metric("Caja inicial", calculations.cashInitial)}
        {metric("Caja final", calculations.cashFinal, true)}
        {metric("Pre-diferencia", calculations.preDifference)}
        {metric("Sobrante / Faltante", calculations.shortage, true)}
        {metric("Diferencia caja", calculations.cashDifference)}
        {metric("Diferencia real", calculations.realDifference, true)}
        {metric("Redondeo", caja.found)}
      </section>
      <main className="report-body">
        <div className="report-main-column">
          <section className="report-block report-accounts"><div className="report-block-head"><h2><WalletCards size={17} /> Matriz de cuentas</h2><span>{accountGroups.reduce((sum, group) => sum + group.rows.length, 0)} titulares con saldo</span></div>
            {accountGroups.map((group) => <div className="report-account-group" key={group.category}><h3>{group.category === "Normal" ? "Cuentas base" : `Billeteras ${group.category}`}</h3>{group.rows.length === 0 ? <p className="report-empty">Sin saldos en este grupo</p> : <table><thead><tr><th>Titular</th>{group.wallets.map((wallet) => <th key={wallet}>{wallet}</th>)}<th>Total</th></tr></thead><tbody>{group.rows.map((row) => <tr key={`${group.category}-${row.holder}`}><th>{row.holder}</th>{group.wallets.map((wallet) => { const value = number(row.values[wallet]); const state = row.verified?.[wallet]; const stateClass = typeof state === "object" ? (state.collections && state.withdrawals ? "both" : state.collections ? "collections" : state.withdrawals ? "withdrawals" : "") : state ? "collections" : ""; return <td className={stateClass} key={wallet}>{money(value)}</td>; })}<td>{money(group.wallets.reduce((sum, wallet) => sum + number(row.values[wallet]), 0))}</td></tr>)}</tbody></table>}</div>)}
          </section>
          <section className="report-block report-chips"><div className="report-block-head"><h2><Ticket size={17} /> Control de fichas</h2><span>{caja.chips.length} plataformas</span></div><div className="report-chip-grid"><div>Plataforma</div><div>Inicial</div><div>Final</div><div>Saldo</div>{caja.chips.map((chip) => { const balance = number(chip.initial) - number(chip.final); return <React.Fragment key={chip.platform}><b>{chip.platform}</b><span>{money(chip.initial)}</span><span>{money(chip.final)}</span><strong className={balance >= 0 ? "positive" : "negative"}>{signedMoney(balance)}</strong></React.Fragment>; })}</div></section>
        </div>
        <aside className="report-side-column">
          {movements.map(([title, rows, kind]) => <section className="report-block report-operation" key={title}><div className="report-block-head"><h2>{kind === "expenses" ? <ReceiptText size={16} /> : kind === "tips" ? <Coins size={16} /> : <ArrowDownToLine size={16} />} {title}</h2><span>{rows.length} registros</span></div><div className="report-list">{rows.length === 0 ? <p className="report-empty">Sin registros</p> : rows.map((row) => <div className="report-list-row" key={row.id}><span><small>[{timeFor(row.createdAt)}]</small> {detailFor(row, kind).filter(Boolean).join(" · ") || "Sin detalle"}</span><b>{money(row.amount)}</b></div>)}</div><strong className="report-total">Total <b>{money(totalRows(rows, kind))}</b></strong></section>)}
          <section className="report-block report-operation"><div className="report-block-head"><h2><Banknote size={16} /> Dinero encontrado</h2><span>{foundRecords.length} registros</span></div>{foundRecords.length === 0 ? <p className="report-empty">Sin registros</p> : <div className="report-list">{foundRecords.map((record) => <div className="report-list-row" key={record.id}><span><small>[{timeFor(record.createdAt)}]</small> {[record.holder, record.wallet, record.note].filter(Boolean).join(" · ") || "Sin detalle"}</span><b>{money(record.amount)}</b></div>)}</div>}</section>
          <section className="report-block report-operation"><div className="report-block-head"><h2><ArrowLeftRight size={16} /> Traspasos</h2><span>{(caja.transfers || []).length} registros</span></div>{(caja.transfers || []).length === 0 ? <p className="report-empty">Sin registros</p> : <div className="report-list">{caja.transfers.map((transfer) => <div className="report-list-row" key={transfer.id}><span><small>[{timeFor(transfer.createdAt)}]</small> {boxes.find((box) => box.id === transfer.fromBoxId)?.title || "Caja"} → {boxes.find((box) => box.id === transfer.toBoxId)?.title || "Caja"}{transfer.note ? ` · ${transfer.note}` : ""}</span><b>{money(transfer.amount)}</b></div>)}</div>}</section>
          <section className="report-block report-operation report-bonus-block"><div className="report-block-head"><h2><Gift size={16} /> Bonos</h2><span>{caja.bonuses.length} movimientos</span></div><div className="report-bonus-summary"><span>Otorgados <b>{money(grantedTotal)}</b></span><span>Recuperados <b>{money(recoveredTotal)}</b></span><strong>Neto <b>{money(calculations.bonuses)}</b></strong></div><div className="report-bonus-timeline">{bonusSlots.map((slot) => <div className="report-bonus-slot" key={slot.label}><h3>{slot.label}</h3><div>{slot.items.length === 0 ? <p className="report-empty">Sin movimientos</p> : slot.items.map((bonus) => <span className={number(bonus.recovered) > 0 ? "recovered" : bonus.publicity ? "publicity" : "granted"} key={bonus.id}><small>{timeFor(bonus.createdAt).slice(0, 5)}</small>{number(bonus.recovered) > 0 ? "REC" : bonus.publicity ? "PUB" : "OTO"} {money(number(bonus.recovered) || number(bonus.granted))}</span>)}</div><strong>{money(slot.items.reduce((sum, bonus) => sum + number(bonus.granted) - number(bonus.recovered), 0))}</strong></div>)}</div></section>
        </aside>
      </main>
      {(caja.notes?.trim() || caja.nextNotes?.trim()) && <footer className="report-footer"><div><h2><FileText size={16} /> Notas del turno</h2>{caja.notes?.trim() && <p><strong>Turno actual</strong>{caja.notes}</p>}{caja.nextNotes?.trim() && <p><strong>Turno siguiente</strong>{caja.nextNotes}</p>}</div><small>Generado el {generatedAt} hs</small></footer>}
      {!caja.notes?.trim() && !caja.nextNotes?.trim() && <footer className="report-footer report-footer-minimal"><small>Generado el {generatedAt} hs</small></footer>}
    </div>
  );
}

function SnapshotView({ caja, calculations, snapshotRef, config, boxes, activeBox }) {
  return <CajaReportCardFinal data={{ caja, calculations, config, boxes, activeBox }} snapshotRef={snapshotRef} />;
}

function LogisticsPage({ caja, config, boxes, activeBoxId, onUpdateAccounts, onAssignWallet, onConfigChange }) {
  const logistics = config.logistics || { order: [], hidden: [], added: [] };
  const accounts = caja.accounts || [];
  const keyFor = (holder, wallet) => `${holder}::${wallet}`;
  const candidates = accounts.flatMap((row) => config.accounts.wallets.filter((wallet) => config.accounts.availability[row.holder]?.[wallet] !== false).map((wallet) => {
    const setting = config.accounts.walletSettings[row.holder]?.[wallet] || { category: "Normal" };
    const mode = config.accounts.walletModes?.[wallet] || "Cobros + Retiros";
    return { key: keyFor(row.holder, wallet), holder: row.holder, wallet, category: setting.category || (mode === "Solo Depósito" ? "Depósitos" : "Normal"), mode, row };
  }));
  const included = candidates.filter((item) => ["Cobros + Retiros", "Solo Cobros"].includes(item.mode) || logistics.added.includes(item.key));
  const orderIndex = (key) => logistics.order.indexOf(key);
  const ordered = included.slice().sort((first, second) => {
    const firstOrder = orderIndex(first.key);
    const secondOrder = orderIndex(second.key);
    return (firstOrder < 0 ? Number.MAX_SAFE_INTEGER : firstOrder) - (secondOrder < 0 ? Number.MAX_SAFE_INTEGER : secondOrder);
  });
  const grouped = ["Normal", "Depósitos", "Compartidas", "Ahorro"].map((category) => ({ category, rows: ordered.filter((item) => item.category === category && !logistics.hidden.includes(item.key)) })).filter((group) => group.rows.length);
  const hiddenItems = ordered.filter((item) => logistics.hidden.includes(item.key));
  const hidden = (key) => logistics.hidden.includes(key);
  const saveLogistics = (patch) => onConfigChange({ ...config, logistics: { ...logistics, ...patch } });
  const toggleHidden = (key) => saveLogistics({ hidden: hidden(key) ? logistics.hidden.filter((item) => item !== key) : [...logistics.hidden, key] });
  const reorder = (category, key, targetKey) => {
    const keys = ordered.filter((item) => item.category === category).map((item) => item.key);
    const from = keys.indexOf(key);
    const to = keys.indexOf(targetKey);
    if (from < 0 || to < 0 || from === to) return;
    keys.splice(from, 1); keys.splice(to, 0, key);
    const otherKeys = ordered.filter((item) => item.category !== category).map((item) => item.key);
    saveLogistics({ order: [...otherKeys, ...keys] });
  };
  const addable = candidates.filter((item) => !["Cobros + Retiros", "Solo Cobros"].includes(item.mode) && !logistics.added.includes(item.key));
  const addWallet = (event) => {
    const key = event.target.value;
    if (!key) return;
    saveLogistics({ added: [...logistics.added, key], hidden: logistics.hidden.filter((item) => item !== key) });
    event.target.value = "";
  };
  const stateFor = (row, wallet) => {
    const state = row.verified?.[wallet];
    return typeof state === "object" ? state : { collections: Boolean(state), withdrawals: false };
  };
  const dateValue = (value) => value ? new Date(value).getTime() : 0;
  const restartFor = (item) => {
    const state = stateFor(item.row, item.wallet);
    if (item.row.walletRestartAt?.[item.wallet]) return item.row.walletRestartAt[item.wallet];
    if (state.lastRestartAt) return state.lastRestartAt;
    return [state.lastCollectionsAt, state.lastWithdrawalsAt, item.row.walletBoxUpdatedAt?.[item.wallet]].sort((first, second) => dateValue(second) - dateValue(first))[0];
  };
  const restartTone = (value) => {
    if (!value) return "";
    const date = new Date(value); const today = new Date();
    const day = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
    const todayDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
    return day === todayDay ? "today" : day === todayDay - 86400000 ? "yesterday" : "";
  };
  const formatRestart = (value) => value ? new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value)) : "1/1/2026 0:00:00";
  const restartInputValue = (value) => {
    if (!value) return "";
    const date = new Date(value);
    const pad = (part) => String(part).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  };
  const updateRestart = (item, value) => {
    if (!value) return;
    const restart = new Date(value).toISOString();
    onUpdateAccounts(accounts.map((account) => account.holder !== item.holder ? account : { ...account, walletRestartAt: { ...(account.walletRestartAt || {}), [item.wallet]: restart } }));
  };
  const updateState = (item, flag) => {
    const state = stateFor(item.row, item.wallet);
    const nextState = { ...state, [flag]: !state[flag] };
    const restartedAt = new Date().toISOString();
    if (!nextState[flag]) nextState[`last${flag === "collections" ? "Collections" : "Withdrawals"}At`] = restartedAt;
    const nextAccounts = accounts.map((account) => account.holder !== item.holder ? account : { ...account, walletRestartAt: { ...(account.walletRestartAt || {}), [item.wallet]: restartedAt }, verified: { ...(account.verified || {}), [item.wallet]: nextState } });
    onUpdateAccounts(nextAccounts);
  };
  return <main className="logistics-page">
    <section className="panel logistics-panel">
      <SectionHead icon={<WalletCards size={18} />} title="Ruta de Cuentas" action={<select className="logistics-add" onChange={addWallet} value=""><option value="">Agregar billetera...</option>{addable.map((item) => <option key={item.key} value={item.key}>{item.holder} · {item.wallet}</option>)}</select>} />
      <div className="logistics-board">
      <div className="logistics-head"><span>En uso</span><span>Pagos</span><span>Cuenta</span><span>Billetera</span><span>Aclaración</span><span>Último R. Uso</span><span>Último R. Retiros</span><span>Último R. Caja</span><span>Último Reinicio</span><span /></div>
      {grouped.map((group) => <React.Fragment key={group.category}><div className="logistics-group">Billeteras {group.category}</div>{group.rows.map((item) => { const state = stateFor(item.row, item.wallet); const box = boxes.find((candidate) => candidate.id === item.row.walletBoxes?.[item.wallet]); const restart = restartFor(item); const tone = restartTone(restart); const hasChecks = ["Normal", "Compartidas"].includes(item.category); return <div className={`logistics-row ${state.collections && state.withdrawals ? "both" : state.collections ? "collections" : state.withdrawals ? "withdrawals" : ""} ${tone}`} key={item.key} draggable onDragStart={(event) => event.dataTransfer.setData("text/plain", item.key)} onDragOver={(event) => event.preventDefault()} onDrop={(event) => reorder(group.category, event.dataTransfer.getData("text/plain"), item.key)}>{hasChecks ? <><label className="logistics-check"><input type="checkbox" checked={Boolean(state.collections)} onChange={() => updateState(item, "collections")} /><span /></label><label className="logistics-check"><input type="checkbox" checked={Boolean(state.withdrawals)} onChange={() => updateState(item, "withdrawals")} /><span /></label></> : <><span className="logistics-check-empty" /><span className="logistics-check-empty" /></>}<b>{item.holder}</b><strong>{item.wallet}</strong><span>{item.category === "Depósitos" ? "Únicamente enviar como depósito" : item.category === "Compartidas" ? "Máximo 500k · (Depósitos o Pagos Grandes)" : item.category === "Ahorro" ? "No contabiliza en caja" : `Máximo 250k · ${item.mode === "Solo Cobros" ? "Cobros" : "Pagos"}`}</span><time>{formatRestart(state.lastCollectionsAt)}</time><time>{formatRestart(state.lastWithdrawalsAt)}</time><div className="logistics-box-selector">{item.category === "Depósitos" || item.category === "Compartidas" ? <WalletAssignmentSelector boxes={boxes} value={item.row.walletBoxes?.[item.wallet] || ""} onChange={(boxId) => onAssignWallet(item.holder, item.wallet, boxId)} /> : <span className="logistics-box-placeholder">-</span>}</div><input type="datetime-local" className="logistics-restart-input" value={restartInputValue(restart)} onChange={(event) => updateRestart(item, event.target.value)} aria-label={`Último reinicio de ${item.holder} ${item.wallet}`} /><button className="logistics-hide" title={hidden(item.key) ? "Mostrar billetera" : "Ocultar billetera"} onClick={() => toggleHidden(item.key)}><Eye size={14} /></button></div>; })}</React.Fragment>)}
      {hiddenItems.length > 0 && <div className="logistics-hidden"><span>Ocultas</span>{hiddenItems.map((item) => <button key={item.key} onClick={() => toggleHidden(item.key)}>{item.holder} · {item.wallet}</button>)}</div>}
    </div>
    </section>
  </main>;
}

function UsersPage({ config, boxes, activeBoxId, onConfigChange, onNotify, api }) {
  const [search, setSearch] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sortMode, setSortMode] = useState("none");
  const [groupMode, setGroupMode] = useState("none");
  const [newUserOpen, setNewUserOpen] = useState(false);
  const [sharedUserOpen, setSharedUserOpen] = useState(false);
  const [newUser, setNewUser] = useState({ names: [""], phones: [""], titulars: [""], boxes: [activeBoxId], subPlatforms: [], userInfo: null, createdAt: new Date().toISOString() });
  const configUsers = Array.isArray(config?.users) ? config.users : [];
  const [editableUsers, setEditableUsers] = useState(configUsers);
  const [globalClarifications, setGlobalClarifications] = useState(Array.isArray(config?.userClarifications) ? config.userClarifications : []);
  const [globalPlatformSubPlatforms, setGlobalPlatformSubPlatforms] = useState(config?.platformSubPlatforms || {});
  const [userInfoOptionsByBox, setUserInfoOptionsByBox] = useState({ [String(activeBoxId)]: config?.userInfoOptions || [] });
  const usersLoadedRef = React.useRef(false);
  const [expandedUserId, setExpandedUserId] = useState(null);
  const [editingUserId, setEditingUserId] = useState(null);
  const [dragIndex, setDragIndex] = useState(null);
  const persistUsersRef = React.useRef(false);
  const users = editableUsers;
  const clarifications = globalClarifications;
  const platformSubPlatforms = globalPlatformSubPlatforms;
  const boxById = Object.fromEntries((boxes || []).map((box) => [String(box.id), box]));
  const dedupeSubPlatformEntries = (platform, values) => {
    const next = [];
    const seen = new Set();
    (Array.isArray(values) ? values : []).forEach((sub) => {
      const name = String(typeof sub === "string" ? sub : (sub?.name || "")).trim();
      if (!name) return;
      const signature = `${platform}::${name.toLowerCase()}`;
      if (seen.has(signature)) return;
      seen.add(signature);
      next.push({
        name,
        color: typeof sub === "string" ? (config?.platformColors?.[platform] || "teal") : (sub?.color || config?.platformColors?.[platform] || "teal"),
      });
    });
    return next;
  };
  const boxSubPlatformsFor = (boxId) => {
    const seen = new Set();
    return (config?.platforms || []).flatMap((platform) => {
      return dedupeSubPlatformEntries(platform, platformSubPlatforms[platform] || []).flatMap((sub) => {
        const key = `${boxId}::${platform}::${sub.name}`;
        if (seen.has(key)) return [];
        seen.add(key);
        return [{
          key,
          label: sub.name,
          color: sub.color || config?.platformColors?.[platform] || "teal",
        }];
      });
    });
  };
  const mergeUsers = (userLists) => {
    const merged = new Map();
    userLists.flat().forEach((user) => {
      const names = Array.isArray(user?.names) ? user.names : [user?.name];
      const phones = Array.isArray(user?.phones) ? user.phones : [user?.phone];
      const titulars = Array.isArray(user?.titulars) ? user.titulars : (user?.titular ? [user.titular] : []);
      const identity = user?.id || `${names.find(Boolean) || ""}::${phones.find(Boolean) || ""}`;
      const previous = merged.get(identity);
      const uniqueValues = (values) => [...new Set(values.map((value) => String(value || "").trim()).filter(Boolean))];
      merged.set(identity, {
        ...(previous || {}),
        ...user,
        id: user?.id || previous?.id || `user-${crypto.randomUUID()}`,
        names: uniqueValues([...(previous?.names || []), ...names]),
        phones: uniqueValues([...(previous?.phones || []), ...phones]),
        titulars: uniqueValues([...(previous?.titulars || []), ...titulars]),
        boxes: uniqueValues([...(previous?.boxes || []), ...(user?.boxes || [])]),
        subPlatforms: uniqueValues([...(previous?.subPlatforms || []), ...(user?.subPlatforms || [])]),
        clarifications: uniqueValues([...(previous?.clarifications || []), ...(user?.clarifications || [])]),
        linkedUsers: uniqueValues([...(previous?.linkedUsers || []), ...(user?.linkedUsers || [])]),
        createdAt: previous?.createdAt || user?.createdAt || new Date().toISOString(),
      });
    });
    return [...merged.values()];
  };
  useEffect(() => {
    if (!api || usersLoadedRef.current || !(boxes || []).length) return undefined;
    let cancelled = false;
    Promise.all((boxes || []).map((box) => api(`/api/configuracion?boxId=${box.id}`).catch(() => ({ users: [] }))))
      .then((configs) => {
        if (cancelled) return;
        setEditableUsers(configUsers);
        setGlobalClarifications(Array.isArray(config?.userClarifications) ? config.userClarifications : []);
        setGlobalPlatformSubPlatforms(config?.platformSubPlatforms || {});
        setUserInfoOptionsByBox(Object.fromEntries((boxes || []).map((box, index) => [String(box.id), Array.isArray(configs[index]?.userInfoOptions) ? configs[index].userInfoOptions : []])));
        usersLoadedRef.current = true;
      });
    return () => { cancelled = true; };
  }, [api, boxes, config]);
  const updateUsers = (nextUsers) => {
    persistUsersRef.current = true;
    setEditableUsers(nextUsers);
  };
  const openNewUser = () => {
    setNewUser({ names: [""], phones: [""], titulars: [""], boxes: [activeBoxId], subPlatforms: [], userInfo: null, createdAt: new Date().toISOString() });
    setSharedUserOpen(true);
  };
  const saveNewUser = () => {
    const names = newUser.names.map((name) => name.trim()).filter(Boolean);
    const phones = newUser.phones.map((phone) => phone.trim()).filter(Boolean);
    const titulars = newUser.titulars.map((titular) => titular.trim()).filter(Boolean);
    if (!names.length || !phones.length) {
      onNotify?.("El usuario necesita al menos un nombre y un número de teléfono.");
      return;
    }
    if (!userInfoValueFor(newUser.userInfo)) {
      onNotify?.("El usuario necesita un panel.");
      return;
    }
    if (!newUser.boxes.length) {
      onNotify?.("El usuario necesita al menos una caja.");
      return;
    }
    if (!newUser.subPlatforms.length) {
      onNotify?.("El usuario necesita al menos una plataforma.");
      return;
    }
    updateUsers([...users, { ...newUser, id: `user-${crypto.randomUUID()}`, names, phones, titulars, createdAt: new Date(newUser.createdAt).toISOString(), clarifications: [], linkedUsers: [] }]);
    setNewUserOpen(false);
  };
  const userInfoOptionsFor = (selectedBoxes) => selectedBoxes.flatMap((boxId) => (userInfoOptionsByBox[String(boxId)] || []).map((label) => ({ value: `${boxId}::${label}`, label: `${boxById[String(boxId)]?.title || "Caja"} · ${label}`, boxId })));
  const userInfoValueFor = (userInfo) => typeof userInfo === "object" ? (userInfo?.boxId && userInfo?.value ? `${userInfo.boxId}::${userInfo.value}` : "") : String(userInfo || "");
  const userInfoFromValue = (value) => { const separator = value.indexOf("::"); return separator < 0 ? null : { boxId: value.slice(0, separator), value: value.slice(separator + 2) }; };
  useEffect(() => {
    if (!persistUsersRef.current) return undefined;
    const timer = window.setTimeout(() => {
      persistUsersRef.current = false;
      Promise.resolve(onConfigChange({ ...config, users: editableUsers, userClarifications: globalClarifications, platformSubPlatforms: globalPlatformSubPlatforms })).catch((error) => onNotify?.(error.message));
    }, 350);
    return () => window.clearTimeout(timer);
  }, [editableUsers, globalClarifications, globalPlatformSubPlatforms, activeBoxId, boxes, api, config, onConfigChange, onNotify]);
  const normalizeIdList = (list) => Array.isArray(list) ? list.filter(Boolean).map(String) : [];
  const compactValues = (values, fallback) => {
    const cleanValues = values.map((value) => String(value || "").trim()).filter(Boolean);
    if (!cleanValues.length) return fallback;
    return `${cleanValues[0]}${cleanValues.length > 1 ? ` (${cleanValues.slice(1).join(" / ")})` : ""}`;
  };
  const isMatch = (user, query) => {
    if (!query) return true;
    const haystack = [
      ...(user.names || []),
      ...(user.phones || []),
      ...(user.titulars || []),
      user.createdAt,
      ...(user.boxes || []),
      ...(user.boxes || []).map((boxId) => boxById[String(boxId)]?.title || ""),
      ...(user.subPlatforms || []),
      ...(user.linkedUsers || []),
      ...clarifications.filter((clarification) => (user.clarifications || []).includes(clarification.id)).map((clarification) => clarification.text),
    ].join(" ").toLowerCase();
    return haystack.includes(query.toLowerCase());
  };
  const sortUsers = (items) => {
    const sorted = [...items];
    if (sortMode === "name-asc" || sortMode === "name-desc") {
      sorted.sort((first, second) => {
        const firstName = String(first.names?.find(Boolean) || first.titulars?.find(Boolean) || "").toLowerCase();
        const secondName = String(second.names?.find(Boolean) || second.titulars?.find(Boolean) || "").toLowerCase();
        return sortMode === "name-asc" ? firstName.localeCompare(secondName) : secondName.localeCompare(firstName);
      });
    }
    return sorted;
  };
  const groupLabel = (user) => {
    if (groupMode === "box") return user.boxes?.map((id) => boxById[String(id)]?.title).filter(Boolean).join(" / ") || "Sin caja";
    if (groupMode === "clarification") return clarifications.filter((item) => user.clarifications?.includes(item.id)).map((item) => item.text).filter(Boolean).join(" / ") || "Sin aclaración";
    if (groupMode === "subplatform") return user.subPlatforms?.map((item) => item.split("::").at(-1)).filter(Boolean).join(" / ") || "Sin subplataforma";
    if (groupMode === "linked") return user.linkedUsers?.length ? "Vinculados" : "Sin vínculos";
    return "Todos";
  };
  const renderListField = (label, valueList, onAdd, onUpdate, onDelete, onReorder, editable = true) => {
    const addLabel = label.includes("Nombre") ? "Agregar Nombre de Usuario" : label.includes("teléfono") ? "Agregar Número de Teléfono" : "Agregar Titular";
    const reorder = (targetIndex) => {
      if (dragIndex === null || dragIndex === targetIndex) return;
      const next = [...valueList];
      const [moved] = next.splice(dragIndex, 1);
      next.splice(targetIndex, 0, moved);
      onReorder(next);
      setDragIndex(null);
    };
    return (
      <>
      <div className="users-list-field" data-editable={editable}>
        <span>{label}</span>
        <div className="users-inline-list">
          {(valueList.length ? valueList : [""]).map((value, index) => (
            <div key={`${label}-${index}`} className="users-list-item" draggable={editable && index > 0} onDragStart={() => index > 0 && setDragIndex(index)} onDragOver={(event) => event.preventDefault()} onDrop={() => reorder(index)} onDragEnd={() => setDragIndex(null)}>
              <input
                value={value}
                placeholder={label}
                disabled={!editable}
                onChange={(event) => onUpdate(index, event.target.value)}
                data-mode={editable ? "edit" : "readonly"}
              />
              {index > 0 && editable && <button type="button" className="delete-button" title={`Eliminar ${label}`} onClick={async () => { if (await confirmDelete(`¿Eliminar "${value || "vacío"}"?`)) onDelete(index); }}><Trash2 size={13} /></button>}
            </div>
          ))}
          {editable && <button className="config-add" type="button" disabled={!valueList.length || !String(valueList[valueList.length - 1] || "").trim()} onClick={onAdd}><Plus size={15} /> {addLabel}</button>}
        </div>
      </div>
      {valueList === newUser.titulars && <label className="field-block"><span>Panel</span><select value={userInfoValueFor(newUser.userInfo)} onChange={(event) => setNewUser((current) => ({ ...current, userInfo: userInfoFromValue(event.target.value) }))}><option value="">Sin seleccionar</option>{userInfoOptionsFor(newUser.boxes || []).map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}</select></label>}
      </>
    );
  };
  const visibleUsers = sortUsers(users.filter((user) => isMatch(user, search)));
  const groupedUsers = groupMode === "none"
    ? [["", visibleUsers]]
    : [...new Map(visibleUsers.map((user) => [groupLabel(user), []])).entries()].map(([label]) => [label, visibleUsers.filter((user) => groupLabel(user) === label)]);
  return <main className="users-page">
    <section className="panel users-panel">
      <div className="users-head">
        <div>
          <h2><Users size={18} /> Usuarios</h2>
          <span>{users.length} registros</span>
        </div>
        <div className="users-search">
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por nombre, teléfono, titular o caja" />
          <button className={`icon-button users-filter-button ${filtersOpen ? "active" : ""}`} type="button" title="Filtros y orden" onClick={() => setFiltersOpen(!filtersOpen)}><Settings2 size={15} /></button>
          {filtersOpen && <div className="users-filter-menu"><label><span>Ordenar</span><select value={sortMode} onChange={(event) => setSortMode(event.target.value)}><option value="none">Sin ordenar</option><option value="name-asc">Nombre A-Z</option><option value="name-desc">Nombre Z-A</option></select></label><label><span>Agrupar por</span><select value={groupMode} onChange={(event) => setGroupMode(event.target.value)}><option value="none">Sin agrupar</option><option value="clarification">Aclaraciones</option><option value="box">Caja</option><option value="subplatform">Subplataforma</option><option value="linked">Vínculos</option></select></label></div>}
        </div>
      </div>
      <div className="users-actions">
        <button className="config-add" type="button" onClick={openNewUser}><UserPlus size={15} /> Nuevo usuario</button>
      </div>
      <div className="users-list">
        {groupedUsers.map(([groupLabelValue, groupUsers]) => <React.Fragment key={groupLabelValue || "all-users"}>{groupMode !== "none" && <div className="users-group-title">{groupLabelValue}</div>}{groupUsers.map((user) => {
          const selectedUserBoxes = normalizeIdList(user.boxes);
          const selectedClarifications = new Set(normalizeIdList(user.clarifications));
          const linkedOptions = users.filter((other) => other.id !== user.id).map((other) => ({ value: other.id, label: [...(other.names || [])].filter(Boolean).join(" / ") || other.titular || "Usuario sin nombre" }));
          const expanded = expandedUserId === user.id;
          const editing = editingUserId === user.id;
          const displayClarifications = clarifications.filter((clarification) => selectedClarifications.has(clarification.id));
          const userBoxes = selectedUserBoxes.map((boxId) => boxById[boxId]).filter(Boolean);
          const compactName = compactValues(user.names || [], compactValues(user.titulars || [], "Usuario sin nombre"));
          const userSubPlatforms = (boxes || []).filter((box) => selectedUserBoxes.includes(String(box.id))).flatMap((box) => boxSubPlatformsFor(box.id)).filter((option) => (user.subPlatforms || []).includes(option.key));
          const unlinkUser = (linkedUserId) => updateUsers(users.map((item) => item.id === user.id ? { ...item, linkedUsers: (item.linkedUsers || []).filter((id) => id !== linkedUserId) } : item.id === linkedUserId ? { ...item, linkedUsers: (item.linkedUsers || []).filter((id) => id !== user.id) } : item));
          return (
          <div className={`user-card ${expanded ? "expanded" : "compact"}`} key={user.id}>
            <div className="user-card-head" onClick={() => { setExpandedUserId(expanded ? null : user.id); setEditingUserId(null); }} style={{ cursor: "pointer" }}>
              <button className="icon-button user-collapse" type="button" title={expanded ? "Minimizar" : "Expandir"} onClick={(event) => { event.stopPropagation(); setExpandedUserId(expanded ? null : user.id); setEditingUserId(null); }}><ChevronDown size={15} style={{ transform: expanded ? "rotate(0)" : "rotate(-90deg)", transition: "transform 0.2s" }} /></button>
              <div className="user-card-title"><strong>{compactName.toLowerCase()}</strong><div className="clarification-underline" aria-label="Aclaraciones seleccionadas">{displayClarifications.map((clarification) => <i key={clarification.id} title={clarification.text} style={{ background: boxColorStyle(clarification.color || "teal")["--box-accent"] }} />)}</div></div>
              <div className="user-assignment-pills" aria-label="Cajas y subplataformas del usuario"><div className="user-box-pills">{userBoxes.map((box) => <span key={box.id} style={{ "--box-pill-accent": boxColorStyle(box.color)["--box-accent"] }}>{box.title}</span>)}</div>{userSubPlatforms.length > 0 && <b>|</b>}<div className="user-subplatform-pills">{userSubPlatforms.map((option) => <span key={option.key} style={{ "--box-pill-accent": boxColorStyle(option.color)["--box-accent"] }}>{option.label}</span>)}</div></div>
              <button className="icon-button user-edit" type="button" title={editing ? "Salir del modo edición" : "Editar usuario"} onClick={(event) => { event.stopPropagation(); if (editing) { setEditingUserId(null); return; } setExpandedUserId(user.id); setEditingUserId(user.id); }}>{editing ? <Check size={15} /> : <Pencil size={15} />}</button>
              <button className="delete-button user-delete" type="button" title="Eliminar usuario" onClick={async (event) => { event.stopPropagation(); if (await confirmDelete(`¿Eliminar a ${user.names?.[0] || "este usuario"}?`)) updateUsers(users.filter((item) => item.id !== user.id)); }}><Trash2 size={15} /></button>
            </div>
            {expanded && <>
            <div className="user-fields-grid">
              {renderListField("Nombre de usuario", Array.isArray(user.names) && user.names.length ? user.names : [""], () => updateUsers(users.map((item) => item.id === user.id ? { ...item, names: [...(item.names || [""]), ""] } : item)), (index, value) => updateUsers(users.map((item) => item.id === user.id ? { ...item, names: (item.names || [""]).map((name, nameIndex) => nameIndex === index ? value : name) } : item)), (index) => updateUsers(users.map((item) => item.id === user.id ? { ...item, names: (item.names || []).filter((_, nameIndex) => nameIndex !== index) } : item)), (newNames) => updateUsers(users.map((item) => item.id === user.id ? { ...item, names: newNames } : item)), editing)}
              {renderListField("Número de teléfono", Array.isArray(user.phones) && user.phones.length ? user.phones : [""], () => updateUsers(users.map((item) => item.id === user.id ? { ...item, phones: [...(item.phones || [""]), ""] } : item)), (index, value) => updateUsers(users.map((item) => item.id === user.id ? { ...item, phones: (item.phones || [""]).map((phone, phoneIndex) => phoneIndex === index ? value : phone) } : item)), (index) => updateUsers(users.map((item) => item.id === user.id ? { ...item, phones: (item.phones || []).filter((_, phoneIndex) => phoneIndex !== index) } : item)), (newPhones) => updateUsers(users.map((item) => item.id === user.id ? { ...item, phones: newPhones } : item)), editing)}
              {renderListField("Titular", Array.isArray(user.titulars) && user.titulars.length ? user.titulars : [""], () => updateUsers(users.map((item) => item.id === user.id ? { ...item, titulars: [...(item.titulars || [""]), ""] } : item)), (index, value) => updateUsers(users.map((item) => item.id === user.id ? { ...item, titulars: (item.titulars || [""]).map((titular, titularIndex) => titularIndex === index ? value : titular) } : item)), (index) => updateUsers(users.map((item) => item.id === user.id ? { ...item, titulars: (item.titulars || []).filter((_, titularIndex) => titularIndex !== index) } : item)), (newTitulars) => updateUsers(users.map((item) => item.id === user.id ? { ...item, titulars: newTitulars } : item)), editing)}
              <label className="field-block">
                <span>Panel</span>
                <select required disabled={!editing} value={userInfoValueFor(user.userInfo)} onChange={(event) => { if (!event.target.value) { onNotify?.("El usuario necesita un panel."); return; } updateUsers(users.map((item) => item.id === user.id ? { ...item, userInfo: userInfoFromValue(event.target.value) } : item)); }}><option value="">Sin seleccionar</option>{userInfoOptionsFor(selectedUserBoxes).map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}</select>
              </label>
              <label className="field-block">
                <span>Fecha creación</span>
                <input type="datetime-local" disabled={!editing} value={user.createdAt ? new Date(user.createdAt).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16)} onChange={(event) => updateUsers(users.map((item) => item.id === user.id ? { ...item, createdAt: new Date(event.target.value).toISOString() } : item))} />
              </label>
            </div>
            <div className="user-checks-grid">
              <div className="check-group">
                <span>Cajas</span>
                <div className="checkbox-list">
                  {(boxes || []).filter((box) => editing || selectedUserBoxes.includes(box.id)).map((box) => {
                    const checked = selectedUserBoxes.includes(box.id);
                    return <label className="user-switch" key={box.id} style={{ "--switch-accent": boxColorStyle(box.color)["--box-accent"] }}><input type="checkbox" disabled={!editing} checked={checked} onChange={() => { if (checked && selectedUserBoxes.length <= 1) { onNotify?.("El usuario necesita al menos una caja."); return; } if (checked && (user.subPlatforms || []).filter((key) => key.startsWith(`${box.id}::`)).length === (user.subPlatforms || []).length) { onNotify?.("El usuario necesita al menos una plataforma."); return; } updateUsers(users.map((item) => item.id === user.id ? { ...item, boxes: checked ? (item.boxes || []).filter((id) => id !== box.id) : [...(item.boxes || []), box.id], subPlatforms: checked ? (item.subPlatforms || []).filter((key) => !key.startsWith(`${box.id}::`)) : (item.subPlatforms || []) } : item)); }} /><i /> <span>{box.title}</span></label>;
                  })}
                </div>
              </div>
              <div className="check-group">
                <span>Plataformas</span>
                <div className="checkbox-list subplatforms-grouped">
                  {(boxes || []).filter((box) => selectedUserBoxes.includes(box.id)).map((box) => {
                    const subOptions = boxSubPlatformsFor(box.id);
                    const visibleOptions = subOptions.filter((option) => editing || (user.subPlatforms || []).includes(option.key));
                    if (visibleOptions.length === 0) return null;
                    return <div key={box.id} className="subplatforms-group" style={{ "--box-pill-accent": boxColorStyle(box.color)["--box-accent"] }}><div className="subplatforms-group-title">{box.title}</div>{visibleOptions.map((option) => <label className="user-switch" key={option.key} style={{ "--switch-accent": boxColorStyle(option.color)["--box-accent"] }}><input type="checkbox" disabled={!editing} checked={(user.subPlatforms || []).includes(option.key)} onChange={() => { const checked = (user.subPlatforms || []).includes(option.key); if (checked && (user.subPlatforms || []).length <= 1) { onNotify?.("El usuario necesita al menos una plataforma."); return; } updateUsers(users.map((item) => item.id === user.id ? { ...item, subPlatforms: checked ? (item.subPlatforms || []).filter((sub) => sub !== option.key) : [...(item.subPlatforms || []), option.key] } : item)); }} /><i /> <span>{option.label}</span></label>)}</div>;
                  })}
                </div>
              </div>
            </div>
            <div className="user-clarifications">
              <span>Aclaraciones</span>
              <div className="checkbox-list compact">
                {(clarifications || []).filter((clarification) => editing || selectedClarifications.has(clarification.id)).map((clarification) => {
                  const checked = selectedClarifications.has(clarification.id);
                  return <label key={clarification.id} className="clarification-pill user-switch" style={{ "--switch-accent": boxColorStyle(clarification.color || "teal")["--box-accent"], borderColor: clarification.color ? `var(--${clarification.color})` : undefined, color: `var(--${clarification.color || "teal"})` }}>
                    <input type="checkbox" disabled={!editing} checked={checked} onChange={() => updateUsers(users.map((item) => item.id === user.id ? { ...item, clarifications: checked ? (item.clarifications || []).filter((id) => id !== clarification.id) : [...(item.clarifications || []), clarification.id] } : item))} />
                    <i /> <span>{clarification.emoji || "•"} {clarification.text || "Aclaración"}</span>
                  </label>;
                })}
              </div>
            </div>
            <div className="user-linked-section">
              <span>Usuarios vinculados</span>
              <div className="user-linked-controls">
                <input list={`linked-users-${user.id}`} disabled={!editing} placeholder="Buscar usuario para vincular" />
                <datalist id={`linked-users-${user.id}`}>
                  {linkedOptions.length ? linkedOptions.map((option) => <option key={option.value} value={option.label} />) : <option value="No se encontraron usuarios" disabled />}
                </datalist>
                <button type="button" className="config-add" disabled={!editing} onClick={() => {
                  const list = document.querySelector(`#linked-users-${user.id}`);
                  const input = list?.previousElementSibling;
                  if (!input || !input.value) return;
                  const selected = linkedOptions.find((option) => option.label === input.value);
                  if (!selected) return;
                  if ((user.linkedUsers || []).includes(selected.value)) return;
                  updateUsers(users.map((item) => {
                    if (item.id === user.id) return { ...item, linkedUsers: [...(item.linkedUsers || []), selected.value] };
                    if (item.id === selected.value) return { ...item, linkedUsers: [...(item.linkedUsers || []), user.id] };
                    return item;
                  }));
                  input.value = "";
                }}>Vincular</button>
              </div>
              <div className="linked-tags">
                {((user.linkedUsers || []).map((linkedId) => users.find((entry) => entry.id === linkedId)).filter(Boolean)).map((linkedUser) => <span key={linkedUser.id} className="linked-tag">{((linkedUser.names || []).filter(Boolean).join(" / ") || linkedUser.titular || "Usuario").trim()}<button type="button" title="Desvincular usuario" disabled={!editing} onClick={async () => { if (await confirmDelete(`¿Desvincular de ${((linkedUser.names || []).filter(Boolean)[0] || "este usuario")}?`)) unlinkUser(linkedUser.id); }}><X size={11} /></button></span>)}
              </div>
            </div>
            </>}
          </div>
          );
        })}</React.Fragment>)}
        {users.length === 0 && <div className="empty-state">No hay usuarios cargados todavía.</div>}
      </div>
      {sharedUserOpen && <UserCreateModal config={config} boxes={boxes} activeBoxId={activeBoxId} userInfoOptionsByBox={userInfoOptionsByBox} onClose={() => setSharedUserOpen(false)} onSave={(user) => { updateUsers([...users, { ...user, id: `user-${crypto.randomUUID()}` }]); setSharedUserOpen(false); onNotify?.("Usuario dado de alta."); }} onNotify={onNotify} />}
      {newUserOpen && <div className="modal-backdrop" onClick={() => setNewUserOpen(false)}><div className="modal users-create-modal" onClick={(event) => event.stopPropagation()}><button className="modal-close" type="button" title="Cancelar" onClick={() => setNewUserOpen(false)}><X size={18} /></button><div className="modal-icon"><UserPlus size={21} /></div><h2>Nuevo usuario</h2><p>Completá los datos obligatorios para darlo de alta.</p><div className="user-fields-grid"><div>{renderListField("Nombre de usuario *", newUser.names, () => setNewUser((current) => ({ ...current, names: [...current.names, ""] })), (index, value) => setNewUser((current) => ({ ...current, names: current.names.map((name, nameIndex) => nameIndex === index ? value : name) })), (index) => setNewUser((current) => ({ ...current, names: current.names.filter((_, nameIndex) => nameIndex !== index) })), (newNames) => setNewUser((current) => ({ ...current, names: newNames })))}</div><div>{renderListField("Número de teléfono *", newUser.phones, () => setNewUser((current) => ({ ...current, phones: [...current.phones, ""] })), (index, value) => setNewUser((current) => ({ ...current, phones: current.phones.map((phone, phoneIndex) => phoneIndex === index ? value : phone) })), (index) => setNewUser((current) => ({ ...current, phones: current.phones.filter((_, phoneIndex) => phoneIndex !== index) })), (newPhones) => setNewUser((current) => ({ ...current, phones: newPhones })))}</div><div>{renderListField("Titular", newUser.titulars, () => setNewUser((current) => ({ ...current, titulars: [...current.titulars, ""] })), (index, value) => setNewUser((current) => ({ ...current, titulars: current.titulars.map((titular, titularIndex) => titularIndex === index ? value : titular) })), (index) => setNewUser((current) => ({ ...current, titulars: current.titulars.filter((_, titularIndex) => titularIndex !== index) })), (newTitulars) => setNewUser((current) => ({ ...current, titulars: newTitulars })))}</div><label className="field-block"><span>Fecha creación</span><input type="datetime-local" value={new Date(newUser.createdAt).toISOString().slice(0, 16)} onChange={(event) => setNewUser((current) => ({ ...current, createdAt: new Date(event.target.value).toISOString() }))} /></label></div><div className="user-checks-grid"><div className="check-group"><span>Cajas</span><div className="checkbox-list">{(boxes || []).map((box) => {const checked = newUser.boxes.includes(box.id); return <label className="user-switch" key={box.id} style={{ "--switch-accent": boxColorStyle(box.color)["--box-accent"] }}><input type="checkbox" checked={checked} onChange={() => setNewUser((current) => ({ ...current, boxes: checked ? (current.boxes || []).filter((id) => id !== box.id) : [...(current.boxes || []), box.id] }))} /><i /> <span>{box.title}</span></label>;})}</div></div><div className="check-group"><span>Subplataformas</span><div className="checkbox-list subplatforms-grouped">{(boxes || []).filter((box) => newUser.boxes.includes(box.id)).map((box) => {const platforms = config?.platforms || []; const subOptions = platforms.flatMap((platform) => {const subsList = Array.isArray(platformSubPlatforms[platform]) ? platformSubPlatforms[platform] : []; if (subsList.length === 0) return []; return subsList.map((sub) => {const subName = typeof sub === 'string' ? sub : sub?.name || ''; const subColor = typeof sub === 'string' ? (config.platformColors?.[platform] || "teal") : (sub?.color || config.platformColors?.[platform] || "teal"); return { key: `${box.id}::${platform}::${subName}`, label: subName, color: subColor };});}); if (subOptions.length === 0) return null; return <div key={box.id} className="subplatforms-group" style={{ "--box-pill-accent": boxColorStyle(box.color)["--box-accent"] }}><div className="subplatforms-group-title">{box.title}</div>{subOptions.map((option) => <label className="user-switch" key={option.key} style={{ "--switch-accent": boxColorStyle(option.color)["--box-accent"] }}><input type="checkbox" checked={((newUser.subPlatforms || []).includes(option.key))} onChange={() => setNewUser((current) => ({ ...current, subPlatforms: ((current.subPlatforms || []).includes(option.key)) ? (current.subPlatforms || []).filter((sub) => sub !== option.key) : [...(current.subPlatforms || []), option.key] }))} /><i /> <span>{option.label}</span></label>)}</div>;})}</div></div></div><div className="modal-actions"><button className="ghost-button" type="button" onClick={() => setNewUserOpen(false)}>Cancelar</button><button className="close-button" type="button" onClick={saveNewUser}>Guardar <Check size={16} /></button></div></div></div>}
    </section>
  </main>;
}

function BonusesPage({ config, activeBoxId, api, onNotify, onWrite, onVersionChange, onConflict }) {
  const [bonuses, setBonuses] = useState([]);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [sortBy, setSortBy] = useState("percentage");
  const [sortDirection, setSortDirection] = useState("asc");
  const [groupBy, setGroupBy] = useState("type");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [creatingThumbnails, setCreatingThumbnails] = useState(false);
  const types = config.bonusTypes || [];
  const conditions = config.bonusConditions || [];
  const imageUrl = (id, download = false) => `${import.meta.env.VITE_API_URL || ""}/api/bonos/${id}/imagen?boxId=${activeBoxId}${download ? "&download=1" : "&mini=1"}`;
  const loadBonuses = async () => setBonuses(await api(`/api/bonos?boxId=${activeBoxId}`));
  const conditionsForType = (typeId, existing = []) => { const count = types.find((type) => type.id === typeId)?.percentageCount || 0; return Array.from({ length: count }, (_, index) => existing[index] ? { platform: "", ...existing[index] } : conditions[index] ? { conditionId: conditions[index].id, percentage: "", platform: "" } : { conditionId: "", percentage: "", platform: "" }); };
  const conditionAllowsPlatform = (conditionId) => conditions.find((condition) => condition.id === conditionId)?.allowPlatform === true;
  useEffect(() => { loadBonuses().catch((error) => onNotify(error.message)); }, [activeBoxId]);
  const openEditor = (bonus = null) => {
    setEditing(bonus);
    setForm(bonus ? { name: bonus.name, typeId: bonus.typeId, conditions: conditionsForType(bonus.typeId, bonus.conditions || []) } : { name: "", typeId: types[0]?.id || "", conditions: conditionsForType(types[0]?.id || "") });
    setImageFile(null);
  };
  const updateCondition = (index, patch) => setForm((current) => ({ ...current, conditions: current.conditions.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item) }));
  const save = async () => {
    if (!form?.name.trim() || !form.typeId || (!editing && !imageFile)) { onNotify("Completá nombre, tipo e imagen."); return; }
    setSaving(true);
    try {
      const saved = await onWrite(async (version) => {
        const result = editing ? await api(`/api/bonos/${editing.id}?boxId=${activeBoxId}`, { method: "PUT", body: JSON.stringify({ ...form, updatedAt: version }) }) : await api(`/api/bonos?boxId=${activeBoxId}`, { method: "POST", body: JSON.stringify({ ...form, updatedAt: version }) });
        if (!imageFile) return result;
        const uploadResponse = await fetch(`${import.meta.env.VITE_API_URL || ""}/api/bonos/${result.bonus.id}/imagen?boxId=${activeBoxId}`, { method: "POST", headers: { "Content-Type": imageFile.type, "X-File-Name": encodeURIComponent(imageFile.name), "X-Updated-At": result.updatedAt }, body: imageFile });
        const uploadResult = await uploadResponse.json();
        if (!uploadResponse.ok || uploadResult.error) throw new Error(uploadResult.message || uploadResult.error || "No se pudo subir la imagen");
        return { ...result, updatedAt: uploadResult.updatedAt };
      });
      onVersionChange?.(saved.updatedAt);
      await loadBonuses(); setForm(null); setEditing(null); onNotify("Bono guardado");
    } catch (error) { if (error.status === 409 || error.code === "OUTDATED_STATE") await onConflict?.(); else onNotify(error.message); } finally { setSaving(false); }
  };
  const remove = async (bonus) => { if (!window.confirm(`¿Eliminar el bono "${bonus.name}"?`)) return; setSaving(true); try { const result = await onWrite((version) => api(`/api/bonos/${bonus.id}?boxId=${activeBoxId}`, { method: "DELETE", body: JSON.stringify({ updatedAt: version }) })); onVersionChange?.(result.updatedAt); await loadBonuses(); setForm(null); setEditing(null); onNotify("Bono eliminado"); } catch (error) { if (error.status === 409 || error.code === "OUTDATED_STATE") await onConflict?.(); else onNotify(error.message); } finally { setSaving(false); } };
  const createThumbnails = async () => {
    setCreatingThumbnails(true);
    try {
      const result = await api("/api/bonos/miniaturas", { method: "POST" });
      onNotify(`Miniaturas creadas: ${result.created}. Fallidas: ${result.failed}.`);
    } catch (error) {
      onNotify(error.message);
    } finally {
      setCreatingThumbnails(false);
    }
  };
  const filtered = bonuses.filter((bonus) => (!typeFilter || bonus.typeId === typeFilter) && `${bonus.name} ${types.find((type) => type.id === bonus.typeId)?.name || ""} ${(bonus.conditions || []).map((item) => `${item.percentage}% ${conditions.find((condition) => condition.id === item.conditionId)?.label || ""}`).join(" ")}`.toLowerCase().includes(search.toLowerCase()));
  const percentageFor = (bonus) => number(bonus.conditions?.at(-1)?.percentage);
  const platformFor = (bonus) => bonus.conditions?.at(-1)?.platform || "Todas";
  const typeOrder = new Map(types.map((type, index) => [type.name, index]));
  const typeNameFor = (bonus) => types.find((type) => type.id === bonus.typeId)?.name || "Sin tipo";
  const sorted = filtered.slice().sort((left, right) => {
    const values = sortBy === "name" ? [left.name, right.name] : sortBy === "type" ? [typeNameFor(left), typeNameFor(right)] : sortBy === "percentage" ? [percentageFor(left), percentageFor(right)] : [left.createdAt || "", right.createdAt || ""];
    const comparison = typeof values[0] === "number" ? values[0] - values[1] : String(values[0]).localeCompare(String(values[1]), "es", { sensitivity: "base" });
    return (sortDirection === "asc" ? comparison : -comparison) || left.name.localeCompare(right.name, "es", { sensitivity: "base" });
  });
  const groups = sorted.reduce((result, bonus) => {
    const groupValue = groupBy === "type" ? typeNameFor(bonus) : groupBy === "percentage" ? `${percentageFor(bonus)}%` : groupBy === "platform" ? platformFor(bonus) : "Todos los bonos";
    const group = result.find((item) => item.label === groupValue);
    if (group) group.items.push(bonus);
    else result.push({ label: groupValue, items: [bonus], value: groupBy === "percentage" ? percentageFor(bonus) : groupValue });
    return result;
  }, []);
  if (groupBy === "percentage") groups.sort((left, right) => left.value - right.value);
  else if (groupBy === "type") groups.sort((left, right) => (typeOrder.get(left.label) ?? Number.MAX_SAFE_INTEGER) - (typeOrder.get(right.label) ?? Number.MAX_SAFE_INTEGER));
  else if (groupBy === "platform") groups.sort((left, right) => left.label.localeCompare(right.label, "es", { sensitivity: "base" }));
  const changeType = (typeId) => setForm((current) => ({ ...current, typeId, conditions: conditionsForType(typeId, current.conditions) }));
  return (
    <main className="bonuses-page">
      <section className="panel bonuses-panel">
        <div className="bonuses-head"><div><h2><Gift size={18} /> Bonos</h2><span>{bonuses.length} registros</span></div><div className="bonuses-toolbar"><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar bono, porcentaje o condición" /><button className="config-add" type="button" title="Generar miniaturas" onClick={createThumbnails} disabled={creatingThumbnails}><Download size={15} /> {creatingThumbnails ? "Generando..." : "Generar miniaturas"}</button><button className={`filter-toggle ${filtersOpen ? "active" : ""}`} type="button" title="Mostrar filtros" aria-label="Mostrar filtros" aria-expanded={filtersOpen} onClick={() => setFiltersOpen((open) => !open)}><SlidersHorizontal size={16} />{(typeFilter || sortBy !== "percentage" || sortDirection !== "asc" || groupBy !== "type") && <i />}</button><button className="icon-button new-bonus-button" type="button" title="Nuevo bono" aria-label="Nuevo bono" onClick={() => openEditor()}><Plus size={17} /></button>{filtersOpen && <div className="bonus-filters"><label><span>Tipo</span><select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}><option value="">Todos los tipos</option>{types.map((type) => <option value={type.id} key={type.id}>{type.name}</option>)}</select></label><label><span>Ordenar por</span><select value={sortBy} onChange={(event) => setSortBy(event.target.value)}><option value="percentage">Porcentaje</option><option value="name">Nombre</option><option value="type">Tipo de bono</option><option value="date">Fecha de alta</option></select></label><label><span>Agrupar por</span><select value={groupBy} onChange={(event) => setGroupBy(event.target.value)}><option value="type">Tipo de bono</option><option value="percentage">Porcentaje</option><option value="platform">Plataforma del porcentaje</option><option value="none">Sin agrupación</option></select></label><button className="sort-direction" type="button" title={sortDirection === "asc" ? "Orden ascendente" : "Orden descendente"} aria-label={sortDirection === "asc" ? "Cambiar a orden descendente" : "Cambiar a orden ascendente"} onClick={() => setSortDirection((direction) => direction === "asc" ? "desc" : "asc")}>{sortDirection === "asc" ? "↑" : "↓"}</button></div>}</div></div>
        <div className="bonus-groups">{groups.map((group) => <section className="bonus-group" key={group.label}><div className="bonus-group-heading"><h3>{groupBy === "none" ? "Resultados" : group.label}</h3><span>{group.items.length} bonos</span></div><div className="bonus-cards">{group.items.map((bonus) => <article className="bonus-card-item" key={bonus.id}>{bonus.imagePath ? <img src={imageUrl(bonus.id)} alt={bonus.name} /> : <div className="bonus-image-empty">Sin imagen</div>}<footer><strong>{bonus.name}</strong><span>{typeNameFor(bonus)}</span><div className="bonus-condition-list">{(bonus.conditions || []).map((item, index) => <small key={`${item.conditionId}-${index}`}>{conditions.find((condition) => condition.id === item.conditionId)?.label || "Sin condición"}: {item.percentage}%{item.platform ? ` · ${item.platform}` : ""}</small>)}</div><div className="bonus-card-actions"><button className="icon-button" title="Editar bono" onClick={() => openEditor(bonus)}><Pencil size={15} /></button><a className="icon-button" title="Descargar imagen original" href={imageUrl(bonus.id, true)}><Download size={15} /></a></div></footer></article>)}</div></section>)}{groups.length === 0 && <div className="empty-state">No se encontraron bonos.</div>}</div>
      </section>
      {form && <div className="modal-backdrop" onClick={() => !saving && setForm(null)}><div className="modal bonus-create-modal" onClick={(event) => event.stopPropagation()}><button className="modal-close" type="button" title="Cancelar" disabled={saving} onClick={() => setForm(null)}><X size={18} /></button><div className="modal-icon"><Gift size={21} /></div><h2>{editing ? "Editar bono" : "Nuevo bono"}</h2><label><span>Imagen</span><input type="file" accept="image/jpeg,image/png,image/webp" disabled={saving} onChange={(event) => setImageFile(event.target.files?.[0] || null)} /></label>{editing?.imageName && !imageFile && <small>Imagen actual: {editing.imageName}</small>}{imageFile && <small className="bonus-upload-status">{saving ? "Subiendo imagen..." : imageFile.name}</small>}<label><span>Nombre</span><input value={form.name} disabled={saving} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label><label><span>Tipo de bono</span><select value={form.typeId} disabled={saving} onChange={(event) => changeType(event.target.value)}>{types.map((type) => <option value={type.id} key={type.id}>{type.name}</option>)}</select></label><div className="bonus-condition-editor"><div className="bonus-condition-editor-head"><span>Porcentajes y condiciones</span></div>{form.conditions.map((item, index) => <div className="bonus-condition-row" key={`${item.conditionId}-${index}`}><input type="number" min="0" max="100" disabled={saving} value={item.percentage} placeholder="%" onChange={(event) => updateCondition(index, { percentage: event.target.value })} /><select value={item.conditionId} disabled={saving} onChange={(event) => updateCondition(index, { conditionId: event.target.value, platform: "" })}><option value="">Sin condición</option>{conditions.map((condition) => <option value={condition.id} key={condition.id}>{condition.label}</option>)}</select>{conditionAllowsPlatform(item.conditionId) && <select value={item.platform || ""} disabled={saving} title="Plataforma del porcentaje" aria-label="Plataforma del porcentaje" onChange={(event) => updateCondition(index, { platform: event.target.value })}><option value="">-</option>{(config.platforms || []).map((platform) => <option value={platform} key={platform}>{platform}</option>)}</select>}</div>)}</div><div className="modal-actions">{editing && <button className="danger-button bonus-delete-action" type="button" disabled={saving} onClick={() => remove(editing)}><Trash2 size={15} /> Eliminar</button>}<button className="ghost-button" type="button" disabled={saving} onClick={() => setForm(null)}>Cancelar</button><button className="close-button" type="button" disabled={saving} onClick={save}>{saving ? "Subiendo..." : "Guardar"} {!saving && <Check size={16} />}</button></div></div></div>}
    </main>
  );
}

function LegacySnapshotView({ caja, calculations, snapshotRef, config, boxes, activeBox }) {
  const wallets = config.accounts.wallets;
  const walletGroups = ["Normal", "Depósitos", "Compartidas", "Ahorro"].map((category) => ({
    category,
    rows: caja.accounts.filter((row) => wallets.some((wallet) => (config.accounts.walletSettings[row.holder]?.[wallet]?.category || "Normal") === category && config.accounts.availability[row.holder]?.[wallet] !== false)),
  })).filter((group) => group.rows.length);
  const totalRows = (rows, kind) => rows.reduce((sum, row) => {
    const expense = kind === "expenses" && config.expenses.find((item) => item.name === row.category);
    return sum + number(row.amount) * (expense?.inverted ? -1 : 1);
  }, 0);
  const shortDate = new Date(caja.date).toLocaleDateString("es-AR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });
  const capitalizedDate = shortDate.charAt(0).toUpperCase() + shortDate.slice(1);
  const movementRows = [
    ["Gastos", "ReceiptText", caja.expenses, "expenses"],
    ["Propinas", "Coins", caja.tips, "tips"],
    ["Cargas T.A.", "ArrowDownToLine", caja.ta, "ta"],
  ];
  const stateFor = (row, wallet) => {
    const state = row.verified?.[wallet];
    return typeof state === "object"
      ? state
      : { collections: Boolean(state), withdrawals: false };
  };
  const isWalletAvailable = (row, wallet) => config.accounts.availability[row.holder]?.[wallet] !== false;
  const rowWalletTotal = (row, category) => wallets.reduce((sum, wallet) => sum + (config.accounts.walletSettings[row.holder]?.[wallet]?.category === category && walletBelongsToBox(row, wallet, config, activeBox?.id) ? number(row.values[wallet]) : 0), 0);
  const walletTotal = (wallet) => caja.accounts.reduce((sum, row) => sum + (walletCountsInCash(row, wallet, config, activeBox?.id) ? number(row.values[wallet]) : 0), 0);
  return (
    <div ref={snapshotRef} className="snapshot-export" style={boxColorStyle(activeBox?.color)}>
      <div className="snapshot-title">
        <h1><strong>Turno {caja.shift} <em>/</em> {caja.shift === "Noche" ? "00:00 - 08:00" : caja.shift === "Mañana" ? "08:00 - 16:00" : "16:00 - 00:00"}</strong>
          {isShiftOutOfTime(caja.shift) && <span style={{ color: "rgb(255, 0, 0)", marginLeft: "1em", fontSize: "1em" }}>CAJA FUERA DE TURNO</span>}
        </h1>
        <p>{capitalizedDate}</p>
      </div>
      <div className="snapshot-summary">
        {[
          ["Sobrante / Faltante", calculations.shortage, "primary"],
          ["Caja inicial", calculations.cashInitial],
          ["Caja final", calculations.cashFinal],
          ["Pre diferencia", calculations.preDifference],
          ["Diferencia", calculations.difference],
          ["Saldo", calculations.balance],
          ["Redondeo", caja.found],
          ["Diferencia caja", calculations.cashDifference],
          ["Diferencia real", calculations.realDifference],
        ].map(([label, value, className = ""]) => (
          <div className={`${className} ${value < 0 ? "negative" : value > 0 ? "positive" : "neutral"}`} key={label}>
            <small>{label}</small>
            <b>{label === "Sobrante / Faltante" && value >= 0 ? "+" : ""}{money(value)}</b>
          </div>
        ))}
      </div>
      <section className="snapshot-panel">
        <h2><WalletCards size={16} /> Matriz de cuentas <small>{caja.accounts.length} titulares · {wallets.length} billeteras</small></h2>
        <table><thead><tr><th>Caja</th>{wallets.map((wallet) => <th className={walletModeClass(config, wallet)} key={wallet}>{wallet}</th>)}<th>Total</th></tr></thead><tbody>
          {walletGroups.flatMap((group) => [group.category !== "Normal" && <tr className="wallet-section-row" key={`${group.category}-title`}><th colSpan={wallets.length + 2}>{`Billeteras ${group.category}`}</th></tr>, ...group.rows.map((row) => <tr key={`${group.category}-${row.holder}`}><th>{row.holder}</th>{wallets.map((wallet) => { const state = stateFor(row, wallet); const stateClass = state.collections && state.withdrawals ? "both" : state.collections ? "collections" : state.withdrawals ? "withdrawals" : ""; const available = config.accounts.walletSettings[row.holder]?.[wallet]?.category === group.category && isWalletAvailable(row, wallet); const valueClass = !available ? "zero-value" : number(row.values[wallet]) !== 0 ? "has-money" : "zero-value"; return <td className={`${valueClass} ${stateClass}`} key={wallet}>{available && <><span>{money(row.values[wallet])}</span><i>{state.collections ? "✓" : ""}{state.withdrawals ? "✓" : ""}</i></>}</td>; })}<td>{money(rowWalletTotal(row, group.category))}</td></tr>)])}
          <tr className="snapshot-wallet-total"><th>Total billetera</th>{wallets.map((wallet) => <th key={wallet}>{money(walletTotal(wallet))}</th>)}<th>{money(wallets.reduce((sum, wallet) => sum + walletTotal(wallet), 0))}</th></tr>
        </tbody></table>
      </section>
      <div className="snapshot-grid">
        {movementRows.map(([title, icon, rows, kind]) => <section className="snapshot-panel" key={title}><h2>{icon === "ReceiptText" ? <ReceiptText size={16} /> : icon === "Coins" ? <Coins size={16} /> : <ArrowDownToLine size={16} />} {title} <small>{rows.length} registros</small></h2><div className="snapshot-list">{rows.map((row) => <div className="snapshot-line" key={row.id}><span>{(kind === "expenses" ? [row.category, row.notes] : [row.user, row.notes]).filter(Boolean).join(" · ")}</span><b>{money(row.amount)}</b></div>)}</div><div className="snapshot-total"><span>Total</span><b>{money(totalRows(rows, kind))}</b></div></section>)}
        <section className="snapshot-panel snapshot-bonuses"><h2><Gift size={16} /> Bonos <small>{caja.bonuses.length} movimientos</small></h2><div className="snapshot-subtitle">Últimos bonos</div><div className="snapshot-list">{caja.bonuses.map((bonus) => <div className={`snapshot-line ${bonus.recovered > 0 ? "recovered" : bonus.publicity ? "publicity" : "granted"}`} key={bonus.id}><span>{bonus.recovered > 0 ? "Recuperado" : bonus.publicity ? "Publicidad" : "Otorgado"}</span><b>{money(bonus.recovered || bonus.granted)}</b></div>)}</div><div className="snapshot-bonus-total"><span>Otorgados <b>{money(caja.bonuses.reduce((sum, bonus) => sum + number(bonus.granted), 0))}</b></span><span>Recuperados <b>{money(caja.bonuses.reduce((sum, bonus) => sum + number(bonus.recovered), 0))}</b></span><strong>Neto <b>{money(calculations.bonuses)}</b></strong></div></section>
        <section className="snapshot-panel"><h2><Ticket size={16} /> Control de fichas <small>Plataformas / casino</small></h2><div className="snapshot-chip-head"><span>Plataforma</span><span>Inicial</span><span>Final</span><span>Saldo</span></div><div className="snapshot-list">{caja.chips.map((chip) => <div className="snapshot-chip-row" key={chip.platform}><span>{chip.platform}</span><b>{money(chip.initial)}</b><b>{money(chip.final)}</b><b className={number(chip.initial) - number(chip.final) < 0 ? "negative" : "positive"}>{money(number(chip.initial) - number(chip.final))}</b></div>)}</div><div className="snapshot-total"><span>Total saldo</span><b className={calculations.balance < 0 ? "negative" : "positive"}>{money(calculations.balance)}</b></div></section>
      </div>
      <div className="snapshot-notes-transfer"><section className="snapshot-panel snapshot-notes"><h2>Notas del turno</h2><div className="snapshot-note-block"><strong>Turno actual</strong><p>{caja.notes || ""}</p></div><div className="snapshot-note-block"><strong>Turno siguiente</strong><p>{caja.nextNotes || ""}</p></div></section><section className="snapshot-panel snapshot-transfers"><h2><ArrowLeftRight size={16} /> Traspasos <small>{(caja.transfers || []).length} movimientos</small></h2><div className="snapshot-list">{(caja.transfers || []).map((transfer) => { const outgoing = transfer.fromBoxId === activeBox?.id; const otherBox = boxes.find((box) => box.id === (outgoing ? transfer.toBoxId : transfer.fromBoxId)); return <div className="snapshot-line" key={transfer.id}><span>{outgoing ? "Salida a" : "Entrada de"} {otherBox?.title || "otra caja"}{transfer.note ? ` · ${transfer.note}` : ""}</span><b>{money(transfer.amount)}</b></div>; })}{!(caja.transfers || []).length && <div className="snapshot-line"><span>Sin traspasos todavía</span></div>}</div></section></div>
    </div>
  );
}

function ConfirmDialog({ dialog, onClose, message, onConfirm, onCancel, confirmLabel = "Confirmar" }) {
  const currentDialog = dialog || (message ? { message, onConfirm, onCancel, confirmLabel } : null);
  if (!currentDialog) return null;
  const handleConfirm = () => {
    currentDialog.onConfirm?.(true);
    onClose();
  };
  const handleCancel = () => {
    currentDialog.onCancel?.(false);
    onClose();
  };
  return createPortal(
    <div className="modal-backdrop" onClick={handleCancel} style={{ zIndex: 10000 }}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "420px", boxShadow: "0 20px 60px rgba(0,0,0,0.5)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", paddingBottom: "16px", borderBottom: "1px solid var(--line)" }}>
          <h2 style={{ margin: 0, fontSize: "18px", fontWeight: "600" }}>Confirmar acción</h2>
          <button className="modal-close" type="button" title="Cerrar" onClick={handleCancel}><X size={18} /></button>
        </div>
        <p style={{ marginBottom: "28px", color: "#c5cdd2", lineHeight: "1.6", fontSize: "15px" }}>{currentDialog.message}</p>
        <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
          <button onClick={handleCancel} style={{ padding: "10px 20px", borderRadius: "6px", border: "1px solid var(--line)", background: "transparent", color: "#e7edf1", cursor: "pointer", fontWeight: "500", fontSize: "14px", transition: "all 0.2s", hover: { background: "var(--panel)" } }}>Cancelar</button>
          <button onClick={handleConfirm} style={{ padding: "10px 20px", borderRadius: "6px", background: "var(--danger)", color: "white", border: "none", cursor: "pointer", fontWeight: "600", fontSize: "14px", transition: "all 0.2s" }}>{currentDialog.confirmLabel || "Confirmar"}</button>
        </div>
      </div>
    </div>,
    document.body
  );
}

function App() {
  const captureRef = React.useRef(null);
  const snapshotRef = React.useRef(null);
  const [caja, setCaja] = useState(null);
  const [history, setHistory] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [offline, setOffline] = useState(() => !navigator.onLine);
  const [lastSavedAt, setLastSavedAt] = useState("");
  const [saveStartedAt, setSaveStartedAt] = useState(null);
  const [confirm, setConfirm] = useState(false);
  const [closeWarning, setCloseWarning] = useState(false);
  const [createPreviousOpen, setCreatePreviousOpen] = useState(false);
  const [creatingPrevious, setCreatingPrevious] = useState(false);
  const [createPreviousError, setCreatePreviousError] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [snapshotOpen, setSnapshotOpen] = useState(false);
  const [logisticsOpen, setLogisticsOpen] = useState(false);
  const [statisticsOpen, setStatisticsOpen] = useState(false);
  const [usersOpen, setUsersOpen] = useState(false);
  const [bonusesOpen, setBonusesOpen] = useState(false);
  const [configurationOpen, setConfigurationOpen] = useState(false);
  const [goalsCollapsed, setGoalsCollapsed] = useState(true);
  const [bonusViewRequest, setBonusViewRequest] = useState(0);
  const [bonusEditorRequest, setBonusEditorRequest] = useState(0);
  const [toast, setToast] = useState("");
  const [apiError, setApiError] = useState("");
  const [config, setConfig] = useState(null);
  const [boxes, setBoxes] = useState(null);
  const [boxHistories, setBoxHistories] = useState({});
  const [updatedAt, setUpdatedAt] = useState(null);
  const updatedAtRef = React.useRef(null);
  const [activeBoxId, setActiveBoxId] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const pendingSaveRef = React.useRef(null);
  const saveTimerRef = React.useRef(null);
  const saveInFlightRef = React.useRef(false);
  const closingRef = React.useRef(false);
  const configSaveChainRef = React.useRef(Promise.resolve());
  const writeQueueRef = React.useRef(Promise.resolve());
  const [notesEnabled, setNotesEnabled] = useState(true);
  const activeBox = boxes?.find((box) => box.id === activeBoxId) || boxes?.[0];
  const activeBoxColors = activeBox ? boxColorStyle(activeBox.color) : {};
  const rememberUpdatedAt = (value) => {
    if (!value) return;
    updatedAtRef.current = value;
    setUpdatedAt(value);
  };
  const rememberBoxSavedAt = (value) => {
    setLastSavedAt(value ? new Intl.DateTimeFormat("es-AR", { hour: "2-digit", minute: "2-digit" }).format(new Date(value)) : "");
  };
  const enqueueWrite = (operation) => {
    const queuedWrite = writeQueueRef.current.catch(() => undefined).then(() => operation(updatedAtRef.current));
    writeQueueRef.current = queuedWrite.catch(() => undefined);
    return queuedWrite;
  };
  const readOnly = caja?.status !== "ABIERTA";
  const isSubpage = configurationOpen || logisticsOpen || statisticsOpen || usersOpen || bonusesOpen;
  const currentPage = configurationOpen ? "Configuración" : logisticsOpen ? "Logística" : statisticsOpen ? "Estadísticas" : usersOpen ? "Usuarios" : bonusesOpen ? "Bonos" : `Caja ${activeBox?.title || ""}`;
  const isReadOnlyAction = (element) => Boolean(element.closest?.(".modal-close, .ghost-button, button[title='Copiar conteo de publicidad'], button[title^='Ver'], button[title^='Cerrar']"));
  useEffect(() => {
    const preventInputDrag = (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      if (target.matches("input, textarea, select, option")) {
        event.preventDefault();
      }
    };
    document.addEventListener("dragstart", preventInputDrag);
    return () => document.removeEventListener("dragstart", preventInputDrag);
  }, []);
  useEffect(() => {
    confirmDialogController = ({ message, onConfirm, onCancel, confirmLabel }) => {
      setConfirmDialog({ message, onConfirm, onCancel, confirmLabel });
    };
    return () => {
      confirmDialogController = null;
    };
  }, []);
  useEffect(() => {
    const content = document.querySelector(".box-content");
    if (!content) return undefined;
    const applyReadOnly = () => {
      content.querySelectorAll("input, textarea, select, button").forEach((element) => {
        element.disabled = readOnly && !isReadOnlyAction(element);
      });
      content.querySelectorAll("[draggable]").forEach((element) => {
        element.draggable = !readOnly;
      });
    };
    applyReadOnly();
    if (!readOnly) return undefined;
    const observer = new MutationObserver(applyReadOnly);
    observer.observe(content, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [readOnly, configurationOpen, statisticsOpen, logisticsOpen, historyOpen, bonusViewRequest, bonusEditorRequest]);
  useEffect(() => {
    setNotesEnabled(true);
  }, [caja?.id]);
  useEffect(() => {
    const submitModalOnEnter = (event) => {
      if (event.key !== "Enter" || event.isComposing) return;
      const modal = event.target.closest?.(".modal") || document.querySelector(".modal:last-of-type");
      const action = modal?.querySelector(".modal-actions button:not(.ghost-button):not([disabled])");
      if (!action || event.target instanceof HTMLTextAreaElement) return;
      event.preventDefault();
      action.click();
    };
    document.addEventListener("keydown", submitModalOnEnter);
    return () => document.removeEventListener("keydown", submitModalOnEnter);
  }, []);
  const notify = (message) => {
    setToast(message);
    clearTimeout(window.toastTimer);
    window.toastTimer = setTimeout(() => setToast(""), 3000);
  };
  useEffect(() => {
    const handleOffline = () => setOffline(true);
    const handleOnline = () => setOffline(false);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);
    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, []);
  useEffect(() => {
    if (!saving || !saveStartedAt) return undefined;
    const timer = window.setTimeout(() => {
      setSaveError("El guardado lleva demasiado tiempo sin confirmación.");
    }, 30 * 1000);
    return () => window.clearTimeout(timer);
  }, [saving, saveStartedAt]);
  useEffect(() => {
    if (!activeBox) return undefined;
    const colors = boxColorStyle(activeBox.color);
    Object.entries(colors).forEach(([name, value]) => document.documentElement.style.setProperty(name, value));
    return undefined;
  }, [activeBox?.color]);
  useEffect(() => {
    api("/api/cajas").then((availableBoxes) => {
      const boxId = availableBoxes[0]?.id;
      setBoxes(availableBoxes);
      setActiveBoxId(boxId);
      return Promise.all([api(`/api/caja/actual?boxId=${boxId}`), api(`/api/caja/historial?boxId=${boxId}`), api(`/api/configuracion?boxId=${boxId}`)]).then(
      ([current, past, settings]) => {
        setCaja(current);
        setHistory(past);
        setBoxHistories({ [boxId]: past });
        setConfig(settings);
        rememberBoxSavedAt(current.lastSavedAt || settings.lastSavedAt);
        rememberUpdatedAt(current.updatedAt || settings.updatedAt);
      },
      );
    }).catch((error) => setApiError(error.message));
  }, []);
  const changeBox = (boxId) => {
    setBonusViewRequest(0); setBonusEditorRequest(0); setActiveBoxId(boxId); setSelectedIndex(0); setConfigurationOpen(false); setStatisticsOpen(false); setLogisticsOpen(false); setCaja(null); setConfig(null);
    Promise.all([api(`/api/caja/actual?boxId=${boxId}`), api(`/api/caja/historial?boxId=${boxId}`), api(`/api/configuracion?boxId=${boxId}`)]).then(([current, past, settings]) => { setCaja(current); setHistory(past); setBoxHistories({ [boxId]: past }); setConfig(settings); rememberBoxSavedAt(current.lastSavedAt || settings.lastSavedAt); rememberUpdatedAt(current.updatedAt || settings.updatedAt); });
  };
  useEffect(() => {
    if (!activeBoxId || saving) return undefined;
    let cancelled = false;
    const refresh = async () => {
      const current = await api(`/api/caja/actual?boxId=${activeBoxId}`);
      if (cancelled || current?.error) return;
      rememberUpdatedAt(current.updatedAt);
      if (selectedIndex === 0) setCaja(current);
    };
    const interval = window.setInterval(refresh, 60000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [activeBoxId, saving, selectedIndex]);
  useEffect(() => {
    if (!activeBoxId) return undefined;
    let cancelled = false;
    const refreshHistory = async () => {
      const past = await api(`/api/caja/historial?boxId=${activeBoxId}`);
      if (!cancelled) setHistory(past);
    };
    const interval = window.setInterval(refreshHistory, 20 * 60 * 1000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [activeBoxId]);
  useEffect(() => {
    if (!boxes?.length) return undefined;
    let cancelled = false;
    Promise.all(boxes.map((box) => api(`/api/caja/historial?boxId=${box.id}`))).then((histories) => {
      if (cancelled) return;
      setBoxHistories(Object.fromEntries(boxes.map((box, index) => [box.id, histories[index]])));
    }).catch((error) => { if (!cancelled) notify(error.message); });
    return () => { cancelled = true; };
  }, [boxes]);
  const assignWallet = async (holder, wallet, boxId) => {
    const optimisticCaja = caja && {
      ...caja,
      accounts: caja.accounts.map((row) => row.holder === holder ? {
        ...row,
        walletBoxes: { ...(row.walletBoxes || {}), [wallet]: boxId || "" },
        walletBoxUpdatedAt: { ...(row.walletBoxUpdatedAt || {}), [wallet]: new Date().toISOString() },
      } : row),
    };
    if (optimisticCaja) setCaja(optimisticCaja);
    try {
      const result = await enqueueWrite((version) => api("/api/caja/asignacion-billetera", { method: "PUT", body: JSON.stringify({ holder, wallet, boxId, updatedAt: version }) }));
      if (result.error) return;
      rememberUpdatedAt(result.updatedAt);
      setSaveError("");
      rememberBoxSavedAt(result.lastSavedAt);
      setCaja((current) => result.currents?.[activeBoxId] || current || result.currents?.[boxId] || optimisticCaja || current);
    } catch (error) {
      if (error.status === 409 || error.code === "OUTDATED_STATE") await syncAfterConflict();
      else notify(error.message);
    }
  };
  const syncAfterConflict = async () => {
    clearTimeout(saveTimerRef.current);
    try {
      const current = await api(`/api/caja/actual?boxId=${activeBoxId}`);
      rememberUpdatedAt(current.updatedAt);
      const pendingPatch = pendingSaveRef.current?.patch;
      if (selectedIndex === 0) setCaja((localCaja) => pendingPatch ? { ...current, ...pendingPatch } : current);
      if (pendingSaveRef.current) {
        pendingSaveRef.current = { ...pendingSaveRef.current, updatedAt: current.updatedAt };
      }
    } finally {
      setSaving(false);
    }
    //notify("Los datos se actualizaron desde otro dispositivo. Por favor revisa tus cambios.");
  };
  const flushSave = async () => {
    if (saveInFlightRef.current || !pendingSaveRef.current) return;
    const queuedSave = pendingSaveRef.current;
    pendingSaveRef.current = null;
    saveInFlightRef.current = true;
    try {
      const savedCaja = await enqueueWrite((version) => api(`${queuedSave.selectedIndex === 0 ? `/api/caja/actualizar?boxId=${queuedSave.boxId}` : `/api/caja/${queuedSave.cajaId}?boxId=${queuedSave.boxId}`}`, {
        method: "PUT",
        body: JSON.stringify({ ...queuedSave.patch, updatedAt: version }),
      }));
      rememberUpdatedAt(savedCaja.updatedAt);
      setSaveError("");
      setOffline(false);
      rememberBoxSavedAt(savedCaja.lastSavedAt);
      if (!pendingSaveRef.current) setCaja(savedCaja);
    } catch (error) {
      if (error.status === 409 || error.code === "OUTDATED_STATE") {
        const newerPending = pendingSaveRef.current;
        pendingSaveRef.current = newerPending
          ? { ...queuedSave, ...newerPending, patch: { ...queuedSave.patch, ...newerPending.patch } }
          : queuedSave;
        await syncAfterConflict();
      }
      else {
        const networkError = error?.name === "TypeError" || error?.name === "AbortError" || !navigator.onLine;
        setOffline(networkError);
        setSaveError(error.message || "No se pudo confirmar el guardado.");
        notify(error.message);
      }
    } finally {
      saveInFlightRef.current = false;
      if (pendingSaveRef.current) {
        pendingSaveRef.current.updatedAt = updatedAtRef.current;
        setSaving(true);
        flushSave();
      } else {
        setSaving(false);
        setSaveStartedAt(null);
      }
    }
  };
  const update = (patch, immediate = false) => {
    setCaja((current) => ({ ...current, ...patch }));
    setSaveError("");
    setSaveStartedAt((current) => current || Date.now());
    pendingSaveRef.current = {
      patch: { ...(pendingSaveRef.current?.patch || {}), ...patch },
      boxId: activeBoxId,
      cajaId: caja?.id,
      selectedIndex,
      updatedAt: updatedAtRef.current,
    };
    setSaving(true);
    clearTimeout(saveTimerRef.current);
    if (immediate) {
      flushSave();
    } else {
      saveTimerRef.current = window.setTimeout(flushSave, 350);
    }
  };
  const updateLogisticsConfig = async (nextConfig) => {
    setConfig(nextConfig);
    const result = await enqueueConfigSave(() => api(`/api/configuracion?boxId=${activeBoxId}`, { method: "PUT", body: JSON.stringify({ ...nextConfig, updatedAt: updatedAtRef.current }) }));
    rememberUpdatedAt(result.updatedAt);
    if (result.config) setConfig(result.config);
  };
  const updateStatisticsConfig = async (nextConfig) => {
    setConfig(nextConfig);
    const result = await enqueueConfigSave(() => api(`/api/configuracion?boxId=${activeBoxId}`, { method: "PUT", body: JSON.stringify({ ...nextConfig, updatedAt: updatedAtRef.current }) }));
    rememberUpdatedAt(result.updatedAt);
    if (result.config) setConfig(result.config);
  };
  const updateConfigState = async (nextConfig) => {
    setConfig(nextConfig);
    const result = await enqueueConfigSave(() => api(`/api/configuracion?boxId=${activeBoxId}`, { method: "PUT", body: JSON.stringify({ ...nextConfig, updatedAt: updatedAtRef.current }) }));
    rememberUpdatedAt(result.updatedAt);
    if (result.config) setConfig(result.config);
  };
  const updateAccountsFromLogistics = (accounts) => update({ accounts }, true);
  const enqueueConfigSave = (operation) => {
    const saveWithRetry = async () => {
      try {
        return await enqueueWrite(() => operation());
      } catch (error) {
        if (error.status !== 409 && error.code !== "OUTDATED_STATE") throw error;
        await syncAfterConflict();
        return enqueueWrite(() => operation());
      }
    };
    const queuedSave = configSaveChainRef.current.catch(() => undefined).then(saveWithRetry);
    configSaveChainRef.current = queuedSave.catch(() => undefined);
    return queuedSave;
  };
  const saveConfig = (nextConfig, boxId) => enqueueConfigSave(async () => {
    const result = await api(`/api/configuracion?boxId=${boxId}`, { method: "PUT", body: JSON.stringify({ ...nextConfig, updatedAt: updatedAtRef.current }) });
    if (boxId === activeBoxId) rememberUpdatedAt(result.updatedAt);
    if (boxId === activeBoxId) {
      setConfig(result.config);
      setCaja(result.current);
    }
    // Replicate global config to all boxes
    if (nextConfig.branding !== undefined || nextConfig.userClarifications !== undefined || nextConfig.platformSubPlatforms !== undefined || nextConfig.users !== undefined) {
      const globalUpdate = {};
      if (nextConfig.branding !== undefined) globalUpdate.branding = { icon: nextConfig.branding.icon, suffix: nextConfig.branding.suffix };
      if (nextConfig.userClarifications !== undefined) globalUpdate.userClarifications = nextConfig.userClarifications;
      if (nextConfig.platformSubPlatforms !== undefined) globalUpdate.platformSubPlatforms = nextConfig.platformSubPlatforms;
      if (nextConfig.users !== undefined) globalUpdate.users = nextConfig.users;
      for (const box of (boxes || []).filter((item) => item.id !== boxId)) {
        const boxConfig = await api(`/api/configuracion?boxId=${box.id}`);
        const replicated = await api(`/api/configuracion?boxId=${box.id}`, { method: "PUT", body: JSON.stringify({ ...boxConfig, ...globalUpdate, branding: nextConfig.branding !== undefined ? { ...(boxConfig.branding || {}), ...globalUpdate.branding } : boxConfig.branding, updatedAt: boxConfig.updatedAt }) });
        rememberUpdatedAt(replicated.updatedAt);
      }
    }
  });
  const manageBoxes = async ({ type, id, patch }) => {
    try {
      if (type === "create") { const created = await enqueueWrite((version) => api("/api/cajas", { method: "POST", body: JSON.stringify({ title: "Nueva caja", color: "blue", updatedAt: version }) })); rememberUpdatedAt(created.updatedAt); const next = [...boxes, created]; setBoxes(next); changeBox(created.id); return; }
      if (type === "delete") { const result = await enqueueWrite((version) => api(`/api/cajas/${id}`, { method: "DELETE", body: JSON.stringify({ updatedAt: version }) })); const next = result.boxes; rememberUpdatedAt(result.updatedAt); setBoxes(next); if (id === activeBoxId) changeBox(next[0].id); return; }
      const updated = await enqueueWrite((version) => api(`/api/cajas/${id}`, { method: "PUT", body: JSON.stringify({ ...patch, updatedAt: version }) })); setBoxes(boxes.map((box) => box.id === id ? updated : box)); rememberUpdatedAt(updated.updatedAt);
    } catch (error) {
      if (error.status === 409 || error.code === "OUTDATED_STATE") await syncAfterConflict();
      else notify(error.message);
    }
  };
  const navigate = (direction) => {
    if (direction > 0 && selectedIndex >= history.length - 1) {
      setCreatePreviousError("");
      setCreatePreviousOpen(true);
      return;
    }
    const nextIndex = Math.max(
      0,
      Math.min(history.length - 1, selectedIndex + direction),
    );
    setSelectedIndex(nextIndex);
    setCaja(history[nextIndex]);
  };
  const createPrevious = async () => {
    setCreatingPrevious(true);
    setCreatePreviousError("");
    try {
      const previous = await enqueueWrite((version) => api(`/api/caja/crear-anterior?boxId=${activeBoxId}`, { method: "POST", body: JSON.stringify({ updatedAt: version }) }));
      rememberUpdatedAt(previous.updatedAt);
      setHistory((currentHistory) => [...currentHistory, previous]);
      setSelectedIndex(history.length);
      setCaja(previous);
      setCreatePreviousOpen(false);
    } catch (error) {
      if (error.status === 409 || error.code === "OUTDATED_STATE") await syncAfterConflict();
      setCreatePreviousError(error.message);
    } finally {
      setCreatingPrevious(false);
    }
  };
  const calculations = useMemo(() => {
    if (!caja || !config) return {};
    const accounts = caja.accounts
      .flatMap((r) => Object.entries(r.values).filter(([wallet]) => walletCountsInCash(r, wallet, config, activeBoxId)).map(([, value]) => value))
      .reduce((s, x) => s + number(x), 0);
    const bonuses = caja.bonuses.reduce(
      (s, x) => s + number(x.granted) - number(x.recovered),
      0,
    );
    const ta = caja.ta.reduce((s, x) => s + number(x.amount), 0);
    const tips = caja.tips.reduce((s, x) => s + number(x.amount), 0);
    const expenses = caja.expenses.reduce((s, x) => {
      const category = config.expenses.find((item) => item.name === x.category);
      return s + number(x.amount) * (category?.inverted ? -1 : 1);
    }, 0);
    const balance = caja.chips.reduce(
      (s, x) => s + number(x.initial) - number(x.final),
      0,
    );
    const cashInitial = number(caja.cashInitial);
    const savings = (caja.savingsMovements || []).reduce((s, x) => s + number(x.amount), 0);
    const cashFinal = accounts;
    const preDifference = expenses + ta + cashFinal + bonuses + savings;
    const difference = preDifference - cashInitial;
    const cashDifference = cashFinal - cashInitial;
    const transferAdjustment = (caja.transfers || []).reduce((sum, transfer) => sum + (transfer.fromBoxId === activeBoxId ? number(transfer.amount) : transfer.toBoxId === activeBoxId ? -number(transfer.amount) : 0), 0);
    const realDifference = difference - bonuses + transferAdjustment;
    const realProfit = realDifference * 0.77;
    const foundTotal = Array.isArray(caja.foundMoney) ? caja.foundMoney.reduce((sum, record) => sum + number(record.amount), 0) : number(caja.found);
    const shortage = difference - balance - tips - foundTotal + number(caja.found) + transferAdjustment;
    return {
      accounts,
      cashInitial,
      cashFinal,
      savings,
      bonuses,
      ta,
      tips,
      expenses,
      foundTotal,
      preDifference,
      difference,
      balance,
      cashDifference,
      realDifference,
      realProfit,
      transferAdjustment,
      shortage,
    };
  }, [caja, config, activeBoxId]);
  const hasPendingNotes = [caja?.notes, caja?.nextNotes].some((note) => typeof note === "string" && note.trim().length > 0);
  if (apiError) return <div className="loading api-error"><X size={20} /><div><strong>No se pudo cargar la caja</strong><p>{apiError}</p><button className="close-button" onClick={() => window.location.reload()}>Reintentar <RefreshCw size={15} /></button></div></div>;
  if (!caja || !boxes)
    return (
      <div className="loading">
        <RefreshCw className="spin" /> Cargando caja...
      </div>
    );
  if (!config) return <div className="loading"><RefreshCw className="spin" /> Cargando configuración...</div>;
  const close = () => {
    if (closingRef.current) return;
    closingRef.current = true;
    clearTimeout(saveTimerRef.current);
    pendingSaveRef.current = null;
    const closingCaja = caja;
    setSaving(true);
    enqueueWrite((version) => api(`/api/caja/cerrar?boxId=${activeBoxId}`, {
      method: "POST",
      body: JSON.stringify({ ...closingCaja, updatedAt: version }),
    })).then((next) => {
      rememberUpdatedAt(next.updatedAt);
      setSaveError("");
      rememberBoxSavedAt(next.lastSavedAt);
      setCaja(next);
      setHistory((currentHistory) => [next, ...currentHistory.filter((item) => String(item.id) !== String(next.id))]);
      setSelectedIndex(0);
      setConfirm(false);
      notify(`Cerrada Caja del turno ${closingCaja.shift} / ${new Date(closingCaja.date).toLocaleDateString("es-AR")}`);
    }).catch(async (error) => {
      if (error.status === 409 || error.code === "OUTDATED_STATE") await syncAfterConflict();
      else notify(error.message);
    }).finally(() => {
      closingRef.current = false;
      setSaving(false);
    });
  };
  const confirmClose = () => {
    if (calculations.shortage !== 0) {
      setConfirm(false);
      setCloseWarning(true);
      return;
    }
    close();
  };
  const downloadSnapshot = async () => {
    if (capturing) return;
    setCapturing(true);
    try {
      await document.fonts.ready;
      await new Promise((resolve) => requestAnimationFrame(resolve));
      if (!snapshotRef.current) throw new Error("No se encontró el reporte para capturar.");
      const canvas = await html2canvas(snapshotRef.current, {
        backgroundColor: "#11121d",
        logging: false,
        scale: 2,
        width: 1920,
        height: 1080,
        useCORS: true,
        windowWidth: 1920,
        windowHeight: 1080,
      });
      const link = document.createElement("a");
      const snapshotDate = new Intl.DateTimeFormat("es-AR", {
        weekday: "long",
        day: "2-digit",
        month: "2-digit",
        year: "2-digit",
      })
        .format(new Date(caja.date))
        .replace(/^./, (letter) => letter.toUpperCase())
        .replace(",", "")
        .replaceAll("/", "-");
      link.download = `Caja ${snapshotDate} Turno ${caja.shift}.png`;
      link.href = canvas.toDataURL("image/png");
      link.style.display = "none";
      document.body.appendChild(link);
      link.click();
      link.remove();
      notify("Captura de caja descargada");
    } catch (error) {
      console.error("No se pudo generar la captura de caja", error);
      notify("No se pudo generar la captura de caja");
    } finally {
      setCapturing(false);
    }
  };
  return (
    <div ref={captureRef} className={`app-shell box-theme-${activeBox.color}`} style={boxColorStyle(activeBox.color)}>
      <SummaryHeader
        caja={caja}
        config={config}
        saving={saving}
        saveError={saveError}
        offline={offline}
        lastSavedAt={lastSavedAt}
        readOnly={readOnly}
        onPrevious={() => navigate(1)}
        onNext={() => navigate(-1)}
        onClose={() => setConfirm(true)}
        onSnapshot={downloadSnapshot}
        capturing={capturing}
        onConfigure={() => setConfigurationOpen(true)}
        boxes={boxes}
        activeBoxId={activeBoxId}
        onBoxChange={changeBox}
      />
      <main>
        <div className="page-title">
          <div className="current-shift-heading">
            {!readOnly && <span className="save-confirmed">Último guardado confirmado: {lastSavedAt || "--:--"}</span>}
            <h1>Turno {caja.shift} <em>/</em> {caja.shift === "Noche" ? "00:00 - 08:00" : caja.shift === "Mañana" ? "08:00 - 16:00" : "16:00 - 00:00"}
               {isShiftOutOfTime(caja.shift) && <span style={{ color: "rgb(255, 0, 0)", marginLeft: "0.5em", fontSize: "0.8em" }}>CAJA FUERA DE TURNO</span>}
            </h1>
            <h2>{new Date(caja.date).toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" })}</h2>
          </div>
          <span className="current-page-label">{currentPage}</span>
          <div className="page-title-lower">
           <div className={`history-actions ${isSubpage ? "has-back" : ""}`}>
             {(statisticsOpen || logisticsOpen || usersOpen || bonusesOpen || configurationOpen) && <button className="history-trigger back-to-caja" title="Volver a Caja" aria-label="Volver a Caja" onClick={() => { setStatisticsOpen(false); setLogisticsOpen(false); setUsersOpen(false); setBonusesOpen(false); setConfigurationOpen(false); }}><ArrowLeft size={17} /></button>}
             {!statisticsOpen && <button className="history-trigger statistics-trigger" title="Estadísticas" aria-label="Estadísticas" onClick={() => { setStatisticsOpen(true); setConfigurationOpen(false); setLogisticsOpen(false); setUsersOpen(false); setBonusesOpen(false); setBonusViewRequest(0); setBonusEditorRequest(0); }}><BarChart3 size={17} /></button>}
             {!logisticsOpen && <button className="history-trigger logistics-trigger" title="Logística" aria-label="Logística" onClick={() => { setLogisticsOpen(true); setConfigurationOpen(false); setStatisticsOpen(false); setUsersOpen(false); setBonusesOpen(false); setBonusViewRequest(0); setBonusEditorRequest(0); }}><WalletCards size={17} /></button>}
             {!usersOpen && <button className="history-trigger users-trigger" title="Usuarios" aria-label="Usuarios" onClick={() => { setUsersOpen(true); setBonusesOpen(false); setConfigurationOpen(false); setStatisticsOpen(false); setLogisticsOpen(false); setBonusViewRequest(0); setBonusEditorRequest(0); }}><Users size={17} /></button>}
             {!bonusesOpen && <button className="history-trigger bonuses-trigger" title="Bonos" aria-label="Bonos" onClick={() => { setBonusesOpen(true); setUsersOpen(false); setConfigurationOpen(false); setStatisticsOpen(false); setLogisticsOpen(false); setBonusViewRequest(0); setBonusEditorRequest(0); }}><Gift size={17} /></button>}
             <button className="history-trigger" title="Cajas recientes" aria-label="Cajas recientes" onClick={() => setHistoryOpen(true)}><Clock3 size={17} /></button>
             {!configurationOpen && <button className="history-trigger" disabled={readOnly} title="Configurar" aria-label="Configurar" onClick={() => { setConfigurationOpen(true); setStatisticsOpen(false); setLogisticsOpen(false); setUsersOpen(false); setBonusesOpen(false); }}><Settings2 size={17} /></button>}
            {hasPendingNotes && <span className="pending-notes">Notas Pendientes</span>}
          </div>
          </div>
        </div>
        <section className={`goals-overview ${goalsCollapsed ? "is-collapsed" : ""}`} style={{ ...activeBoxColors, "--goal-line": activeBoxColors["--box-line"], "--goal-soft": activeBoxColors["--box-soft"] }}>
          <div className="goals-overview-header">
            <span>Objetivos Generales</span>
            {goalsCollapsed && <AdvancedGoalsCompactSummary config={config} caja={caja} history={history} boxColor={activeBox.color} />}
            <button type="button" className="goals-overview-toggle" title={goalsCollapsed ? "Expandir objetivos" : "Minimizar objetivos"} aria-label={goalsCollapsed ? "Expandir objetivos" : "Minimizar objetivos"} aria-expanded={!goalsCollapsed} onClick={() => setGoalsCollapsed((collapsed) => !collapsed)}>
              <ChevronDown size={17} />
            </button>
          </div>
          {!goalsCollapsed && <div className="goals-overview-content">
            <MonthlyGoalProgress config={config} boxColor={activeBox.color} date={caja.date} />
            <SavingsMonthlyGoalProgress config={config} caja={caja} history={history} boxHistories={boxHistories} activeBoxId={activeBoxId} boxColor={activeBox.color} />
            <BonusMonthlyGoalProgress config={config} caja={caja} history={history} boxColor={activeBox.color} />
          </div>}
        </section>
        <div className={`box-content ${readOnly ? "read-only" : ""}`} onClickCapture={(event) => { if (readOnly && !isReadOnlyAction(event.target)) { event.preventDefault(); event.stopPropagation(); } }}>
        {configurationOpen ? <ConfigurationPage config={config} boxes={boxes} activeBoxId={activeBoxId} cajaDate={caja.date} onSave={saveConfig} onBack={() => setConfigurationOpen(false)} onBoxesChanged={manageBoxes} onNotify={notify} api={api} embedded /> : statisticsOpen ? <StatisticsPage history={history} config={config} activeBoxId={activeBoxId} boxes={boxes} boxHistories={boxHistories} onConfigChange={updateStatisticsConfig} /> : logisticsOpen ? <LogisticsPage caja={caja} config={config} boxes={boxes} activeBoxId={activeBoxId} onUpdateAccounts={updateAccountsFromLogistics} onAssignWallet={assignWallet} onConfigChange={updateLogisticsConfig} /> : usersOpen ? <UsersPage config={config} boxes={boxes} activeBoxId={activeBoxId} onConfigChange={updateConfigState} onNotify={notify} api={api} /> : bonusesOpen ? <BonusesPage config={config} activeBoxId={activeBoxId} api={api} onNotify={notify} onWrite={enqueueWrite} onVersionChange={rememberUpdatedAt} onConflict={syncAfterConflict} /> : <><SummaryCard
          caja={caja}
          calculations={calculations}
          update={update}
        />
        <div className="dashboard-grid">
          <div className="content-column">
            <AdvertisingSectionRebuilt caja={caja} update={update} boxes={boxes} config={config} onViewBonuses={() => setBonusViewRequest((request) => request + 1)} onAddManualBonus={() => setBonusEditorRequest((request) => request + 1)} onNotify={notify} />
            <AccountsGrid caja={caja} update={update} config={config} boxes={boxes} activeBoxId={activeBoxId} onAssignWallet={assignWallet} notesEnabled={notesEnabled} />
            <div className="dashboard-route-grid">
              <WalletRoute caja={caja} config={config} onUpdateAccounts={updateAccountsFromLogistics} />
              <MiniBonusesPanel config={config} activeBoxId={activeBoxId} api={api} />
              <MiniUsersPanel config={config} boxes={boxes} activeBoxId={activeBoxId} onConfigChange={updateConfigState} onNotify={notify} />
            </div>
            <div className="operations-grid">
              <QuickMovementSection
                title="Gastos"
                tone="red"
                rows={caja.expenses}
                update={update}
                kind="expenses"
                              config={config}
              />
              <QuickMovementSection
                title="Propinas"
                tone="red"
                rows={caja.tips}
                update={update}
                kind="tips"
                              config={config}
              />
              <BonusesSection caja={caja} update={update} viewRequest={bonusViewRequest} editorRequest={bonusEditorRequest} />
              <QuickMovementSection
                title="Cargas T.A."
                tone="green"
                rows={caja.ta}
                update={update}
                kind="ta"
                              config={config}
              />
              <FoundMoneySection caja={caja} update={update} config={config} />
            </div>
            <div className="notes-transfer-layout">
            <section className="panel notes">
              <SectionHead
                icon={<FileText size={18} />}
                title="Notas del turno"
              />
              <div className="notes-grid">
                <div className="notes-column">
                  <label>
                    Turno actual
                    <textarea
                      value={caja.notes}
                      placeholder="Escribí una nota para el equipo..."
                      onChange={(e) => update({ notes: e.target.value })}
                    />
                  </label>
                  <label>
                    Turno siguiente
                    <textarea
                      value={caja.nextNotes}
                      placeholder="Información para quien toma la próxima caja..."
                      onChange={(e) => update({ nextNotes: e.target.value })}
                    />
                  </label>
                </div>
              </div>
            </section>
              <TransferSection
                caja={caja}
                config={config}
                boxes={boxes}
                activeBoxId={activeBoxId}
                transfers={caja.transfers || []}
                savingsMovements={caja.savingsMovements || []}
                onCreate={async (transfer) => {
                  let result;
                  try { result = await enqueueWrite((version) => api("/api/traspasos", { method: "POST", body: JSON.stringify({ ...transfer, updatedAt: version }) })); }
                  catch (error) { if (error.status === 409 || error.code === "OUTDATED_STATE") await syncAfterConflict(); throw error; }
                  if (result.error) throw new Error(result.error);
                  rememberUpdatedAt(result.updatedAt);
                  setCaja(result[activeBoxId === transfer.fromBoxId ? "from" : "to"]);
                }}
                onUpdateTransfer={async (transfer) => {
                  let result;
                  try { result = await enqueueWrite((version) => api(`/api/traspasos/${transfer.id}`, { method: "PUT", body: JSON.stringify({ ...transfer, updatedAt: version }) })); }
                  catch (error) { if (error.status === 409 || error.code === "OUTDATED_STATE") await syncAfterConflict(); throw error; }
                  if (result.error) throw new Error(result.error);
                  rememberUpdatedAt(result.updatedAt);
                  setCaja(result.currents[activeBoxId]);
                }}
                onDeleteTransfer={async (transferId) => {
                  let result;
                  try { result = await enqueueWrite((version) => api(`/api/traspasos/${transferId}`, { method: "DELETE", body: JSON.stringify({ updatedAt: version }) })); }
                  catch (error) { if (error.status === 409 || error.code === "OUTDATED_STATE") await syncAfterConflict(); throw error; }
                  if (result.error) throw new Error(result.error);
                  rememberUpdatedAt(result.updatedAt);
                  setCaja(result.currents[activeBoxId]);
                }}
                onCreateSavings={async (movement) => update({ savingsMovements: [...(caja.savingsMovements || []), movement] })}
                onUpdateSavings={async (movement) => update({ savingsMovements: (caja.savingsMovements || []).map((item) => item.id === movement.id ? movement : item) })}
                onDeleteSavings={async (movementId) => update({ savingsMovements: (caja.savingsMovements || []).filter((item) => item.id !== movementId) })}
              />
              <ChipsSection caja={caja} update={update} config={config} />
            </div>
          </div>
        </div></>}
        </div>
      </main>
      <SnapshotView caja={caja} calculations={calculations} snapshotRef={snapshotRef} config={config} boxes={boxes} activeBox={activeBox} />
      {confirm && (
        <div className="modal-backdrop">
          <div className="modal">
            <button className="modal-close" onClick={() => setConfirm(false)}>
              <X size={18} />
            </button>
            <div className="modal-icon">
              <LockKeyhole size={22} />
            </div>
            <h2>¿Cerrar esta caja?</h2>
            <p>
              La caja quedará congelada y se abrirá automáticamente el turno
              siguiente con los saldos heredados.
            </p>
            <div className="modal-actions">
              <button
                className="ghost-button"
                onClick={() => setConfirm(false)}
              >
                Cancelar
              </button>
              <button className="close-button" onClick={confirmClose}>
                Confirmar cierre <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
      {closeWarning && (
        <div className="modal-backdrop">
          <div className="modal">
            <button className="modal-close" onClick={() => setCloseWarning(false)}>
              <X size={18} />
            </button>
            <div className="modal-icon">
              <LockKeyhole size={22} />
            </div>
            <h2>¿Cerrar con diferencia?</h2>
            <p>
              Hay <strong className={calculations.shortage < 0 ? "negative" : "positive"}>
                {money(Math.abs(calculations.shortage))}
              </strong> de {calculations.shortage < 0 ? "faltante" : "sobrante"}. ¿Estás seguro de cerrar la caja?
            </p>
            <div className="modal-actions">
              <button className="ghost-button" onClick={() => setCloseWarning(false)}>
                Cancelar
              </button>
              <button className="close-button" onClick={() => { setCloseWarning(false); close(); }}>
                 <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
      {createPreviousOpen && (
        <div className="modal-backdrop" onClick={() => !creatingPrevious && setCreatePreviousOpen(false)}>
          <div className="modal confirm-dialog" onClick={(event) => event.stopPropagation()}>
            <div className="modal-icon"><Clock3 size={21} /></div>
            <h2>No existe un turno anterior</h2>
            <p>Este es el primer turno registrado. ¿Querés crear un turno anterior vacío para cargar manualmente la información?</p>
            {createPreviousError && <p className="transfer-error">{createPreviousError}</p>}
            <div className="modal-actions">
              <button className="ghost-button" disabled={creatingPrevious} onClick={() => setCreatePreviousOpen(false)}>Cancelar</button>
              <button className="close-button" disabled={creatingPrevious} onClick={createPrevious}>{creatingPrevious ? "Creando..." : "Crear turno anterior"} <ArrowLeft size={16} /></button>
            </div>
          </div>
        </div>
      )}
      {historyOpen && <HistoryModal history={history} onClose={() => setHistoryOpen(false)} onSelect={(index) => { setSelectedIndex(index); setCaja(history[index]); setHistoryOpen(false); }} config={config} activeBoxId={activeBoxId} />}
      {toast && <div className="app-toast" role="status">{toast}</div>}
      <ConfirmDialog dialog={confirmDialog} onClose={() => setConfirmDialog(null)} />
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
