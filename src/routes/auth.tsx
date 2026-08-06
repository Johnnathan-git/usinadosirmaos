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
    <div className="flex min-h-screen items-center justify-center bg-black p-4 relative overflow-hidden">
      {/* Background Atmosférico e Cinético (Cópia do Layout para manter consistência) */}
      <div className="aurora-container pointer-events-none">
        <div className="energy-wave" />
        <div className="energy-orbit" style={{ width: '800px', height: '800px', '--duration': '40s' } as any} />
        <div className="energy-orbit" style={{ width: '1200px', height: '1200px', '--duration': '60s' } as any} />
        
        {[...Array(8)].map((_, i) => (
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

        <div className="aurora-blob aurora-blob-1" />
        <div className="aurora-blob aurora-blob-2" />
        <div className="absolute inset-0 opacity-[0.02] pointer-events-none mix-blend-overlay bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
      </div>
      
      <Card className="glass-card relative w-full max-w-md border-white/10 p-8 shadow-2xl sm:p-10">
        <div className="mb-8 flex flex-col items-center gap-6">
          <div className="flex h-28 w-28 items-center justify-center rounded-full bg-gradient-to-tr from-white/10 to-white/5 p-4 shadow-[0_0_50px_rgba(255,255,255,0.08)] ring-1 ring-white/20 backdrop-blur-3xl transition-all duration-700 hover:scale-110 hover:ring-white/40">
            <BrandMark className="h-20 w-20 drop-shadow-[0_10px_15px_rgba(0,0,0,0.4)] transition-transform duration-700" />
          </div>
          <div className="text-center">
            <div className="font-display text-2xl font-bold tracking-tight text-white">
              Usina dos Irmãos
            </div>
            <div className="mt-1.5 text-[10px] font-bold uppercase tracking-[0.25em] text-primary">
              Gestão de energia
            </div>
          </div>
        </div>

        <div className="mb-8 space-y-1 text-center">
          <h1 className="text-xl font-bold text-white">Seja bem vindo</h1>
          <p className="text-sm font-medium text-white/40">Acesse sua conta para continuar</p>
        </div>

        <form onSubmit={submit} method="post" action="#" className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-xs font-bold uppercase tracking-wider text-white/40">E-mail</Label>
            <Input id="email" type="email" inputMode="email" autoCapitalize="none" autoCorrect="off"
              required autoComplete="username" value={email}
              className="h-11 border-white/10 bg-white/5 text-white focus:bg-white/10 focus:ring-primary"
              onChange={e => setEmail(e.target.value)} placeholder="voce@exemplo.com" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" className="text-xs font-bold uppercase tracking-wider text-white/40">Senha</Label>
            <div className="relative">
              <Input id="password" type={showPassword ? "text" : "password"} required
                autoComplete="current-password" 
                className="h-11 pr-10 border-white/10 bg-white/5 text-white focus:bg-white/10 focus:ring-primary"
                value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" />
              <button type="button" onClick={() => setShowPassword(v => !v)}
                aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-white/40 hover:text-white">
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