create table if not exists public.bank_account_settings (
  id smallint primary key default 1 check (id = 1),
  balance numeric not null default 0,
  initialized boolean not null default false,
  invoice_snapshot jsonb not null default '{}'::jsonb,
  expense_snapshot jsonb not null default '{}'::jsonb,
  adjusted_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.bank_account_settings enable row level security;

create policy "Authenticated users can read bank account"
on public.bank_account_settings for select
to authenticated
using (true);

create policy "Authenticated users can update bank account"
on public.bank_account_settings for update
to authenticated
using (true)
with check (true);

insert into public.bank_account_settings (id, balance, initialized)
values (1, 0, false)
on conflict (id) do nothing;
