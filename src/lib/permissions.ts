export const MODULES = [
  { key: "dashboard", label: "Dashboard", path: "/" },
  { key: "faturas", label: "Lançamento de Faturas", path: "/faturas" },
  { key: "fluxo-caixa", label: "Fluxo de Caixa", path: "/fluxo-caixa" },
  { key: "resultado", label: "Resultado", path: "/resultado" },
  { key: "controle", label: "Controle", path: "/controle" },
  { key: "inventario", label: "Inventário", path: "/inventario" },
  { key: "acessos", label: "Acessos", path: "/acessos" },
] as const;

export type ModuleKey = (typeof MODULES)[number]["key"];

export function pathToModule(pathname: string): ModuleKey | null {
  if (pathname === "/") return "dashboard";
  const m = MODULES.find((mod) => mod.path !== "/" && pathname.startsWith(mod.path));
  return (m?.key as ModuleKey) ?? null;
}