
-- Create tables for the new "Finanças John e Thais" system

-- 1. Transaction Categories
CREATE TABLE public.transaction_categories (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    type text NOT NULL CHECK (type IN ('income', 'expense')),
    icon text,
    color text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- 2. Transactions (Income/Expense/Future)
CREATE TABLE public.transactions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    category_id uuid REFERENCES public.transaction_categories(id) ON DELETE SET NULL,
    amount numeric NOT NULL,
    description text,
    date date NOT NULL,
    type text NOT NULL CHECK (type IN ('income', 'expense')),
    status text NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'pending', 'future')),
    installment_group uuid,
    installment_no integer,
    installment_total integer,
    attachment_url text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- 3. Budgets (Projected vs Realized)
CREATE TABLE public.budgets (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    category_id uuid REFERENCES public.transaction_categories(id) ON DELETE CASCADE NOT NULL,
    amount_projected numeric NOT NULL DEFAULT 0,
    month date NOT NULL, -- Stored as YYYY-MM-01
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE(user_id, category_id, month)
);

-- 4. Learning mappings for automatic categorization
CREATE TABLE public.category_suggestions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    search_term text NOT NULL,
    category_id uuid REFERENCES public.transaction_categories(id) ON DELETE CASCADE NOT NULL,
    frequency integer DEFAULT 1,
    UNIQUE(user_id, search_term)
);

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.transaction_categories TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.transactions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.budgets TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.category_suggestions TO authenticated;

GRANT ALL ON public.transaction_categories TO service_role;
GRANT ALL ON public.transactions TO service_role;
GRANT ALL ON public.budgets TO service_role;
GRANT ALL ON public.category_suggestions TO service_role;

GRANT SELECT ON public.transaction_categories TO anon;

-- RLS
ALTER TABLE public.transaction_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.category_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read for categories" ON public.transaction_categories FOR SELECT USING (true);
CREATE POLICY "Users can manage their own transactions" ON public.transactions FOR ALL TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own budgets" ON public.budgets FOR ALL TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own suggestions" ON public.category_suggestions FOR ALL TO authenticated USING (auth.uid() = user_id);

-- Seed basic categories
INSERT INTO public.transaction_categories (name, type, icon, color) VALUES
('Salário', 'income', 'Wallet', '#059669'),
('Investimentos', 'income', 'TrendingUp', '#059669'),
('Outras Receitas', 'income', 'Plus', '#059669'),
('Alimentação', 'expense', 'Utensils', '#DC2626'),
('Moradia', 'expense', 'Home', '#DC2626'),
('Transporte', 'expense', 'Car', '#DC2626'),
('Lazer', 'expense', 'Gamepad', '#DC2626'),
('Saúde', 'expense', 'HeartPulse', '#DC2626'),
('Educação', 'expense', 'GraduationCap', '#DC2626'),
('Assinaturas', 'expense', 'CreditCard', '#DC2626');
