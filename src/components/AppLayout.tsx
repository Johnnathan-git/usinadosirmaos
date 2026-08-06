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
import { initial } from "@/lib/format";


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
    <div className="min-h-screen bg-black text-foreground selection:bg-primary/30">
      {/* Background Atmosférico e Cinético */}
      <div className="aurora-container pointer-events-none">
        {/* Fluxo de Energia Rotacional */}
        <div className="energy-wave" />

        {/* Órbitas Celestiais */}
        <div className="energy-orbit" style={{ width: '800px', height: '800px', '--duration': '40s' } as any} />
        <div className="energy-orbit" style={{ width: '1200px', height: '1200px', '--duration': '60s' } as any} />
        
        {/* Partículas Estelares Flutuantes */}
        {[...Array(12)].map((_, i) => (
          <div 
            key={i} 
            className="nebulosa-particle"
            style={{
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              '--duration': `${15 + Math.random() * 20}s`,
              animationDelay: `${-Math.random() * 20}s`
            } as any}
          />
        ))}

        {/* Brilhos de Aurora Sutil */}
        <div className="aurora-blob aurora-blob-1" />
        <div className="aurora-blob aurora-blob-2" />
        
        {/* Textura de profundidade */}
        <div className="absolute inset-0 opacity-[0.02] pointer-events-none mix-blend-overlay bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
      </div>

      {/* Mobile Top Header */}
      <header className="no-print sticky top-0 z-50 flex h-14 items-center justify-between border-b border-white/10 bg-black/50 px-4 backdrop-blur-xl md:hidden">
        <BrandLockup compact />
        <div className="flex items-center gap-2">
          <ChangeOwnPasswordDialog />
          <Button size="icon" variant="ghost" onClick={signOut} className="h-8 w-8 text-muted-foreground hover:text-foreground">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <div className="flex">
        {/* Desktop Sidebar */}
        <aside className="no-print sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-white/5 bg-black/40 backdrop-blur-xl md:flex">
          <div className="p-8">
            <BrandLockup />
          </div>
          
          <div className="flex-1 overflow-y-auto px-4 py-2">
            <nav className="space-y-1">
              {visibleNav.map((item) => {
                const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={cn(
                      "group flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors",
                      active
                        ? "bg-white/5 text-white shadow-[0_0_20px_rgba(255,255,255,0.05)]"
                        : "text-white/40 hover:bg-white/5 hover:text-white"
                    )}
                  >
                    <Icon className={cn(
                      "h-4 w-4 shrink-0",
                      active ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                    )} strokeWidth={2} />
                    <span className="truncate">{item.label}</span>
                    {active && <div className="ml-auto h-1 w-1 rounded-full bg-primary" />}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="mt-auto border-t border-white/5 p-4">
            <div className="mb-4 flex items-center gap-3 rounded-xl bg-white/5 p-2.5 border border-white/5 shadow-sm">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground uppercase">
                {initial((acc as any)?.display_name || 'U')}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-xs font-bold text-white leading-tight">
                  {(acc as any)?.display_name || 'Usuário'}
                </div>
                <div className="text-[10px] font-medium text-white/40 uppercase tracking-wider">
                  {acc?.effective_admin ? "Administrador" : "Cliente"}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <ChangeOwnPasswordDialog />
              <Button 
                variant="secondary" 
                size="sm" 
                onClick={signOut} 
                className="flex-1 h-8 gap-2 rounded-lg bg-white/5 text-white/60 hover:bg-destructive/20 hover:text-white hover:border-destructive/30 border-white/5 border transition-all"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span className="text-[10px] font-bold uppercase">Sair</span>
              </Button>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="min-h-screen min-w-0 flex-1 relative z-10">
          <div className="mx-auto max-w-7xl px-4 py-8 pb-32 sm:px-8 md:pb-12">
            {blocked ? (
              <div className="mx-auto mt-20 max-w-md rounded-2xl border border-border bg-card p-10 text-center shadow-xl">
                <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-accent text-muted-foreground">
                  <ShieldCheck className="h-10 w-10" />
                </div>
                <h2 className="text-xl font-bold text-foreground">Acesso Restrito</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Sua conta não possui permissões para visualizar este módulo.
                </p>
                <Button 
                  onClick={() => navigate({ to: "/", replace: true })}
                  className="mt-8 w-full bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  Voltar ao Início
                </Button>
              </div>
            ) : children}
          </div>
        </main>

        {/* Mobile Bottom Navigation */}
        <nav className="no-print fixed inset-x-0 bottom-6 z-40 mx-4 flex h-16 items-center justify-around rounded-2xl border border-white/10 bg-black/50 px-2 backdrop-blur-xl md:hidden shadow-2xl">
          {visibleNav.slice(0, 4).map((item) => {
            const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "relative flex flex-col items-center gap-1 px-3 py-1 transition-all",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <Icon className={cn("h-5 w-5 transition-transform", active && "scale-110")} />
                <span className="text-[8px] font-bold uppercase tracking-wider">{item.label.split(' ')[0]}</span>
              </Link>
            );
          })}
          <button className="flex flex-col items-center gap-1 px-3 py-1 text-muted-foreground">
            <MoreHorizontal className="h-5 w-5" />
            <span className="text-[8px] font-bold uppercase tracking-wider">Mais</span>
          </button>
        </nav>
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