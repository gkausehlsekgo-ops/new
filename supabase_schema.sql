create table if not exists public.virtual_accounts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  cash numeric not null default 100000,
  portfolio jsonb not null default '{}'::jsonb,
  perf jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.virtual_trades (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  symbol text not null,
  side text not null check (side in ('BUY','SELL')),
  qty integer not null check (qty > 0),
  price numeric not null check (price > 0),
  created_at timestamptz not null default now()
);

alter table public.virtual_accounts enable row level security;
alter table public.virtual_trades enable row level security;

drop policy if exists "virtual_accounts_select_own" on public.virtual_accounts;
create policy "virtual_accounts_select_own"
  on public.virtual_accounts for select
  using (auth.uid() = user_id);

drop policy if exists "virtual_accounts_insert_own" on public.virtual_accounts;
create policy "virtual_accounts_insert_own"
  on public.virtual_accounts for insert
  with check (auth.uid() = user_id);

drop policy if exists "virtual_accounts_update_own" on public.virtual_accounts;
create policy "virtual_accounts_update_own"
  on public.virtual_accounts for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "virtual_trades_select_own" on public.virtual_trades;
create policy "virtual_trades_select_own"
  on public.virtual_trades for select
  using (auth.uid() = user_id);

drop policy if exists "virtual_trades_insert_own" on public.virtual_trades;
create policy "virtual_trades_insert_own"
  on public.virtual_trades for insert
  with check (auth.uid() = user_id);
