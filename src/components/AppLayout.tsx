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
    <div className="min-h-screen bg-[#F5F6F8]">
      <header className="no-print sticky top-0 z-50 border-b border-[#E4E7EC] bg-white shadow-sm">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <BrandLockup />
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-[#E4E7EC] bg-[#F5F6F8] p-1">
            <span className="hidden px-3 text-xs font-semibold text-[#4B5563] uppercase tracking-wide sm:inline">
              {acc?.effective_admin ? "Administrador" : "Usuário"}
            </span>
            <Button size="sm" variant="ghost" onClick={signOut} className="h-8 rounded-md hover:bg-white hover:shadow-sm text-[#374151]">
              <LogOut className="h-4 w-4 sm:mr-2" />
              <span className="hidden font-semibold sm:inline">Sair</span>
            </Button>
          </div>
        </div>
      </header>
      <div className="flex">
        {visibleNav.length > 0 && (
          <div className="no-print fixed inset-x-0 bottom-0 z-40 flex overflow-x-auto border-t border-[#E4E7EC] bg-white pb-[env(safe-area-inset-bottom)] md:hidden scrollbar-hide">
            {visibleNav.map((item) => {
              const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
              const Icon = item.icon;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "relative flex min-w-[74px] flex-1 flex-col items-center gap-1 px-2 py-3 text-[10px] font-semibold transition-all",
                    active ? "text-[#151B2E]" : "text-[#9CA3AF]",
                  )}
                >
                  {active && <div className="absolute top-0 left-0 right-0 h-0.5 bg-[#C98A3E]" />}
                  <Icon className="h-5 w-5" />
                  <span className="w-full truncate text-center uppercase tracking-tighter">{item.label}</span>
                </Link>
              );
            })}
          </div>
        )}
        <aside className="no-print sticky top-[73px] hidden h-[calc(100vh-73px)] w-64 shrink-0 border-r border-[#E4E7EC] bg-[#151B2E] px-4 py-8 md:block">
          <div className="mb-6 px-4 text-[10px] font-bold uppercase tracking-[0.2em] text-[#9CA3AF]">
            Módulos
          </div>
          <nav className="space-y-1">
            {visibleNav.map((item) => {
              const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
              const Icon = item.icon;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "relative flex items-center gap-3 px-4 py-2.5 text-sm font-semibold outline-none transition-all",
                    active
                      ? "text-white"
                      : "text-[#9CA3AF] hover:text-white",
                  )}
                >
                  {active && <div className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 bg-[#C98A3E]" />}
                  <Icon className="h-5 w-5 shrink-0" strokeWidth={2} />
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </aside>
        <main className="min-w-0 flex-1 px-4 py-8 pb-28 sm:px-8 md:pb-8">
          {blocked ? (
            <div className="mx-auto mt-20 max-w-md rounded-xl border border-[#E4E7EC] bg-white p-10 text-center shadow-sm">
              <ShieldCheck className="mx-auto mb-4 h-12 w-12 text-[#9CA3AF]" />
              <h2 className="text-xl font-bold text-[#374151]">Acesso restrito</h2>
              <p className="mt-2 text-sm text-[#4B5563] font-medium">Você não tem permissão para acessar este módulo.</p>
            </div>
          ) : children}
        </main>
      </div>
    </div>
  );
}