import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";

export const getFinancialData = createServerFn({ method: "GET" })
  .inputValidator((data) => z.object({ month: z.string().optional() }).parse(data))
  .handler(async ({ data, request }) => {
    const month = data.month || new Date().toISOString().slice(0, 7) + "-01";
    const startOfMonth = month;
    const endOfMonth = new Date(new Date(month).getFullYear(), new Date(month).getMonth() + 1, 0).toISOString().slice(0, 10);

    const [transactions, budgets, categories] = await Promise.all([
      supabase.from("transactions").select("*, transaction_categories(*)").gte("date", startOfMonth).lte("date", endOfMonth),
      supabase.from("budgets").select("*, transaction_categories(*)").eq("month", month),
      supabase.from("transaction_categories").select("*")
    ]);

    return {
      transactions: transactions.data || [],
      budgets: budgets.data || [],
      categories: categories.data || []
    };
  });

export const saveTransaction = createServerFn({ method: "POST" })
  .inputValidator((data) => z.object({
    amount: z.number(),
    description: z.string(),
    date: z.string(),
    category_id: z.string().uuid(),
    type: z.enum(["income", "expense"]),
    status: z.enum(["completed", "pending", "future"]).default("completed"),
    installment_total: z.number().optional(),
  }).parse(data))
  .handler(async ({ data }) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    // If installments
    if (data.installment_total && data.installment_total > 1) {
      const group = crypto.randomUUID();
      const inserts = [];
      const startDate = new Date(data.date);
      for (let i = 1; i <= data.installment_total; i++) {
        const d = new Date(startDate);
        d.setMonth(d.getMonth() + i - 1);
        inserts.push({
          user_id: user.id,
          amount: data.amount / data.installment_total,
          description: `${data.description} (${i}/${data.installment_total})`,
          date: d.toISOString().slice(0, 10),
          category_id: data.category_id,
          type: data.type,
          status: i === 1 ? "completed" : "future",
          installment_group: group,
          installment_no: i,
          installment_total: data.installment_total
        });
      }
      return await supabase.from("transactions").insert(inserts);
    }

    return await supabase.from("transactions").insert({
      user_id: user.id,
      ...data
    });
  });

export const getSuggestions = createServerFn({ method: "GET" })
  .inputValidator((data) => z.object({ term: z.string() }).parse(data))
  .handler(async ({ data }) => {
    return await supabase.from("category_suggestions")
      .select("*, transaction_categories(*)")
      .ilike("search_term", `%${data.term}%`)
      .order("frequency", { ascending: false })
      .limit(3);
  });
