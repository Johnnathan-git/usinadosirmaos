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
import { ChevronDown } from "lucide-react";
import { brl, monthLabelLong, monthLabelFromISO } from "@/lib/format";
import { Suspense, useEffect, useMemo, useState } from "react";

type Invoice = {
  id: string; client_id: string; reference_date: string;
  uc_number: string; consumption_kw: number; value_without_plant: number;
  client_pays: number; distributor_invoice: number;
};
type Client = { id: string; name: string; color: string };

const q = queryOptions({
  queryKey: ["resultado-page"],
  queryFn: async () => {
    const [i, c, sess] = await Promise.all([
      supabase.from("invoices").select("id,client_id,reference_date,uc_number,consumption_kw,value_without_plant,client_pays,distributor_invoice"),
      supabase.from("clients").select("id,name,color"),
      supabase.auth.getSession(),
    ]);
    if (i.error) throw i.error;
    if (c.error) throw c.error;
    let restrictedClientId: string | null = null;
    const uid = sess.data.session?.user?.id;
    if (uid) {
      const [{ data: link }, { data: roles }] = await Promise.all([
        supabase.from("user_clients").select("client_id").eq("user_id", uid).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", uid),
      ]);
      const isAdmin = (roles ?? []).some((r: any) => r.role === "admin");
      if (!isAdmin && link?.client_id) restrictedClientId = link.client_id as string;
    }
    return { invoices: (i.data ?? []) as Invoice[], clients: (c.data ?? []) as Client[], restrictedClientId };
  },
});

export const Route = createFileRoute("/resultado")({
  ssr: false,
  component: Page,
  head: () => ({
    meta: [
      { title: "Resultado — Usina dos Irmãos" },
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
  const locked = data.restrictedClientId;
  const [clientId, setClientId] = useState<string>(locked ?? "all");
  useEffect(() => { if (locked) setClientId(locked); }, [locked]);
  const monthOptions = useMemo(() => {
    const set = new Set<string>();
    data.invoices
      .filter(i => !locked || i.client_id === locked)
      .forEach(i => set.add(i.reference_date.slice(0, 7)));
    return [...set].sort().reverse();
  }, [data, locked]);
  const [selectedMonths, setSelectedMonths] = useState<string[]>(monthOptions.slice(0, 1));

  const filtered = data.invoices.filter(inv => {
    const mk = inv.reference_date.slice(0, 7);
    if (!selectedMonths.includes(mk)) return false;
    if (locked && inv.client_id !== locked) return false;
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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Resultado</h1>
          <p className="text-sm text-muted-foreground">Economia gerada por mês e cliente</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={clientId} onValueChange={setClientId} disabled={!!locked}>
            <SelectTrigger className="w-full sm:w-48 h-10 border-border bg-card rounded-lg shadow-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              {!locked && <SelectItem value="all">Todos os clientes</SelectItem>}
              {data.clients
                .filter(c => !locked || c.id === locked)
                .map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="h-10 w-full gap-2 sm:w-auto border-border bg-card text-foreground hover:bg-background rounded-lg font-semibold shadow-sm">
                {selectedMonths.length} {selectedMonths.length === 1 ? "mês" : "meses"}
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="max-h-72 w-56 overflow-auto bg-card border-border rounded-xl shadow-lg p-2">
              <div className="space-y-1">
                {monthOptions.map(m => {
                  const d = new Date(Number(m.slice(0, 4)), Number(m.slice(5, 7)) - 1, 1);
                  const checked = selectedMonths.includes(m);
                  return (
                    <label key={m} className="flex cursor-pointer items-center gap-3 py-2 px-3 hover:bg-background rounded-lg transition-colors">
                      <Checkbox checked={checked} onCheckedChange={(v) => {
                        setSelectedMonths(sm => v ? [...sm, m] : sm.filter(x => x !== m));
                      }} />
                      <span className="text-xs font-semibold text-foreground uppercase tracking-wider">{monthLabelLong(d)}</span>
                    </label>
                  );
                })}
              </div>
              {monthOptions.length === 0 && <p className="text-sm text-muted-foreground p-3 text-center">Sem faturas.</p>}
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {sortedMonths.map(mk => {
          const d = new Date(Number(mk.slice(0, 4)), Number(mk.slice(5, 7)) - 1, 1);
          return (
            <Card key={mk} className="overflow-hidden bg-card border-border rounded-xl shadow-sm">
              <div className="border-b border-border bg-background/50 px-6 py-4">
                <h2 className="text-sm font-bold text-foreground uppercase tracking-widest">{monthLabelLong(d)}</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px]">
                  <thead>
                    <tr className="border-b border-border bg-background/20">
                      <th className="px-6 py-3.5 text-center text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Mês</th>
                      <th className="px-6 py-3.5 text-center text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Consumo</th>
                      <th className="px-6 py-3.5 text-center text-[10px] font-bold text-muted-foreground uppercase tracking-widest">v. sem Usina</th>
                      <th className="px-6 py-3.5 text-center text-[10px] font-bold text-muted-foreground uppercase tracking-widest">c/ 30% Desc.</th>
                      <th className="px-6 py-3.5 text-center text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Pago</th>
                      <th className="px-6 py-3.5 text-center text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Economia</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {byMonth.get(mk)!.map(inv => {
                      const semUsina = Number(inv.value_without_plant);
                      const desc = semUsina * 0.7;
                      const eco = semUsina * 0.3;
                      return (
                        <tr key={inv.id} className="hover:bg-background/50 transition-colors">
                          <td className="px-6 py-4 text-center text-[10px] font-bold text-muted-foreground uppercase">{monthLabelFromISO(inv.reference_date)}</td>
                          <td className="num px-6 py-4 text-center text-sm font-semibold text-foreground">{Number(inv.consumption_kw).toLocaleString("pt-BR")} kW</td>
                          <td className="num px-6 py-4 text-center text-sm font-medium text-foreground">{brl(semUsina)}</td>
                          <td className="num px-6 py-4 text-center text-sm font-medium text-foreground">{brl(desc)}</td>
                          <td className="num px-6 py-4 text-center text-sm font-bold text-profit">{brl(Number(inv.client_pays))}</td>
                          <td className="num px-6 py-4 text-center text-sm font-bold text-accent">{brl(eco)}</td>
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
          <Card className="bg-card border-border rounded-xl p-16 text-center text-muted-foreground shadow-sm">
            Selecione ao menos um mês com faturas para visualizar o resultado.
          </Card>
        )}

        <Card className="bg-primary p-10 text-center shadow-lg border-none relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,var(--color-accent),transparent_120%)] opacity-10 group-hover:opacity-20 transition-opacity" />
          <div className="relative z-10">
            <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-accent/80 mb-4">Economia total gerada</div>
            <div className="num text-5xl font-bold text-white sm:text-6xl tracking-tighter">{brl(totalEconomia)}</div>
            <div className="mt-6 flex items-center justify-center gap-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              <span>{selectedMonths.length} {selectedMonths.length === 1 ? "mês" : "meses"}</span>
              <span className="h-1 w-1 rounded-full bg-slate-600" />
              <span>{filtered.length} {filtered.length === 1 ? "fatura" : "faturas"}</span>
            </div>
          </div>
        </Card>
      </div>
    </div>

  );
}