/**
 * Execute esta instrucao no projeto: Ajuste o visual do meu app para um estilo claro e profissional:
 * 
 * Cores: fundo #f4f6f9, cards brancos com sombra suave, verde esmeralda (#059669) para números positivos e azul (#2563eb) para destaques. Fonte Inter.
 * 
 * Organização: cards lado a lado, tabelas com cabeçalho cinza claro e linhas zebradas, botões com fundo escuro e cantos arredondados.
 * 
 * Aplique isso em todas as telas mantendo todas as funcionalidades e dados existentes.
 */
import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { brl, monthLabel, monthLabelLong, initial } from "@/lib/format";
import { TrendingUp, TrendingDown, DollarSign, Receipt, Users, Trophy, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { Suspense } from "react";

type Invoice = {
  id: string;
  client_id: string;
  reference_date: string;
  client_pays: number;
  distributor_invoice: number;
  value_without_plant: number;
};
type Expense = { id: string; reference_date: string; amount: number };
type Client = { id: string; name: string; color: string };

const dashboardQ = queryOptions({
  queryKey: ["dashboard"],
  queryFn: async () => {
    const [inv, exp, cli] = await Promise.all([
      supabase.from("invoices").select("id,client_id,reference_date,client_pays,distributor_invoice,value_without_plant"),
      supabase.from("expenses").select("id,reference_date,amount"),
      supabase.from("clients").select("id,name,color").eq("active", true),
    ]);
    if (inv.error) throw inv.error;
    if (exp.error) throw exp.error;
    if (cli.error) throw cli.error;
    return {
      invoices: (inv.data ?? []) as Invoice[],
      expenses: (exp.data ?? []) as Expense[],
      clients: (cli.data ?? []) as Client[],
    };
  },
});

export const Route = createFileRoute("/")({
  ssr: false,
  component: DashboardPage,
  head: () => ({
    meta: [
      { title: "Dashboard — Usina dos Irmãos" },
      { name: "description", content: "Visão geral de receitas, despesas e lucro da Usina dos Irmãos." },
    ],
  }),
});

function DashboardPage() {
  return (
    <AppLayout>
      <Suspense fallback={<div>Carregando...</div>}>
        <Dashboard />
      </Suspense>
    </AppLayout>
  );
}

function invoiceProfit(i: Invoice) {
  return Number(i.client_pays) - Number(i.distributor_invoice);
}

function Dashboard() {
  const { data } = useSuspenseQuery(dashboardQ);
  const now = new Date();
  const curKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const inMonth = (d: string, key: string) => d.startsWith(key);

  const receitaMes = data.invoices.filter(i => inMonth(i.reference_date, curKey))
    .reduce((a, i) => a + Number(i.client_pays), 0);
  const faturasDistMes = data.invoices.filter(i => inMonth(i.reference_date, curKey))
    .reduce((a, i) => a + Number(i.distributor_invoice), 0);
  const despesasOperMes = data.expenses.filter(e => inMonth(e.reference_date, curKey))
    .reduce((a, e) => a + Number(e.amount), 0);
  const despesasMes = despesasOperMes + faturasDistMes;
  const lucroMes = receitaMes - despesasMes;
  const receitaAno = data.invoices.filter(i => i.reference_date.startsWith(String(now.getFullYear())))
    .reduce((a, i) => a + Number(i.client_pays), 0);

  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevKey = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, "0")}`;
  const receitaPrev = data.invoices.filter(i => inMonth(i.reference_date, prevKey))
    .reduce((a, i) => a + Number(i.client_pays), 0);
  const despesasPrev =
    data.invoices.filter(i => inMonth(i.reference_date, prevKey)).reduce((a, i) => a + Number(i.distributor_invoice), 0) +
    data.expenses.filter(e => inMonth(e.reference_date, prevKey)).reduce((a, e) => a + Number(e.amount), 0);
  const lucroPrev = receitaPrev - despesasPrev;
  const delta = (cur: number, old: number) => (old === 0 ? null : ((cur - old) / Math.abs(old)) * 100);

  // last 6 months
  const months: { key: string; label: string; date: Date }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      label: monthLabel(d),
      date: d,
    });
  }
  const chartData = months.map(m => {
    const receita = data.invoices.filter(i => inMonth(i.reference_date, m.key))
      .reduce((a, i) => a + Number(i.client_pays), 0);
    const distribuidora = data.invoices.filter(i => inMonth(i.reference_date, m.key))
      .reduce((a, i) => a + Number(i.distributor_invoice), 0);
    const operacionais = data.expenses.filter(e => inMonth(e.reference_date, m.key))
      .reduce((a, e) => a + Number(e.amount), 0);
    const despesas = operacionais + distribuidora;
    return {
      month: m.label,
      Receita: receita,
      Despesas: despesas,
      Operacionais: operacionais,
      Distribuidora: distribuidora,
      Lucro: receita - despesas,
    };
  });

  // ranking
  const profitByClient = new Map<string, number>();
  for (const i of data.invoices) {
    profitByClient.set(i.client_id, (profitByClient.get(i.client_id) ?? 0) + invoiceProfit(i));
  }
  const ranking = data.clients
    .map(c => ({ ...c, profit: profitByClient.get(c.id) ?? 0 }))
    .sort((a, b) => b.profit - a.profit);
  const maxProfit = Math.max(0.1, ...ranking.map(r => r.profit));

  // monthly summary (last 6)
  const summary = [...chartData].reverse();

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-800 sm:text-3xl">Dashboard</h1>
        <p className="text-sm text-slate-500">Visão geral — {monthLabelLong(now)}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={<TrendingUp className="h-5 w-5" />} label={`Receita ${monthLabel(now)}`} value={receitaMes} tint="leaf" delta={delta(receitaMes, receitaPrev)} />
        <StatCard
          icon={<TrendingDown className="h-5 w-5" />}
          label={`Despesas ${monthLabel(now)}`}
          value={despesasMes}
          tint="clay"
          invertDelta
          delta={delta(despesasMes, despesasPrev)}
          hint={`Operacionais ${brl(despesasOperMes)} + Distribuidora ${brl(faturasDistMes)}`}
        />
        <StatCard icon={<DollarSign className="h-5 w-5" />} label={`Lucro ${monthLabel(now)}`} value={lucroMes} tint="leaf" delta={delta(lucroMes, lucroPrev)} />
        <StatCard icon={<Receipt className="h-5 w-5" />} label={`Receita ${now.getFullYear()}`} value={receitaAno} tint="leaf" />
      </div>

      <Card className="bg-white border border-slate-200 rounded-xl p-6 shadow-none">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-slate-800">Receita, Despesas e Lucro</h2>
          <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-slate-500 uppercase">
            {[["Receita", "#059669"], ["Despesas", "#DC2626"], ["Lucro", "#2563EB"]].map(([k, c]) => (
              <span key={k} className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm" style={{ background: c }} />
                {k}
              </span>
            ))}
          </div>
        </div>
        <div className="-mx-2 overflow-x-auto px-2">
          <div className="h-64 min-w-[520px] sm:h-80 sm:min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} barGap={4}>
                <CartesianGrid vertical={false} stroke="#E2E8F0" strokeDasharray="3 3" />
                <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#64748B", fontWeight: 500 }} dy={10} />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  width={54}
                  tick={{ fontSize: 11, fill: "#64748B", fontWeight: 500 }}
                  tickFormatter={(v: number) => (Math.abs(v) >= 1000 ? `${Math.round(v / 1000)}k` : String(v))}
                />
                <Tooltip cursor={{ fill: "#F8FAFC", opacity: 0.5 }} content={<ChartTooltip />} />
                <Bar dataKey="Receita" fill="#059669" radius={[4, 4, 0, 0]} maxBarSize={32} />
                <Bar dataKey="Despesas" fill="#DC2626" radius={[4, 4, 0, 0]} maxBarSize={32} />
                <Bar dataKey="Lucro" fill="#2563EB" radius={[4, 4, 0, 0]} maxBarSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </Card>

      <Card className="bg-white border border-slate-200 rounded-xl p-6 shadow-none">
        <div className="mb-4 flex items-center gap-2">
          <Trophy className="h-5 w-5 text-slate-400" />
          <h2 className="text-lg font-bold text-slate-800">Ranking — Clientes Mais Lucrativos</h2>
        </div>
        <div className="space-y-4">
          {ranking.map((c, idx) => (
            <div key={c.id} className="flex items-center gap-3">
              <span className="w-5 text-right text-sm text-slate-500 font-medium">{idx + 1}</span>
              <div
                className="flex h-9 w-9 items-center justify-center rounded-lg text-sm font-bold"
                style={{ backgroundColor: `${c.color}1F`, color: c.color }}
              >
                {initial(c.name)}
              </div>
              <div className="flex-1">
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-800">{c.name}</span>
                  <span className="num text-sm font-bold text-slate-900">{brl(c.profit)}</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${Math.max(0, (c.profit / maxProfit) * 100)}%`, backgroundColor: `${c.color}B3` }}
                  />
                </div>
              </div>
            </div>
          ))}
          {ranking.length === 0 && <p className="text-sm text-slate-500">Nenhum cliente cadastrado.</p>}
        </div>
      </Card>

      <Card className="bg-white border border-slate-200 rounded-xl p-6 shadow-none">
        <h2 className="mb-4 text-lg font-bold text-slate-800">Resumo mês a mês</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="pb-3 text-left font-semibold text-slate-500 uppercase text-xs">Mês</th>
                <th className="pb-3 text-right font-semibold text-slate-500 uppercase text-xs">Receita</th>
                <th className="pb-3 text-right font-semibold text-slate-500 uppercase text-xs">Desp. Operacionais</th>
                <th className="pb-3 text-right font-semibold text-slate-500 uppercase text-xs">Fat. Distribuidora</th>
                <th className="pb-3 text-right font-semibold text-slate-500 uppercase text-xs">Despesas</th>
                <th className="pb-3 text-right font-semibold text-slate-500 uppercase text-xs">Lucro</th>
              </tr>
            </thead>
            <tbody>
              {summary.map(row => (
                <tr key={row.month} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                  <td className="py-4 text-slate-800 font-medium">{row.month}</td>
                  <td className="num py-4 text-right font-semibold text-[#059669]">{brl(row.Receita)}</td>
                  <td className="num py-4 text-right text-slate-500">{brl(row.Operacionais)}</td>
                  <td className="num py-4 text-right text-slate-500">{brl(row.Distribuidora)}</td>
                  <td className="num py-4 text-right font-semibold text-[#DC2626]">{brl(row.Despesas)}</td>
                  <td className={`num py-4 text-right font-bold ${row.Lucro < 0 ? "text-[#DC2626]" : "text-[#059669]"}`}>{brl(row.Lucro)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="bg-white border border-slate-200 rounded-xl p-6 shadow-none">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <div className="text-sm text-slate-500 font-medium">Total de Clientes</div>
            <div className="text-2xl font-bold text-slate-800">{data.clients.length}</div>
          </div>
        </div>
      </Card>
    </div>
  );
}

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-border bg-card px-3 py-2 elev-3">
      <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center justify-between gap-6 text-sm">
          <span className="inline-flex items-center gap-2 text-muted-foreground">
            <span className="h-2 w-2 rounded-sm" style={{ background: p.fill }} />
            {p.dataKey}
          </span>
          <span className="num font-semibold text-foreground">{brl(Number(p.value))}</span>
        </div>
      ))}
    </div>
  );
}

function StatCard({
  icon, label, value, tint, hint, delta, invertDelta,
}: {
  icon: React.ReactElement; label: string; value: number; tint: "leaf" | "clay";
  hint?: string; delta?: number | null; invertDelta?: boolean;
}) {
  const isEmerald = tint === "leaf";
  const iconColor = isEmerald ? "text-emerald-600" : "text-red-600";
  const textColor = isEmerald ? "text-emerald-600" : "text-red-600";
  
  const styledIcon = React.cloneElement(icon, {
    className: cn(icon.props.className, iconColor)
  });

  const good = delta == null ? null : invertDelta ? delta <= 0 : delta >= 0;
  
  return (
    <Card className="bg-white p-6 border border-slate-200 rounded-xl shadow-sm transition-all hover:shadow-md">
      <div className="mb-4 flex items-start justify-between gap-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-50 border border-slate-100">
          {styledIcon}
        </div>
        {delta != null && Number.isFinite(delta) && (
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold",
              good ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
            )}
          >
            {delta >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {Math.abs(delta).toFixed(0)}%
          </span>
        )}
      </div>
      <div className="text-xs font-bold uppercase tracking-wider text-slate-400">{label}</div>
      <div className={cn("mt-2 text-2xl font-bold leading-none tabular-nums", textColor)}>
        {brl(value)}
      </div>
      {hint && <div className="mt-3 text-[10px] leading-relaxed text-slate-400 font-medium">{hint}</div>}
    </Card>
  );
}