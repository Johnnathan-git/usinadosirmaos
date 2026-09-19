import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { brl, monthLabelFromISO } from "@/lib/format";
import { Suspense, useMemo, useState } from "react";
import { Printer } from "lucide-react";

type Invoice = {
  id: string;
  client_id: string;
  reference_date: string;
  consumption_kw: number;
  value_without_plant: number;
  client_pays: number;
  distributor_invoice: number;
};
type Client = { id: string; name: string; discount_pct: number };

const q = queryOptions({
  queryKey: ["resultado-page"],
  queryFn: async () => {
    const [i, c] = await Promise.all([
      supabase
        .from("invoices")
        .select("id,client_id,reference_date,consumption_kw,value_without_plant,client_pays,distributor_invoice")
        .order("reference_date", { ascending: false }),
      supabase.from("clients").select("id,name,discount_pct").order("name"),
    ]);
    if (i.error) throw i.error;
    if (c.error) throw c.error;
    return { invoices: (i.data ?? []) as Invoice[], clients: (c.data ?? []) as Client[] };
  },
});

export const Route = createFileRoute("/_app/resultado")({
  ssr: false,
  component: Page,
  head: () => ({
    meta: [
      { title: "Resultado — Usina dos Irmãos" },
      { name: "description", content: "Economia gerada e resultados por período." },
    ],
  }),
});

function Page() {
  return (
    <Suspense fallback={<div>Carregando...</div>}>
      <Resultado />
    </Suspense>
  );
}

function Resultado() {
  const { data } = useSuspenseQuery(q);
  const [clientId, setClientId] = useState<string>("all");
  const [months, setMonths] = useState<string[]>([]);

  const monthOptions = useMemo(() => {
    const set = new Set(data.invoices.map((i) => i.reference_date.slice(0, 7)));
    return [...set].sort().reverse();
  }, [data.invoices]);

  const filtered = useMemo(() => {
    return data.invoices.filter((inv) => {
      if (clientId !== "all" && inv.client_id !== clientId) return false;
      if (months.length && !months.includes(inv.reference_date.slice(0, 7))) return false;
      return true;
    });
  }, [data.invoices, clientId, months]);

  const byMonth = useMemo(() => {
    const map = new Map<string, Invoice[]>();
    for (const inv of filtered) {
      const mk = inv.reference_date.slice(0, 7);
      if (!map.has(mk)) map.set(mk, []);
      map.get(mk)!.push(inv);
    }
    return map;
  }, [filtered]);

  const sortedMonths = [...byMonth.keys()].sort().reverse();

  const totalEco = filtered.reduce((acc, inv) => {
    const c = data.clients.find((x) => x.id === inv.client_id);
    const discountPct = c?.discount_pct ?? 30;
    return acc + Number(inv.value_without_plant) * (discountPct / 100);
  }, 0);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-foreground">Resultado</h1>
          <p className="text-sm font-medium text-muted-foreground">Economia gerada por período</p>
        </div>
        <Button variant="outline" className="gap-2 no-print" onClick={() => window.print()}>
          <Printer className="h-4 w-4" /> Imprimir
        </Button>
      </div>

      <Card className="glass-card grid gap-4 p-6 sm:grid-cols-2 no-print">
        <div>
          <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Cliente</div>
          <Select value={clientId} onValueChange={setClientId}>
            <SelectTrigger className="bg-accent border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {data.clients.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Meses</div>
          <div className="flex flex-wrap gap-2">
            {monthOptions.map((m) => {
              const on = months.includes(m);
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMonths((ms) => (on ? ms.filter((x) => x !== m) : [...ms, m]))}
                  className={`rounded-lg border px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-all ${
                    on
                      ? "bg-primary border-primary text-primary-foreground"
                      : "bg-card border-border text-muted-foreground hover:bg-accent"
                  }`}
                >
                  {monthLabelFromISO(`${m}-01`)}
                </button>
              );
            })}
          </div>
        </div>
      </Card>

      {sortedMonths.map((mk) => (
        <Card key={mk} className="glass-card overflow-hidden p-0">
          <div className="border-b border-border bg-accent/50 px-4 py-3">
            <h2 className="text-sm font-bold text-foreground">{monthLabelFromISO(`${mk}-01`)}</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-sm">
              <thead>
                <tr className="border-b border-border bg-accent light:border-slate-200 light:bg-slate-50">
                  <th className="px-4 py-3 text-center font-bold text-muted-foreground uppercase text-[10px] tracking-wider">Mês</th>
                  <th className="px-4 py-3 text-center font-bold text-muted-foreground uppercase text-[10px] tracking-wider">Consumo (kW)</th>
                  <th className="px-4 py-3 text-center font-bold text-muted-foreground uppercase text-[10px] tracking-wider">Valor s/ Usina</th>
                  <th className="px-4 py-3 text-center font-bold text-muted-foreground uppercase text-[10px] tracking-wider">
                    {clientId !== "all"
                      ? `Valor c/ ${data.clients.find((c) => c.id === clientId)?.discount_pct}% desconto`
                      : "Valor c/ desconto"}
                  </th>
                  <th className="px-4 py-3 text-center font-bold text-muted-foreground uppercase text-[10px] tracking-wider">Economia Gerada</th>
                </tr>
              </thead>
              <tbody>
                {byMonth.get(mk)!.map((inv) => {
                  const c = data.clients.find((x) => x.id === inv.client_id);
                  const discountPct = c?.discount_pct ?? 30;
                  const discountFactor = discountPct / 100;
                  const semUsina = Number(inv.value_without_plant);
                  const desc = semUsina * (1 - discountFactor);
                  const eco = semUsina * discountFactor;
                  return (
                    <tr
                      key={inv.id}
                      className="border-b border-border last:border-0 hover:bg-accent transition-colors zebra-stripe"
                    >
                      <td className="whitespace-nowrap px-4 py-4 text-center text-muted-foreground font-bold">
                        {monthLabelFromISO(inv.reference_date)}
                        {clientId === "all" && c ? (
                          <div className="mt-0.5 text-[10px] font-medium text-muted-foreground">{c.name}</div>
                        ) : null}
                      </td>
                      <td className="num whitespace-nowrap px-4 py-4 text-center text-foreground font-bold">
                        {Number(inv.consumption_kw).toLocaleString("pt-BR")}
                      </td>
                      <td className="num whitespace-nowrap px-4 py-4 text-center text-foreground font-bold">{brl(semUsina)}</td>
                      <td className="num whitespace-nowrap px-4 py-4 text-center text-foreground font-bold">{brl(desc)}</td>
                      <td className="num whitespace-nowrap px-4 py-4 text-center font-bold text-emerald-400 light:text-emerald-600">
                        {brl(eco)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      ))}

      {sortedMonths.length === 0 && (
        <Card className="glass-card p-10 text-center text-muted-foreground">Selecione ao menos um mês com faturas.</Card>
      )}

      <Card className="glass-card border-emerald-500/40 bg-emerald-500/20 p-6 text-center shadow-lg relative overflow-hidden group light:border-emerald-600 light:bg-emerald-600">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-600/20 to-transparent pointer-events-none" />
        <p className="relative text-[10px] font-bold uppercase tracking-widest text-emerald-100 light:text-white/90">Economia total no filtro</p>
        <p className="relative mt-1 text-3xl font-black text-white num-lg">{brl(totalEco)}</p>
      </Card>
    </div>
  );
}
