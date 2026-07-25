import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Zap, FileText, Power, PowerOff, Settings } from "lucide-react";
import { CLIENT_COLORS, brl, initial } from "@/lib/format";
import { Suspense, useState } from "react";
import { toast } from "sonner";

type Client = {
  id: string; name: string; phone: string | null; email: string | null;
  color: string; uc_number: string; notes: string | null; active: boolean;
};
type InvoiceRow = { id: string; client_id: string; reference_date: string };

const faturasQ = queryOptions({
  queryKey: ["faturas-page"],
  queryFn: async () => {
    const [c, i] = await Promise.all([
      supabase.from("clients").select("*").order("created_at", { ascending: true }),
      supabase.from("invoices").select("id,client_id,reference_date"),
    ]);
    if (c.error) throw c.error;
    if (i.error) throw i.error;
    return { clients: (c.data ?? []) as Client[], invoices: (i.data ?? []) as InvoiceRow[] };
  },
});

export const Route = createFileRoute("/faturas")({
  loader: ({ context }) => context.queryClient.ensureQueryData(faturasQ),
  component: FaturasPage,
  head: () => ({
    meta: [
      { title: "Lançamento de Faturas — Usina JJ" },
      { name: "description", content: "Gestão de clientes e lançamento de faturas mensais." },
    ],
  }),
});

function FaturasPage() {
  return (
    <AppLayout>
      <Suspense fallback={<div>Carregando...</div>}>
        <Faturas />
      </Suspense>
    </AppLayout>
  );
}

function Faturas() {
  const { data } = useSuspenseQuery(faturasQ);
  const qc = useQueryClient();
  const [showInactive, setShowInactive] = useState(false);
  const [newClientOpen, setNewClientOpen] = useState(false);
  const [editClient, setEditClient] = useState<Client | null>(null);
  const [invoiceFor, setInvoiceFor] = useState<Client | null>(null);

  const active = data.clients.filter(c => c.active);
  const inactive = data.clients.filter(c => !c.active);
  const shown = showInactive ? inactive : active;

  const invCount = (id: string) => data.invoices.filter(i => i.client_id === id).length;

  async function toggleActive(c: Client) {
    const { error } = await supabase.from("clients").update({ active: !c.active }).eq("id", c.id);
    if (error) return toast.error(error.message);
    toast.success(c.active ? "Cliente desativado" : "Cliente reativado");
    qc.invalidateQueries();
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">Clientes</h1>
          <p className="text-sm text-muted-foreground">{active.length} ativos · {inactive.length} inativos</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowInactive(v => !v)}>
            {showInactive ? "Ver ativos" : "Ver inativos"}
          </Button>
          <Button onClick={() => setNewClientOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" /> Novo Cliente
          </Button>
        </div>
      </div>

      {shown.length === 0 && (
        <Card className="p-10 text-center text-muted-foreground">
          {showInactive ? "Nenhum cliente inativo." : "Nenhum cliente cadastrado. Clique em Novo Cliente."}
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {shown.map(c => (
          <Card key={c.id} className="p-5">
            <div className="mb-3 flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="flex h-11 w-11 items-center justify-center rounded-lg text-base font-semibold text-white"
                  style={{ backgroundColor: c.color }}
                >
                  {initial(c.name)}
                </div>
                <div>
                  <div className="font-semibold">{c.name}</div>
                </div>
              </div>
              <div className="flex gap-1">
                <button onClick={() => setEditClient(c)} className="p-1.5 text-muted-foreground hover:text-foreground">
                  <Settings className="h-4 w-4" />
                </button>
                <button onClick={() => toggleActive(c)} className="p-1.5 text-muted-foreground hover:text-foreground" title={c.active ? "Desativar" : "Ativar"}>
                  {c.active ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="mb-4 flex gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1"><Zap className="h-4 w-4 text-emerald-500" /> 1 UC</span>
              <span className="flex items-center gap-1"><FileText className="h-4 w-4" /> {invCount(c.id)} {invCount(c.id) === 1 ? "fatura" : "faturas"}</span>
            </div>
            <Button
              className="w-full gap-2 text-white"
              style={{ backgroundColor: c.color }}
              onClick={() => setInvoiceFor(c)}
              disabled={!c.active}
            >
              <Plus className="h-4 w-4" /> Lançar Fatura do Mês
            </Button>
          </Card>
        ))}
      </div>

      {(newClientOpen || editClient) && (
        <ClientDialog
          client={editClient}
          open
          onClose={() => { setNewClientOpen(false); setEditClient(null); }}
        />
      )}
      {invoiceFor && (
        <InvoiceDialog client={invoiceFor} onClose={() => setInvoiceFor(null)} />
      )}
    </div>
  );
}

function ClientDialog({ client, open, onClose }: { client: Client | null; open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const [f, setF] = useState({
    name: client?.name ?? "",
    phone: client?.phone ?? "",
    email: client?.email ?? "",
    color: client?.color ?? CLIENT_COLORS[0],
    uc_number: client?.uc_number ?? "",
    notes: client?.notes ?? "",
  });
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!f.name.trim() || !f.uc_number.trim()) {
      toast.error("Nome e Número da UC são obrigatórios");
      return;
    }
    setSaving(true);
    const payload = {
      name: f.name.trim(),
      phone: f.phone || null,
      email: f.email || null,
      color: f.color,
      uc_number: f.uc_number.trim(),
      notes: f.notes || null,
    };
    const res = client
      ? await supabase.from("clients").update(payload).eq("id", client.id)
      : await supabase.from("clients").insert(payload);
    setSaving(false);
    if (res.error) return toast.error(res.error.message);
    toast.success(client ? "Cliente atualizado" : "Cliente criado");
    qc.invalidateQueries();
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{client ? "Editar Cliente" : "Novo Cliente"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Nome *</Label>
            <Input value={f.name} onChange={e => setF({ ...f, name: e.target.value })} placeholder="Ex: Pantera's Bar" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Telefone</Label>
              <Input value={f.phone} onChange={e => setF({ ...f, phone: e.target.value })} placeholder="(00) 00000-0000" />
            </div>
            <div>
              <Label>E-mail</Label>
              <Input value={f.email} onChange={e => setF({ ...f, email: e.target.value })} placeholder="email@exemplo.com" />
            </div>
          </div>
          <div>
            <Label>Cor do Cliente</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {CLIENT_COLORS.map(col => (
                <button
                  key={col}
                  type="button"
                  onClick={() => setF({ ...f, color: col })}
                  className={`h-8 w-8 rounded-full ring-offset-2 ${f.color === col ? "ring-2 ring-foreground" : ""}`}
                  style={{ backgroundColor: col }}
                />
              ))}
            </div>
          </div>
          <div>
            <Label>Número da UC *</Label>
            <Input value={f.uc_number} onChange={e => setF({ ...f, uc_number: e.target.value })} placeholder="Ex: 303007001223" />
          </div>
          <div>
            <Label>Observações</Label>
            <Textarea value={f.notes} onChange={e => setF({ ...f, notes: e.target.value })} placeholder="Opcional" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={submit} disabled={saving}>{client ? "Salvar" : "Criar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function InvoiceDialog({ client, onClose }: { client: Client; onClose: () => void }) {
  const qc = useQueryClient();
  const today = new Date().toISOString().slice(0, 10);
  const [f, setF] = useState({
    reference_date: today,
    consumption_kw: "",
    price_kw: "",
    public_lighting: "0",
    interest_fine: "0",
    value_without_plant: "0",
    client_pays: "",
    distributor_invoice: "0",
  });
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!f.consumption_kw || !f.price_kw || !f.client_pays) {
      toast.error("Preencha os campos obrigatórios");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("invoices").insert({
      client_id: client.id,
      uc_number: client.uc_number,
      reference_date: f.reference_date,
      consumption_kw: Number(f.consumption_kw),
      price_kw: Number(f.price_kw),
      public_lighting: Number(f.public_lighting || 0),
      interest_fine: Number(f.interest_fine || 0),
      value_without_plant: Number(f.value_without_plant || 0),
      client_pays: Number(f.client_pays),
      distributor_invoice: Number(f.distributor_invoice || 0),
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Fatura lançada");
    qc.invalidateQueries();
    onClose();
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Lançar Fatura — {client.name}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Unidade Consumidora *</Label>
            <Input value={client.uc_number} disabled />
          </div>
          <div>
            <Label>Data de Referência *</Label>
            <Input type="date" value={f.reference_date} onChange={e => setF({ ...f, reference_date: e.target.value })} />
          </div>
          <div>
            <Label>Consumo (kW) *</Label>
            <Input type="number" step="0.01" value={f.consumption_kw} onChange={e => setF({ ...f, consumption_kw: e.target.value })} placeholder="Ex: 1390" />
          </div>
          <div>
            <Label>Preço kW (R$) *</Label>
            <Input type="number" step="0.0001" value={f.price_kw} onChange={e => setF({ ...f, price_kw: e.target.value })} placeholder="Ex: 1.1205" />
          </div>
          <div>
            <Label>Ilum. Pública (R$)</Label>
            <Input type="number" step="0.01" value={f.public_lighting} onChange={e => setF({ ...f, public_lighting: e.target.value })} />
          </div>
          <div>
            <Label>Juros/Multa (R$)</Label>
            <Input type="number" step="0.01" value={f.interest_fine} onChange={e => setF({ ...f, interest_fine: e.target.value })} />
          </div>
          <div>
            <Label>Valor S/ Usina (R$) *</Label>
            <Input type="number" step="0.01" value={f.value_without_plant} onChange={e => setF({ ...f, value_without_plant: e.target.value })} />
          </div>
          <div>
            <Label>Valor que o Cliente Paga (R$) *</Label>
            <Input type="number" step="0.01" value={f.client_pays} onChange={e => setF({ ...f, client_pays: e.target.value })} placeholder="Ex: 1158.97" />
          </div>
        </div>
        <Card className="mt-2 border-blue-200 bg-blue-50/50 p-4">
          <div className="mb-1 text-sm font-medium text-blue-700">Fatura do Cliente — distribuidora (R$)</div>
          <div className="mb-2 text-xs text-blue-600">Valor que você paga à distribuidora</div>
          <Input type="number" step="0.01" value={f.distributor_invoice} onChange={e => setF({ ...f, distributor_invoice: e.target.value })} className="bg-white" />
        </Card>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={submit} disabled={saving} style={{ backgroundColor: client.color }}>Lançar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}