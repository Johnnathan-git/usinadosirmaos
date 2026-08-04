export const brl = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    Number.isFinite(n) ? n : 0,
  );

export const monthLabel = (d: Date) => {
  const m = d.toLocaleString("pt-BR", { month: "short" }).replace(".", "");
  const y = d.getFullYear().toString().slice(-2);
  return `${m.charAt(0).toUpperCase()}${m.slice(1)}/${y}`;
};

export const monthLabelLong = (d: Date) => {
  const s = d.toLocaleString("pt-BR", { month: "long", year: "numeric" });
  return s.charAt(0).toUpperCase() + s.slice(1);
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
  "#0E6BA8",
  "#E08A1E",
  "#1E8E6A",
  "#8E4EC6",
  "#C2405A",
  "#0D7A8C",
  "#B4611A",
  "#3E5CB8",
  "#177A55",
  "#9A2F6B",
];

/** Fundo suave a partir da cor do cliente (visual mais sóbrio). */
export const softBg = (hex: string) => `${hex}20`;

/** Converte a cor principal para um tom pastel claro. */
export const getClientSoftColor = (color: string) => {
  const c = color.toLowerCase();
  if (c.includes('#0e6ba8') || c.includes('#3e5cb8') || c.includes('#0d7a8c')) return 'bg-blue-100 text-blue-900';
  if (c.includes('#e08a1e') || c.includes('#b4611a')) return 'bg-orange-100 text-orange-900';
  if (c.includes('#1e8e6a') || c.includes('#177a55')) return 'bg-emerald-100 text-emerald-900';
  if (c.includes('#8e4ec6')) return 'bg-purple-100 text-purple-900';
  if (c.includes('#c2405a') || c.includes('#9a2f6b')) return 'bg-pink-100 text-pink-900';
  return 'bg-slate-100 text-slate-900';
};

/** Retorna a classe do botão baseada na cor do cliente. */
export const getClientButtonColor = (color: string) => {
  const c = color.toLowerCase();
  if (c.includes('#0e6ba8') || c.includes('#3e5cb8') || c.includes('#0d7a8c')) return 'bg-blue-600 hover:bg-blue-700';
  if (c.includes('#e08a1e') || c.includes('#b4611a')) return 'bg-orange-600 hover:bg-orange-700';
  if (c.includes('#1e8e6a') || c.includes('#177a55')) return 'bg-emerald-600 hover:bg-emerald-700';
  if (c.includes('#8e4ec6')) return 'bg-purple-600 hover:bg-purple-700';
  if (c.includes('#c2405a') || c.includes('#9a2f6b')) return 'bg-pink-600 hover:bg-pink-700';
  return 'bg-slate-900 hover:bg-slate-800';
};

export const EXPENSE_CATEGORIES = [
  "Fatura Usina",
  "Manutenção",
  "Compra de Placas",
  "Impostos",
  "Salários",
  "Outros",
];