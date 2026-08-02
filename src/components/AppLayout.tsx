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
  { to: "/faturas", label: "Lançamento de Faturas", icon: Users, module: "faturas" },
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
        (n) =>
          acc.effective_admin ||
          (!n.adminOnly &&
            (acc.permissions.includes(n.module) ||
              (n.module === "relatorio" && acc.permissions.includes("resultado")))),
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
    <div className="min-h-screen bg-background">
      <header className="no-print sticky top-0 z-50 border-b border-border/70 bg-card/85 backdrop-blur supports-[backdrop-filter]:bg-card/70">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-2.5 sm:px-6 sm:py-3">
          <div className="flex min-w-0 items-center gap-3">
            <BrandLockup />
            {current && (
              <div className="hidden min-w-0 items-center gap-2 border-l border-border/70 pl-3 md:flex">
                <span className="text-xs text-muted-foreground">Painel</span>
                <span className="text-xs text-muted-foreground/60">/</span>
                <span className="truncate text-sm font-semibold text-foreground">{current.label}</span>
              </div>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-1 rounded-full border border-border/70 bg-background/60 p-1">
            <span className="hidden px-2 text-xs font-medium text-muted-foreground sm:inline">
              {acc?.effective_admin ? "Administrador" : "Usuário"}
            </span>
            <Button size="sm" variant="ghost" onClick={signOut} className="h-8 rounded-full">
              <LogOut className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Sair</span>
            </Button>
          </div>
        </div>
      </header>
      <div className="flex">
        {visibleNav.length > 0 && (
          <div className="no-print fixed inset-x-0 bottom-0 z-40 flex overflow-x-auto border-t border-border/70 bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
            {visibleNav.map((item) => {
              const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
              const Icon = item.icon;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "flex min-w-[74px] flex-1 flex-col items-center gap-1 px-2 py-2 text-[10px] font-semibold transition-colors",
                    active ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  <span className={cn("grid h-8 w-8 place-items-center rounded-xl transition-colors", active && "bg-primary/10")}>
                    <Icon className="h-[18px] w-[18px]" />
                  </span>
                  <span className="w-full truncate text-center">{item.label}</span>
                </Link>
              );
            })}
          </div>
        )}
        <aside className="no-print sticky top-[61px] hidden h-[calc(100vh-61px)] w-64 shrink-0 border-r border-border/70 bg-card/60 px-4 py-6 md:block">
          <div className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Módulos
          </div>
          <nav className="space-y-1.5">
            {visibleNav.map((item) => {
              const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
              const Icon = item.icon;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium outline-none transition-all focus-visible:ring-2 focus-visible:ring-ring",
                    active
                      ? "bg-primary text-primary-foreground elev-2"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={2} />
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </aside>
        <main className="min-w-0 flex-1 px-4 py-5 pb-28 sm:px-6 sm:py-6 md:pb-8">
          {blocked ? (
            <div className="mx-auto mt-16 max-w-md rounded-xl border bg-card p-8 text-center shadow-sm">
              <ShieldCheck className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
              <h2 className="text-lg font-semibold">Acesso restrito</h2>
              <p className="mt-1 text-sm text-muted-foreground">Você não tem permissão para acessar este módulo. Peça ao administrador para liberar em Acessos.</p>
            </div>
          ) : children}
        </main>
      </div>
    </div>
  );
}