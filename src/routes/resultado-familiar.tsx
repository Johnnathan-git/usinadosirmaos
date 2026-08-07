import React, { Suspense, useState, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { brl, monthLabelLong } from "@/lib/format";
import { getFinancialData } from "@/lib/financas.functions";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from "recharts";

const resultadoQ = (month: string) => queryOptions({
  queryKey: ["resultado-familiar", month],
  queryFn: () => getFinancialData({ data: { month } })
});

export const Route = createFileRoute("/resultado-familiar")({
  ssr: false,
  component: ResultadoFamiliarPage,
});

function ResultadoFamiliarPage() {
  return (
    <AppLayout>
      <Suspense fallback={<div className="flex h-96 items-center justify-center text-muted-foreground">Carregando Resultados...</div>}>
        <ResultadoFamiliarContent />
      </Suspense>
    </AppLayout>
  );
}

function ResultadoFamiliarContent() {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7) + "-01");
  const { data } = useSuspenseQuery(resultadoQ(month));

  const totalReceitas = data.transactions.filter(t => t.type === 'income').reduce((a, t) => a + Number(t.amount), 0);
  const totalDespesas = data.transactions.filter(t => t.type === 'expense').reduce((a, t) => a + Number(t.amount), 0);
  const saldo = totalReceitas - totalDespesas;

  const expensesByCategory = useMemo(() => {
    const map = new Map<string, number>();
    data.transactions
      .filter(t => t.type === 'expense')
      .forEach(t => {
        const name = t.transaction_categories?.name || 'Outros';
        map.set(name, (map.get(name) || 0) + Number(t.amount));
      });
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [data.transactions]);

  const COLORS = ['#2563EB', '#059669', '#DC2626', '#C98A3E', '#7C3AED', '#DB2777', '#0891B2', '#EA580C'];

  const budgetVsReal = useMemo(() => {
    return data.categories
      .filter(c => c.type === 'expense')
      .map(c => {
        const budget = data.budgets.find(b => b.category_id === c.id)?.amount_projected || 0;
        const real = data.transactions.filter(t => t.category_id === c.id).reduce((a, t) => a + Number(t.amount), 0);
        return {
          name: c.name,
          Orçado: budget,
          Realizado: real
        };
      })
      .filter(item => item.Orçado > 0 || item.Realizado > 0);
  }, [data]);

  return (
    <div className="mx-auto max-w-7xl space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-foreground font-display">Resultado do Mês</h1>
          <p className="text-sm font-medium text-muted-foreground mt-1">Análise detalhada de {monthLabelLong(new Date(month))}</p>
        </div>
        <Input 
          type="month" 
          value={month.slice(0, 7)} 
          onChange={e => setMonth(e.target.value + "-01")}
          className="w-40 bg-card/50 border-border"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        <ResultStat title="Entradas" value={totalReceitas} color="emerald" />
        <ResultStat title="Saídas" value={totalDespesas} color="rose" />
        <ResultStat title="Saldo Líquido" value={saldo} color={saldo >= 0 ? "emerald" : "rose"} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="glass-card border-none p-6 rounded-[2rem]">
          <h2 className="text-xl font-bold text-foreground mb-8">Distribuição de Despesas</h2>
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={expensesByCategory}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={120}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {expensesByCategory.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: '1rem' }}
                  formatter={(value: number) => brl(value)}
                />
                <Legend verticalAlign="bottom" height={36}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="glass-card border-none p-6 rounded-[2rem]">
          <h2 className="text-xl font-bold text-foreground mb-8">Orçado vs Realizado</h2>
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={budgetVsReal} layout="vertical" margin={{ left: 20 }}>
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} />
                <Tooltip 
                  cursor={{ fill: 'white', opacity: 0.05 }}
                  contentStyle={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: '1rem' }}
                  formatter={(value: number) => brl(value)}
                />
                <Legend />
                <Bar dataKey="Orçado" fill="#2563EB" radius={[0, 4, 4, 0]} barSize={10} />
                <Bar dataKey="Realizado" fill="#059669" radius={[0, 4, 4, 0]} barSize={10} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Card className="glass-card border-none p-8 rounded-[2rem] bg-gradient-to-br from-primary/10 to-transparent">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-foreground">Taxa de Poupança</h2>
            <p className="text-sm text-muted-foreground">Percentual da receita que você conseguiu guardar este mês</p>
          </div>
          <div className="text-center">
            <div className="text-6xl font-black text-primary drop-shadow-2xl">
              {totalReceitas > 0 ? ((saldo / totalReceitas) * 100).toFixed(1) : 0}%
            </div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-2">Eficiência Financeira</div>
          </div>
        </div>
      </Card>
    </div>
  );
}

function ResultStat({ title, value, color }: { title: string, value: number, color: 'emerald' | 'rose' }) {
  return (
    <Card className="glass-card p-6 border-none rounded-3xl text-center">
      <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-2">{title}</div>
      <div className={`text-3xl font-black num-lg ${color === 'emerald' ? 'text-emerald-500' : 'text-rose-500'}`}>
        {brl(value)}
      </div>
    </Card>
  );
}
