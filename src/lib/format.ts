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
  "#C97B5E",
  "#5B7C99",
  "#8B7355",
  "#6B8A6E",
  "#9B6B8C",
  "#4A8B8C",
  "#B08968",
  "#7B6D8D",
];

/** Fundo suave a partir da cor do cliente (visual mais sóbrio). */
export const softBg = (hex: string) => `${hex}20`;

/** Converte a cor principal para um tom pastel claro. */
export const getClientSoftColor = (color: string) => {
  // Retorna apenas a cor de texto branca, pois o fundo agora é sempre o sólido do cliente no avatar
  return 'text-white';
};

/** Retorna a classe do botão baseada na cor do cliente. */
export const getClientButtonColor = (color: string) => {
  // Cor fixa para botões de ação (Âmbar)
  return 'bg-[#C98A3E] hover:bg-[#B67A35]';
};

export const EXPENSE_CATEGORIES = [
  "Fatura Usina",
  "Manutenção",
  "Compra de Placas",
  "Impostos",
  "Salários",
  "Outros",
];