/**
 * Execute esta instrucao no projeto: Não precisa dessa opçao de alterar minha senha ao lado de + Novo Usuario. Preciso que tenha essa opçao para os usuários que logarem no sistema.
 */
import React, { Suspense, useState, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { brl, monthLabel, monthLabelLong, initial } from "@/lib/format";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, DollarSign, Receipt, Users, Trophy, ArrowUpRight, ArrowDownRight, Briefcase } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Legend, Tooltip } from "recharts";

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
    .filter(i => i.reference_date.startsWith(String(now.getFullYear())))
    .reduce((a, i) => a + (Number(i.client_pays) - Number(i.distributor_invoice)), 0);
  const despesasOperAno = data.expenses
    .filter(e => e.reference_date.startsWith(String(now.getFullYear())))
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
      Concessionária: distribuidora,
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
        <h1 className="text-4xl font-bold tracking-tight text-[#374151]">Dashboard</h1>
        <p className="text-sm font-medium text-[#4B5563]">Visão geral — {monthLabelLong(now)}</p>
      </div>

      <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-4 scrollbar-hide lg:grid lg:grid-cols-4 lg:pb-0 lg:snap-none">
        <StatCard icon={<TrendingUp className="h-5 w-5" />} label="Receita Mensal" value={receitaMes} tint="leaf" delta={delta(receitaMes, receitaPrev)} delay={0} />
        <StatCard
          icon={<TrendingDown className="h-5 w-5" />}
          label="Despesas Mensais"
          value={despesasMes}
          tint="clay"
          invertDelta
          delta={delta(despesasMes, despesasPrev)}
          hint={`Operacionais ${brl(despesasOperMes)} + Concessionária ${brl(faturasDistMes)}`}
          delay={80}
        />
        <StatCard icon={<DollarSign className="h-5 w-5" />} label="Lucro do Mês" value={lucroMes} tint="sky" delta={delta(lucroMes, lucroPrev)} delay={160} />
        <StatCard icon={<Briefcase className="h-5 w-5" />} label="Lucro Acumulado (Ano)" value={lucroAnualReal} tint="amber" delay={240} />
      </div>

      <div className="flex items-center justify-center gap-1.5 pb-2 lg:hidden">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-1.5 w-1.5 rounded-full bg-slate-300" />
        ))}
      </div>

      <Card className="rounded-[10px] border border-[#E4E7EC] bg-white p-6 shadow-sm">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-[#374151]">Performance Financeira</h2>
          <div className="flex flex-wrap items-center gap-4 text-[10px] font-bold text-[#4B5563] uppercase tracking-wider">
            {[["Receita", "#2F6F62"], ["Despesas", "#D64545"], ["Lucro", "#2E5C8A"]].map(([k, c]) => (
              <span key={k} className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full" style={{ background: c }} />
                {k}
              </span>
            ))}
          </div>
        </div>
        <div className="-mx-2 overflow-x-auto px-2">
          <div className="h-64 min-w-[520px] sm:h-80 sm:min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} barGap={8} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="#F1F5F9" strokeDasharray="3 3" />
                <XAxis 
                  dataKey="month" 
                  tickLine={false} 
                  axisLine={false} 
                  tick={{ fontSize: 11, fill: "#94A3B8", fontWeight: 500 }} 
                  dy={10} 
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11, fill: "#94A3B8", fontWeight: 500 }}
                  tickFormatter={(v: number) => (Math.abs(v) >= 1000 ? `${v / 1000}k` : String(v))}
                />
                <Tooltip 
                  cursor={{ fill: "#F8FAFC", opacity: 0.4 }} 
                  content={<ChartTooltip />} 
                />
                <Bar dataKey="Receita" fill="#2F6F62" radius={[4, 4, 0, 0]} maxBarSize={32} animationDuration={500} animationEasing="ease-out" />
                <Bar dataKey="Despesas" fill="#D64545" radius={[4, 4, 0, 0]} maxBarSize={32} animationDuration={500} animationEasing="ease-out" />
                <Bar dataKey="Lucro" fill="#2E5C8A" radius={[4, 4, 0, 0]} maxBarSize={32} animationDuration={500} animationEasing="ease-out" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </Card>

      <Card className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <Trophy className="h-5 w-5 text-slate-400" />
          <h2 className="text-lg font-bold text-[#374151]">Ranking — Clientes Mais Lucrativos</h2>
        </div>
        <div className="space-y-4">
          {ranking.map((c, idx) => (
            <div key={c.id} className="flex items-center gap-3">
              <span className="w-5 text-right text-sm text-slate-500 font-medium">{idx + 1}</span>
              <div
                className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold text-white shadow-sm"
                style={{ backgroundColor: c.color }}
              >
                {initial(c.name)}
              </div>
              <div className="flex-1">
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-sm font-bold text-[#374151]">{c.name}</span>
                  <span className="num text-sm font-bold text-[#374151]">{brl(c.profit)}</span>
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

      <Card className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        <h2 className="mb-6 text-lg font-bold text-[#374151]">Resumo de Lançamentos</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#E4E7EC]">
                <th className="pb-3 text-left font-semibold text-[#4B5563] uppercase text-[10px] tracking-wider">Mês</th>
                <th className="pb-3 text-right font-semibold text-[#4B5563] uppercase text-[10px] tracking-wider">Receita</th>
                <th className="pb-3 text-right font-semibold text-[#4B5563] uppercase text-[10px] tracking-wider">Desp. Operacionais</th>
                <th className="pb-3 text-right font-semibold text-[#4B5563] uppercase text-[10px] tracking-wider">Fat. Concessionária</th>
                <th className="pb-3 text-right font-semibold text-[#4B5563] uppercase text-[10px] tracking-wider">Despesas</th>
                <th className="pb-3 text-right font-semibold text-[#4B5563] uppercase text-[10px] tracking-wider">Lucro</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F5F6F8]">
              {summary.map(row => (
                <tr key={row.month} className="hover:bg-[#F5F6F8]/50 transition-colors zebra-stripe">
                  <td className="py-4 text-[#374151] font-bold">{row.month}</td>
                  <td className="num py-4 text-right font-medium text-[#4B5563]">{brl(row.Receita)}</td>
                  <td className="num py-4 text-right text-[#4B5563]">{brl(row.Operacionais)}</td>
                  <td className="num py-4 text-right text-[#4B5563]">{brl(row.Concessionária)}</td>
                  <td className="num py-4 text-right font-medium text-[#4B5563]">{brl(row.Despesas)}</td>
                  <td className="num py-4 text-right font-bold text-[#2E5C8A]">{brl(row.Lucro)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="rounded-[10px] border border-[#E4E7EC] bg-white p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#F5F6F8] text-[#9CA3AF]">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-[#4B5563]">Total de Clientes</div>
            <div className="text-2xl font-bold text-[#374151]">{data.clients.length}</div>
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
  icon, label, value, tint, hint, delta, invertDelta, delay = 0,
}: {
  icon: React.ReactElement<any>; label: string; value: number; tint: "leaf" | "clay" | "sky" | "amber";
  hint?: string; delta?: number | null; invertDelta?: boolean; delay?: number;
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
  
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let start = 0;
    const duration = 600;
    const startTime = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function (easeOutQuad)
      const easeProgress = progress * (2 - progress);
      
      setDisplayValue(start + (value - start) * easeProgress);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [value]);

  return (
    <Card 
      className="relative min-w-[260px] flex-shrink-0 snap-center overflow-hidden rounded-[10px] border border-[#E4E7EC] bg-white p-4 sm:p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md lg:min-w-0 lg:snap-align-none animate-in fade-in slide-in-from-bottom-3 fill-mode-both"
      style={{ 
        borderTop: `3px solid ${semanticColor}`,
        animationDelay: `${delay}ms`,
        animationDuration: '400ms'
      }}
    >
      <div className="mb-2 sm:mb-4 flex items-start justify-between gap-2">
        <div className={cn("flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-lg shadow-sm", iconBg)}>
          {styledIcon}
        </div>
        {delta != null && Number.isFinite(delta) && (
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold",
              good ? "bg-[#2F6F62]/10 text-[#2F6F62]" : "bg-[#D64545]/10 text-[#D64545]"
            )}
          >
            {delta >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {Math.abs(delta).toFixed(0)}%
          </span>
        )}
      </div>
      <div className="text-[10px] font-bold uppercase tracking-wider text-[#4B5563]">{label}</div>
      <div className="mt-1.5 text-base sm:text-xl font-bold leading-none num-lg" style={{ color: semanticColor }}>
        {brl(displayValue)}
      </div>
      {hint && <div className="mt-4 text-[10px] leading-relaxed text-[#9CA3AF] font-medium">{hint}</div>}
    </Card>
  );
}