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
import { brl, monthLabel, EXPENSE_CATEGORIES } from "@/lib/format";
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
type Client = { id: string; name: string };

const fluxoQ = queryOptions({
  queryKey: ["fluxo-page"],
  queryFn: async () => {
    const [i, e, c] = await Promise.all([
      supabase.from("invoices").select("id,client_id,reference_date,client_pays,distributor_invoice"),
      supabase.from("expenses").select("*").order("reference_date", { ascending: false }),
      supabase.from("clients").select("id,name"),
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
      { title: "Fluxo de Caixa — Usina JJ" },
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
          <h1 className="truncate text-2xl font-bold tracking-tight sm:text-3xl">Fluxo de Caixa</h1>
          <p className="text-sm text-muted-foreground">Receitas, despesas e lucro mensal</p>
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
          <Button onClick={() => setNewOpen(true)} className="flex-1 gap-2 bg-rose-500 hover:bg-rose-600 sm:flex-none">
            <Plus className="h-4 w-4" /> Nova Despesa
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="border-emerald-200 bg-emerald-50/60 p-5">
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-emerald-700">
            <TrendingUp className="h-4 w-4" /> Total de Receitas
          </div>
          <div className="text-2xl font-bold text-emerald-700">{brl(receitas)}</div>
        </Card>
        <Card className="border-rose-200 bg-rose-50/60 p-5">
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-rose-700">
            <TrendingDown className="h-4 w-4" /> Total de Despesas
          </div>
          <div className="text-2xl font-bold text-rose-700">{brl(despesas)}</div>
          <div className="mt-1 text-xs text-rose-700/80">
            Operacionais {brl(despesasOperacionais)} + Faturas distribuidora {brl(faturasDistribuidora)}
          </div>
        </Card>
        <Card className="border-blue-200 bg-blue-50/60 p-5">
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-blue-700">
            <DollarSign className="h-4 w-4" /> Lucro do Mês
          </div>
          <div className={`text-2xl font-bold ${lucro < 0 ? "text-amber-600" : "text-blue-700"}`}>{brl(lucro)}</div>
          <div className="mt-1 text-xs text-muted-foreground">Receitas − (operacionais + distribuidora)</div>
        </Card>
      </div>

      <Card className="p-6">
        <h2 className="mb-4 text-lg font-semibold">Faturas dos clientes</h2>
        {monthInvoices.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma fatura neste mês.</p>}
        <div className="divide-y">
          {monthInvoices.map(inv => {
            const profit = Number(inv.client_pays) - Number(inv.distributor_invoice);
            return (
              <div key={inv.id} className="flex items-start justify-between py-3">
                <div>
                  <div className="font-medium">{clientName(inv.client_id)}</div>
                  <div className="text-xs text-muted-foreground">{monthLabel(monthDate)}</div>
                </div>
                <div className="text-right text-sm">
                  <div>Lucro bruto: <span className="font-semibold text-blue-600">{brl(profit)}</span></div>
                  <div className="text-muted-foreground">Recebido: {brl(Number(inv.client_pays))}</div>
                  <div className="text-muted-foreground">Fat. distribuidora: {brl(Number(inv.distributor_invoice))}</div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="mb-4 text-lg font-semibold">Despesas lançadas — {monthLabel(monthDate)}</h2>
        {monthExpenses.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma despesa neste mês.</p>}
        <div className="space-y-2">
          {monthExpenses.map(e => (
            <div key={e.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 rounded-xl border p-3">
              <div className="min-w-0">
                <div className="truncate font-medium">{e.description}</div>
                <div className="mt-1 flex flex-wrap gap-1">
                  <span className="inline-block rounded-full bg-muted px-2 py-0.5 text-xs">{e.category}</span>
                  {e.installment_total ? (
                    <span className="inline-block rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                      Parcela {e.installment_no}/{e.installment_total}
                    </span>
                  ) : null}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="whitespace-nowrap font-semibold text-rose-600">{brl(Number(e.amount))}</span>
                <button aria-label="Editar" onClick={() => setEdit(e)} className="text-muted-foreground hover:text-foreground"><Pencil className="h-4 w-4" /></button>
                <button aria-label="Excluir" onClick={() => deleteExpense(e)} className="text-muted-foreground hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>
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

async function deleteExpense(id: string) {
  if (!confirm("Excluir esta despesa?")) return;
  const { error } = await supabase.from("expenses").delete().eq("id", id);
  if (error) return toast.error(error.message);
  toast.success("Despesa excluída");
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
    const res = expense
      ? await supabase.from("expenses").update(payload).eq("id", expense.id)
      : await supabase.from("expenses").insert(payload);
    setSaving(false);
    if (res.error) return toast.error(res.error.message);
    toast.success(expense ? "Despesa atualizada" : "Despesa lançada");
    qc.invalidateQueries();
    onClose();
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{expense ? "Editar Despesa" : "Nova Despesa"}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Data de Referência *</Label>
            <Input type="date" value={f.reference_date} onChange={e => setF({ ...f, reference_date: e.target.value })} />
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
          <div className="col-span-2">
            <Label>Descrição *</Label>
            <Input value={f.description} onChange={e => setF({ ...f, description: e.target.value })} placeholder="Ex: Fatura CEMIG maio/25" />
          </div>
          <div className="col-span-2">
            <Label>Valor (R$) *</Label>
            <Input type="number" step="0.01" value={f.amount} onChange={e => setF({ ...f, amount: e.target.value })} />
          </div>
          <div className="col-span-2">
            <Label>Observações</Label>
            <Textarea value={f.notes} onChange={e => setF({ ...f, notes: e.target.value })} placeholder="Opcional" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={submit} disabled={saving} className="bg-rose-500 hover:bg-rose-600">Lançar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}