import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { brl, monthLabelFromISO } from "@/lib/format";
import { Suspense, useEffect, useMemo, useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Invoice = {
  id: string; client_id: string; reference_date: string; uc_number: string;
  consumption_kw: number; price_kw: number; public_lighting: number;
  interest_fine: number; value_without_plant: number; client_pays: number;
};
type Client = { id: string; name: string; phone: string | null };

const q = queryOptions({
  queryKey: ["relatorio-page"],
  queryFn: async () => {
    const [i, c, sess] = await Promise.all([
      supabase
        .from("invoices")
        .select("id,client_id,reference_date,uc_number,consumption_kw,price_kw,public_lighting,interest_fine,value_without_plant,client_pays")
        .order("reference_date", { ascending: false }),
      supabase.from("clients").select("id,name,phone").order("name"),
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
      const isAdmin = (roles ?? []).some((r: { role: string }) => r.role === "admin");
      if (!isAdmin && link?.client_id) restrictedClientId = link.client_id as string;
    }
    return { invoices: (i.data ?? []) as Invoice[], clients: (c.data ?? []) as Client[], restrictedClientId };
  },
});

export const Route = createFileRoute("/relatorio")({
  ssr: false,
  component: Page,
  head: () => ({
    meta: [
      { title: "Relatório do Cliente — Usina dos Irmãos" },
      { name: "description", content: "Monte, edite e envie a planilha mensal de economia para cada cliente." },
      { property: "og:title", content: "Relatório do Cliente — Usina dos Irmãos" },
      { property: "og:description", content: "Planilha mensal de economia pronta para enviar ao cliente." },
    ],
  }),
});

function Page() {
  return (
    <AppLayout>
      <Suspense fallback={<div>Carregando...</div>}>
        <Relatorio />
      </Suspense>
    </AppLayout>
  );
}

type Row = {
  id: string; mes: string; uc: string; consumo: string; preco: string;
  ilum: string; juros: string; semUsina: string; comDesconto: string;
};

const numBR = (n: number, d = 2) =>
  n.toLocaleString("pt-BR", { minimumFractionDigits: d, maximumFractionDigits: d });

function toRow(inv: Invoice): Row {
  return {
    id: inv.id,
    mes: monthLabelFromISO(inv.reference_date).toLowerCase(),
    uc: inv.uc_number ?? "",
    consumo: numBR(Number(inv.consumption_kw), 0),
    preco: numBR(Number(inv.price_kw), 6),
    ilum: brl(Number(inv.public_lighting)),
    juros: brl(Number(inv.interest_fine)),
    semUsina: brl(Number(inv.value_without_plant)),
    comDesconto: brl(Number(inv.client_pays)),
  };
}

function Relatorio() {
  const { data } = useSuspenseQuery(q);
  const locked = data.restrictedClientId;
  const clients = data.clients.filter((c) => !locked || c.id === locked);
  const [clientId, setClientId] = useState<string>(locked ?? clients[0]?.id ?? "");
  const [months, setMonths] = useState<string[]>([]);
  const [rows, setRows] = useState<Row[]>([]);

  const client = clients.find((c) => c.id === clientId);
  const clientInvoices = useMemo(
    () => data.invoices.filter((i) => i.client_id === clientId),
    [data.invoices, clientId],
  );
  const monthOptions = useMemo(
    () => [...new Set(clientInvoices.map((i) => i.reference_date.slice(0, 7)))].sort().reverse(),
    [clientInvoices],
  );

  useEffect(() => {
    setMonths(monthOptions.slice(0, 1));
  }, [monthOptions.join(",")]);

  const selected = useMemo(
    () => clientInvoices.filter((i) => months.includes(i.reference_date.slice(0, 7))),
    [clientInvoices, months],
  );

  useEffect(() => {
    setRows(selected.map(toRow));
  }, [selected.map((s) => s.id).join(",")]);

  function edit(id: string, field: keyof Row, value: string) {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="no-print grid gap-3 sm:flex sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-800 sm:text-3xl">Relatório do Cliente</h1>
          <p className="text-sm text-slate-500 font-medium">
            Monte a planilha do mês, ajuste o que precisar e envie direto para o cliente.
          </p>
        </div>
      </div>

      <Card className="no-print bg-white border border-slate-200 rounded-xl grid gap-4 p-6 sm:grid-cols-2 shadow-none">
        <div>
          <div className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-500">Cliente</div>
          <Select value={clientId} onValueChange={setClientId} disabled={!!locked}>
            <SelectTrigger className="bg-white border-slate-200 rounded-lg"><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>
              {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <div className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-500">Meses</div>
          <div className="flex flex-wrap gap-2">
            {monthOptions.map((m) => {
              const on = months.includes(m);
              return (
                <button
                  key={m}
                  onClick={() => setMonths((ms) => (on ? ms.filter((x) => x !== m) : [...ms, m]))}
                  className={`rounded-lg border px-4 py-1.5 text-xs font-bold transition-all ${
                    on ? "bg-slate-900 border-slate-900 text-white shadow-sm" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {monthLabelFromISO(`${m}-01`)}
                </button>
              );
            })}
            {monthOptions.length === 0 && <p className="text-sm text-slate-500">Sem faturas para este cliente.</p>}
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden bg-white border border-slate-200 rounded-xl p-0 shadow-none">
        <div className="bg-slate-50/50 px-6 py-4 text-center border-b border-slate-100">
          <div className="text-lg font-bold uppercase tracking-widest text-slate-800">
            {client?.name ?? "—"}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50/30">
                {["Mês referência", "UC", "Consumo kW", "Preço kW", "Ilum. pública", "Juros/Multa", "Valor s/ usina", "Valor c/ 30% desconto"].map((h) => (
                  <th
                    key={h}
                    className={`border border-slate-100 px-4 py-3 text-center font-bold text-slate-500 uppercase text-xs ${h === "UC" ? "min-w-[150px]" : ""}`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors">
                  {(["mes", "uc", "consumo", "preco", "ilum", "juros", "semUsina", "comDesconto"] as const).map((f) => (
                    <td key={f} className="border border-slate-100 p-0">
                      <Input
                        value={r[f]}
                        onChange={(e) => edit(r.id, f, e.target.value)}
                        className={`num h-12 rounded-none border-0 bg-transparent text-center shadow-none focus-visible:ring-1 focus-visible:ring-slate-200 ${
                          f === "comDesconto" ? "font-bold text-slate-900" : "text-slate-700 font-medium"
                        }`}
                      />
                    </td>
                  ))}
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={8} className="py-12 text-center text-slate-500 font-medium">Selecione ao menos um mês.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        {rows.length > 0 && (
          <div className="border-t border-slate-100 bg-slate-50/30 px-6 py-4 text-sm font-semibold text-slate-500 uppercase tracking-wide">
            {rows.length} {rows.length === 1 ? "mês selecionado" : "meses selecionados"}
          </div>
        )}
      </Card>
    </div>
  );
}