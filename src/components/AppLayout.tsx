import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { LayoutGrid, Users, Wallet, BarChart3, Gauge, Package, ShieldCheck, FileSpreadsheet } from "lucide-react";
import { cn } from "@/lib/utils";
import { ReactNode, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMyAccess } from "@/lib/acessos.functions";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { BrandLockup } from "@/components/BrandMark";

type NavItem = { to: string; label: string; icon: typeof LayoutGrid; module: string; adminOnly?: boolean };
const nav: NavItem[] = [
  { to: "/", label: "Dashboard", icon: LayoutGrid, module: "dashboard" },
  { to: "/faturas", label: "Faturas e Clientes", icon: Users, module: "faturas" },
  { to: "/fluxo-caixa", label: "Fluxo de Caixa", icon: Wallet, module: "fluxo-caixa" },
  { to: "/resultado", label: "Resultado", icon: BarChart3, module: "resultado" },
  { to: "/relatorio", label: "Relatório do Cliente", icon: FileSpreadsheet, module: "relatorio" },
  { to: "/controle", label: "Controle", icon: Gauge, module: "controle" },
  { to: "/inventario", label: "Inventário", icon: Package, module: "inventario" },
  { to: "/acessos", label: "Acessos", icon: ShieldCheck, module: "acessos", adminOnly: true },
];

export function AppLayout({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      if (!data.session) {
        navigate({ to: "/auth" });
      } else {
        setReady(true);
      }
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!session) navigate({ to: "/auth" });
    });
    return () => { mounted = false; sub.subscription.unsubscribe(); };
  }, [navigate]);

  const accessFn = useServerFn(getMyAccess);
  const access = useQuery({
    queryKey: ["my-access"],
    queryFn: async () => {
      // Garante que existe sessão (token) antes de chamar a função protegida.
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        navigate({ to: "/auth" });
        return null;
      }
      return await accessFn();
    },
    enabled: ready,
    retry: false,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  const acc = access.data ?? undefined;
  const visibleNav = acc
    ? nav.filter(
        (n) => acc.effective_admin || (!n.adminOnly && acc.permissions.includes(n.module)),
      )
    : [];
  const current = nav.find((n) => n.to === "/" ? pathname === "/" : pathname.startsWith(n.to));
  const blocked = Boolean(acc && current && !visibleNav.some((n) => n.to === current.to));

  // Se o usuário caiu numa rota sem permissão, leva para o primeiro módulo liberado.
  useEffect(() => {
    if (blocked && visibleNav.length > 0) {
      navigate({ to: visibleNav[0].to, replace: true });
    }
  }, [blocked, visibleNav.length, navigate]);

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    window.location.replace("/auth?manual=1");
  }

  if (!ready || access.isLoading) {
    return <div className="min-h-screen bg-background" />;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="no-print sticky top-0 z-50 border-b border-slate-200 bg-white shadow-sm">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-2.5 sm:px-6 sm:py-3">
          <div className="flex min-w-0 items-center gap-3">
            <BrandLockup />
            {current && (
              <div className="hidden min-w-0 items-center gap-2 border-l border-slate-200 pl-3 md:flex">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Painel</span>
                <span className="text-xs text-slate-300">/</span>
                <span className="truncate text-sm font-bold text-slate-800">{current.label}</span>
              </div>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-1 rounded-full border border-slate-200 bg-slate-50/50 p-1">
            <span className="hidden px-3 text-xs font-bold text-slate-500 uppercase tracking-wide sm:inline">
              {acc?.effective_admin ? "Administrador" : "Usuário"}
            </span>
            <Button size="sm" variant="ghost" onClick={signOut} className="h-8 rounded-full hover:bg-white hover:shadow-sm">
              <LogOut className="h-4 w-4 sm:mr-2" />
              <span className="hidden font-bold sm:inline">Sair</span>
            </Button>
          </div>
        </div>
      </header>
      <div className="flex">
        {visibleNav.length > 0 && (
          <div className="no-print fixed inset-x-0 bottom-0 z-40 flex overflow-x-auto border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] md:hidden">
            {visibleNav.map((item) => {
              const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
              const Icon = item.icon;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "flex min-w-[74px] flex-1 flex-col items-center gap-1 px-2 py-3 text-[10px] font-bold transition-all",
                    active ? "text-slate-900" : "text-slate-400",
                  )}
                >
                  <span className={cn("grid h-9 w-9 place-items-center rounded-xl transition-all", active ? "bg-slate-900 text-white shadow-md" : "hover:bg-slate-50")}>
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="w-full truncate text-center uppercase tracking-tighter">{item.label}</span>
                </Link>
              );
            })}
          </div>
        )}
        <aside className="no-print sticky top-[61px] hidden h-[calc(100vh-61px)] w-64 shrink-0 border-r border-slate-200 bg-white px-6 py-8 md:block">
          <div className="mb-6 px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
            Módulos
          </div>
          <nav className="space-y-2">
            {visibleNav.map((item) => {
              const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
              const Icon = item.icon;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold outline-none transition-all focus-visible:ring-2 focus-visible:ring-slate-900",
                    active
                      ? "bg-slate-900 text-white shadow-lg shadow-slate-900/20 translate-x-1"
                      : "text-slate-500 hover:bg-slate-50 hover:text-slate-900 hover:translate-x-1",
                  )}
                >
                  <Icon className="h-5 w-5 shrink-0" strokeWidth={2.5} />
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </aside>
        <main className="min-w-0 flex-1 px-4 py-6 pb-28 sm:px-8 sm:py-8 md:pb-8">
          {blocked ? (
            <div className="mx-auto mt-20 max-w-md rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-none">
              <ShieldCheck className="mx-auto mb-4 h-12 w-12 text-slate-300" />
              <h2 className="text-xl font-bold text-slate-800">Acesso restrito</h2>
              <p className="mt-2 text-sm text-slate-500 font-medium">Você não tem permissão para acessar este módulo. Peça ao administrador para liberar em Acessos.</p>
            </div>
          ) : children}
        </main>
      </div>
    </div>
  );
}