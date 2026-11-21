-- QUBITS-BT: cobros recibidos de facturas.
-- Esta tabla se mantiene separada de qb_accounting_data para no reescribir
-- clientes, facturas, gastos ni cuentas existentes.

create table if not exists public.qb_income_entries (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id text not null,
  client_name text not null default '',
  invoice_id text not null,
  invoice_number text not null,
  account_id text not null,
  posting_date date not null,
  period text not null,
  amount numeric(18,2) not null check (amount > 0),
  description text not null default '',
  created_at timestamptz not null default now()
);

alter table public.qb_income_entries enable row level security;
revoke all on table public.qb_income_entries from anon;
grant select, insert, delete on table public.qb_income_entries to authenticated;

drop policy if exists "Users read own income entries" on public.qb_income_entries;
create policy "Users read own income entries"
  on public.qb_income_entries for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users add own income entries" on public.qb_income_entries;
create policy "Users add own income entries"
  on public.qb_income_entries for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users delete own income entries" on public.qb_income_entries;
create policy "Users delete own income entries"
  on public.qb_income_entries for delete to authenticated
  using ((select auth.uid()) = user_id);

create index if not exists qb_income_entries_user_period_idx
  on public.qb_income_entries (user_id, period);
create index if not exists qb_income_entries_invoice_idx
  on public.qb_income_entries (user_id, invoice_id);
