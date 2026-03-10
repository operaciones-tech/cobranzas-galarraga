// ── ESTADOS Y OPCIONES ──────────────────────────────────────────────────────

export const ESTADOS = [
  { label: "Sin información", color: "#888", bg: "#f0f0f0", esCobrado: false },
  { label: "Pagó", color: "#fff", bg: "#1DB954", esCobrado: true },
  { label: "Pago parcial", color: "#fff", bg: "#E8970C", esCobrado: false },
  {
    label: "Compra cuenta socios",
    color: "#fff",
    bg: "#6366F1",
    esCobrado: true,
    excluirCalculo: true,
  },
  { label: "Paga con animales", color: "#fff", bg: "#f97316", esCobrado: true },
  {
    label: "Pagó con saldo en cuenta",
    color: "#fff",
    bg: "#0ea5e9",
    esCobrado: true,
  },
  {
    label: "Retiro por futuras ventas",
    color: "#fff",
    bg: "#8b5cf6",
    esCobrado: false,
  },
];

export const METODOLOGIAS = [
  "Sin información",
  "E Cheq",
  "Efectivo",
  "Cobranza integrada",
  "Cheque físico",
  "Financiera",
  "Depósito Bancario",
  "Transferencia",
];

export const SOCIOS = [
  "NAG SRL",
  "LA SOFÍA",
  "CHELFORO",
  "ACOPIOS",
  "Galarraga Nestor",
  "Monte Renato",
  "Zubiarrain Luciano",
];

export const RANGOS = [
  {
    label: "En término",
    min: -Infinity,
    max: 0,
    bg: "#F0FFF6",
    border: "#b8f0cc",
    color: "#1DB954",
  },
  {
    label: "1 – 7 días",
    min: 1,
    max: 7,
    bg: "#FFFBF0",
    border: "#fde68a",
    color: "#E8970C",
  },
  {
    label: "8 – 30 días",
    min: 8,
    max: 30,
    bg: "#FFF5EC",
    border: "#fdc99a",
    color: "#f97316",
  },
  {
    label: "31 – 60 días",
    min: 31,
    max: 60,
    bg: "#FFF0F3",
    border: "#ffc0cc",
    color: "#E8335A",
  },
  {
    label: "Más de 60d",
    min: 61,
    max: Infinity,
    bg: "#FFF0F3",
    border: "#E8335A",
    color: "#c0192f",
  },
];

// ── CONSTANTES DE APP ────────────────────────────────────────────────────────

export const REQUIERE_METODO = ["Pagó", "Pago parcial"];
export const REQUIERE_FECHA_COBRO = ["Pagó", "Pago parcial"];
export const DB_PASSWORD = "galarraga2024";
export const USER_KEY = "galarraga_usuario";
export const TNA_KEY = "galarraga_tna";
export const SALDOS_KEY = "galarraga_saldos";

// ── HELPERS ──────────────────────────────────────────────────────────────────

export const esExcluido = (estado) => estado === "Compra cuenta socios";

export const fmtARS = (n) => {
  if (!n && n !== 0) return "-";
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
};

export const fmtARSFull = (n) => {
  if (!n && n !== 0) return "$0";
  return "$" + Math.round(n).toLocaleString("es-AR");
};

export const fmtFecha = (v) => {
  if (!v) return "-";
  if (v instanceof Date) return v.toLocaleDateString("es-AR");
  if (typeof v === "number")
    return new Date(Math.round((v - 25569) * 86400 * 1000)).toLocaleDateString(
      "es-AR"
    );
  return String(v);
};

export const parseDate = (v) => {
  if (!v) return null;
  if (v instanceof Date) return v;
  if (typeof v === "number")
    return new Date(Math.round((v - 25569) * 86400 * 1000));
  if (typeof v === "string") {
    const p = v.split("/");
    if (p.length === 3)
      return new Date(Number(p[2]), Number(p[1]) - 1, Number(p[0]));
    const p2 = v.split("-");
    if (p2.length === 3)
      return new Date(Number(p2[0]), Number(p2[1]) - 1, Number(p2[2]));
  }
  return null;
};

export const toInputDate = (v) => {
  const d = parseDate(v);
  if (!d) return "";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(d.getDate()).padStart(2, "0")}`;
};

export const todayInputDate = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(now.getDate()).padStart(2, "0")}`;
};

export const lastFridayInputDate = () => {
  const d = new Date();
  const day = d.getDay();
  const diff = day === 0 ? 2 : day === 6 ? 1 : day + 2;
  d.setDate(d.getDate() - diff);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(d.getDate()).padStart(2, "0")}`;
};

export const calcDelay = (vence, fechaCobro) => {
  const dv = parseDate(vence);
  const dc = parseDate(fechaCobro);
  if (!dv || !dc) return null;
  return Math.round((dc.getTime() - dv.getTime()) / (1000 * 60 * 60 * 24));
};

export const normalize = (s) =>
  String(s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

export const generarId = (comprobante, numero, vence, importe) => {
  const venceStr = parseDate(vence)
    ? parseDate(vence).toISOString().split("T")[0]
    : "null";
  const raw = `${String(comprobante).trim()}_${String(
    numero
  ).trim()}_${venceStr}_${Math.round(importe)}`;
  return raw.replace(/[.#$[\]/]/g, "-");
};

export const fmtDateTime = () => {
  const now = new Date();
  return (
    now.toLocaleDateString("es-AR") +
    " " +
    now.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })
  );
};

export const defaultFechaInicio = (fin) => {
  const d = fin ? parseDate(fin) : new Date();
  if (!d) return "";
  const ini = new Date(d);
  ini.setDate(ini.getDate() - 45);
  return `${ini.getFullYear()}-${String(ini.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(ini.getDate()).padStart(2, "0")}`;
};

export const currentWeekNumber = () => {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  return Math.ceil(((now - start) / 86400000 + start.getDay() + 1) / 7);
};

export const weekNumberFromDate = (dateStr) => {
  const d = parseDate(dateStr);
  if (!d) return currentWeekNumber();
  const start = new Date(d.getFullYear(), 0, 1);
  return Math.ceil(((d - start) / 86400000 + start.getDay() + 1) / 7);
};
