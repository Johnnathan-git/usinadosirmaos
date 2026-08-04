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
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md p-8 elev-3">
        <div className="mb-6 flex flex-col items-center gap-3">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-white p-1 border border-[#E4E7EC] shadow-sm">
            <BrandMark className="h-12 w-12" />
          </div>
          <div className="text-center leading-none">
            <div className="font-display text-2xl font-bold tracking-tight text-[#374151]">
              Usina dos Irmãos
            </div>
            <div className="mt-1.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              Energia solar
            </div>
          </div>
        </div>
        <h1 className="mb-1 text-center text-xl font-bold text-[#374151]">Entrar no sistema</h1>
        <p className="mb-6 text-center text-sm font-medium text-[#6B7280]">Acesso restrito a usuários cadastrados</p>
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
            <div role="alert" className="rounded-lg border border-[#DC2626]/30 bg-rose-50 px-3 py-2 text-sm text-[#DC2626]">
              {error}
            </div>
          )}
          <Button type="submit" disabled={loading || !hydrated} className="w-full bg-[#151B2E] text-white hover:bg-[#1F2A45] font-bold rounded-lg shadow-sm">
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