import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { FileDown, ChevronDown } from "lucide-react";
import { brl, monthLabelLong } from "@/lib/format";
import { Suspense, useMemo, useState } from "react";

type Invoice = {
  id: string; client_id: string; reference_date: string;
  uc_number: string; consumption_kw: number; value_without_plant: number;
};
type Client = { id: string; name: string; color: string };

const q = queryOptions({
  queryKey: ["resultado-page"],
  queryFn: async () => {
    const [i, c] = await Promise.all([
      supabase.from("invoices").select("id,client_id,reference_date,uc_number,consumption_kw,value_without_plant"),
      supabase.from("clients").select("id,name,color"),
    ]);
    if (i.error) throw i.error;
    if (c.error) throw c.error;
    return { invoices: (i.data ?? []) as Invoice[], clients: (c.data ?? []) as Client[] };
  },
});

export const Route = createFileRoute("/resultado")({
  loader: ({ context }) => context.queryClient.ensureQueryData(q),
  component: Page,
  head: () => ({
    meta: [
      { title: "Resultado — Usina JJ" },
      { name: "description", content: "Economia gerada por mês e cliente." },
    ],
  }),
});

function Page() {
  return (
    <AppLayout>
      <Suspense fallback={<div>Carregando...</div>}>
        <Resultado />
      </Suspense>
    </AppLayout>
  );
}

function Resultado() {
  const { data } = useSuspenseQuery(q);
  const [clientId, setClientId] = useState<string>("all");
  const monthOptions = useMemo(() => {
    const set = new Set<string>();
    data.invoices.forEach(i => set.add(i.reference_date.slice(0, 7)));
    return [...set].sort().reverse();
  }, [data]);
  const [selectedMonths, setSelectedMonths] = useState<string[]>(monthOptions.slice(0, 1));

  const clientName = (id: string) => data.clients.find(c => c.id === id)?.name ?? "—";
  const clientColor = (id: string) => data.clients.find(c => c.id === id)?.color ?? "#94a3b8";

  const filtered = data.invoices.filter(inv => {
    const mk = inv.reference_date.slice(0, 7);
    if (!selectedMonths.includes(mk)) return false;
    if (clientId !== "all" && inv.client_id !== clientId) return false;
    return true;
  });

  const byMonth = new Map<string, Invoice[]>();
  for (const inv of filtered) {
    const mk = inv.reference_date.slice(0, 7);
    if (!byMonth.has(mk)) byMonth.set(mk, []);
    byMonth.get(mk)!.push(inv);
  }
  const sortedMonths = [...byMonth.keys()].sort().reverse();

  const totalEconomia = filtered.reduce((a, i) => a + Number(i.value_without_plant) * 0.3, 0);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Resultado</h1>
          <p className="text-sm text-muted-foreground">Economia gerada por mês e cliente</p>
        </div>
        <div className="flex gap-2">
          <Select value={clientId} onValueChange={setClientId}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os clientes</SelectItem>
              {data.clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="gap-2">
                {selectedMonths.length} {selectedMonths.length === 1 ? "mês selecionado" : "meses selecionados"}
                <ChevronDown className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="max-h-72 w-56 overflow-auto">
              {monthOptions.map(m => {
                const d = new Date(Number(m.slice(0, 4)), Number(m.slice(5, 7)) - 1, 1);
                const checked = selectedMonths.includes(m);
                return (
                  <label key={m} className="flex cursor-pointer items-center gap-2 py-1.5">
                    <Checkbox checked={checked} onCheckedChange={(v) => {
                      setSelectedMonths(sm => v ? [...sm, m] : sm.filter(x => x !== m));
                    }} />
                    <span className="text-sm">{monthLabelLong(d)}</span>
                  </label>
                );
              })}
              {monthOptions.length === 0 && <p className="text-sm text-muted-foreground">Sem faturas.</p>}
            </PopoverContent>
          </Popover>
          <Button variant="outline" className="gap-2" onClick={() => window.print()}>
            <FileDown className="h-4 w-4" /> Exportar PDF
          </Button>
        </div>
      </div>

      {sortedMonths.map(mk => {
        const d = new Date(Number(mk.slice(0, 4)), Number(mk.slice(5, 7)) - 1, 1);
        return (
          <Card key={mk} className="p-6">
            <h2 className="mb-4 text-lg font-semibold">{monthLabelLong(d)}</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="pb-3 text-left font-medium">Cliente</th>
                    <th className="pb-3 text-left font-medium">UC</th>
                    <th className="pb-3 text-right font-medium">Consumo</th>
                    <th className="pb-3 text-right font-medium">Valor s/ Usina</th>
                    <th className="pb-3 text-right font-medium">c/ 30% Desconto</th>
                    <th className="pb-3 text-right font-medium text-emerald-600">Economia Gerada</th>
                  </tr>
                </thead>
                <tbody>
                  {byMonth.get(mk)!.map(inv => {
                    const semUsina = Number(inv.value_without_plant);
                    const desc = semUsina * 0.7;
                    const eco = semUsina * 0.3;
                    return (
                      <tr key={inv.id} className="border-t">
                        <td className="py-3">
                          <span className="inline-flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: clientColor(inv.client_id) }} />
                            {clientName(inv.client_id)}
                          </span>
                        </td>
                        <td className="py-3 text-muted-foreground">{inv.uc_number}</td>
                        <td className="py-3 text-right">{Number(inv.consumption_kw).toLocaleString("pt-BR")} kW</td>
                        <td className="py-3 text-right">{brl(semUsina)}</td>
                        <td className="py-3 text-right">{brl(desc)}</td>
                        <td className="py-3 text-right font-semibold text-emerald-600">{brl(eco)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        );
      })}

      {sortedMonths.length === 0 && (
        <Card className="p-10 text-center text-muted-foreground">Selecione ao menos um mês com faturas.</Card>
      )}

      <Card className="border-none bg-gradient-to-br from-emerald-500 to-emerald-600 p-8 text-center text-white shadow-lg">
        <div className="text-sm font-medium uppercase tracking-wide opacity-90">Economia total gerada</div>
        <div className="mt-2 text-5xl font-bold">{brl(totalEconomia)}</div>
        <div className="mt-2 text-sm opacity-90">
          {selectedMonths.length} {selectedMonths.length === 1 ? "mês" : "meses"} · {filtered.length} {filtered.length === 1 ? "fatura" : "faturas"}
        </div>
      </Card>
    </div>
  );
}