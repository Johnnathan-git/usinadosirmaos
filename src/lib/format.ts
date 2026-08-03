export const brl = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    Number.isFinite(n) ? n : 0,
  );

export const monthLabel = (d: Date) => {
  const m = d.toLocaleString("en-US", { month: "short" });
  const y = d.getFullYear().toString().slice(-2);
  return `${m}/${y}`;
};

export const monthLabelLong = (d: Date) => {
  return d.toLocaleString("en-US", { month: "long", year: "numeric" });
};

// Parses "yyyy-mm-dd" as a LOCAL date (avoids UTC shifting to previous month)
export const parseISODateLocal = (iso: string) => {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
};

export const monthLabelFromISO = (iso: string) => monthLabel(parseISODateLocal(iso));

export const formatDateBR = (iso: string) => {
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
};

// yyyy-mm-01 for a given Date
export const monthKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;

export const parseMonthKey = (key: string) => {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1);
};

export const initial = (s: string) => (s?.trim()?.[0] ?? "?").toUpperCase();

export const CLIENT_COLORS = [
  "#1B7F5A",
  "#3E6B8A",
  "#7A6A9B",
  "#A06A72",
  "#B08046",
  "#8A8F4A",
  "#94614F",
  "#4E8A86",
  "#5B6690",
  "#3F7A6E",
];

/** Fundo suave a partir da cor do cliente (visual mais sóbrio). */
export const softBg = (hex: string) => `${hex}1F`;

export const EXPENSE_CATEGORIES = [
  "Fatura Usina",
  "Manutenção",
  "Compra de Placas",
  "Impostos",
  "Salários",
  "Outros",
];