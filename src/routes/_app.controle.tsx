import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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

export const Route = createFileRoute("/_app/controle")({
  ssr: false,
  component: Page,
  head: () => ({
    meta: [
      { title: "Controle ADM — Usina dos Irmãos" },
      { name: "description", content: "Geração x consumo e rateio por cliente." },
    ],
  }),
});

function Page() {
  return (
    <Suspense fallback={<div>Carregando...</div>}>
      <Controle />
    </Suspense>
  );
}

function Controle() {
  const { data, refetch } = useSuspenseQuery(q);
  const [cfg, setCfg] = useState(data.config);
  const [allocMap, setAllocMap] = useState<Record<string, Alloc>>(() => {
    const m: Record<string, Alloc> = {};
    for (const a of data.allocs) m[a.client_id] = a;
    for (const c of data.clients) {
      if (!m[c.id]) m[c.id] = { client_id: c.id, allocation_pct: 0, avg_consumption: 0 };
    }
    return m;
  });
  const [tempClients, setTempClients] = useState<{ id: string; name: string; uc_number: string; color: string }[]>([]);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newOpen, setNewOpen] = useState(false);

  useEffect(() => {
    setCfg(data.config);
    const m: Record<string, Alloc> = {};
    for (const a of data.allocs) m[a.client_id] = a;
    for (const c of data.clients) {
      if (!m[c.id]) m[c.id] = { client_id: c.id, allocation_pct: 0, avg_consumption: 0 };
    }
    setAllocMap(m);
  }, [data]);

  const allClients = [
    ...data.clients.map((c) => ({ id: c.id, name: c.name, uc_number: c.uc_number || "", color: c.color })),
    ...tempClients,
  ];

  const totalKw = Number(cfg.panels_count) * Number(cfg.kw_per_panel);
  const totalPct = allClients.reduce((s, c) => s + Number(allocMap[c.id]?.allocation_pct || 0), 0);
  const totalAvg = allClients.reduce((s, c) => s + Number(allocMap[c.id]?.avg_consumption || 0), 0);

  function recalcRateio() {
    if (totalAvg <= 0) return toast.error("Informe consumos médios antes de recalcular");
    const next = { ...allocMap };
    for (const c of allClients) {
      const avg = Number(next[c.id]?.avg_consumption || 0);
      const pct = (avg / totalAvg) * 100;
      next[c.id] = {
        client_id: c.id,
        allocation_pct: Math.round(pct * 100) / 100,
        avg_consumption: avg,
      };
    }
    setAllocMap(next);
    toast.success("Rateio recalculado pelo consumo médio");
  }

  function addTempClient(name: string, uc: string, avg: number, pct: number) {
    const id = `temp-${crypto.randomUUID()}`;
    setTempClients((t) => [...t, { id, name, uc_number: uc, color: CLIENT_COLORS[t.length % CLIENT_COLORS.length] }]);
    setAllocMap((m) => ({
      ...m,
      [id]: { client_id: id, allocation_pct: pct, avg_consumption: avg },
    }));
  }

  function deleteRow(client_id: string) {
    if (client_id.startsWith("temp-")) {
      setTempClients((t) => t.filter((x) => x.id !== client_id));
      setAllocMap((m) => {
        const n = { ...m };
        delete n[client_id];
        return n;
      });
      return;
    }
    toast.message("Clientes cadastrados são removidos em Faturas e Clientes");
  }

  async function saveAll() {
    setSaving(true);
    const { error: e1 } = await supabase.from("plant_config").upsert({
      id: 1,
      panels_count: Number(cfg.panels_count),
      kw_per_panel: Number(cfg.kw_per_panel),
    });
    if (e1) {
      setSaving(false);
      return toast.error(e1.message);
    }
    const rows = Object.values(allocMap)
      .filter((a) => !String(a.client_id).startsWith("temp-"))
      .map((a) => ({
        client_id: a.client_id,
        allocation_pct: Number(a.allocation_pct) || 0,
        avg_consumption: Number(a.avg_consumption) || 0,
      }));
    const { error: e2 } = await supabase.from("client_allocations").upsert(rows, { onConflict: "client_id" });
    setSaving(false);
    if (e2) return toast.error(e2.message);
    toast.success("Controle ADM salvo");
    setEditing(false);
    setTempClients([]);
    refetch();
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="truncate text-4xl font-bold tracking-tight text-foreground">Controle ADM</h1>
          <p className="text-sm font-medium text-muted-foreground">Geração da usina e rateio por cliente</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {!editing ? (
            <Button onClick={() => setEditing(true)} className="gap-2 font-bold">
              <Pencil className="h-4 w-4" /> Editar
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => setEditing(false)} className="gap-2">
                <X className="h-4 w-4" /> Cancelar
              </Button>
              <Button variant="outline" onClick={recalcRateio} className="gap-2">
                <RefreshCw className="h-4 w-4" /> Recalcular rateio
              </Button>
              <Button onClick={() => setNewOpen(true)} variant="outline" className="gap-2">
                <Plus className="h-4 w-4" /> Simular cliente
              </Button>
              <Button onClick={saveAll} disabled={saving} className="gap-2 font-bold bg-primary">
                <Save className="h-4 w-4" /> {saving ? "Salvando..." : "Salvar"}
              </Button>
            </>
          )}
        </div>
      </div>

      {totalPct > 100.5 || totalPct < 99.5 ? (
        <Card className="border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 flex items-start gap-2">
          <ShieldAlert className="h-4 w-4 mt-0.5 shrink-0" />
          Soma do rateio está em {totalPct.toFixed(2)}%. Idealmente 100%.
        </Card>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="glass-card p-5">
          <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            <Zap className="h-4 w-4" /> Painéis
          </div>
          {editing ? (
            <Input type="number" value={cfg.panels_count} onChange={(e) => setCfg({ ...cfg, panels_count: Number(e.target.value) })} />
          ) : (
            <div className="text-2xl font-bold">{cfg.panels_count}</div>
          )}
        </Card>
        <Card className="glass-card p-5">
          <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            <TrendingUp className="h-4 w-4" /> kW / painel
          </div>
          {editing ? (
            <Input type="number" step="0.01" value={cfg.kw_per_panel} onChange={(e) => setCfg({ ...cfg, kw_per_panel: Number(e.target.value) })} />
          ) : (
            <div className="text-2xl font-bold">{cfg.kw_per_panel}</div>
          )}
        </Card>
        <Card className="glass-card p-5">
          <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            <BarChart3 className="h-4 w-4" /> Geração total (kW)
          </div>
          <div className="text-2xl font-bold text-primary">
            {totalKw.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}
          </div>
        </Card>
      </div>

      <Card className="glass-card p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-bold">Rateio por cliente</h2>
          <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Total %:{" "}
            <span className={totalPct > 100.01 || totalPct < 99.99 ? "text-rose-600" : "text-emerald-600"}>
              {totalPct.toFixed(2)}%
            </span>
          </div>
        </div>
        <div className="space-y-3">
          {allClients.map((c) => {
            const a = allocMap[c.id] ?? { client_id: c.id, allocation_pct: 0, avg_consumption: 0 };
            const shareKw = (totalKw * Number(a.allocation_pct || 0)) / 100;
            return (
              <div
                key={c.id}
                className="grid grid-cols-1 gap-3 rounded-xl border border-border p-4 sm:grid-cols-[1fr_120px_140px_120px_40px]"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                    style={{ backgroundColor: c.color || CLIENT_COLORS[0] }}
                  >
                    {(c.name || "?")[0]}
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold truncate">{c.name}</div>
                    <div className="text-xs text-muted-foreground">UC {c.uc_number || "—"}</div>
                  </div>
                </div>
                <div>
                  <Label className="text-[10px] uppercase">% Rateio</Label>
                  {editing ? (
                    <Input
                      type="number"
                      step="0.01"
                      value={a.allocation_pct}
                      onChange={(e) =>
                        setAllocMap({
                          ...allocMap,
                          [c.id]: { ...a, allocation_pct: Number(e.target.value) },
                        })
                      }
                    />
                  ) : (
                    <div className="font-bold">{Number(a.allocation_pct).toFixed(2)}%</div>
                  )}
                </div>
                <div>
                  <Label className="text-[10px] uppercase">Consumo médio</Label>
                  {editing ? (
                    <Input
                      type="number"
                      step="0.01"
                      value={a.avg_consumption}
                      onChange={(e) =>
                        setAllocMap({
                          ...allocMap,
                          [c.id]: { ...a, avg_consumption: Number(e.target.value) },
                        })
                      }
                    />
                  ) : (
                    <div className="font-bold">{Number(a.avg_consumption).toLocaleString("pt-BR")}</div>
                  )}
                </div>
                <div>
                  <Label className="text-[10px] uppercase">kW alocado</Label>
                  <div className="font-bold text-primary">
                    {shareKw.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}
                  </div>
                </div>
                {editing && String(c.id).startsWith("temp-") ? (
                  <button type="button" onClick={() => deleteRow(c.id)} className="text-muted-foreground hover:text-rose-600 self-center">
                    <Trash2 className="h-4 w-4" />
                  </button>
                ) : (
                  <div />
                )}
              </div>
            );
          })}
        </div>
      </Card>

      {newOpen && (
        <NewSimClientDialog onClose={() => setNewOpen(false)} onAdd={addTempClient} />
      )}
    </div>
  );
}

function NewSimClientDialog({
  onClose,
  onAdd,
}: {
  onClose: () => void;
  onAdd: (n: string, u: string, a: number, p: number) => void;
}) {
  const [name, setName] = useState("");
  const [uc, setUc] = useState("");
  const [avg, setAvg] = useState("");
  const [pct, setPct] = useState("0");

  function submit() {
    if (!name.trim()) return toast.error("Informe o nome");
    onAdd(name.trim(), uc.trim(), Number(avg) || 0, Number(pct) || 0);
    onClose();
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="glass-card border-border text-foreground max-w-md">
        <DialogHeader>
          <DialogTitle className="text-foreground">Simular cliente</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Nome</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label>UC</Label>
            <Input value={uc} onChange={(e) => setUc(e.target.value)} />
          </div>
          <div>
            <Label>Consumo médio</Label>
            <Input type="number" value={avg} onChange={(e) => setAvg(e.target.value)} />
          </div>
          <div>
            <Label>% Rateio inicial</Label>
            <Input type="number" step="0.01" value={pct} onChange={(e) => setPct(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={submit}>Adicionar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
