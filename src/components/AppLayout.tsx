import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { 
  LayoutGrid, Users, Wallet, BarChart3, Gauge, Package, ShieldCheck, 
  FileSpreadsheet, KeyRound, LogOut, MoreHorizontal, X, Menu, ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ReactNode, useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMyAccess } from "@/lib/acessos.functions";
import { Button } from "@/components/ui/button";
import { BrandLockup } from "@/components/BrandMark";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useMutation } from "@tanstack/react-query";
import { changeMyPassword } from "@/lib/acessos.functions";
import { toast } from "sonner";

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
  const [showMobileDrawer, setShowMobileDrawer] = useState(false);

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
        <div className="relative flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <BrandLockup />
            <div className="hidden h-5 w-px bg-slate-200 md:block" />
            <div className="hidden text-xs font-bold text-[#374151] uppercase tracking-wider md:block">
              {current?.label || "Usina dos Irmãos"}
            </div>
            <div className="text-[10px] font-bold text-[#374151] uppercase tracking-wider md:hidden">
              {current?.label}
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <div className="flex items-center gap-1 rounded-full border border-[#E4E7EC] bg-[#F5F6F8] pl-3 pr-1 py-0.5">
              <span className="text-[8px] font-bold text-[#6B7280] uppercase tracking-widest mr-2 border-r border-[#E4E7EC] pr-2">
                {acc?.effective_admin ? "Admin" : "User"}
              </span>
              <div className="flex items-center gap-0.5">
                <ChangeOwnPasswordDialog />
                <Button size="sm" variant="ghost" onClick={signOut} className="h-6 px-2 rounded-full hover:bg-white hover:shadow-xs text-[#374151]">
                  <LogOut className="h-3 w-3 sm:mr-1" />
                  <span className="hidden text-[9px] font-bold uppercase sm:inline">Sair</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </header>
      <div className="flex">
        {visibleNav.length > 0 && (
          <div className="no-print fixed inset-x-0 bottom-0 z-40 flex overflow-x-auto border-t border-[#E4E7EC] bg-white pb-[env(safe-area-inset-bottom)] md:hidden shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
            {visibleNav.slice(0, 3).map((item) => {
              const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
              const Icon = item.icon;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "relative flex min-w-[74px] flex-1 flex-col items-center gap-1 px-2 py-3 text-[10px] font-semibold transition-all duration-200",
                    active ? "text-[#151B2E]" : "text-[#9CA3AF]",
                  )}
                >
                  {active && <div className="absolute top-0 left-0 right-0 h-0.5 bg-[#C98A3E]" />}
                  <Icon className="h-5 w-5" />
                  <span className="w-full truncate text-center uppercase tracking-tighter">{item.label}</span>
                </Link>
              );
            })}
            <button
              onClick={() => setShowMobileDrawer(true)}
              className="flex min-w-[74px] flex-1 flex-col items-center gap-1 px-2 py-3 text-[10px] font-semibold text-[#9CA3AF] transition-all hover:bg-slate-50"
            >
              <MoreHorizontal className="h-5 w-5" />
              <span className="w-full truncate text-center uppercase tracking-tighter">Mais</span>
            </button>
          </div>
        )}

        {/* Mobile Drawer */}
        {showMobileDrawer && (
          <div className="fixed inset-0 z-[60] md:hidden">
            <div 
              className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity animate-in fade-in"
              onClick={() => setShowMobileDrawer(false)}
            />
            <div 
              className="absolute inset-x-0 bottom-0 max-h-[80vh] overflow-y-auto rounded-t-3xl bg-[#151B2E] p-6 shadow-2xl animate-in slide-in-from-bottom duration-300"
            >
              <div className="mb-6 flex items-center justify-between border-b border-white/10 pb-4">
                <div className="text-xs font-bold uppercase tracking-[0.2em] text-[#9CA3AF]">
                  Todos os Módulos
                </div>
                <button 
                  onClick={() => setShowMobileDrawer(false)}
                  className="rounded-full bg-white/5 p-2 text-white/50 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {visibleNav.map((item) => {
                  const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      onClick={() => setShowMobileDrawer(false)}
                      className={cn(
                        "flex items-center gap-3 rounded-xl p-4 text-xs font-bold transition-all",
                        active ? "bg-white/10 text-white shadow-lg" : "bg-white/5 text-[#9CA3AF] hover:bg-white/10"
                      )}
                    >
                      <Icon className="h-5 w-5 shrink-0" />
                      <span className="truncate uppercase tracking-tighter">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
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
                    "group relative flex items-center gap-3 px-4 py-2.5 text-sm font-semibold outline-none transition-all duration-200",
                    active
                      ? "text-white bg-white/5"
                      : "text-[#9CA3AF] hover:text-white hover:bg-white/[0.02]",
                  )}
                >
                  <div className={cn(
                    "absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 bg-[#C98A3E] transition-all duration-250",
                    active ? "opacity-100 scale-y-100" : "opacity-0 scale-y-0"
                  )} />
                  <Icon className="h-5 w-5 shrink-0 transition-transform duration-200 group-hover:scale-110" strokeWidth={2} />
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </nav>
          <div className="mt-16 border-t border-white/10 px-4 pt-6">
            <span className="font-serif text-[15px] italic leading-tight text-white/80">
              Seja Bem Vindo, {(acc as any)?.display_name || (acc as any)?.user_email?.split('@')[0] || 'Usuário'}
            </span>
          </div>
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

function ChangeOwnPasswordDialog() {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const changeFn = useServerFn(changeMyPassword);
  
  const m = useMutation({
    mutationFn: () => changeFn({ data: { password } }),
    onSuccess: () => {
      toast.success("Senha alterada com sucesso.");
      setOpen(false);
      setPassword("");
    },
    onError: (e: any) => toast.error(e?.message ?? "Falha ao alterar senha."),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost" className="h-6 px-2 rounded-full hover:bg-white hover:shadow-xs text-[#374151]">
          <KeyRound className="h-3 w-3 sm:mr-1" />
          <span className="hidden text-[9px] font-bold uppercase sm:inline">Senha</span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Alterar Minha Senha</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <Label>Nova Senha</Label>
            <Input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              placeholder="Mínimo 6 caracteres" 
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button 
            onClick={() => m.mutate()} 
            disabled={m.isPending || password.length < 6}
            className="bg-[#151B2E] hover:bg-[#1F2A45] text-white font-medium"
          >
            {m.isPending ? "Alterando..." : "Confirmar Alteração"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}