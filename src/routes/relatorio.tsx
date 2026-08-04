import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { brl, monthLabelFromISO } from "@/lib/format";
import { Suspense, useEffect, useMemo, useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Paperclip } from "lucide-react";

type Invoice = {
  id: string; client_id: string; reference_date: string; uc_number: string;
  consumption_kw: number; price_kw: number; public_lighting: number;
  interest_fine: number; value_without_plant: number; client_pays: number;
  attachment_url: string | null;
};
type Client = { id: string; name: string; phone: string | null; discount_pct: number };

const q = queryOptions({
  queryKey: ["relatorio-page"],
  queryFn: async () => {
    const [i, c, sess] = await Promise.all([
      supabase
        .from("invoices")
        .select("id,client_id,reference_date,uc_number,consumption_kw,price_kw,public_lighting,interest_fine,value_without_plant,client_pays,attachment_url")
        .order("reference_date", { ascending: false }),
      supabase.from("clients").select("id,name,phone,discount_pct").order("name"),
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
  attachment_url?: string | null;
};

const numBR = (n: number, d = 2) =>
  n.toLocaleString("pt-BR", { minimumFractionDigits: d, maximumFractionDigits: d });

function toRow(inv: Invoice, client?: Client): Row {
  const discountPct = client?.discount_pct ?? 30;
  const discountFactor = discountPct / 100;
  return {
    id: inv.id,
    mes: monthLabelFromISO(inv.reference_date).toLowerCase(),
    uc: inv.uc_number ?? "",
    consumo: numBR(Number(inv.consumption_kw), 0),
    preco: numBR(Number(inv.price_kw), 6),
    ilum: brl(Number(inv.public_lighting)),
    juros: brl(Number(inv.interest_fine)),
    semUsina: brl(Number(inv.value_without_plant)),
    comDesconto: brl(Number(inv.value_without_plant) * (1 - discountFactor)),
    attachment_url: inv.attachment_url,
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
    if (months.length === 0 && monthOptions.length > 0) {
      setMonths([monthOptions[0]]);
    }
  }, [monthOptions]);

  const selected = useMemo(
    () => clientInvoices.filter((i) => months.includes(i.reference_date.slice(0, 7))),
    [clientInvoices, months],
  );

  useEffect(() => {
    setRows(selected.map(s => toRow(s, client)));
  }, [selected.map((s) => s.id).join(","), client?.discount_pct]);

  function edit(id: string, field: keyof Row, value: string) {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="no-print grid gap-3 sm:flex sm:items-start sm:justify-between">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-[#374151]">Relatório do Cliente</h1>
          <p className="text-sm font-medium text-[#4B5563]">
            Planilha mensal de economia pronta para enviar ao cliente.
          </p>
        </div>
      </div>

      <Card className="no-print rounded-[10px] border border-[#E4E7EC] bg-white grid gap-4 p-6 sm:grid-cols-2 shadow-sm">
        <div>
          <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-[#4B5563]">Cliente</div>
          <Select value={clientId} onValueChange={setClientId} disabled={!!locked}>
            <SelectTrigger className="bg-white border-[#E4E7EC] rounded-lg text-[#374151] font-semibold"><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>
              {clients.map((c) => <SelectItem key={c.id} value={c.id} className="font-semibold text-[#374151]">{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-[#4B5563]">Meses</div>
          <div className="flex flex-wrap gap-2">
            {monthOptions.map((m) => {
              const on = months.includes(m);
              return (
                <button
                  key={m}
                  onClick={() => setMonths((ms) => (on ? ms.filter((x) => x !== m) : [...ms, m]))}
                  className={`rounded-lg border px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-all ${
                    on ? "bg-[#151B2E] border-[#151B2E] text-white shadow-sm" : "bg-white border-[#E4E7EC] text-[#4B5563] hover:bg-slate-50"
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

      <Card className="overflow-hidden rounded-[16px] border border-[#E4E7EC] bg-white p-0 shadow-lg">
        <div className="bg-[#C97B5E] px-8 py-5 text-center border-b border-[#E4E7EC]">
          <div className="text-xl font-medium uppercase tracking-[0.25em] text-white/95">
            {client?.name ?? "—"}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] border-collapse text-sm">
            <thead>
              <tr className="bg-[#F8FAFC]">
                {["Mês referência", "Unidade Consumidora", "Consumo (kW)", "Preço kW", "Ilum. pública", "Juros/Multa", "Valor SEM Usina", `Valor COM ${client?.discount_pct ?? 30}% DESC`].map((h) => (
                    <th
                      key={h}
                      className={`border border-[#E2E8F0] px-4 py-4 text-center font-bold text-[#475569] uppercase text-[10px] tracking-widest ${h === "Unidade Consumidora" ? "min-w-[180px]" : ""}`}
                    >
                      {h}
                    </th>
                  ))}
                  <th className="border border-[#E2E8F0] px-4 py-4 text-center font-bold text-[#475569] uppercase text-[10px] tracking-widest w-12">
                    Doc
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-[#F1F5F9] last:border-0 hover:bg-[#F8FAFC]/50 transition-colors">
                    {(["mes", "uc", "consumo", "preco", "ilum", "juros", "semUsina", "comDesconto"] as const).map((f) => (
                      <td key={f} className="border border-[#F1F5F9] p-0">
                        <Input
                          value={r[f]}
                          onChange={(e) => edit(r.id, f, e.target.value)}
                          className={`num h-14 rounded-none border-0 bg-transparent text-center shadow-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-[#C97B5E]/30 ${
                            f === "comDesconto" 
                              ? "font-bold text-[#2E5C8A] bg-[#2E5C8A]/5 text-base" 

                              : f === "semUsina"
                              ? "text-[#D64545] font-bold"
                              : "text-[#374151] font-medium"
                          }`}
                        />
                      </td>
                    ))}
                    <td className="border border-[#F1F5F9] p-0 text-center align-middle">
                      {r.attachment_url ? (
                        <button 
                          onClick={async () => {
                            try {
                              const path = r.attachment_url!;
                              if (path.startsWith('http')) {
                                window.open(path, '_blank');
                                return;
                              }
                              // We use the public URL since we made the bucket public for troubleshooting
                              const { data } = supabase.storage
                                .from('faturas_private')
                                .getPublicUrl(path);
                              window.open(data.publicUrl, '_blank');
                            } catch (err: any) {
                              console.error(err);
                              alert("Erro ao abrir arquivo: " + err.message);
                            }
                          }}
                          className="flex h-14 w-full items-center justify-center text-[#C97B5E] hover:bg-[#C97B5E]/5 transition-colors"
                          title="Baixar Fatura"
                        >
                          <Paperclip className="h-4 w-4" />
                        </button>
                      ) : (
                        <div className="flex h-14 w-full items-center justify-center text-slate-300">
                          <Paperclip className="h-4 w-4 opacity-30" />
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              {rows.length === 0 && (
                <tr><td colSpan={8} className="py-20 text-center text-slate-400 font-medium italic">Selecione os meses acima para gerar o relatório.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        {rows.length > 0 && (
          <div className="border-t border-[#F1F5F9] bg-[#F8FAFC] px-8 py-6 flex justify-between items-center">
            <div className="text-[10px] font-bold text-[#64748B] uppercase tracking-widest">
              {rows.length} {rows.length === 1 ? "mês selecionado" : "meses selecionados"}
            </div>
            <div className="text-[10px] font-bold text-[#C97B5E] uppercase tracking-widest">
              Usina dos Irmãos • Energia Inteligente
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}