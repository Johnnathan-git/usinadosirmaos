alter table public.clients add column if not exists first_name text;
grant select, insert, update on public.clients to authenticated;
grant all on public.clients to service_role;