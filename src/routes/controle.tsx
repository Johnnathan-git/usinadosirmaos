import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Zap, TrendingUp, BarChart3, Pencil, X, Save, RefreshCw, Trash2 } from "lucide-react";
import { Suspense, useEffect, useState } from "react";
import { toast } from "sonner";
import { CLIENT_COLORS } from "@/lib/format";

type Client = { id: string; name: string; uc_number: string | null; color: string; active: boolean };
type Alloc = { client_id: string; allocation_pct: number; avg_consumption: number };
type Config = { panels_count: number; kw_per_panel: number };

const q = queryOptions({
  queryKey: ["controle-page"],
  queryFn: async () => {
    const [c, a, cfg] = await Promise.all([
      supabase.from("clients").select("id,name,uc_number,color,active").eq("active", true),
      supabase.from("client_allocations").select("*"),
      supabase.from("plant_config").select("panels_count,kw_per_panel").eq("id", 1).maybeSingle(),
    ]);
    if (c.error) throw c.error;
    if (a.error) throw a.error;
    if (cfg.error) throw cfg.error;
    return {
      clients: (c.data ?? []) as Client[],
      allocs: (a.data ?? []) as Alloc[],
      config: (cfg.data ?? { panels_count: 0, kw_per_panel: 0 }) as Config,
    };
  },
});

export const Route = createFileRoute("/controle")({
  ssr: false,
  component: Page,
  head: () => ({
    meta: [
      { title: "Controle da Usina — Usina JJ" },
      { name: "description", content: "Geração x consumo e rateio por cliente." },
    ],
  }),
});

function Page() {
  return (
    <AppLayout>
      <Suspense fallback={<div>Carregando...</div>}>
        <Controle />
      </Suspense>
    </AppLayout>
  );
}

type Row = {
  client_id: string; name: string; uc: string; color: string;
  pct: number; avg: number;
};

function Controle() {
  const { data } = useSuspenseQuery(q);
  const [editing, setEditing] = useState(false);
  const [config, setConfig] = useState<Config>(data.config);
  const [rows, setRows] = useState<Row[]>([]);
  const [newOpen, setNewOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setRows(data.clients.map(c => {
      const a = data.allocs.find(x => x.client_id === c.id);
      return {
        client_id: c.id, name: c.name, uc: c.uc_number ?? "", color: c.color,
        pct: a ? Number(a.allocation_pct) : 0,
        avg: a ? Number(a.avg_consumption) : 0,
      };
    }));
    setConfig(data.config);
  }, [data]);

  const totalGen = Number(config.panels_count) * Number(config.kw_per_panel);
  const totalConsumo = rows.reduce((s, r) => s + Number(r.avg), 0);
  const saldo = totalGen - totalConsumo;
  const aproveitamento = totalGen > 0 ? (totalConsumo / totalGen) * 100 : 0;
  const totalPct = rows.reduce((s, r) => s + Number(r.pct), 0);

  function recalcRateio() {
    if (totalConsumo <= 0) return toast.error("Cadastre consumo médio para recalcular");
    setRows(rs => rs.map(r => ({ ...r, pct: +(Number(r.avg) / totalConsumo * 100).toFixed(2) })));
    toast.success("Rateio recalculado");
  }

  async function saveAll() {
    setSaving(true);
    const cfgRes = await supabase.from("plant_config").update({
      panels_count: Number(config.panels_count),
      kw_per_panel: Number(config.kw_per_panel),
    }).eq("id", 1);
    if (cfgRes.error) { setSaving(false); return toast.error(cfgRes.error.message); }
    const payload = rows.map(r => ({
      client_id: r.client_id,
      allocation_pct: Number(r.pct),
      avg_consumption: Number(r.avg),
    }));
    const upsert = await supabase.from("client_allocations").upsert(payload);
    setSaving(false);
    if (upsert.error) return toast.error(upsert.error.message);
    toast.success("Alterações salvas");
    setEditing(false);
    location.reload();
  }

  async function deleteRow(client_id: string) {
    if (!confirm("Remover este cliente do rateio? O cadastro do cliente é mantido.")) return;
    await supabase.from("client_allocations").delete().eq("client_id", client_id);
    setRows(rs => rs.filter(r => r.client_id !== client_id));
    toast.success("Cliente removido do rateio");
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Controle da Usina</h1>
          <p className="text-sm text-muted-foreground">Geração × consumo e rateio por cliente</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setNewOpen(true)} className="gap-2 bg-emerald-500 hover:bg-emerald-600">
            <Plus className="h-4 w-4" /> Novo Cliente
          </Button>
          {editing ? (
            <>
              <Button variant="outline" onClick={recalcRateio} className="gap-2 border-amber-300 text-amber-700 hover:bg-amber-50">
                <RefreshCw className="h-4 w-4" /> Recalcular rateio
              </Button>
              <Button variant="outline" onClick={() => setEditing(false)} className="gap-2 border-rose-300 text-rose-600 hover:bg-rose-50">
                <X className="h-4 w-4" /> Cancelar
              </Button>
              <Button onClick={saveAll} disabled={saving} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
                <Save className="h-4 w-4" /> Salvar
              </Button>
            </>
          ) : (
            <Button variant="outline" onClick={() => setEditing(true)} className="gap-2">
              <Pencil className="h-4 w-4" /> Editar
            </Button>
          )}
        </div>
      </div>

      <Card className="border-amber-200 bg-amber-50/60 p-6">
        <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-amber-700">
          <Zap className="h-4 w-4" /> Geração da Usina
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <div>
            <Label className="text-xs text-muted-foreground">Nº de placas</Label>
            {editing ? (
              <Input type="number" value={config.panels_count} onChange={e => setConfig({ ...config, panels_count: Number(e.target.value) })} />
            ) : <div className="text-2xl font-bold">{config.panels_count}</div>}
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">kW por placa/mês</Label>
            {editing ? (
              <Input type="number" step="0.01" value={config.kw_per_panel} onChange={e => setConfig({ ...config, kw_per_panel: Number(e.target.value) })} />
            ) : <div className="text-2xl font-bold">{config.kw_per_panel} kW</div>}
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Geração total/mês</Label>
            <div className="text-2xl font-bold text-amber-700">{totalGen.toLocaleString("pt-BR")} kW</div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Consumo total clientes</Label>
            <div className="text-2xl font-bold">{totalConsumo.toLocaleString("pt-BR")} kW</div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="border-emerald-200 bg-emerald-50/60 p-5">
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-emerald-700"><TrendingUp className="h-4 w-4" /> Saldo de Energia</div>
          <div className={`text-2xl font-bold ${saldo < 0 ? "text-rose-600" : "text-emerald-700"}`}>{saldo >= 0 ? "+" : ""}{saldo.toLocaleString("pt-BR")} kW</div>
          <div className="mt-1 text-xs text-emerald-700/70">{saldo >= 0 ? "Sobra de energia gerada" : "Consumo excede geração"}</div>
        </Card>
        <Card className="border-blue-200 bg-blue-50/60 p-5">
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-blue-700"><BarChart3 className="h-4 w-4" /> Aproveitamento</div>
          <div className="text-2xl font-bold text-blue-700">{aproveitamento.toFixed(1)}%</div>
          <div className="mt-1 text-xs text-blue-700/70">Do total gerado utilizado</div>
        </Card>
        <Card className="p-5">
          <div className="mb-2 flex items-center gap-2 text-sm font-medium"><Zap className="h-4 w-4" /> Rateio total alocado</div>
          <div className={`text-2xl font-bold ${Math.abs(totalPct - 100) < 0.5 ? "text-emerald-600" : "text-amber-600"}`}>
            {totalPct.toFixed(2)}%
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            {Math.abs(totalPct - 100) < 0.5 ? "✓ Rateio 100% alocado" : "Ajuste para 100%"}
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Rateio por Cliente</h2>
          <span className="text-xs text-muted-foreground">{rows.length} cliente(s)</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-wide text-muted-foreground">
                <th className="pb-3 text-left font-medium">Cliente</th>
                <th className="pb-3 text-left font-medium">Unid. Consumidora</th>
                <th className="pb-3 text-center font-medium">Rateio %</th>
                <th className="pb-3 text-right font-medium">kW Alocado/Mês</th>
                <th className="pb-3 text-center font-medium">Consumo Médio</th>
                <th className="pb-3 text-right font-medium">Saldo Cliente</th>
                {editing && <th></th>}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, idx) => {
                const alloc = totalGen * (Number(r.pct) / 100);
                const saldoCli = alloc - Number(r.avg);
                return (
                  <tr key={r.client_id} className="border-t">
                    <td className="py-3 font-medium uppercase">
                      <span className="inline-flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: r.color }} />
                        {r.name}
                      </span>
                    </td>
                    <td className="py-3 text-muted-foreground">{r.uc || "—"}</td>
                    <td className="py-3 text-center">
                      {editing
                        ? <Input className="mx-auto w-24 text-center" type="number" step="0.01" value={r.pct}
                            onChange={e => setRows(rs => rs.map((x, i) => i === idx ? { ...x, pct: Number(e.target.value) } : x))} />
                        : `${Number(r.pct).toFixed(2)}%`}
                    </td>
                    <td className="py-3 text-right">{alloc.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} kW</td>
                    <td className="py-3 text-center">
                      {editing
                        ? <Input className="mx-auto w-24 text-center" type="number" value={r.avg}
                            onChange={e => setRows(rs => rs.map((x, i) => i === idx ? { ...x, avg: Number(e.target.value) } : x))} />
                        : `${Number(r.avg).toLocaleString("pt-BR")} kW`}
                    </td>
                    <td className={`py-3 text-right font-semibold ${saldoCli < 0 ? "text-rose-600" : "text-emerald-600"}`}>
                      {saldoCli >= 0 ? "+" : ""}{saldoCli.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} kW
                    </td>
                    {editing && (
                      <td className="py-3 pl-2 text-right">
                        <button onClick={() => deleteRow(r.client_id)} className="text-muted-foreground hover:text-rose-600">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
          {rows.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">Nenhum cliente ativo.</p>}
        </div>
      </Card>

      {newOpen && <NewClientDialog onClose={() => setNewOpen(false)} />}
    </div>
  );
}

function NewClientDialog({ onClose }: { onClose: () => void }) {
  const [f, setF] = useState({ name: "", uc_number: "", avg: "", pct: "", color: CLIENT_COLORS[0] });
  const [saving, setSaving] = useState(false);
  async function submit() {
    if (!f.name.trim()) return toast.error("Nome é obrigatório");
    const avgNum = Number(f.avg);
    const pctNum = Number(f.pct);
    if (!Number.isFinite(avgNum) || avgNum <= 0) return toast.error("Consumo médio é obrigatório");
    if (!Number.isFinite(pctNum) || pctNum < 0) return toast.error("Rateio % é obrigatório");
    setSaving(true);
    const { data: created, error } = await supabase.from("clients").insert({
      name: f.name.trim(), uc_number: f.uc_number.trim(), color: f.color, active: true,
    }).select("id").single();
    if (error || !created) { setSaving(false); return toast.error(error?.message ?? "Erro ao criar cliente"); }
    const { error: aerr } = await supabase.from("client_allocations").insert({
      client_id: created.id, allocation_pct: pctNum, avg_consumption: avgNum,
    });
    setSaving(false);
    if (aerr) return toast.error(aerr.message);
    toast.success("Cliente cadastrado");
    location.reload();
  }
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Novo Cliente</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Nome do cliente *</Label><Input value={f.name} onChange={e => setF({ ...f, name: e.target.value })} placeholder="Ex: JOÃO SILVA" /></div>
          <div><Label>Unidade Consumidora (UC)</Label><Input value={f.uc_number} onChange={e => setF({ ...f, uc_number: e.target.value })} placeholder="Ex: 303007001223" /></div>
          <div><Label>Consumo médio mensal (kW) *</Label><Input type="number" value={f.avg} onChange={e => setF({ ...f, avg: e.target.value })} placeholder="Ex: 500" /></div>
          <div><Label>Rateio % *</Label><Input type="number" step="0.01" value={f.pct} onChange={e => setF({ ...f, pct: e.target.value })} placeholder="Ex: 8.20" /></div>
          <div>
            <Label>Cor</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {CLIENT_COLORS.map(c => (
                <button key={c} type="button" onClick={() => setF({ ...f, color: c })}
                  className={`h-8 w-8 rounded-full ring-offset-2 ${f.color === c ? "ring-2 ring-foreground" : ""}`}
                  style={{ backgroundColor: c }} />
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={submit} disabled={saving} className="bg-emerald-500 hover:bg-emerald-600">Adicionar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}