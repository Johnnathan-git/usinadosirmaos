/**
 * Execute esta instrucao no projeto: ajudar no layout, deixar mais profissional com um pouco mais de vida
 */
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
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Plus, TrendingUp, TrendingDown, DollarSign, Pencil, Trash2 } from "lucide-react";
import { brl, monthLabel, EXPENSE_CATEGORIES, initial } from "@/lib/format";
import { Suspense, useMemo, useState } from "react";
import { toast } from "sonner";

type Invoice = {
  id: string; client_id: string; reference_date: string;
  client_pays: number; distributor_invoice: number;
};
type Expense = {
  id: string; reference_date: string; category: string;
  description: string; amount: number; notes: string | null;
  installment_group?: string | null;
  installment_no?: number | null;
  installment_total?: number | null;
};
type Client = { id: string; name: string; color: string };

const fluxoQ = queryOptions({
  queryKey: ["fluxo-page"],
  queryFn: async () => {
    const [i, e, c] = await Promise.all([
      supabase.from("invoices").select("id,client_id,reference_date,client_pays,distributor_invoice"),
      supabase.from("expenses").select("*").order("reference_date", { ascending: false }),
      supabase.from("clients").select("id,name,color"),
    ]);
    if (i.error) throw i.error;
    if (e.error) throw e.error;
    if (c.error) throw c.error;
    return {
      invoices: (i.data ?? []) as Invoice[],
      expenses: (e.data ?? []) as Expense[],
      clients: (c.data ?? []) as Client[],
    };
  },
});

export const Route = createFileRoute("/fluxo-caixa")({
  ssr: false,
  component: Page,
  head: () => ({
    meta: [
      { title: "Fluxo de Caixa — Usina dos Irmãos" },
      { name: "description", content: "Controle mensal de receitas e despesas." },
    ],
  }),
});

function Page() {
  return (
    <AppLayout>
      <Suspense fallback={<div>Carregando...</div>}>
        <Fluxo />
      </Suspense>
    </AppLayout>
  );
}

function Fluxo() {
  const { data } = useSuspenseQuery(fluxoQ);
  const now = new Date();
  const [monthKey, setMonthKey] = useState(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
  );
  const [newOpen, setNewOpen] = useState(false);
  const [edit, setEdit] = useState<Expense | null>(null);

  const months = useMemo(() => {
    const set = new Set<string>();
    for (let i = -6; i <= 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      set.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
    }
    data.invoices.forEach(inv => set.add(inv.reference_date.slice(0, 7)));
    data.expenses.forEach(e => set.add(e.reference_date.slice(0, 7)));
    return [...set].sort().reverse();
  }, [data]);

  const monthInvoices = data.invoices.filter(i => i.reference_date.startsWith(monthKey));
  const monthExpenses = data.expenses.filter(e => e.reference_date.startsWith(monthKey));

  const receitas = monthInvoices.reduce((a, i) => a + Number(i.client_pays), 0);
  const despesasOperacionais = monthExpenses.reduce((a, e) => a + Number(e.amount), 0);
  const faturasDistribuidora = monthInvoices.reduce((a, i) => a + Number(i.distributor_invoice), 0);
  const despesas = despesasOperacionais + faturasDistribuidora;
  const lucro = receitas - despesas;

  const clientName = (id: string) => data.clients.find(c => c.id === id)?.name ?? "—";
  const monthDate = new Date(Number(monthKey.slice(0, 4)), Number(monthKey.slice(5, 7)) - 1, 1);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="grid gap-3 sm:flex sm:flex-wrap sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="truncate text-4xl font-bold tracking-tight text-[#1C2333]">Fluxo de Caixa</h1>
          <p className="text-sm font-medium text-[#6B7280]">Gestão de receitas e despesas operacionais</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={monthKey} onValueChange={setMonthKey}>
            <SelectTrigger className="w-36 sm:w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              {months.map(m => {
                const d = new Date(Number(m.slice(0, 4)), Number(m.slice(5, 7)) - 1, 1);
                return <SelectItem key={m} value={m}>{monthLabel(d)}</SelectItem>;
              })}
            </SelectContent>
          </Select>
          <Button onClick={() => setNewOpen(true)} className="flex-1 gap-2 bg-[#151B2E] hover:bg-[#1F2A45] sm:flex-none font-bold">
            <Plus className="h-4 w-4" /> Nova Despesa
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="relative overflow-hidden rounded-[10px] border border-[#E4E7EC] bg-white p-6 shadow-sm" style={{ borderTop: "3px solid #2F6F62" }}>
          <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">
            <TrendingUp className="h-4 w-4 text-[#2F6F62]" /> Total de Receitas
          </div>
          <div className="text-2xl font-bold text-[#2F6F62] num-lg">{brl(receitas)}</div>
        </Card>
        <Card className="relative overflow-hidden rounded-[10px] border border-[#E4E7EC] bg-white p-6 shadow-sm" style={{ borderTop: "3px solid #D64545" }}>
          <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">
            <TrendingDown className="h-4 w-4 text-[#D64545]" /> Total de Despesas
          </div>
          <div className="text-2xl font-bold text-[#D64545] num-lg">{brl(despesas)}</div>
          <div className="mt-2 text-[10px] text-[#9CA3AF] font-bold uppercase tracking-tight">
            Operacionais {brl(despesasOperacionais)} + Distribuidora {brl(faturasDistribuidora)}
          </div>
        </Card>
        <Card className="relative overflow-hidden rounded-[10px] border border-[#E4E7EC] bg-white p-6 shadow-sm" style={{ borderTop: `3px solid ${lucro < 0 ? "#D64545" : "#2563EB"}` }}>
          <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">
            <DollarSign className="h-4 w-4" style={{ color: lucro < 0 ? "#D64545" : "#2E5C8A" }} /> Lucro do Mês
          </div>
          <div className="text-2xl font-bold num-lg" style={{ color: lucro < 0 ? "#D64545" : "#2E5C8A" }}>{brl(lucro)}</div>
          <div className="mt-2 text-[10px] text-[#9CA3AF] font-bold uppercase tracking-tight">Receitas − (operacionais + distribuidora)</div>
        </Card>
      </div>

      <Card className="rounded-[10px] border border-[#E4E7EC] bg-white p-6 shadow-sm">
        <h2 className="mb-6 text-lg font-bold text-[#1C2333]">Faturas dos clientes</h2>
        {monthInvoices.length === 0 && <p className="text-sm text-[#6B7280]">Nenhuma fatura neste mês.</p>}
        <div className="divide-y divide-[#F5F6F8]">
          {monthInvoices.map(inv => {
            const profit = Number(inv.client_pays) - Number(inv.distributor_invoice);
            const client = data.clients.find(c => c.id === inv.client_id);
            return (
              <div key={inv.id} className="flex items-start justify-between py-4">
                <div className="flex items-center gap-3">
                  <div 
                    className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white shadow-sm"
                    style={{ backgroundColor: client?.color ?? '#64748B' }}
                  >
                    {initial(client?.name ?? "?")}
                  </div>
                  <div>
                    <div className="font-bold text-[#1C2333]">{client?.name ?? "—"}</div>
                    <div className="text-xs font-medium text-[#6B7280]">{monthLabel(monthDate)}</div>
                  </div>
                </div>
                <div className="text-right text-sm">
                  <div className="text-[#6B7280] font-bold">Lucro bruto: <span className="font-bold text-[#2E5C8A] num">{brl(profit)}</span></div>
                  <div className="text-[#9CA3AF] text-xs">Recebido: <span className="num">{brl(Number(inv.client_pays))}</span></div>
                  <div className="text-[#9CA3AF] text-xs">Fat. distribuidora: <span className="num">{brl(Number(inv.distributor_invoice))}</span></div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <Card className="rounded-[10px] border border-[#E4E7EC] bg-white p-6 shadow-sm">
        <h2 className="mb-6 text-lg font-bold text-[#1C2333]">Despesas lançadas — {monthLabel(monthDate)}</h2>
        {monthExpenses.length === 0 && <p className="text-sm text-[#6B7280]">Nenhuma despesa neste mês.</p>}
        <div className="space-y-3">
          {monthExpenses.map(e => (
            <div key={e.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 rounded-lg border border-[#F5F6F8] p-4 hover:bg-[#F5F6F8] transition-colors">
              <div className="min-w-0">
                <div className="truncate font-bold text-[#1C2333]">{e.description}</div>
                <div className="mt-1 flex flex-wrap gap-2">
                  <span className="inline-block rounded-md bg-[#6B7280]/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">{e.category}</span>
                  {e.installment_total ? (
                    <span className="inline-block rounded-md bg-[#C98A3E]/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#C98A3E]">
                      Parcela {e.installment_no}/{e.installment_total}
                    </span>
                  ) : null}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="whitespace-nowrap font-bold text-[#D64545] num-lg">{brl(Number(e.amount))}</span>
                <button aria-label="Editar" onClick={() => setEdit(e)} className="text-[#9CA3AF] hover:text-[#1C2333] transition-colors"><Pencil className="h-4 w-4" /></button>
                <button aria-label="Excluir" onClick={() => deleteExpense(e)} className="text-[#9CA3AF] hover:text-[#D64545] transition-colors"><Trash2 className="h-4 w-4" /></button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {(newOpen || edit) && (
        <ExpenseDialog expense={edit} onClose={() => { setNewOpen(false); setEdit(null); }} />
      )}
    </div>
  );
}

async function deleteExpense(e: Expense) {
  const isParcel = Boolean(e.installment_group && (e.installment_total ?? 0) > 1);
  if (isParcel) {
    const all = confirm(
      `Esta é a parcela ${e.installment_no}/${e.installment_total}.\n\nOK = excluir TODAS as parcelas desta compra.\nCancelar = excluir somente esta parcela.`,
    );
    const q = all
      ? supabase.from("expenses").delete().eq("installment_group", e.installment_group!)
      : supabase.from("expenses").delete().eq("id", e.id);
    const { error } = await q;
    if (error) return toast.error(error.message);
    toast.success(all ? "Parcelas excluídas" : "Parcela excluída");
  } else {
    if (!confirm("Excluir esta despesa?")) return;
    const { error } = await supabase.from("expenses").delete().eq("id", e.id);
    if (error) return toast.error(error.message);
    toast.success("Despesa excluída");
  }
  location.reload();
}

function ExpenseDialog({ expense, onClose }: { expense: Expense | null; onClose: () => void }) {
  const qc = useQueryClient();
  const today = new Date().toISOString().slice(0, 10);
  const [f, setF] = useState({
    reference_date: expense?.reference_date ?? today,
    category: expense?.category ?? EXPENSE_CATEGORIES[0],
    description: expense?.description ?? "",
    amount: expense ? String(expense.amount) : "",
    notes: expense?.notes ?? "",
  });
  const [installments, setInstallments] = useState(false);
  const [parcels, setParcels] = useState("2");
  const [mode, setMode] = useState<"parcela" | "total">("parcela");
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!f.description.trim() || !f.amount) {
      toast.error("Preencha descrição e valor");
      return;
    }
    setSaving(true);
    const payload = {
      reference_date: f.reference_date,
      category: f.category,
      description: f.description.trim(),
      amount: Number(f.amount),
      notes: f.notes || null,
    };
    let res;
    if (expense) {
      res = await supabase.from("expenses").update(payload).eq("id", expense.id);
    } else if (installments && Number(parcels) > 1) {
      const n = Math.min(120, Math.max(2, Math.round(Number(parcels))));
      const total = mode === "total" ? Number(f.amount) : Number(f.amount) * n;
      const base = Math.floor((total / n) * 100) / 100;
      const group = crypto.randomUUID();
      const [y, m] = f.reference_date.slice(0, 7).split("-").map(Number);
      const rows = Array.from({ length: n }, (_, i) => {
        const d = new Date(y, m - 1 + i, 1);
        const amount = i === n - 1 ? Math.round((total - base * (n - 1)) * 100) / 100 : base;
        return {
          ...payload,
          amount,
          reference_date: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`,
          installment_group: group,
          installment_no: i + 1,
          installment_total: n,
        };
      });
      res = await supabase.from("expenses").insert(rows);
    } else {
      res = await supabase.from("expenses").insert(payload);
    }
    setSaving(false);
    if (res.error) return toast.error(res.error.message);
    toast.success(
      expense ? "Despesa atualizada" : installments ? `${parcels} parcelas lançadas` : "Despesa lançada",
    );
    qc.invalidateQueries();
    onClose();
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{expense ? "Editar Despesa" : "Nova Despesa"}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label>{installments ? "Mês da 1ª parcela *" : "Mês de Referência *"}</Label>
            <Input
              type="month"
              value={f.reference_date.slice(0, 7)}
              onChange={e => setF({ ...f, reference_date: `${e.target.value}-01` })}
            />
          </div>
          <div>
            <Label>Categoria *</Label>
            <Select value={f.category} onValueChange={v => setF({ ...f, category: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {EXPENSE_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-2">
            <Label>Descrição *</Label>
            <Input value={f.description} onChange={e => setF({ ...f, description: e.target.value })} placeholder="Ex: Fatura CEMIG maio/25" />
          </div>
          {!expense && (
            <div className="rounded-xl border bg-muted/40 p-3 sm:col-span-2">
              <label className="flex items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-rose-500"
                  checked={installments}
                  onChange={e => setInstallments(e.target.checked)}
                />
                Compra parcelada (lançar parcelas futuras)
              </label>
              {installments && (
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <Label>Nº de parcelas *</Label>
                    <Input type="number" min={2} max={120} inputMode="numeric" value={parcels} onChange={e => setParcels(e.target.value)} />
                  </div>
                  <div>
                    <Label>O valor informado é</Label>
                    <Select value={mode} onValueChange={v => setMode(v as "parcela" | "total")}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="parcela">Valor de cada parcela</SelectItem>
                        <SelectItem value="total">Valor total da compra</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <p className="text-xs text-muted-foreground sm:col-span-2">
                    Serão criados {parcels || 0} lançamentos mensais a partir do mês escolhido.
                  </p>
                </div>
              )}
            </div>
          )}
          <div className="sm:col-span-2">
            <Label>{installments ? (mode === "total" ? "Valor total (R$) *" : "Valor da parcela (R$) *") : "Valor (R$) *"}</Label>
            <Input type="number" inputMode="decimal" step="0.01" value={f.amount} onChange={e => setF({ ...f, amount: e.target.value })} />
          </div>
          <div className="sm:col-span-2">
            <Label>Observações</Label>
            <Textarea value={f.notes} onChange={e => setF({ ...f, notes: e.target.value })} placeholder="Opcional" />
          </div>
        </div>
        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={submit} disabled={saving} className="bg-destructive hover:bg-destructive/90">
            {expense ? "Salvar" : installments ? "Lançar parcelas" : "Lançar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}