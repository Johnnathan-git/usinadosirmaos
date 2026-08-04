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
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Visão geral — {monthLabelLong(now)}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={<TrendingUp className="h-5 w-5" />} label={`Receita ${monthLabel(now)}`} value={brl(receitaMes)} tint="leaf" delta={delta(receitaMes, receitaPrev)} />
        <StatCard
          icon={<TrendingDown className="h-5 w-5" />}
          label={`Despesas ${monthLabel(now)}`}
          value={brl(despesasMes)}
          tint="clay"
          invertDelta
          delta={delta(despesasMes, despesasPrev)}
          hint={`Operacionais ${brl(despesasOperMes)} + Distribuidora ${brl(faturasDistMes)}`}
        />
        <StatCard icon={<DollarSign className="h-5 w-5" />} label={`Lucro ${monthLabel(now)}`} value={brl(lucroMes)} tint="solar" featured delta={delta(lucroMes, lucroPrev)} />
        <StatCard icon={<Receipt className="h-5 w-5" />} label={`Receita ${now.getFullYear()}`} value={brl(receitaAno)} tint="sky" />
      </div>

      <Card className="bg-card p-4 sm:p-6 border shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Receita, Despesas e Lucro</h2>
          <div className="flex flex-wrap items-center gap-3 text-xs font-medium text-muted-foreground">
            {[["Receita", "var(--leaf)"], ["Despesas", "var(--destructive)"], ["Lucro", "var(--solar)"]].map(([k, c]) => (
              <span key={k} className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm" style={{ background: c }} />
                {k}
              </span>
            ))}
            <span className="text-muted-foreground/70">últimos 6 meses</span>
          </div>
        </div>
        <div className="-mx-2 overflow-x-auto px-2">
          <div className="h-64 min-w-[520px] sm:h-80 sm:min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} barGap={4}>
                <CartesianGrid vertical={false} stroke="var(--border)" strokeOpacity={0.7} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  width={54}
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  tickFormatter={(v: number) => (Math.abs(v) >= 1000 ? `${Math.round(v / 1000)}k` : String(v))}
                />
                <Tooltip cursor={{ fill: "var(--muted)", opacity: 0.5 }} content={<ChartTooltip />} />
                <Bar dataKey="Receita" fill="var(--leaf)" radius={[4, 4, 0, 0]} maxBarSize={32} />
                <Bar dataKey="Despesas" fill="var(--destructive)" radius={[4, 4, 0, 0]} maxBarSize={32} />
                <Bar dataKey="Lucro" fill="var(--solar)" radius={[4, 4, 0, 0]} maxBarSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </Card>

      <Card className="bg-card p-4 sm:p-6 border shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <Trophy className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Ranking — Clientes Mais Lucrativos</h2>
        </div>
        <div className="space-y-3">
          {ranking.map((c, idx) => (
            <div key={c.id} className="flex items-center gap-3">
              <span className="w-5 text-right text-sm text-muted-foreground">{idx + 1}</span>
              <div
                className="flex h-9 w-9 items-center justify-center rounded-md text-sm font-semibold"
                style={{ backgroundColor: `${c.color}1F`, color: c.color }}
              >
                {initial(c.name)}
              </div>
              <div className="flex-1">
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-sm font-medium">{c.name}</span>
                  <span className="num text-sm font-semibold text-foreground">{brl(c.profit)}</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${Math.max(0, (c.profit / maxProfit) * 100)}%`, backgroundColor: `${c.color}B3` }}
                  />
                </div>
              </div>
            </div>
          ))}
          {ranking.length === 0 && <p className="text-sm text-muted-foreground">Nenhum cliente cadastrado.</p>}
        </div>
      </Card>

      <Card className="bg-card p-4 sm:p-6 border shadow-sm">
        <h2 className="mb-4 text-lg font-semibold">Resumo mês a mês</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50">
                <th className="pb-3 text-left font-medium">Mês</th>
                <th className="pb-3 text-right font-medium">Receita</th>
                <th className="pb-3 text-right font-medium">Desp. Operacionais</th>
                <th className="pb-3 text-right font-medium">Fat. Distribuidora</th>
                <th className="pb-3 text-right font-medium">Despesas</th>
                <th className="pb-3 text-right font-medium">Lucro</th>
              </tr>
            </thead>
            <tbody>
              {summary.map(row => (
                <tr key={row.month} className="border-t even:bg-slate-50/50">
                  <td className="py-3 text-foreground">{row.month}</td>
                  <td className="num py-3 text-right font-medium text-leaf">{brl(row.Receita)}</td>
                  <td className="num py-3 text-right text-muted-foreground">{brl(row.Operacionais)}</td>
                  <td className="num py-3 text-right text-muted-foreground">{brl(row.Distribuidora)}</td>
                  <td className="num py-3 text-right font-medium text-destructive">{brl(row.Despesas)}</td>
                  <td className={`num py-3 text-right font-semibold ${row.Lucro < 0 ? "text-[#DC2626]" : "text-[#059669]"}`}>{brl(row.Lucro)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="bg-card p-4 sm:p-6 border shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
            <Users className="h-6 w-6 text-muted-foreground" />
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Total de Clientes</div>
            <div className="text-2xl font-bold">{data.clients.length}</div>
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
  icon, label, value, tint, featured, hint, delta, invertDelta,
}: {
  icon: React.ReactNode; label: string; value: string; tint: "leaf" | "clay" | "solar" | "sky";
  featured?: boolean; hint?: string; delta?: number | null; invertDelta?: boolean;
}) {
  const iconBg: Record<string, string> = {
    leaf: "bg-[#059669] text-white",
    clay: "bg-[#DC2626] text-white",
    solar: "bg-[#0F172A] text-white",
    sky: "bg-[#0F172A] text-white",
  };
  const good = delta == null ? null : invertDelta ? delta <= 0 : delta >= 0;
  return (
    <Card className={`bg-card p-5 border shadow-sm transition-shadow hover:shadow-md ${featured ? "ring-1 ring-slate-900/20" : ""}`}>
      <div className="mb-4 flex items-start justify-between gap-2">
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${iconBg[tint]}`}>{icon}</div>
        {delta != null && Number.isFinite(delta) && (
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
              good ? "bg-[#D1FAE5] text-[#059669]" : "bg-[#FEE2E2] text-[#DC2626]"
            }`}
          >
            {delta >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {Math.abs(delta).toFixed(0)}%
          </span>
        )}
      </div>
      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="num-lg mt-1.5 text-[26px] font-extrabold leading-none text-foreground">{value}</div>
      {hint && <div className="mt-2 text-xs text-muted-foreground">{hint}</div>}
    </Card>
  );
}