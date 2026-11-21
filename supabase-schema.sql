-- QUBITS-BT: almacenamiento privado de datos contables por usuario.
-- Ejecuta este archivo en Supabase > SQL Editor como administrador del proyecto.

create table if not exists public.qb_accounting_data (
  user_id uuid primary key references auth.users (id) on delete cascade,
  payload jsonb not null default '{"clients":[],"invoices":[],"expenses":[],"accounts":[]}'::jsonb,
  updated_at timestamptz not null default now(),
  constraint qb_accounting_data_payload_object check (jsonb_typeof(payload) = 'object')
);

alter table public.qb_accounting_data enable row level security;

revoke all on table public.qb_accounting_data from anon;
grant select, insert, update on table public.qb_accounting_data to authenticated;

drop policy if exists "Users can read their own QUBITS data" on public.qb_accounting_data;
create policy "Users can read their own QUBITS data"
  on public.qb_accounting_data for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert their own QUBITS data" on public.qb_accounting_data;
create policy "Users can insert their own QUBITS data"
  on public.qb_accounting_data for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their own QUBITS data" on public.qb_accounting_data;
create policy "Users can update their own QUBITS data"
  on public.qb_accounting_data for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
