import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, useQuery, queryOptions, useQueryClient } from "@tanstack/react-query";
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
import { Plus, Zap, FileText, Power, PowerOff, Settings, TrendingUp, Pencil, Trash2, Eye, ShieldAlert } from "lucide-react";
import { CLIENT_COLORS, brl, initial, monthLabel } from "@/lib/format";
import { Suspense, useState } from "react";
import { toast } from "sonner";

type Client = {
  id: string; name: string; phone: string | null; email: string | null;
  color: string; uc_number: string; notes: string | null; active: boolean;
};
type InvoiceRow = { id: string; client_id: string; reference_date: string };

type Invoice = {
  id: string;
  client_id: string;
  reference_date: string;
  consumption_kw: number;
  price_kw: number;
  public_lighting: number;
  interest_fine: number;
  value_without_plant: number;
  client_pays: number;
  distributor_invoice: number;
};

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
  ssr: false,
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
  const [historyFor, setHistoryFor] = useState<Client | null>(null);

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

  async function deleteClientForever(c: Client) {
    const typed = window.prompt(
      `EXCLUSÃO DEFINITIVA de "${c.name}".\n\nIsso apaga o cliente e TODOS os dados lançados (faturas, rateio e vínculos de acesso). Essa ação não pode ser desfeita.\n\nDigite EXCLUIR para confirmar:`,
    );
    if (typed?.trim().toUpperCase() !== "EXCLUIR") return;
    const inv = await supabase.from("invoices").delete().eq("client_id", c.id);
    if (inv.error) return toast.error(inv.error.message);
    const alloc = await supabase.from("client_allocations").delete().eq("client_id", c.id);
    if (alloc.error) return toast.error(alloc.error.message);
    await supabase.from("user_clients").delete().eq("client_id", c.id);
    const cli = await supabase.from("clients").delete().eq("id", c.id);
    if (cli.error) return toast.error(cli.error.message);
    toast.success(`Cliente ${c.name} excluído definitivamente`);
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
            <div className="mb-3 flex w-full items-start justify-between text-left">
              <div className="flex items-center gap-3">
                <div
                  className="flex h-11 w-11 items-center justify-center rounded-lg text-base font-semibold text-white"
                  style={{ backgroundColor: c.color }}
                >
                  {initial(c.name)}
                </div>
                <div>
                  <div className="font-semibold">{c.name}</div>
                  <div className="text-xs text-muted-foreground">UC {c.uc_number}</div>
                </div>
              </div>
              <div className="flex gap-1">
                <button onClick={() => setEditClient(c)} className="p-1.5 text-muted-foreground hover:text-foreground" aria-label={`Editar ${c.name}`}>
                  <Settings className="h-4 w-4" />
                </button>
                <button onClick={() => toggleActive(c)} className="p-1.5 text-muted-foreground hover:text-foreground" title={c.active ? "Desativar" : "Ativar"} aria-label={c.active ? `Desativar ${c.name}` : `Ativar ${c.name}`}>
                  {c.active ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="mb-4 flex gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1"><Zap className="h-4 w-4 text-emerald-500" /> 1 UC</span>
              <span className="flex items-center gap-1"><FileText className="h-4 w-4" /> {invCount(c.id)} {invCount(c.id) === 1 ? "fatura" : "faturas"}</span>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => setHistoryFor(c)}
              >
                <Eye className="h-4 w-4" /> Abrir Faturas
              </Button>
              <Button
                className="gap-2 text-white"
                style={{ backgroundColor: c.color }}
                onClick={() => setInvoiceFor(c)}
                disabled={!c.active}
              >
                <Plus className="h-4 w-4" /> Lançar
              </Button>
            </div>
            {!c.active && (
              <Button
                variant="outline"
                className="mt-2 w-full gap-2 border-rose-200 text-rose-600 hover:bg-rose-50"
                onClick={() => deleteClientForever(c)}
              >
                <ShieldAlert className="h-4 w-4" /> Excluir definitivo
              </Button>
            )}
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
      {historyFor && (
        <HistoryDialog
          client={historyFor}
          onClose={() => setHistoryFor(null)}
        />
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

function InvoiceDialog({ client, invoice, onClose }: { client: Client; invoice?: Invoice; onClose: () => void }) {
  const qc = useQueryClient();
  const today = new Date().toISOString().slice(0, 10);
  const [f, setF] = useState({
    reference_date: invoice?.reference_date?.slice(0, 10) ?? today,
    consumption_kw: invoice ? String(invoice.consumption_kw) : "",
    price_kw: invoice ? String(invoice.price_kw) : "",
    public_lighting: invoice ? String(invoice.public_lighting) : "0",
    interest_fine: invoice ? String(invoice.interest_fine) : "0",
    value_without_plant: invoice ? String(invoice.value_without_plant) : "0",
    client_pays: invoice ? String(invoice.client_pays) : "",
    distributor_invoice: invoice ? String(invoice.distributor_invoice) : "0",
  });
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!f.consumption_kw || !f.price_kw || !f.client_pays) {
      toast.error("Preencha os campos obrigatórios");
      return;
    }
    setSaving(true);
    const payload = {
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
    };
    const { error } = invoice
      ? await supabase.from("invoices").update(payload).eq("id", invoice.id)
      : await supabase.from("invoices").insert(payload);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(invoice ? "Fatura atualizada" : "Fatura lançada");
    qc.invalidateQueries();
    onClose();
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{invoice ? "Editar Fatura" : "Lançar Fatura"} — {client.name}</DialogTitle>
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
          <Button onClick={submit} disabled={saving} style={{ backgroundColor: client.color }}>{invoice ? "Salvar" : "Lançar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function HistoryDialog({ client, onClose }: { client: Client; onClose: () => void }) {
  const qc = useQueryClient();
  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ["invoice-history", client.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select("*")
        .eq("client_id", client.id)
        .order("reference_date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Invoice[];
    },
  });
  const [launching, setLaunching] = useState(false);
  const [editing, setEditing] = useState<Invoice | null>(null);

  async function del(inv: Invoice) {
    if (!confirm("Excluir esta fatura?")) return;
    const { error } = await supabase.from("invoices").delete().eq("id", inv.id);
    if (error) return toast.error(error.message);
    toast.success("Fatura excluída");
    qc.invalidateQueries();
  }

  const totalWithoutPlant = invoices.reduce((sum, inv) => sum + Number(inv.value_without_plant), 0);
  const totalClientPays = invoices.reduce((sum, inv) => sum + Number(inv.client_pays), 0);
  const totalDistributor = invoices.reduce((sum, inv) => sum + Number(inv.distributor_invoice), 0);
  const netProfit = totalClientPays - totalDistributor;

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full" style={{ backgroundColor: client.color }} />
            {client.name} — UC {client.uc_number}
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-3 md:grid-cols-4">
          <Card className="p-4">
            <div className="text-xs font-medium text-muted-foreground">Total S/ Usina</div>
            <div className="mt-1 text-xl font-bold text-foreground">{brl(totalWithoutPlant)}</div>
          </Card>
          <Card className="p-4">
            <div className="text-xs font-medium text-muted-foreground">Cliente Pagou</div>
            <div className="mt-1 text-xl font-bold text-rose-600">{brl(totalClientPays)}</div>
          </Card>
          <Card className="p-4">
            <div className="text-xs font-medium text-muted-foreground">Fat. Distribuidora</div>
            <div className="mt-1 text-xl font-bold text-rose-500">{brl(totalDistributor)}</div>
          </Card>
          <Card className="p-4">
            <div className="text-xs font-medium text-muted-foreground">Lucro Líquido</div>
            <div className="mt-1 text-xl font-bold text-blue-600">{brl(netProfit)}</div>
          </Card>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700">
            <TrendingUp className="h-4 w-4" /> Histórico de Faturas
          </div>
          <Button
            className="gap-2 text-white"
            style={{ backgroundColor: client.color }}
            onClick={() => setLaunching(true)}
            disabled={!client.active}
          >
            <Plus className="h-4 w-4" /> Lançar Fatura
          </Button>
        </div>

        <div className="max-h-[60vh] overflow-auto">
          {isLoading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Carregando...</p>
          ) : invoices.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Nenhuma fatura lançada.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-background">
                <tr className="text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="py-2 text-left font-medium">Mês</th>
                  <th className="py-2 text-right font-medium">Consumo (kW)</th>
                  <th className="py-2 text-right font-medium">S/ Usina</th>
                  <th className="py-2 text-right font-medium">Cliente Pagou</th>
                  <th className="py-2 text-right font-medium">Fat. Distribuidora</th>
                  <th className="py-2 text-right font-medium">Lucro</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => {
                  const lucro = Number(inv.client_pays) - Number(inv.distributor_invoice);
                  return (
                    <tr key={inv.id} className="border-t">
                      <td className="py-3">{monthLabel(new Date(inv.reference_date))}</td>
                      <td className="py-3 text-right text-blue-600">{Number(inv.consumption_kw).toLocaleString("pt-BR")}</td>
                      <td className="py-3 text-right">{brl(Number(inv.value_without_plant))}</td>
                      <td className="py-3 text-right text-rose-600">{brl(Number(inv.client_pays))}</td>
                      <td className="py-3 text-right text-rose-500">{brl(Number(inv.distributor_invoice))}</td>
                      <td className="py-3 text-right font-semibold text-blue-600">{brl(lucro)}</td>
                      <td className="py-3 pl-2 text-right">
                        <div className="flex justify-end gap-1">
                          <button onClick={() => setEditing(inv)} className="p-1 text-muted-foreground hover:text-foreground" aria-label={`Editar fatura de ${monthLabel(new Date(inv.reference_date))}`}>
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button onClick={() => del(inv)} className="p-1 text-muted-foreground hover:text-rose-600" aria-label={`Excluir fatura de ${monthLabel(new Date(inv.reference_date))}`}>
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {launching && <InvoiceDialog client={client} onClose={() => setLaunching(false)} />}
        {editing && <InvoiceDialog client={client} invoice={editing} onClose={() => setEditing(null)} />}
      </DialogContent>
    </Dialog>
  );
}