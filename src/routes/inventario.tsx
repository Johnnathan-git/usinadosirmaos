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
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Plus, Pencil, Trash2, Box, TrendingUp, Hammer, Package } from "lucide-react";
import { brl, formatDateBR } from "@/lib/format";
import { Suspense, useMemo, useState } from "react";
import { toast } from "sonner";

type Asset = {
  id: string; item: string; location: string | null; category: string;
  brand: string | null; model: string | null; quantity: number; unit_value: number;
  acquired_on: string | null; serial_number: string | null; notes: string | null;
};
type InvExpense = {
  id: string; description: string; amount: number; spent_on: string; notes: string | null;
  responsible: string | null;
};

const BASE_CATEGORIES = ["Placa Solar", "Inversor", "Equipamentos Elétricos"];
const RESPONSIBLES = ["John", "Jehn"];

const q = queryOptions({
  queryKey: ["inventario-page"],
  queryFn: async () => {
    const [a, e] = await Promise.all([
      supabase.from("inventory_assets").select("*").order("created_at", { ascending: false }),
      supabase
        .from("investment_expenses")
        .select("*")
        .order("spent_on", { ascending: false })
        .order("created_at", { ascending: true }),
    ]);
    if (a.error) throw a.error;
    if (e.error) throw e.error;
    return { assets: (a.data ?? []) as Asset[], expenses: (e.data ?? []) as InvExpense[] };
  },
});

export const Route = createFileRoute("/inventario")({
  ssr: false,
  component: Page,
  head: () => ({
    meta: [
      { title: "Inventário — Usina JJ" },
      { name: "description", content: "Patrimônio, equipamentos e gastos de instalação." },
    ],
  }),
});

function Page() {
  return (
    <AppLayout>
      <Suspense fallback={<div>Carregando...</div>}>
        <Inventario />
      </Suspense>
    </AppLayout>
  );
}

function Inventario() {
  const { data } = useSuspenseQuery(q);
  const queryClient = useQueryClient();
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["inventario-page"] });
  const [tab, setTab] = useState("assets");
  const [assetOpen, setAssetOpen] = useState<Asset | true | null>(null);
  const [expenseOpen, setExpenseOpen] = useState<InvExpense | true | null>(null);
  const [category, setCategory] = useState<string>("all");

  const totalAtivos = data.assets.reduce((s, a) => s + Number(a.unit_value) * a.quantity, 0);
  const totalGastos = data.expenses.reduce((s, e) => s + Number(e.amount), 0);
  const totalInvestido = totalAtivos + totalGastos;

  const categories = useMemo(() => {
    const m = new Map<string, number>();
    data.assets.forEach(a => m.set(a.category, (m.get(a.category) ?? 0) + a.quantity));
    return [...m.entries()];
  }, [data.assets]);

  const filteredAssets = category === "all" ? data.assets : data.assets.filter(a => a.category === category);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Inventário</h1>
          <p className="text-sm text-muted-foreground">Patrimônio, equipamentos e gastos de instalação</p>
        </div>
        {tab === "assets"
          ? <Button onClick={() => setAssetOpen(true)} className="gap-2 bg-orange-500 hover:bg-orange-600"><Plus className="h-4 w-4" /> Novo Item</Button>
          : <Button onClick={() => setExpenseOpen(true)} className="gap-2 bg-orange-500 hover:bg-orange-600"><Plus className="h-4 w-4" /> Novo Gasto</Button>
        }
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="border-amber-200 bg-amber-50/60 p-5">
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-amber-700"><TrendingUp className="h-4 w-4" /> Total Investido</div>
          <div className="text-2xl font-bold text-amber-700">{brl(totalInvestido)}</div>
          <div className="mt-1 text-xs text-amber-700/70">Ativos + Gastos</div>
        </Card>
        <Card className="p-5">
          <div className="mb-2 flex items-center gap-2 text-sm font-medium"><Box className="h-4 w-4" /> Valor em Ativos</div>
          <div className="text-2xl font-bold">{brl(totalAtivos)}</div>
        </Card>
        <Card className="border-orange-200 bg-orange-50/60 p-5">
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-orange-700"><Hammer className="h-4 w-4" /> Gastos de Investimento</div>
          <div className="text-2xl font-bold text-orange-700">{brl(totalGastos)}</div>
        </Card>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="assets" className="gap-2"><Package className="h-4 w-4" /> Ativos / Equipamentos</TabsTrigger>
          <TabsTrigger value="expenses" className="gap-2"><Hammer className="h-4 w-4" /> Gastos de Investimento</TabsTrigger>
        </TabsList>

        <TabsContent value="assets" className="mt-4">
          <Card className="p-6">
            <div className="mb-4 flex flex-wrap gap-2">
              <button onClick={() => setCategory("all")}
                className={`rounded-full px-3 py-1 text-sm ${category === "all" ? "bg-orange-500 text-white" : "bg-muted"}`}>
                Todos
              </button>
              {categories.map(([cat, count]) => (
                <button key={cat} onClick={() => setCategory(cat)}
                  className={`rounded-full px-3 py-1 text-sm ${category === cat ? "bg-orange-500 text-white" : "bg-muted"}`}>
                  {cat} ({count})
                </button>
              ))}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="pb-3 text-left font-medium">Item</th>
                    <th className="pb-3 text-left font-medium">Categoria</th>
                    <th className="pb-3 text-left font-medium">Marca / Modelo</th>
                    <th className="pb-3 text-center font-medium">Qtd</th>
                    <th className="pb-3 text-right font-medium">Valor Unit.</th>
                    <th className="pb-3 text-right font-medium">Total</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAssets.map(a => (
                    <tr key={a.id} className="border-t">
                      <td className="py-3">
                        <div className="font-medium">{a.item}</div>
                        {a.location && <div className="text-xs text-muted-foreground">{a.location}</div>}
                      </td>
                      <td className="py-3"><span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">{a.category}</span></td>
                      <td className="py-3 text-muted-foreground">{[a.brand, a.model].filter(Boolean).join(" / ") || "—"}</td>
                      <td className="py-3 text-center">{a.quantity}</td>
                      <td className="py-3 text-right">{brl(Number(a.unit_value))}</td>
                      <td className="py-3 text-right font-semibold text-orange-600">{brl(Number(a.unit_value) * a.quantity)}</td>
                      <td className="py-3 pl-2 text-right">
                        <button onClick={() => setAssetOpen(a)} className="mr-2 text-muted-foreground hover:text-foreground"><Pencil className="h-4 w-4" /></button>
                        <button onClick={() => delRow("inventory_assets", a.id, refresh)} className="text-muted-foreground hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t bg-amber-50/60">
                    <td colSpan={5} className="py-3 font-semibold">Total Patrimônio</td>
                    <td className="py-3 text-right font-bold text-amber-700">{brl(totalAtivos)}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="expenses" className="mt-4">
          <Card className="p-6">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="pb-3 text-left font-medium">Descrição</th>
                  <th className="pb-3 text-left font-medium">Data</th>
                  <th className="pb-3 text-left font-medium">Observações</th>
                  <th className="pb-3 text-right font-medium">Valor</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {data.expenses.map(e => (
                  <tr key={e.id} className="border-t">
                    <td className="py-3 font-medium">{e.description}</td>
                    <td className="py-3 text-muted-foreground">{formatDateBR(e.spent_on)}</td>
                    <td className="py-3 text-muted-foreground">{e.notes || "—"}</td>
                    <td className="py-3 text-right font-semibold text-orange-600">{brl(Number(e.amount))}</td>
                    <td className="py-3 pl-2 text-right">
                      <button onClick={() => setExpenseOpen(e)} className="mr-2 text-muted-foreground hover:text-foreground"><Pencil className="h-4 w-4" /></button>
                      <button onClick={() => delRow("investment_expenses", e.id, refresh)} className="text-muted-foreground hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t bg-amber-50/60">
                  <td colSpan={3} className="py-3 font-semibold">Total Gastos</td>
                  <td className="py-3 text-right font-bold text-orange-700">{brl(totalGastos)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
            {data.expenses.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">Nenhum gasto lançado.</p>}
          </Card>
        </TabsContent>
      </Tabs>

      {assetOpen && <AssetDialog asset={assetOpen === true ? null : assetOpen} onClose={() => setAssetOpen(null)} onSaved={refresh} />}
      {expenseOpen && <InvExpenseDialog expense={expenseOpen === true ? null : expenseOpen} onClose={() => setExpenseOpen(null)} onSaved={refresh} />}
    </div>
  );
}

async function delRow(table: "inventory_assets" | "investment_expenses", id: string, onDone: () => void) {
  if (!confirm("Excluir este registro?")) return;
  const { error } = await supabase.from(table).delete().eq("id", id);
  if (error) return toast.error(error.message);
  toast.success("Registro excluído");
  onDone();
}

function AssetDialog({ asset, onClose, onSaved }: { asset: Asset | null; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState({
    item: asset?.item ?? "",
    location: asset?.location ?? "Usina",
    category: asset?.category ?? "Placa Solar",
    brand: asset?.brand ?? "",
    model: asset?.model ?? "",
    quantity: asset ? String(asset.quantity) : "1",
    unit_value: asset ? String(asset.unit_value) : "",
  });
  const [saving, setSaving] = useState(false);
  async function submit() {
    if (!f.item.trim()) return toast.error("Informe o item");
    setSaving(true);
    const payload = {
      item: f.item.trim(),
      location: f.location || null,
      category: f.category,
      brand: f.brand || null,
      model: f.model || null,
      quantity: Number(f.quantity) || 1,
      unit_value: Number(f.unit_value) || 0,
    };
    const res = asset
      ? await supabase.from("inventory_assets").update(payload).eq("id", asset.id)
      : await supabase.from("inventory_assets").insert(payload);
    setSaving(false);
    if (res.error) return toast.error(res.error.message);
    toast.success("Item salvo");
    onSaved();
    onClose();
  }
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{asset ? "Editar Item" : "Novo Item"}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2"><Label>Item *</Label><Input value={f.item} onChange={e => setF({ ...f, item: e.target.value })} /></div>
          <div><Label>Localização</Label><Input value={f.location} onChange={e => setF({ ...f, location: e.target.value })} /></div>
          <div><Label>Categoria</Label><Input value={f.category} onChange={e => setF({ ...f, category: e.target.value })} /></div>
          <div><Label>Marca</Label><Input value={f.brand} onChange={e => setF({ ...f, brand: e.target.value })} /></div>
          <div><Label>Modelo</Label><Input value={f.model} onChange={e => setF({ ...f, model: e.target.value })} /></div>
          <div><Label>Quantidade</Label><Input type="number" value={f.quantity} onChange={e => setF({ ...f, quantity: e.target.value })} /></div>
          <div><Label>Valor Unit. (R$)</Label><Input type="number" step="0.01" value={f.unit_value} onChange={e => setF({ ...f, unit_value: e.target.value })} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={submit} disabled={saving} className="bg-orange-500 hover:bg-orange-600">Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function InvExpenseDialog({ expense, onClose, onSaved }: { expense: InvExpense | null; onClose: () => void; onSaved: () => void }) {
  const today = new Date().toISOString().slice(0, 10);
  const [f, setF] = useState({
    description: expense?.description ?? "",
    amount: expense ? String(expense.amount) : "",
    spent_on: expense?.spent_on ?? today,
    notes: expense?.notes ?? "",
  });
  const [saving, setSaving] = useState(false);
  async function submit() {
    if (!f.description.trim() || !f.amount || !f.spent_on) return toast.error("Preencha os campos obrigatórios");
    setSaving(true);
    const payload = { description: f.description.trim(), amount: Number(f.amount), spent_on: f.spent_on, notes: f.notes || null };
    const res = expense
      ? await supabase.from("investment_expenses").update(payload).eq("id", expense.id)
      : await supabase.from("investment_expenses").insert(payload);
    setSaving(false);
    if (res.error) return toast.error(res.error.message);
    toast.success("Gasto salvo");
    onSaved();
    onClose();
  }
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{expense ? "Editar Gasto" : "Novo Gasto de Investimento"}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2"><Label>Descrição *</Label><Input value={f.description} onChange={e => setF({ ...f, description: e.target.value })} placeholder="Ex: Cimento, Arame, Mão de obra..." /></div>
          <div><Label>Valor (R$) *</Label><Input type="number" step="0.01" value={f.amount} onChange={e => setF({ ...f, amount: e.target.value })} /></div>
          <div><Label>Data *</Label><Input type="date" value={f.spent_on} onChange={e => setF({ ...f, spent_on: e.target.value })} /></div>
          <div className="col-span-2"><Label>Observações</Label><Textarea value={f.notes} onChange={e => setF({ ...f, notes: e.target.value })} placeholder="Opcional" /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={submit} disabled={saving} className="bg-orange-500 hover:bg-orange-600">Cadastrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}