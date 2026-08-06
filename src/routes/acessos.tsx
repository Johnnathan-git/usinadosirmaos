import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, ShieldCheck, Trash2, Pencil, KeyRound } from "lucide-react";
import { MODULES } from "@/lib/permissions";
import {
  listManagedUsers, createManagedUser, updateManagedUser, deleteManagedUser, changeMyPassword
} from "@/lib/acessos.functions";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { formatDateBR } from "@/lib/format";

export const Route = createFileRoute("/acessos")({
  ssr: false,
  component: AcessosPage,
  head: () => ({
    meta: [
      { title: "Acessos — Usina dos Irmãos" },
      { name: "description", content: "Gerencie usuários e permissões do sistema." },
    ],
  }),
});

const MODULE_OPTIONS = MODULES.filter((m) => m.key !== "acessos");

function AcessosPage() {
  return (
    <AppLayout>
      <AcessosContent />
    </AppLayout>
  );
}

function AcessosContent() {
  const listFn = useServerFn(listManagedUsers);
  const [hasSession, setHasSession] = useState(false);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setHasSession(!!data.session));
  }, []);
  const q = useQuery({
    queryKey: ["managed-users"],
    queryFn: () => listFn(),
    enabled: hasSession,
  });
  const clientsQ = useQuery({
    queryKey: ["clients-simple"],
    enabled: hasSession,
    queryFn: async () => {
      const { data, error } = await supabase.from("clients").select("id,name").order("name");
      if (error) throw error;
      return data as { id: string; name: string }[];
    },
  });
  const clients = clientsQ.data ?? [];
  const clientName = (id: string | null) => id ? (clients.find(c => c.id === id)?.name ?? "—") : null;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-white text-glow">Acessos</h1>
          <p className="text-sm font-medium text-white/40">Gerencie usuários e permissões do sistema.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <UserFormDialog mode="create" clients={clients} />
        </div>
      </div>

      {q.data?.bootstrap && (
        <div className="rounded-lg border border-primary/20 bg-primary/10 px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-primary">
          Nenhum administrador cadastrado ainda — todos os usuários autenticados têm acesso total até o primeiro admin ser marcado.
        </div>
      )}

      <Card className="glass-card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-white/5">
                <th className="px-6 py-4 text-left font-bold text-white/40 uppercase text-[10px] tracking-wider">E-mail</th>
                <th className="px-6 py-4 text-left font-bold text-white/40 uppercase text-[10px] tracking-wider">Nome</th>
                <th className="px-6 py-4 text-left font-bold text-white/40 uppercase text-[10px] tracking-wider">Papel</th>
                <th className="px-6 py-4 text-left font-bold text-white/40 uppercase text-[10px] tracking-wider">Permissões</th>
                <th className="px-6 py-4 text-left font-bold text-white/40 uppercase text-[10px] tracking-wider">Cliente</th>
                <th className="px-6 py-4 text-left font-bold text-white/40 uppercase text-[10px] tracking-wider">Criado em</th>
                <th className="px-6 py-4 text-right font-bold text-white/40 uppercase text-[10px] tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody>
              {(q.data?.users ?? []).map((u) => (
                <tr key={u.id} className="border-t border-white/5 hover:bg-white/5 transition-colors zebra-stripe">
                  <td className="px-6 py-4 font-bold text-white">{u.email}</td>
                  <td className="px-6 py-4 text-[10px] font-bold text-white/70 uppercase tracking-wider">{u.display_name || <span className="text-white/20">—</span>}</td>
                  <td className="px-6 py-4">
                    {u.is_admin ? (
                      <span className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-primary-foreground shadow-lg shadow-primary/20">
                        <ShieldCheck className="h-3 w-3" /> Administrador
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-white/30 uppercase tracking-wider">Usuário</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {u.is_admin ? (
                      <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Todos os módulos</span>
                    ) : u.permissions.length === 0 ? (
                      <span className="text-[10px] text-white/20">—</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {u.permissions.map((p) => (
                          <span key={p} className="rounded-md bg-white/10 px-2 py-0.5 text-[10px] font-bold text-white/70 uppercase tracking-wider">
                            {MODULE_OPTIONS.find((m) => m.key === p)?.label ?? p}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-[10px] font-bold text-white/40 uppercase tracking-wider">
                    {clientName(u.client_id) ?? <span className="text-white/20">—</span>}
                  </td>
                  <td className="px-6 py-4 text-[10px] font-bold text-white/40 uppercase tracking-wider num">{formatDateBR(u.created_at)}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="inline-flex gap-2">
                      <UserFormDialog mode="edit" user={u} clients={clients} />
                      <ResetPasswordDialog user={u} />
                      <DeleteUserButton userId={u.id} email={u.email} />
                    </div>
                  </td>
                </tr>
              ))}
              {q.data && q.data.users.length === 0 && (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-sm text-slate-500 font-medium">Nenhum usuário cadastrado.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

type UserRow = { id: string; email: string; is_admin: boolean; permissions: string[]; client_id: string | null; display_name: string | null };

function UserFormDialog({ mode, user, clients }: { mode: "create" | "edit"; user?: UserRow; clients: { id: string; name: string }[] }) {
  const qc = useQueryClient();
  const createFn = useServerFn(createManagedUser);
  const updateFn = useServerFn(updateManagedUser);
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState(user?.email ?? "");
  const [password, setPassword] = useState("");
  const [isAdmin, setIsAdmin] = useState(user?.is_admin ?? false);
  const [perms, setPerms] = useState<string[]>(user?.permissions ?? []);
  const [clientId, setClientId] = useState<string>(user?.client_id ?? "none");
  const [displayName, setDisplayName] = useState(user?.display_name ?? "");

  const m = useMutation({
    mutationFn: async () => {
      const client_id = clientId === "none" ? null : clientId;
      if (mode === "create") {
        const mail = email.trim();
        if (!mail || !/^\S+@\S+\.\S+$/.test(mail)) throw new Error("Informe um e-mail válido.");
        if (password.length < 6) throw new Error("A senha deve ter no mínimo 6 caracteres.");
        return createFn({ data: { email: mail, password, is_admin: isAdmin, permissions: isAdmin ? [] : perms, client_id, display_name: displayName } });
      }
      if (password && password.length < 6) throw new Error("A senha deve ter no mínimo 6 caracteres.");
      return updateFn({ data: { user_id: user!.id, is_admin: isAdmin, permissions: isAdmin ? [] : perms, password: password || undefined, client_id, display_name: displayName } });
    },
    onSuccess: () => {
      toast.success(mode === "create" ? "Usuário criado." : "Usuário atualizado.");
      qc.invalidateQueries({ queryKey: ["managed-users"] });
      setOpen(false);
      setPassword("");
    },
    onError: (e: any) => toast.error(e?.message ?? "Falha ao salvar."),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {mode === "create" ? (
          <Button className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg px-4 py-2 font-bold shadow-lg shadow-primary/20"><Plus className="mr-2 h-4 w-4" /> Novo usuário</Button>
        ) : (
          <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-white/30 hover:text-white"><Pencil className="h-4 w-4" /></Button>
        )}
      </DialogTrigger>
      <DialogContent className="glass-card border-white/10 text-white">
        <DialogHeader>
          <DialogTitle className="text-white text-glow">{mode === "create" ? "Novo usuário" : `Editar ${user?.email}`}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {mode === "create" ? (
              <div>
                <Label className="text-white/40">E-mail</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="usuario@exemplo.com" className="bg-white/5 border-white/10 text-white" />
              </div>
            ) : (
              <div className="flex flex-col justify-center">
                <Label className="text-white/40">E-mail</Label>
                <div className="text-sm font-semibold text-white">{user?.email}</div>
              </div>
            )}
            <div>
              <Label className="text-white/40">Nome de Boas-vindas</Label>
              <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Ex: João Silva" className="bg-white/5 border-white/10 text-white" />
            </div>
          </div>
          <div>
            <Label className="text-white/40">{mode === "create" ? "Senha" : "Nova senha (opcional)"}</Label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" className="bg-white/5 border-white/10 text-white" />
          </div>
          <label className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 p-3">
            <Checkbox checked={isAdmin} onCheckedChange={(v) => setIsAdmin(Boolean(v))} className="border-white/20 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground" />
            <div>
              <div className="text-sm font-medium text-white">Administrador</div>
              <div className="text-xs text-white/40">Acesso total, incluindo gerenciamento de usuários.</div>
            </div>
          </label>
          {!isAdmin && (
            <div>
              <Label className="text-white/40">Módulos liberados</Label>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {MODULE_OPTIONS.map((mod) => {
                  const checked = perms.includes(mod.key);
                  return (
                    <label key={mod.key} className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 p-2 text-sm">
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(v) => {
                          setPerms((prev) => v ? [...prev, mod.key] : prev.filter((p) => p !== mod.key));
                        }}
                        className="border-white/20 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
                      />
                      <span className="text-white/70">{mod.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}
          {!isAdmin && (
            <div>
              <Label className="text-white/40">Cliente vinculado (Resultado)</Label>
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger className="mt-1 bg-white/5 border-white/10 text-white"><SelectValue placeholder="Selecione um cliente" /></SelectTrigger>
                <SelectContent className="bg-navy border-white/10 text-white">
                  <SelectItem value="none">Nenhum (vê todos)</SelectItem>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="mt-1 text-xs text-white/30">Se selecionado, no módulo Resultado o usuário verá apenas as faturas deste cliente.</p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} className="text-white/40 hover:text-white hover:bg-white/5">Cancelar</Button>
          <Button
            onClick={() => m.mutate()}
            disabled={m.isPending || (mode === "create" && (!email.trim() || password.length < 6))}
            className="bg-primary text-primary-foreground hover:bg-primary/90 font-bold"
          >
            {m.isPending ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DeleteUserButton({ userId, email }: { userId: string; email: string }) {
  const qc = useQueryClient();
  const delFn = useServerFn(deleteManagedUser);
  const m = useMutation({
    mutationFn: () => delFn({ data: { user_id: userId } }),
    onSuccess: () => {
      toast.success("Usuário excluído.");
      qc.invalidateQueries({ queryKey: ["managed-users"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Falha ao excluir."),
  });
  return (
    <Button size="sm" variant="ghost" onClick={() => {
      if (confirm(`Excluir ${email}? Esta ação não pode ser desfeita.`)) m.mutate();
    }}>
      <Trash2 className="h-4 w-4 text-[#D64545]" />
    </Button>
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
        <Button variant="outline" className="bg-white border-slate-200 text-slate-600 hover:bg-slate-50 font-bold rounded-lg">Alterar Minha Senha</Button>
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

function ResetPasswordDialog({ user }: { user: UserRow }) {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const updateFn = useServerFn(updateManagedUser);
  const qc = useQueryClient();
  
  const m = useMutation({
    mutationFn: () => updateFn({ data: { user_id: user.id, password, is_admin: user.is_admin, permissions: user.permissions, client_id: user.client_id, display_name: user.display_name || undefined } }),
    onSuccess: () => {
      toast.success(`Senha de ${user.email} resetada.`);
      setOpen(false);
      setPassword("");
      qc.invalidateQueries({ queryKey: ["managed-users"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Falha ao resetar senha."),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-[#9CA3AF] hover:text-[#2E5C8A]">
          <KeyRound className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Resetar Senha: {user.email}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <Label>Nova Senha Temporária</Label>
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
            className="bg-[#2E5C8A] hover:bg-[#254A6E] text-white font-medium"
          >
            {m.isPending ? "Resetando..." : "Confirmar Novo Acesso"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}