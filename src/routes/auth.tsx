import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Eye, EyeOff } from "lucide-react";
import { BrandMark } from "@/components/BrandMark";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  ssr: false,
  component: AuthPage,
  head: () => ({
    meta: [
      { title: "Entrar — Usina dos Irmãos" },
      { name: "description", content: "Acesso ao sistema de gestão da Usina dos Irmãos." },
    ],
  }),
});

function AuthPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("theme") as "dark" | "light" | null;
    document.documentElement.classList.toggle("light", saved === "light");
  }, []);

  useEffect(() => {

    setHydrated(true);
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) navigate({ to: "/", replace: true });
    })();
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) navigate({ to: "/", replace: true });
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  function describeError(message: string) {
    const m = message.toLowerCase();
    if (m.includes("email not confirmed")) return "E-mail ainda não confirmado. Peça ao administrador para reativar seu acesso.";
    if (m.includes("rate limit") || m.includes("too many")) return "Muitas tentativas. Aguarde alguns minutos e tente de novo.";
    if (m.includes("failed to fetch") || m.includes("network")) return "Sem conexão com o servidor. Verifique sua internet e tente novamente.";
    if (m.includes("user is banned") || m.includes("disabled")) return "Este usuário está desativado. Fale com o administrador.";
    return "Usuário ou senha inválidos.";
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!hydrated || loading) return;
    setError(null);
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !password) { setError("Preencha usuário e senha."); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) { setError("Informe um e-mail válido."); return; }
    setLoading(true);
    try {
      const res = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
      if (res.error) {
        setError(describeError(res.error.message));
        return;
      }
      toast.success("Bem-vindo!");
      navigate({ to: "/", replace: true });
    } catch (err) {
      setError(describeError(err instanceof Error ? err.message : ""));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-[100dvh] w-screen items-center justify-center bg-background p-4 relative overflow-hidden overscroll-none text-foreground">
      {/* Background e Efeitos Visuais (Identico ao AppLayout) */}
      <div className="aurora-container pointer-events-none z-0">
        {/* Glow de Fundo */}
        <div 
          className="absolute rounded-full opacity-20 blur-[120px]"
          style={{ 
            top: '48%', left: '35%', width: '800px', height: '800px', 
            background: 'radial-gradient(circle at center, rgba(201, 138, 62, 0.15) 0%, rgba(37, 99, 235, 0.05) 50%, transparent 80%)',
            transform: 'translate(-50%, -50%)',
          }}
        />
        <div className="energy-wave" />
      </div>

      {/* Esfera de Energia que Sobrepõe o Card (Identica ao AppLayout) */}
      <div className="aurora-container pointer-events-none z-[60]">
        <div 
          className="energy-orbit" 
          style={{ 
            width: '1050px', height: '1050px', '--duration': '50s',
            top: '48%', left: '35%'
          } as any} 
        />
      </div>

      <div className="aurora-container pointer-events-none z-0">
        {[...Array(20)].map((_, i) => {
          const colors = ['#ffffff', '#C98A3E', '#2563EB', '#2F6F62'];
          const color = colors[i % colors.length];
          const size = 1 + Math.random() * 2;
          return (
            <div 
              key={i} className="nebulosa-particle"
              style={{
                top: `${Math.random() * 100}%`, left: `${Math.random() * 100}%`,
                '--size': `${size}px`, '--color': color,
                '--duration': `${10 + Math.random() * 25}s`,
                '--move-x': `${(Math.random() - 0.5) * 150}px`, '--move-y': `${(Math.random() - 0.5) * 150}px`,
                animationDelay: `${-Math.random() * 20}s`
              } as any}
            />
          );
        })}
        <div className="aurora-blob aurora-blob-1" />
        <div className="aurora-blob aurora-blob-2" />
        <div className="absolute inset-0 opacity-[0.02] mix-blend-overlay bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
      </div>
      
      <Card className="glass-card relative w-full max-w-md border-border p-8 shadow-2xl sm:p-10 bg-card backdrop-blur-2xl z-10">
        <div className="mb-8 flex flex-col items-center gap-6">
          <div className="relative flex h-20 w-20 items-center justify-center">
            {/* Brilho atmosférico sutil sem forma rígida */}
            <div className="absolute inset-0 bg-primary/10 rounded-full blur-[30px] opacity-20" />
            
            <div className="relative flex h-14 w-14 items-center justify-center bg-transparent">
              <BrandMark className="h-full w-full object-contain rounded-full" />
            </div>
          </div>
          <div className="text-center">
            <div className="font-display text-2xl font-bold tracking-tight text-foreground dark:text-glow">
              Usina dos Irmãos
            </div>
            <div className="mt-1.5 text-[10px] font-bold uppercase tracking-[0.25em] text-primary">
              Gestão de energia
            </div>
          </div>
        </div>

        <div className="mb-8 space-y-1 text-center">
          <h1 className="text-xl font-bold text-foreground">Seja bem vindo</h1>
          <p className="text-sm font-medium text-muted-foreground">Acesse sua conta para continuar</p>

        </div>

        <form onSubmit={submit} method="post" action="#" className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">E-mail</Label>
            <Input id="email" type="email" inputMode="email" autoCapitalize="none" autoCorrect="off"
              required autoComplete="username" value={email}
              className="h-11 border-border bg-input text-foreground focus:ring-primary autofill:shadow-[0_0_0_1000px_#0D0D10_inset] [text-fill-color:var(--foreground)] [-webkit-text-fill-color:var(--foreground)] dark:autofill:shadow-[0_0_0_1000px_#0D0D10_inset] light:autofill:shadow-[0_0_0_1000px_#FFFFFF_inset] autofill:border-border"
              onChange={e => setEmail(e.target.value)} placeholder="voce@exemplo.com" />

          </div>
          <div className="space-y-2">
            <Label htmlFor="password" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Senha</Label>
            <div className="relative">
              <Input id="password" type={showPassword ? "text" : "password"} required
                autoComplete="current-password" 
                className="h-11 pr-10 border-border bg-input text-foreground focus:ring-primary autofill:shadow-[0_0_0_1000px_#0D0D10_inset] [text-fill-color:var(--foreground)] [-webkit-text-fill-color:var(--foreground)] dark:autofill:shadow-[0_0_0_1000px_#0D0D10_inset] light:autofill:shadow-[0_0_0_1000px_#FFFFFF_inset] autofill:border-border"
                value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" />

              <button type="button" onClick={() => setShowPassword(v => !v)}
                aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground hover:text-foreground">
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          
          {error && (
            <div role="alert" className="animate-in fade-in slide-in-from-top-1 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm font-medium text-red-400">
              {error}
            </div>
          )}

          <Button type="submit" disabled={loading || !hydrated} 
            className="h-11 w-full bg-primary text-primary-foreground hover:bg-primary/90 font-bold rounded-lg shadow-lg shadow-primary/20 transition-all active:scale-[0.98]">
            {loading ? "Autenticando..." : "Entrar no Sistema"}
          </Button>
        </form>

        <div className="mt-8 border-t border-white/5 pt-6">
          <p className="text-center text-[11px] font-medium leading-relaxed text-white/40">
            Novos usuarios são cadastrados <br/> 
            <span className="font-bold text-white/60">exclusivamente pelo administrador</span>
          </p>
        </div>
      </Card>
    </div>
  );
}