import React, { Suspense, useState, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Wallet, TrendingUp, TrendingDown, Calendar, Search, Trash2 } from "lucide-react";
import { brl, monthLabelLong } from "@/lib/format";
import { getFinancialData, saveTransaction, getSuggestions } from "@/lib/financas.functions";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";

const transacoesQ = (month?: string) => queryOptions({
  queryKey: ["transacoes", month],
  queryFn: () => getFinancialData({ data: { month } })
});

export const Route = createFileRoute("/transacoes")({
  ssr: false,
  component: TransacoesPage,
});

function TransacoesPage() {
  return (
    <AppLayout>
      <Suspense fallback={<div className="flex h-96 items-center justify-center text-muted-foreground">Carregando Finanças...</div>}>
        <TransacoesContent />
      </Suspense>
    </AppLayout>
  );
}

function TransacoesContent() {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7) + "-01");
  const { data } = useSuspenseQuery(transacoesQ(month));
  const [isNewOpen, setIsNewOpen] = useState(false);
  const qc = useQueryClient();

  const receitas = data.transactions.filter(t => t.type === 'income').reduce((a, t) => a + Number(t.amount), 0);
  const despesas = data.transactions.filter(t => t.type === 'expense').reduce((a, t) => a + Number(t.amount), 0);
  const saldo = receitas - despesas;

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir esta transação?")) return;
    const { error } = await supabase.from("transactions").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Transação excluída");
      qc.invalidateQueries({ queryKey: ["transacoes"] });
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-foreground font-display">Finanças John e Thais</h1>
          <p className="text-sm font-medium text-muted-foreground mt-1">Gestão financeira familiar autoral e moderna</p>
        </div>
        <div className="flex gap-2">
          <Input 
            type="month" 
            value={month.slice(0, 7)} 
            onChange={e => setMonth(e.target.value + "-01")}
            className="w-40 bg-card/50 border-border"
          />
          <Button onClick={() => setIsNewOpen(true)} className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl font-bold px-6">
            <Plus className="mr-2 h-4 w-4" /> Lançar
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        <KpiCard title="Receitas" value={receitas} type="income" icon={<TrendingUp className="h-5 w-5" />} />
        <KpiCard title="Despesas" value={despesas} type="expense" icon={<TrendingDown className="h-5 w-5" />} />
        <KpiCard title="Saldo do Mês" value={saldo} type="balance" icon={<Wallet className="h-5 w-5" />} />
      </div>

      <Card className="glass-card border-none overflow-hidden rounded-3xl">
        <div className="p-6 border-b border-white/5 bg-white/5">
          <h2 className="text-lg font-bold text-foreground">Lançamentos de {monthLabelLong(new Date(month))}</h2>
        </div>
        <div className="divide-y divide-white/5">
          {data.transactions.map((t: any) => (
            <div key={t.id} className="flex items-center justify-between p-6 hover:bg-white/[0.02] transition-colors group">
              <div className="flex items-center gap-4">
                <div className={`h-12 w-12 rounded-2xl flex items-center justify-center text-xl shadow-inner ${t.type === 'income' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                   {t.transaction_categories?.icon === 'Wallet' ? <Wallet className="h-5 w-5" /> : 
                    t.transaction_categories?.icon === 'Utensils' ? '🍽️' : 
                    t.transaction_categories?.icon === 'Car' ? '🚗' : '💸'}
                </div>
                <div>
                  <div className="font-bold text-foreground group-hover:text-primary transition-colors">{t.description}</div>
                  <div className="text-xs text-muted-foreground flex items-center gap-2">
                    <span className="capitalize">{t.transaction_categories?.name}</span>
                    <span>•</span>
                    <span>{new Date(t.date).toLocaleDateString('pt-BR')}</span>
                    {t.installment_total > 1 && (
                      <span className="text-primary font-bold bg-primary/10 px-1.5 rounded">
                        {t.installment_no}/{t.installment_total}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className={`text-lg font-bold num-lg ${t.type === 'income' ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {t.type === 'income' ? '+' : '-'} {brl(Number(t.amount))}
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => handleDelete(t.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-rose-500"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
          {data.transactions.length === 0 && (
            <div className="p-12 text-center text-muted-foreground italic">Nenhum lançamento neste mês.</div>
          )}
        </div>
      </Card>

      {isNewOpen && (
        <NewTransactionDialog 
          categories={data.categories} 
          onClose={() => setIsNewOpen(false)} 
        />
      )}
    </div>
  );
}

function KpiCard({ title, value, type, icon }: { title: string, value: number, type: 'income' | 'expense' | 'balance', icon: React.ReactNode }) {
  const colorClass = type === 'income' ? 'text-emerald-500' : type === 'expense' ? 'text-rose-500' : value >= 0 ? 'text-emerald-500' : 'text-rose-500';
  return (
    <Card className="glass-card-interactive p-6 border-none rounded-3xl overflow-hidden relative">
      <div className={`absolute top-0 left-0 w-1 h-full ${type === 'income' ? 'bg-emerald-500' : type === 'expense' ? 'bg-rose-500' : 'bg-primary'}`} />
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{title}</span>
        <div className={`h-10 w-10 rounded-xl flex items-center justify-center bg-white/5 ${colorClass}`}>
          {icon}
        </div>
      </div>
      <div className={`text-3xl font-bold num-lg ${colorClass}`}>
        {brl(value)}
      </div>
    </Card>
  );
}

function NewTransactionDialog({ categories, onClose }: { categories: any[], onClose: () => void }) {
  const qc = useQueryClient();
  const saveFn = useServerFn(saveTransaction);
  const getSuggFn = useServerFn(getSuggestions);
  
  const [f, setF] = useState({
    amount: "",
    description: "",
    date: new Date().toISOString().slice(0, 10),
    category_id: "",
    type: "expense" as "income" | "expense",
    installments: "1"
  });
  const [suggestions, setSuggestions] = useState<any[]>([]);

  const handleDescChange = async (val: string) => {
    setF(prev => ({ ...prev, description: val }));
    if (val.length > 2) {
      const res = await getSuggFn({ data: { term: val } });
      setSuggestions(res);
    } else {
      setSuggestions([]);
    }
  };

  const m = useMutation({
    mutationFn: () => saveFn({ data: {
      amount: Number(f.amount),
      description: f.description,
      date: f.date,
      category_id: f.category_id,
      type: f.type,
      installment_total: Number(f.installments)
    }}),
    onSuccess: () => {
      toast.success("Lançamento realizado!");
      qc.invalidateQueries({ queryKey: ["transacoes"] });
      onClose();
    },
    onError: (e: any) => toast.error(e.message)
  });

  return (
    <Dialog open onOpenChange={o => !o && onClose()}>
      <DialogContent className="glass-card border-none rounded-3xl max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold font-display">Novo Lançamento</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="flex p-1 bg-white/5 rounded-2xl">
            <button 
              onClick={() => setF({...f, type: 'expense'})}
              className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${f.type === 'expense' ? 'bg-rose-500 text-white shadow-lg' : 'text-muted-foreground hover:text-foreground'}`}
            >Despesa</button>
            <button 
              onClick={() => setF({...f, type: 'income'})}
              className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${f.type === 'income' ? 'bg-emerald-500 text-white shadow-lg' : 'text-muted-foreground hover:text-foreground'}`}
            >Receita</button>
          </div>

          <div className="relative">
            <Label className="text-xs uppercase tracking-widest text-muted-foreground mb-1.5 block">Descrição</Label>
            <Input 
              value={f.description} 
              onChange={e => handleDescChange(e.target.value)}
              placeholder="Ex: Supermercado BH"
              className="bg-white/5 border-border rounded-xl h-12"
            />
            {suggestions.length > 0 && (
              <div className="absolute top-full left-0 w-full mt-1 bg-popover border border-border rounded-xl shadow-2xl z-50 p-1">
                {suggestions.map((s: any) => (
                  <button 
                    key={s.id}
                    onClick={() => {
                      setF({...f, category_id: s.category_id});
                      setSuggestions([]);
                    }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-white/5 rounded-lg flex items-center justify-between"
                  >
                    <span>Sugerir: {s.transaction_categories?.name}</span>
                    <TrendingUp className="h-3 w-3 opacity-50" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs uppercase tracking-widest text-muted-foreground mb-1.5 block">Valor (R$)</Label>
              <Input 
                type="number" 
                value={f.amount} 
                onChange={e => setF({...f, amount: e.target.value})}
                placeholder="0,00"
                className="bg-white/5 border-border rounded-xl h-12 text-lg font-bold"
              />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-widest text-muted-foreground mb-1.5 block">Data</Label>
              <Input 
                type="date" 
                value={f.date} 
                onChange={e => setF({...f, date: e.target.value})}
                className="bg-white/5 border-border rounded-xl h-12"
              />
            </div>
          </div>

          <div>
            <Label className="text-xs uppercase tracking-widest text-muted-foreground mb-1.5 block">Categoria</Label>
            <Select value={f.category_id} onValueChange={v => setF({...f, category_id: v})}>
              <SelectTrigger className="bg-white/5 border-border rounded-xl h-12">
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                {categories.filter(c => c.type === f.type).map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {f.type === 'expense' && (
            <div>
              <Label className="text-xs uppercase tracking-widest text-muted-foreground mb-1.5 block">Parcelamento</Label>
              <Select value={f.installments} onValueChange={v => setF({...f, installments: v})}>
                <SelectTrigger className="bg-white/5 border-border rounded-xl h-12">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1,2,3,4,5,6,10,12,24,36].map(n => (
                    <SelectItem key={n} value={String(n)}>{n === 1 ? 'À vista' : `${n}x parcelas`}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} className="rounded-xl">Cancelar</Button>
          <Button 
            onClick={() => m.mutate()} 
            disabled={m.isPending || !f.amount || !f.category_id || !f.description}
            className={`rounded-xl px-8 font-bold ${f.type === 'income' ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-rose-500 hover:bg-rose-600'} text-white`}
          >
            {m.isPending ? "Salvando..." : "Confirmar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
