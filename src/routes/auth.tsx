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
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/", replace: true });
    });
  }, [navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    if (!email.trim() || !password) { setError("Preencha usuário e senha."); return; }
    if (password.length < 6) { setError("A senha deve ter pelo menos 6 caracteres."); return; }
    setLoading(true);
    const res = mode === "login"
      ? await supabase.auth.signInWithPassword({ email: email.trim(), password })
      : await supabase.auth.signUp({ email: email.trim(), password, options: { emailRedirectTo: window.location.origin } });
    setLoading(false);
    if (res.error) {
      const raw = res.error.message.toLowerCase();
      if (raw.includes("already registered") || raw.includes("user already")) {
        setMode("login");
        setError("Este e-mail já tem conta. Entre com sua senha ou redefina abaixo.");
      } else if (raw.includes("invalid")) {
        setError("Usuário ou senha inválidos. Se esqueceu a senha, redefina abaixo.");
      } else {
        setError(res.error.message);
      }
      return;
    }
    if (mode === "signup" && !res.data.session) {
      setInfo("Conta criada. Verifique seu e-mail para confirmar antes de entrar.");
      setMode("login");
      return;
    }
    toast.success(mode === "login" ? "Bem-vindo!" : "Conta criada!");
    navigate({ to: "/", replace: true });
  }

  async function resetPassword() {
    setError(null);
    setInfo(null);
    if (!email.trim()) { setError("Informe seu e-mail para redefinir a senha."); return; }
    setLoading(true);
    const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (err) { setError(err.message); return; }
    setInfo("Enviamos um link de redefinição para o seu e-mail.");
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
        <h1 className="mb-1 text-center text-xl font-semibold">
          {mode === "login" ? "Entrar no sistema" : "Criar conta"}
        </h1>
        <p className="mb-6 text-center text-sm text-muted-foreground">
          {mode === "login" ? "Acesse com seu usuário e senha" : "Cadastre suas credenciais de acesso"}
        </p>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <Label htmlFor="email">Usuário (e-mail)</Label>
            <Input id="email" type="email" autoComplete="username" value={email}
              onChange={e => setEmail(e.target.value)} placeholder="voce@exemplo.com" />
          </div>
          <div>
            <Label htmlFor="password">Senha</Label>
            <Input id="password" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"}
              value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" />
          </div>
          {error && (
            <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </div>
          )}
          {info && (
            <div role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              {info}
            </div>
          )}
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Aguarde..." : (mode === "login" ? "Entrar" : "Criar conta")}
          </Button>
        </form>
        {mode === "login" && (
          <div className="mt-3 text-center text-sm">
            <button type="button" onClick={resetPassword} className="text-muted-foreground hover:text-primary hover:underline">
              Esqueci minha senha
            </button>
          </div>
        )}
        <div className="mt-4 text-center text-sm text-muted-foreground">
          {mode === "login" ? (
            <>Não tem conta? <button type="button" onClick={() => { setMode("signup"); setError(null); }} className="font-medium text-primary hover:underline">Criar agora</button></>
          ) : (
            <>Já tem conta? <button type="button" onClick={() => { setMode("login"); setError(null); }} className="font-medium text-primary hover:underline">Entrar</button></>
          )}
        </div>
      </Card>
    </div>
  );
}