import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { LayoutGrid, Users, Wallet, BarChart3, Gauge, Package, ShieldCheck, FileSpreadsheet, KeyRound, MoreHorizontal, Sun, Moon } from "lucide-react";
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
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    const saved = localStorage.getItem("theme") as "dark" | "light";
    const initial = saved === "light" ? "light" : "dark";
    setTheme(initial);
    document.documentElement.classList.toggle("light", initial === "light");
  }, []);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem("theme", next);
    document.documentElement.classList.toggle("light", next === "light");
  };


  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      if (!mounted) return;
      if (!sess.session) {
        navigate({ to: "/auth", replace: true });
        return;
      }
      // Valida o token no servidor: sessões expiradas/inválidas são descartadas.
      const { data: userData, error } = await supabase.auth.getUser();
      if (!mounted) return;
      if (error || !userData.user) {
        await supabase.auth.signOut();
        navigate({ to: "/auth", replace: true });
        return;
      }
      setReady(true);
    })();
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT" || (!session && event !== "INITIAL_SESSION")) {
        setReady(false);
        navigate({ to: "/auth", replace: true });
      } else if (session) {
        setReady(true);
      }
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
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/30">
      {/* Background Atmosférico e Cinético */}
      <div className="aurora-container pointer-events-none">
        {/* Centro de Energia Realista com Gradiente Orgânico e Esfumaçado */}
        <div 
          className="absolute rounded-full opacity-40 blur-[90px] pointer-events-none"
          style={{ 
            top: '45%', 
            left: '48%', 
            width: '450px', 
            height: '450px', 
            background: 'radial-gradient(circle at center, rgba(201, 138, 62, 0.25) 0%, rgba(37, 99, 235, 0.1) 45%, transparent 75%)',
            transform: 'translate(-50%, -50%)',
          }}
        />

        {/* Fluxo de Energia Rotacional */}
        <div className="energy-wave" />

        {/* Esfera Celestial Única (Menor) com Profundidade e Reflexos Realistas */}
        <div className="energy-orbit" style={{ width: '400px', height: '400px', '--duration': '40s' } as any} />
        
        {/* Partículas Estelares com Variação de Cor e Movimento */}
        {[...Array(20)].map((_, i) => {
          const colors = ['#ffffff', '#C98A3E', '#2563EB', '#2F6F62'];
          const color = colors[i % colors.length];
          const size = 1 + Math.random() * 2;
          return (
            <div 
              key={i} 
              className="nebulosa-particle"
              style={{
                top: `${Math.random() * 100}%`,
                left: `${Math.random() * 100}%`,
                '--size': `${size}px`,
                '--color': color,
                '--duration': `${10 + Math.random() * 25}s`,
                '--move-x': `${(Math.random() - 0.5) * 150}px`,
                '--move-y': `${(Math.random() - 0.5) * 150}px`,
                animationDelay: `${-Math.random() * 20}s`
              } as any}
            />
          );
        })}

        {/* Brilhos de Aurora Sutil */}
        <div className="aurora-blob aurora-blob-1" />
        <div className="aurora-blob aurora-blob-2" />
        
        {/* Textura de profundidade */}
        <div className="absolute inset-0 opacity-[0.02] pointer-events-none mix-blend-overlay bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
      </div>

      {/* Mobile Top Header */}
      <header className="no-print sticky top-0 z-50 flex h-16 items-center justify-between border-b border-border bg-background/40 px-4 backdrop-blur-xl md:hidden">
        <BrandLockup />
        <div className="flex items-center gap-2">
          <Button size="icon" variant="ghost" onClick={toggleTheme} className="h-9 w-9 text-muted-foreground hover:text-foreground">
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          <ChangeOwnPasswordDialog />

          <Button size="icon" variant="ghost" onClick={signOut} className="h-9 w-9 text-muted-foreground hover:text-foreground">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <div className="flex">
        {/* Desktop Sidebar */}
        <aside className="no-print sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-border bg-sidebar md:flex">
          <div className="p-6">
            <BrandLockup onSidebar />
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
                        ? "bg-primary/10 text-primary shadow-[0_0_20px_rgba(201,138,62,0.1)]"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground"
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

          <div className="mt-auto border-t border-border p-4 light:border-white/10">
            <div className="mb-4 flex items-center gap-3 rounded-xl bg-accent p-2.5 border border-border shadow-sm light:bg-white/10 light:border-white/15">

              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground uppercase">
                {initial((acc as any)?.display_name || 'U')}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-xs font-bold text-foreground leading-tight light:text-white">
                  {(acc as any)?.display_name || 'Usuário'}
                </div>
                <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider light:text-white/60">

                  {acc?.effective_admin ? "Administrador" : "Cliente"}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={toggleTheme} 
                className="h-8 w-8 rounded-lg border border-border bg-accent text-muted-foreground hover:text-foreground light:bg-white/10 light:border-white/15 light:text-white/80 light:hover:text-white"
                title={theme === "dark" ? "Mudar para tema claro" : "Mudar para tema escuro"}
              >
                {theme === "dark" ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
              </Button>
              <ChangeOwnPasswordDialog />
              <Button 
                variant="secondary" 
                size="sm" 
                onClick={signOut} 
                className="flex-1 h-8 gap-2 rounded-lg bg-accent text-muted-foreground hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 border-border border transition-all light:bg-white/10 light:border-white/15 light:text-white/80"
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
        <nav className="no-print fixed inset-x-0 bottom-6 z-40 mx-4 flex h-16 items-center justify-around rounded-2xl border border-border bg-card px-2 backdrop-blur-2xl md:hidden shadow-2xl overflow-x-auto scrollbar-hide">
          {visibleNav.map((item) => {
            const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "relative flex flex-col items-center gap-1.5 px-4 py-1 transition-all flex-shrink-0",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <div className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-lg transition-all",
                  active ? "bg-primary/10" : "bg-transparent"
                )}>
                  <Icon className={cn("h-5 w-5 transition-transform", active && "scale-110")} />
                </div>
                <span className="text-[9px] font-bold uppercase tracking-wider">{item.label.split(' ')[0]}</span>
                {active && <div className="absolute -bottom-1 h-1 w-1 rounded-full bg-primary shadow-[0_0_8px_rgba(245,158,11,0.6)]" />}
              </Link>
            );
          })}
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
        <Button size="sm" variant="ghost" className="h-8 px-3 rounded-lg border border-border bg-accent text-muted-foreground hover:text-foreground light:bg-white/10 light:text-white/80 light:hover:text-white light:border-white/15">
          <KeyRound className="h-3.5 w-3.5 sm:mr-2" />
          <span className="hidden text-[10px] font-bold uppercase sm:inline">Senha</span>
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
            className="bg-primary text-primary-foreground hover:bg-primary/90 font-medium"
          >
            {m.isPending ? "Alterando..." : "Confirmar Alteração"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}