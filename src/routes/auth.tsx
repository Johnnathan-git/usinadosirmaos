import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Home } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
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

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) navigate({ to: "/", replace: true });
    })();
  }, [navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !password) { setError("Preencha usuário e senha."); return; }
    setLoading(true);
    const res = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setLoading(false);
    if (res.error) {
      setError("Usuário ou senha inválidos.");
      return;
    }
    toast.success("Bem-vindo!");
    navigate({ to: "/", replace: true });
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
        <form onSubmit={submit} className="space-y-4">
          <div>
            <Label htmlFor="email">Usuário (e-mail)</Label>
            <Input id="email" type="email" autoComplete="username" value={email}
              onChange={e => setEmail(e.target.value)} placeholder="voce@exemplo.com" />
          </div>
          <div>
            <Label htmlFor="password">Senha</Label>
            <Input id="password" type="password" autoComplete="current-password"
              value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" />
          </div>
          {error && (
            <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </div>
          )}
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Aguarde..." : "Entrar"}
          </Button>
        </form>
        <p className="mt-4 text-center text-xs text-muted-foreground">
          Novos usuários são cadastrados pelo administrador no módulo Acessos.
        </p>
      </Card>
    </div>
  );
}