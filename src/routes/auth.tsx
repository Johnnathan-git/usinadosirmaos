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
    <div className="flex min-h-screen items-center justify-center bg-[#F5F6F8] p-4 relative overflow-hidden">
      {/* Elementos decorativos de fundo */}
      <div className="absolute -top-[10%] -right-[5%] h-64 w-64 rounded-full bg-indigo-500/5 blur-3xl" />
      <div className="absolute -bottom-[10%] -left-[5%] h-80 w-80 rounded-full bg-[#C98A3E]/10 blur-3xl" />
      
      <Card className="relative w-full max-w-md border-none bg-white p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] sm:p-10">
        <div className="mb-8 flex flex-col items-center gap-6">
          <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-white p-2 shadow-sm ring-1 ring-[#E4E7EC]">
            <BrandMark className="h-16 w-16" />
          </div>
          <div className="text-center">
            <div className="font-display text-2xl font-bold tracking-tight text-[#151B2E]">
              Usina dos Irmãos
            </div>
            <div className="mt-1.5 text-[10px] font-bold uppercase tracking-[0.25em] text-[#C98A3E]">
              Gestão de energia
            </div>
          </div>
        </div>

        <div className="mb-8 space-y-1 text-center">
          <h1 className="text-xl font-bold text-[#151B2E]">Boas-vindas</h1>
          <p className="text-sm font-medium text-muted-foreground">Acesse sua conta para continuar</p>
        </div>

        <form onSubmit={submit} method="post" action="#" className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-xs font-bold uppercase tracking-wider text-[#4B5563]">E-mail</Label>
            <Input id="email" type="email" inputMode="email" autoCapitalize="none" autoCorrect="off"
              required autoComplete="username" value={email}
              className="h-11 border-[#E4E7EC] bg-[#F9FAFB] focus:bg-white focus:ring-[#C98A3E]"
              onChange={e => setEmail(e.target.value)} placeholder="voce@exemplo.com" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" className="text-xs font-bold uppercase tracking-wider text-[#4B5563]">Senha</Label>
            <div className="relative">
              <Input id="password" type={showPassword ? "text" : "password"} required
                autoComplete="current-password" 
                className="h-11 pr-10 border-[#E4E7EC] bg-[#F9FAFB] focus:bg-white focus:ring-[#C98A3E]"
                value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" />
              <button type="button" onClick={() => setShowPassword(v => !v)}
                aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground hover:text-[#151B2E]">
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          
          {error && (
            <div role="alert" className="animate-in fade-in slide-in-from-top-1 rounded-lg border border-red-100 bg-red-50 p-3 text-sm font-medium text-[#D64545]">
              {error}
            </div>
          )}

          <Button type="submit" disabled={loading || !hydrated} 
            className="h-11 w-full bg-[#151B2E] text-white hover:bg-[#1e2741] font-bold rounded-lg shadow-lg transition-all active:scale-[0.98]">
            {loading ? "Autenticando..." : "Entrar no Sistema"}
          </Button>
        </form>

        <div className="mt-8 border-t border-[#F1F5F9] pt-6">
          <p className="text-center text-[11px] font-medium leading-relaxed text-muted-foreground">
            Novos usuarios são cadastrados <br/> 
            <span className="font-bold text-[#4B5563]">exclusivamente pelo administrador</span>
          </p>
        </div>
      </Card>
    </div>
  );
}