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
type Client = { id: string; name: string; color: string; discount_pct: number };

const q = queryOptions({
  queryKey: ["resultado-page"],
  queryFn: async () => {
    const [i, c, sess] = await Promise.all([
      supabase.from("invoices").select("id,client_id,reference_date,uc_number,consumption_kw,value_without_plant,client_pays,distributor_invoice"),
      supabase.from("clients").select("id,name,color,discount_pct"),
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

  const totalEconomia = filtered.reduce((a, i) => {
    const c = data.clients.find(x => x.id === i.client_id);
    const discount = (c?.discount_pct ?? 30) / 100;
    return a + Number(i.value_without_plant) * discount;
  }, 0);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="grid gap-3 sm:flex sm:flex-wrap sm:items-start sm:justify-between">
        <div>
          <h1 className="truncate text-2xl font-bold tracking-tight text-white sm:text-3xl">Resultado</h1>
          <p className="text-sm font-medium text-white/40">Economia gerada por mês para o Cliente</p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <Select value={clientId} onValueChange={setClientId} disabled={!!locked}>
            <SelectTrigger className="col-span-2 w-full sm:w-48 bg-white/5 border-white/10 rounded-lg text-white"><SelectValue /></SelectTrigger>
            <SelectContent>
              {!locked && <SelectItem value="all">Todos os clientes</SelectItem>}
              {data.clients
                .filter(c => !locked || c.id === locked)
                .map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full gap-2 sm:w-auto bg-white/5 border-white/10 text-white/70 hover:text-white rounded-lg">
                {selectedMonths.length} {selectedMonths.length === 1 ? "mês selecionado" : "meses selecionados"}
                <ChevronDown className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="max-h-72 w-56 overflow-auto bg-white border border-slate-200 rounded-xl shadow-lg">
              {monthOptions.map(m => {
                const d = new Date(Number(m.slice(0, 4)), Number(m.slice(5, 7)) - 1, 1);
                const checked = selectedMonths.includes(m);
                return (
                  <label key={m} className="flex cursor-pointer items-center gap-2 py-2 px-3 hover:bg-slate-50 rounded-lg transition-colors">
                    <Checkbox checked={checked} onCheckedChange={(v) => {
                      setSelectedMonths(sm => v ? [...sm, m] : sm.filter(x => x !== m));
                    }} />
                    <span className="text-sm font-medium text-slate-700">{monthLabelLong(d)}</span>
                  </label>
                );
              })}
              {monthOptions.length === 0 && <p className="text-sm text-slate-500 p-3">Sem faturas.</p>}
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {sortedMonths.map(mk => {
        const d = new Date(Number(mk.slice(0, 4)), Number(mk.slice(5, 7)) - 1, 1);
        return (
          <Card key={mk} className="glass-card overflow-hidden">
            <div className="border-b border-white/5 bg-white/5 px-6 py-4">
              <h2 className="text-base font-bold text-white">{monthLabelLong(d)}</h2>
            </div>
            <div className="overflow-x-auto -mx-6 px-6 scrollbar-hide">
              <table className="w-full min-w-[760px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-white/5 bg-white/5">
                    <th className="px-4 py-3 text-center font-bold text-white/40 uppercase text-[10px] tracking-wider">Mês</th>
                    <th className="px-4 py-3 text-center font-bold text-white/40 uppercase text-[10px] tracking-wider">Consumo (kW)</th>
                    <th className="px-4 py-3 text-center font-bold text-white/40 uppercase text-[10px] tracking-wider">Valor s/ Usina</th>
                    <th className="px-4 py-3 text-center font-bold text-white/40 uppercase text-[10px] tracking-wider">
                      {clientId !== "all" 
                        ? `Valor c/ ${data.clients.find(c => c.id === clientId)?.discount_pct}% desconto` 
                        : "Valor c/ desconto"}
                    </th>
                    <th className="px-4 py-3 text-center font-bold text-white/40 uppercase text-[10px] tracking-wider">Cliente Pagou</th>
                    <th className="px-4 py-3 text-center font-bold text-white/40 uppercase text-[10px] tracking-wider">Fat. Concessionária</th>
                    <th className="px-4 py-3 text-center font-bold text-white/40 uppercase text-[10px] tracking-wider">Economia Gerada</th>
                  </tr>
                </thead>
                <tbody>
                  {byMonth.get(mk)!.map(inv => {
                    const c = data.clients.find(x => x.id === inv.client_id);
                    const discountPct = c?.discount_pct ?? 30;
                    const discountFactor = discountPct / 100;
                    const semUsina = Number(inv.value_without_plant);
                    const desc = semUsina * (1 - discountFactor);
                    const eco = semUsina * discountFactor;
                    return (
                      <tr key={inv.id} className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors zebra-stripe">
                        <td className="whitespace-nowrap px-4 py-4 text-center text-white/70 font-bold">{monthLabelFromISO(inv.reference_date)}</td>
                        <td className="num whitespace-nowrap px-4 py-4 text-center text-white font-bold">{Number(inv.consumption_kw).toLocaleString("pt-BR")}</td>
                        <td className="num whitespace-nowrap px-4 py-4 text-center text-white font-bold">{brl(semUsina)}</td>
                        <td className="num whitespace-nowrap px-4 py-4 text-center text-white font-bold">{brl(desc)}</td>
                        <td className="num whitespace-nowrap px-4 py-4 text-center font-bold text-white">{brl(Number(inv.client_pays))}</td>
                        <td className="num whitespace-nowrap px-4 py-4 text-center font-bold text-white">{brl(Number(inv.distributor_invoice))}</td>
                        <td className="num whitespace-nowrap px-4 py-4 text-center font-bold text-emerald-400">{brl(eco)}</td>
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
        <Card className="glass-card p-10 text-center text-white/40">Selecione ao menos um mês com faturas.</Card>
      )}

      <Card className="glass-card border-emerald-500/40 bg-emerald-500/20 p-6 text-center shadow-[0_8px_30px_rgba(16,185,129,0.15)] relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-600/40 via-emerald-500/20 to-transparent opacity-80 pointer-events-none" />
        <div className="relative z-10">
        <div className="text-[10px] font-bold uppercase tracking-widest text-white">Economia total gerada</div>
        <div className="num-lg mt-1 text-3xl font-bold text-white sm:text-4xl drop-shadow-[0_0_15px_rgba(16,185,129,0.3)]">{brl(totalEconomia)}</div>
        <div className="mt-2 text-[10px] text-white/50 font-bold uppercase tracking-wider">
          {selectedMonths.length} {selectedMonths.length === 1 ? "mês" : "meses"} · {filtered.length} {filtered.length === 1 ? "fatura" : "faturas"}
        </div>
        </div>
      </Card>
    </div>
  );
}