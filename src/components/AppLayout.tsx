import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { LayoutGrid, Users, Wallet, BarChart3, Gauge, Package, ShieldCheck, FileSpreadsheet, KeyRound, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { ReactNode, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMyAccess } from "@/lib/acessos.functions";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
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
    <div className="min-h-screen">
      <header className="no-print sticky top-0 z-50 bg-white shadow-sm h-[56px]">
        <div className="absolute bottom-0 left-0 h-[2px] w-full bg-gradient-to-r from-[#C98A3E]/20 via-[#C98A3E] to-[#C98A3E]/20" />
        <div className="relative flex items-center justify-between px-6 py-2">
          <div className="flex items-center gap-0">
            <BrandLockup />
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
                  <span className="hidden text-[9px] font-bold uppercase sm:inline text-[#374151]">Sair</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </header>
      <div className="flex">
        {visibleNav.length > 0 && (
          <div className="no-print fixed inset-x-0 bottom-0 z-40 flex overflow-x-auto border-t border-[#E4E7EC] bg-[#151B2E] pb-[env(safe-area-inset-bottom)] md:hidden shadow-[0_-4px_20px_rgba(0,0,0,0.2)]">
            {visibleNav.slice(0, 3).map((item) => {
              const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
              const Icon = item.icon;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "relative flex min-w-[74px] flex-1 flex-col items-center gap-1 px-2 py-3 text-[10px] font-semibold transition-all",
                    active ? "text-white" : "text-[#9CA3AF]",
                  )}
                >
                  {active && <div className="absolute top-0 left-1/2 -translate-x-1/2 h-1 w-8 bg-[#C98A3E] rounded-b-full" />}
                  <Icon className={cn("h-5 w-5 transition-transform", active && "scale-110")} />
                  <span className="w-full truncate text-center uppercase tracking-tighter text-[9px]">{item.label}</span>
                </Link>
              );
            })}
            <button
              onClick={() => {}}
              className="flex min-w-[74px] flex-1 flex-col items-center gap-1 px-2 py-3 text-[10px] font-semibold text-[#9CA3AF]"
            >
              <MoreHorizontal className="h-5 w-5" />
              <span className="w-full truncate text-center uppercase tracking-tighter">Mais</span>
            </button>
          </div>
        )}
        <aside className="no-print sticky top-[56px] hidden h-[calc(100vh-56px)] w-64 shrink-0 overflow-y-auto bg-[#151B2E] px-4 py-8 md:block">
          <div className="relative mb-8 px-4">
            <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#9CA3AF]/60">
              Sistema
            </div>
            <div className="mt-1 h-[1px] w-8 bg-[#C98A3E]/30" />
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
                      "group relative flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium outline-none transition-all duration-200",
                      active
                        ? "bg-gradient-to-r from-[#C98A3E] to-[#E5A95E] text-white shadow-[0_4px_12px_rgba(201,138,62,0.25)]"
                        : "text-[#9CA3AF] hover:bg-white/5 hover:text-white",
                    )}
                  >
                  <Icon className={cn("h-5 w-5 shrink-0 transition-transform duration-200", active ? "scale-110" : "group-hover:scale-110")} strokeWidth={active ? 2.5 : 2} />
                  <span className={cn("truncate tracking-tight", active ? "font-bold" : "font-medium")}>{item.label}</span>
                  {active && (
                    <div className="absolute -right-4 h-8 w-1 rounded-l-full bg-[#C98A3E] shadow-[0_0_12px_#C98A3E]" />
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="mt-12 space-y-4 px-2">
            <div className="rounded-2xl bg-white/5 p-4 backdrop-blur-sm border border-white/5">
              <div className="mb-2 text-[9px] font-bold uppercase tracking-wider text-[#9CA3AF]/60">
                Sessão atual
              </div>
              <div className="flex flex-col gap-1">
                <span className="truncate font-sans text-xs font-semibold text-white">
                  {(acc as any)?.display_name || (acc as any)?.user_email?.split('@')[0] || 'Usuário'}
                </span>
                <span className="text-[10px] text-[#9CA3AF]">
                  {acc?.effective_admin ? "Administrador" : "Operador"}
                </span>
              </div>
            </div>
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
          <span className="hidden text-[9px] font-bold uppercase sm:inline text-[#374151]">Senha</span>
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