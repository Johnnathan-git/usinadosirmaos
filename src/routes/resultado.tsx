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
      <div className="grid gap-3 sm:flex sm:flex-wrap sm:items-start sm:justify-between">
        <div>
          <h1 className="truncate text-2xl font-bold tracking-tight sm:text-3xl">Resultado</h1>
          <p className="text-sm text-muted-foreground">Economia gerada por mês e cliente</p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <Select value={clientId} onValueChange={setClientId} disabled={!!locked}>
            <SelectTrigger className="col-span-2 w-full sm:w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              {!locked && <SelectItem value="all">Todos os clientes</SelectItem>}
              {data.clients
                .filter(c => !locked || c.id === locked)
                .map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full gap-2 sm:w-auto">
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
        </div>
      </div>

      {sortedMonths.map(mk => {
        const d = new Date(Number(mk.slice(0, 4)), Number(mk.slice(5, 7)) - 1, 1);
        return (
          <Card key={mk} className="overflow-hidden p-0 elev-2">
            <div className="border-b border-border bg-muted/50 px-4 py-3">
              <h2 className="text-base font-semibold">{monthLabelLong(d)}</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] border-collapse text-sm">
                <thead>
                  <tr className="bg-muted/60 text-[11px] uppercase leading-tight text-muted-foreground">
                    <th className="border border-border px-2 py-2 text-center font-semibold">Mês</th>
                    <th className="border border-border px-2 py-2 text-center font-semibold">Consumo (kW)</th>
                    <th className="border border-border px-2 py-2 text-center font-semibold">Valor s/ Usina</th>
                    <th className="border border-border px-2 py-2 text-center font-semibold">c/ 30% Desconto</th>
                    <th className="border border-border px-2 py-2 text-center font-semibold">Cliente Pagou</th>
                    <th className="border border-border px-2 py-2 text-center font-semibold text-solar">Economia Gerada</th>
                  </tr>
                </thead>
                <tbody>
                  {byMonth.get(mk)!.map(inv => {
                    const semUsina = Number(inv.value_without_plant);
                    const desc = semUsina * 0.7;
                    const eco = semUsina * 0.3;
                    return (
                      <tr key={inv.id}>
                        <td className="whitespace-nowrap border border-border px-2 py-2.5 text-center text-muted-foreground">{monthLabelFromISO(inv.reference_date)}</td>
                        <td className="num whitespace-nowrap border border-border px-2 py-2.5 text-center">{Number(inv.consumption_kw).toLocaleString("pt-BR")}</td>
                        <td className="num whitespace-nowrap border border-border px-2 py-2.5 text-center">{brl(semUsina)}</td>
                        <td className="num whitespace-nowrap border border-border px-2 py-2.5 text-center">{brl(desc)}</td>
                        <td className="num whitespace-nowrap border border-border px-2 py-2.5 text-center font-medium text-leaf">{brl(Number(inv.client_pays))}</td>
                        <td className="num whitespace-nowrap border border-border px-2 py-2.5 text-center font-semibold text-solar">{brl(eco)}</td>
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

      <Card className="border border-solar/20 bg-solar p-8 text-center elev-2">
        <div className="text-sm font-bold uppercase tracking-wide text-solar-foreground">Economia total gerada para o cliente</div>
        <div className="num-lg mt-2 text-4xl font-extrabold text-solar-foreground sm:text-5xl">{brl(totalEconomia)}</div>
        <div className="mt-2 text-sm text-solar-foreground/80 font-medium">
          {selectedMonths.length} {selectedMonths.length === 1 ? "mês" : "meses"} · {filtered.length} {filtered.length === 1 ? "fatura" : "faturas"}
        </div>
      </Card>
    </div>
  );
}