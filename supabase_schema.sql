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

create table if not exists public.public_live_chat_messages (
  id bigint generated always as identity primary key,
  nickname text not null,
  text text not null check (char_length(text) between 1 and 300),
  symbol text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_public_live_chat_messages_created_at
  on public.public_live_chat_messages (created_at desc);

alter table public.public_live_chat_messages enable row level security;

drop policy if exists "public_live_chat_select_all" on public.public_live_chat_messages;
create policy "public_live_chat_select_all"
  on public.public_live_chat_messages for select
  using (true);

drop policy if exists "public_live_chat_insert_all" on public.public_live_chat_messages;
create policy "public_live_chat_insert_all"
  on public.public_live_chat_messages for insert
  with check (true);

alter publication supabase_realtime add table public.public_live_chat_messages;
