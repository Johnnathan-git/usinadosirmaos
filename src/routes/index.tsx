/**
 * Execute esta instrucao no projeto: Chegue ela um pouco para a esquerda
 */
import React, { Suspense } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { brl, monthLabel, monthLabelLong, initial } from "@/lib/format";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, DollarSign, Receipt, Users, Trophy, ArrowUpRight, ArrowDownRight, Briefcase } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Legend, Tooltip, AreaChart, Area } from "recharts";

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
  const lucroAno = data.invoices
    .filter(i => {
      const isThisYear = i.reference_date.startsWith(String(now.getFullYear()));
      const [year, month] = i.reference_date.split("-").map(Number);
      const refDate = new Date(year, month - 1, 1);
      const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      // Considera meses anteriores ou iguais ao mês atual
      return isThisYear && refDate <= currentMonthStart;
    })
    .reduce((a, i) => a + (Number(i.client_pays) - Number(i.distributor_invoice)), 0);

  const despesasOperAno = data.expenses
    .filter(e => {
      const isThisYear = e.reference_date.startsWith(String(now.getFullYear()));
      const [year, month] = e.reference_date.split("-").map(Number);
      const refDate = new Date(year, month - 1, 1);
      const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      return isThisYear && refDate <= currentMonthStart;
    })
    .reduce((a, e) => a + Number(e.amount), 0);
  const lucroAnualReal = lucroAno - despesasOperAno;

  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevKey = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, "0")}`;
  const receitaPrev = data.invoices.filter(i => inMonth(i.reference_date, prevKey))
    .reduce((a, i) => a + Number(i.client_pays), 0);
  const despesasPrev =
    data.invoices.filter(i => inMonth(i.reference_date, prevKey)).reduce((a, i) => a + Number(i.distributor_invoice), 0) +
    data.expenses.filter(e => inMonth(e.reference_date, prevKey)).reduce((a, e) => a + Number(e.amount), 0);
  const lucroPrev = receitaPrev - despesasPrev;
  const delta = (cur: number, old: number) => (old === 0 ? null : ((cur - old) / Math.abs(old)) * 100);

  // last 12 months for historical context
  const months: { key: string; label: string; date: Date }[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      label: monthLabel(d),
      date: d,
    });
  }
  const allChartData = months.map(m => {
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
      Concessionária: distribuidora,
      Lucro: receita - despesas,
    };
  });

  // performance chart usually shows last 6
  const chartData = allChartData.slice(-6);

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
    <div className="mx-auto max-w-7xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Dashboard</h1>
        <p className="text-sm font-medium text-muted-foreground mt-1">Visão geral — {monthLabelLong(now)}</p>

      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-2 lg:grid-cols-4 [&>*]:glass-card-interactive">
        <StatCard 
          icon={<TrendingUp className="h-4 w-4" />} 
          label="Receita Mensal" 
          value={receitaMes} 
          tint="leaf" 
          delta={delta(receitaMes, receitaPrev)} 
          sparkData={chartData.map(d => ({ value: d.Receita }))}
          delay={0}
        />
        <StatCard
          icon={<TrendingDown className="h-4 w-4" />}
          label="Despesas Mensais"
          value={despesasMes}
          tint="clay"
          invertDelta
          delta={delta(despesasMes, despesasPrev)}
          hint={`Operacionais ${brl(despesasOperMes)} + Concessionária ${brl(faturasDistMes)}`}
          sparkData={chartData.map(d => ({ value: d.Despesas }))}
          delay={60}
        />
        <StatCard 
          icon={<DollarSign className="h-4 w-4" />} 
          label="Lucro do Mês" 
          value={lucroMes} 
          tint="sky" 
          delta={delta(lucroMes, lucroPrev)} 
          sparkData={chartData.map(d => ({ value: d.Lucro }))}
          delay={120}
        />
        <StatCard 
          icon={<Briefcase className="h-4 w-4" />} 
          label="Lucro Acumulado (Ano)" 
          value={lucroAnualReal} 
          tint="amber" 
          sparkData={allChartData.map(d => ({ value: d.Lucro }))}
          delay={180}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="glass-card rounded-2xl p-6">
            <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-base font-bold text-foreground">Performance Financeira</h2>
              <div className="flex flex-wrap items-center gap-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                {[["Receita", "#2F6F62"], ["Despesas", "#D64545"], ["Lucro", "#2E5C8A"]].map(([k, c]) => (
                  <span key={k} className="inline-flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: c }} />
                    {k}
                  </span>
                ))}
              </div>
            </div>
            <div className="-mx-2 overflow-x-auto px-2">
              <div className="h-72 min-w-[520px] sm:min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} barGap={8} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" opacity={0.5} />
                    <XAxis 
                      dataKey="month" 
                      tickLine={false} 
                      axisLine={false} 
                      tick={{ fontSize: 10, fill: "var(--muted-foreground)", fontWeight: 500 }} 
                      dy={10} 
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 10, fill: "var(--muted-foreground)", fontWeight: 500 }}
                      tickFormatter={(v: number) => (Math.abs(v) >= 1000 ? `${v / 1000}k` : String(v))}
                    />
                    <Tooltip 
                      cursor={{ fill: "var(--accent)", opacity: 0.1 }} 
                      content={<ChartTooltip />} 
                    />
                    <Bar dataKey="Receita" fill="#2F6F62" radius={[3, 3, 0, 0]} maxBarSize={24} />
                    <Bar dataKey="Despesas" fill="#D64545" radius={[3, 3, 0, 0]} maxBarSize={24} />
                    <Bar dataKey="Lucro" fill="#2E5C8A" radius={[3, 3, 0, 0]} maxBarSize={24} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </Card>

          <Card className="glass-card rounded-2xl p-6">
            <h2 className="mb-6 text-base font-bold text-foreground text-glow">Resumo de Lançamentos</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border">
                    <th className="pb-4 text-left font-bold text-muted-foreground uppercase tracking-widest">Mês</th>
                    <th className="pb-4 text-right font-bold text-muted-foreground uppercase tracking-widest">Receita</th>
                    <th className="pb-4 text-right font-bold text-muted-foreground uppercase tracking-widest">Desp. Operacionais</th>
                    <th className="pb-4 text-right font-bold text-muted-foreground uppercase tracking-widest">Concessionária</th>
                    <th className="pb-4 text-right font-bold text-muted-foreground uppercase tracking-widest">Despesas</th>
                    <th className="pb-4 text-right font-bold text-muted-foreground uppercase tracking-widest">Lucro</th>

                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {summary.map(row => (
                    <tr key={row.month} className="hover:bg-accent/30 transition-colors">
                      <td className="py-4 text-foreground font-semibold">{row.month}</td>
                      <td className="num py-4 text-right font-medium text-foreground">{brl(row.Receita)}</td>
                      <td className="num py-4 text-right text-muted-foreground">{brl(row.Operacionais)}</td>
                      <td className="num py-4 text-right text-muted-foreground">{brl(row.Concessionária)}</td>
                      <td className="num py-4 text-right font-medium text-foreground">{brl(row.Despesas)}</td>
                      <td className={cn(
                        "num py-4 text-right font-bold",
                        row.Lucro >= 0 ? "text-[#2F6F62] light:text-emerald-600" : "text-[#D64545]"
                      )}>
                        {brl(row.Lucro)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>


        <div className="space-y-6">
          <Card className="glass-card rounded-2xl p-6">
            <div className="mb-6 flex items-center gap-2">
              <Trophy className="h-4 w-4 text-primary" />
              <h2 className="text-base font-bold text-foreground tracking-tight text-glow">Ranking — Clientes Mais Lucrativos</h2>
            </div>
            <div className="space-y-4">
              {ranking.map((c, idx) => (
                <div 
                  key={c.id} 
                  className="flex items-center gap-3 p-2 rounded-lg transition-colors"
                >
                  <span className="w-5 text-right text-xs text-muted-foreground font-medium">{idx + 1}</span>
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white shadow-sm"
                    style={{ backgroundColor: c.color }}
                  >
                    {initial(c.name)}
                  </div>
                  <div className="flex-1">
                    <div className="mb-1.5 flex items-center justify-between">
                      <span className="text-xs font-bold text-foreground">{c.name}</span>
                      <span className="num text-xs font-bold text-foreground">{brl(c.profit)}</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-accent/50">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${Math.max(0, (c.profit / maxProfit) * 100)}%`, backgroundColor: `${c.color}B3` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
              {ranking.length === 0 && <p className="text-xs text-muted-foreground">Nenhum cliente cadastrado.</p>}
            </div>
          </Card>

          <Card className="glass-card rounded-2xl p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/30 text-muted-foreground">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Total de Clientes</div>
                <div className="text-xl font-bold text-foreground">{data.clients.length}</div>
              </div>
            </div>
          </Card>
        </div>

      </div>
    </div>
  );
}

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-card rounded-xl px-3 py-2 shadow-2xl">
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
  icon, label, value, tint, hint, delta, invertDelta, sparkData, delay
}: {
  icon: React.ReactElement<any>; label: string; value: number; tint: "leaf" | "clay" | "sky" | "amber";
  hint?: string; delta?: number | null; invertDelta?: boolean; sparkData?: { value: number }[]; delay?: number;
}) {
  const semanticColor = 
    tint === "leaf" ? "#2F6F62" : 
    tint === "clay" ? "#D64545" : 
    tint === "sky" ? "#2E5C8A" : 
    tint === "amber" ? "#C98A3E" :
    "#64748B";
  
  const iconBg = 
    tint === "leaf" ? "bg-[#2F6F62]/10" : 
    tint === "clay" ? "bg-[#D64545]/10" : 
    tint === "sky" ? "bg-[#2E5C8A]/10" : 
    tint === "amber" ? "bg-[#C98A3E]/10" :
    "bg-slate-100";
  
  const styledIcon = React.cloneElement(icon, {
    className: cn(icon.props.className),
    style: { color: semanticColor }
  });

  const good = delta == null ? null : invertDelta ? delta <= 0 : delta >= 0;
  
  return (
    <Card 
      className="glass-card relative overflow-hidden rounded-2xl p-4 animate-in fade-in slide-in-from-bottom-2 duration-300 fill-mode-both"
      style={{ 
        animationDelay: `${delay}ms`
      }}
    >
      {sparkData && (
        <div className="absolute inset-0 z-0 opacity-10 pointer-events-none">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={sparkData} margin={{ top: 40, right: 0, left: 0, bottom: 0 }}>
              <Area 
                type="monotone" 
                dataKey="value" 
                stroke={semanticColor} 
                fill={semanticColor} 
                strokeWidth={1.5} 
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="relative z-10">
        <div className="mb-3 flex items-start justify-between gap-2">
          <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg shadow-sm border border-border/50", iconBg)}>
            {styledIcon}
          </div>
          {delta != null && Number.isFinite(delta) && (
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-bold border",
                good ? "bg-[#2F6F62]/10 text-[#2F6F62] border-[#2F6F62]/20" : "bg-[#D64545]/10 text-[#D64545] border-[#D64545]/20"
              )}
            >
              {delta >= 0 ? <ArrowUpRight className="h-2.5 w-2.5" /> : <ArrowDownRight className="h-2.5 w-2.5" />}
              {Math.abs(delta).toFixed(0)}%
            </span>
          )}
        </div>
        <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</div>
        <div className="mt-1 text-lg font-bold leading-none num-lg text-foreground">
          {brl(value)}
        </div>
        {hint && <div className="mt-3 text-[9px] leading-relaxed text-muted-foreground font-medium line-clamp-1">{hint}</div>}
      </div>
    </Card>
  );
}
