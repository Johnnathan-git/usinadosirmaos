/**
 * Execute esta instrucao no projeto: Ajusta todo o sistema para uma visualização intuitiva pelo celular
 */
import { cn } from "@/lib/utils";
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
import { Plus, Zap, FileText, Power, PowerOff, Settings, TrendingUp, Pencil, Trash2, Eye, ShieldAlert, Paperclip } from "lucide-react";
import { CLIENT_COLORS, brl, initial, monthLabelFromISO, softBg, getClientSoftColor, getClientButtonStyles } from "@/lib/format";
import { Suspense, useState, useEffect } from "react";
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

const faturasQ = queryOptions({
  queryKey: ["faturas-page"],
  queryFn: async () => {
    const [c, i] = await Promise.all([
      supabase.from("clients").select("*").order("created_at", { ascending: true }),
      supabase.from("invoices").select("id,client_id,reference_date,attachment_url,notes"),
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
      { title: "Faturas e Clientes — Usina dos Irmãos" },
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
      <div className="grid gap-3 sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="truncate text-3xl font-bold tracking-tight text-[#374151]">Faturas</h1>
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#4B5563]">{active.length} ativos · {inactive.length} inativos</p>
        </div>
        <div className="flex flex-wrap gap-2 [&>*]:flex-1 sm:[&>*]:flex-none">
          <Button variant="outline" onClick={() => setShowInactive(v => !v)} className="border border-[#E4E7EC] bg-white text-[#4B5563] hover:bg-slate-50 rounded-lg">
            {showInactive ? "Ver ativos" : "Ver inativos"}
          </Button>
          <Button onClick={() => setNewClientOpen(true)} className="gap-2 bg-[#151B2E]/5 border border-[#151B2E]/10 text-[#151B2E] hover:bg-[#151B2E]/10 rounded-lg px-4 py-2 font-bold shadow-none transition-colors">
            <Plus className="h-4 w-4" /> Novo Cliente
          </Button>
        </div>
      </div>

      {shown.length === 0 && (
        <Card className="bg-white border border-slate-200 rounded-xl p-10 text-center text-slate-500 shadow-none">
          {showInactive ? "Nenhum cliente inativo." : "Nenhum cliente cadastrado. Clique em Novo Cliente."}
        </Card>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map(c => (
          <Card key={c.id} className="relative overflow-hidden rounded-xl border border-[#E4E7EC] bg-white p-4 shadow-none transition-all hover:shadow-md" style={{ borderLeft: `3px solid ${c.color}` }}>
            <div className="mb-3 flex w-full items-start justify-between text-left">
              <div className="flex items-center gap-2.5">
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white shadow-sm"
                  style={{ backgroundColor: c.color }}
                >
                  {initial(c.name)}
                </div>
                <div className="min-w-0">
                  <div className="truncate font-bold text-sm text-[#374151]">{c.name}</div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-[#4B5563]">UC {c.uc_number}</div>
                </div>
              </div>
              <div className="flex gap-1">
                <button onClick={() => setEditClient(c)} className="p-1.5 text-slate-400 hover:text-slate-700 transition-colors" aria-label={`Editar ${c.name}`}>
                  <Settings className="h-4 w-4" />
                </button>
                <button onClick={() => toggleActive(c)} className="p-1.5 text-slate-400 hover:text-slate-700 transition-colors" title={c.active ? "Desativar" : "Ativar"} aria-label={c.active ? `Desativar ${c.name}` : `Ativar ${c.name}`}>
                  {c.active ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="mb-4 flex flex-wrap gap-x-3 gap-y-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              <span className="flex items-center gap-1"><Zap className="h-3 w-3" /> 1 UC</span>
              <span className="flex items-center gap-1">
                <FileText className="h-3 w-3" /> 
                {invCount(c.id)} {invCount(c.id) === 1 ? "fatura" : "faturas"}
              </span>
              {data.invoices.some(i => i.client_id === c.id && i.attachment_url) && (
                <span className="flex items-center gap-1 text-[#4B5563]">
                  <Paperclip className="h-3 w-3" /> Anexos
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button
                size="sm"
                className="w-full gap-2 transition-all hover:opacity-90 text-white font-bold rounded-lg px-3 py-1.5 border-0 text-[11px] uppercase tracking-wider"
                style={getClientButtonStyles(c.color)}
                onClick={() => setInvoiceFor(c)}
                disabled={!c.active}
              >
                <Plus className="h-3 w-3 text-white" /> 
                <span>Lançar</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="w-full gap-2 border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 rounded-lg px-3 py-1.5 font-bold text-[11px] uppercase tracking-wider"
                onClick={() => setHistoryFor(c)}
              >
                <Eye className="h-3 w-3 text-slate-400" /> Histórico
              </Button>
            </div>
            {!c.active && (
              <Button
                variant="outline"
                className="mt-2 w-full gap-2 border border-slate-200 bg-white text-[#D64545] hover:bg-slate-50 rounded-lg px-4 py-2"
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
    qc.invalidateQueries();
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{client ? "Editar Cliente" : "Novo Cliente"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Nome Completo *</Label>
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
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {CLIENT_COLORS.map(col => (
                <button
                  key={col}
                  type="button"
                  onClick={() => setF({ ...f, color: col })}
                  className={`h-8 w-8 rounded-full ring-offset-2 transition-all ${f.color === col ? "ring-2 ring-foreground scale-110" : "hover:scale-105"}`}
                  style={{ backgroundColor: col }}
                />
              ))}
              <div className="relative ml-2 flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50/50 py-1 pl-1 pr-3 transition-all hover:bg-slate-50">
                <Input
                  type="color"
                  value={f.color}
                  onChange={e => setF({ ...f, color: e.target.value })}
                  className="h-8 w-8 cursor-pointer rounded-full border-0 p-0 overflow-hidden ring-offset-2 focus:ring-2 focus:ring-foreground transition-all hover:scale-105"
                  title="Escolher cor personalizada"
                />
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-tighter">Cor Personalizada</span>
              </div>
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
          <div>
            <Label>Desconto (%) *</Label>
            <Input type="number" value={f.discount_pct} onChange={e => setF({ ...f, discount_pct: Number(e.target.value) })} placeholder="Ex: 30" />
          </div>
          <div>
            <Label>Iluminação Pública (Valor Fixo) *</Label>
            <Input type="number" step="0.01" value={f.public_lighting_value} onChange={e => setF({ ...f, public_lighting_value: Number(e.target.value) })} placeholder="Ex: 26.36" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={submit} disabled={saving} className="bg-[#151B2E] hover:bg-[#1F2A45] text-white font-medium">{client ? "Salvar" : "Criar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function InvoiceDialog({ client, invoice, onClose }: { client: Client; invoice?: Invoice; onClose: () => void }) {
  const qc = useQueryClient();
  const currentMonth = new Date().toISOString().slice(0, 7);
  const [f, setF] = useState({
    reference_month: invoice?.reference_date?.slice(0, 7) ?? currentMonth,
    consumption_kw: invoice ? String(invoice.consumption_kw) : "",
    price_kw: invoice ? String(invoice.price_kw) : "",
    public_lighting: String(client.public_lighting_value || 0),
    interest_fine: invoice ? String(invoice.interest_fine) : "0",
    value_without_plant: invoice ? String(invoice.value_without_plant) : "0",
    client_pays: invoice ? String(invoice.client_pays) : "",
    distributor_invoice: invoice ? String(invoice.distributor_invoice) : "0",
    notes: invoice?.notes ?? "",
    attachment_url: invoice?.attachment_url ?? "",
  });

  // Watch for invoice changes to keep state in sync when editing from history
  useEffect(() => {
    if (invoice) {
      setF({
        reference_month: invoice.reference_date.slice(0, 7),
        consumption_kw: String(invoice.consumption_kw),
        price_kw: String(invoice.price_kw),
        public_lighting: String(client.public_lighting_value || 0),
        interest_fine: String(invoice.interest_fine),
        value_without_plant: String(invoice.value_without_plant),
        client_pays: String(invoice.client_pays),
        distributor_invoice: String(invoice.distributor_invoice),
        notes: invoice.notes ?? "",
        attachment_url: invoice.attachment_url ?? "",
      });
    }
  }, [invoice, client.public_lighting_value]);

  const calculateValues = (consumption: string, price: string, lighting: string, fine: string) => {
    const c = Number(consumption) || 0;
    const p = Number(price) || 0;
    const l = Number(lighting) || 0;
    const j = Number(fine) || 0;
    
    const sUsina = (c * p) + l + j;
    const discount = (client.discount_pct || 30) / 100;
    const cPaga = sUsina * (1 - discount);
    
    return {
      value_without_plant: sUsina.toFixed(2),
      client_pays: cPaga.toFixed(2)
    };
  };

  const handleCalcChange = (field: string, val: string) => {
    setF(prev => {
      const next = { ...prev, [field]: val };
      const { value_without_plant, client_pays } = calculateValues(
        next.consumption_kw, 
        next.price_kw, 
        next.public_lighting, 
        next.interest_fine
      );
      return { ...next, value_without_plant, client_pays };
    });
  };
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!f.reference_month) {
      toast.error("Selecione o mês de referência");
      return;
    }
    if (!f.consumption_kw || !f.price_kw || !f.client_pays) {
      toast.error("Preencha os campos obrigatórios");
      return;
    }
    setSaving(true);
    const payload = {
      client_id: client.id,
      uc_number: client.uc_number,
      reference_date: `${f.reference_month}-01`,
      consumption_kw: Number(f.consumption_kw),
      price_kw: Number(f.price_kw),
      public_lighting: Number(f.public_lighting || 0),
      interest_fine: Number(f.interest_fine || 0),
      value_without_plant: Number(f.value_without_plant || 0),
      client_pays: Number(f.client_pays),
      distributor_invoice: Number(f.distributor_invoice || 0),
      notes: f.notes || null,
      attachment_url: f.attachment_url || null,
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

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${client.id}/${Date.now()}.${fileExt}`;
      const filePath = `invoices/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('faturas_v3_privado_v2')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,
          contentType: file.type || 'application/pdf'
        });

      if (uploadError) throw uploadError;

      setF(prev => ({ ...prev, attachment_url: filePath }));
      toast.success("Arquivo anexado!");
    } catch (err: any) {
      toast.error("Erro ao subir arquivo: " + err.message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[95vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{invoice ? "Editar Fatura" : "Lançar Fatura"} — {client.name}</DialogTitle>
        </DialogHeader>
        <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 mb-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider flex justify-between">
          <span>Desconto: {client.discount_pct}%</span>
          <span>Ilum. Fixa: {brl(client.public_lighting_value)}</span>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label>Unidade Consumidora *</Label>
            <Input value={client.uc_number} disabled />
          </div>
          <div>
            <Label>Mês de Referência *</Label>
            <Input type="month" value={f.reference_month} onChange={e => setF(prev => ({ ...prev, reference_month: e.target.value }))} />
          </div>
          <div>
            <Label>Consumo (kW) *</Label>
            <Input type="number" step="0.01" value={f.consumption_kw} onChange={e => handleCalcChange('consumption_kw', e.target.value)} placeholder="Ex: 537" />
          </div>
          <div>
            <Label>Preço kW (R$) *</Label>
            <Input type="number" step="0.000001" value={f.price_kw} onChange={e => handleCalcChange('price_kw', e.target.value)} placeholder="Ex: 1,185396" />
          </div>
          <div>
            <Label>Ilum. Pública (R$)</Label>
            <Input type="number" step="0.01" value={f.public_lighting} disabled className="bg-slate-50" />
          </div>
          <div>
            <Label>Juros/Multa (R$)</Label>
            <Input type="number" step="0.01" value={f.interest_fine} onChange={e => handleCalcChange('interest_fine', e.target.value)} placeholder="0" />
          </div>
          <div>
            <Label>Valor S/ Usina (R$)</Label>
            <Input type="number" step="0.01" value={f.value_without_plant} disabled className="bg-slate-50 font-bold" />
          </div>
          <div>
            <Label>Valor que o Cliente Paga (R$)</Label>
            <Input type="number" step="0.01" value={f.client_pays} disabled className="bg-emerald-50 text-[#2F6F62] font-bold" />
          </div>
        </div>
        <Card className="mt-2 border-red-100 bg-red-50/50 p-4">
          <div className="mb-1 text-sm font-medium text-red-800">Fatura do Cliente — Concessionária (R$)</div>
          <div className="mb-2 text-xs text-red-700/70">Valor que você paga à concessionária por este cliente</div>
          <Input type="number" step="0.01" value={f.distributor_invoice} onChange={e => setF(prev => ({ ...prev, distributor_invoice: e.target.value }))} className="bg-white" placeholder="676,37" />
        </Card>
        
        <div className="space-y-4 mt-4">
          <div>
            <Label>Observações</Label>
            <Textarea 
              value={f.notes} 
              onChange={e => setF(prev => ({ ...prev, notes: e.target.value }))} 
              placeholder="Opcional"
              className="mt-1"
            />
          </div>
          
          <div>
            <Label>Anexar Fatura / Comprovante</Label>
            <div className="mt-2 flex items-center gap-3">
              <Button 
                variant="outline" 
                type="button" 
                className="gap-2 relative" 
                disabled={uploading}
                asChild
              >
                <label className="cursor-pointer">
                  <Paperclip className="h-4 w-4" /> 
                  {uploading ? "Enviando..." : f.attachment_url ? "Trocar arquivo" : "Selecionar arquivo"}
                  <input type="file" className="hidden" onChange={handleFileUpload} accept="image/*,application/pdf" />
                </label>
              </Button>
              {f.attachment_url && (
                <div className="flex items-center gap-2">
                  <button 
                    type="button"
                    onClick={async () => {
                      try {
                        const path = f.attachment_url!;
                        const { data, error } = await supabase.storage
                          .from('faturas_v3_privado_v2')
                          .createSignedUrl(path, 60);
                        if (error) throw error;
                        
                        // Proxy download via our own API to avoid direct Supabase URL being blocked
                        const downloadUrl = `/api/public/download?token=${encodeURIComponent(data.signedUrl)}&name=${encodeURIComponent(path.split('/').pop() || 'fatura.pdf')}`;
                        window.location.href = downloadUrl;
                      } catch (err: any) {
                        toast.error("Erro ao abrir arquivo: " + err.message);
                      }
                    }}
                    className="text-xs text-primary hover:underline flex items-center gap-1 bg-transparent border-0 cursor-pointer p-0"
                  >
                    <Eye className="h-3 w-3" /> Ver anexo
                  </button>
                  <button 
                    type="button"
                    onClick={() => setF(prev => ({ ...prev, attachment_url: "" }))}
                    className="text-xs text-red-500 hover:underline bg-transparent border-0 cursor-pointer p-0"
                  >
                    Remover
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={submit} disabled={saving || uploading} className="bg-[#151B2E] hover:bg-[#1F2A45] text-white font-medium">Salvar</Button>
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
      <DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full" style={{ backgroundColor: client.color }} />
            {client.name} — UC {client.uc_number}
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-3 md:grid-cols-4">
          <Card className="p-4 border-none shadow-sm bg-slate-50">
            <div className="text-xs font-medium text-muted-foreground">Total S/ Usina</div>
            <div className="mt-1 text-xl font-bold text-foreground">{brl(totalWithoutPlant)}</div>
          </Card>
          <Card className="p-4 border-none shadow-sm bg-slate-50">
            <div className="text-xs font-medium text-muted-foreground">Cliente Pagou (receita)</div>
            <div className="mt-1 text-xl font-bold text-[#2F6F62]">{brl(totalClientPays)}</div>
          </Card>
          <Card className="p-4 border-none shadow-sm bg-slate-50">
            <div className="text-xs font-medium text-muted-foreground">Fat. Concessionária (despesa)</div>
            <div className="mt-1 text-xl font-bold text-negative">{brl(totalDistributor)}</div>
          </Card>
          <Card className="p-4 border-none shadow-sm bg-slate-50">
            <div className="text-xs font-medium text-muted-foreground">Lucro Bruto</div>
            <div className="mt-1 text-xl font-bold text-[#2E5C8A]">{brl(netProfit)}</div>
            <div className="mt-1 text-[10px] text-muted-foreground">Sem despesas operacionais</div>
          </Card>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold text-positive">
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
              <thead className="sticky top-0 bg-slate-50">
                <tr className="text-[10px] uppercase tracking-wider text-slate-500">
                  <th className="px-2 py-2 text-left font-semibold">Mês</th>
                  <th className="px-2 py-2 text-right font-semibold">Consumo (kW)</th>
                  <th className="px-2 py-2 text-right font-semibold">S/ Usina</th>
                  <th className="px-2 py-2 text-right font-semibold">Cliente Pagou</th>
                  <th className="px-2 py-2 text-right font-semibold text-[#D64545]">Fat. Concessionária</th>
                  <th className="px-2 py-2 text-right font-semibold text-[#2E5C8A]">Lucro</th>
                  <th className="px-2 py-2 text-center font-semibold">Anexo</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => {
                  const lucro = Number(inv.client_pays) - Number(inv.distributor_invoice);
                  return (
                    <tr key={inv.id} className="border-t border-slate-100 hover:bg-slate-50/50 even:bg-slate-50/30">
                      <td className="py-3">{monthLabelFromISO(inv.reference_date)}</td>
                      <td className="py-3 text-right text-slate-600">{Number(inv.consumption_kw).toLocaleString("pt-BR")}</td>
                      <td className="py-3 text-right">{brl(Number(inv.value_without_plant))}</td>
                      <td className="py-3 text-right text-[#2F6F62]">{brl(Number(inv.client_pays))}</td>
                      <td className="py-3 text-right text-negative">{brl(Number(inv.distributor_invoice))}</td>
                      <td className="py-3 text-right font-semibold text-[#2E5C8A]">{brl(lucro)}</td>
                      <td className="py-3 text-center">
                        {inv.attachment_url ? (
                          <button 
                            onClick={async () => {
                              try {
                                const path = inv.attachment_url!;
                                if (path.startsWith('http')) {
                                  window.open(path, '_blank');
                                  return;
                                }
                                const { data, error } = await supabase.storage
                                  .from('faturas_v3_privado_v2')
                                  .createSignedUrl(path, 3600);
                                if (error) throw error;
                                const a = document.createElement('a');
                                const downloadUrl = `/api/public/download?token=${encodeURIComponent(data.signedUrl)}&name=${encodeURIComponent(path.split('/').pop() || 'fatura.pdf')}`;
                                window.location.href = downloadUrl;
                              } catch (err: any) {
                                toast.error("Erro ao abrir arquivo: " + err.message);
                              }
                            }}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200"
                            title="Ver anexo"
                          >
                            <Paperclip className="h-4 w-4" />
                          </button>
                        ) : "—"}
                      </td>
                      <td className="py-3 pl-2 text-right">
                        <div className="flex justify-end gap-1">
                          <button onClick={() => setEditing(inv)} className="p-1 text-muted-foreground hover:text-foreground" aria-label={`Editar fatura de ${monthLabelFromISO(inv.reference_date)}`}>
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button onClick={() => del(inv)} className="p-1 text-muted-foreground hover:text-[#D64545]" aria-label={`Excluir fatura de ${monthLabelFromISO(inv.reference_date)}`}>
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