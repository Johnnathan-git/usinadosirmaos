import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { brl, monthLabel, monthLabelLong, initial } from "@/lib/format";
import { TrendingUp, TrendingDown, DollarSign, Receipt, Users, Trophy } from "lucide-react";
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
      { title: "Dashboard — Usina JJ" },
      { name: "description", content: "Visão geral de receitas, despesas e lucro da Usina JJ." },
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
  const despesasMes = data.expenses.filter(e => inMonth(e.reference_date, curKey))
    .reduce((a, e) => a + Number(e.amount), 0);
  const lucroMes = receitaMes - despesasMes;
  const receitaAno = data.invoices.filter(i => i.reference_date.startsWith(String(now.getFullYear())))
    .reduce((a, i) => a + Number(i.client_pays), 0);

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
    const despesas = data.expenses.filter(e => inMonth(e.reference_date, m.key))
      .reduce((a, e) => a + Number(e.amount), 0);
    return { month: m.label, Receita: receita, Despesas: despesas, Lucro: receita - despesas };
  });

  // ranking
  const profitByClient = new Map<string, number>();
  for (const i of data.invoices) {
    profitByClient.set(i.client_id, (profitByClient.get(i.client_id) ?? 0) + invoiceProfit(i));
  }
  const ranking = data.clients
    .map(c => ({ ...c, profit: profitByClient.get(c.id) ?? 0 }))
    .sort((a, b) => b.profit - a.profit);
  const maxProfit = Math.max(1, ...ranking.map(r => r.profit));

  // monthly summary (last 6)
  const summary = [...chartData].reverse();

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Visão geral — {monthLabelLong(now)}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={<TrendingUp className="h-5 w-5 text-emerald-600" />} label={`Receita ${monthLabel(now)}`} value={brl(receitaMes)} tint="emerald" />
        <StatCard icon={<TrendingDown className="h-5 w-5 text-rose-600" />} label={`Despesas ${monthLabel(now)}`} value={brl(despesasMes)} tint="rose" />
        <StatCard icon={<DollarSign className="h-5 w-5 text-amber-600" />} label={`Lucro ${monthLabel(now)}`} value={brl(lucroMes)} tint="amber" highlight={lucroMes < 0} />
        <StatCard icon={<Receipt className="h-5 w-5 text-violet-600" />} label={`Receita ${now.getFullYear()}`} value={brl(receitaAno)} tint="violet" />
      </div>

      <Card className="p-6">
        <h2 className="mb-4 text-lg font-semibold">Receita, Despesas e Lucro (últimos 6 meses)</h2>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(v: number) => brl(v)} />
              <Legend />
              <Bar dataKey="Receita" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Despesas" fill="#ef4444" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Lucro" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card className="p-6">
        <div className="mb-4 flex items-center gap-2">
          <Trophy className="h-5 w-5 text-amber-500" />
          <h2 className="text-lg font-semibold">Ranking — Clientes Mais Lucrativos</h2>
        </div>
        <div className="space-y-3">
          {ranking.map((c, idx) => (
            <div key={c.id} className="flex items-center gap-3">
              <span className="w-5 text-right text-sm text-muted-foreground">{idx + 1}</span>
              <div
                className="flex h-9 w-9 items-center justify-center rounded-md text-sm font-semibold text-white"
                style={{ backgroundColor: c.color }}
              >
                {initial(c.name)}
              </div>
              <div className="flex-1">
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-sm font-medium">{c.name}</span>
                  <span className="text-sm font-semibold text-blue-600">{brl(c.profit)}</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${Math.max(0, (c.profit / maxProfit) * 100)}%`, backgroundColor: c.color }}
                  />
                </div>
              </div>
            </div>
          ))}
          {ranking.length === 0 && <p className="text-sm text-muted-foreground">Nenhum cliente cadastrado.</p>}
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="mb-4 text-lg font-semibold">Resumo mês a mês</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-wide text-muted-foreground">
                <th className="pb-3 text-left font-medium">Mês</th>
                <th className="pb-3 text-right font-medium">Receita</th>
                <th className="pb-3 text-right font-medium">Despesas</th>
                <th className="pb-3 text-right font-medium">Lucro</th>
              </tr>
            </thead>
            <tbody>
              {summary.map(row => (
                <tr key={row.month} className="border-t">
                  <td className="py-3 text-foreground">{row.month}</td>
                  <td className="py-3 text-right font-medium text-emerald-600">{brl(row.Receita)}</td>
                  <td className="py-3 text-right font-medium text-rose-600">{brl(row.Despesas)}</td>
                  <td className={`py-3 text-right font-semibold ${row.Lucro < 0 ? "text-amber-600" : "text-blue-600"}`}>{brl(row.Lucro)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="p-6">
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

function StatCard({
  icon, label, value, tint, highlight,
}: { icon: React.ReactNode; label: string; value: string; tint: string; highlight?: boolean }) {
  const bg: Record<string, string> = {
    emerald: "bg-emerald-50",
    rose: "bg-rose-50",
    amber: "bg-amber-50",
    violet: "bg-violet-50",
  };
  return (
    <Card className={`p-5 ${highlight ? "ring-1 ring-amber-200 bg-amber-50/40" : ""}`}>
      <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-lg ${bg[tint]}`}>{icon}</div>
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className={`mt-1 text-2xl font-bold ${highlight ? "text-amber-600" : "text-foreground"}`}>{value}</div>
    </Card>
  );
}