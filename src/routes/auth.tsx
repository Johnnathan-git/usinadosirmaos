import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Home, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  ssr: false,
  component: AuthPage,
  head: () => ({
    meta: [
      { title: "Entrar — Usina JJ" },
      { name: "description", content: "Acesso ao sistema de gestão da Usina JJ." },
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
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-emerald-50 to-white p-4">
      <Card className="w-full max-w-md p-8 shadow-lg">
        <div className="mb-6 flex flex-col items-center gap-2">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <Home className="h-7 w-7" />
          </div>
          <div className="text-center leading-tight">
            <div className="text-[10px] font-semibold tracking-widest text-primary">USINA</div>
            <div className="text-2xl font-bold">JJ</div>
          </div>
        </div>
        <h1 className="mb-1 text-center text-xl font-semibold">Entrar no sistema</h1>
        <p className="mb-6 text-center text-sm text-muted-foreground">Acesso restrito a usuários cadastrados</p>
        <form onSubmit={submit} method="post" action="#" className="space-y-4">
          <div>
            <Label htmlFor="email">Usuário (e-mail)</Label>
            <Input id="email" type="email" inputMode="email" autoCapitalize="none" autoCorrect="off"
              required autoComplete="username" value={email}
              onChange={e => setEmail(e.target.value)} placeholder="voce@exemplo.com" />
          </div>
          <div>
            <Label htmlFor="password">Senha</Label>
            <div className="relative">
              <Input id="password" type={showPassword ? "text" : "password"} required
                autoComplete="current-password" className="pr-10"
                value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" />
              <button type="button" onClick={() => setShowPassword(v => !v)}
                aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground">
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          {error && (
            <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </div>
          )}
          <Button type="submit" disabled={loading || !hydrated} className="w-full">
            {loading ? "Aguarde..." : hydrated ? "Entrar" : "Carregando..."}
          </Button>
        </form>
        <p className="mt-4 text-center text-xs text-muted-foreground">
          Novos usuários são cadastrados pelo administrador no módulo Acessos.
        </p>
      </Card>
    </div>
  );
}