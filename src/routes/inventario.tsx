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
      { title: "Inventário — Usina dos Irmãos" },
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
      <div className="grid gap-3 sm:flex sm:flex-wrap sm:items-start sm:justify-between">
        <div>
          <h1 className="truncate text-4xl font-bold tracking-tight text-[#1C2333]">Inventário</h1>
          <p className="text-sm text-[#6B7280]">Patrimônio, equipamentos e gastos de instalação</p>
        </div>
        {tab === "assets"
          ? <Button onClick={() => setAssetOpen(true)} className="w-full gap-2 bg-[#151B2E] text-white hover:bg-[#1F2A45] rounded-lg px-4 py-2 font-bold shadow-sm sm:w-auto"><Plus className="h-4 w-4" /> Novo Item</Button>
          : <Button onClick={() => setExpenseOpen(true)} className="w-full gap-2 bg-[#151B2E] text-white hover:bg-[#1F2A45] rounded-lg px-4 py-2 font-bold shadow-sm sm:w-auto"><Plus className="h-4 w-4" /> Novo Gasto</Button>
        }
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="rounded-[10px] border border-[#E4E7EC] bg-white p-5 shadow-sm">
          <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-[#1C2333]"><TrendingUp className="h-4 w-4" /> Total Investido</div>
          <div className="text-2xl font-bold text-[#1C2333] num-lg">{brl(totalInvestido)}</div>
          <div className="mt-1 text-[10px] text-[#9CA3AF] font-medium uppercase tracking-tight">Ativos + Gastos</div>
        </Card>
        <Card className="rounded-[10px] border border-[#E4E7EC] bg-white p-5 shadow-sm">
          <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-[#2F6F62]"><Box className="h-4 w-4" /> Valor em Ativos</div>
          <div className="text-2xl font-bold text-[#2F6F62] num-lg">{brl(totalAtivos)}</div>
        </Card>
        <Card className="rounded-[10px] border border-[#E4E7EC] bg-white p-5 shadow-sm">
          <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-[#1C2333]"><Hammer className="h-4 w-4" /> Gastos de Investimento</div>
          <div className="text-2xl font-bold text-[#1C2333] num-lg">{brl(totalGastos)}</div>
        </Card>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="w-full justify-start overflow-x-auto bg-[#F5F6F8] p-1 rounded-lg">
          <TabsTrigger value="assets" className="gap-2 data-[state=active]:bg-white data-[state=active]:text-[#1C2333] data-[state=active]:shadow-sm font-bold text-[#6B7280]"><Package className="h-4 w-4" /> Ativos / Equipamentos</TabsTrigger>
          <TabsTrigger value="expenses" className="gap-2 data-[state=active]:bg-white data-[state=active]:text-[#1C2333] data-[state=active]:shadow-sm font-bold text-[#6B7280]"><Hammer className="h-4 w-4" /> Gastos de Investimento</TabsTrigger>
        </TabsList>

        <TabsContent value="assets" className="mt-4">
          <Card className="rounded-[10px] border border-[#E4E7EC] bg-white p-6 shadow-sm">
            <div className="mb-6 flex flex-wrap gap-2">
              <button onClick={() => setCategory("all")}
                className={`rounded-lg px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-all ${category === "all" ? "bg-[#151B2E] text-white shadow-sm" : "bg-[#F5F6F8] text-[#6B7280] hover:bg-slate-200"}`}>
                Todos
              </button>
              {categories.map(([cat, count]) => (
                <button key={cat} onClick={() => setCategory(cat)}
                  className={`rounded-lg px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-all ${category === cat ? "bg-[#151B2E] text-white shadow-sm" : "bg-[#F5F6F8] text-[#6B7280] hover:bg-slate-200"}`}>
                  {cat} ({count})
                </button>
              ))}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#E4E7EC]">
                    <th className="pb-3 text-left font-semibold text-[#6B7280] uppercase text-[10px] tracking-wider">Item</th>
                    <th className="pb-3 text-left font-semibold text-[#6B7280] uppercase text-[10px] tracking-wider">Categoria</th>
                    <th className="pb-3 text-left font-semibold text-[#6B7280] uppercase text-[10px] tracking-wider">Marca / Modelo</th>
                    <th className="pb-3 text-center font-semibold text-[#6B7280] uppercase text-[10px] tracking-wider">Qtd</th>
                    <th className="pb-3 text-right font-semibold text-[#6B7280] uppercase text-[10px] tracking-wider">Valor Unit.</th>
                    <th className="pb-3 text-right font-semibold text-[#6B7280] uppercase text-[10px] tracking-wider">Total</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAssets.map(a => (
                    <tr key={a.id} className="border-b border-[#F5F6F8] last:border-0 hover:bg-[#F5F6F8]">
                      <td className="py-4">
                        <div className="font-bold text-[#1C2333]">{a.item}</div>
                        {a.location && <div className="text-[10px] text-[#9CA3AF] font-medium uppercase tracking-tight">{a.location}</div>}
                      </td>
                      <td className="py-4"><span className="rounded-md bg-[#C98A3E]/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#C98A3E]">{a.category}</span></td>
                      <td className="py-4 text-[#6B7280] font-medium">{[a.brand, a.model].filter(Boolean).join(" / ") || "—"}</td>
                      <td className="py-4 text-center text-[#1C2333] font-bold num">{a.quantity}</td>
                      <td className="py-4 text-right text-[#1C2333] font-medium num">{brl(Number(a.unit_value))}</td>
                      <td className="py-4 text-right font-bold text-[#2F6F62] num">{brl(Number(a.unit_value) * a.quantity)}</td>
                      <td className="py-4 pl-4 text-right">
                        <button onClick={() => setAssetOpen(a)} className="mr-3 text-[#9CA3AF] hover:text-[#1C2333]"><Pencil className="h-4 w-4" /></button>
                        <button onClick={() => delRow("inventory_assets", a.id, refresh)} className="text-[#9CA3AF] hover:text-[#B5533E]"><Trash2 className="h-4 w-4" /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-[#E4E7EC] bg-[#F5F6F8]">
                    <td colSpan={5} className="py-4 font-bold text-[#1C2333] uppercase text-[10px] tracking-wider px-4">Total Patrimônio</td>
                    <td className="py-4 text-right font-bold text-[#2F6F62] num px-4">{brl(totalAtivos)}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="expenses" className="mt-4">
          <Card className="rounded-[10px] border border-[#E4E7EC] bg-white p-6 shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#E4E7EC]">
                  <th className="pb-3 text-left font-semibold text-[#6B7280] uppercase text-[10px] tracking-wider">Descrição</th>
                  <th className="pb-3 text-left font-semibold text-[#6B7280] uppercase text-[10px] tracking-wider">Data</th>
                  <th className="pb-3 text-left font-semibold text-[#6B7280] uppercase text-[10px] tracking-wider">Responsável</th>
                  <th className="pb-3 text-left font-semibold text-[#6B7280] uppercase text-[10px] tracking-wider">Observações</th>
                  <th className="pb-3 text-right font-semibold text-[#6B7280] uppercase text-[10px] tracking-wider">Valor</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {data.expenses.map(e => (
                  <tr key={e.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                    <td className="py-4 font-semibold text-slate-800">{e.description}</td>
                    <td className="py-4 text-slate-500">{formatDateBR(e.spent_on)}</td>
                    <td className="py-4 text-slate-500">{e.responsible || "—"}</td>
                    <td className="py-4 text-slate-500">{e.notes || "—"}</td>
                    <td className="py-4 text-right font-bold text-slate-900">{brl(Number(e.amount))}</td>
                    <td className="py-4 pl-4 text-right">
                      <button onClick={() => setExpenseOpen(e)} className="mr-3 text-slate-400 hover:text-slate-800"><Pencil className="h-4 w-4" /></button>
                      <button onClick={() => delRow("investment_expenses", e.id, refresh)} className="text-slate-400 hover:text-[#DC2626]"><Trash2 className="h-4 w-4" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-slate-200">
                  <td colSpan={4} className="py-4 font-bold text-slate-800">Total Gastos</td>
                  <td className="py-4 text-right font-bold text-slate-900">{brl(totalGastos)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
            {data.expenses.length === 0 && <p className="py-8 text-center text-sm text-slate-500">Nenhum gasto lançado.</p>}
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
  const [customCats, setCustomCats] = useState<string[]>([]);
  const [newCat, setNewCat] = useState("");
  const [addingCat, setAddingCat] = useState(false);
  const [f, setF] = useState({
    item: asset?.item ?? "",
    location: asset?.location ?? "Usina",
    category: asset?.category ?? "Placa Solar",
    brand: asset?.brand ?? "",
    model: asset?.model ?? "",
    quantity: asset ? String(asset.quantity) : "1",
    unit_value: asset ? String(asset.unit_value) : "",
    acquired_on: asset?.acquired_on ?? "",
    serial_number: asset?.serial_number ?? "",
    notes: asset?.notes ?? "",
  });
  const [saving, setSaving] = useState(false);
  const categories = [...new Set([...BASE_CATEGORIES, ...customCats, ...(f.category ? [f.category] : [])])];
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
      acquired_on: f.acquired_on || null,
      serial_number: f.serial_number || null,
      notes: f.notes || null,
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
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader><DialogTitle>{asset ? "Editar Item" : "Novo Item"}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2"><Label>Nome do Item *</Label><Input value={f.item} onChange={e => setF({ ...f, item: e.target.value })} /></div>
          <div>
            <Label>Categoria *</Label>
            {addingCat ? (
              <div className="flex gap-2">
                <Input autoFocus value={newCat} onChange={e => setNewCat(e.target.value)} placeholder="Nova categoria" />
                <Button type="button" variant="outline" onClick={() => {
                  const v = newCat.trim();
                  if (!v) return setAddingCat(false);
                  setCustomCats(c => [...c, v]);
                  setF({ ...f, category: v });
                  setNewCat(""); setAddingCat(false);
                }}>OK</Button>
              </div>
            ) : (
              <select
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                value={f.category}
                onChange={e => {
                  if (e.target.value === "__new") { setAddingCat(true); return; }
                  setF({ ...f, category: e.target.value });
                }}
              >
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
                <option value="__new">+ Cadastrar nova categoria…</option>
              </select>
            )}
          </div>
          <div><Label>Localização</Label><Input value={f.location} onChange={e => setF({ ...f, location: e.target.value })} /></div>
          <div><Label>Marca</Label><Input value={f.brand} onChange={e => setF({ ...f, brand: e.target.value })} /></div>
          <div><Label>Modelo</Label><Input value={f.model} onChange={e => setF({ ...f, model: e.target.value })} /></div>
          <div><Label>Quantidade *</Label><Input type="number" value={f.quantity} onChange={e => setF({ ...f, quantity: e.target.value })} /></div>
          <div><Label>Valor Unitário (R$) *</Label><Input type="number" step="0.01" value={f.unit_value} onChange={e => setF({ ...f, unit_value: e.target.value })} /></div>
          <div><Label>Data de Aquisição</Label><Input type="date" value={f.acquired_on} onChange={e => setF({ ...f, acquired_on: e.target.value })} /></div>
          <div><Label>Número de Série</Label><Input value={f.serial_number} onChange={e => setF({ ...f, serial_number: e.target.value })} placeholder="Opcional" /></div>
          <div className="sm:col-span-2"><Label>Observações</Label><Textarea value={f.notes} onChange={e => setF({ ...f, notes: e.target.value })} placeholder="Opcional" /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={submit} disabled={saving} className="bg-slate-900 hover:bg-slate-800">Salvar</Button>
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
    responsible: expense?.responsible ?? "",
  });
  const [saving, setSaving] = useState(false);
  async function submit() {
    if (!f.description.trim() || !f.amount || !f.spent_on) return toast.error("Preencha os campos obrigatórios");
    setSaving(true);
    const payload = {
      description: f.description.trim(),
      amount: Number(f.amount),
      spent_on: f.spent_on,
      notes: f.notes || null,
      responsible: f.responsible || null,
    };
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
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader><DialogTitle>{expense ? "Editar Gasto" : "Novo Gasto de Investimento"}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2"><Label>Descrição *</Label><Input value={f.description} onChange={e => setF({ ...f, description: e.target.value })} placeholder="Ex: Cimento, Arame, Mão de obra..." /></div>
          <div><Label>Valor (R$) *</Label><Input type="number" step="0.01" value={f.amount} onChange={e => setF({ ...f, amount: e.target.value })} /></div>
          <div><Label>Data *</Label><Input type="date" value={f.spent_on} onChange={e => setF({ ...f, spent_on: e.target.value })} /></div>
          <div className="sm:col-span-2">
            <Label>Responsável</Label>
            <select
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
              value={f.responsible}
              onChange={e => setF({ ...f, responsible: e.target.value })}
            >
              <option value="">Selecione…</option>
              {RESPONSIBLES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div className="sm:col-span-2"><Label>Observações</Label><Textarea value={f.notes} onChange={e => setF({ ...f, notes: e.target.value })} placeholder="Opcional" /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={submit} disabled={saving} className="bg-orange-500 hover:bg-orange-600">Cadastrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}