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
    toast.success("Removido localmente");
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="grid gap-3 sm:flex sm:flex-wrap sm:items-start sm:justify-between">
        <div>
          <h1 className="truncate text-4xl font-bold tracking-tight text-foreground">Controle</h1>
          <p className="text-sm font-medium text-foreground/40">Geração × consumo e rateio (uso exclusivo para cálculos)</p>
        </div>
        <div className="flex flex-wrap gap-2 [&>*]:flex-1 sm:[&>*]:flex-none">
          <Button onClick={() => setNewOpen(true)} className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg px-4 py-2 font-bold shadow-lg shadow-primary/20">
            <Plus className="h-4 w-4" /> Novo Cliente
          </Button>
          {editing ? (
            <>
              <Button variant="outline" onClick={recalcRateio} className="gap-2 border border-white/10 bg-white/5 text-white/70 hover:text-white rounded-lg px-4 py-2 font-bold">
                <RefreshCw className="h-4 w-4" /> Recalcular rateio
              </Button>
              <Button onClick={() => setEditing(false)} className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg px-4 py-2 font-bold">
                <X className="h-4 w-4" /> Finalizar Edição
              </Button>
            </>
          ) : (
            <Button variant="outline" onClick={() => setEditing(true)} className="gap-2 border border-white/10 bg-white/5 text-white/70 hover:text-white rounded-lg px-4 py-2 font-bold">
              <Pencil className="h-4 w-4" /> Editar
            </Button>
          )}
        </div>
      </div>

      <Card className="glass-card p-6">
        <div className="mb-6 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-white/40">
          <Zap className="h-4 w-4 text-primary" /> Geração da Usina
        </div>
        <div className="grid grid-cols-1 gap-4 xs:grid-cols-2 md:grid-cols-4">
          <div>
            <Label className="text-[10px] font-bold uppercase tracking-wider text-foreground/40">Nº de placas</Label>
            {editing ? (
              <Input type="number" value={config.panels_count} onChange={e => setConfig({ ...config, panels_count: Number(e.target.value) })} className="mt-1 border-white/10 bg-white/5 text-foreground" />
            ) : <div className="text-2xl font-bold text-foreground num-lg">{config.panels_count}</div>}
          </div>
          <div>
            <Label className="text-[10px] font-bold uppercase tracking-wider text-foreground/40">kW por placa/mês</Label>
            {editing ? (
              <Input type="number" step="0.01" value={config.kw_per_panel} onChange={e => setConfig({ ...config, kw_per_panel: Number(e.target.value) })} className="mt-1 border-white/10 bg-white/5 text-foreground" />
            ) : <div className="text-2xl font-bold text-foreground num-lg">{config.kw_per_panel} kW</div>}
          </div>
          <div>
            <Label className="text-[10px] font-bold uppercase tracking-wider text-foreground/40">Geração total/mês</Label>
            <div className="text-2xl font-bold text-foreground num-lg">{totalGen.toLocaleString("pt-BR")} kW</div>
          </div>
          <div>
            <Label className="text-[10px] font-bold uppercase tracking-wider text-foreground/40">Consumo total clientes</Label>
            <div className="text-2xl font-bold text-foreground num-lg">{totalConsumo.toLocaleString("pt-BR")} kW</div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="glass-card p-5">
          <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-foreground/40"><TrendingUp className="h-4 w-4 text-emerald-400" /> Saldo de Energia</div>
          <div className={`text-2xl font-bold num-lg ${saldo < 0 ? "text-red-400" : "text-emerald-400"}`}>{saldo >= 0 ? "+" : ""}{saldo.toLocaleString("pt-BR")} kW</div>
          <div className="mt-1 text-[10px] text-foreground/20 font-bold uppercase tracking-tight">{saldo >= 0 ? "Sobra de energia gerada" : "Consumo excede geração"}</div>
        </Card>
        <Card className="glass-card p-5">
          <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-foreground/40"><BarChart3 className="h-4 w-4 text-foreground/60" /> Aproveitamento</div>
          <div className="text-2xl font-bold text-foreground num-lg">{aproveitamento.toFixed(1)}%</div>
          <div className="mt-1 text-[10px] text-foreground/20 font-bold uppercase tracking-tight">Do total gerado utilizado</div>
        </Card>
        <Card className="glass-card p-5">
          <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-foreground/40"><Zap className="h-4 w-4 text-emerald-400" /> Rateio total alocado</div>
          <div className={`text-2xl font-bold num-lg ${Math.abs(totalPct - 100) < 0.5 ? "text-emerald-400" : "text-red-400"}`}>
            {totalPct.toFixed(2)}%
          </div>
          <div className="mt-1 text-[10px] text-foreground/20 font-bold uppercase tracking-tight">
            {Math.abs(totalPct - 100) < 0.5 ? "✓ Rateio 100% alocado" : "Ajuste para 100%"}
          </div>
        </Card>
      </div>

      <Card className="glass-card p-6 overflow-hidden">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground">Rateio por Cliente</h2>
          <span className="text-[10px] font-bold text-foreground/40 uppercase tracking-wider">{rows.length} cliente(s)</span>
        </div>
        <div className="overflow-x-auto -mx-6 px-6 scrollbar-hide">
          <table className="w-full text-sm min-w-[700px]">
            <thead>
              <tr className="border-b border-white/5">
                <th className="pb-3 text-left font-bold text-foreground/40 uppercase text-[10px] tracking-wider">Cliente</th>
                <th className="pb-3 text-left font-bold text-foreground/40 uppercase text-[10px] tracking-wider">Unid. Consumidora</th>
                <th className="pb-3 text-center font-bold text-foreground/40 uppercase text-[10px] tracking-wider">Rateio %</th>
                <th className="pb-3 text-right font-bold text-foreground/40 uppercase text-[10px] tracking-wider">kW Alocado/Mês</th>
                <th className="pb-3 text-center font-bold text-foreground/40 uppercase text-[10px] tracking-wider">Consumo Médio</th>
                <th className="pb-3 text-right font-bold text-foreground/40 uppercase text-[10px] tracking-wider">Saldo Cliente</th>
                {editing && <th></th>}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, idx) => {
                const alloc = totalGen * (Number(r.pct) / 100);
                const saldoCli = alloc - Number(r.avg);
                return (
                  <tr key={r.client_id} className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors zebra-stripe">
                    <td className="py-4 font-bold text-foreground uppercase">
                      <span className="inline-flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full shadow-sm" style={{ backgroundColor: r.color }} />
                        {r.name}
                      </span>
                    </td>
                    <td className="py-4 text-foreground/60">{r.uc || "—"}</td>
                    <td className="py-4 text-center">
                      {editing
                        ? <Input className="mx-auto w-24 text-center border-white/10 bg-white/5 text-foreground" type="number" step="0.01" value={r.pct}
                            onChange={e => setRows(rs => rs.map((x, i) => i === idx ? { ...x, pct: Number(e.target.value) } : x))} />
                        : <span className="font-bold text-foreground num">{Number(r.pct).toFixed(2)}%</span>}
                    </td>
                    <td className="py-4 text-right text-white font-bold num">{alloc.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} kW</td>
                    <td className="py-4 text-center">
                      {editing
                        ? <Input className="mx-auto w-24 text-center border-white/10 bg-white/5 text-white" type="number" value={r.avg}
                            onChange={e => setRows(rs => rs.map((x, i) => i === idx ? { ...x, avg: Number(e.target.value) } : x))} />
                        : <span className="font-bold text-white num">{Number(r.avg).toLocaleString("pt-BR")} kW</span>}
                    </td>
                    <td className={`py-4 text-right font-bold num ${saldoCli < 0 ? "text-red-400" : "text-emerald-400"}`}>
                      {saldoCli >= 0 ? "+" : ""}{saldoCli.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} kW
                    </td>
                    {editing && (
                      <td className="py-4 pl-4 text-right">
                        <button
                          title="Remover da simulação"
                          onClick={() => deleteRow(r.client_id)}
                          className="text-white/30 hover:text-red-400"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="border-t border-white/10 bg-white/5">
              <tr>
                <td className="py-4 px-4 font-bold text-white uppercase text-[10px] tracking-wider">TOTAIS</td>
                <td className="py-4"></td>
                <td className="py-4 text-center font-bold text-white num">{totalPct.toFixed(2)}%</td>
                <td className="py-4 text-right font-bold text-white num">{totalRateioKw.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} kW</td>
                <td className="py-4 text-center font-bold text-white num">{totalConsumo.toLocaleString("pt-BR")} kW</td>
                <td className={`py-4 text-right font-bold num ${totalSaldo < 0 ? "text-red-400" : "text-emerald-400"}`}>
                  {totalSaldo >= 0 ? "+" : ""}{totalSaldo.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} kW
                </td>
                {editing && <td></td>}
              </tr>
            </tfoot>
          </table>
          {rows.length === 0 && <p className="py-8 text-center text-sm text-white/40">Nenhum cliente ativo.</p>}
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
    toast.success("Adicionado com sucesso");
  }
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="glass-card border-white/10 text-white max-w-md">
        <DialogHeader><DialogTitle className="text-white text-glow">Novo Cliente</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label className="text-white/40">Nome do cliente *</Label><Input value={f.name} onChange={e => setF({ ...f, name: e.target.value })} placeholder="Ex: JOÃO SILVA" className="bg-white/5 border-white/10 text-white" /></div>
          <div><Label className="text-white/40">Unidade Consumidora (UC)</Label><Input value={f.uc_number} onChange={e => setF({ ...f, uc_number: e.target.value })} placeholder="Ex: 303007001223" className="bg-white/5 border-white/10 text-white" /></div>
          <div><Label className="text-white/40">Consumo médio mensal (kW) *</Label><Input type="number" value={f.avg} onChange={e => setF({ ...f, avg: e.target.value })} placeholder="Ex: 500" className="bg-white/5 border-white/10 text-white" /></div>
          <div><Label className="text-white/40">Rateio % *</Label><Input type="number" step="0.01" value={f.pct} onChange={e => setF({ ...f, pct: e.target.value })} placeholder="Ex: 8.20" className="bg-white/5 border-white/10 text-white" /></div>
          <div>
            <Label className="text-white/40">Cor</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {CLIENT_COLORS.map(c => (
                <button key={c} type="button" onClick={() => setF({ ...f, color: c })}
                  className={`h-8 w-8 rounded-full ring-offset-2 transition-all ${f.color === c ? "ring-2 ring-white scale-110" : "hover:scale-105"}`}
                  style={{ backgroundColor: c }} />
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="border-white/10 text-white/40 hover:text-white hover:bg-white/5">Cancelar</Button>
          <Button onClick={submit} className="bg-primary text-primary-foreground hover:bg-primary/90 font-bold">Adicionar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}