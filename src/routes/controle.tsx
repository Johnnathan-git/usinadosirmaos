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
import { Plus, Zap, TrendingUp, BarChart3, Pencil, X, Save, RefreshCw, Trash2, ShieldAlert } from "lucide-react";
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
      { title: "Controle da Usina — Usina dos Irmãos" },
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

  useEffect(() => {
    // We still load initial data from DB for convenience, 
    // but we will only update LOCAL state.
    const initialRows = data.clients.map(c => {
      const a = data.allocs.find(x => x.client_id === c.id);
      return {
        client_id: c.id, name: c.name, uc: c.uc_number ?? "", color: c.color,
        pct: a ? Number(a.allocation_pct) : 0,
        avg: a ? Number(a.avg_consumption) : 0,
      };
    });

    // Check if CASA JOHN or CASA JEHN are already in the list
    const hasJohn = initialRows.some(r => r.name.toUpperCase().includes("CASA JOHN"));
    const hasJehn = initialRows.some(r => r.name.toUpperCase().includes("CASA JEHN"));

    if (!hasJohn) {
      initialRows.push({
        client_id: "casa-john-temp",
        name: "CASA JOHN",
        uc: "358186701220",
        color: CLIENT_COLORS[0],
        pct: 2.25,
        avg: 130
      });
    }

    if (!hasJehn) {
      initialRows.push({
        client_id: "casa-jehn-temp",
        name: "CASA JEHN",
        uc: "426058801290",
        color: CLIENT_COLORS[1],
        pct: 2.25,
        avg: 130
      });
    }

    setRows(initialRows);
    setConfig(data.config);
  }, [data]);

  const totalGen = Number(config.panels_count) * Number(config.kw_per_panel);
  const totalConsumo = rows.reduce((s, r) => s + Number(r.avg), 0);
  const totalRateioKw = rows.reduce((s, r) => s + (totalGen * (Number(r.pct) / 100)), 0);
  const totalSaldo = rows.reduce((s, r) => s + (totalGen * (Number(r.pct) / 100) - Number(r.avg)), 0);

  const saldo = totalGen - totalConsumo;
  const aproveitamento = totalGen > 0 ? (totalConsumo / totalGen) * 100 : 0;
  const totalPct = rows.reduce((s, r) => s + Number(r.pct), 0);

  function recalcRateio() {
    if (totalConsumo <= 0) return toast.error("Cadastre consumo médio para recalcular");
    setRows(rs => rs.map(r => ({ ...r, pct: +(Number(r.avg) / totalConsumo * 100).toFixed(2) })));
    toast.success("Rateio recalculado localmente");
  }

  function addTempClient(name: string, uc: string, avg: number, pct: number) {
    const newRow: Row = {
      client_id: crypto.randomUUID(),
      name,
      uc,
      color: CLIENT_COLORS[rows.length % CLIENT_COLORS.length],
      avg,
      pct
    };
    setRows([...rows, newRow]);
    setNewOpen(false);
  }

  function deleteRow(client_id: string) {
    setRows(rs => rs.filter(r => r.client_id !== client_id));
    toast.success("Removido da simulação");
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Cálculo Operacional</h1>
          <p className="text-sm text-muted-foreground">Simulação de geração × consumo e rateio</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setNewOpen(true)} className="h-10 gap-2 bg-primary text-white hover:bg-primary/90 rounded-lg px-4 font-semibold shadow-sm">
            <Plus className="h-4 w-4" /> Novo Cliente
          </Button>
          {editing ? (
            <>
              <Button variant="outline" onClick={recalcRateio} className="h-10 gap-2 border-border bg-card text-foreground hover:bg-background rounded-lg px-4 font-semibold">
                <RefreshCw className="h-4 w-4 text-muted-foreground" /> Recalcular
              </Button>
              <Button onClick={() => setEditing(false)} className="h-10 gap-2 bg-accent text-white hover:bg-accent/90 rounded-lg px-4 font-bold">
                <X className="h-4 w-4" /> Fechar
              </Button>
            </>
          ) : (
            <Button variant="outline" onClick={() => setEditing(true)} className="h-10 gap-2 border-border bg-card text-foreground hover:bg-background rounded-lg px-4 font-semibold">
              <Pencil className="h-4 w-4 text-muted-foreground" /> Editar
            </Button>
          )}
        </div>
      </div>

      <Card className="bg-card border-border rounded-xl p-6 shadow-sm">
        <div className="mb-6 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          <Zap className="h-4 w-4 text-accent" /> Configuração da Usina
        </div>
        <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
          <div>
            <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Nº de placas</Label>
            {editing ? (
              <Input type="number" value={config.panels_count} onChange={e => setConfig({ ...config, panels_count: Number(e.target.value) })} className="mt-2 h-9 border-border bg-background" />
            ) : <div className="num mt-1 text-2xl font-bold text-foreground">{config.panels_count}</div>}
          </div>
          <div>
            <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">kW por placa</Label>
            {editing ? (
              <Input type="number" step="0.01" value={config.kw_per_panel} onChange={e => setConfig({ ...config, kw_per_panel: Number(e.target.value) })} className="mt-2 h-9 border-border bg-background" />
            ) : <div className="num mt-1 text-2xl font-bold text-foreground">{config.kw_per_panel} kW</div>}
          </div>
          <div>
            <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Geração Total</Label>
            <div className="num mt-1 text-2xl font-bold text-foreground">{totalGen.toLocaleString("pt-BR")} kW</div>
          </div>
          <div>
            <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Consumo Total</Label>
            <div className="num mt-1 text-2xl font-bold text-foreground">{totalConsumo.toLocaleString("pt-BR")} kW</div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="bg-card border-border rounded-xl p-6 shadow-sm">
          <div className="mb-2 text-[10px] font-bold uppercase tracking-widest text-profit">Saldo de Energia</div>
          <div className={cn("num text-2xl font-bold", saldo < 0 ? "text-expense" : "text-profit")}>{saldo >= 0 ? "+" : ""}{saldo.toLocaleString("pt-BR")} kW</div>
        </Card>
        <Card className="bg-card border-border rounded-xl p-6 shadow-sm">
          <div className="mb-2 text-[10px] font-bold uppercase tracking-widest text-foreground">Aproveitamento</div>
          <div className="num text-2xl font-bold text-foreground">{aproveitamento.toFixed(1)}%</div>
        </Card>
        <Card className="bg-card border-border rounded-xl p-6 shadow-sm">
          <div className="mb-2 text-[10px] font-bold uppercase tracking-widest text-accent">Status Rateio</div>
          <div className={cn("num text-2xl font-bold", Math.abs(totalPct - 100) < 0.5 ? "text-profit" : "text-expense")}>
            {totalPct.toFixed(2)}%
          </div>
        </Card>
      </div>

      <Card className="bg-card border-border rounded-xl shadow-sm overflow-hidden">
        <div className="border-b border-border bg-background/50 px-6 py-4">
          <h2 className="text-xs font-bold text-foreground uppercase tracking-widest">Rateio da Usina</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-background/20">
                <th className="px-6 py-3.5 text-left text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Cliente</th>
                <th className="px-6 py-3.5 text-center text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Rateio %</th>
                <th className="px-6 py-3.5 text-right text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Alocado</th>
                <th className="px-6 py-3.5 text-center text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Consumo</th>
                <th className="px-6 py-3.5 text-right text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Saldo</th>
                {editing && <th className="px-6 py-3.5"></th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {rows.map((r, idx) => {
                const alloc = totalGen * (Number(r.pct) / 100);
                const saldoCli = alloc - Number(r.avg);
                return (
                  <tr key={r.client_id} className="hover:bg-background/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3 text-sm font-semibold text-foreground uppercase">
                        <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: r.color }} />
                        {r.name}
                      </div>
                      <div className="num mt-0.5 text-[10px] font-medium text-muted-foreground ml-4 uppercase tracking-tighter">UC {r.uc || "—"}</div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {editing
                        ? <Input className="num mx-auto h-8 w-24 text-center border-border bg-background" type="number" step="0.01" value={r.pct}
                            onChange={e => setRows(rs => rs.map((x, i) => i === idx ? { ...x, pct: Number(e.target.value) } : x))} />
                        : <span className="num text-sm font-bold text-foreground">{Number(r.pct).toFixed(2)}%</span>}
                    </td>
                    <td className="num px-6 py-4 text-right text-sm font-medium text-foreground">{alloc.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} kW</td>
                    <td className="px-6 py-4 text-center">
                      {editing
                        ? <Input className="num mx-auto h-8 w-24 text-center border-border bg-background" type="number" value={r.avg}
                            onChange={e => setRows(rs => rs.map((x, i) => i === idx ? { ...x, avg: Number(e.target.value) } : x))} />
                        : <span className="num text-sm font-medium text-foreground">{Number(r.avg).toLocaleString("pt-BR")} kW</span>}
                    </td>
                    <td className={cn("num px-6 py-4 text-right text-sm font-bold", saldoCli < 0 ? "text-expense" : "text-profit")}>
                      {saldoCli >= 0 ? "+" : ""}{saldoCli.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} kW
                    </td>
                    {editing && (
                      <td className="px-6 py-4 text-right">
                        <button onClick={() => deleteRow(r.client_id)} className="p-2 text-muted-foreground hover:text-expense transition-colors">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-background/50">
              <tr>
                <td className="px-6 py-4 text-[10px] font-bold text-foreground uppercase tracking-[0.2em]">Resumo Final</td>
                <td className="num px-6 py-4 text-center text-sm font-bold text-foreground">{totalPct.toFixed(2)}%</td>
                <td className="num px-6 py-4 text-right text-sm font-bold text-foreground">{totalRateioKw.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} kW</td>
                <td className="num px-6 py-4 text-center text-sm font-bold text-foreground">{totalConsumo.toLocaleString("pt-BR")} kW</td>
                <td className={cn("num px-6 py-4 text-right text-sm font-bold", totalSaldo < 0 ? "text-expense" : "text-profit")}>
                  {totalSaldo >= 0 ? "+" : ""}{totalSaldo.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} kW
                </td>
                {editing && <td className="px-6 py-4"></td>}
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>


      {newOpen && (
        <NewSimClientDialog 
          onClose={() => setNewOpen(false)} 
          onAdd={addTempClient}
        />
      )}
    </div>
  );
}

function NewSimClientDialog({ onClose, onAdd }: { onClose: () => void, onAdd: (n: string, u: string, a: number, p: number) => void }) {
  const [f, setF] = useState({ name: "", uc_number: "", avg: "", pct: "", color: CLIENT_COLORS[0] });

  function submit() {
    if (!f.name.trim()) return toast.error("Nome é obrigatório");
    const avgNum = Number(f.avg);
    const pctNum = Number(f.pct);
    if (!Number.isFinite(avgNum) || avgNum <= 0) return toast.error("Consumo médio é obrigatório");
    if (!Number.isFinite(pctNum) || pctNum < 0) return toast.error("Rateio % é obrigatório");
    
    onAdd(f.name.trim(), f.uc_number.trim(), avgNum, pctNum);
    toast.success("Adicionado à simulação");
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
          <Button onClick={submit} className="bg-slate-900 text-white hover:bg-slate-800">Adicionar à Simulação</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}