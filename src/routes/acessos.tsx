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
import { Plus, ShieldCheck, Trash2, Pencil } from "lucide-react";
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
          <h1 className="text-4xl font-bold tracking-tight text-[#374151]">Acessos</h1>
          <p className="text-sm font-medium text-[#6B7280]">Gerencie usuários e permissões do sistema.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ChangeOwnPasswordDialog />
          <UserFormDialog mode="create" clients={clients} />
        </div>
      </div>

      {q.data?.bootstrap && (
        <div className="rounded-lg border border-[#C98A3E]/20 bg-[#C98A3E]/10 px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-[#C98A3E]">
          Nenhum administrador cadastrado ainda — todos os usuários autenticados têm acesso total até o primeiro admin ser marcado.
        </div>
      )}

      <Card className="rounded-[10px] border border-[#E4E7EC] bg-white p-0 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#F5F6F8]">
                <th className="px-6 py-4 text-left font-semibold text-[#6B7280] uppercase text-[10px] tracking-wider">E-mail</th>
                <th className="px-6 py-4 text-left font-semibold text-[#6B7280] uppercase text-[10px] tracking-wider">Papel</th>
                <th className="px-6 py-4 text-left font-semibold text-[#6B7280] uppercase text-[10px] tracking-wider">Permissões</th>
                <th className="px-6 py-4 text-left font-semibold text-[#6B7280] uppercase text-[10px] tracking-wider">Cliente</th>
                <th className="px-6 py-4 text-left font-semibold text-[#6B7280] uppercase text-[10px] tracking-wider">Criado em</th>
                <th className="px-6 py-4 text-right font-semibold text-[#6B7280] uppercase text-[10px] tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody>
              {(q.data?.users ?? []).map((u) => (
                <tr key={u.id} className="border-t border-[#F5F6F8] hover:bg-[#F5F6F8] transition-colors">
                  <td className="px-6 py-4 font-bold text-[#374151]">{u.email}</td>
                  <td className="px-6 py-4">
                    {u.is_admin ? (
                      <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#151B2E] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
                        <ShieldCheck className="h-3 w-3" /> Administrador
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider">Usuário</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {u.is_admin ? (
                      <span className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider">Todos os módulos</span>
                    ) : u.permissions.length === 0 ? (
                      <span className="text-[10px] text-[#9CA3AF]">—</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {u.permissions.map((p) => (
                          <span key={p} className="rounded-md bg-[#151B2E]/10 px-2 py-0.5 text-[10px] font-bold text-[#151B2E] uppercase tracking-wider">
                            {MODULE_OPTIONS.find((m) => m.key === p)?.label ?? p}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">
                    {clientName(u.client_id) ?? <span className="text-[#9CA3AF]">—</span>}
                  </td>
                  <td className="px-6 py-4 text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider num">{formatDateBR(u.created_at)}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="inline-flex gap-2">
                      <UserFormDialog mode="edit" user={u} clients={clients} />
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

type UserRow = { id: string; email: string; is_admin: boolean; permissions: string[]; client_id: string | null };

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

  const m = useMutation({
    mutationFn: async () => {
      const client_id = clientId === "none" ? null : clientId;
      if (mode === "create") {
        const mail = email.trim();
        if (!mail || !/^\S+@\S+\.\S+$/.test(mail)) throw new Error("Informe um e-mail válido.");
        if (password.length < 6) throw new Error("A senha deve ter no mínimo 6 caracteres.");
        return createFn({ data: { email: mail, password, is_admin: isAdmin, permissions: isAdmin ? [] : perms, client_id } });
      }
      if (password && password.length < 6) throw new Error("A senha deve ter no mínimo 6 caracteres.");
      return updateFn({ data: { user_id: user!.id, is_admin: isAdmin, permissions: isAdmin ? [] : perms, password: password || undefined, client_id } });
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
          <Button className="bg-[#151B2E] text-white hover:bg-[#1F2A45] rounded-lg px-4 py-2 font-bold shadow-sm"><Plus className="mr-2 h-4 w-4" /> Novo usuário</Button>
        ) : (
          <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-[#9CA3AF] hover:text-[#374151]"><Pencil className="h-4 w-4" /></Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Novo usuário" : `Editar ${user?.email}`}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {mode === "create" && (
            <div>
              <Label>E-mail</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="usuario@exemplo.com" />
            </div>
          )}
          <div>
            <Label>{mode === "create" ? "Senha" : "Nova senha (opcional)"}</Label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" />
          </div>
          <label className="flex items-center gap-2 rounded-lg border p-3">
            <Checkbox checked={isAdmin} onCheckedChange={(v) => setIsAdmin(Boolean(v))} />
            <div>
              <div className="text-sm font-medium">Administrador</div>
              <div className="text-xs text-muted-foreground">Acesso total, incluindo gerenciamento de usuários.</div>
            </div>
          </label>
          {!isAdmin && (
            <div>
              <Label>Módulos liberados</Label>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {MODULE_OPTIONS.map((mod) => {
                  const checked = perms.includes(mod.key);
                  return (
                    <label key={mod.key} className="flex items-center gap-2 rounded-lg border p-2 text-sm">
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(v) => {
                          setPerms((prev) => v ? [...prev, mod.key] : prev.filter((p) => p !== mod.key));
                        }}
                      />
                      {mod.label}
                    </label>
                  );
                })}
              </div>
            </div>
          )}
          {!isAdmin && (
            <div>
              <Label>Cliente vinculado (Resultado)</Label>
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione um cliente" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum (vê todos)</SelectItem>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="mt-1 text-xs text-muted-foreground">Se selecionado, no módulo Resultado o usuário verá apenas as faturas deste cliente.</p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button
            onClick={() => m.mutate()}
            disabled={m.isPending || (mode === "create" && (!email.trim() || password.length < 6))}
            className="bg-[#151B2E] hover:bg-[#1F2A45] text-white font-medium"
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