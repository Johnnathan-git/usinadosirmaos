import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ChevronDown } from "lucide-react";
import { brl, monthLabelFromISO } from "@/lib/format";
import { Suspense, useEffect, useMemo, useState } from "react";

type Invoice = {
  id: string; client_id: string; reference_date: string;
  value_without_plant: number; client_pays: number; distributor_invoice: number;
};
type Client = { id: string; name: string; discount_pct: number; color: string };

const resultadoQ = queryOptions({
  queryKey: ["resultado-page"],
  staleTime: 30_000,
  queryFn: async () => {
    const [i, c] = await Promise.all([
      supabase
        .from("invoices")
        .select("id,client_id,reference_date,value_without_plant,client_pays,distributor_invoice")
        .order("reference_date", { ascending: false }),
      supabase.from("clients").select("id,name,discount_pct,color").eq("active", true).order("name"),
    ]);
    if (i.error) throw i.error;
    if (c.error) throw c.error;
    return {
      invoices: (i.data ?? []) as Invoice[],
      clients: (c.data ?? []) as Client[],
    };
  },
});

export const Route = createFileRoute("/_app/resultado")({
  ssr: false,
  component: Page,
  head: () => ({
    meta: [
      { title: "Resultado — Usina dos Irmãos" },
      { name: "description", content: "Economia gerada por cliente e período." },
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
  const { data } = useSuspenseQuery(resultadoQ);
  const [clientId, setClientId] = useState<string>(data.clients[0]?.id ?? "");
  const [selectedMonths, setSelectedMonths] = useState<string[]>([]);

  const monthOptions = useMemo(() => {
    const invs = data.invoices.filter((i) => !clientId || i.client_id === clientId);
    const set = new Set(invs.map((i) => i.reference_date.slice(0, 7)));
    return [...set].sort().reverse();
  }, [data.invoices, clientId]);

  useEffect(() => {
    setSelectedMonths((prev) => prev.filter((m) => monthOptions.includes(m)));
  }, [monthOptions]);

  const rows = useMemo(() => {
    if (!clientId || selectedMonths.length === 0) return [];
    const client = data.clients.find((c) => c.id === clientId);
    const invs = data.invoices.filter(
      (i) => i.client_id === clientId && selectedMonths.includes(i.reference_date.slice(0, 7)),
    );
    return invs.map((inv) => {
      const sem = Number(inv.value_without_plant);
      const com = Number(inv.client_pays);
      const economia = sem - com;
      const pct = client?.discount_pct ?? 0;
      return {
        id: inv.id,
        mes: monthLabelFromISO(inv.reference_date),
        sem,
        com,
        economia,
        pct,
      };
    });
  }, [data, clientId, selectedMonths]);

  const totalEconomia = rows.reduce((a, r) => a + r.economia, 0);

  function toggleMonth(m: string) {
    setSelectedMonths((prev) =>
      prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m],
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div>
        <h1 className="truncate text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Resultado</h1>
        <p className="text-sm text-muted-foreground">Economia gerada por cliente</p>
      </div>

      <Card className="glass-card grid gap-4 p-4 sm:grid-cols-2">
        <div>
          <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Cliente</div>
          <Select value={clientId} onValueChange={(v) => { setClientId(v); setSelectedMonths([]); }}>
            <SelectTrigger className="bg-accent border-border">
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              {data.clients.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Meses</div>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-between bg-accent border-border">
                <span className="truncate text-sm">
                  {selectedMonths.length === 0
                    ? "Selecionar meses"
                    : selectedMonths.length === 1
                      ? monthLabelFromISO(`${selectedMonths[0]}-01`)
                      : `${selectedMonths.length} meses`}
                </span>
                <ChevronDown className="h-4 w-4 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-2" align="start">
              {monthOptions.length === 0 && (
                <p className="p-2 text-sm text-muted-foreground">Sem faturas para este cliente.</p>
              )}
              <div className="max-h-60 space-y-1 overflow-y-auto">
                {monthOptions.map((m) => (
                  <label
                    key={m}
                    className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent"
                  >
                    <Checkbox
                      checked={selectedMonths.includes(m)}
                      onCheckedChange={() => toggleMonth(m)}
                    />
                    {monthLabelFromISO(`${m}-01`)}
                  </label>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </Card>

      {rows.length > 0 && (
        <Card
          className="overflow-hidden border-0 p-4 text-white"
          style={{ background: "linear-gradient(135deg, #0f766e 0%, #115e59 50%, #134e4a 100%)" }}
        >
          <div className="text-[10px] font-bold uppercase tracking-widest text-white/80">Economia total gerada</div>
          <div className="mt-1 text-xl font-bold num text-white sm:text-2xl">
            {brl(totalEconomia)}
          </div>
        </Card>
      )}

      <Card className="glass-card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border bg-accent/50">
                {["Mês", "Valor S/ Usina", "Valor c/ desconto", "Economia", "% Desc."].map((h) => (
                  <th
                    key={h}
                    className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-border last:border-0 hover:bg-accent/40">
                  <td className="px-3 py-2.5 font-medium">{r.mes}</td>
                  <td className="px-3 py-2.5 num text-red-500">{brl(r.sem)}</td>
                  <td className="px-3 py-2.5 num text-emerald-600 font-semibold">{brl(r.com)}</td>
                  <td className="px-3 py-2.5 num font-semibold text-primary">{brl(r.economia)}</td>
                  <td className="px-3 py-2.5 num">{r.pct}%</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-muted-foreground">
                    Selecione o cliente e os meses com faturas lançadas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
