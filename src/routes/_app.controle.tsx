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
  const { data } = useSuspenseQuery(q);
  const [cfg, setCfg] = useState(data.config);
  const [allocs, setAllocs] = useState(() => {
    const map: Record<string, Alloc> = {};
    for (const a of data.allocs) map[a.client_id] = a;
    for (const c of data.clients) {
      if (!map[c.id]) map[c.id] = { client_id: c.id, allocation_pct: 0, avg_consumption: 0 };
    }
    return map;
  });
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const totalKw = Number(cfg.panels_count) * Number(cfg.kw_per_panel);
  const totalPct = Object.values(allocs).reduce((s, a) => s + Number(a.allocation_pct || 0), 0);
  const totalAvg = Object.values(allocs).reduce((s, a) => s + Number(a.avg_consumption || 0), 0);

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
    const rows = Object.values(allocs).map((a) => ({
      client_id: a.client_id,
      allocation_pct: Number(a.allocation_pct) || 0,
      avg_consumption: Number(a.avg_consumption) || 0,
    }));
    const { error: e2 } = await supabase.from("client_allocations").upsert(rows, { onConflict: "client_id" });
    setSaving(false);
    if (e2) return toast.error(e2.message);
    toast.success("Controle ADM salvo");
    setEditing(false);
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="truncate text-4xl font-bold tracking-tight text-foreground">Controle ADM</h1>
          <p className="text-sm font-medium text-muted-foreground">Geração da usina e rateio por cliente</p>
        </div>
        <div className="flex gap-2">
          {!editing ? (
            <Button onClick={() => setEditing(true)} className="gap-2 font-bold">
              <Pencil className="h-4 w-4" /> Editar
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => setEditing(false)} className="gap-2">
                <X className="h-4 w-4" /> Cancelar
              </Button>
              <Button onClick={saveAll} disabled={saving} className="gap-2 font-bold bg-primary">
                <Save className="h-4 w-4" /> {saving ? "Salvando..." : "Salvar"}
              </Button>
            </>
          )}
        </div>
      </div>

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
          <div className="text-2xl font-bold text-primary">{totalKw.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}</div>
        </Card>
      </div>

      <Card className="glass-card p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-bold">Rateio por cliente</h2>
          <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Total %: <span className={totalPct > 100.01 || totalPct < 99.99 ? "text-rose-600" : "text-emerald-600"}>{totalPct.toFixed(2)}%</span>
          </div>
        </div>
        <div className="space-y-3">
          {data.clients.map((c) => {
            const a = allocs[c.id] ?? { client_id: c.id, allocation_pct: 0, avg_consumption: 0 };
            const shareKw = (totalKw * Number(a.allocation_pct || 0)) / 100;
            return (
              <div key={c.id} className="grid grid-cols-1 gap-3 rounded-xl border border-border p-4 sm:grid-cols-[1fr_120px_140px_120px]">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold text-white" style={{ backgroundColor: c.color || CLIENT_COLORS[0] }}>
                    {(c.name || "?")[0]}
                  </div>
                  <div>
                    <div className="font-bold">{c.name}</div>
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
                      onChange={(e) => setAllocs({ ...allocs, [c.id]: { ...a, allocation_pct: Number(e.target.value) } })}
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
                      onChange={(e) => setAllocs({ ...allocs, [c.id]: { ...a, avg_consumption: Number(e.target.value) } })}
                    />
                  ) : (
                    <div className="font-bold">{Number(a.avg_consumption).toLocaleString("pt-BR")}</div>
                  )}
                </div>
                <div>
                  <Label className="text-[10px] uppercase">kW alocado</Label>
                  <div className="font-bold text-primary">{shareKw.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}</div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
