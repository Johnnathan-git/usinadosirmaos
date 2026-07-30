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
  listManagedUsers, createManagedUser, updateManagedUser, deleteManagedUser,
} from "@/lib/acessos.functions";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { toast } from "sonner";
import { formatDateBR } from "@/lib/format";

export const Route = createFileRoute("/acessos")({
  component: AcessosPage,
  head: () => ({
    meta: [
      { title: "Acessos — Usina JJ" },
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
  const q = useQuery({ queryKey: ["managed-users"], queryFn: () => listFn() });
  const clientsQ = useQuery({
    queryKey: ["clients-simple"],
    queryFn: async () => {
      const { data, error } = await supabase.from("clients").select("id,name").order("name");
      if (error) throw error;
      return data as { id: string; name: string }[];
    },
  });
  const clients = clientsQ.data ?? [];
  const clientName = (id: string | null) => id ? (clients.find(c => c.id === id)?.name ?? "—") : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Acessos</h1>
          <p className="text-sm text-muted-foreground">Cadastre usuários e defina o que cada um pode acessar.</p>
        </div>
        <UserFormDialog mode="create" clients={clients} />
      </div>

      {q.data?.bootstrap && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Nenhum administrador cadastrado ainda — todos os usuários autenticados têm acesso total até o primeiro admin ser marcado. Crie um usuário administrador para restringir o acesso.
        </div>
      )}

      <Card className="p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3">E-mail</th>
              <th className="px-4 py-3">Papel</th>
              <th className="px-4 py-3">Permissões</th>
              <th className="px-4 py-3">Cliente</th>
              <th className="px-4 py-3">Criado em</th>
              <th className="px-4 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {(q.data?.users ?? []).map((u) => (
              <tr key={u.id} className="border-t">
                <td className="px-4 py-3 font-medium">{u.email}</td>
                <td className="px-4 py-3">
                  {u.is_admin ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                      <ShieldCheck className="h-3 w-3" /> Administrador
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">Usuário</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {u.is_admin ? (
                    <span className="text-xs text-muted-foreground">Todos os módulos</span>
                  ) : u.permissions.length === 0 ? (
                    <span className="text-xs text-muted-foreground">Nenhuma</span>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {u.permissions.map((p) => (
                        <span key={p} className="rounded bg-muted px-1.5 py-0.5 text-xs">
                          {MODULE_OPTIONS.find((m) => m.key === p)?.label ?? p}
                        </span>
                      ))}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 text-xs">
                  {clientName(u.client_id) ?? <span className="text-muted-foreground">—</span>}
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{formatDateBR(u.created_at)}</td>
                <td className="px-4 py-3 text-right">
                  <div className="inline-flex gap-1">
                    <UserFormDialog mode="edit" user={u} clients={clients} />
                    <DeleteUserButton userId={u.id} email={u.email} />
                  </div>
                </td>
              </tr>
            ))}
            {q.data && q.data.users.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-muted-foreground">Nenhum usuário cadastrado.</td></tr>
            )}
          </tbody>
        </table>
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
          <Button><Plus className="mr-2 h-4 w-4" /> Novo usuário</Button>
        ) : (
          <Button size="sm" variant="ghost"><Pencil className="h-4 w-4" /></Button>
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
          <Button onClick={() => m.mutate()} disabled={m.isPending}>
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
      <Trash2 className="h-4 w-4 text-rose-600" />
    </Button>
  );
}