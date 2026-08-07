import React, { Suspense, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { FileSpreadsheet, Plus, Save } from "lucide-react";
import { brl, monthLabelLong } from "@/lib/format";
import { getFinancialData } from "@/lib/financas.functions";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const orcamentoQ = (month: string) => queryOptions({
  queryKey: ["orcamento", month],
  queryFn: () => getFinancialData({ data: { month } })
});

export const Route = createFileRoute("/orcamento")({
  ssr: false,
  component: OrcamentoPage,
});

function OrcamentoPage() {
  return (
    <AppLayout>
      <Suspense fallback={<div className="flex h-96 items-center justify-center text-muted-foreground">Carregando Orçamento...</div>}>
        <OrcamentoContent />
      </Suspense>
    </AppLayout>
  );
}

function OrcamentoContent() {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7) + "-01");
  const { data } = useSuspenseQuery(orcamentoQ(month));
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Record<string, string>>({});

  const categories = data.categories;
  const budgets = data.budgets;
  const transactions = data.transactions;

  const handleSave = async (categoryId: string) => {
    const val = Number(editing[categoryId]);
    if (isNaN(val)) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("budgets").upsert({
      user_id: user.id,
      category_id: categoryId,
      month,
      amount_projected: val
    }, { onConflict: "user_id,category_id,month" });

    if (error) toast.error(error.message);
    else {
      toast.success("Orçamento atualizado");
      setEditing(prev => {
        const next = { ...prev };
        delete next[categoryId];
        return next;
      });
      qc.invalidateQueries({ queryKey: ["orcamento"] });
    }
  };

  const getRealized = (categoryId: string) => {
    return transactions
      .filter(t => t.category_id === categoryId)
      .reduce((a, t) => a + Number(t.amount), 0);
  };

  const getProjected = (categoryId: string) => {
    return budgets.find(b => b.category_id === categoryId)?.amount_projected || 0;
  };

  const totals = useMemo(() => {
    const projIncome = categories.filter(c => c.type === 'income').reduce((a, c) => a + getProjected(c.id), 0);
    const projExpense = categories.filter(c => c.type === 'expense').reduce((a, c) => a + getProjected(c.id), 0);
    const realIncome = transactions.filter(t => t.type === 'income').reduce((a, t) => a + Number(t.amount), 0);
    const realExpense = transactions.filter(t => t.type === 'expense').reduce((a, t) => a + Number(t.amount), 0);
    return { projIncome, projExpense, realIncome, realExpense };
  }, [categories, budgets, transactions]);

  return (
    <div className="mx-auto max-w-7xl space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-foreground font-display">Orçamento Familiar</h1>
          <p className="text-sm font-medium text-muted-foreground mt-1">Planeje e acompanhe sua evolução financeira</p>
        </div>
        <Input 
          type="month" 
          value={month.slice(0, 7)} 
          onChange={e => setMonth(e.target.value + "-01")}
          className="w-40 bg-card/50 border-border"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <BudgetSummaryCard 
          title="Receitas" 
          projected={totals.projIncome} 
          realized={totals.realIncome} 
          color="emerald" 
        />
        <BudgetSummaryCard 
          title="Despesas" 
          projected={totals.projExpense} 
          realized={totals.realExpense} 
          color="rose" 
        />
      </div>

      <div className="space-y-6">
        <h2 className="text-xl font-bold text-foreground">Detalhamento por Categoria</h2>
        <div className="grid grid-cols-1 gap-4">
          {categories.map(cat => {
            const projected = getProjected(cat.id);
            const realized = getRealized(cat.id);
            const isEditing = editing[cat.id] !== undefined;
            const percentage = projected > 0 ? (realized / projected) * 100 : realized > 0 ? 100 : 0;
            
            return (
              <Card key={cat.id} className="glass-card border-none p-6 rounded-3xl overflow-hidden relative group">
                <div className={`absolute top-0 left-0 w-1 h-full ${cat.type === 'income' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                  <div className="flex items-center gap-4 min-w-[200px]">
                    <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${cat.type === 'income' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                      {cat.icon === 'Wallet' ? <FileSpreadsheet className="h-5 w-5" /> : '📋'}
                    </div>
                    <div>
                      <div className="font-bold text-foreground">{cat.name}</div>
                      <div className="text-[10px] uppercase tracking-tighter text-muted-foreground font-bold">Realizado: {brl(realized)}</div>
                    </div>
                  </div>

                  <div className="flex-1 space-y-2">
                    <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      <span>Progresso</span>
                      <span>{percentage.toFixed(0)}%</span>
                    </div>
                    <Progress value={Math.min(100, percentage)} className={`h-2 rounded-full ${cat.type === 'income' ? 'bg-emerald-500/20' : 'bg-rose-500/20'}`} />
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <Label className="text-[9px] uppercase tracking-tighter text-muted-foreground font-bold block mb-1">Projetado (R$)</Label>
                      {isEditing ? (
                        <div className="flex items-center gap-2">
                          <Input 
                            type="number" 
                            autoFocus
                            value={editing[cat.id]}
                            onChange={e => setEditing({...editing, [cat.id]: e.target.value})}
                            className="w-24 h-8 bg-white/5 border-border rounded-lg text-right font-bold"
                          />
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-emerald-500" onClick={() => handleSave(cat.id)}>
                            <Save className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <div 
                          className="text-lg font-bold text-foreground num cursor-pointer hover:text-primary transition-colors"
                          onClick={() => setEditing({...editing, [cat.id]: String(projected)})}
                        >
                          {brl(projected)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function BudgetSummaryCard({ title, projected, realized, color }: { title: string, projected: number, realized: number, color: 'emerald' | 'rose' }) {
  const diff = realized - projected;
  const isOver = realized > projected;
  const percentage = projected > 0 ? (realized / projected) * 100 : realized > 0 ? 100 : 0;

  return (
    <Card className="glass-card-interactive p-8 border-none rounded-[2rem] overflow-hidden relative">
      <div className={`absolute top-0 right-0 w-32 h-32 bg-${color}-500/10 blur-3xl -mr-16 -mt-16`} />
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">{title}</span>
          <div className={`text-2xl font-black ${color === 'emerald' ? 'text-emerald-500' : 'text-rose-500'}`}>
            {percentage.toFixed(0)}%
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-8">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Projetado</div>
            <div className="text-2xl font-bold text-foreground num-lg">{brl(projected)}</div>
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Realizado</div>
            <div className="text-2xl font-bold text-foreground num-lg">{brl(realized)}</div>
          </div>
        </div>

        <div className="space-y-2">
          <Progress value={Math.min(100, percentage)} className={`h-3 rounded-full bg-white/5`} />
          <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest">
            <span className="text-muted-foreground">Diferença</span>
            <span className={diff > 0 ? 'text-emerald-500' : diff < 0 ? 'text-rose-500' : 'text-muted-foreground'}>
              {diff > 0 ? '+' : ''}{brl(diff)}
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
}

import { useMemo } from "react";
