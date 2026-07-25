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

// yyyy-mm-01 for a given Date
export const monthKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;

export const parseMonthKey = (key: string) => {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1);
};

export const initial = (s: string) => (s?.trim()?.[0] ?? "?").toUpperCase();

export const CLIENT_COLORS = [
  "#10b981",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#f97316",
  "#eab308",
  "#ef4444",
  "#06b6d4",
  "#6366f1",
  "#14b8a6",
];

export const EXPENSE_CATEGORIES = [
  "Fatura Usina",
  "Manutenção",
  "Compra de Placas",
  "Impostos",
  "Salários",
  "Outros",
];