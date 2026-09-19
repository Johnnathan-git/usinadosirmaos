import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, Zap, FileText, Power, PowerOff, Settings, TrendingUp, Pencil, Trash2, Eye, ShieldAlert, Paperclip, Loader2 } from "lucide-react";
import { CLIENT_COLORS, brl, initial, monthLabelFromISO, getClientButtonStyles } from "@/lib/format";
import { useState, useEffect } from "react";
import { toast } from "sonner";

type Client = {
  id: string; name: string; phone: string | null; email: string | null;
  color: string; uc_number: string; notes: string | null; active: boolean;
  discount_pct: number;
  public_lighting_value: number;
};
type InvoiceRow = { id: string; client_id: string; reference_date: string; attachment_url: string | null; notes: string | null };

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
  notes: string | null;
  attachment_url: string | null;
};

function invoicePaymentStatus(notes: string | null | undefined): "pago" | "pendente" {
  if (notes?.includes("[[status:pendente]]")) return "pendente";
  return "pago";
}
function stripPaymentTag(notes: string | null | undefined): string {
  return (notes || "").replace(/\[\[status:(pago|pendente)\]\]/g, "").trim();
}
function withPaymentTag(notes: string | null | undefined, status: "pago" | "pendente"): string | null {
  const cleaned = stripPaymentTag(notes);
  if (status === "pendente") return cleaned ? `${cleaned} [[status:pendente]]` : "[[status:pendente]]";
  return cleaned || null;
}

async function fetchFaturasPage() {
  const [c, i] = await Promise.all([
    supabase.from("clients").select("*").order("created_at", { ascending: true }),
    supabase.from("invoices").select("id,client_id,reference_date,attachment_url,notes"),
  ]);
  if (c.error) throw new Error(c.error.message || "Erro ao carregar clientes");
  if (i.error) throw new Error(i.error.message || "Erro ao carregar faturas");
  return {
    clients: (c.data ?? []) as Client[],
    invoices: (i.data ?? []) as InvoiceRow[],
  };
}

export const Route = createFileRoute("/_app/faturas")({
  ssr: false,
  component: FaturasPage,
  head: () => ({
    meta: [
      { title: "Faturas e Clientes — Usina dos Irmãos" },
      { name: "description", content: "Gestão de clientes e lançamento de faturas mensais." },
    ],
  }),
});

function FaturasPage() {
  const qc = useQueryClient();
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["faturas-page"],
    queryFn: fetchFaturasPage,
    retry: 1,
    staleTime: 30_000,
  });

  const [showInactive, setShowInactive] = useState(false);
  const [newClientOpen, setNewClientOpen] = useState(false);
  const [editClient, setEditClient] = useState<Client | null>(null);
  const [invoiceFor, setInvoiceFor] = useState<Client | null>(null);
  const [historyFor, setHistoryFor] = useState<Client | null>(null);

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm">Carregando faturas e clientes...</p>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <Card className="mx-auto max-w-lg space-y-4 border-border p-8 text-center">
        <h2 className="text-lg font-bold text-foreground">Não foi possível carregar</h2>
        <p className="text-sm text-muted-foreground">
          {(error as Error)?.message || "Erro desconhecido ao buscar dados."}
        </p>
        <Button onClick={() => refetch()} disabled={isFetching} className="gap-2">
          {isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Tentar de novo
        </Button>
      </Card>
    );
  }

  const active = data.clients.filter((c) => c.active);
  const inactive = data.clients.filter((c) => !c.active);
  const shown = showInactive ? inactive : active;
  const invCount = (id: string) => data.invoices.filter((i) => i.client_id === id).length;

  async function toggleActive(c: Client) {
    const { error: err } = await supabase.from("clients").update({ active: !c.active }).eq("id", c.id);
    if (err) return toast.error(err.message);
    toast.success(c.active ? "Cliente desativado" : "Cliente reativado");
    qc.invalidateQueries({ queryKey: ["faturas-page"] });
    qc.invalidateQueries({ queryKey: ["relatorio-page"] });
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
    qc.invalidateQueries({ queryKey: ["faturas-page"] });
    qc.invalidateQueries({ queryKey: ["relatorio-page"] });
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="grid gap-3 sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="truncate text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Faturas</h1>
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground light:text-emerald-600">
            {active.length} ativos · {inactive.length} inativos
          </p>
        </div>
        <div className="flex flex-wrap gap-2 [&>*]:flex-1 sm:[&>*]:flex-none">
          <Button variant="outline" onClick={() => setShowInactive((v) => !v)} className="glass-card border-border bg-accent text-muted-foreground hover:text-foreground rounded-lg">
            {showInactive ? "Ver ativos" : "Ver inativos"}
          </Button>
          <Button onClick={() => setNewClientOpen(true)} className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg px-4 py-2 font-bold shadow-lg shadow-primary/20 transition-all active:scale-95">
            <Plus className="h-4 w-4" /> Novo Cliente
          </Button>
        </div>
      </div>

      {shown.length === 0 && (
        <Card className="glass-card border-border p-10 text-center text-muted-foreground">
          {showInactive ? "Nenhum cliente inativo." : "Nenhum cliente cadastrado. Clique em Novo Cliente."}
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 xs:grid-cols-2 lg:grid-cols-3 [&>*]:glass-card-interactive">
        {shown.map((c) => (
          <Card key={c.id} className="glass-card relative overflow-hidden p-5" style={{ borderLeft: `4px solid ${c.color}` }}>
            <div className="mb-3 flex w-full items-start justify-between text-left">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white shadow-sm" style={{ backgroundColor: c.color }}>
                  {initial(c.name)}
                </div>
                <div className="min-w-0">
                  <div className="truncate font-bold text-sm text-foreground">{c.name}</div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">UC {c.uc_number}</div>
                </div>
              </div>
              <div className="flex gap-1">
                <button onClick={() => setEditClient(c)} className="p-1.5 text-muted-foreground hover:text-foreground transition-colors" aria-label={`Editar ${c.name}`}>
                  <Settings className="h-4 w-4" />
                </button>
                <button onClick={() => toggleActive(c)} className="p-1.5 text-slate-400 hover:text-slate-700 transition-colors" title={c.active ? "Desativar" : "Ativar"}>
                  {c.active ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="mb-4 flex flex-wrap gap-x-3 gap-y-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              <span className="flex items-center gap-1"><Zap className="h-3 w-3" /> 1 UC</span>
              <span className="flex items-center gap-1"><FileText className="h-3 w-3" />{invCount(c.id)} {invCount(c.id) === 1 ? "fatura" : "faturas"}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button size="sm" className="w-full gap-2 transition-all hover:opacity-90 text-white font-bold rounded-lg px-3 py-1.5 border-0 text-[11px] uppercase tracking-wider" style={getClientButtonStyles(c.color)} onClick={() => setInvoiceFor(c)} disabled={!c.active}>
                <Plus className="h-3 w-3 text-white" /><span>Lançar</span>
              </Button>
              <Button variant="outline" size="sm" className="w-full gap-2 border border-border bg-accent text-muted-foreground hover:bg-accent/80 rounded-lg px-3 py-1.5 font-bold text-[11px] uppercase tracking-wider transition-all" onClick={() => setHistoryFor(c)}>
                <Eye className="h-3 w-3 text-muted-foreground" /> Histórico
              </Button>
            </div>
            {!c.active && (
              <Button variant="outline" className="mt-2 w-full gap-2 border border-red-500/20 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-lg px-4 py-2 transition-all" onClick={() => deleteClientForever(c)}>
                <ShieldAlert className="h-4 w-4" /> Excluir definitivo
              </Button>
            )}
          </Card>
        ))}
      </div>

      {(newClientOpen || editClient) && (
        <ClientDialog client={editClient} open onClose={() => { setNewClientOpen(false); setEditClient(null); }} />
      )}
      {invoiceFor && <InvoiceDialog client={invoiceFor} onClose={() => setInvoiceFor(null)} />}
      {historyFor && <HistoryDialog client={historyFor} onClose={() => setHistoryFor(null)} />}
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
    discount_pct: client?.discount_pct ?? 30,
    public_lighting_value: client?.public_lighting_value ?? 0,
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
      discount_pct: Number(f.discount_pct),
      public_lighting_value: Number(f.public_lighting_value),
    };
    const res = client
      ? await supabase.from("clients").update(payload).eq("id", client.id)
      : await supabase.from("clients").insert(payload);
    setSaving(false);
    if (res.error) return toast.error(res.error.message);
    toast.success(client ? "Cliente atualizado" : "Cliente criado");
    qc.invalidateQueries({ queryKey: ["faturas-page"] });
    qc.invalidateQueries({ queryKey: ["relatorio-page"] });
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="glass-card border-border text-foreground max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-foreground">{client ? "Editar Cliente" : "Novo Cliente"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="text-muted-foreground">Nome Completo *</Label>
            <Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Ex: Pantera's Bar" className="bg-input border-border text-foreground" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-muted-foreground">Telefone</Label>
              <Input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} className="bg-input border-border text-foreground" />
            </div>
            <div>
              <Label className="text-muted-foreground">E-mail</Label>
              <Input value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} className="bg-input border-border text-foreground" />
            </div>
          </div>
          <div>
            <Label className="text-muted-foreground">Cor do Cliente</Label>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {CLIENT_COLORS.map((col) => (
                <button key={col} type="button" onClick={() => setF({ ...f, color: col })} className={`h-8 w-8 rounded-full ring-offset-2 transition-all ${f.color === col ? "ring-2 ring-foreground scale-110" : "hover:scale-105"}`} style={{ backgroundColor: col }} />
              ))}
            </div>
          </div>
          <div>
            <Label className="text-muted-foreground">Número da UC *</Label>
            <Input value={f.uc_number} onChange={(e) => setF({ ...f, uc_number: e.target.value })} className="bg-input border-border text-foreground" />
          </div>
          <div>
            <Label className="text-muted-foreground">Observações</Label>
            <Textarea value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} className="bg-input border-border text-foreground" />
          </div>
          <div>
            <Label className="text-muted-foreground">Desconto (%) *</Label>
            <Input type="number" value={f.discount_pct} onChange={(e) => setF({ ...f, discount_pct: Number(e.target.value) })} className="bg-input border-border text-foreground" />
          </div>
          <div>
            <Label className="text-muted-foreground">Iluminação Pública (Valor Fixo) *</Label>
            <Input type="number" step="0.01" value={f.public_lighting_value} onChange={(e) => setF({ ...f, public_lighting_value: Number(e.target.value) })} className="bg-input border-border text-foreground" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={submit} disabled={saving} className="bg-primary text-primary-foreground">{saving ? "Salvando..." : client ? "Salvar" : "Criar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
