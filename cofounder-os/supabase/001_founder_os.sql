-- Run in a dedicated Supabase project. Do not use the customer-facing KATHYA database.
-- Before inviting users, populate the allowlist with your actual founder email.
create table if not exists public.founder_allowlist (
  email text primary key,
  created_at timestamptz not null default now()
);
alter table public.founder_allowlist enable row level security;
-- Deliberately NO client policies: only administrators/service-role can edit or inspect the allowlist.

create table if not exists public.founder_items (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check(kind in ('Tasks','Ideas','Campaigns','Leads')),
  title text not null check(char_length(title) between 1 and 160),
  details text not null default '',
  status text not null default 'open' check(status in ('open','done')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists founder_items_owner_created_idx on public.founder_items(owner_id,created_at desc);
alter table public.founder_items enable row level security;
create or replace function public.is_approved_founder() returns boolean language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.founder_allowlist a where lower(a.email)=lower((select auth.jwt()->>'email')) and (select auth.uid()) is not null);
$$;
revoke all on function public.is_approved_founder() from public;
grant execute on function public.is_approved_founder() to authenticated;
create policy "Approved founder reads own records" on public.founder_items for select to authenticated using (owner_id=(select auth.uid()) and (select public.is_approved_founder()));
create policy "Approved founder inserts own records" on public.founder_items for insert to authenticated with check (owner_id=(select auth.uid()) and (select public.is_approved_founder()));
create policy "Approved founder updates own records" on public.founder_items for update to authenticated using (owner_id=(select auth.uid()) and (select public.is_approved_founder())) with check (owner_id=(select auth.uid()) and (select public.is_approved_founder()));
create policy "Approved founder deletes own records" on public.founder_items for delete to authenticated using (owner_id=(select auth.uid()) and (select public.is_approved_founder()));
-- Automatically enforce ownership on insert; clients never supply owner_id.
create or replace function public.founder_item_owner() returns trigger language plpgsql security invoker as $$ begin new.owner_id := auth.uid();return new;end $$;
drop trigger if exists set_founder_item_owner on public.founder_items;
create trigger set_founder_item_owner before insert on public.founder_items for each row execute function public.founder_item_owner();
-- After verifying your address, run as a privileged SQL editor:
-- insert into public.founder_allowlist(email) values ('your-real-founder-email@example.com');
